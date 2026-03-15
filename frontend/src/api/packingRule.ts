import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

/**
 * 梱包ルール耗材データ型 / 梱包规则耗材数据类型
 */
export interface PackingRuleMaterial {
  materialSku: string
  materialName?: string
  quantity: number
  unitCost?: number
}

/**
 * 梱包ルールデータ型 / 梱包规则数据类型
 */
export interface PackingRule {
  _id: string
  name: string
  priority: number
  isActive: boolean
  conditions: {
    maxWeight?: number
    maxDimension?: number
    coolType?: string
    invoiceType?: string
    maxProductCount?: number
  }
  materials: PackingRuleMaterial[]
  memo?: string
  createdAt: string
  updatedAt: string
}

/**
 * 梱包ルール評価結果 / 梱包规则评估结果
 */
export interface EvaluateResult {
  materials: PackingRuleMaterial[]
  rule?: string
}

/**
 * 梱包ルール一覧レスポンス / 梱包规则列表响应
 */
export interface PackingRuleListResponse {
  data: PackingRule[]
  total: number
}

/**
 * 梱包ルール一覧を取得 / 获取梱包规则列表
 */
export async function fetchPackingRules(): Promise<PackingRuleListResponse> {
  const response = await apiFetch(`${API_BASE_URL}/packing-rules`)
  if (!response.ok) {
    throw new Error(`梱包ルールの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 梱包ルールを作成 / 创建梱包规则
 */
export async function createPackingRule(data: Partial<PackingRule>): Promise<PackingRule> {
  const response = await apiFetch(`${API_BASE_URL}/packing-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `梱包ルールの作成に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 梱包ルールを更新 / 更新梱包规则
 */
export async function updatePackingRule(id: string, data: Partial<PackingRule>): Promise<PackingRule> {
  const response = await apiFetch(`${API_BASE_URL}/packing-rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `梱包ルールの更新に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 梱包ルールを削除 / 删除梱包规则
 */
export async function deletePackingRule(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/packing-rules/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `梱包ルールの削除に失敗しました: ${response.statusText}`)
  }
}

/**
 * 梱包ルールを評価（注文データに基づいて最適な梱包を判定）
 * 评估梱包规则（根据订单数据判定最优梱包方案）
 */
export async function evaluatePackingRules(orderData: Record<string, unknown>): Promise<EvaluateResult> {
  const response = await apiFetch(`${API_BASE_URL}/packing-rules/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.message || `梱包ルール評価に失敗しました: ${response.statusText}`)
  }
  return response.json()
}
