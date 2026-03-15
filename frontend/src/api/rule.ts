import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

export interface RuleCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'regex'
  value: any
}

export interface RuleConditionGroup {
  logic: 'AND' | 'OR'
  conditions: RuleCondition[]
}

export interface RuleAction {
  type: string
  params: Record<string, any>
}

export interface RuleDefinition {
  _id: string
  ruleCode?: string
  name: string
  description?: string
  module: 'inbound' | 'outbound' | 'inventory' | 'slotting' | 'billing' | 'notification' | 'quality'
  conditionGroups: RuleConditionGroup[]
  actions: RuleAction[]
  priority: number
  isActive: boolean
  stopOnMatch?: boolean
  validFrom?: string
  validTo?: string
  executionCount?: number
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface RuleListParams {
  search?: string
  module?: string
  isActive?: string
  page?: number
  limit?: number
}

export interface RuleListResponse {
  data: RuleDefinition[]
  total: number
}

export interface RuleTestResult {
  ruleId: string
  ruleCode?: string
  ruleName: string
  actions: RuleAction[]
}

export async function fetchRules(params?: RuleListParams): Promise<RuleListResponse> {
  const url = new URL(`${API_BASE_URL}/rules`)
  if (params) {
    if (params.search) url.searchParams.append('search', params.search)
    if (params.module) url.searchParams.append('module', params.module)
    if (params.isActive !== undefined) url.searchParams.append('isActive', params.isActive)
    if (params.page) url.searchParams.append('page', String(params.page))
    if (params.limit) url.searchParams.append('limit', String(params.limit))
  }
  const response = await apiFetch(url.toString())
  if (!response.ok) {
    throw new Error(`ルールの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function fetchRule(id: string): Promise<RuleDefinition> {
  const response = await apiFetch(`${API_BASE_URL}/rules/${id}`)
  if (!response.ok) {
    throw new Error(`ルールの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

export async function createRule(data: Partial<RuleDefinition>): Promise<RuleDefinition> {
  const response = await apiFetch(`${API_BASE_URL}/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ルールの作成に失敗しました: ${message}`)
  }
  return response.json()
}

export async function updateRule(id: string, data: Partial<RuleDefinition>): Promise<RuleDefinition> {
  const response = await apiFetch(`${API_BASE_URL}/rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ルールの更新に失敗しました: ${message}`)
  }
  return response.json()
}

export async function deleteRule(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/rules/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ルールの削除に失敗しました: ${message}`)
  }
}

export async function toggleRule(id: string): Promise<RuleDefinition> {
  const response = await apiFetch(`${API_BASE_URL}/rules/${id}/toggle`, {
    method: 'PUT',
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ルールの切替に失敗しました: ${message}`)
  }
  return response.json()
}

export async function testRule(data: { module: string; context: Record<string, any> }): Promise<RuleTestResult[]> {
  const response = await apiFetch(`${API_BASE_URL}/rules/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => ({}))).message || response.statusText
    throw new Error(`ルールテストに失敗しました: ${message}`)
  }
  return response.json()
}
