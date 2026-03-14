import type { FormFieldDefinition, FormTypeDefinition } from '@/types/formTemplate'

/**
 * ピッキングリスト用フィールド定義
 * 商品マスタの情報と集計数量を出力する
 * 注文データではなく、商品マスタからSKU管理番号で完全な商品情報を取得する
 */
const pickingListFields: FormFieldDefinition[] = [
  {
    key: 'sku',
    label: 'SKU管理番号',
    description: '商品を一意に識別するSKUコード',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: true,
  },
  {
    key: 'name',
    label: '印刷用商品名',
    description: '商品名（短い表示名）',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'nameFull',
    label: '商品名',
    description: '商品名のフルテキスト',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'barcode',
    label: '検品コード (バーコード)',
    description: '商品バーコード（複数可）',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: true,
  },
  {
    key: 'coolType',
    label: 'クール区分',
    description: '0:通常 / 1:冷凍 / 2:冷蔵',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'invoiceType',
    label: '送り状種類',
    description: '0:発払い宅急便 / 8:宅急便コンパクト / A:メール便',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'delivery_size_index',
    label: '配送サイズ指数',
    description: '配送サイズ指数（正の整数）',
    fieldType: 'number',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'totalQuantity',
    label: '数量',
    description: '選択した注文の合計数量',
    fieldType: 'number',
    defaultEnabled: true,
    supportBarcode: false,
  },
]

/**
 * 出荷明細リスト用フィールド定義
 * 注文の全詳細情報を出力する
 */
const shipmentDetailFields: FormFieldDefinition[] = [
  {
    key: 'orderNumber',
    label: '出荷管理No',
    description: 'システム自動生成の管理番号',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: true,
  },
  {
    key: 'customerManagementNumber',
    label: 'お客様管理番号',
    description: 'お客様側の管理番号',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: true,
  },
  {
    key: 'ecCompanyName',
    label: 'ECモール',
    description: '注文元のECモール名',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'carrierName',
    label: '配送業者',
    description: '配送業者名',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'invoiceTypeName',
    label: '送り状種類',
    description: '発払い宅急便/宅急便コンパクト/メール便',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'shipPlanDate',
    label: '出荷予定日',
    description: '出荷予定日',
    fieldType: 'date',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'deliveryDatePreference',
    label: 'お届け日指定',
    description: 'お届け希望日',
    fieldType: 'date',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'deliveryTimeSlot',
    label: 'お届け時間帯',
    description: 'お届け時間帯',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'coolTypeName',
    label: 'クール区分',
    description: '通常/クール冷凍/クール冷蔵',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'products',
    label: '商品',
    description: '商品一覧（SKU x 数量）',
    fieldType: 'array',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'productTotalQuantity',
    label: '商品総数',
    description: '商品の合計数量',
    fieldType: 'number',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'recipientPostalCode',
    label: 'お届け先郵便番号',
    description: 'お届け先の郵便番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'recipientAddress',
    label: 'お届け先住所',
    description: 'お届け先の住所',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'recipientName',
    label: 'お届け先名',
    description: 'お届け先の氏名',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'recipientPhone',
    label: 'お届け先電話番号',
    description: 'お届け先の電話番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'honorific',
    label: '敬称',
    description: '敬称（様など）',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'senderPostalCode',
    label: 'ご依頼主郵便番号',
    description: 'ご依頼主の郵便番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'senderAddress',
    label: 'ご依頼主住所',
    description: 'ご依頼主の住所',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'senderName',
    label: 'ご依頼主名',
    description: 'ご依頼主の名称',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'senderPhone',
    label: 'ご依頼主電話番号',
    description: 'ご依頼主の電話番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'ordererPostalCode',
    label: '注文者郵便番号',
    description: '注文者の郵便番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'ordererAddress',
    label: '注文者住所',
    description: '注文者の住所',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'ordererName',
    label: '注文者名',
    description: '注文者の氏名',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'ordererPhone',
    label: '注文者電話番号',
    description: '注文者の電話番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'handlingTags',
    label: '荷扱い',
    description: '荷扱い指示タグ',
    fieldType: 'array',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'createdAt',
    label: '作成日時',
    description: 'レコード作成日時',
    fieldType: 'date',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'statusPrintedAt',
    label: '印刷日時',
    description: '送り状印刷日時',
    fieldType: 'date',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'statusCarrierReceiptAt',
    label: '取り込み日時',
    description: '配送業者データ取り込み日時',
    fieldType: 'date',
    defaultEnabled: false,
    supportBarcode: false,
  },
]

/**
 * 入庫リスト用フィールド定義
 * 入庫指示の明細情報を出力する
 * 入库单明细信息输出
 */
const inboundDetailFields: FormFieldDefinition[] = [
  {
    key: 'orderNumber',
    label: '入庫指示No',
    description: '入庫指示番号',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: true,
  },
  {
    key: 'status',
    label: 'ステータス',
    description: '入庫指示のステータス（draft/confirmed/receiving/received/done/cancelled）',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'supplierName',
    label: '仕入先',
    description: '仕入先名',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'expectedDate',
    label: '入荷予定日',
    description: '入荷予定日',
    fieldType: 'date',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'destinationLocation',
    label: '入庫先ロケーション',
    description: '入庫先のロケーションコード',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'lineNumber',
    label: '行番号',
    description: 'ライン番号',
    fieldType: 'number',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'productSku',
    label: 'SKU',
    description: '商品SKUコード',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: true,
  },
  {
    key: 'productName',
    label: '商品名',
    description: '商品名',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'expectedQuantity',
    label: '入荷予定数',
    description: '予定数量',
    fieldType: 'number',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'receivedQuantity',
    label: '検品済数',
    description: '検品済み数量',
    fieldType: 'number',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'putawayQuantity',
    label: '格納済数',
    description: '格納済み数量',
    fieldType: 'number',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'stockCategory',
    label: '在庫区分',
    description: '新品/仕損',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'lotNumber',
    label: 'ロット番号',
    description: 'ロット/バッチ番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: true,
  },
  {
    key: 'expiryDate',
    label: '賞味期限',
    description: '賞味期限/有効期限',
    fieldType: 'date',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'orderReferenceNumber',
    label: '参照番号',
    description: '発注書番号等の参照番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'putawayLocation',
    label: '格納先ロケーション',
    description: '格納先のロケーションコード',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'memo',
    label: '備考',
    description: '備考・メモ',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'createdAt',
    label: '作成日時',
    description: '入庫指示の作成日時',
    fieldType: 'date',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'completedAt',
    label: '完了日時',
    description: '入庫完了日時',
    fieldType: 'date',
    defaultEnabled: false,
    supportBarcode: false,
  },
]

/**
 * 入庫検品シート用フィールド定義（商品集計ベース）
 * 入庫指示の商品を集計してチェックリストとして出力
 * 入库检品表用字段定义（按商品汇总）
 */
const inboundInspectionFields: FormFieldDefinition[] = [
  {
    key: 'productSku',
    label: 'SKU',
    description: '商品SKUコード',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: true,
  },
  {
    key: 'productName',
    label: '商品名',
    description: '商品名',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'barcode',
    label: '検品コード',
    description: '商品バーコード',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: true,
  },
  {
    key: 'expectedQuantity',
    label: '入荷予定数',
    description: '合計予定数量',
    fieldType: 'number',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'receivedQuantity',
    label: '検品済数',
    description: '検品済み数量',
    fieldType: 'number',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'stockCategory',
    label: '在庫区分',
    description: '新品/仕損',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'lotNumber',
    label: 'ロット番号',
    description: 'ロット/バッチ番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: true,
  },
  {
    key: 'expiryDate',
    label: '賞味期限',
    description: '賞味期限/有効期限',
    fieldType: 'date',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'supplierName',
    label: '仕入先',
    description: '仕入先名',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'orderNumber',
    label: '入庫指示No',
    description: '入庫指示番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: true,
  },
]

/**
 * 商品ラベル用フィールド定義
 * 商品小標籤・外箱ラベル等に使用
 * 产品标签用字段定义（小标签、外箱标签等）
 */
const productLabelFields: FormFieldDefinition[] = [
  {
    key: 'sku',
    label: 'SKU管理番号',
    description: '商品SKUコード',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: true,
  },
  {
    key: 'name',
    label: '印刷用商品名',
    description: '商品名（短い表示名）',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: false,
  },
  {
    key: 'nameFull',
    label: '商品名（フル）',
    description: '商品名のフルテキスト',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'barcode',
    label: '検品コード',
    description: '商品バーコード（JAN等）',
    fieldType: 'string',
    defaultEnabled: true,
    supportBarcode: true,
  },
  {
    key: 'category',
    label: 'カテゴリ',
    description: '商品カテゴリ',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'locationCode',
    label: 'ロケーション',
    description: '保管ロケーションコード',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: true,
  },
  {
    key: 'lotNumber',
    label: 'ロット番号',
    description: 'ロット/バッチ番号',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: true,
  },
  {
    key: 'expiryDate',
    label: '賞味期限',
    description: '賞味期限/有効期限',
    fieldType: 'date',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'quantity',
    label: '数量',
    description: '数量（外箱ラベル用）',
    fieldType: 'number',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'weight',
    label: '重量',
    description: '重量（g）',
    fieldType: 'number',
    defaultEnabled: false,
    supportBarcode: false,
  },
  {
    key: 'supplierName',
    label: '仕入先',
    description: '仕入先名',
    fieldType: 'string',
    defaultEnabled: false,
    supportBarcode: false,
  },
]

/**
 * フォームタイプ登録表 / 帳票タイプ登録表
 */
export const formTypeRegistry: FormTypeDefinition[] = [
  // 出荷系 / 出库系
  {
    type: 'shipment-list-picking',
    label: 'ピッキングリスト',
    description: '選択した注文の商品を集計して出力します',
    fields: pickingListFields,
  },
  {
    type: 'shipment-detail-list',
    label: '出荷明細リスト',
    description: '選択した注文の詳細情報を出力します',
    fields: shipmentDetailFields,
  },
  // 入庫系 / 入库系
  {
    type: 'inbound-detail-list',
    label: '入庫リスト',
    description: '入庫指示のライン明細を出力します',
    fields: inboundDetailFields,
  },
  {
    type: 'inbound-inspection-sheet',
    label: '入庫検品シート',
    description: '入庫検品用のチェックリストを商品集計で出力します',
    fields: inboundInspectionFields,
  },
  // 商品系 / 产品系
  {
    type: 'product-label',
    label: '商品ラベル',
    description: '商品小標籤・外箱ラベル等を出力します',
    fields: productLabelFields,
  },
]

/**
 * タイプIDからフォームタイプ定義を取得
 */
export function getFormTypeDefinition(type: string): FormTypeDefinition | undefined {
  return formTypeRegistry.find((t) => t.type === type)
}

/**
 * タイプIDからフィールド定義を取得
 */
export function getFormTypeFields(type: string): FormFieldDefinition[] {
  const def = getFormTypeDefinition(type)
  return def?.fields || []
}

/**
 * ユニークID生成
 */
function generateId(): string {
  return `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * デフォルトの列設定を生成（新しいネスト対応形式）
 */
export function createDefaultColumns(type: string): import('@/types/formTemplate').FormTemplateColumn[] {
  const fields = getFormTypeFields(type)
  const enabledFields = fields.filter((f) => f.defaultEnabled)
  
  return enabledFields.map((f, index) => ({
    id: generateId(),
    type: 'single' as const,
    label: f.label,
    width: 'auto' as const,
    order: index,
    field: f.key,
    renderType: f.fieldType === 'date' ? ('date' as const) : ('text' as const),
    dateFormat: f.fieldType === 'date' ? 'YYYY/MM/DD' : undefined,
  }))
}
