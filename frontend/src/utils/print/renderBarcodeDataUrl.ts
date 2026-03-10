import bwipjs from 'bwip-js'

export type RenderBarcodeOptions = {
  /** Output width in px */
  width: number
  /** Output height in px */
  height: number
  /** Barcode text/value */
  text: string
  /** bwip-js barcode type id (e.g. 'code128', 'qrcode', 'codabar', 'ean13', etc.) */
  bcid: string
  /** Additional bwip-js options passthrough */
  options?: Record<string, any>
}

/**
 * Map our barcode format names to bwip-js bcid identifiers.
 * Some formats may have different names in bwip-js.
 */
function mapBarcodeFormatToBcid(format: string): string {
  const formatMap: Record<string, string> = {
    'code128': 'code128',
    'qrcode': 'qrcode',
    'codabar': 'rationalizedCodabar', // bwip-js uses 'rationalizedCodabar' for Codabar/NW-7
    'ean13': 'ean13',
    'ean8': 'ean8',
    'code39': 'code39',
    'code93': 'code93',
    'interleaved2of5': 'i2of5', // bwip-js uses 'i2of5' for Interleaved 2 of 5
    'datamatrix': 'datamatrix',
    'pdf417': 'pdf417',
  }
  return formatMap[format.toLowerCase()] || format
}

/**
 * Format barcode text for specific barcode types
 */
function formatBarcodeText(bcid: string, text: string, options?: Record<string, any>): string {
  let result = String(text ?? '')

  if (bcid === 'rationalizedCodabar') {
    const startChar = (options?.codabarStart as string) || 'A'
    const stopChar = (options?.codabarStop as string) || 'A'

    if (!result || result.trim() === '') {
      result = '123456'
    } else {
      if (/^[A-D]/.test(result)) {
        result = result.substring(1)
      }
      if (/[A-D]$/.test(result)) {
        result = result.substring(0, result.length - 1)
      }
    }
    result = startChar + result + stopChar
  } else if (bcid === 'ean8') {
    const digits = result.replace(/\D/g, '')
    if (digits.length >= 7) {
      result = digits.slice(0, 7)
    } else if (digits.length > 0) {
      result = digits.padEnd(7, '0')
    } else {
      result = '1234567'
    }
  } else if (bcid === 'ean13') {
    const digits = result.replace(/\D/g, '')
    if (digits.length >= 12) {
      result = digits.slice(0, 12)
    } else if (digits.length > 0) {
      result = digits.padEnd(12, '0')
    } else {
      result = '123456789012'
    }
  }

  return result
}

/**
 * Render a barcode as a PNG data URL using bwip-js.
 *
 * NOTE:
 * - bwip-js writes directly into a canvas; no manual resize needed.
 * - The caller (Konva.Image or Canvas.drawImage) handles scaling to target dimensions.
 * - This eliminates the intermediate canvas resize step for better performance.
 * - The width/height params are kept for API compatibility but not used for resizing.
 */
export function renderBarcodePngDataUrl(opts: RenderBarcodeOptions): string {
  const bcid = mapBarcodeFormatToBcid(opts.bcid)
  const text = formatBarcodeText(bcid, opts.text, opts.options)

  // Create canvas for bwip-js to render into
  const canvas = document.createElement('canvas')

  try {
    // bwip-js renders directly to canvas
    // scale=1 is sufficient - Konva.Image({ width, height }) handles scaling
    bwipjs.toCanvas(canvas, {
      bcid,
      text,
      scale: opts.options?.scale ?? 1,
      ...opts.options,
    })
  } catch (error) {
    console.error(`Barcode generation failed for type "${opts.bcid}" with text "${text}":`, error)
    throw new Error(`Failed to generate ${opts.bcid} barcode: ${error instanceof Error ? error.message : String(error)}`)
  }

  return canvas.toDataURL('image/png')
}





