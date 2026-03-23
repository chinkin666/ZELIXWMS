import type { TableColumn } from './table'

export interface SubSku {
  subSku: string        // 子SKUコード (必須、全体で唯一)
  price?: number        // 価格 (オプション、未設定時は親商品の価格を使用)
  description?: string  // 説明 (オプション、例: "Black Friday活動")
  isActive?: boolean    // 有効かどうか (デフォルト: true)
}

export type ProductCategory = '0' | '1' | '2' | '3' | '4'  // 0:商品 1:消耗品 2:作業 3:おまけ 4:部材
export type AllocationRule = 'FIFO' | 'FEFO' | 'LIFO'  // FIFO:先入先出 FEFO:先期限先出 LIFO:後入先出

export interface Product {
  _id: string
  sku: string
  name: string
  nameFull?: string
  barcode?: string[]
  coolType?: '0' | '1' | '2'
  category?: ProductCategory
  // メール便計算設定
  mailCalcEnabled: boolean                 // メール便計算（true: 自動計算する, false: 自動計算しない）
  mailCalcMaxQuantity?: number             // メール便最大数量（mailCalcEnabled が true の時のみ有効・編集可能）
  memo?: string
  price?: number
  handlingTypes?: string[]
  imageUrl?: string
  subSkus?: SubSku[]
  customField1?: string
  customField2?: string
  customField3?: string
  customField4?: string
  width?: number
  depth?: number
  height?: number
  weight?: number
  nameEn?: string
  // 追加ビジネスフィールド / 追加业务字段
  abbreviation?: string
  janCode?: string
  brandName?: string
  shippingSizeCode?: string
  costPrice?: number
  taxRate?: number
  supplierName?: string
  countryOfOrigin?: string
  allocationRule?: AllocationRule
  serialTrackingEnabled: boolean
  inboundExpiryDays?: number
  // 在庫管理設定
  inventoryEnabled: boolean
  lotTrackingEnabled: boolean
  expiryTrackingEnabled: boolean
  alertDaysBeforeExpiry: number
  defaultLocationId?: string
  safetyStock: number
  // 顧客商品コード / 客户商品代码
  customerProductCode?: string
  // FBA設定 / FBA设置
  fbaEnabled?: boolean
  fnsku?: string
  asin?: string
  amazonSku?: string
  // RSL設定 / RSL设置（楽天スーパーロジスティクス / 乐天超级物流）
  rakutenSku?: string
  rslEnabled?: boolean
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  sku?: string
  name?: string
  nameFull?: string
  coolType?: '0' | '1' | '2'
  category?: ProductCategory
  mailCalcEnabled?: boolean
  fbaEnabled?: boolean
  rslEnabled?: boolean
}

export interface UpsertProductDto {
  sku: string
  name: string
  nameFull?: string
  barcode?: string[]
  coolType?: '0' | '1' | '2'
  category?: ProductCategory
  // メール便計算設定
  mailCalcEnabled: boolean
  mailCalcMaxQuantity?: number
  memo?: string
  price?: number
  handlingTypes?: string[]
  imageUrl?: string
  subSkus?: SubSku[]
  customField1?: string
  customField2?: string
  customField3?: string
  customField4?: string
  width?: number
  depth?: number
  height?: number
  weight?: number
  nameEn?: string
  countryOfOrigin?: string
  allocationRule?: AllocationRule
  serialTrackingEnabled?: boolean
  inboundExpiryDays?: number
  inventoryEnabled?: boolean
  lotTrackingEnabled?: boolean
  expiryTrackingEnabled?: boolean
  alertDaysBeforeExpiry?: number
  safetyStock?: number
  // FBA設定 / FBA设置
  fbaEnabled?: boolean
  fnsku?: string
  asin?: string
  amazonSku?: string
  // RSL設定 / RSL设置（楽天スーパーロジスティクス / 乐天超级物流）
  rakutenSku?: string
  rslEnabled?: boolean
}

export function getProductFieldDefinitions(): TableColumn[] {
  const coolTypeOptions = [
    { label: '通常', value: '0' as const },
    { label: 'クール冷凍', value: '1' as const },
    { label: 'クール冷蔵', value: '2' as const },
  ]

  return [
    {
      key: 'sku',
      dataKey: 'sku',
      title: 'SKU管理番号',
      description: '商品を一意に識別するSKUコード',
      width: 160,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      formEditable: true,
    },
    {
      key: 'name',
      dataKey: 'name',
      title: '印刷用商品名',
      description: '商品名（短い表示名）',
      width: 200,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      formEditable: true,
    },
    {
      key: 'nameFull',
      dataKey: 'nameFull',
      title: '商品名',
      description: '商品名のフルテキスト',
      width: 240,
      fieldType: 'string',
      searchType: 'string',
      formEditable: true,
    },
    {
      key: 'barcode',
      dataKey: 'barcode',
      title: '検品コード (バーコード)',
      description: '商品バーコード（複数可）',
      width: 240,
      fieldType: 'string',
      searchType: 'string',
      formEditable: true,
    },
    {
      key: 'coolType',
      dataKey: 'coolType',
      title: 'クール区分',
      description: '0:通常 / 1:冷凍 / 2:冷蔵',
      width: 140,
      // coolType は文字列（'0'|'1'|'2'）なので FieldType は string 扱い
      fieldType: 'string',
      searchType: 'select',
      required: false,
      formEditable: true,
      searchOptions: coolTypeOptions,
    },
    {
      key: 'mailCalcEnabled',
      dataKey: 'mailCalcEnabled',
      title: 'メール便計算',
      description: 'メール便/宅急便を自動計算するかどうか',
      width: 120,
      fieldType: 'boolean',
      required: true,
      searchType: 'boolean',
      formEditable: true,
    },
    {
      key: 'mailCalcMaxQuantity',
      dataKey: 'mailCalcMaxQuantity',
      title: 'メール便最大数量',
      description: 'メール便で配送可能な最大数量（メール便計算が有効の場合のみ）',
      width: 140,
      fieldType: 'number',
      required: false,
      searchType: 'number',
      formEditable: true,
    },
    {
      key: 'price',
      dataKey: 'price',
      title: '商品金額',
      description: '商品の金額',
      width: 120,
      fieldType: 'number',
      formEditable: true,
    },
    {
      key: 'handlingTypes',
      dataKey: 'handlingTypes',
      title: '荷扱い',
      description: '荷扱い指示（複数可）',
      width: 160,
      fieldType: 'array',
      formEditable: true,
    },
    {
      key: 'memo',
      dataKey: 'memo',
      title: 'メモ',
      description: '商品に関するメモ',
      width: 200,
      fieldType: 'string',
      formEditable: true,
    },
    {
      key: 'subSkusCount',
      dataKey: 'subSkus',
      title: '子SKU',
      description: '登録されている子SKUコード',
      width: 200,
      fieldType: 'string',
      formEditable: false,
      searchable: false,
    },
  ]
}

