import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export interface Warehouse {
  _id: string
  code: string
  name: string
  name2?: string
  postalCode?: string
  prefecture?: string
  city?: string
  address?: string
  address2?: string
  phone?: string
  coolTypes?: string[]
  capacity?: number
  operatingHours?: string
  isActive: boolean
  sortOrder: number
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface WarehouseListParams {
  search?: string
  page?: number
  limit?: number
  isActive?: string
}

export interface WarehouseListResponse {
  data: Warehouse[]
  total: number
}

export async function fetchWarehouses(params?: WarehouseListParams): Promise<WarehouseListResponse> {
  const url = new URL(`${API_BASE_URL}/warehouses`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
    if (params.isActive !== undefined) url.searchParams.append('isActive', params.isActive)
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`倉庫の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchWarehouse(id: string): Promise<Warehouse> {
  const response = await apiFetch(`${API_BASE_URL}/warehouses/${id}`)
  if (!response.ok) {
    throw new Error(`倉庫の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
  const response = await apiFetch(`${API_BASE_URL}/warehouses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`倉庫の作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateWarehouse(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
  const response = await apiFetch(`${API_BASE_URL}/warehouses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`倉庫の更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteWarehouse(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/warehouses/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`倉庫の削除に失敗しました: ${message}`)
  }
}

export async function exportWarehouses(): Promise<Warehouse[]> {
  const response = await apiFetch(`${API_BASE_URL}/warehouses/export`)
  if (!response.ok) {
    throw new Error(`倉庫のエクスポートに失敗しました: ${response.statusText}`)
  }
  return response.json()
}
