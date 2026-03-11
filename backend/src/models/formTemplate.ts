import mongoose from 'mongoose';

/**
 * バーコード設定
 */
export interface BarcodeConfig {
  format: 'qrcode' | 'code128' | 'codabar' | 'ean13' | 'ean8' | 'datamatrix' | 'code39';
  width?: number;
  height?: number;
}

/**
 * 列の子項目（multi タイプの場合に使用）
 */
export interface FormTemplateColumnChild {
  /** 子項目ID */
  id: string;
  /** 表示ラベル（省略可能） */
  label?: string;
  /** フィールドキー */
  field: string;
  /** レンダリングタイプ */
  renderType: 'text' | 'qrcode' | 'barcode' | 'date';
  /** バーコード設定 */
  barcodeConfig?: BarcodeConfig;
  /** 日付フォーマット */
  dateFormat?: string;
  /** プレビュー用の一時データ（JSON文字列、省略可能） */
  previewData?: string;
}

/**
 * 帳票テンプレートの列定義（ネスト対応）
 */
export interface FormTemplateColumn {
  /** 列ID */
  id: string;
  /** 列タイプ: single=1内容, multi=複数内容 */
  type: 'single' | 'multi';
  /** 列ヘッダーラベル（改行で複数行可） */
  label: string;
  /** 列幅（pt または 'auto' で自動） */
  width?: number | string;
  /** 表示順序 */
  order: number;

  // === single タイプ用 ===
  /** フィールドキー（single タイプ用） */
  field?: string;
  /** レンダリングタイプ（single タイプ用） */
  renderType?: 'text' | 'qrcode' | 'barcode' | 'date';
  /** バーコード設定（single タイプ用） */
  barcodeConfig?: BarcodeConfig;
  /** 日付フォーマット（single タイプ用） */
  dateFormat?: string;
  /** プレビュー用の一時データ（JSON文字列、省略可能） */
  previewData?: string;

  // === multi タイプ用 ===
  /** 子項目（multi タイプ用） */
  children?: FormTemplateColumnChild[];
}

/**
 * 帳票テンプレートのスタイル設定
 */
export interface FormTemplateStyles {
  /** デフォルトフォントサイズ (pt) */
  fontSize?: number;
  /** ヘッダー背景色 (#RRGGBB) */
  headerBgColor?: string;
  /** ヘッダー文字色 */
  headerTextColor?: string;
  /** 罫線色 */
  borderColor?: string;
  /** セル内余白 */
  cellPadding?: number;
  /** 交互行背景色 */
  alternateRowColor?: string;
  /** 水平方向の配置 */
  horizontalAlign?: 'left' | 'center' | 'right';
}

/**
 * ヘッダー・フッター項目のカラム設定
 */
export interface HeaderFooterItemColumn {
  text: string;
  width?: number | 'auto' | '*';
  alignment?: 'left' | 'center' | 'right';
}

/**
 * ヘッダー・フッター項目のスタイル設定
 */
export interface HeaderFooterItemStyle {
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  alignment?: 'left' | 'center' | 'right';
  color?: string;
  margin?: [number, number, number, number];
}

/**
 * ヘッダー・フッター項目のテーブルスタイル設定
 */
export interface HeaderFooterTableStyle {
  headerBgColor?: string;
  headerTextColor?: string;
  borderColor?: string;
  cellPadding?: number;
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  headerRows?: number;
}

/**
 * ヘッダー・フッター項目
 */
export interface HeaderFooterItem {
  id: string;
  position: 'header' | 'footer' | 'title';
  showOn: 'all' | 'first' | 'last';
  type: 'text' | 'columns' | 'table';
  style: HeaderFooterItemStyle;
  text?: string;
  columns?: HeaderFooterItemColumn[];
  table?: {
    widths?: (number | 'auto' | '*')[];
    body: string[][];
    tableStyle?: HeaderFooterTableStyle;
  };
}

/**
 * 帳票テンプレートドキュメント
 */
export interface FormTemplateDocument {
  _id: string;
  tenantId: string;
  /** テンプレート名 */
  name: string;
  /** 対象ページタイプ（例: shipment-list-picking, shipment-detail-list） */
  targetType: string;

  /** 列設定 */
  columns: FormTemplateColumn[];
  /** スタイル設定 */
  styles: FormTemplateStyles;

  /** 用紙サイズ */
  pageSize: 'A4' | 'A3' | 'B4' | 'LETTER';
  /** 印刷向き */
  pageOrientation: 'portrait' | 'landscape';
  /** 余白 [left, top, right, bottom] */
  pageMargins: [number, number, number, number];

  /** ヘッダー・フッター項目 */
  headerFooterItems: HeaderFooterItem[];

  /** デフォルトかどうか */
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormTemplateDto {
  name: string;
  targetType: string;
  columns: FormTemplateColumn[];
  styles?: FormTemplateStyles;
  pageSize?: 'A4' | 'A3' | 'B4' | 'LETTER';
  pageOrientation?: 'portrait' | 'landscape';
  pageMargins?: [number, number, number, number];
  headerFooterItems?: HeaderFooterItem[];
  isDefault?: boolean;
}

export type UpdateFormTemplateDto = Partial<CreateFormTemplateDto>;

export interface IFormTemplate {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  name: string;
  targetType: string;
  columns: FormTemplateColumn[];
  styles: FormTemplateStyles;
  pageSize: string;
  pageOrientation: string;
  pageMargins: number[];
  headerFooterItems: HeaderFooterItem[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// バーコード設定スキーマ
const barcodeConfigSchema = new mongoose.Schema<BarcodeConfig>(
  {
    format: { type: String, enum: ['qrcode', 'code128', 'codabar', 'ean13', 'ean8', 'datamatrix', 'code39'] },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false },
);

// 子項目スキーマ
const columnChildSchema = new mongoose.Schema<FormTemplateColumnChild>(
  {
    id: { type: String, required: true },
    label: { type: String },
    field: { type: String, required: true },
    renderType: { type: String, enum: ['text', 'qrcode', 'barcode', 'date'], default: 'text' },
    barcodeConfig: { type: barcodeConfigSchema },
    dateFormat: { type: String },
  },
  { _id: false },
);

// 列スキーマ
const columnSchema = new mongoose.Schema<FormTemplateColumn>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['single', 'multi'], required: true },
    label: { type: String, required: true },
    width: { type: mongoose.Schema.Types.Mixed },
    order: { type: Number, default: 0 },
    // single タイプ用
    field: { type: String },
    renderType: { type: String, enum: ['text', 'qrcode', 'barcode', 'date'] },
    barcodeConfig: { type: barcodeConfigSchema },
    dateFormat: { type: String },
    previewData: { type: String },
    // multi タイプ用
    children: { type: [columnChildSchema] },
  },
  { _id: false },
);

const stylesSchema = new mongoose.Schema<FormTemplateStyles>(
  {
    fontSize: { type: Number, default: 9 },
    headerBgColor: { type: String, default: '#2a3474' },
    headerTextColor: { type: String, default: '#ffffff' },
    borderColor: { type: String, default: '#cccccc' },
    cellPadding: { type: Number, default: 4 },
    alternateRowColor: { type: String },
    horizontalAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  },
  { _id: false },
);

// ヘッダー・フッター項目のカラムスキーマ
const headerFooterColumnSchema = new mongoose.Schema<HeaderFooterItemColumn>(
  {
    text: { type: String, required: true },
    width: { type: mongoose.Schema.Types.Mixed },
    alignment: { type: String, enum: ['left', 'center', 'right'] },
  },
  { _id: false },
);

// ヘッダー・フッター項目のスタイルスキーマ
const headerFooterStyleSchema = new mongoose.Schema<HeaderFooterItemStyle>(
  {
    fontSize: { type: Number },
    bold: { type: Boolean },
    italic: { type: Boolean },
    alignment: { type: String, enum: ['left', 'center', 'right'] },
    color: { type: String },
    margin: { type: [Number] },
  },
  { _id: false },
);

// ヘッダー・フッター項目のテーブルスタイルスキーマ
const headerFooterTableStyleSchema = new mongoose.Schema<HeaderFooterTableStyle>(
  {
    headerBgColor: { type: String },
    headerTextColor: { type: String },
    borderColor: { type: String },
    cellPadding: { type: Number },
    horizontalAlign: { type: String, enum: ['left', 'center', 'right'] },
    verticalAlign: { type: String, enum: ['top', 'middle', 'bottom'] },
    headerRows: { type: Number },
  },
  { _id: false },
);

// ヘッダー・フッター項目スキーマ
const headerFooterItemSchema = new mongoose.Schema<HeaderFooterItem>(
  {
    id: { type: String, required: true },
    position: { type: String, enum: ['header', 'footer', 'title'], required: true },
    showOn: { type: String, enum: ['all', 'first', 'last'], default: 'all' },
    type: { type: String, enum: ['text', 'columns', 'table'], required: true },
    style: { type: headerFooterStyleSchema, default: () => ({}) },
    text: { type: String },
    columns: { type: [headerFooterColumnSchema] },
    table: {
      widths: { type: [mongoose.Schema.Types.Mixed] },
      body: { type: [[String]] },
      tableStyle: { type: headerFooterTableStyleSchema },
    },
  },
  { _id: false },
);

const formTemplateSchema = new mongoose.Schema<IFormTemplate>(
  {
    tenantId: { type: String, required: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true, index: true },
    columns: { type: [columnSchema], required: true, default: [] },
    styles: { type: stylesSchema, default: () => ({}) },
    pageSize: { type: String, enum: ['A4', 'A3', 'B4', 'LETTER'], default: 'A4' },
    pageOrientation: { type: String, enum: ['portrait', 'landscape'], default: 'landscape' },
    pageMargins: { type: [Number], default: [40, 40, 40, 40] },
    headerFooterItems: { type: [headerFooterItemSchema], default: [] },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, collection: 'form_templates' },
);

formTemplateSchema.index({ tenantId: 1, targetType: 1 });

export const FormTemplate = mongoose.model<IFormTemplate>('FormTemplate', formTemplateSchema);
