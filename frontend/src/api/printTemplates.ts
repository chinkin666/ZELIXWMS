import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export type PrintTemplateApiModel = {
  id: string
  tenantId?: string
  name: string
  canvas: { widthMm: number; heightMm: number; pxPerMm: number }
  elements: any[]
  meta?: Record<string, any>
  /** Sample data for visual editor (JSON array, first row is headers, rest are data rows) */
  sampleData?: Record<string, any>[]
  /** Reference background image for visual editor (base64 encoded, only included when includeSampleData=true) */
  referenceImageData?: string
  /** Carrier ID for template matching ('any' for all carriers) */
  carrierId?: string
  /** Invoice type for template matching ('any' for all types) */
  invoiceType?: string
  /** Whether this template is the default for its carrier/invoiceType combination */
  isDefault?: boolean
  createdAt?: string
  updatedAt?: string
}

export async function fetchPrintTemplates(params?: {
  name?: string
  carrierId?: string
}): Promise<PrintTemplateApiModel[]> {
  const url = new URL(`${API_BASE_URL}/print-templates`)
  if (params?.name) url.searchParams.set('name', params.name)
  if (params?.carrierId) url.searchParams.set('carrierId', params.carrierId)

  const res = await apiFetch(url.toString())
  if (!res.ok) {
    throw new Error(`Failed to fetch print templates: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchPrintTemplate(id: string, includeSampleData = false): Promise<PrintTemplateApiModel> {
  const url = new URL(`${API_BASE_URL}/print-templates/${encodeURIComponent(id)}`)
  if (includeSampleData) {
    url.searchParams.set('includeSampleData', 'true')
  }
  const res = await apiFetch(url.toString())
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message || res.statusText || 'Failed to fetch print template')
  return json
}

export async function createPrintTemplate(payload: Omit<PrintTemplateApiModel, 'id'>): Promise<PrintTemplateApiModel> {
  const res = await apiFetch(`${API_BASE_URL}/print-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message || res.statusText || 'Failed to create print template')
  return json
}

export async function updatePrintTemplate(id: string, payload: Partial<PrintTemplateApiModel>): Promise<PrintTemplateApiModel> {
  const res = await apiFetch(`${API_BASE_URL}/print-templates/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json?.message || res.statusText || 'Failed to update print template')
  return json
}

export async function deletePrintTemplate(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/print-templates/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json?.message || res.statusText || 'Failed to delete print template')
  }
}





