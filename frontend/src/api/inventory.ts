import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'
import type { StockQuant, StockSummary, StockMove, LowStockAlert } from '@/types/inventory'

const API_BASE_URL = getApiBaseUrl()

export async function fetchStock(params?: {
  productId?: string
  productSku?: string
  locationId?: string
  showZero?: boolean
  stockType?: string
}): Promise<StockQuant[]> {
  const url = new URL(`${API_BASE_URL}/inventory/stock`)
  if (params?.productId) url.searchParams.append('productId', params.productId)
  if (params?.productSku) url.searchParams.append('productSku', params.productSku)
  if (params?.locationId) url.searchParams.append('locationId', params.locationId)
  if (params?.showZero) url.searchParams.append('showZero', 'true')
  if (params?.stockType) url.searchParams.append('stockType', params.stockType)
  const res = await apiFetch(url.toString())
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch stock')
  return res.json()
}

export async function fetchStockSummary(params?: { search?: string; stockType?: string }): Promise<StockSummary[]> {
  const url = new URL(`${API_BASE_URL}/inventory/stock/summary`)
  if (params?.search) url.searchParams.append('search', params.search)
  if (params?.stockType) url.searchParams.append('stockType', params.stockType)
  const res = await apiFetch(url.toString())
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch stock summary')
  return res.json()
}

export async function fetchProductStock(productId: string): Promise<StockQuant[]> {
  const res = await apiFetch(`${API_BASE_URL}/inventory/stock/${productId}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch product stock')
  return res.json()
}

export async function adjustStock(data: {
  productId: string
  locationId: string
  lotId?: string
  adjustQuantity: number
  memo?: string
}): Promise<{ message: string; moveNumber: string }> {
  const res = await apiFetch(`${API_BASE_URL}/inventory/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to adjust stock')
  return res.json()
}

export async function fetchMovements(params?: {
  productId?: string
  moveType?: string
  state?: string
  page?: number
  limit?: number
}): Promise<{ items: StockMove[]; total: number; page: number; limit: number }> {
  const url = new URL(`${API_BASE_URL}/inventory/movements`)
  if (params?.productId) url.searchParams.append('productId', params.productId)
  if (params?.moveType) url.searchParams.append('moveType', params.moveType)
  if (params?.state) url.searchParams.append('state', params.state)
  if (params?.page) url.searchParams.append('page', String(params.page))
  if (params?.limit) url.searchParams.append('limit', String(params.limit))
  const res = await apiFetch(url.toString())
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch movements')
  return res.json()
}

export async function fetchLowStockAlerts(): Promise<LowStockAlert[]> {
  const res = await apiFetch(`${API_BASE_URL}/inventory/alerts/low-stock`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch low stock alerts')
  return res.json()
}

export async function reserveOrdersStock(ids: string[]): Promise<{
  message: string
  results: Array<{
    orderId: string
    orderNumber: string
    reservationCount: number
    errors: string[]
  }>
  totalReserved: number
  errors: string[]
}> {
  const res = await apiFetch(`${API_BASE_URL}/inventory/reserve-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to reserve stock')
  return res.json()
}

export async function transferStock(data: {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  lotId?: string
  memo?: string
}): Promise<{ message: string; moveNumber: string }> {
  const res = await apiFetch(`${API_BASE_URL}/inventory/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to transfer stock')
  return res.json()
}

export async function bulkAdjustStock(adjustments: Array<{
  productSku: string
  locationCode: string
  quantity: number
  lotNumber?: string
  memo?: string
}>): Promise<{
  message: string
  successCount: number
  failCount: number
  errors: string[]
}> {
  const res = await apiFetch(`${API_BASE_URL}/inventory/bulk-adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adjustments }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to bulk adjust')
  return res.json()
}

/** 在庫概況 / 库存概览 */
export interface InventoryOverview {
  productCount: number
  totalQuantity: number
  totalReserved: number
  availableQuantity: number
  lowStockCount: number
  expiringCount: number
  expiredCount: number
  locationUsage: { total: number; used: number; percent: number }
  expiringDetails: { lotNumber: string; productSku: string; productName: string; expiryDate: string; daysRemaining: number }[]
}

export async function fetchInventoryOverview(): Promise<InventoryOverview> {
  const res = await apiFetch(`${API_BASE_URL}/inventory/overview`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch overview')
  return res.json()
}

export async function cleanupZeroStock(): Promise<{ message: string; deletedCount: number }> {
  const res = await apiFetch(`${API_BASE_URL}/inventory/cleanup-zero`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to cleanup zero stock')
  return res.json()
}
