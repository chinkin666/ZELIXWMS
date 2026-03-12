import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface Customer {
  _id: string
  customerCode: string
  name: string
  name2?: string
  postalCode?: string
  prefecture?: string
  city?: string
  address?: string
  address2?: string
  phone?: string
  email?: string
  memo?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomerListParams {
  search?: string
  page?: number
  limit?: number
  isActive?: string
}

export interface CustomerListResponse {
  data: Customer[]
  total: number
}

export interface BulkImportResult {
  message: string
  successCount: number
  failCount: number
  errors: { row: number; customerCode?: string; message: string }[]
}

export async function fetchCustomers(params?: CustomerListParams): Promise<CustomerListResponse> {
  const url = new URL(`${API_BASE_URL}/customers`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
    if (params.isActive !== undefined) url.searchParams.append('isActive', params.isActive)
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`得意先の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchCustomer(id: string): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`)
  if (!response.ok) {
    throw new Error(`得意先の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`得意先の作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`得意先の更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteCustomer(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`得意先の削除に失敗しました: ${message}`)
  }
}

export async function bulkImportCustomers(customers: Partial<Customer>[]): Promise<BulkImportResult> {
  const response = await fetch(`${API_BASE_URL}/customers/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customers }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.message || '一括取り込みに失敗しました')
  }
  return response.json()
}

export async function exportCustomers(): Promise<Customer[]> {
  const response = await fetch(`${API_BASE_URL}/customers/export`)
  if (!response.ok) {
    throw new Error(`得意先のエクスポートに失敗しました: ${response.statusText}`)
  }
  return response.json()
}
