import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

// ── 料金種別定義 / 料金種別定義 ──
export type ChargeType =
  | 'inbound_handling'
  | 'storage'
  | 'outbound_handling'
  | 'picking'
  | 'packing'
  | 'inspection'
  | 'shipping'
  | 'material'
  | 'return_handling'
  | 'labeling'
  | 'other'

// 料金種別ラベル / 料金種別ラベル
export const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  inbound_handling: '入庫作業料',
  storage: '保管料',
  outbound_handling: '出荷作業料',
  picking: 'ピッキング料',
  packing: '梱包料',
  inspection: '検品料',
  shipping: '配送料',
  material: '梱包材料費',
  return_handling: '返品処理料',
  labeling: 'ラベル貼付料',
  other: 'その他',
}

// 全料金種別キー / 全料金種別キー
export const CHARGE_TYPES = Object.keys(CHARGE_TYPE_LABELS) as ChargeType[]

// ── 料金マスタ型定義 / 料金マスター型定義 ──
export interface ServiceRate {
  _id: string
  clientId?: string
  clientName?: string
  chargeType: ChargeType
  name: string
  unit: string
  unitPrice: number
  isActive: boolean
  memo?: string
  createdAt?: string
  updatedAt?: string
}

export interface ServiceRateFilters {
  search?: string
  chargeType?: string
  clientId?: string
  isActive?: string
  page?: number
  limit?: number
}

// ── 作業チャージ型定義 / 作業チャージ型定義 ──
export interface WorkCharge {
  _id: string
  clientId?: string
  clientName?: string
  chargeType: ChargeType
  chargeDate: string
  referenceType: string
  referenceNumber?: string
  quantity: number
  unitPrice: number
  amount: number
  description: string
  isBilled: boolean
  createdAt?: string
  updatedAt?: string
}

export interface WorkChargeFilters {
  period?: string
  clientId?: string
  chargeType?: string
  isBilled?: string
  page?: number
  limit?: number
}

// 作業チャージ集計 / 作業チャージ集計
export interface WorkChargeSummary {
  _id: { chargeType: string; clientId?: string }
  chargeType: string
  clientName?: string
  totalQuantity: number
  totalAmount: number
  count: number
}

// ── 料金マスタAPI / 料金マスタAPI ──

export async function fetchServiceRates(
  params?: ServiceRateFilters,
): Promise<{ data: ServiceRate[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/service-rates`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.chargeType) url.searchParams.append('chargeType', params.chargeType)
    if (params.clientId) url.searchParams.append('clientId', params.clientId)
    if (params.isActive) url.searchParams.append('isActive', params.isActive)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`料金マスタの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createServiceRate(data: Partial<ServiceRate>): Promise<ServiceRate> {
  const response = await fetch(`${API_BASE_URL}/service-rates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `料金マスタの作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function updateServiceRate(id: string, data: Partial<ServiceRate>): Promise<ServiceRate> {
  const response = await fetch(`${API_BASE_URL}/service-rates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `料金マスタの更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteServiceRate(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/service-rates/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `料金マスタの削除に失敗しました: ${response.statusText}`)
  }
}

// ── 作業チャージAPI / 作業チャージAPI ──

export async function fetchWorkCharges(
  params?: WorkChargeFilters,
): Promise<{ data: WorkCharge[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/work-charges`)
  if (params) {
    if (params.period) url.searchParams.append('period', params.period)
    if (params.clientId) url.searchParams.append('clientId', params.clientId)
    if (params.chargeType) url.searchParams.append('chargeType', params.chargeType)
    if (params.isBilled) url.searchParams.append('isBilled', params.isBilled)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`作業チャージの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchWorkChargeSummary(
  params?: { period?: string; clientId?: string },
): Promise<WorkChargeSummary[]> {
  const url = new URL(`${API_BASE_URL}/work-charges/summary`)
  if (params) {
    if (params.period) url.searchParams.append('period', params.period)
    if (params.clientId) url.searchParams.append('clientId', params.clientId)
  }
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`作業チャージ集計の取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createWorkCharge(data: Partial<WorkCharge>): Promise<WorkCharge> {
  const response = await fetch(`${API_BASE_URL}/work-charges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `作業チャージの作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteWorkCharge(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/work-charges/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `作業チャージの削除に失敗しました: ${response.statusText}`)
  }
}
