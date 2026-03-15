import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

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
export type InvoiceStatus = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled'

// 請求書明細行 / 发票明细行
export interface InvoiceLineItem {
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

export interface Invoice {
  _id: string
  tenantId: string
  invoiceNumber: string
  billingRecordId?: string
  clientId?: string
  clientName?: string
  period: string
  issueDate: string
  dueDate: string
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  lineItems: InvoiceLineItem[]
  status: InvoiceStatus
  paidAt?: string
  memo?: string
  createdAt: string
  updatedAt: string
}

// 請求書詳細（関連BillingRecord含む） / 发票详情（含关联BillingRecord）
export interface InvoiceDetail extends Invoice {
  billingRecord?: BillingRecord | null
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

// ── 月次請求API / 月次請求API ──
// 後端: /api/billing/*
export async function generateMonthlyBilling(period: string): Promise<BillingRecord> {
  const response = await apiFetch(`${API_BASE_URL}/billing/generate`, {
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
}): Promise<{ data: BillingRecord[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/billing`)
  if (params) {
    if (params.period) url.searchParams.append('period', params.period)
    if (params.status) url.searchParams.append('status', params.status)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`請求データの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchBillingRecord(id: string): Promise<BillingRecord> {
  const response = await apiFetch(`${API_BASE_URL}/billing/${id}`)
  if (!response.ok) {
    throw new Error(`請求データの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function confirmBillingRecord(id: string): Promise<BillingRecord> {
  const response = await apiFetch(`${API_BASE_URL}/billing/${id}/confirm`, {
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
}): Promise<{ data: Invoice[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/billing/invoices`)
  if (params) {
    if (params.status) url.searchParams.append('status', params.status)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`請求書の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createInvoice(data: {
  billingRecordId?: string
  clientId?: string
  clientName?: string
  period: string
  issueDate: string
  dueDate: string
  taxRate?: number
  lineItems?: InvoiceLineItem[]
  memo?: string
}): Promise<Invoice> {
  const response = await apiFetch(`${API_BASE_URL}/billing/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || body.message || `請求書の作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchInvoice(id: string): Promise<Invoice> {
  const response = await apiFetch(`${API_BASE_URL}/billing/invoices/${id}`)
  if (!response.ok) {
    throw new Error(`請求書の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

// 請求書詳細取得（関連BillingRecord含む） / 获取发票详情（含关联BillingRecord）
export async function fetchInvoiceDetail(id: string): Promise<InvoiceDetail> {
  const response = await apiFetch(`${API_BASE_URL}/billing/invoices/${id}/detail`)
  if (!response.ok) {
    throw new Error(`請求書詳細の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<Invoice> {
  const response = await apiFetch(`${API_BASE_URL}/billing/invoices/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || body.message || `請求書ステータスの更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

// ── ダッシュボードAPI / ダッシュボードAPI ──
export async function fetchBillingDashboard(period?: string): Promise<BillingDashboardKpi> {
  const url = new URL(`${API_BASE_URL}/billing/dashboard`)
  if (period) url.searchParams.append('period', period)
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`ダッシュボードの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
