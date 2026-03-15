import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'
import type { InboundOrder, InboundHistoryLine } from '@/types/inventory'

const API_BASE_URL = getApiBaseUrl()

export async function fetchInboundOrders(params?: {
  status?: string
  page?: number
  limit?: number
}): Promise<{ items: InboundOrder[]; total: number; page: number; limit: number }> {
  const url = new URL(`${API_BASE_URL}/inbound-orders`)
  if (params?.status) url.searchParams.append('status', params.status)
  if (params?.page) url.searchParams.append('page', String(params.page))
  if (params?.limit) url.searchParams.append('limit', String(params.limit))
  const res = await apiFetch(url.toString())
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch inbound orders')
  return res.json()
}

export async function fetchInboundOrder(id: string): Promise<InboundOrder> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch inbound order')
  return res.json()
}

export async function createInboundOrder(data: {
  destinationLocationId: string
  supplier?: { name: string; code?: string; memo?: string }
  lines: Array<{
    productId: string
    expectedQuantity: number
    stockCategory?: 'new' | 'damaged'
    orderReferenceNumber?: string
    lotNumber?: string
    expiryDate?: string
    locationId?: string
    memo?: string
  }>
  expectedDate?: string
  memo?: string
}): Promise<InboundOrder> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to create inbound order')
  return res.json()
}

export async function updateInboundOrder(id: string, data: Partial<{
  destinationLocationId: string
  supplier: { name: string; code?: string; memo?: string }
  lines: Array<{
    productId: string
    expectedQuantity: number
    receivedQuantity?: number
    lotNumber?: string
    expiryDate?: string
    locationId?: string
    memo?: string
  }>
  expectedDate: string
  memo: string
}>): Promise<InboundOrder> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to update inbound order')
  return res.json()
}

export async function confirmInboundOrder(id: string): Promise<{ message: string; order: InboundOrder }> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}/confirm`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to confirm')
  return res.json()
}

export async function receiveInboundLine(id: string, data: {
  lineNumber: number
  receiveQuantity: number
}): Promise<{ message: string; line: { lineNumber: number; receivedQuantity: number; expectedQuantity: number }; orderStatus: string }> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to receive')
  return res.json()
}

export async function bulkReceiveInbound(id: string): Promise<{ message: string; order: InboundOrder }> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}/bulk-receive`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to bulk receive')
  return res.json()
}

export async function putawayInboundLine(id: string, data: {
  lineNumber: number
  locationId: string
  quantity?: number
}): Promise<{ message: string; line: { lineNumber: number; putawayLocationId: string; putawayQuantity: number }; allPutaway: boolean }> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}/putaway`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to putaway')
  return res.json()
}

export async function completeInboundOrder(id: string): Promise<{ message: string }> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}/complete`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to complete')
  return res.json()
}

export async function cancelInboundOrder(id: string): Promise<{ message: string }> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}/cancel`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to cancel')
  return res.json()
}

export async function deleteInboundOrder(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to delete')
}

export async function searchInboundHistory(params?: {
  dateFrom?: string
  dateTo?: string
  productSku?: string
  productName?: string
  supplierName?: string
  locationCode?: string
  stockCategory?: string
  orderReferenceNumber?: string
  expectedQtyMin?: number
  expectedQtyMax?: number
  receivedQtyMin?: number
  receivedQtyMax?: number
  page?: number
  limit?: number
}): Promise<{ items: InboundHistoryLine[]; total: number; page: number; limit: number }> {
  const url = new URL(`${API_BASE_URL}/inbound-orders/history`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== '' && v !== null) url.searchParams.append(k, String(v))
    }
  }
  const res = await apiFetch(url.toString())
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to search history')
  return res.json()
}

/** 差異レポート / 差异报告 */
export interface InboundVarianceLine {
  lineNumber: number
  productSku: string
  productName: string
  expectedQuantity: number
  receivedQuantity: number
  variance: number
  variancePercent: number
  status: 'ok' | 'shortage' | 'pending'
}

export interface InboundVarianceReport {
  orderNumber: string
  orderStatus: string
  supplierName: string
  totalExpected: number
  totalReceived: number
  totalVariance: number
  hasVariance: boolean
  shortageCount: number
  pendingCount: number
  lines: InboundVarianceLine[]
}

export async function fetchInboundVariance(id: string): Promise<InboundVarianceReport> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}/variance`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch variance')
  return res.json()
}

/** 棚入れロケーション推薦 / 上架位置推荐 */
export interface LocationSuggestion {
  lineNumber: number
  productSku: string
  suggestedLocationId: string | null
  suggestedLocationCode: string | null
  suggestedLocationName: string | null
  existingStock: number
  reason: string | null
}

export async function fetchPutawaySuggestions(id: string): Promise<{ suggestions: LocationSuggestion[] }> {
  const res = await apiFetch(`${API_BASE_URL}/inbound-orders/${id}/suggest-locations`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Failed to fetch suggestions')
  return res.json()
}
