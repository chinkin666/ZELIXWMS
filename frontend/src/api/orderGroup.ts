import type { OrderGroup, OrderGroupFormData } from '@/types/orderGroup'
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()

/**
 * 全出荷グループ取得（優先度順） / 获取所有检品グループ（按优先级排序）
 */
export async function fetchOrderGroups(): Promise<OrderGroup[]> {
  const response = await apiFetch(`${API_BASE_URL}/order-groups`)
  if (!response.ok) {
    throw new Error(`出荷グループの取得に失敗しました: ${response.statusText}`)
  }
  const json = await response.json()
  return Array.isArray(json) ? json : (json.items ?? json.data ?? [])
}

/**
 * 単一出荷グループ取得 / 获取单个检品グループ
 */
export async function fetchOrderGroup(id: string): Promise<OrderGroup> {
  const response = await apiFetch(`${API_BASE_URL}/order-groups/${id}`)
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '出荷グループの取得に失敗しました')
  }
  return response.json()
}

/**
 * 出荷グループ作成 / 创建检品グループ
 */
export async function createOrderGroup(data: OrderGroupFormData): Promise<OrderGroup> {
  const response = await apiFetch(`${API_BASE_URL}/order-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '出荷グループの作成に失敗しました')
  }
  return response.json()
}

/**
 * 出荷グループ更新 / 更新检品グループ
 */
export async function updateOrderGroup(id: string, data: Partial<OrderGroupFormData>): Promise<OrderGroup> {
  const response = await apiFetch(`${API_BASE_URL}/order-groups/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '出荷グループの更新に失敗しました')
  }
  return response.json()
}

/**
 * 出荷グループ削除 / 删除检品グループ
 */
export async function deleteOrderGroup(id: string): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/order-groups/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '出荷グループの削除に失敗しました')
  }
}

/**
 * 各グループの注文数取得 / 获取各分组的订单数量
 */
export interface OrderGroupCounts {
  total: number
  groups: Record<string, number>
  uncategorized: number
}

export async function fetchOrderGroupCounts(): Promise<OrderGroupCounts> {
  const response = await apiFetch(`${API_BASE_URL}/order-groups/counts`)
  if (!response.ok) {
    throw new Error('カウントの取得に失敗しました')
  }
  return response.json()
}

/**
 * 出荷グループの優先順位更新 / 更新检品グループの优先级顺序
 */
export async function reorderOrderGroups(orderedIds: string[]): Promise<void> {
  const response = await apiFetch(`${API_BASE_URL}/order-groups/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '優先順位の更新に失敗しました')
  }
}
