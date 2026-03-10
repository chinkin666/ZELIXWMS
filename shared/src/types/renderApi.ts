/**
 * Unified Render API types
 * Shared between frontend and backend
 */

// Render types
export type RenderType = 'konva-print-template' | 'pdfmake-form'

// General render request
export interface RenderRequest {
  type: RenderType
  items: RenderItem[]
  options: RenderOptions
}

// Konva print template render item
export interface KonvaRenderItem {
  type: 'konva-print-template'
  templateId: string
  orderId: string
  orderSourceCompanyId?: string
}

// pdfmake form render item (Phase 2)
export interface PdfmakeRenderItem {
  type: 'pdfmake-form'
  templateId: string
  data: Record<string, any>[]
}

export type RenderItem = KonvaRenderItem | PdfmakeRenderItem

// Render options
export interface RenderOptions {
  exportDpi?: number          // For Konva
  background?: 'white' | 'transparent'
  outputFormat: 'pdf' | 'png'
}

// Render response (for error cases)
export interface RenderResponse {
  success: boolean
  data?: Uint8Array           // PDF/PNG binary
  error?: string
}
