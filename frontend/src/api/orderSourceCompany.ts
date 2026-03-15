import type {
  OrderSourceCompany,
  OrderSourceCompanyFilters,
  UpsertOrderSourceCompanyDto,
} from '@/types/orderSourceCompany'

import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

const buildQueryUrl = (filters?: OrderSourceCompanyFilters): string => {
  const url = new URL(`${API_BASE_URL}/order-source-companies`)
  if (filters) {
    if (filters.senderName) url.searchParams.append('senderName', filters.senderName)
    if (filters.senderPostalCode) url.searchParams.append('senderPostalCode', filters.senderPostalCode)
    if (filters.senderPhone) url.searchParams.append('senderPhone', filters.senderPhone)
  }
  return url.toString()
}

export async function fetchOrderSourceCompanies(
  filters?: OrderSourceCompanyFilters,
): Promise<OrderSourceCompany[]> {
  const response = await apiFetch(buildQueryUrl(filters))
  if (!response.ok) {
    throw new Error(`ご依頼主の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchOrderSourceCompanyById(id: string): Promise<OrderSourceCompany | null> {
  const response = await apiFetch(`${API_BASE_URL}/order-source-companies/${encodeURIComponent(id)}`)
  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error(`ご依頼主の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createOrderSourceCompany(
  payload: UpsertOrderSourceCompanyDto,
): Promise<OrderSourceCompany> {
  const response = await apiFetch(`${API_BASE_URL}/order-source-companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ご依頼主の作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateOrderSourceCompany(
  id: string,
  payload: Partial<UpsertOrderSourceCompanyDto>,
): Promise<OrderSourceCompany> {
  const response = await apiFetch(`${API_BASE_URL}/order-source-companies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ご依頼主の更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteOrderSourceCompany(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/order-source-companies/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ご依頼主の削除に失敗しました: ${message}`)
  }
}

export type ImportRowError = {
  rowIndex: number
  senderName?: string
  field?: string
  message: string
}

export async function validateOrderSourceCompanyImport(rows: any[]): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/order-source-companies/validate-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const err: any = new Error(data?.message || 'Import validation failed')
    err.errors = data?.errors
    throw err
  }
}

export async function importOrderSourceCompaniesBulk(rows: any[]): Promise<{ insertedCount: number }> {
  const response = await apiFetch(`${API_BASE_URL}/order-source-companies/import-bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const err: any = new Error(data?.message || 'Import failed')
    err.errors = data?.errors
    throw err
  }
  return response.json()
}

