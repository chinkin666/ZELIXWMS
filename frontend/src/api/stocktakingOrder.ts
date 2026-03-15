import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export interface StocktakingLine {
  locationId: string
  locationName: string
  productId: string
  productSku: string
  productName?: string
  lotId?: string
  lotNumber?: string
  systemQuantity: number
  countedQuantity?: number
  variance?: number
  status: 'pending' | 'counted' | 'verified'
  memo?: string
}

export interface StocktakingOrder {
  _id: string
  orderNumber: string
  type: 'full' | 'cycle' | 'spot'
  status: 'draft' | 'in_progress' | 'completed' | 'adjusted' | 'cancelled'
  targetLocations: string[]
  targetProducts: string[]
  scheduledDate?: string
  startedAt?: string
  completedAt?: string
  adjustedAt?: string
  lines: StocktakingLine[]
  memo?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export async function fetchStocktakingOrders(params?: {
  status?: string
  type?: string
  page?: number
  limit?: number
}): Promise<{ data: StocktakingOrder[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/stocktaking-orders`)
  if (params?.status) url.searchParams.append('status', params.status)
  if (params?.type) url.searchParams.append('type', params.type)
  if (params?.page) url.searchParams.append('page', String(params.page))
  if (params?.limit) url.searchParams.append('limit', String(params.limit))
  const res = await apiFetch(url.toString())
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch')
  return res.json()
}

export async function fetchStocktakingOrder(id: string): Promise<StocktakingOrder> {
  const res = await apiFetch(`${API_BASE_URL}/stocktaking-orders/${id}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch')
  return res.json()
}

export async function createStocktakingOrder(data: {
  type?: string
  targetLocations?: string[]
  targetProducts?: string[]
  scheduledDate?: string
  memo?: string
}): Promise<StocktakingOrder> {
  const res = await apiFetch(`${API_BASE_URL}/stocktaking-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create')
  return res.json()
}

export async function updateStocktakingOrder(id: string, data: Record<string, unknown>): Promise<StocktakingOrder> {
  const res = await apiFetch(`${API_BASE_URL}/stocktaking-orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update')
  return res.json()
}

export async function startStocktakingOrder(id: string): Promise<StocktakingOrder> {
  const res = await apiFetch(`${API_BASE_URL}/stocktaking-orders/${id}/start`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to start')
  return res.json()
}

export async function recordStocktakingCount(id: string, counts: Array<{ lineIndex: number; countedQuantity: number }>): Promise<StocktakingOrder> {
  const res = await apiFetch(`${API_BASE_URL}/stocktaking-orders/${id}/count`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ counts }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to record count')
  return res.json()
}

export async function completeStocktakingOrder(id: string): Promise<StocktakingOrder> {
  const res = await apiFetch(`${API_BASE_URL}/stocktaking-orders/${id}/complete`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to complete')
  return res.json()
}

export async function adjustStocktakingOrder(id: string): Promise<{ data: StocktakingOrder; adjustedCount: number; errors: string[] }> {
  const res = await apiFetch(`${API_BASE_URL}/stocktaking-orders/${id}/adjust`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to adjust')
  return res.json()
}

export async function cancelStocktakingOrder(id: string): Promise<StocktakingOrder> {
  const res = await apiFetch(`${API_BASE_URL}/stocktaking-orders/${id}/cancel`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to cancel')
  return res.json()
}

export async function deleteStocktakingOrder(id: string): Promise<void> {
  const res = await apiFetch(`${API_BASE_URL}/stocktaking-orders/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to delete')
}
