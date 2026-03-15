import Konva from 'konva'
import type { OrderDocument } from '@/types/order'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { PrintBarcodeElement, PrintImageElement, PrintTemplate, PrintTextElement } from '@/types/printTemplate'
import { dpiToPxPerMm, ptToMm } from '@/utils/printUnits'
import { buildPrintContext } from '@/utils/print/buildPrintContext'
import { renderBarcodePngDataUrl } from '@/utils/print/renderBarcodeDataUrl'
import { runTransformMapping } from '@/utils/transformRunner'

export type RenderTemplateToPngOptions = {
  exportDpi: number
  background?: 'transparent' | 'white'
}

function mmToPx(mm: number, pxPerMm: number): number {
  return mm * pxPerMm
}

async function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = dataUrl
  })
}

function normalizeLetterSpacingForExport(letterSpacingPx: number | undefined, scale: number): number | undefined {
  if (typeof letterSpacingPx !== 'number' || Number.isNaN(letterSpacingPx)) return undefined
  return letterSpacingPx * scale
}

/**
 * Render a template + order into a high-res PNG Blob using an offscreen Konva stage.
 *
 * The key idea:
 * - Template uses mm for layout.
 * - Export picks an exportDpi and derives exportPxPerMm.
 * - We render at export resolution so printed output is crisp.
 */
export async function renderTemplateToPngBlob(
  template: PrintTemplate,
  order: OrderDocument,
  opts: RenderTemplateToPngOptions,
  orderSourceCompany?: OrderSourceCompany | null,
): Promise<Blob> {
  const ctx = buildPrintContext(order, template.requiresYamatoSortCode, orderSourceCompany)
  return renderTemplateWithContextToPngBlob(template, ctx, opts)
}

/**
 * 任意のコンテキストデータでテンプレートをPNG Blobにレンダリングする
 * 任意のコンテキストデータ（商品ラベル等）でテンプレートをレンダリングする汎用関数
 *
 * 使用任意上下文数据（如商品标签等）将模板渲染为 PNG Blob 的通用函数
 */
export async function renderTemplateWithContextToPngBlob(
  template: PrintTemplate,
  ctx: Record<string, any>,
  opts: RenderTemplateToPngOptions,
): Promise<Blob> {
  const exportPxPerMm = dpiToPxPerMm(opts.exportDpi)
  const editorPxPerMm = template.canvas.pxPerMm || 1
  const letterSpacingScale = exportPxPerMm / editorPxPerMm

  const widthPx = Math.max(1, Math.round(mmToPx(template.canvas.widthMm, exportPxPerMm)))
  const heightPx = Math.max(1, Math.round(mmToPx(template.canvas.heightMm, exportPxPerMm)))

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '-10000px'
  container.style.width = `${widthPx}px`
  container.style.height = `${heightPx}px`
  document.body.appendChild(container)

  try {
    const stage = new Konva.Stage({ container, width: widthPx, height: heightPx })
    const layer = new Konva.Layer()
    stage.add(layer)

    if (opts.background === 'white') {
      layer.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width: widthPx,
          height: heightPx,
          fill: 'white',
          listening: false,
        }),
      )
    }

    // Pre-render barcodes to images (async) so we can keep z-order correct afterwards.
    const barcodeImageById = new Map<string, HTMLImageElement>()
    const barcodes = template.elements.filter((e): e is PrintBarcodeElement => e.type === 'barcode' && e.visible !== false)
    await Promise.all(
      barcodes.map(async (b) => {
        let value = ''
        if (b.transformMapping) {
          try {
            value = String(await runTransformMapping(b.transformMapping, ctx, {}) ?? '')
          } catch (e) {
            console.error('Error rendering barcode transform mapping:', e)
            value = ''
          }
        }
        const dataUrl = renderBarcodePngDataUrl({
          bcid: b.format,
          text: value,
          width: mmToPx(b.widthMm, exportPxPerMm),
          height: mmToPx(b.heightMm, exportPxPerMm),
          options: b.options,
        })
        barcodeImageById.set(b.id, await dataUrlToImage(dataUrl))
      }),
    )

    // Pre-load image elements (async) so we can keep z-order correct afterwards.
    const imageImageById = new Map<string, HTMLImageElement>()
    const images = template.elements.filter((e): e is PrintImageElement => e.type === 'image' && e.visible !== false)
    await Promise.all(
      images.map(async (img) => {
        if (img.imageData) {
          try {
            const imgEl = await dataUrlToImage(img.imageData)
            imageImageById.set(img.id, imgEl)
          } catch (e) {
            console.error('Error loading image element:', e)
          }
        }
      }),
    )

    // Render elements in array order (top-most last)
    for (const el of template.elements) {
      if (el.visible === false) continue

      if (el.type === 'text') {
        const t = el as PrintTextElement
        let text = ''
        if (t.transformMapping) {
          try {
            text = String(await runTransformMapping(t.transformMapping, ctx, {}) ?? '')
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

        const textNode = new Konva.Text({
          x,
          y,
          text,
          fontFamily: t.fontFamily,
          fontSize: fontSizePx,
          fill: 'black',
          wrap: 'none',
          listening: false,
        })

        const letterSpacing = normalizeLetterSpacingForExport(t.letterSpacingPx, letterSpacingScale)
        if (typeof letterSpacing === 'number') textNode.letterSpacing(letterSpacing)

        if (t.align === 'right') {
          // Right align by shifting x using measured width
          textNode.x(x - textNode.width())
        }

        layer.add(textNode)
      } else if (el.type === 'barcode') {
        const b = el as PrintBarcodeElement
        const img = barcodeImageById.get(b.id)
        if (!img) continue
        layer.add(
          new Konva.Image({
            x: mmToPx(b.xMm, exportPxPerMm),
            y: mmToPx(b.yMm, exportPxPerMm),
            width: mmToPx(b.widthMm, exportPxPerMm),
            height: mmToPx(b.heightMm, exportPxPerMm),
            image: img,
            listening: false,
          }),
        )
      } else if (el.type === 'image') {
        const imgEl = el as PrintImageElement
        const img = imageImageById.get(imgEl.id)
        if (!img) continue
        layer.add(
          new Konva.Image({
            x: mmToPx(imgEl.xMm, exportPxPerMm),
            y: mmToPx(imgEl.yMm, exportPxPerMm),
            width: mmToPx(imgEl.widthMm, exportPxPerMm),
            height: mmToPx(imgEl.heightMm, exportPxPerMm),
            image: img,
            listening: false,
          }),
        )
      }
    }

    layer.draw()

    const dataUrl = stage.toDataURL({ mimeType: 'image/png', pixelRatio: 1 })
    const res = await fetch(dataUrl)
    return await res.blob()
  } finally {
    container.remove()
  }
}


