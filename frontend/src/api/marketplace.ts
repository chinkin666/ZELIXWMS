/**
 * マーケットプレイス連携 API / 电商平台集成 API
 */
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

// === 型定義 / 类型定义 ===

export interface MarketplaceProvider {
  id: string
  name: string
  platform: 'shopify' | 'rakuten' | 'amazon' | 'base'
  status: 'connected' | 'disconnected'
  lastSyncAt?: string
  config?: Record<string, unknown>
}

export interface MarketplaceConfig {
  providerId: string
  apiKey?: string
  apiSecret?: string
  shopUrl?: string
  syncInterval?: number
  autoSync?: boolean
}

// === API 関数 / API 函数 ===

export async function getMarketplaceProviders(): Promise<MarketplaceProvider[]> {
  const response = await apiFetch(`${API_BASE_URL}/marketplace/providers`)
  if (!response.ok) throw new Error(`プロバイダ一覧の取得に失敗しました: ${response.statusText}`)
  const result = await response.json()
  return result.data ?? result
}

export async function syncMarketplace(providerId?: string): Promise<{ message: string }> {
  const url = providerId
    ? `${API_BASE_URL}/marketplace/sync?providerId=${providerId}`
    : `${API_BASE_URL}/marketplace/sync`
  const response = await apiFetch(url, { method: 'POST' })
  if (!response.ok) throw new Error(`同期に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function getMarketplaceConfig(providerId: string): Promise<MarketplaceConfig> {
  const response = await apiFetch(`${API_BASE_URL}/marketplace/config?providerId=${providerId}`)
  if (!response.ok) throw new Error(`設定の取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function updateMarketplaceConfig(data: MarketplaceConfig): Promise<MarketplaceConfig> {
  const response = await apiFetch(`${API_BASE_URL}/marketplace/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `設定の更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function connectMarketplace(providerId: string, config: Partial<MarketplaceConfig>): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE_URL}/marketplace/providers/${providerId}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `接続に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function disconnectMarketplace(providerId: string): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE_URL}/marketplace/providers/${providerId}/disconnect`, {
    method: 'POST',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `切断に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
