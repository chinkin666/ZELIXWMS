export type TriggerEvent =
  | 'order.created'
  | 'order.confirmed'
  | 'order.carrierReceived'
  | 'order.printed'
  | 'order.inspected'
  | 'order.shipped'
  | 'order.ecExported'

export const TRIGGER_EVENTS: TriggerEvent[] = [
  'order.created',
  'order.confirmed',
  'order.carrierReceived',
  'order.printed',
  'order.inspected',
  'order.shipped',
  'order.ecExported',
]

export const TRIGGER_EVENT_LABELS: Record<TriggerEvent, string> = {
  'order.created': '注文作成時',
  'order.confirmed': '出荷確定時',
  'order.carrierReceived': '配送会社データ取込時',
  'order.printed': '印刷完了時',
  'order.inspected': '検品完了時',
  'order.shipped': '出荷完了時',
  'order.ecExported': 'EC連携時',
}

export type ConditionType = 'orderField' | 'orderStatus' | 'orderGroup' | 'carrierRawRow' | 'sourceRawRow'

export type RawRowOperator = 'is' | 'isNot' | 'contains' | 'notContains' | 'isEmpty' | 'hasAnyValue'

export type OrderFieldOperator =
  | 'is' | 'isNot'
  | 'contains' | 'notContains'
  | 'hasAnyValue' | 'isEmpty'
  | 'equals' | 'notEquals'
  | 'lessThan' | 'lessThanOrEqual'
  | 'greaterThan' | 'greaterThanOrEqual'
  | 'between'
  | 'before' | 'after'

export const RAW_ROW_OPERATOR_LABELS: Record<RawRowOperator, string> = {
  is: '一致',
  isNot: '不一致',
  contains: '含む',
  notContains: '含まない',
  isEmpty: '空',
  hasAnyValue: '値あり',
}

export const ORDER_FIELD_OPERATOR_LABELS: Record<OrderFieldOperator, string> = {
  is: '一致',
  isNot: '不一致',
  contains: '含む',
  notContains: '含まない',
  hasAnyValue: '値あり',
  isEmpty: '空',
  equals: '等しい',
  notEquals: '等しくない',
  lessThan: '未満',
  lessThanOrEqual: '以下',
  greaterThan: '超える',
  greaterThanOrEqual: '以上',
  between: '範囲',
  before: '以前',
  after: '以降',
}

export type ActionType = 'addProduct' | 'setOrderGroup'

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  addProduct: '商品を追加',
  setOrderGroup: '検品グループを変更',
}

export interface AutoProcessingCondition {
  type: ConditionType

  // orderField
  fieldKey?: string
  operator?: OrderFieldOperator
  value?: unknown
  orderGroupIds?: string[]

  // carrierRawRow
  carrierColumnName?: string
  carrierOperator?: RawRowOperator
  carrierValue?: unknown

  // sourceRawRow
  sourceColumnName?: string
  sourceOperator?: RawRowOperator
  sourceValue?: unknown
}

export interface AutoProcessingAction {
  type: ActionType
  productSku?: string
  quantity?: number
  orderGroupId?: string
}

export interface AutoProcessingRule {
  _id: string
  name: string
  enabled: boolean
  triggerMode: 'auto' | 'manual'
  allowRerun: boolean
  memo?: string
  triggerEvents: TriggerEvent[]
  conditions: AutoProcessingCondition[]
  actions: AutoProcessingAction[]
  priority: number
  createdAt: string
  updatedAt: string
}

export interface AutoProcessingRuleFormData {
  name: string
  enabled: boolean
  triggerMode: 'auto' | 'manual'
  allowRerun: boolean
  memo?: string
  triggerEvents: TriggerEvent[]
  conditions: AutoProcessingCondition[]
  actions: AutoProcessingAction[]
}
