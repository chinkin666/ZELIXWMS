import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export interface PluginInfo {
  name: string
  version: string
  description: string
  author: string
  status: string
  hooks: string[]
  permissions: string[]
  config?: Record<string, { type: string; default?: unknown; description?: string }>
  errorMessage?: string
  installedAt?: string
  enabledAt?: string
}

export interface PluginListResponse {
  data: PluginInfo[]
}

export async function fetchPlugins(): Promise<PluginListResponse> {
  const response = await apiFetch(`${API_BASE_URL}/extensions/plugins`)
  if (!response.ok) throw new Error(`プラグインの取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function fetchPlugin(name: string): Promise<PluginInfo> {
  const response = await apiFetch(`${API_BASE_URL}/extensions/plugins/${name}`)
  if (!response.ok) throw new Error(`プラグインの取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function enablePlugin(name: string): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE_URL}/extensions/plugins/${name}/enable`, { method: 'POST' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `プラグインの有効化に失敗しました`)
  }
  return response.json()
}

export async function disablePlugin(name: string): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE_URL}/extensions/plugins/${name}/disable`, { method: 'POST' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `プラグインの無効化に失敗しました`)
  }
  return response.json()
}

export async function fetchPluginConfig(name: string, tenantId?: string): Promise<{ data: Record<string, unknown> }> {
  const url = new URL(`${API_BASE_URL}/extensions/plugins/${name}/config`)
  if (tenantId) url.searchParams.append('tenantId', tenantId)
  const response = await apiFetch(url.toString())
  if (!response.ok) throw new Error(`プラグイン設定の取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function updatePluginConfig(
  name: string,
  config: Record<string, unknown>,
  tenantId?: string,
): Promise<{ data: Record<string, unknown> }> {
  const url = new URL(`${API_BASE_URL}/extensions/plugins/${name}/config`)
  if (tenantId) url.searchParams.append('tenantId', tenantId)
  const response = await apiFetch(url.toString(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `プラグイン設定の更新に失敗しました`)
  }
  return response.json()
}

// ─── 健康检查 / ヘルスチェック ───

export interface PluginHealthResult {
  healthy: boolean
  message?: string
}

export interface PluginsHealthDashboard {
  overall: 'healthy' | 'degraded'
  plugins: Array<{
    name: string
    version: string
    status: string
    healthy: boolean
    message?: string
  }>
  checkedAt: string
}

export async function fetchPluginHealth(name: string): Promise<PluginHealthResult> {
  const response = await apiFetch(`${API_BASE_URL}/extensions/plugins/${name}/health`)
  if (!response.ok) throw new Error(`ヘルスチェックに失敗しました: ${response.statusText}`)
  return response.json()
}

export async function fetchPluginsHealth(): Promise<PluginsHealthDashboard> {
  const response = await apiFetch(`${API_BASE_URL}/extensions/plugins-health`)
  if (!response.ok) throw new Error(`ヘルスダッシュボードの取得に失敗しました: ${response.statusText}`)
  return response.json()
}

// ─── SDK 信息 / SDK 情報 ───

export interface SdkInfo {
  version: string
  availableModels: string[]
  availableEvents: string[]
}

export async function fetchSdkInfo(): Promise<SdkInfo> {
  const response = await apiFetch(`${API_BASE_URL}/extensions/sdk-info`)
  if (!response.ok) throw new Error(`SDK情報の取得に失敗しました: ${response.statusText}`)
  return response.json()
}
