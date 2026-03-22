import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

// 耗材カテゴリ / 耗材类别
export type MaterialCategory = 'box' | 'cushioning' | 'tape' | 'label' | 'bag' | 'other'

// 耗材データ型 / 耗材数据类型
export interface Material {
  _id: string
  sku: string
  name: string
  category: MaterialCategory
  unitCost: number
  inventoryEnabled: boolean
  currentStock?: number
  safetyStock?: number
  widthMm?: number
  depthMm?: number
  heightMm?: number
  supplierCode?: string
  caseQuantity?: number
  leadTime?: number
  description?: string
  isActive: boolean
  memo?: string
  createdAt: string
  updatedAt: string
}

// 耗材一覧レスポンス / 耗材列表响应
export interface MaterialListResponse {
  data: Material[]
  total: number
}

// 耗材フィルター / 耗材过滤参数
export interface MaterialFilters {
  search?: string
  category?: MaterialCategory
  page?: number
  limit?: number
}

// 在庫調整リクエスト / 库存调整请求
export interface StockAdjustmentRequest {
  quantity: number
  reason: string
}

function buildQueryUrl(params?: MaterialFilters): string {
  const url = new URL(`${API_BASE_URL}/materials`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.category) url.searchParams.append('category', params.category)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  return url.toString()
}

// 耗材一覧取得 / 获取耗材列表
export async function fetchMaterials(params?: MaterialFilters): Promise<MaterialListResponse> {
  const response = await apiFetch(buildQueryUrl(params))
  if (!response.ok) {
    throw new Error(`耗材の取得に失敗しました: ${response.statusText}`)
  }
  const json = await response.json()
  // バックエンドが items/data 形式どちらでも対応 / 兼容后端 items/data 两种格式
  const items = json?.data ?? json?.items ?? (Array.isArray(json) ? json : [])
  return { data: items, total: json?.total ?? items.length }
}

// 耗材作成 / 创建耗材
export async function createMaterial(data: Partial<Material>): Promise<Material> {
  const response = await apiFetch(`${API_BASE_URL}/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `耗材の作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

// 耗材更新 / 更新耗材
export async function updateMaterial(id: string, data: Partial<Material>): Promise<Material> {
  const response = await apiFetch(`${API_BASE_URL}/materials/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `耗材の更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

// 耗材削除 / 删除耗材
export async function deleteMaterial(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/materials/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `耗材の削除に失敗しました: ${response.statusText}`)
  }
}

// 耗材在庫調整 / 耗材库存调整
export async function adjustMaterialStock(id: string, data: StockAdjustmentRequest): Promise<Material> {
  const response = await apiFetch(`${API_BASE_URL}/materials/${id}/adjust-stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `在庫調整に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
