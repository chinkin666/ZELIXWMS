/**
 * DataTable 列定義型 / DataTable列定义类型
 * 旧 Table.vue との後方互換性を維持 / 与旧 Table.vue 保持向后兼容
 */
export interface DataTableColumn {
  /** 列キー（アクセサ） / 列键（访问器） */
  key: string
  /** key のエイリアス（旧 Table.vue 互換） / key 的别名（旧 Table.vue 兼容） */
  dataKey?: string
  /** 列ヘッダータイトル / 列标题 */
  title?: string
  /** title のエイリアス / title 的别名 */
  label?: string
  /** 列幅 (px) / 列宽 (px) */
  width?: number
  /** 最小列幅 (px) / 最小列宽 (px) */
  minWidth?: number
  /** テキスト配置 / 文本对齐 */
  align?: 'left' | 'center' | 'right'
  /** ソート可否 / 是否可排序 */
  sortable?: boolean
  /** 検索可否 / 是否可搜索 */
  searchable?: boolean
  /** 検索タイプ / 搜索类型 */
  searchType?: 'string' | 'number' | 'select' | 'boolean' | 'date' | 'daterange'
  /** 検索オプション（select タイプ用） / 搜索选项（select 类型用） */
  searchOptions?: Array<{ label: string; value: string }>
  /** 表示フラグ（default: true） / 显示标志（default: true） */
  visible?: boolean
  /** 固定列 / 固定列 */
  fixed?: boolean
  /** セルレンダラー（旧 Table.vue 互換） / 单元格渲染器（旧 Table.vue 兼容） */
  cellRenderer?: (ctx: { rowData: any; value: any }) => any
  /** CSS クラス / CSS 类名 */
  className?: string
  /** フィールドタイプ / 字段类型 */
  fieldType?: string
}
