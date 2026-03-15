import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface ReturnOrderLine {
  lineNumber: number
  productId: string
  productSku: string
  productName?: string
  quantity: number
  inspectedQuantity: number
  disposition: 'restock' | 'dispose' | 'repair' | 'pending'
  restockedQuantity: number
  disposedQuantity: number
  locationId?: string
  lotId?: string
  lotNumber?: string
  memo?: string
}

export interface ReturnOrder {
  _id: string
  orderNumber: string
  status: 'draft' | 'inspecting' | 'completed' | 'cancelled'
  shipmentOrderId?: string
  shipmentOrderNumber?: string
  returnReason: 'customer_request' | 'defective' | 'wrong_item' | 'damaged' | 'other'
  reasonDetail?: string
  customerName?: string
  receivedDate: string
  completedAt?: string
  lines: ReturnOrderLine[]
  memo?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// ダッシュボード統計型 / 仪表盘统计类型
export interface ReturnDashboardStats {
  statusCounts: { draft: number; inspecting: number; completed: number; cancelled: number }
  reasonBreakdown: Record<string, number>
  totalRestocked: number
  totalDisposed: number
  recentReturns: ReturnOrder[]
}

export async function fetchReturnDashboardStats(): Promise<ReturnDashboardStats> {
  const res = await fetch(`${API_BASE_URL}/return-orders/dashboard-stats`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch dashboard stats')
  return res.json()
}

export async function fetchReturnOrders(params?: {
  status?: string
  page?: number
  limit?: number
}): Promise<{ data: ReturnOrder[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/return-orders`)
  if (params?.status) url.searchParams.append('status', params.status)
  if (params?.page) url.searchParams.append('page', String(params.page))
  if (params?.limit) url.searchParams.append('limit', String(params.limit))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch')
  return res.json()
}

export async function fetchReturnOrder(id: string): Promise<ReturnOrder> {
  const res = await fetch(`${API_BASE_URL}/return-orders/${id}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch')
  return res.json()
}

export async function createReturnOrder(data: {
  shipmentOrderId?: string
  returnReason: string
  reasonDetail?: string
  customerName?: string
  receivedDate?: string
  lines: Array<{
    productId: string
    productSku?: string
    productName?: string
    quantity: number
    locationId?: string
    lotId?: string
    lotNumber?: string
    memo?: string
  }>
  memo?: string
}): Promise<ReturnOrder> {
  const res = await fetch(`${API_BASE_URL}/return-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to create')
  return res.json()
}

export async function updateReturnOrder(id: string, data: Record<string, unknown>): Promise<ReturnOrder> {
  const res = await fetch(`${API_BASE_URL}/return-orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update')
  return res.json()
}

export async function startReturnInspection(id: string): Promise<ReturnOrder> {
  const res = await fetch(`${API_BASE_URL}/return-orders/${id}/start-inspection`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to start')
  return res.json()
}

export async function inspectReturnLines(id: string, inspections: Array<{
  lineIndex: number
  inspectedQuantity?: number
  disposition?: string
  restockedQuantity?: number
  disposedQuantity?: number
  locationId?: string
}>): Promise<ReturnOrder> {
  const res = await fetch(`${API_BASE_URL}/return-orders/${id}/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspections }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to inspect')
  return res.json()
}

export async function completeReturnOrder(id: string): Promise<{ data: ReturnOrder; restockedTotal: number; disposedTotal: number; errors: string[] }> {
  const res = await fetch(`${API_BASE_URL}/return-orders/${id}/complete`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to complete')
  return res.json()
}

export async function cancelReturnOrder(id: string): Promise<ReturnOrder> {
  const res = await fetch(`${API_BASE_URL}/return-orders/${id}/cancel`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to cancel')
  return res.json()
}

export async function bulkCreateReturns(returns: Array<{
  productSku: string
  quantity: number
  returnReason: string
  customerName?: string
  receivedDate?: string
  memo?: string
}>): Promise<{ message: string; successCount: number; failCount: number; errors: string[] }> {
  const res = await fetch(`${API_BASE_URL}/return-orders/bulk-create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returns }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to bulk create')
  return res.json()
}

export async function deleteReturnOrder(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/return-orders/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to delete')
}
