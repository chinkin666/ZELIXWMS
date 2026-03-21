/**
 * OMS 連携 API / OMS 集成 API
 */
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

// === 型定義 / 类型定义 ===

export interface OmsStatus {
  connected: boolean
  lastSyncAt?: string
  syncStatus?: 'idle' | 'syncing' | 'error'
  errorMessage?: string
}

export interface OmsConfig {
  endpointUrl: string
  apiKey: string
  syncInterval: number
  autoSync: boolean
  syncOrders: boolean
  syncInventory: boolean
  syncShipments: boolean
}

export interface OmsTestResult {
  success: boolean
  message: string
  latency?: number
}

// === API 関数 / API 函数 ===

export async function getOmsStatus(): Promise<OmsStatus> {
  const response = await apiFetch(`${API_BASE_URL}/oms/status`)
  if (!response.ok) throw new Error(`OMS ステータスの取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function getOmsConfig(): Promise<OmsConfig> {
  const response = await apiFetch(`${API_BASE_URL}/oms/config`)
  if (!response.ok) throw new Error(`OMS 設定の取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function updateOmsConfig(data: Partial<OmsConfig>): Promise<OmsConfig> {
  const response = await apiFetch(`${API_BASE_URL}/oms/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `OMS 設定の更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function testOmsConnection(): Promise<OmsTestResult> {
  const response = await apiFetch(`${API_BASE_URL}/oms/test`, { method: 'POST' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `OMS 接続テストに失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function syncOms(): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE_URL}/oms/sync`, { method: 'POST' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `OMS 同期に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
