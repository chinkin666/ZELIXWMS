export type RuleModule = 'putaway' | 'picking' | 'wave' | 'replenishment' | 'carrier_selection' | 'order_routing' | 'packing' | 'custom'
export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'between'
export type ActionType = 'assign_zone' | 'assign_location' | 'set_priority' | 'set_carrier' | 'set_wave_group' | 'set_pick_method' | 'trigger_replenishment' | 'notify' | 'custom'
export type LogicOperator = 'AND' | 'OR'

export interface RuleCondition {
  field: string
  operator: ConditionOperator
  value: unknown
}

export interface RuleConditionGroup {
  logic: LogicOperator
  conditions: RuleCondition[]
}

export interface RuleAction {
  type: ActionType
  params: Record<string, unknown>
}

export interface RuleDefinition {
  _id: string
  name: string
  description?: string
  module: RuleModule
  warehouseId?: string
  clientId?: string
  priority: number
  conditionGroups: RuleConditionGroup[]
  actions: RuleAction[]
  stopOnMatch: boolean
  isActive: boolean
  validFrom?: string
  validTo?: string
  executionCount: number
  lastExecutedAt?: string
  memo?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// Japanese display labels
export const RULE_MODULE_LABELS: Record<RuleModule, string> = {
  putaway: '上架',
  picking: '拣货',
  wave: '波次',
  replenishment: '補充',
  carrier_selection: '配送業者選択',
  order_routing: '注文ルーティング',
  packing: '梱包',
  custom: 'カスタム',
}

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  eq: '等しい (=)',
  ne: '等しくない (≠)',
  gt: 'より大きい (>)',
  gte: '以上 (≥)',
  lt: 'より小さい (<)',
  lte: '以下 (≤)',
  in: '含む (IN)',
  not_in: '含まない (NOT IN)',
  contains: '文字列含む',
  starts_with: '前方一致',
  between: '範囲内',
}

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  assign_zone: 'ゾーン割当',
  assign_location: 'ロケーション割当',
  set_priority: '優先度設定',
  set_carrier: '配送業者設定',
  set_wave_group: '波次グループ設定',
  set_pick_method: '拣货方法設定',
  trigger_replenishment: '補充トリガー',
  notify: '通知',
  custom: 'カスタムアクション',
}
