import type { AutoProcessingRule, AutoProcessingRuleFormData } from '@/types/autoProcessingRule'
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export async function fetchAutoProcessingRules(): Promise<AutoProcessingRule[]> {
  const response = await apiFetch(`${API_BASE_URL}/auto-processing-rules`)
  if (!response.ok) {
    throw new Error('ルールの取得に失敗しました')
  }
  return response.json()
}

export async function fetchAutoProcessingRule(id: string): Promise<AutoProcessingRule> {
  const response = await apiFetch(`${API_BASE_URL}/auto-processing-rules/${id}`)
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || 'ルールの取得に失敗しました')
  }
  return response.json()
}

export async function createAutoProcessingRule(data: AutoProcessingRuleFormData): Promise<AutoProcessingRule> {
  const response = await apiFetch(`${API_BASE_URL}/auto-processing-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || 'ルールの作成に失敗しました')
  }
  return response.json()
}

export async function updateAutoProcessingRule(
  id: string,
  data: Partial<AutoProcessingRuleFormData>,
): Promise<AutoProcessingRule> {
  const response = await apiFetch(`${API_BASE_URL}/auto-processing-rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || 'ルールの更新に失敗しました')
  }
  return response.json()
}

export async function deleteAutoProcessingRule(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/auto-processing-rules/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || 'ルールの削除に失敗しました')
  }
}

export async function reorderAutoProcessingRules(orderedIds: string[]): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/auto-processing-rules/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '優先順位の更新に失敗しました')
  }
}

export interface ManualRunResult {
  processed: number
  matched: number
  executed: number
  errors: number
}

export async function runAutoProcessingRule(id: string): Promise<{ message: string; data: ManualRunResult }> {
  const response = await apiFetch(`${API_BASE_URL}/auto-processing-rules/${id}/run`, {
    method: 'POST',
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '手動実行に失敗しました')
  }
  return response.json()
}
