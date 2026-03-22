import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

/**
 * 运费率表データ型 / 运费率表数据类型
 */
export interface ShippingRateData {
  _id: string
  tenantId: string
  carrierId: string
  carrierName?: string
  name: string
  sizeType: 'weight' | 'dimension' | 'flat'
  sizeMin?: number
  sizeMax?: number
  fromPrefectures?: string[]
  toPrefectures?: string[]
  basePrice: number
  coolSurcharge: number
  codSurcharge: number
  fuelSurcharge: number
  validFrom?: string
  validTo?: string
  isActive: boolean
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface ShippingRateListResponse {
  data: ShippingRateData[]
  total: number
}

export interface ShippingRateFilters {
  carrierId?: string
  isActive?: string
  search?: string
  page?: number
  limit?: number
}

export interface CalculateResult {
  matched: boolean
  rateId?: string
  rateName?: string
  totalCost?: number
  breakdown?: {
    base: number
    cool: number
    cod: number
    fuel: number
    other: number
  }
  message?: string
}

/**
 * クエリURLを構築 / 构建查询URL
 */
function buildQueryUrl(params?: ShippingRateFilters): string {
  const url = new URL(`${API_BASE_URL}/billing/shipping-rates`)
  if (params) {
    if (params.carrierId) url.searchParams.append('carrierId', params.carrierId)
    if (params.isActive) url.searchParams.append('isActive', params.isActive)
    if (params.search) url.searchParams.append('search', params.search)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  return url.toString()
}

/**
 * 运费率表一覧を取得 / 获取运费率表列表
 */
export async function fetchShippingRates(params?: ShippingRateFilters): Promise<ShippingRateListResponse> {
  const response = await apiFetch(buildQueryUrl(params))
  if (!response.ok) {
    throw new Error(`運賃率表の取得に失敗しました: ${response.statusText}`)
  }
  const json = await response.json()
  const data = json?.data ?? json?.items ?? (Array.isArray(json) ? json : [])
  return { data, total: json?.total ?? data.length }
}

/**
 * 运费率表を1件取得 / 获取单个运费率表
 */
export async function fetchShippingRate(id: string): Promise<ShippingRateData> {
  const response = await apiFetch(`${API_BASE_URL}/shipping-rates/${id}`)
  if (!response.ok) {
    throw new Error(`運賃率表の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 运费率表を作成 / 创建运费率表
 */
export async function createShippingRate(data: Partial<ShippingRateData>): Promise<ShippingRateData> {
  const response = await apiFetch(`${API_BASE_URL}/billing/shipping-rates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `運賃率表の作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 运费率表を更新 / 更新运费率表
 */
export async function updateShippingRate(id: string, data: Partial<ShippingRateData>): Promise<ShippingRateData> {
  const response = await apiFetch(`${API_BASE_URL}/shipping-rates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `運賃率表の更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 运费率表を削除（論理削除）/ 删除运费率表（逻辑删除）
 */
export async function deleteShippingRate(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/shipping-rates/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `運賃率表の削除に失敗しました: ${response.statusText}`)
  }
}

/**
 * 配送料金を計算 / 计算配送费用
 */
export async function calculateShippingCost(params: {
  carrierId: string
  fromPrefecture?: string
  toPrefecture?: string
  weight?: number
  dimension?: number
  isCool?: boolean
  isCod?: boolean
}): Promise<CalculateResult> {
  const response = await apiFetch(`${API_BASE_URL}/shipping-rates/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `配送料金の計算に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
