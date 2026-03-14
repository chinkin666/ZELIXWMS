/**
 * テーブル列設定の型定義 / 表格列配置类型定义
 * 検索設定をサポートし、SearchFormコンポーネントと共有可能 / 支持搜索配置，可以与 SearchForm 组件复用
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

// フィールドタイプ（バックエンドと統一） / 字段类型，与后端统一
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'dateOnly' | 'object' | 'array'

export interface TableColumn {
  key: string
  dataKey?: string
  title: string
  width: number
  // フィールドタイプ（バックエンドと統一） / 字段类型（与后端统一）
  fieldType?: FieldType
  // 必須かどうか / 是否必填
  required?: boolean
  // 検索可能かどうか（デフォルトfalse、searchTypeまたはfieldTypeが設定されている場合はtrue） / 是否可搜索（默认为 false，如果设置了 searchType 或 fieldType 则为 true）
  searchable?: boolean
  // 検索タイプ（設定すると検索が自動有効化、未設定でもfieldTypeがあれば自動推定） / 搜索类型，如果设置则自动启用搜索；如果不设置但 fieldType 存在，会根据 fieldType 自动推断
  searchType?: SearchType
  // selectタイプの場合、選択肢を提供 / 对于 select 类型，提供选项
  searchOptions?: SearchOption[]
  // date/daterangeタイプの場合、日付フォーマット（デフォルト 'YYYY-MM-DD'） / 对于 date/daterange 类型，日期格式（默认 'YYYY-MM-DD'）
  dateFormat?: string
  // numberタイプの場合、最小値/最大値 / 对于 number 类型，最小值/最大值
  min?: number
  max?: number
  // 精度（数値タイプ用） / 精度（用于数字类型）
  precision?: number
  // フォームで編集可能かどうか（デフォルトtrue） / 是否在表单中可编辑（默认 true）
  formEditable?: boolean
  // Conditional disabled function - field is disabled when this returns true
  disabledWhen?: (formData: Record<string, any>) => boolean
  // Conditional required function - field is required when this returns true (overrides required prop)
  requiredWhen?: (formData: Record<string, any>) => boolean
  // テーブルに表示するかどうか（デフォルトtrue） / 是否在表格中显示（默认 true）
  tableVisible?: boolean
  // ソート可能かどうか（デフォルトtrue、fieldTypeが設定されていれば自動有効化） / 是否可排序（默认 true，如果设置了 fieldType 则自动启用）
  sortable?: boolean
  // カスタムソート関数（オプション、未指定時はデフォルトのソートロジックを使用） / 自定义排序函数（可选，如果不提供则使用默认排序逻辑）
  sortMethod?: (a: any, b: any) => number
  // その他の列設定... / 其他列配置...
  [key: string]: any
}

/**
 * フィルター項目インターフェース / 过滤器项接口
 */
export interface FilterItem {
  id: string
  fieldKey: string
  fieldLabel: string
  type: SearchType
  value: any
  operator: Operator
  // 列の元の設定を保持（フォーマット表示等に使用） / 保存列的原始配置，用于格式化显示等
  column?: TableColumn
}

