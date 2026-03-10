/**
 * Render API client
 * Frontend client for backend rendering service
 */

import { getApiBaseUrl } from './base'

export interface KonvaRenderItem {
  templateId: string
  orderId: string
  orderSourceCompanyId?: string
}

export interface RenderOptions {
  exportDpi?: number
  background?: 'white' | 'transparent'
}

export interface RenderRequest {
  type: 'konva-print-template' | 'pdfmake-form'
  items: KonvaRenderItem[]
  options: RenderOptions & { outputFormat?: 'pdf' | 'png' }
}

/**
 * Render batch of items on backend and return PDF blob
 */
export async function renderBatch(request: RenderRequest): Promise<Blob> {
  const response = await fetch(`${getApiBaseUrl()}/render/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(errorData.message || errorData.error || `Render failed: ${response.statusText}`)
  }

  return response.blob()
}

/**
 * Render Konva print templates on backend
 * Convenience wrapper for konva-print-template type
 */
export async function renderKonvaOnBackend(
  items: Omit<KonvaRenderItem, 'type'>[],
  options: RenderOptions
): Promise<Blob> {
  return renderBatch({
    type: 'konva-print-template',
    items: items.map((item) => ({
      ...item,
    })),
    options: {
      ...options,
      outputFormat: 'pdf',
    },
  })
}

/**
 * Check if backend render service is available
 */
export async function checkRenderHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/render/health`, {
      method: 'GET',
    })
    return response.ok
  } catch {
    return false
  }
}
