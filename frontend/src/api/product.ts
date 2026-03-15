import type { Product, ProductFilters, UpsertProductDto } from '@/types/product'

import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

const buildQueryUrl = (filters?: ProductFilters): string => {
  const url = new URL(`${API_BASE_URL}/products`)
  if (filters) {
    if (filters.sku) url.searchParams.append('sku', filters.sku)
    if (filters.name) url.searchParams.append('name', filters.name)
    if (filters.nameFull) url.searchParams.append('nameFull', filters.nameFull)
    if (filters.coolType) url.searchParams.append('coolType', filters.coolType)
    if (filters.mailCalcEnabled !== undefined) {
      url.searchParams.append('mailCalcEnabled', String(filters.mailCalcEnabled))
    }
    if (filters.fbaEnabled !== undefined) {
      url.searchParams.append('fbaEnabled', String(filters.fbaEnabled))
    }
  }
  return url.toString()
}

export async function fetchProducts(filters?: ProductFilters): Promise<Product[]> {
  const response = await apiFetch(buildQueryUrl(filters))
  if (!response.ok) {
    throw new Error(`商品の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createProduct(payload: UpsertProductDto): Promise<Product> {
  const response = await apiFetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`商品の作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateProduct(id: string, payload: Partial<UpsertProductDto>): Promise<Product> {
  const response = await apiFetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`商品の更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteProduct(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`商品の削除に失敗しました: ${message}`)
  }
}

export type ImportRowError = {
  rowIndex: number
  sku?: string
  field?: string
  message: string
}

export async function validateProductImport(rows: any[]): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/products/validate-import`, {
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

export async function importProductsBulk(rows: any[]): Promise<{ insertedCount: number }> {
  const response = await apiFetch(`${API_BASE_URL}/products/import-bulk`, {
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

export type ImportStrategy = 'error' | 'skip' | 'overwrite'

export type ImportResult = {
  insertedCount: number
  updatedCount: number
  skippedCount: number
  skippedSkus: string[]
  errors?: ImportRowError[]
}

export async function importProductsWithStrategy(
  rows: any[],
  strategy: ImportStrategy,
): Promise<ImportResult> {
  const response = await apiFetch(`${API_BASE_URL}/products/import-with-strategy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, strategy }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const err: any = new Error(data?.message || 'Import failed')
    err.errors = data?.errors
    throw err
  }
  return response.json()
}

export type SkuAvailabilityResult = {
  available: boolean
  conflictType?: 'mainSku' | 'subSku'
  conflictProductSku?: string
}

export async function checkSkuAvailability(
  skus: string[],
  excludeProductId?: string,
): Promise<Record<string, SkuAvailabilityResult>> {
  const response = await apiFetch(`${API_BASE_URL}/products/check-sku-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skus, excludeProductId }),
  })
  if (!response.ok) {
    throw new Error(`SKU重複チェックに失敗しました: ${response.statusText}`)
  }
  const data = await response.json()
  return data.results
}

export async function uploadProductImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData()
  formData.append('image', file)
  const response = await apiFetch(`${API_BASE_URL}/products/upload-image`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`画像のアップロードに失敗しました: ${message}`)
  }
  return response.json()
}

// 商品別出荷統計 / 商品出荷统计
export interface ProductShipmentStat {
  _id: string // productSku
  inputSku: string
  productName: string
  totalQuantity: number
  totalAmount: number
  orderCount: number
}

export async function fetchProductShipmentStats(params?: {
  dateFrom?: string
  dateTo?: string
  limit?: number
}): Promise<ProductShipmentStat[]> {
  const url = new URL(`${API_BASE_URL}/products/shipment-stats`)
  if (params?.dateFrom) url.searchParams.append('dateFrom', params.dateFrom)
  if (params?.dateTo) url.searchParams.append('dateTo', params.dateTo)
  if (params?.limit) url.searchParams.append('limit', String(params.limit))
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`出荷統計の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function bulkUpdateProducts(
  ids: string[],
  updates: Record<string, any>,
): Promise<{ message: string; matchedCount: number; modifiedCount: number }> {
  const response = await apiFetch(`${API_BASE_URL}/products/bulk`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, updates }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data?.message || '一括更新に失敗しました')
  }
  return response.json()
}

