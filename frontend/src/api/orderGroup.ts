import type { OrderGroup, OrderGroupFormData } from '@/types/orderGroup'
import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

/**
 * 全検品グループ取得（優先度順） / 获取所有检品グループ（按优先级排序）
 */
export async function fetchOrderGroups(): Promise<OrderGroup[]> {
  const response = await fetch(`${API_BASE_URL}/order-groups`)
  if (!response.ok) {
    throw new Error(`検品グループの取得に失敗しました: ${response.statusText}`)
  }
  return response.json()
}

/**
 * 単一検品グループ取得 / 获取单个检品グループ
 */
export async function fetchOrderGroup(id: string): Promise<OrderGroup> {
  const response = await fetch(`${API_BASE_URL}/order-groups/${id}`)
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '検品グループの取得に失敗しました')
  }
  return response.json()
}

/**
 * 検品グループ作成 / 创建检品グループ
 */
export async function createOrderGroup(data: OrderGroupFormData): Promise<OrderGroup> {
  const response = await fetch(`${API_BASE_URL}/order-groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '検品グループの作成に失敗しました')
  }
  return response.json()
}

/**
 * 検品グループ更新 / 更新检品グループ
 */
export async function updateOrderGroup(id: string, data: Partial<OrderGroupFormData>): Promise<OrderGroup> {
  const response = await fetch(`${API_BASE_URL}/order-groups/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '検品グループの更新に失敗しました')
  }
  return response.json()
}

/**
 * 検品グループ削除 / 删除检品グループ
 */
export async function deleteOrderGroup(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/order-groups/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '検品グループの削除に失敗しました')
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
  const response = await fetch(`${API_BASE_URL}/order-groups/counts`)
  if (!response.ok) {
    throw new Error('カウントの取得に失敗しました')
  }
  return response.json()
}

/**
 * 検品グループの優先順位更新 / 更新检品グループの优先级顺序
 */
export async function reorderOrderGroups(orderedIds: string[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/order-groups/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  })
  if (!response.ok) {
    const json = await response.json().catch(() => ({}))
    throw new Error(json?.message || '優先順位の更新に失敗しました')
  }
}
