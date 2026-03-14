import type { Component, VNode } from 'vue'

/**
 * WMS DataTable 列定義 / WMS DataTable 列定义
 *
 * 三種レンダリングモード（排他、優先度: component > render > prop） / 三种渲染模式（互斥，优先级: component > render > prop）:
 * - component: Vueコンポーネント参照、動的レンダリング / Vue 组件引用，动态渲染
 * - render:    レンダリング関数、VNodeを返す / 渲染函数，返回 VNode
 * - prop:      シンプルテキスト列、el-table-columnのpropにマッピング / 简单文本列，映射到 el-table-column 的 prop
 */
export interface WmsColumnDef<T = any> {
  /** 列の一意識別子 / 列唯一标识 */
  key: string
  /** 列タイトル / 列标题 */
  title: string
  /** 固定幅 / 固定宽度 */
  width?: number | string
  /** 最小幅 / 最小宽度 */
  minWidth?: number | string
  /** 固定列位置 / 固定列位置 */
  fixed?: 'left' | 'right' | boolean
  /** ソート: true=クライアント側ソート, 'custom'=カスタムソート(emitイベント) / 排序: true=客户端排序, 'custom'=自定义排序(emit事件) */
  sortable?: boolean | 'custom'
  /** 配置方式 / 对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 列CSSクラス名 / 列CSS类名 */
  className?: string
  /** 表示するかどうか（デフォルト true） / 是否可见（默认 true） */
  visible?: boolean

  // --- レンダリングモード（3つから1つ選択） / 渲染模式（三选一） ---

  /** Vueコンポーネント / Vue 组件 */
  component?: Component
  /** レンダリング関数 / 渲染函数 */
  render?: (row: T, column: WmsColumnDef<T>) => VNode
  /** シンプルテキストフィールド名 / 简单文本字段名 */
  prop?: string

  // --- コンポーネントモードの追加設定 / 组件模式的额外配置 ---

  /**
   * コンポーネントpropsマッピング関数 / 组件 props 映射函数
   * - props関数あり: コンポーネントは関数が返すpropsのみ受け取る / 有 props 函数: 组件只接收函数返回的 props
   * - props関数なし: コンポーネントは自動的に { row } を受け取る / 无 props 函数: 组件自动接收 { row }
   */
  props?: (row: T) => Record<string, any>

  /**
   * コンポーネントイベントマッピング関数 / 组件事件映射函数
   * cellコンポーネントのemitを処理する（例: ManagementNumberCellのeditイベント） / 用于处理 cell 组件的 emit（如 ManagementNumberCell 的 edit 事件）
   */
  events?: (row: T) => Record<string, (...args: any[]) => void>
}

/** ソート変更イベント / 排序变更事件 */
export interface WmsSortChangeEvent {
  key: string
  order: 'asc' | 'desc' | null
}
