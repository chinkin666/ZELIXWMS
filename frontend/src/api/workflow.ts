/**
 * ワークフロー API / 工作流 API
 */
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

// === 型定義 / 类型定义 ===

export interface Workflow {
  _id: string
  name: string
  description?: string
  triggerEvent: string
  actions: WorkflowAction[]
  enabled: boolean
  lastRunAt?: string
  lastRunStatus?: 'success' | 'failed' | 'skipped'
  runCount: number
  createdAt: string
  updatedAt: string
}

export interface WorkflowAction {
  type: string
  config: Record<string, unknown>
}

export interface WorkflowTestResult {
  success: boolean
  message: string
  actionsExecuted: number
}

// === API 関数 / API 函数 ===

export async function getWorkflows(): Promise<Workflow[]> {
  const response = await apiFetch(`${API_BASE_URL}/workflows`)
  if (!response.ok) throw new Error(`ワークフロー一覧の取得に失敗しました: ${response.statusText}`)
  const result = await response.json()
  return result.data ?? result
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const response = await apiFetch(`${API_BASE_URL}/workflows/${id}`)
  if (!response.ok) throw new Error(`ワークフローの取得に失敗しました: ${response.statusText}`)
  return response.json()
}

export async function createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
  const response = await apiFetch(`${API_BASE_URL}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `ワークフローの作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
  const response = await apiFetch(`${API_BASE_URL}/workflows/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `ワークフローの更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function deleteWorkflow(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/workflows/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `ワークフローの削除に失敗しました: ${response.statusText}`)
  }
}

export async function toggleWorkflow(id: string): Promise<{ _id: string; enabled: boolean }> {
  const response = await apiFetch(`${API_BASE_URL}/workflows/${id}/toggle`, { method: 'POST' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `ワークフローのトグルに失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function testWorkflow(id: string): Promise<WorkflowTestResult> {
  const response = await apiFetch(`${API_BASE_URL}/workflows/${id}/test`, { method: 'POST' })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `ワークフローのテストに失敗しました: ${response.statusText}`)
  }
  return response.json()
}
