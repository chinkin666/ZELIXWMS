import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

export interface Webhook {
  _id: string
  event: string
  name: string
  url: string
  secret: string
  enabled: boolean
  retry: number
  headers?: Record<string, string>
  description?: string
  createdAt: string
  updatedAt: string
}

export interface WebhookListResponse {
  data: Webhook[]
  availableEvents: string[]
}

export interface WebhookLog {
  _id: string
  webhookId: string
  event: string
  payload?: Record<string, unknown>
  status: 'success' | 'failed' | 'retrying'
  statusCode: number
  responseBody?: string
  attempt: number
  error?: string
  duration: number
  createdAt: string
}

export interface WebhookLogListResponse {
  data: WebhookLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface WebhookTestResult {
  success: boolean
  statusCode: number
  duration: number
  error?: string
}

export async function fetchWebhooks(params?: { event?: string; enabled?: string }): Promise<WebhookListResponse> {
  const url = new URL(`${API_BASE_URL}/extensions/webhooks`)
  if (params?.event) url.searchParams.append('event', params.event)
  if (params?.enabled) url.searchParams.append('enabled', params.enabled)
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Webhook の取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function createWebhook(data: Partial<Webhook>): Promise<Webhook> {
  const response = await fetch(`${API_BASE_URL}/extensions/webhooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Webhook の作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function updateWebhook(id: string, data: Partial<Webhook>): Promise<Webhook> {
  const response = await fetch(`${API_BASE_URL}/extensions/webhooks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Webhook の更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteWebhook(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/extensions/webhooks/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Webhook の削除に失敗しました: ${response.statusText}`)
  }
}

export async function testWebhook(id: string): Promise<WebhookTestResult> {
  const response = await fetch(`${API_BASE_URL}/extensions/webhooks/${id}/test`, {
    method: 'POST',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Webhook テストに失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function toggleWebhook(id: string): Promise<{ _id: string; enabled: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/extensions/webhooks/${id}/toggle`, {
    method: 'POST',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Webhook のトグルに失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchWebhookLogs(
  webhookId: string,
  params?: { status?: string; page?: number; limit?: number },
): Promise<WebhookLogListResponse> {
  const url = new URL(`${API_BASE_URL}/extensions/webhooks/${webhookId}/logs`)
  if (params?.status) url.searchParams.append('status', params.status)
  if (params?.page) url.searchParams.append('page', String(params.page))
  if (params?.limit) url.searchParams.append('limit', String(params.limit))
  const response = await fetch(url.toString())
  if (!response.ok) throw new Error(`Webhook ログの取得に失敗しました: ${response.statusText}`)
  return response.json()
}
