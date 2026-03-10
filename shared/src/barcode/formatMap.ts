/**
 * Barcode format mapping for bwip-js
 * Shared between frontend and backend
 */

/**
 * Map our barcode format names to bwip-js bcid identifiers.
 * Some formats may have different names in bwip-js.
 */
export function mapBarcodeFormatToBcid(format: string): string {
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
export function formatBarcodeText(
  bcid: string,
  text: string,
  options?: Record<string, any>
): string {
  let result = String(text ?? '')

  if (bcid === 'rationalizedCodabar') {
    // Codabar requires start/stop characters (A, B, C, or D only - not digits)
    const startChar = (options?.codabarStart as string) || 'A'
    const stopChar = (options?.codabarStop as string) || 'A'

    if (!result || result.trim() === '') {
      result = '123456' // Default value if empty (without start/stop)
    } else {
      // Only remove start/stop characters (A-D) if they exist at the beginning or end
      if (/^[A-D]/.test(result)) {
        result = result.substring(1)
      }
      if (/[A-D]$/.test(result)) {
        result = result.substring(0, result.length - 1)
      }
    }

    // Always add the specified start/stop characters
    result = startChar + result + stopChar
  } else if (bcid === 'ean8') {
    // EAN-8 requires exactly 7 digits (8th is auto-calculated) or 8 digits
    const digits = result.replace(/\D/g, '')
    if (digits.length >= 7) {
      result = digits.slice(0, 7)
    } else if (digits.length > 0) {
      result = digits.padEnd(7, '0')
    } else {
      result = '1234567'
    }
  } else if (bcid === 'ean13') {
    // EAN-13 requires exactly 12 digits (13th is auto-calculated) or 13 digits
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

export interface BarcodeRenderOptions {
  bcid: string
  text: string
  width: number
  height: number
  options?: Record<string, any>
}
