/**
 * 未分類の特殊値（グループに割り当てられていない注文のフィルタリング用） / 未分類的特殊值（用于筛选没有被分配到任何分组的订单）
 */
export const UNCATEGORIZED_VALUE = '__uncategorized__'

/**
 * 出荷グループ
 */
export interface OrderGroup {
  _id: string
  orderGroupId: string
  name: string
  description?: string
  priority: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 出荷グループの作成/更新フォームデータ / 创建/更新出荷グループ的表单数据
 */
export interface OrderGroupFormData {
  name: string
  description?: string
  priority?: number
  enabled: boolean
}
