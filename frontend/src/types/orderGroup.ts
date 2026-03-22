/**
 * 未分類の特殊値（グループに割り当てられていない注文のフィルタリング用） / 未分類的特殊值（用于筛选没有被分配到任何分组的订单）
 */
export const UNCATEGORIZED_VALUE = '__uncategorized__'

/**
 * 分組条件の型定義 / 分组条件类型定义
 */
export type SortCriteriaType = 'prefecture' | 'customer' | 'sku_count' | 'business_type' | 'sla'

export interface SortCriteria {
  type: SortCriteriaType
  prefecture?: { regions: string[] }
  customer?: { clientIds: string[] }
  skuCount?: { single: boolean; multi: boolean }
  businessType?: { types: ('btoc' | 'btob' | 'btob_afc' | 'fba' | 'rsl')[] }
  sla?: { maxHours: number }
}

/**
 * 分組条件タイプのラベル定義 / 分组条件类型的标签定义
 */
export const SORT_CRITERIA_TYPE_LABELS: Record<SortCriteriaType, { ja: string; zh: string }> = {
  prefecture: { ja: '都道府県', zh: '都道府县' },
  customer: { ja: '荷主（顧客）', zh: '货主（客户）' },
  sku_count: { ja: 'SKU数（単品/複数）', zh: 'SKU数（单品/多品）' },
  business_type: { ja: 'ビジネスタイプ', zh: '业务类型' },
  sla: { ja: 'SLA（納期）', zh: 'SLA（交期）' },
}

/**
 * ビジネスタイプのラベル定義 / 业务类型的标签定义
 */
export const BUSINESS_TYPE_LABELS: Record<string, { ja: string; zh: string }> = {
  btoc: { ja: 'B2C（個人向け）', zh: 'B2C（面向个人）' },
  btob: { ja: 'B2B（法人向け）', zh: 'B2B（面向企业）' },
  btob_afc: { ja: 'B2B-AFC（法人転送）', zh: 'B2B-AFC（企业转运）' },
  fba: { ja: 'FBA', zh: 'FBA' },
  rsl: { ja: 'RSL', zh: 'RSL' },
}

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
  sortCriteria?: SortCriteria | null
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
  sortCriteria?: SortCriteria | null
}

/**
 * 自動振り分け結果 / 自动分配结果
 */
export interface AutoAssignResult {
  groupId: string
  groupName: string
  orderIds: string[]
}
