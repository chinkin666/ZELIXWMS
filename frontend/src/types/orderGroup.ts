/**
 * 未分類の特殊値（用于筛选没有被分配到任何分组的订单）
 */
export const UNCATEGORIZED_VALUE = '__uncategorized__'

/**
 * 検品グループ
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
 * 创建/更新検品グループ的表单数据
 */
export interface OrderGroupFormData {
  name: string
  description?: string
  priority?: number
  enabled: boolean
}
