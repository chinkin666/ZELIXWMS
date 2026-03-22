import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export interface StockLevel {
  productId: string
  productSku: string
  productName?: string
  warehouseId?: string
  totalStock: number
  reservedStock: number
  availableStock: number
}

export interface LedgerEntry {
  _id: string
  productId: string
  productSku: string
  warehouseId?: string
  locationId?: string
  lotId?: string
  lotNumber?: string
  type: 'inbound' | 'outbound' | 'reserve' | 'release' | 'adjustment' | 'count'
  quantity: number
  referenceType?: string
  referenceId?: string
  referenceNumber?: string
  reason?: string
  executedBy?: string
  executedAt?: string
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface Reservation {
  _id: string
  productId: string
  productSku: string
  warehouseId?: string
  quantity: number
  status: 'active' | 'fulfilled' | 'released' | 'expired'
  source: 'order' | 'shipment' | 'transfer' | 'manual'
  referenceId?: string
  referenceNumber?: string
  expiresAt?: string
  memo?: string
  createdAt: string
}

export interface StockLevelListResponse {
  data: StockLevel[]
  total: number
}

export interface LedgerListResponse {
  data: LedgerEntry[]
  total: number
}

export interface ReservationListResponse {
  data: Reservation[]
  total: number
}

export async function fetchStockLevels(params?: {
  warehouseId?: string
  page?: number
  limit?: number
}): Promise<StockLevelListResponse> {
  // バックエンドは /inventory-ledger/summary を使用 / 后端使用 /inventory-ledger/summary
  const url = new URL(`${API_BASE_URL}/inventory-ledger/summary`)
  if (params) {
    if (params.warehouseId) url.searchParams.append('warehouseId', params.warehouseId)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`在庫水準の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchStockLevel(params: {
  productId: string
  warehouseId?: string
}): Promise<StockLevel> {
  const url = new URL(`${API_BASE_URL}/inventory-ledger/stock`)
  url.searchParams.append('productId', params.productId)
  if (params.warehouseId) url.searchParams.append('warehouseId', params.warehouseId)
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`在庫水準の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchLedgerEntries(params?: {
  productId?: string
  warehouseId?: string
  type?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}): Promise<LedgerListResponse> {
  // バックエンドはルートGETを使用 / 后端使用根GET端点
  const url = new URL(`${API_BASE_URL}/inventory-ledger`)
  if (params) {
    if (params.productId) url.searchParams.append('productId', params.productId)
    if (params.warehouseId) url.searchParams.append('warehouseId', params.warehouseId)
    if (params.type) url.searchParams.append('type', params.type)
    if (params.from) url.searchParams.append('from', params.from)
    if (params.to) url.searchParams.append('to', params.to)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`台帳の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchReservations(params?: {
  productId?: string
  status?: string
  page?: number
  limit?: number
}): Promise<ReservationListResponse> {
  const url = new URL(`${API_BASE_URL}/inventory-ledger/reservations`)
  if (params) {
    if (params.productId) url.searchParams.append('productId', params.productId)
    if (params.status) url.searchParams.append('status', params.status)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`引当の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createLedgerEntry(data: {
  productSku: string
  warehouseId?: string
  type: LedgerEntry['type']
  quantity: number
  reason?: string
  memo?: string
}): Promise<LedgerEntry> {
  const response = await apiFetch(`${API_BASE_URL}/inventory-ledger/ledger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`台帳エントリの作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function releaseReservation(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/inventory-ledger/reservations/${id}/release`, {
    method: 'PUT',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`引当の解放に失敗しました: ${message}`)
  }
}
