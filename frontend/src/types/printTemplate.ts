export type Align = 'left' | 'right'

export type BarcodeFormat =
  | 'code128' // Code 128
  | 'qrcode' // QR Code
  | 'codabar' // Codabar (NW-7)
  | 'ean13' // EAN-13
  | 'ean8' // EAN-8
  | 'code39' // Code 39
  | 'code93' // Code 93
  | 'interleaved2of5' // Interleaved 2 of 5 (ITF)
  | 'datamatrix' // Data Matrix
  | 'pdf417' // PDF417

export type PrintTemplate = {
  id: string
  name: string

  /**
   * Canvas size in millimeters (business unit).
   * - Editor uses pxPerMm for on-screen preview.
   * - Export uses exportDpi to derive a higher pxPerMm.
   */
  canvas: {
    widthMm: number
    heightMm: number
    pxPerMm: number
  }

  elements: PrintElement[]

  /** Whether to include Yamato sort code (仕分けコード) field with fixed value 999999 */
  requiresYamatoSortCode?: boolean

  /** Reference background image for visual editor (base64 encoded, only included when includeSampleData=true) */
  referenceImageData?: string

  /** Carrier ID for template matching ('any' for all carriers) */
  carrierId?: string

  /** Invoice type for template matching ('any' for all types) */
  invoiceType?: string

  /** Whether this template is the default for its carrier/invoiceType combination */
  isDefault?: boolean

  meta?: {
    createdAt?: string
    updatedAt?: string
    version?: number
  }
}

export type PrintElementBase = {
  id: string
  name: string
  xMm: number
  yMm: number
  visible: boolean
  locked: boolean
}

export type PrintTextElement = PrintElementBase & {
  type: 'text'
  /** Transform mapping configuration (same format as mapping-config) */
  transformMapping?: import('@/api/mappingConfig').TransformMapping
  fontFamily: string
  /** Font size in points (pt). 1pt = 1/72 inch. */
  fontSizePt: number
  align: Align
  /**
   * Letter spacing for Konva Text.
   * Unit is px (because Konva letterSpacing is in px).
   *
   * NOTE: When exporting with higher DPI, you must scale this value accordingly
   * or treat it as "editor px" and recompute for export.
   */
  letterSpacingPx?: number
  maxWidthMm?: number
}

export type PrintBarcodeElement = PrintElementBase & {
  type: 'barcode'
  /** Transform mapping configuration (same format as mapping-config) */
  transformMapping?: import('@/api/mappingConfig').TransformMapping
  format: BarcodeFormat
  widthMm: number
  heightMm: number
  /** bwip-js options passthrough (e.g., scale, includetext, textxalign, padding) */
  options?: Record<string, any>
}

export type PrintImageElement = PrintElementBase & {
  type: 'image'
  /** Base64 encoded image data (data:image/png;base64,... or data:image/jpeg;base64,...) */
  imageData: string
  widthMm: number
  heightMm: number
}

export type PrintElement = PrintTextElement | PrintBarcodeElement | PrintImageElement


