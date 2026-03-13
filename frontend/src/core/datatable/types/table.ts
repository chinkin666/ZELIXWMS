import type { Component, VNode } from 'vue'

/**
 * WMS DataTable 列定義
 *
 * 三種渲染模式（互斥，優先級: component > render > prop）:
 * - component: Vue 組件引用，動態渲染
 * - render:    渲染函數，返回 VNode
 * - prop:      簡單文本列，映射到 el-table-column 的 prop
 */
export interface WmsColumnDef<T = any> {
  /** 列唯一標識 */
  key: string
  /** 列標題 */
  title: string
  /** 固定寬度 */
  width?: number | string
  /** 最小寬度 */
  minWidth?: number | string
  /** 固定列位置 */
  fixed?: 'left' | 'right' | boolean
  /** 排序: true=客戶端排序, 'custom'=自定義排序(emit事件) */
  sortable?: boolean | 'custom'
  /** 對齊方式 */
  align?: 'left' | 'center' | 'right'
  /** 列CSS類名 */
  className?: string
  /** 是否可見（默認 true） */
  visible?: boolean

  // --- 渲染模式（三選一） ---

  /** Vue 組件 */
  component?: Component
  /** 渲染函數 */
  render?: (row: T, column: WmsColumnDef<T>) => VNode
  /** 簡單文本字段名 */
  prop?: string

  // --- 組件模式的額外配置 ---

  /**
   * 組件 props 映射函數
   * - 有 props 函數: 組件只接收函數返回的 props
   * - 無 props 函數: 組件自動接收 { row }
   */
  props?: (row: T) => Record<string, any>

  /**
   * 組件事件映射函數
   * 用於處理 cell 組件的 emit（如 ManagementNumberCell 的 edit 事件）
   */
  events?: (row: T) => Record<string, (...args: any[]) => void>
}

/** 排序變更事件 */
export interface WmsSortChangeEvent {
  key: string
  order: 'asc' | 'desc' | null
}
