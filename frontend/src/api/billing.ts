import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

// ── 運賃マスタ型定義 / 運賃マスター型定義 ──
export interface ShippingRate {
  _id: string
  planName: string
  carrierCode: string
  carrierName: string
  sizeCondition: string
  baseRate: number
  coolSurcharge: number
  codSurcharge: number
  isActive: boolean
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface ShippingRateFilters {
  search?: string
  carrierCode?: string
  isActive?: string
  page?: number
  limit?: number
}

// ── 請求レコード型定義 / 請求レコード型定義 ──
export type BillingStatus = 'draft' | 'confirmed' | 'invoiced' | 'paid'

export interface BillingRecord {
  _id: string
  period: string
  clientId?: string
  clientName?: string
  carrierId?: string
  carrierName?: string
  orderCount: number
  totalQuantity: number
  totalShippingCost: number
  handlingFee: number
  storageFee: number
  otherFees: number
  totalAmount: number
  status: BillingStatus
  confirmedAt?: string
  createdAt: string
  updatedAt: string
}

// ── 請求書型定義 / 請求書型定義 ──
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

export interface Invoice {
  _id: string
  invoiceNumber: string
  billingRecordIds: string[]
  clientCode: string
  clientName: string
  totalAmount: number
  status: InvoiceStatus
  issuedDate: string
  dueDate: string
  paidDate?: string
  memo?: string
  createdAt: string
  updatedAt: string
}

// ── ダッシュボードKPI型定義 / ダッシュボードKPI型定義 ──
export interface BillingDashboardKpi {
  monthlyOrderCount: number
  monthlyShippingCost: number
  unbilledAmount: number
  unpaidAmount: number
  currentPeriod: string
  recentRecords: BillingRecord[]
}

// ── 運賃マスタAPI / 運賃マスターAPI ──
function buildShippingRateUrl(params?: ShippingRateFilters): string {
  const url = new URL(`${API_BASE_URL}/billing/shipping-rates`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.carrierCode) url.searchParams.append('carrierCode', params.carrierCode)
    if (params.isActive) url.searchParams.append('isActive', params.isActive)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  return url.toString()
}

export async function fetchShippingRates(
  params?: ShippingRateFilters,
): Promise<{ data: ShippingRate[]; total: number }> {
  const response = await fetch(buildShippingRateUrl(params))
  if (!response.ok) {
    throw new Error(`運賃マスタの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createShippingRate(data: Partial<ShippingRate>): Promise<ShippingRate> {
  const response = await fetch(`${API_BASE_URL}/billing/shipping-rates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `運賃マスタの作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function updateShippingRate(id: string, data: Partial<ShippingRate>): Promise<ShippingRate> {
  const response = await fetch(`${API_BASE_URL}/billing/shipping-rates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `運賃マスタの更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteShippingRate(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/billing/shipping-rates/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `運賃マスタの削除に失敗しました: ${response.statusText}`)
  }
}

// ── 月次請求API / 月次請求API ──
export async function generateMonthlyBilling(period: string): Promise<BillingRecord> {
  const response = await fetch(`${API_BASE_URL}/billing/monthly/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ period }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `月次請求の生成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchBillingRecords(params?: {
  period?: string
  status?: string
  page?: number
  limit?: number
}): Promise<{ items: BillingRecord[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/billing/records`)
  if (params) {
    if (params.period) url.searchParams.append('period', params.period)
    if (params.status) url.searchParams.append('status', params.status)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`請求データの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchBillingRecord(id: string): Promise<BillingRecord> {
  const response = await fetch(`${API_BASE_URL}/billing/records/${id}`)
  if (!response.ok) {
    throw new Error(`請求データの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function confirmBillingRecord(id: string): Promise<BillingRecord> {
  const response = await fetch(`${API_BASE_URL}/billing/records/${id}/confirm`, {
    method: 'POST',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `請求の確定に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

// ── 請求書API / 請求書API ──
export async function fetchInvoices(params?: {
  status?: string
  page?: number
  limit?: number
}): Promise<{ items: Invoice[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/billing/invoices`)
  if (params) {
    if (params.status) url.searchParams.append('status', params.status)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`請求書の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createInvoice(data: {
  billingRecordIds: string[]
  dueDate: string
  memo?: string
}): Promise<Invoice> {
  const response = await fetch(`${API_BASE_URL}/billing/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `請求書の作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const response = await fetch(`${API_BASE_URL}/billing/invoices/${id}`)
  if (!response.ok) {
    throw new Error(`請求書の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
  const response = await fetch(`${API_BASE_URL}/billing/invoices/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `請求書ステータスの更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

// ── ダッシュボードAPI / ダッシュボードAPI ──
export async function fetchBillingDashboard(period?: string): Promise<BillingDashboardKpi> {
  const url = new URL(`${API_BASE_URL}/billing/dashboard`)
  if (period) url.searchParams.append('period', period)
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`ダッシュボードの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
