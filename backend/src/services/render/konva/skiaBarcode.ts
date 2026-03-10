/**
 * Barcode generator using bwip-js for Node.js
 */

import bwipjs from 'bwip-js'
import sharp from 'sharp'

export interface BarcodeOptions {
  bcid: string
  text: string
  width: number
  height: number
  options?: Record<string, any>
}

export interface ImageBuffer {
  data: Buffer
  width: number
  height: number
}

/**
 * Map our barcode format names to bwip-js bcid identifiers.
 */
function mapBarcodeFormatToBcid(format: string): string {
  const formatMap: Record<string, string> = {
    'code128': 'code128',
    'qrcode': 'qrcode',
    'codabar': 'rationalizedCodabar',
    'ean13': 'ean13',
    'ean8': 'ean8',
    'code39': 'code39',
    'code93': 'code93',
    'interleaved2of5': 'i2of5',
    'datamatrix': 'datamatrix',
    'pdf417': 'pdf417',
  }
  return formatMap[format.toLowerCase()] || format
}

/**
 * Format barcode text for specific barcode types
 */
function formatBarcodeText(
  bcid: string,
  text: string,
  options?: Record<string, any>
): string {
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
 * Generate barcode as PNG buffer using bwip-js
 *
 * NOTE: We no longer resize the barcode here. The caller (Canvas.drawImage or Konva.Image)
 * will handle scaling to the target dimensions. This saves ~12ms per barcode by avoiding
 * the sharp resize operation.
 */
export async function generateBarcode(options: BarcodeOptions): Promise<ImageBuffer> {
  const bcid = mapBarcodeFormatToBcid(options.bcid)
  const text = formatBarcodeText(bcid, options.text, options.options)

  // Generate barcode using bwip-js toBuffer
  // scale=1 is sufficient - Canvas.drawImage handles scaling to target size
  const pngBuffer = await bwipjs.toBuffer({
    bcid,
    text,
    scale: options.options?.scale ?? 1,
    ...options.options,
  })

  // Get actual dimensions from the generated PNG (no resize!)
  // Canvas.drawImage(img, x, y, width, height) will scale to target size
  const metadata = await sharp(pngBuffer).metadata()

  return {
    data: pngBuffer,
    width: metadata.width ?? 1,
    height: metadata.height ?? 1,
  }
}
