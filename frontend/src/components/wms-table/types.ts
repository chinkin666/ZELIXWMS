/**
 * WMS通用テーブル型定義 / WMS通用表格类型定义
 *
 * 全ての列・フィルター・アクション定義はJSON/TSで駆動。
 * 所有列、筛选器、操作定义均由JSON/TS驱动。
 */
import type { ColumnDef, SortingState, ColumnFiltersState, VisibilityState } from '@tanstack/vue-table'
import type { Component } from 'vue'

// ─── 列スキーマ / 列Schema ───────────────────────────────────────────

export interface WmsColumnSchema<T = any> {
  /** 列キー（accessorKey） */
  key: string
  /** 表示ラベル */
  label: string
  /** 列タイプ */
  type: 'text' | 'number' | 'date' | 'datetime' | 'badge' | 'boolean' | 'currency' | 'custom'
  /** ソート可能 */
  sortable?: boolean
  /** フィルター可能 */
  filterable?: boolean
  /** フィルタータイプ */
  filterType?: 'text' | 'select' | 'date-range' | 'number-range'
  /** フィルター選択肢 */
  filterOptions?: Array<{ label: string; value: string; icon?: Component }>
  /** 初期表示 */
  visible?: boolean
  /** 列幅 */
  width?: number
  /** 配置 */
  align?: 'left' | 'center' | 'right'
  /** 固定列 */
  pinned?: 'left' | 'right'
  /** バッジマッピング */
  badgeMap?: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>
  /** 通貨フォーマット */
  currencyPrefix?: string
  /** 日付フォーマット */
  dateFormat?: string
  /** カスタムレンダラー */
  render?: (value: any, row: T) => any
  /** セルクリックハンドラ */
  onCellClick?: (row: T) => void
}

// ─── ツールバースキーマ / 工具栏Schema ──────────────────────────────

export interface WmsToolbarAction {
  key: string
  label: string
  icon?: Component
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost'
  /** 選択行が必要か */
  requireSelection?: boolean
  /** アクションハンドラ */
  handler: (selectedRows: any[]) => void | Promise<void>
}

export interface WmsToolbarConfig {
  /** グローバル検索 */
  searchEnabled?: boolean
  searchPlaceholder?: string
  searchColumnKey?: string
  /** アクションボタン */
  actions?: WmsToolbarAction[]
  /** バッチアクション（選択行に対する操作） */
  batchActions?: WmsToolbarAction[]
}

// ─── テーブルプロパティ / 表格Props ──────────────────────────────────

export interface WmsTableProps<T = any> {
  /** 列スキーマ */
  columns: WmsColumnSchema<T>[]
  /** データ */
  data: T[]
  /** 行キー */
  rowKey?: string
  /** ローディング中 */
  loading?: boolean
  /** ツールバー設定 */
  toolbar?: WmsToolbarConfig
  /** ページネーション */
  pagination?: {
    enabled: boolean
    mode: 'client' | 'server'
    pageSize?: number
    pageSizes?: number[]
    total?: number
    page?: number
  }
  /** 行選択 */
  selectable?: boolean
  /** 行クリックハンドラ */
  onRowClick?: (row: T) => void
}

// ─── テーブルイベント / 表格事件 ──────────────────────────────────────

export interface WmsTableEmits {
  'page-change': [payload: { page: number; pageSize: number }]
  'sort-change': [payload: { key: string; order: 'asc' | 'desc' }]
  'filter-change': [payload: Record<string, any>]
  'selection-change': [rows: any[]]
  'row-click': [row: any]
}

// ─── フォームスキーマ / 表单Schema ──────────────────────────────────

export interface WmsFieldSchema {
  key: string
  label: string
  type: 'text' | 'number' | 'select' | 'date' | 'datetime' | 'switch' | 'textarea' | 'radio' | 'checkbox' | 'custom'
  placeholder?: string
  required?: boolean
  disabled?: boolean | ((formData: Record<string, any>) => boolean)
  visible?: boolean | ((formData: Record<string, any>) => boolean)
  options?: Array<{ label: string; value: string | number | boolean }>
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    message?: string
    custom?: (value: any, formData: Record<string, any>) => string | undefined
  }
  /** グリッドカラム数 (1 or 2) */
  colSpan?: 1 | 2
  /** グループラベル（セクション区切り） */
  group?: string
  /** ヘルプテキスト */
  helpText?: string
}

export interface WmsFormSchema {
  fields: WmsFieldSchema[]
  /** フォーム送信ハンドラ */
  onSubmit?: (data: Record<string, any>) => void | Promise<void>
}
