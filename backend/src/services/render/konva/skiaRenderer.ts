/**
 * Skia Canvas renderer for print templates
 * Renders templates to PNG using skia-canvas (Node.js)
 */

import { Canvas, loadImage } from 'skia-canvas'
import type { ImageBuffer as BarcodeImageBuffer } from './skiaBarcode';
import { generateBarcode } from './skiaBarcode'
import { loadFonts } from './fontManager'

// Constants for unit conversion
const MM_PER_INCH = 25.4
const PT_PER_INCH = 72
const MM_PER_PT = MM_PER_INCH / PT_PER_INCH

function dpiToPxPerMm(dpi: number): number {
  return dpi / MM_PER_INCH
}

function mmToPx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm
}

function ptToMm(pt: number): number {
  return pt * MM_PER_PT
}

export interface RenderOptions {
  exportDpi: number
  background?: 'transparent' | 'white'
}

export interface PrintTemplate {
  id: string
  name: string
  canvas: {
    widthMm: number
    heightMm: number
    pxPerMm: number
  }
  elements: PrintElement[]
  requiresYamatoSortCode?: boolean
}

export type PrintElement = PrintTextElement | PrintBarcodeElement | PrintImageElement

interface PrintElementBase {
  id: string
  name: string
  xMm: number
  yMm: number
  visible: boolean
  locked: boolean
}

export interface PrintTextElement extends PrintElementBase {
  type: 'text'
  transformMapping?: any
  fontFamily: string
  fontSizePt: number
  align: 'left' | 'right'
  letterSpacingPx?: number
}

export interface PrintBarcodeElement extends PrintElementBase {
  type: 'barcode'
  transformMapping?: any
  format: string
  widthMm: number
  heightMm: number
  options?: Record<string, any>
}

export interface PrintImageElement extends PrintElementBase {
  type: 'image'
  imageData: string
  widthMm: number
  heightMm: number
}

export interface RenderResult {
  pngBuffer: Buffer
  pdfBuffer: Buffer // Single-page PDF for fast merging
  width: number
  height: number
}

/**
 * Render a single template + context to PNG
 */
export async function renderTemplateToPng(
  template: PrintTemplate,
  context: Record<string, any>,
  runTransformMapping: (mapping: any, ctx: Record<string, any>) => Promise<any>,
  options: RenderOptions
): Promise<RenderResult> {
  // Ensure fonts are loaded
  await loadFonts()

  const exportPxPerMm = dpiToPxPerMm(options.exportDpi)
  const editorPxPerMm = template.canvas.pxPerMm || 1
  const letterSpacingScale = exportPxPerMm / editorPxPerMm

  const widthPx = Math.max(1, Math.round(mmToPx(template.canvas.widthMm, exportPxPerMm)))
  const heightPx = Math.max(1, Math.round(mmToPx(template.canvas.heightMm, exportPxPerMm)))

  const canvas = new Canvas(widthPx, heightPx)
  const ctx2d = canvas.getContext('2d')

  // Background
  if (options.background === 'white') {
    ctx2d.fillStyle = 'white'
    ctx2d.fillRect(0, 0, widthPx, heightPx)
  }

  // Pre-render barcodes
  const barcodeImageById = new Map<string, BarcodeImageBuffer>()
  const barcodes = template.elements.filter(
    (e): e is PrintBarcodeElement => e.type === 'barcode' && e.visible !== false
  )

  await Promise.all(
    barcodes.map(async (b) => {
      let value = ''
      if (b.transformMapping) {
        try {
          value = String((await runTransformMapping(b.transformMapping, context)) ?? '')
        } catch (e) {
          console.error('Error rendering barcode transform mapping:', e)
          value = ''
        }
      }
      const imageData = await generateBarcode({
        bcid: b.format,
        text: value,
        width: mmToPx(b.widthMm, exportPxPerMm),
        height: mmToPx(b.heightMm, exportPxPerMm),
        options: b.options,
      })
      barcodeImageById.set(b.id, imageData)
    })
  )

  // Pre-load image elements
  const imageDataById = new Map<string, any>()
  const images = template.elements.filter(
    (e): e is PrintImageElement => e.type === 'image' && e.visible !== false
  )

  await Promise.all(
    images.map(async (img) => {
      if (img.imageData) {
        try {
          const imgEl = await loadImage(img.imageData)
          imageDataById.set(img.id, imgEl)
        } catch (e) {
          console.error('Error loading image element:', e)
        }
      }
    })
  )

  // Render elements in order
  for (const el of template.elements) {
    if (el.visible === false) continue

    if (el.type === 'text') {
      const t = el as PrintTextElement
      let text = ''
      if (t.transformMapping) {
        try {
          text = String((await runTransformMapping(t.transformMapping, context)) ?? '')
        } catch (e) {
          console.error('Error rendering text transform mapping:', e)
          text = ''
        }
      }

      const fontSizePt = typeof t.fontSizePt === 'number' ? t.fontSizePt : 12
      const fontSizeMm = ptToMm(fontSizePt)
      const fontSizePx = mmToPx(fontSizeMm, exportPxPerMm)
      const x = mmToPx(t.xMm, exportPxPerMm)
      const y = mmToPx(t.yMm, exportPxPerMm)

      ctx2d.font = `${fontSizePx}px "${t.fontFamily}"`
      ctx2d.fillStyle = 'black'

      // Apply letter spacing if specified
      const letterSpacing =
        typeof t.letterSpacingPx === 'number' && !Number.isNaN(t.letterSpacingPx)
          ? t.letterSpacingPx * letterSpacingScale
          : 0

      if (letterSpacing > 0) {
        // Draw characters one by one with spacing
        let currentX = x
        const chars = text.split('')

        if (t.align === 'right') {
          // Calculate total width first
          let totalWidth = 0
          for (const char of chars) {
            totalWidth += ctx2d.measureText(char).width + letterSpacing
          }
          totalWidth -= letterSpacing // Remove last spacing
          currentX = x - totalWidth
        }

        for (let i = 0; i < chars.length; i++) {
          const char = chars[i]
          if (!char) continue
          ctx2d.fillText(char, currentX, y + fontSizePx)
          currentX += ctx2d.measureText(char).width + letterSpacing
        }
      } else {
        // No letter spacing - draw normally
        if (t.align === 'right') {
          const textWidth = ctx2d.measureText(text).width
          ctx2d.fillText(text, x - textWidth, y + fontSizePx)
        } else {
          ctx2d.fillText(text, x, y + fontSizePx)
        }
      }
    } else if (el.type === 'barcode') {
      const b = el as PrintBarcodeElement
      const imgData = barcodeImageById.get(b.id)
      if (!imgData) continue

      const img = await loadImage(imgData.data)
      ctx2d.drawImage(
        img,
        mmToPx(b.xMm, exportPxPerMm),
        mmToPx(b.yMm, exportPxPerMm),
        mmToPx(b.widthMm, exportPxPerMm),
        mmToPx(b.heightMm, exportPxPerMm)
      )
    } else if (el.type === 'image') {
      const imgEl = el as PrintImageElement
      const img = imageDataById.get(imgEl.id)
      if (!img) continue

      ctx2d.drawImage(
        img,
        mmToPx(imgEl.xMm, exportPxPerMm),
        mmToPx(imgEl.yMm, exportPxPerMm),
        mmToPx(imgEl.widthMm, exportPxPerMm),
        mmToPx(imgEl.heightMm, exportPxPerMm)
      )
    }
  }

  // Export to PNG buffer (for preview/cache)
  const pngBuffer = await canvas.toBuffer('png')

  // Export to PDF directly using skia-canvas native PDF output
  // This is much faster than PNG→PDF conversion via pdf-lib
  const pdfBuffer = await canvas.toBuffer('pdf')

  return {
    pngBuffer,
    pdfBuffer,
    width: widthPx,
    height: heightPx,
  }
}
