import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface FeatureFlag {
  _id: string
  key: string
  name: string
  description?: string
  defaultEnabled: boolean
  tenantOverrides: Array<{
    tenantId: string
    enabled: boolean
  }>
  group?: string
  createdAt: string
  updatedAt: string
}

export interface FeatureFlagListResponse {
  data: FeatureFlag[]
}

export interface FeatureFlagStatusResponse {
  data: Record<string, boolean>
}

export async function fetchFeatureFlags(): Promise<FeatureFlagListResponse> {
  const response = await fetch(`${API_BASE_URL}/extensions/feature-flags`)
  if (!response.ok) throw new Error(`フィーチャーフラグの取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function fetchFeatureFlagStatus(
  tenantId?: string,
): Promise<FeatureFlagStatusResponse> {
  const url = new URL(`${API_BASE_URL}/extensions/feature-flags/status`)
  if (tenantId) url.searchParams.append('tenantId', tenantId)
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`フィーチャーフラグ状態の取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function createFeatureFlag(data: Partial<FeatureFlag>): Promise<FeatureFlag> {
  const response = await fetch(`${API_BASE_URL}/extensions/feature-flags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'フィーチャーフラグの作成に失敗しました')
  }
  return response.json()
}

export async function updateFeatureFlag(
  id: string,
  data: Partial<FeatureFlag>,
): Promise<FeatureFlag> {
  const response = await fetch(`${API_BASE_URL}/extensions/feature-flags/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'フィーチャーフラグの更新に失敗しました')
  }
  return response.json()
}

export async function deleteFeatureFlag(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/extensions/feature-flags/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'フィーチャーフラグの削除に失敗しました')
  }
}

export async function toggleFeatureFlag(
  id: string,
): Promise<{ _id: string; key: string; defaultEnabled: boolean }> {
  const response = await fetch(`${API_BASE_URL}/extensions/feature-flags/${id}/toggle`, {
    method: 'POST',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'フィーチャーフラグのトグルに失敗しました')
  }
  return response.json()
}

export async function setTenantOverride(
  flagId: string,
  tenantId: string,
  enabled: boolean,
): Promise<FeatureFlag> {
  const response = await fetch(
    `${API_BASE_URL}/extensions/feature-flags/${flagId}/tenant-override`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, enabled }),
    },
  )
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'テナントオーバーライドの設定に失敗しました')
  }
  return response.json()
}

export async function removeTenantOverride(
  flagId: string,
  tenantId: string,
): Promise<FeatureFlag> {
  const response = await fetch(
    `${API_BASE_URL}/extensions/feature-flags/${flagId}/tenant-override/${tenantId}`,
    { method: 'DELETE' },
  )
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || 'テナントオーバーライドの削除に失敗しました')
  }
  return response.json()
}
