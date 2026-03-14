import type { TableColumn } from './table'
import { formatOrderProductsText } from '@/utils/formatOrderProductsText'
import { naturalSort } from '@/utils/naturalSort'

function formatPostalCode(val?: string): string {
  if (!val) return '-'
  const digits = val.replace(/[^0-9]/g, '')
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return val
}

export type CoolType = '0' | '1' | '2'
export type InvoiceType = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'A'

/**
 * 子SKU匹配情報（inputSkuが子SKUの場合に設定）
 */
export interface MatchedSubSku {
  code: string            // 子SKUコード
  price?: number          // 子SKU価格（親商品の価格を上書き）
  description?: string    // 子SKU備考
}

/**
 * 注文商品項目インターフェース（新スキーマ）
 *
 * 設計方針:
 * - inputSku: ユーザーが入力した原始値（主SKUまたは子SKU）
 * - auto-fill時に親商品情報を解析して各フィールドを設定
 * - matchedSubSku: 入力が子SKUの場合、価格/備考情報を保持
 * - データ自包含: 表示に必要な情報をすべて含み、実行時のproductMap参照を不要にする
 */
export interface OrderProduct {
  // === ユーザー入力 ===
  inputSku: string           // ユーザー入力の原始値（主SKUまたは子SKU）
  quantity: number           // 数量

  // === auto-fill時に解析して設定 ===
  productId?: string         // 親商品の_id（関連付け用）
  productSku?: string        // 親商品の主SKU
  productName?: string       // 商品名（親商品から取得）

  // === 子SKU情報（inputSkuが子SKUの場合） ===
  matchedSubSku?: MatchedSubSku

  // === 親商品からスナップショットした表示情報（auto-fill時に設定） ===
  imageUrl?: string                  // 商品画像URL
  barcode?: string[]                 // 検品コード
  coolType?: CoolType                // クール区分
  // メール便計算設定
  mailCalcEnabled?: boolean          // メール便計算（true: 自動計算する, false: 自動計算しない）
  mailCalcMaxQuantity?: number       // メール便最大数量（mailCalcEnabled が true の時のみ有効）

  // === 価格情報 ===
  unitPrice?: number                 // 単価（子SKU価格 > 親商品価格の優先順位）
  subtotal?: number                  // 小計（unitPrice × quantity）
}

/**
 * ヤマト配送固有データ
 */
export interface YamatoCarrierData {
  sortingCode?: string      // 6位仕分けコード
  hatsuBaseNo1?: string     // 3位発店コード1
  hatsuBaseNo2?: string     // 3位発店コード2
}

/**
 * 配送業者固有データ
 */
export interface CarrierData {
  yamato?: YamatoCarrierData
  // 将来の拡張: / 未来扩展:
  // sagawa?: SagawaCarrierData
  // yupack?: YupackCarrierData
}

/**
 * 住所インターフェース
 */
export interface Address {
  postalCode: string
  prefecture: string  // 都道府県
  city: string        // 市区郡町村
  street: string      // 町・番地
  building?: string   // アパートマンション名
  name: string
  phone: string
}

export interface OrderDocument {
  _id?: string
  tenantId?: string
  status?: {
    /** 配送業者へデータ送信し、回执（受付/レスポンス）を取得済みかどうか */
    carrierReceipt?: { isReceived: boolean; receivedAt?: string }
    /** 印刷準備が完了し、確認済みかどうか */
    confirm?: { isConfirmed: boolean; confirmedAt?: string }
    printed?: { isPrinted: boolean; printedAt?: string }
    /** 検品が完了したかどうか */
    inspected?: { isInspected: boolean; inspectedAt?: string }
    /** 出荷作業が完了したかどうか */
    shipped?: { isShipped: boolean; shippedAt?: string }
    /** EC連携済みかどうか */
    ecExported?: { isExported: boolean; exportedAt?: string }
    /** 保留中かどうか */
    held?: { isHeld: boolean; heldAt?: string }
  }
  orderNumber: string // システム自動生成
  sourceOrderAt?: string
  /** 配送業者（単一選択・必須） */
  carrierId: string
  customerManagementNumber: string // お客様管理番号（必須・ユーザー入力）
  /** 配送業者から取得した伝票番号（trackingId） */
  trackingId?: string
  // 注文者（全フィールド optional）
  orderer?: Partial<Address>
  // お届け先
  recipient: Address
  honorific?: string // 敬称（デフォルト: "様"）
  products: OrderProduct[]
  /**
   * 商品集約フィールド（検索・フィルタリング・インデックス最適化用） / 商品聚合字段（用于搜索、过滤、索引优化）
   * - バックエンドで自動計算、フロントエンドでは主に統計と高速フィルタリングに使用 / 后端自动计算，前端主要用于统计和快速过滤
   * - UIには表示しないが、検索やソートに利用可能 / 不显示在UI中，但可用于搜索和排序
   */
  _productsMeta?: {
    skus: string[] // 全SKUの配列（重複排除） / 所有SKU的数组（去重）
    names: string[] // 全商品名の配列（重複排除、空値除外） / 所有商品名的数组（去重，过滤空值）
    barcodes: string[] // 全バーコードの配列（重複排除、空値除外） / 所有バーコードの配列（去重、过滤空值）
    skuCount: number // SKU種類数 / SKU种类数量
    totalQuantity: number // 商品総数量（全quantityの合計） / 商品总数量（所有quantity之和）
    totalPrice: number // 合計金額（全subtotalの合計） / 合計金額（所有subtotalの合計）
  }
  shipPlanDate: string
  invoiceType: InvoiceType // 0:発払い, 1:EAZY, 2:コレクト, 3:クロネコゆうメール, 4:タイム, 5:着払い, 6:発払い複数口, 7:クロネコゆうパケット, 8:宅急便コンパクト, 9:コンパクトコレクト, A:ネコポス
  coolType?: CoolType // 0:通常, 1:クール冷凍, 2:クール冷蔵
  /**
   * お届け時間帯（時間帯レンジ）
   * - 4桁数字文字列: "開始HH + 終了HH"
   * - 例: "1012" => 10時〜12時
   */
  deliveryTimeSlot?: string
  deliveryDatePreference?: string
  /**
   * 依頼主ID（OrderSourceCompany._id）
   * - ユーザーがCSVでアップロードする必要はない
   * - UIのテーブル/フォームでは表示しない（内部用）
   * - /shipment-orders/create で依頼主選択時に自動設定してバックエンドへ送る
   */
  orderSourceCompanyId?: string
  /**
   * 配送業者固有データ（キャリアごとにネストされた構造）
   */
  carrierData?: CarrierData
  // 依頼主住所
  sender: Address
  handlingTags: string[] // 任意の文字列配列
  /**
   * 追跡用：CSV/Excel 取り込み時の「元の1行」をそのまま保持（ヘッダー -> 値）。
   * - 取込時は length=1
   * - 同梱（合并）時は配列を結合して追跡可能にする
   * - UI では表示しない
   */
  sourceRawRows?: Array<Record<string, any>>
  /** 配送業者側ファイル（回执/実績）から取り込んだ元行データ（ヘッダー -> 値） */
  carrierRawRow?: Record<string, any>
  /**
   * 内部データ：操作記録（確認取消等のイベントログ）
   */
  internalRecord?: Array<{
    user: string      // 発起者
    timestamp: string // 発生日時（ISO 8601）
    content: string   // 内容（純文本）
  }>
  /**
   * 検品グループID（OrderGroup.orderGroupId を参照）
   */
  orderGroupId?: string
  createdAt?: string
  updatedAt?: string
}

type SelectOption = { label: string; value: any }

const PREFECTURE_OPTIONS: SelectOption[] = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
].map(p => ({ label: p, value: p }))

export function getOrderFieldDefinitions(opts?: {
  carrierOptions?: SelectOption[]
  /**
   * Mapping Wizard (Step2) 向けの「例」フィールドを追加する。
   * - 通常の一覧/フォームには出さない想定のため、必要な画面側だけ true で呼ぶ。
   */
  includeMappingExamples?: boolean
}): TableColumn[] {
  const coolTypeOptions = [
    { label: '通常', value: '0' as CoolType },
    { label: 'クール冷凍', value: '1' as CoolType },
    { label: 'クール冷蔵', value: '2' as CoolType },
  ]

  // 送り状種類（全配送業者共通コード）/ 送り状種類
  // ヤマト: 0-9,A / 佐川: 0=元払い,1=着払い,2=e-コレクト
  // 同じコード値でも配送業者によって名称が異なる（carrierId で区別）
  const invoiceTypeOptions = [
    { label: '発払い', value: '0' },
    { label: 'EAZY', value: '1' },
    { label: 'コレクト', value: '2' },
    { label: 'クロネコゆうメール（DM便）', value: '3' },
    { label: 'タイム', value: '4' },
    { label: '着払い', value: '5' },
    { label: '発払い複数口', value: '6' },
    { label: 'クロネコゆうパケット', value: '7' },
    { label: '宅急便コンパクト', value: '8' },
    { label: 'コンパクトコレクト', value: '9' },
    { label: 'ネコポス', value: 'A' },
  ]

  // 佐川急便用の送り状種類ラベル（コード → 表示名）
  // 佐川急便用送り状種類标签
  const sagawaInvoiceLabels: Record<string, string> = {
    '0': '元払い',
    '1': '着払い',
    '2': 'e-コレクト（代引き）',
  }

  const carrierOptions: SelectOption[] = Array.isArray(opts?.carrierOptions) ? opts!.carrierOptions! : []
  const carrierLabelMap = new Map<string, string>(
    carrierOptions
      .filter((o) => o && typeof o.value === 'string')
      .map((o) => [String(o.value), String(o.label)]),
  )

  // (出荷情報) 出荷管理No, お客様管理番号, 配送業者, 送り状種類, クール区分, 出荷予定日, お届け日指定, お届け時間帯, 商品, 荷扱い
  // (お届け先情報) お届け先郵便番号, お届け先住所, お届け先名, お届け先電話番号, 敬称
  // (ご依頼主情報) 依頼主郵便番号, 依頼主住所, 依頼主名, 依頼主電話番号, 仕分けコード
  // (注文者情報) 注文者郵便番号, 注文者住所, 注文者名, 注文者電話番号
  // (その他) 作成日時, 更新日時, 印刷日時, 取り込み日時
  const base: TableColumn[] = [
    // (出荷情報)
    {
      key: 'orderNumber',
      dataKey: 'orderNumber',
      title: '出荷管理No',
      description: 'この注文を一意に識別するシステムが自動生成するID。データベース内での管理用識別子です。',
      width: 160,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      formEditable: false, // システム自動生成のため編集不可
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.orderNumber,
      sortMethod: naturalSort, // "-"を含む番号を自然順ソートで処理 / 使用自然排序处理包含"-"的编号
    },
    {
      key: 'customerManagementNumber',
      dataKey: 'customerManagementNumber',
      title: 'お客様管理番号',
      description: '半角英数字50文字以内（ハイフン・アンダースコア可）',
      width: 215,
      fieldType: 'string',
      required: true,
      maxLength: 50,
      pattern: '^[a-zA-Z0-9\\-_]*$',
      searchType: 'string',
      formEditable: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.customerManagementNumber || '-',
    },
    {
      key: 'carrierId',
      dataKey: 'carrierId',
      title: '配送業者',
      description: '出荷に利用する配送業者（単一選択）。必須項目です。',
      width: 220,
      fieldType: 'string',
      required: true,
      searchType: 'select',
      searchOptions: carrierOptions,
      formEditable: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const id = (rowData as any).carrierId
        if (!id) return '-'
        return carrierLabelMap.get(String(id)) || String(id)
      },
    },
    {
      key: 'invoiceType',
      dataKey: 'invoiceType',
      title: '送り状種類',
      description: 'ヤマト: 0:発払い〜A:ネコポス / 佐川: 0:元払い, 1:着払い, 2:e-コレクト。配送業者により表示が変わります。',
      width: 170,
      fieldType: 'string',
      required: true,
      searchType: 'select',
      searchOptions: invoiceTypeOptions,
      formEditable: true,
      // carrierId に依存して選択肢をフィルタリング / carrierId に基づいて選択肢をフィルタリング
      dependsOn: 'carrierId',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const val = rowData.invoiceType
        if (!val && val !== '0') return '-'
        // 佐川の場合は佐川用ラベルを表示 / 佐川の場合は佐川用ラベル
        const cid = (rowData as any).carrierId || ''
        if (cid === '__builtin_sagawa__' || String(cid).includes('sagawa')) {
          return sagawaInvoiceLabels[val] || val
        }
        const hit = invoiceTypeOptions.find((opt) => opt.value === val)
        return hit ? hit.label : val
      },
    },
    {
      key: 'coolType',
      dataKey: 'coolType',
      title: 'クール区分',
      description: '0:通常 / 1:クール冷凍 / 2:クール冷蔵。クール便（冷凍・冷蔵）は送り状種類が発払い(0)、コレクト(2)、着払い(5)の場合のみ選択可能です。',
      width: 150,
      fieldType: 'string',
      formEditable: true,
      searchType: 'select',
      searchOptions: coolTypeOptions,
      // クール便は invoiceType が 0, 2, 5 の場合のみ対応
      dependsOn: 'invoiceType',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const hit = coolTypeOptions.find((opt) => opt.value === rowData.coolType)
        return hit ? hit.label : rowData.coolType || '-'
      },
    },
    {
      key: 'shipPlanDate',
      dataKey: 'shipPlanDate',
      title: '出荷予定日',
      description: '倉庫から出荷する予定日。顧客指示や配送計画に基づき必ず入力してください。',
      width: 150,
      fieldType: 'dateOnly',
      required: true,
      searchType: 'date',
      dateFormat: 'YYYY/MM/DD',
    },
    {
      key: 'deliveryDatePreference',
      dataKey: 'deliveryDatePreference',
      title: 'お届け日指定',
      description: '荷物のお届け希望日（指定がある場合）を保持します。',
      width: 150,
      fieldType: 'dateOnly',
      searchType: 'date',
      dateFormat: 'YYYY/MM/DD',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const value = rowData.deliveryDatePreference
        if (!value) return '-'
        // 日付を正規化し、日付部分のみ保持（YYYY/MM/DD） / 规范化日期，只保留日期部分（YYYY/MM/DD）
        if (typeof value === 'string') {
          // 既にYYYY/MM/DD形式ならそのまま返す / 如果已经是 YYYY/MM/DD 格式，直接返回
          if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return value
          // YYYY-MM-DD形式ならYYYY/MM/DDに変換 / 如果是 YYYY-MM-DD 格式，转换为 YYYY/MM/DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replace(/-/g, '/')
          // 時分秒を含む場合、日付部分のみ抽出 / 如果包含时分秒，只提取日期部分
          const dateMatch = value.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})/)
          if (dateMatch) {
            const [, year, month, day] = dateMatch
            return `${year}/${month}/${day}`
          }
        }
        return value || '-'
      },
    },
    {
      key: 'deliveryTimeSlot',
      dataKey: 'deliveryTimeSlot',
      title: 'お届け時間帯',
      description: 'お届け時間帯（時間帯レンジ）を4桁数字で保持します（例: 0812 = 午前中）。',
      width: 150,
      fieldType: 'string',
      searchType: 'select',
      searchOptions: [
        { label: '指定なし', value: '' },
        { label: '午前中（8-12時）', value: '0812' },
        { label: '14時〜16時', value: '1416' },
        { label: '16時〜18時', value: '1618' },
        { label: '18時〜20時', value: '1820' },
        { label: '19時〜21時', value: '1921' },
      ],
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const map: Record<string, string> = {
          '0812': '午前中（8-12時）',
          '1416': '14時〜16時',
          '1618': '16時〜18時',
          '1820': '18時〜20時',
          '1921': '19時〜21時',
        }
        return map[rowData.deliveryTimeSlot || ''] || rowData.deliveryTimeSlot || '-'
      },
    },
    {
      key: 'handlingTags',
      dataKey: 'handlingTags',
      title: '荷扱い',
      description: '配送時の荷扱い指示を表すタグの配列です。任意の文字列を複数指定できます。',
      width: 220,
      fieldType: 'array',
      searchType: 'string',
      formEditable: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        Array.isArray(rowData.handlingTags) && rowData.handlingTags.length > 0
          ? rowData.handlingTags.join(', ')
          : '-',
    },
    {
      key: 'trackingId',
      dataKey: 'trackingId',
      title: '伝票番号',
      description: '配送業者から取得した伝票番号（取り込み後に自動設定）。',
      width: 180,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      formEditable: false, // システム自動設定
      tableVisible: false, // 特定の出荷オペレーション画面のみ表示
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const v = rowData.trackingId
        // 値がある場合のみ表示、値がなければ'-'を返して列の整列を維持 / 只在获取到的情况下显示，没有值返回 '-' 以保持列对齐
        return v ? String(v) : '-'
      },
    },
    {
      key: 'products',
      dataKey: 'products',
      title: '商品明細',
      description: 'この注文に含まれる商品明細の配列です。各要素にSKU（必須）、数量（必須）、商品名（任意）が含まれます。',
      width: 300,
      fieldType: 'array',
      required: true,
      searchType: undefined, // productsを直接検索せず、以下の詳細フィールドを使用 / 不再直接搜索products，使用下面的细分字段
      formEditable: true,
      tableVisible: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const text = formatOrderProductsText(rowData.products, { itemSeparator: ' / ', quantitySeparator: ' x ' })
        return text || '-'
      },
    },
    {
      key: '_productsMeta.totalQuantity',
      dataKey: '_productsMeta.totalQuantity',
      title: '商品总数',
      description: 'この注文に含まれる商品の総数量（すべてのquantityの合計）。',
      width: 120,
      fieldType: 'number',
      required: false,
      searchType: 'number',
      formEditable: false,
      tableVisible: false, // テーブルに非表示、検索のみに使用 / 不在表格中显示，仅用于搜索
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        return rowData._productsMeta?.totalQuantity ?? 0
      },
    },
    {
      key: '_productsMeta.skuCount',
      dataKey: '_productsMeta.skuCount',
      title: 'SKU種類数',
      description: 'この注文に含まれる異なるSKUの種類数。',
      width: 120,
      fieldType: 'number',
      required: false,
      searchType: 'number',
      formEditable: false,
      tableVisible: false, // テーブルに非表示、検索のみに使用 / 不在表格中显示，仅用于搜索
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        return rowData._productsMeta?.skuCount ?? 0
      },
    },
    {
      key: '_productsMeta.names',
      dataKey: '_productsMeta.names',
      title: '商品名',
      description: 'この注文に含まれる商品名で検索します。指定した商品名を含むすべての注文を検索できます。',
      width: 200,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      formEditable: false,
      tableVisible: false, // テーブルに非表示、検索のみに使用 / 不在表格中显示，仅用于搜索
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const names = rowData._productsMeta?.names ?? []
        return names.length > 0 ? names.join(', ') : '-'
      },
    },
    {
      key: '_productsMeta.skus',
      dataKey: '_productsMeta.skus',
      title: '商品SKU管理番号',
      description: 'この注文に含まれる商品SKU管理番号で検索します。指定したSKUを含むすべての注文を検索できます。',
      width: 200,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      formEditable: false,
      tableVisible: false, // テーブルに非表示、検索のみに使用 / 不在表格中显示，仅用于搜索
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const skus = rowData._productsMeta?.skus ?? []
        return skus.length > 0 ? skus.join(', ') : '-'
      },
    },
    {
      key: '_productsMeta.barcodes',
      dataKey: '_productsMeta.barcodes',
      title: '商品バーコード',
      description: 'この注文に含まれる商品バーコードで検索します。指定したバーコードを含むすべての注文を検索できます。',
      width: 200,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      formEditable: false,
      tableVisible: false, // テーブルに非表示、検索のみに使用 / 不在表格中显示，仅用于搜索
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const barcodes = rowData._productsMeta?.barcodes ?? []
        return barcodes.length > 0 ? barcodes.join(', ') : '-'
      },
    },
    // (お届け先情報)
    {
      key: 'recipient.postalCode',
      dataKey: 'recipient.postalCode',
      title: '郵便番号',
      description: '荷物のお届け先となる住所の郵便番号（数字のみ、ハイフン不可）を保持します。',
      width: 150,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => formatPostalCode(rowData.recipient?.postalCode),
    },
    {
      key: 'recipient.prefecture',
      dataKey: 'recipient.prefecture',
      title: '都道府県',
      description: 'お届け先の都道府県を保持します。',
      width: 140,
      fieldType: 'string',
      required: true,
      searchType: 'select',
      searchOptions: PREFECTURE_OPTIONS,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.recipient?.prefecture || '-',
    },
    {
      key: 'recipient.city',
      dataKey: 'recipient.city',
      title: '市区郡町村',
      description: 'お届け先の市区郡町村を保持します。',
      width: 180,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.recipient?.city || '-',
    },
    {
      key: 'recipient.street',
      dataKey: 'recipient.street',
      title: '町・番地',
      description: 'お届け先の町・番地を保持します。',
      width: 200,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.recipient?.street || '-',
    },
    {
      key: 'recipient.building',
      dataKey: 'recipient.building',
      title: 'アパートマンション名',
      description: 'お届け先のアパート・マンション名・部屋番号等を保持します。',
      width: 200,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => (rowData.recipient as any)?.building || '-',
    },
    {
      key: 'recipientAddress',
      dataKey: 'recipientAddress',
      title: '住所（全体）',
      description: 'お届け先の住所全体（都道府県＋市区郡町村＋町・番地＋アパートマンション名）を組み合わせて表示します。',
      width: 300,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      tableVisible: false,
      formEditable: false,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const parts = [
          rowData.recipient?.prefecture,
          rowData.recipient?.city,
          rowData.recipient?.street,
          (rowData.recipient as any)?.building,
        ].filter(Boolean)
        return parts.length > 0 ? parts.join(' ') : '-'
      },
    },
    {
      key: 'recipient.name',
      dataKey: 'recipient.name',
      title: '氏名',
      description: '荷物のお届け先の氏名または法人名を保持します。',
      width: 180,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const name = rowData.recipient?.name || '-'
        const honorific = rowData.honorific || '様'
        return name !== '-' ? `${name} ${honorific}` : name
      },
    },
    {
      key: 'recipient.phone',
      dataKey: 'recipient.phone',
      title: '電話番号',
      description: '配送時に連絡するためのお届け先の電話番号（数字のみ、ハイフン不可）を保持します。',
      width: 160,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.recipient?.phone || '-',
    },
    {
      key: 'honorific',
      dataKey: 'honorific',
      title: '敬称',
      description: 'お届け先名に付ける敬称（デフォルト: "様"）。',
      width: 100,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      formEditable: true,
      tableVisible: false,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.honorific || '様',
    },
    // (ご依頼主情報)
    {
      key: 'sender.postalCode',
      dataKey: 'sender.postalCode',
      title: '郵便番号',
      description: '出荷元（ご依頼主）の郵便番号（数字のみ、ハイフン不可）を保持します。',
      width: 150,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => formatPostalCode(rowData.sender?.postalCode),
    },
    {
      key: 'sender.prefecture',
      dataKey: 'sender.prefecture',
      title: '都道府県',
      description: 'ご依頼主の都道府県を保持します。',
      width: 140,
      fieldType: 'string',
      required: true,
      searchType: 'select',
      searchOptions: PREFECTURE_OPTIONS,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.sender?.prefecture || '-',
    },
    {
      key: 'sender.city',
      dataKey: 'sender.city',
      title: '市区郡町村',
      description: 'ご依頼主の市区郡町村を保持します。',
      width: 180,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.sender?.city || '-',
    },
    {
      key: 'sender.street',
      dataKey: 'sender.street',
      title: '町・番地',
      description: 'ご依頼主の町・番地を保持します。',
      width: 200,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.sender?.street || '-',
    },
    {
      key: 'sender.building',
      dataKey: 'sender.building',
      title: 'アパートマンション名',
      description: 'ご依頼主のアパート・マンション名・部屋番号等を保持します。',
      width: 200,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => (rowData.sender as any)?.building || '-',
    },
    {
      key: 'senderAddress',
      dataKey: 'senderAddress',
      title: '住所（全体）',
      description: 'ご依頼主の住所全体を組み合わせて表示します。',
      width: 300,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      tableVisible: false,
      formEditable: false,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const parts = [
          rowData.sender?.prefecture,
          rowData.sender?.city,
          rowData.sender?.street,
          (rowData.sender as any)?.building,
        ].filter(Boolean)
        return parts.length > 0 ? parts.join(' ') : '-'
      },
    },
    {
      key: 'sender.name',
      dataKey: 'sender.name',
      title: '氏名',
      description: '出荷元（ご依頼主）の名称（氏名または法人名）を保持します。',
      width: 150,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.sender?.name || '-',
    },
    {
      key: 'sender.phone',
      dataKey: 'sender.phone',
      title: '電話番号',
      description: '出荷元（ご依頼主）と連絡を取るための電話番号（数字のみ、ハイフン不可）を保持します。',
      width: 160,
      fieldType: 'string',
      required: true,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.sender?.phone || '-',
    },
    {
      key: 'carrierData.yamato.hatsuBaseNo1',
      dataKey: 'carrierData.yamato.hatsuBaseNo1',
      title: '発店コード1',
      description: '発店コード1（3桁数字）。',
      width: 150,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      formEditable: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.carrierData?.yamato?.hatsuBaseNo1 || '-',
    },
    {
      key: 'carrierData.yamato.hatsuBaseNo2',
      dataKey: 'carrierData.yamato.hatsuBaseNo2',
      title: '発店コード2',
      description: '発店コード2（3桁数字）。',
      width: 150,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      formEditable: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.carrierData?.yamato?.hatsuBaseNo2 || '-',
    },
    // (注文者情報)
    {
      key: 'orderer.postalCode',
      dataKey: 'orderer.postalCode',
      title: '郵便番号',
      description: '注文者の郵便番号（数字のみ、ハイフン不可）を保持します。',
      width: 150,
      fieldType: 'string',
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => formatPostalCode(rowData.orderer?.postalCode),
    },
    {
      key: 'orderer.prefecture',
      dataKey: 'orderer.prefecture',
      title: '都道府県',
      description: '注文者の都道府県を保持します。',
      width: 140,
      fieldType: 'string',
      required: false,
      searchType: 'select',
      searchOptions: PREFECTURE_OPTIONS,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.orderer?.prefecture || '-',
    },
    {
      key: 'orderer.city',
      dataKey: 'orderer.city',
      title: '市区郡町村',
      description: '注文者の市区郡町村を保持します。',
      width: 180,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.orderer?.city || '-',
    },
    {
      key: 'orderer.street',
      dataKey: 'orderer.street',
      title: '町・番地',
      description: '注文者の町・番地を保持します。',
      width: 200,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.orderer?.street || '-',
    },
    {
      key: 'orderer.building',
      dataKey: 'orderer.building',
      title: 'アパートマンション名',
      description: '注文者のアパート・マンション名・部屋番号等を保持します。',
      width: 200,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => (rowData.orderer as any)?.building || '-',
    },
    {
      key: 'ordererAddress',
      dataKey: 'ordererAddress',
      title: '住所（全体）',
      description: '注文者の住所全体を組み合わせて表示します。',
      width: 300,
      fieldType: 'string',
      required: false,
      searchType: 'string',
      tableVisible: false,
      formEditable: false,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const parts = [
          rowData.orderer?.prefecture,
          rowData.orderer?.city,
          rowData.orderer?.street,
          (rowData.orderer as any)?.building,
        ].filter(Boolean)
        return parts.length > 0 ? parts.join(' ') : '-'
      },
    },
    {
      key: 'orderer.name',
      dataKey: 'orderer.name',
      title: '氏名',
      description: '注文者の氏名または法人名を保持します。',
      width: 150,
      fieldType: 'string',
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.orderer?.name || '-',
    },
    {
      key: 'orderer.phone',
      dataKey: 'orderer.phone',
      title: '電話番号',
      description: '注文者と連絡を取るための電話番号（数字のみ、ハイフン不可）を保持します。',
      width: 160,
      fieldType: 'string',
      searchType: 'string',
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => rowData.orderer?.phone || '-',
    },
    // (その他)
    {
      key: 'createdAt',
      dataKey: 'createdAt',
      title: '作成日時',
      description: 'この注文レコードがシステム上で作成された日時です。通常は自動設定されます。',
      width: 170,
      fieldType: 'date',
      searchType: 'date',
      formEditable: false,
      tableVisible: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.createdAt ? new Date(rowData.createdAt).toLocaleString('ja-JP') : '-',
    },
    {
      key: 'updatedAt',
      dataKey: 'updatedAt',
      title: '更新日時',
      description: 'この注文レコードが最後に更新された日時です。通常は自動設定されます。',
      width: 170,
      fieldType: 'date',
      searchType: 'date',
      formEditable: false,
      tableVisible: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.updatedAt ? new Date(rowData.updatedAt).toLocaleString('ja-JP') : '-',
    },
    {
      key: 'statusPrinted',
      dataKey: 'status.printed.printedAt',
      title: '印刷日時',
      description: '送り状を印刷した日時。',
      width: 170,
      fieldType: 'date',
      required: false,
      searchType: 'date',
      formEditable: false,
      tableVisible: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.status?.printed?.printedAt ? new Date(rowData.status.printed.printedAt).toLocaleString('ja-JP') : '-',
    },
    {
      key: 'statusInspected',
      dataKey: 'status.inspected.inspectedAt',
      title: '検品日時',
      description: '検品が完了した日時。',
      width: 170,
      fieldType: 'date',
      required: false,
      searchType: 'date',
      formEditable: false,
      tableVisible: false,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.status?.inspected?.inspectedAt ? new Date(rowData.status.inspected.inspectedAt).toLocaleString('ja-JP') : '-',
    },
    {
      key: 'statusCarrierReceipt',
      dataKey: 'status.carrierReceipt.receivedAt',
      title: '取り込み日時',
      description: '配送業者から回执（受付/レスポンス）を取得した日時。',
      width: 170,
      fieldType: 'date',
      required: false,
      searchType: 'date',
      formEditable: false,
      tableVisible: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.status?.carrierReceipt?.receivedAt ? new Date(rowData.status.carrierReceipt.receivedAt).toLocaleString('ja-JP') : '-',
    },
    // 非表示フィールド
    {
      key: 'sourceOrderAt',
      dataKey: 'sourceOrderAt',
      title: '注文日時',
      description:
        '元の販売チャネル（モールや自社ECなど）で注文が確定した日時。日本時間のローカル日時として表示されます。',
      width: 170,
      fieldType: 'date',
      required: false,
      searchType: 'date',
      formEditable: true,
      tableVisible: false,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.sourceOrderAt ? new Date(rowData.sourceOrderAt).toLocaleString('ja-JP') : '-',
    },
    {
      key: 'statusPrintReady',
      dataKey: 'status.confirm.confirmedAt',
      title: '確認日時',
      description: '印刷準備が完了し、確認済みとなった日時。',
      width: 170,
      fieldType: 'date',
      required: false,
      searchType: 'date',
      formEditable: false,
      tableVisible: false,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.status?.confirm?.confirmedAt ? new Date(rowData.status.confirm.confirmedAt).toLocaleString('ja-JP') : '-',
    },
    {
      key: 'statusShipped',
      dataKey: 'status.shipped.shippedAt',
      title: '出荷完了日時',
      description: '出荷作業が完了した日時。',
      width: 170,
      fieldType: 'date',
      required: false,
      searchType: 'date',
      formEditable: false,
      tableVisible: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.status?.shipped?.shippedAt ? new Date(rowData.status.shipped.shippedAt).toLocaleString('ja-JP') : '-',
    },
    {
      key: 'statusEcExported',
      dataKey: 'status.ecExported.isExported',
      title: 'EC連携',
      description: 'ECへ連携済みかどうか。',
      width: 100,
      fieldType: 'boolean',
      required: false,
      searchType: 'boolean',
      formEditable: false,
      tableVisible: false,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.status?.ecExported?.isExported ? 'はい' : 'いいえ',
    },
    {
      key: 'statusEcExportedAt',
      dataKey: 'status.ecExported.exportedAt',
      title: 'EC連携日時',
      description: 'ECへ連携した日時。',
      width: 170,
      fieldType: 'date',
      required: false,
      searchType: 'date',
      formEditable: false,
      tableVisible: false,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) =>
        rowData.status?.ecExported?.exportedAt ? new Date(rowData.status.ecExported.exportedAt).toLocaleString('ja-JP') : '-',
    },
    {
      key: 'internalRecord',
      dataKey: 'internalRecord',
      title: '内部データ',
      description: '操作記録（確認取消等のイベントログ）。内容のみ表示します。',
      width: 200,
      fieldType: 'array',
      required: false,
      searchType: 'string', // 内容で検索可能
      formEditable: false,
      tableVisible: true,
      cellRenderer: ({ rowData }: { rowData: OrderDocument }) => {
        const records = rowData.internalRecord
        if (!records || !Array.isArray(records) || records.length === 0) {
          return '-'
        }
        // 各記録の内容を改行表示（プレーンテキスト、改行は保持） / 各记录内容换行显示（纯文本，换行符会被保留）
        return records.map((r) => r.content).join('\n')
      },
    },
    {
      key: 'sourceRawRows',
      dataKey: 'sourceRawRows',
      title: '元データ（非表示）',
      description: 'CSV/Excel 取込時の元行データ（追跡用）。UI には表示されません。',
      width: 1,
      fieldType: 'array',
      required: false,
      formEditable: false,
      tableVisible: false,
    },
  ]

  // Mapping Wizard で「order を source にしたい」場合、配列系の代表例がないと設定しづらいので追加。
  // NOTE: ここでは「データ上は products 配列から読める」だけの例。実際の join/index などは mapping 側で拡張する。
  const examples: TableColumn[] = opts?.includeMappingExamples
    ? [
        {
          key: '__mappingExample_products_0_sku',
          dataKey: 'products.0.sku',
          title: '（例）商品SKU管理番号（1件目）',
          description: 'products 配列の 1件目の sku（products[0].sku）。必須項目です。',
          width: 180,
          fieldType: 'string',
          required: true, // SKUは必須
          searchType: 'string',
          formEditable: false,
          tableVisible: false,
        },
        {
          key: '__mappingExample_products_0_name',
          dataKey: 'products.0.name',
          title: '（例）商品名（1件目）',
          description: 'products 配列の 1件目の商品名（products[0].name）。任意項目です。',
          width: 180,
          fieldType: 'string',
          required: false, // 商品名は任意
          searchType: 'string',
          formEditable: false,
          tableVisible: false,
        },
        {
          key: '__mappingExample_products_0_quantity',
          dataKey: 'products.0.quantity',
          title: '（例）数量（1件目）',
          description: 'products 配列の 1件目の数量（products[0].quantity）。必須項目です。',
          width: 160,
          fieldType: 'number',
          required: true, // 数量は必須
          searchType: 'number',
          formEditable: false,
          tableVisible: false,
        },
        {
          key: '__mappingExample_products_0_barcode',
          dataKey: 'products.0.barcode',
          title: '（例）商品バーコード（1件目）',
          description: 'products 配列の 1件目のバーコード（products[0].barcode）。任意項目です。アップロード値が商品マスタより優先されます。',
          width: 180,
          fieldType: 'string',
          required: false,
          searchType: 'string',
          formEditable: false,
          tableVisible: false,
        },
      ]
    : []

  return [...base, ...examples]
}
