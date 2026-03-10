/**
 * 表格列配置类型定义
 * 支持搜索配置，可以与 SearchForm 组件复用
 */

export type SearchType = 'string' | 'number' | 'date' | 'daterange' | 'select' | 'boolean'

export type StringOperator =
  | 'is'
  | 'isNot'
  | 'contains'
  | 'notContains'
  | 'hasAnyValue'
  | 'isEmpty'
export type NumberOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'between'
  | 'hasAnyValue'
export type DateOperator =
  | 'equals'
  | 'notEquals'
  | 'before'
  | 'after'
  | 'between'
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'last7Days'
  | 'last30Days'
  | 'next7Days'
  | 'next30Days'
export type SelectOperator = 'is' | 'isNot' | 'hasAnyValue' | 'in'
export type BooleanOperator = 'is' | 'isNot'

export type Operator = StringOperator | NumberOperator | DateOperator | SelectOperator | BooleanOperator

export interface SearchOption {
  label: string
  value: string | number | boolean
}

// 字段类型，与后端统一
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'dateOnly' | 'object' | 'array'

export interface TableColumn {
  key: string
  dataKey?: string
  title: string
  width: number
  // 字段类型（与后端统一）
  fieldType?: FieldType
  // 是否必填
  required?: boolean
  // 是否可搜索（默认为 false，如果设置了 searchType 或 fieldType 则为 true）
  searchable?: boolean
  // 搜索类型，如果设置则自动启用搜索；如果不设置但 fieldType 存在，会根据 fieldType 自动推断
  searchType?: SearchType
  // 对于 select 类型，提供选项
  searchOptions?: SearchOption[]
  // 对于 date/daterange 类型，日期格式（默认 'YYYY-MM-DD'）
  dateFormat?: string
  // 对于 number 类型，最小值/最大值
  min?: number
  max?: number
  // 精度（用于数字类型）
  precision?: number
  // 是否在表单中可编辑（默认 true）
  formEditable?: boolean
  // Conditional disabled function - field is disabled when this returns true
  disabledWhen?: (formData: Record<string, any>) => boolean
  // Conditional required function - field is required when this returns true (overrides required prop)
  requiredWhen?: (formData: Record<string, any>) => boolean
  // 是否在表格中显示（默认 true）
  tableVisible?: boolean
  // 是否可排序（默认 true，如果设置了 fieldType 则自动启用）
  sortable?: boolean
  // 自定义排序函数（可选，如果不提供则使用默认排序逻辑）
  sortMethod?: (a: any, b: any) => number
  // 其他列配置...
  [key: string]: any
}

/**
 * 过滤器项接口
 */
export interface FilterItem {
  id: string
  fieldKey: string
  fieldLabel: string
  type: SearchType
  value: any
  operator: Operator
  // 保存列的原始配置，用于格式化显示等
  column?: TableColumn
}

