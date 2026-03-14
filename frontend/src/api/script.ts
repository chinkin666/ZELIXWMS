import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface AutomationScript {
  _id: string
  tenantId?: string
  name: string
  description?: string
  event: string
  code: string
  enabled: boolean
  timeout: number
  createdAt: string
  updatedAt: string
}

export interface ScriptListResponse {
  data: AutomationScript[]
  availableEvents: string[]
}

export interface ScriptExecutionLog {
  _id: string
  scriptId: string
  scriptName: string
  event: string
  status: 'success' | 'error' | 'timeout'
  error?: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  duration: number
  createdAt: string
}

export interface ScriptLogListResponse {
  data: ScriptExecutionLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export async function fetchScripts(params?: { event?: string; enabled?: string }): Promise<ScriptListResponse> {
  const url = new URL(`${API_BASE_URL}/extensions/scripts`)
  if (params?.event) url.searchParams.append('event', params.event)
  if (params?.enabled) url.searchParams.append('enabled', params.enabled)
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`スクリプトの取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function fetchScript(id: string): Promise<AutomationScript> {
  const response = await fetch(`${API_BASE_URL}/extensions/scripts/${id}`)
  if (!response.ok) throw new Error(`スクリプトの取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function createScript(data: Partial<AutomationScript>): Promise<AutomationScript> {
  const response = await fetch(`${API_BASE_URL}/extensions/scripts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `スクリプトの作成に失敗しました`)
  }
  return response.json()
}

export async function updateScript(id: string, data: Partial<AutomationScript>): Promise<AutomationScript> {
  const response = await fetch(`${API_BASE_URL}/extensions/scripts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `スクリプトの更新に失敗しました`)
  }
  return response.json()
}

export async function deleteScript(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/extensions/scripts/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `スクリプトの削除に失敗しました`)
  }
}

export async function toggleScript(id: string): Promise<{ _id: string; enabled: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/extensions/scripts/${id}/toggle`, { method: 'POST' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `スクリプトのトグルに失敗しました`)
  }
  return response.json()
}

export async function validateScriptCode(code: string): Promise<{ valid: boolean; error?: string }> {
  // validate endpoint doesn't need a real script id, reuse a dummy approach
  const response = await fetch(`${API_BASE_URL}/extensions/scripts/validate/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `構文チェックに失敗しました`)
  }
  return response.json()
}

export async function testScript(id: string, payload?: Record<string, unknown>): Promise<{
  success: boolean
  duration: number
  modifications: Record<string, unknown>
  error?: string
}> {
  const response = await fetch(`${API_BASE_URL}/extensions/scripts/${id}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `テスト実行に失敗しました`)
  }
  return response.json()
}

export async function fetchScriptLogs(
  scriptId: string,
  params?: { status?: string; page?: number; limit?: number },
): Promise<ScriptLogListResponse> {
  const url = new URL(`${API_BASE_URL}/extensions/scripts/${scriptId}/logs`)
  if (params?.status) url.searchParams.append('status', params.status)
  if (params?.page) url.searchParams.append('page', String(params.page))
  if (params?.limit) url.searchParams.append('limit', String(params.limit))
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`実行ログの取得に失敗しました: ${response.statusText}`)
  return response.json()
}
