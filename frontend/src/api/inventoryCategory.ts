import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface InventoryCategory {
  _id: string
  code: string
  name: string
  description?: string
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  colorLabel?: string
  createdAt: string
  updatedAt: string
}

export interface InventoryCategoryFormData {
  code: string
  name: string
  description?: string
  isActive?: boolean
  sortOrder?: number
  colorLabel?: string
}

export interface InventoryCategoryListResponse {
  data: InventoryCategory[]
  total: number
}

export async function fetchInventoryCategories(): Promise<InventoryCategoryListResponse> {
  const response = await fetch(`${API_BASE_URL}/inventory-categories`)
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '在庫区分の取得に失敗しました')
  }
  return response.json()
}

export async function fetchInventoryCategory(id: string): Promise<InventoryCategory> {
  const response = await fetch(`${API_BASE_URL}/inventory-categories/${id}`)
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '在庫区分の取得に失敗しました')
  }
  return response.json()
}

export async function createInventoryCategory(data: InventoryCategoryFormData): Promise<InventoryCategory> {
  const response = await fetch(`${API_BASE_URL}/inventory-categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '在庫区分の作成に失敗しました')
  }
  return response.json()
}

export async function updateInventoryCategory(
  id: string,
  data: Partial<InventoryCategoryFormData>,
): Promise<InventoryCategory> {
  const response = await fetch(`${API_BASE_URL}/inventory-categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '在庫区分の更新に失敗しました')
  }
  return response.json()
}

export async function deleteInventoryCategory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/inventory-categories/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '在庫区分の削除に失敗しました')
  }
}

export async function seedInventoryCategories(): Promise<{ message: string; results: Array<{ code: string; status: string }> }> {
  const response = await fetch(`${API_BASE_URL}/inventory-categories/seed`, {
    method: 'POST',
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || 'デフォルト在庫区分の作成に失敗しました')
  }
  return response.json()
}
