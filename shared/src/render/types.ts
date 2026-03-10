/**
 * Renderer interface definitions
 * Shared between frontend (Konva) and backend (skia-canvas) implementations
 */

export interface TextDrawOptions {
  fontFamily: string
  fontSize: number
  fill: string
  letterSpacing?: number
  align?: 'left' | 'right'
}

export interface ImageBuffer {
  data: Uint8Array | Buffer
  width: number
  height: number
}

export interface BarcodeOptions {
  bcid: string
  text: string
  width: number
  height: number
  options?: Record<string, any>
}

/**
 * Abstract canvas adapter interface
 * Frontend uses Konva, backend uses skia-canvas
 */
export interface CanvasAdapter {
  /** Fill a rectangle */
  fillRect(x: number, y: number, w: number, h: number, color: string): void

  /** Draw text and return its measured width */
  drawText(text: string, x: number, y: number, options: TextDrawOptions): number

  /** Draw an image from buffer */
  drawImage(imageData: ImageBuffer, x: number, y: number, w: number, h: number): Promise<void>

  /** Export canvas to PNG buffer */
  toBuffer(format: 'png'): Promise<Uint8Array | Buffer>
}

/**
 * Barcode generator interface
 */
export interface BarcodeGenerator {
  generate(options: BarcodeOptions): Promise<ImageBuffer>
}

/**
 * Render result
 */
export interface RenderResult {
  pngBuffer: Uint8Array | Buffer
  width: number
  height: number
}

/**
 * Render options for template rendering
 */
export interface RenderTemplateOptions {
  exportDpi: number
  background?: 'transparent' | 'white'
}
