/**
 * ERP 連携 API / ERP 集成 API
 */
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

// === 型定義 / 类型定义 ===

export interface ErpStatus {
  connected: boolean
  erpType?: string
  lastSyncAt?: string
  syncStatus?: 'idle' | 'syncing' | 'error'
  errorMessage?: string
}

export interface ErpConfig {
  erpType: string
  endpointUrl: string
  apiKey: string
  username?: string
  password?: string
  exportShipments: boolean
  exportInvoices: boolean
  exportInventory: boolean
  syncInterval: number
  autoSync: boolean
}

export interface ErpTestResult {
  success: boolean
  message: string
  latency?: number
}

// === API 関数 / API 函数 ===

export async function getErpStatus(): Promise<ErpStatus> {
  const response = await apiFetch(`${API_BASE_URL}/integrations/erp/status`)
  if (!response.ok) throw new Error(`ERP ステータスの取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function getErpConfig(): Promise<ErpConfig> {
  const response = await apiFetch(`${API_BASE_URL}/integrations/erp/config`)
  if (!response.ok) throw new Error(`ERP 設定の取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function updateErpConfig(data: Partial<ErpConfig>): Promise<ErpConfig> {
  const response = await apiFetch(`${API_BASE_URL}/integrations/erp/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `ERP 設定の更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function testErpConnection(): Promise<ErpTestResult> {
  const response = await apiFetch(`${API_BASE_URL}/integrations/erp/test`, { method: 'POST' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `ERP 接続テストに失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function syncErp(): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE_URL}/integrations/erp/sync`, { method: 'POST' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `ERP 同期に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
