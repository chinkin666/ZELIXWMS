import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface SerialNumber {
  _id: string
  serialNumber: string
  productId: string
  lotId?: string
  status: 'available' | 'reserved' | 'shipped' | 'returned' | 'damaged' | 'scrapped'
  warehouseId?: string
  locationId?: string
  shipmentId?: string
  receivedAt?: string
  shippedAt?: string
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface SerialNumberListParams {
  search?: string
  productId?: string
  status?: string
  warehouseId?: string
  lotId?: string
  page?: number
  limit?: number
}

export interface SerialNumberListResponse {
  data: SerialNumber[]
  total: number
}

export interface BulkCreateResult {
  message: string
  createdCount: number
  failCount: number
  errors: { serialNumber: string; message: string }[]
}

export async function fetchSerialNumbers(params?: SerialNumberListParams): Promise<SerialNumberListResponse> {
  const url = new URL(`${API_BASE_URL}/serial-numbers`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.productId) url.searchParams.append('productId', params.productId)
    if (params.status) url.searchParams.append('status', params.status)
    if (params.warehouseId) url.searchParams.append('warehouseId', params.warehouseId)
    if (params.lotId) url.searchParams.append('lotId', params.lotId)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`シリアル番号の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchSerialNumber(id: string): Promise<SerialNumber> {
  const response = await fetch(`${API_BASE_URL}/serial-numbers/${id}`)
  if (!response.ok) {
    throw new Error(`シリアル番号の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createSerialNumber(data: Partial<SerialNumber>): Promise<SerialNumber> {
  const response = await fetch(`${API_BASE_URL}/serial-numbers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`シリアル番号の作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function bulkCreateSerialNumbers(data: { serialNumbers: Partial<SerialNumber>[] }): Promise<BulkCreateResult> {
  const response = await fetch(`${API_BASE_URL}/serial-numbers/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`シリアル番号の一括登録に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateSerialNumber(id: string, data: Partial<SerialNumber>): Promise<SerialNumber> {
  const response = await fetch(`${API_BASE_URL}/serial-numbers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`シリアル番号の更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateSerialNumberStatus(id: string, data: { status: string }): Promise<SerialNumber> {
  const response = await fetch(`${API_BASE_URL}/serial-numbers/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`シリアル番号のステータス変更に失敗しました: ${message}`)
  }
  return response.json()
}

export async function lookupSerialNumber(params: { serialNumber: string; productId?: string }): Promise<SerialNumber> {
  const url = new URL(`${API_BASE_URL}/serial-numbers/lookup`)
  url.searchParams.append('serialNumber', params.serialNumber)
  if (params.productId) url.searchParams.append('productId', params.productId)
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`シリアル番号の検索に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
