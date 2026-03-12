/**
 * バーコード設定
 */
export interface BarcodeConfig {
  format: 'qrcode' | 'code128' | 'codabar' | 'ean13' | 'ean8' | 'datamatrix' | 'code39'
  width?: number
  height?: number
}

/**
 * 列の子項目（multi タイプの場合に使用）
 */
export interface FormTemplateColumnChild {
  /** 子項目ID */
  id: string
  /** 表示ラベル（省略可能） */
  label?: string
  /** フィールドキー */
  field: string
  /** レンダリングタイプ */
  renderType: 'text' | 'qrcode' | 'barcode' | 'date'
  /** バーコード設定 */
  barcodeConfig?: BarcodeConfig
  /** 日付フォーマット */
  dateFormat?: string
  /** プレビュー用の一時データ（JSON文字列、省略可能） */
  previewData?: string
}

/**
 * 帳票テンプレートの列定義（ネスト対応）
 * 
 * 例: 
 * - single タイプ: 1列1内容
 *   { type: 'single', label: '商品名', field: 'productName', renderType: 'text' }
 * 
 * - multi タイプ: 1列複数内容（縦に並ぶ）
 *   { 
 *     type: 'multi', 
 *     label: '倉庫CODE\n倉庫名称',
 *     children: [
 *       { label: '', field: 'warehouseCode', renderType: 'text' },
 *       { label: '', field: 'warehouseName', renderType: 'text' }
 *     ]
 *   }
 */
export interface FormTemplateColumn {
  /** 列ID */
  id: string
  /** 列タイプ: single=1内容, multi=複数内容 */
  type: 'single' | 'multi'
  /** 列ヘッダーラベル（改行で複数行可） */
  label: string
  /** 列幅（pt または 'auto' で自動） */
  width?: number | 'auto'
  /** 表示順序 */
  order: number

  // === single タイプ用 ===
  /** フィールドキー（single タイプ用） */
  field?: string
  /** レンダリングタイプ（single タイプ用） */
  renderType?: 'text' | 'qrcode' | 'barcode' | 'date'
  /** バーコード設定（single タイプ用） */
  barcodeConfig?: BarcodeConfig
  /** 日付フォーマット（single タイプ用） */
  dateFormat?: string
  /** プレビュー用の一時データ（JSON文字列、省略可能） */
  previewData?: string

  // === multi タイプ用 ===
  /** 子項目（multi タイプ用） */
  children?: FormTemplateColumnChild[]
}

/**
 * 帳票テンプレートのスタイル設定
 */
export interface FormTemplateStyles {
  /** デフォルトフォントサイズ (pt) */
  fontSize: number
  /** ヘッダー背景色 (#RRGGBB) */
  headerBgColor: string
  /** ヘッダー文字色 */
  headerTextColor: string
  /** 罫線色 */
  borderColor: string
  /** セル内余白 */
  cellPadding: number
  /** 交互行背景色 */
  alternateRowColor?: string
  /** 水平方向の配置 */
  horizontalAlign: string
}

/**
 * ヘッダー・フッター項目のカラム設定
 */
export interface HeaderFooterItemColumn {
  /** カラムテキスト（変数使用可能） */
  text: string
  /** カラム幅 */
  width?: number | 'auto' | '*'
  /** 配置 */
  alignment?: 'left' | 'center' | 'right'
}

/**
 * ヘッダー・フッター項目のスタイル設定
 */
export interface HeaderFooterItemStyle {
  /** フォントサイズ */
  fontSize?: number
  /** 太字 */
  bold?: boolean
  /** 斜体 */
  italic?: boolean
  /** 配置 */
  alignment?: 'left' | 'center' | 'right'
  /** 文字色 */
  color?: string
  /** 余白 [left, top, right, bottom] */
  margin?: [number, number, number, number]
}

/**
 * ヘッダー・フッター項目のテーブルスタイル設定
 */
export interface HeaderFooterTableStyle {
  /** ヘッダー背景色 */
  headerBgColor?: string
  /** ヘッダー文字色 */
  headerTextColor?: string
  /** 罫線色 */
  borderColor?: string
  /** セル内余白 */
  cellPadding?: number
  /** 水平方向の配置 */
  horizontalAlign?: 'left' | 'center' | 'right'
  /** 垂直方向の配置 */
  verticalAlign?: 'top' | 'middle' | 'bottom'
  /** ヘッダー行数（0の場合はヘッダーなし） */
  headerRows?: number
}

/**
 * ヘッダー・フッター項目
 * 変数: {{date}}, {{time}}, {{datetime}}, {{page}}, {{pages}}
 */
export interface HeaderFooterItem {
  /** 項目ID */
  id: string
  /** 位置: header=ページヘッダー, footer=ページフッター, title=ドキュメントタイトル（内容の先頭） */
  position: 'header' | 'footer' | 'title'
  /** 表示ページ: all=全ページ, first=最初のページのみ, last=最後のページのみ */
  showOn: 'all' | 'first' | 'last'
  /** 内容タイプ */
  type: 'text' | 'columns' | 'table'
  /** スタイル設定 */
  style: HeaderFooterItemStyle
  /** テキスト内容（text タイプ用） */
  text?: string
  /** カラム内容（columns タイプ用） */
  columns?: HeaderFooterItemColumn[]
  /** テーブル内容（table タイプ用） */
  table?: {
    widths?: (number | 'auto' | '*')[]
    body: string[][]
    /** テーブルスタイル */
    tableStyle?: HeaderFooterTableStyle
  }
}

/**
 * 帳票テンプレートドキュメント
 */
export interface FormTemplate {
  _id: string
  tenantId: string
  /** テンプレート名 */
  name: string
  /** 対象ページタイプ（例: shipment-list-picking, shipment-detail-list） */
  targetType: string

  /** 列設定 */
  columns: FormTemplateColumn[]
  /** スタイル設定 */
  styles: FormTemplateStyles

  /** 用紙サイズ */
  pageSize: 'A4' | 'A3' | 'B4' | 'LETTER'
  /** 印刷向き */
  pageOrientation: 'portrait' | 'landscape'
  /** 余白 [left, top, right, bottom] */
  pageMargins: [number, number, number, number]

  /** ヘッダー・フッター項目 */
  headerFooterItems: HeaderFooterItem[]

  /** デフォルトかどうか */
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateFormTemplateDto {
  name: string
  targetType: string
  columns: FormTemplateColumn[]
  styles?: FormTemplateStyles
  pageSize?: 'A4' | 'A3' | 'B4' | 'LETTER'
  pageOrientation?: 'portrait' | 'landscape'
  pageMargins?: [number, number, number, number]
  headerFooterItems?: HeaderFooterItem[]
  isDefault?: boolean
}

export type UpdateFormTemplateDto = Partial<CreateFormTemplateDto>

/**
 * フォームフィールド定義（フィールド登録表用）
 */
export interface FormFieldDefinition {
  /** フィールドキー */
  key: string
  /** 表示ラベル */
  label: string
  /** 説明 */
  description?: string
  /** フィールドタイプ */
  fieldType: 'string' | 'number' | 'date' | 'array'
  /** デフォルトで有効か */
  defaultEnabled: boolean
  /** バーコード対応 */
  supportBarcode: boolean
}

/**
 * フォームタイプ定義
 */
export interface FormTypeDefinition {
  /** タイプID */
  type: string
  /** 表示名 */
  label: string
  /** 説明 */
  description: string
  /** 利用可能なフィールド */
  fields: FormFieldDefinition[]
}
