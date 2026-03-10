import type { TableColumn } from './table'

export interface SubSku {
  subSku: string        // 子SKUコード (必須、全体で唯一)
  price?: number        // 価格 (オプション、未設定時は親商品の価格を使用)
  description?: string  // 説明 (オプション、例: "Black Friday活動")
  isActive?: boolean    // 有効かどうか (デフォルト: true)
}

export interface Product {
  _id: string
  sku: string
  name: string
  nameFull?: string
  barcode?: string[]
  coolType?: '0' | '1' | '2'
  // メール便計算設定
  mailCalcEnabled: boolean                 // メール便計算（true: 自動計算する, false: 自動計算しない）
  mailCalcMaxQuantity?: number             // メール便最大数量（mailCalcEnabled が true の時のみ有効・編集可能）
  memo?: string
  price?: number
  handlingTypes?: string[]
  imageUrl?: string
  subSkus?: SubSku[]
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  sku?: string
  name?: string
  nameFull?: string
  coolType?: '0' | '1' | '2'
  mailCalcEnabled?: boolean
}

export interface UpsertProductDto {
  sku: string
  name: string
  nameFull?: string
  barcode?: string[]
  coolType?: '0' | '1' | '2'
  // メール便計算設定
  mailCalcEnabled: boolean
  mailCalcMaxQuantity?: number
  memo?: string
  price?: number
  handlingTypes?: string[]
  imageUrl?: string
  subSkus?: SubSku[]
}

export function getProductFieldDefinitions(): TableColumn[] {
  const coolTypeOptions = [
    { label: '常温', value: '0' as const },
    { label: 'クール冷蔵', value: '1' as const },
    { label: 'クール冷凍', value: '2' as const },
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
      description: '0:常温 / 1:冷蔵 / 2:冷凍',
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

