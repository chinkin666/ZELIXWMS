import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface DailyReportSummary {
  shipments: { totalOrders: number; shippedOrders: number; totalItems: number; shippedItems: number }
  inbound: { totalOrders: number; receivedOrders: number; totalItems: number; receivedItems: number }
  returns: { totalOrders: number; completedOrders: number; restockedItems: number; disposedItems: number }
  inventory: { totalSkus: number; totalQuantity: number; reservedQuantity: number; adjustmentCount: number }
  stocktaking: { totalSessions: number; varianceCount: number }
}

export interface DailyReport {
  _id: string
  date: string
  status: 'open' | 'closed' | 'locked'
  closedAt?: string
  closedBy?: string
  summary: DailyReportSummary
  memo?: string
  createdAt: string
  updatedAt: string
}

export async function fetchDailyReports(params?: {
  status?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}): Promise<{ data: DailyReport[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/daily-reports`)
  if (params?.status) url.searchParams.append('status', params.status)
  if (params?.from) url.searchParams.append('from', params.from)
  if (params?.to) url.searchParams.append('to', params.to)
  if (params?.page) url.searchParams.append('page', String(params.page))
  if (params?.limit) url.searchParams.append('limit', String(params.limit))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch')
  return res.json()
}

export async function fetchDailyReport(date: string): Promise<DailyReport> {
  const res = await fetch(`${API_BASE_URL}/daily-reports/${date}`)
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch')
  return res.json()
}

export async function generateDailyReport(date: string): Promise<DailyReport> {
  const res = await fetch(`${API_BASE_URL}/daily-reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to generate')
  return res.json()
}

export async function closeDailyReport(date: string): Promise<DailyReport> {
  const res = await fetch(`${API_BASE_URL}/daily-reports/${date}/close`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to close')
  return res.json()
}

export async function lockDailyReport(date: string): Promise<DailyReport> {
  const res = await fetch(`${API_BASE_URL}/daily-reports/${date}/lock`, { method: 'POST' })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to lock')
  return res.json()
}
