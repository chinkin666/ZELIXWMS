export type TriggerEvent =
  | 'order.created'
  | 'order.confirmed'
  | 'order.shipped'
  // 以下は後端で emit 未実装のため一旦無効化
  // 実装後にコメント解除して有効化する
  // | 'order.carrierReceived'  // 配送業者データ取込時
  // | 'order.printed'          // 印刷完了時
  // | 'order.inspected'        // 検品完了時
  // | 'order.ecExported'       // EC連携時

export const TRIGGER_EVENTS: TriggerEvent[] = [
  'order.created',
  'order.confirmed',
  'order.shipped',
]

export const TRIGGER_EVENT_LABELS: Record<TriggerEvent, string> = {
  'order.created': '出荷指示作成時',
  'order.confirmed': '出荷確定時',
  'order.shipped': '出荷完了時',
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
  setOrderGroup: '出荷グループを変更',
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
