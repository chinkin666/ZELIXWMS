import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface SupplierData {
  _id: string
  supplierCode: string
  name: string
  name2?: string
  postalCode?: string
  address1?: string
  address2?: string
  address3?: string
  phone?: string
  isActive: boolean
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface SupplierListResponse {
  data: SupplierData[]
  total: number
}

export interface SupplierFilters {
  search?: string
  page?: number
  limit?: number
  isActive?: string
}

export interface BulkImportResult {
  message: string
  successCount: number
  failCount: number
  errors: Array<{ row: number; supplierCode: string; message: string }>
}

function buildQueryUrl(params?: SupplierFilters): string {
  const url = new URL(`${API_BASE_URL}/suppliers`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
    if (params.isActive) url.searchParams.append('isActive', params.isActive)
  }
  return url.toString()
}

export async function fetchSuppliers(params?: SupplierFilters): Promise<SupplierListResponse> {
  const response = await fetch(buildQueryUrl(params))
  if (!response.ok) {
    throw new Error(`仕入先の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchSupplier(id: string): Promise<SupplierData> {
  const response = await fetch(`${API_BASE_URL}/suppliers/${id}`)
  if (!response.ok) {
    throw new Error(`仕入先の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createSupplier(data: Partial<SupplierData>): Promise<SupplierData> {
  const response = await fetch(`${API_BASE_URL}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `仕入先の作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function updateSupplier(id: string, data: Partial<SupplierData>): Promise<SupplierData> {
  const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `仕入先の更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteSupplier(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `仕入先の削除に失敗しました: ${response.statusText}`)
  }
}

export async function bulkImportSuppliers(suppliers: Array<Partial<SupplierData>>): Promise<BulkImportResult> {
  const response = await fetch(`${API_BASE_URL}/suppliers/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suppliers }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `一括取込に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function exportSuppliers(): Promise<SupplierData[]> {
  const response = await fetch(`${API_BASE_URL}/suppliers/export`)
  if (!response.ok) {
    throw new Error(`仕入先のエクスポートに失敗しました: ${response.statusText}`)
  }
  return response.json()
}
