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
 * 入庫差異リスト用フィールド定義
 * 入荷予定数と実績数の差異を出力する
 * 入库差异列表用字段定义（预期数量与实际数量差异）
 */
const inboundVarianceFields: FormFieldDefinition[] = [
  { key: 'orderNumber', label: '入庫指示No', description: '入庫指示番号 / 入库指示编号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'poNumber', label: '発注番号', description: '発注書番号 / 采购订单号', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'productSku', label: 'SKU', description: '商品SKUコード / 商品SKU代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productName', label: '商品名', description: '商品名 / 商品名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'expectedQuantity', label: '入荷予定数', description: '予定数量 / 预期数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'receivedQuantity', label: '検品済数', description: '検品済み数量 / 已检数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'damagedQuantity', label: '破損数', description: '破損数量 / 破损数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'variance', label: '差異数', description: '差異数量（受入 - 予定）/ 差异数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'variancePercent', label: '差異率', description: '差異率（%）/ 差异率', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
]

/**
 * 入庫看板用フィールド定義
 * 入庫指示のサマリを看板形式で表示
 * 入库看板用字段定义（入库指示汇总看板）
 */
const inboundKanbanFields: FormFieldDefinition[] = [
  { key: 'orderNumber', label: '入庫指示No', description: '入庫指示番号 / 入库指示编号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'clientName', label: '荷主名', description: '荷主名称 / 货主名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'expectedDate', label: '入荷予定日', description: '入荷予定日 / 预计到货日', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
  { key: 'totalSku', label: 'SKU数', description: '合計SKU数 / 总SKU数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'totalQuantity', label: '合計数量', description: '合計数量 / 总数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'warehouseLocation', label: '倉庫ロケーション', description: '入庫先ロケーション / 入库目标库位', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'barcode', label: 'バーコード', description: '入庫指示バーコード / 入库指示条形码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
]

/**
 * 入庫実績一覧表用フィールド定義
 * 完了済み入庫の実績データ
 * 入库实绩一览表用字段定义（已完成入库实绩）
 */
const inboundActualFields: FormFieldDefinition[] = [
  { key: 'orderNumber', label: '入庫指示No', description: '入庫指示番号 / 入库指示编号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'poNumber', label: '発注番号', description: '発注書番号 / 采购订单号', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'productSku', label: 'SKU', description: '商品SKUコード / 商品SKU代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productName', label: '商品名', description: '商品名 / 商品名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'receivedQuantity', label: '受入数量', description: '受入済み数量 / 已接收数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'damagedQuantity', label: '破損数', description: '破損数量 / 破损数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'completedAt', label: '完了日時', description: '入庫完了日時 / 入库完成时间', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
  { key: 'warehouseName', label: '倉庫名', description: '倉庫名称 / 仓库名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
]

/**
 * 棚卸指示書用フィールド定義
 * 棚卸実施の指示情報
 * 盘点指示书用字段定义（盘点实施指示信息）
 */
const stocktakingInstructionFields: FormFieldDefinition[] = [
  { key: 'orderNumber', label: '棚卸番号', description: '棚卸管理番号 / 盘点管理编号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'title', label: 'タイトル', description: '棚卸タイトル / 盘点标题', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'stocktakingCategory', label: '棚卸区分', description: '全棚卸/循環棚卸等 / 全盘/循环盘点等', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'instructionDate', label: '指示日', description: '棚卸指示日 / 盘点指示日期', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
  { key: 'locationFrom', label: '開始ロケーション', description: '対象開始ロケーション / 起始库位', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'locationTo', label: '終了ロケーション', description: '対象終了ロケーション / 终止库位', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'clientName', label: '荷主名', description: '荷主名称 / 货主名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'totalSlots', label: '対象スロット数', description: '対象ロケーション数 / 目标库位数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
]

/**
 * 棚卸チェックリスト用フィールド定義
 * 棚卸実施時のチェック用リスト
 * 盘点检查表用字段定义（盘点实施检查用）
 */
const stocktakingChecklistFields: FormFieldDefinition[] = [
  { key: 'locationCode', label: 'ロケーション', description: 'ロケーションコード / 库位代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productSku', label: 'SKU', description: '商品SKUコード / 商品SKU代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productName', label: '商品名', description: '商品名 / 商品名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'systemQuantity', label: 'システム在庫数', description: 'システム上の在庫数 / 系统库存数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'countedQuantity', label: '実数', description: '実際の棚卸数量 / 实际盘点数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'discrepancy', label: '差異', description: '差異数量 / 差异数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'resultMark', label: '判定', description: '○ / × / △ / 判定结果', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'countRound', label: '棚卸回次', description: '第N回棚卸 / 第N次盘点', fieldType: 'number', defaultEnabled: false, supportBarcode: false },
]

/**
 * 棚卸差異リスト用フィールド定義
 * 棚卸結果の差異のみを抽出
 * 盘点差异列表用字段定义（仅提取盘点差异）
 */
const stocktakingVarianceFields: FormFieldDefinition[] = [
  { key: 'locationCode', label: 'ロケーション', description: 'ロケーションコード / 库位代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productSku', label: 'SKU', description: '商品SKUコード / 商品SKU代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productName', label: '商品名', description: '商品名 / 商品名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'systemQuantity', label: 'システム在庫数', description: 'システム上の在庫数 / 系统库存数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'countedQuantity', label: '実数', description: '実際の棚卸数量 / 实际盘点数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'discrepancy', label: '差異', description: '差異数量 / 差异数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'warehouseType', label: '倉庫タイプ', description: '倉庫種別 / 仓库类型', fieldType: 'string', defaultEnabled: false, supportBarcode: false },
  { key: 'previousCount', label: '前回実数', description: '前回棚卸の数量 / 上次盘点数量', fieldType: 'number', defaultEnabled: false, supportBarcode: false },
  { key: 'resultMark', label: '判定', description: '○ / × / △ / 判定结果', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'notes', label: '備考', description: '備考・メモ / 备注', fieldType: 'string', defaultEnabled: false, supportBarcode: false },
]

/**
 * 棚卸報告書用フィールド定義
 * 棚卸の最終報告サマリ
 * 盘点报告书用字段定义（盘点最终报告汇总）
 */
const stocktakingReportFields: FormFieldDefinition[] = [
  { key: 'orderNumber', label: '棚卸番号', description: '棚卸管理番号 / 盘点管理编号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'title', label: 'タイトル', description: '棚卸タイトル / 盘点标题', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'totalSlots', label: '対象スロット数', description: '対象ロケーション数 / 目标库位数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'completedSlots', label: '完了スロット数', description: '完了済みロケーション数 / 已完成库位数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'theoreticalPieceCount', label: '理論個数', description: 'システム上の合計個数 / 系统总数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'actualPieceCount', label: '実際個数', description: '棚卸実際の合計個数 / 盘点实际总数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'judgment', label: '総合判定', description: '合格/不合格 / 合格/不合格', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'confirmedAt', label: '確認日', description: '確認日時 / 确认日期', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
  { key: 'customerNotificationDate', label: '荷主通知日', description: '荷主への通知日 / 货主通知日期', fieldType: 'date', defaultEnabled: false, supportBarcode: false },
]

/**
 * 梱包明細用フィールド定義
 * 箱単位の梱包内容を出力
 * 装箱明细用字段定义（按箱输出装箱内容）
 */
const packingDetailFields: FormFieldDefinition[] = [
  { key: 'orderNumber', label: '出荷管理No', description: '出荷管理番号 / 出库管理编号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'boxNumber', label: '箱番号', description: '梱包箱番号 / 箱号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productSku', label: 'SKU', description: '商品SKUコード / 商品SKU代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productName', label: '商品名', description: '商品名 / 商品名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'quantity', label: '数量', description: '梱包数量 / 装箱数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'weight', label: '重量', description: '重量（g）/ 重量（克）', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'dimensions', label: '寸法', description: '寸法（LxWxH）/ 尺寸', fieldType: 'string', defaultEnabled: false, supportBarcode: false },
]

/**
 * 出荷未検品一覧用フィールド定義
 * 未検品の出荷注文を一覧出力
 * 出库未检品一览用字段定义（未检品出库订单列表）
 */
const unshippedListFields: FormFieldDefinition[] = [
  { key: 'orderNumber', label: '出荷管理No', description: '出荷管理番号 / 出库管理编号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'recipientName', label: 'お届け先名', description: 'お届け先名 / 收件人姓名', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'recipientAddress', label: 'お届け先住所', description: 'お届け先住所 / 收件人地址', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'carrierName', label: '配送業者', description: '配送業者名 / 配送公司名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'shipPlanDate', label: '出荷予定日', description: '出荷予定日 / 出库预定日', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
  { key: 'createdAt', label: '作成日時', description: 'レコード作成日時 / 记录创建时间', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
]

/**
 * 配送証明（POD）用フィールド定義
 * 配達完了の証明データ
 * 配送证明（POD）用字段定义（配送完成证明数据）
 */
const podDeliveryProofFields: FormFieldDefinition[] = [
  { key: 'orderNumber', label: '出荷管理No', description: '出荷管理番号 / 出库管理编号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'recipientName', label: 'お届け先名', description: 'お届け先名 / 收件人姓名', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'recipientAddress', label: 'お届け先住所', description: 'お届け先住所 / 收件人地址', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'carrierName', label: '配送業者', description: '配送業者名 / 配送公司名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'trackingNumber', label: '追跡番号', description: '配送追跡番号 / 物流追踪号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'shippedAt', label: '出荷日時', description: '出荷日時 / 出库时间', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
  { key: 'deliveredAt', label: '配達日時', description: '配達完了日時 / 送达时间', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
  { key: 'signature', label: '受領サイン', description: '受領者サイン / 签收签名', fieldType: 'string', defaultEnabled: false, supportBarcode: false },
]

/**
 * 在庫証明書用フィールド定義
 * 在庫の証明データを出力
 * 库存证明书用字段定义（库存证明数据输出）
 */
const inventoryCertificateFields: FormFieldDefinition[] = [
  { key: 'productSku', label: 'SKU', description: '商品SKUコード / 商品SKU代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productName', label: '商品名', description: '商品名 / 商品名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'locationCode', label: 'ロケーション', description: 'ロケーションコード / 库位代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'quantity', label: '在庫数', description: '現在庫数 / 当前库存数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'reservedQuantity', label: '引当済数', description: '引当済み数量 / 已预留数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'lastMovedAt', label: '最終移動日', description: '最終在庫移動日時 / 最后移动时间', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
  { key: 'certifiedDate', label: '証明日', description: '証明発行日 / 证明发行日期', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
]

/**
 * FBA報告データ用フィールド定義
 * Amazon FBA出荷プランの報告データ
 * FBA报告数据用字段定义（Amazon FBA出货计划报告）
 */
const fbaReportFields: FormFieldDefinition[] = [
  { key: 'planName', label: 'プラン名', description: 'FBA出荷プラン名 / FBA出货计划名', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'boxNumber', label: '箱番号', description: '梱包箱番号 / 箱号', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productSku', label: 'SKU', description: '商品SKUコード / 商品SKU代码', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'productName', label: '商品名', description: '商品名 / 商品名称', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'quantity', label: '数量', description: '梱包数量 / 装箱数量', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'width', label: '幅', description: '幅（cm）/ 宽度（厘米）', fieldType: 'number', defaultEnabled: false, supportBarcode: false },
  { key: 'depth', label: '奥行', description: '奥行（cm）/ 深度（厘米）', fieldType: 'number', defaultEnabled: false, supportBarcode: false },
  { key: 'height', label: '高さ', description: '高さ（cm）/ 高度（厘米）', fieldType: 'number', defaultEnabled: false, supportBarcode: false },
  { key: 'weight', label: '重量', description: '重量（g）/ 重量（克）', fieldType: 'number', defaultEnabled: false, supportBarcode: false },
  { key: 'fnsku', label: 'FNSKU', description: 'Amazon FNSKU', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
]

/**
 * 納品書用フィールド定義
 * B2B出荷用の納品書（配送明細書）を出力する
 * B2B出货用的交货单（配送明细单）
 */
const deliveryNoteFields: FormFieldDefinition[] = [
  { key: 'orderNumber', label: '出荷管理No', fieldType: 'string', defaultEnabled: true, supportBarcode: true },
  { key: 'customerManagementNumber', label: 'お客様管理番号', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'deliveryDate', label: '納品日', fieldType: 'date', defaultEnabled: true, supportBarcode: false },
  { key: 'recipientName', label: 'お届け先名', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'recipientAddress', label: 'お届け先住所', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'senderName', label: 'ご依頼主名', fieldType: 'string', defaultEnabled: true, supportBarcode: false },
  { key: 'senderAddress', label: 'ご依頼主住所', fieldType: 'string', defaultEnabled: false, supportBarcode: false },
  { key: 'products', label: '商品明細', fieldType: 'array', defaultEnabled: true, supportBarcode: false },
  { key: 'productTotalQuantity', label: '商品総数', fieldType: 'number', defaultEnabled: true, supportBarcode: false },
  { key: 'totalAmount', label: '合計金額', fieldType: 'number', defaultEnabled: false, supportBarcode: false },
  { key: 'taxAmount', label: '消費税', fieldType: 'number', defaultEnabled: false, supportBarcode: false },
  { key: 'memo', label: '備考', fieldType: 'string', defaultEnabled: false, supportBarcode: false },
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
  // 納品書系 / 交货单系
  {
    type: 'delivery-note',
    label: '納品書',
    description: 'B2B出荷用の納品書を出力します',
    fields: deliveryNoteFields,
  },
  // 商品系 / 产品系
  {
    type: 'product-label',
    label: '商品ラベル',
    description: '商品小標籤・外箱ラベル等を出力します',
    fields: productLabelFields,
  },
  // 入庫差異・看板・実績系 / 入库差异・看板・实绩系
  {
    type: 'inbound-variance-list',
    label: '入庫差異リスト',
    description: '入荷予定数と実績数の差異を出力します / 输出预期数量与实际数量差异',
    fields: inboundVarianceFields,
  },
  {
    type: 'inbound-kanban',
    label: '入庫看板',
    description: '入庫指示のサマリを看板形式で出力します / 以看板形式输出入库指示汇总',
    fields: inboundKanbanFields,
  },
  {
    type: 'inbound-actual-list',
    label: '入庫実績一覧表',
    description: '完了済み入庫の実績データを出力します / 输出已完成入库实绩数据',
    fields: inboundActualFields,
  },
  // 棚卸系 / 盘点系
  {
    type: 'stocktaking-instruction',
    label: '棚卸指示書',
    description: '棚卸実施の指示情報を出力します / 输出盘点实施指示信息',
    fields: stocktakingInstructionFields,
  },
  {
    type: 'stocktaking-checklist',
    label: '棚卸チェックリスト',
    description: '棚卸実施時のチェック用リストを出力します / 输出盘点检查表',
    fields: stocktakingChecklistFields,
  },
  {
    type: 'stocktaking-variance',
    label: '棚卸差異リスト',
    description: '棚卸結果の差異のみを抽出して出力します / 仅输出盘点差异',
    fields: stocktakingVarianceFields,
  },
  {
    type: 'stocktaking-report',
    label: '棚卸報告書',
    description: '棚卸の最終報告サマリを出力します / 输出盘点最终报告汇总',
    fields: stocktakingReportFields,
  },
  // 梱包・出荷・配送系 / 装箱・出库・配送系
  {
    type: 'packing-detail',
    label: '梱包明細',
    description: '箱単位の梱包内容を出力します / 按箱输出装箱内容',
    fields: packingDetailFields,
  },
  {
    type: 'unshipped-list',
    label: '出荷未検品一覧',
    description: '未検品の出荷注文を一覧で出力します / 输出未检品出库订单列表',
    fields: unshippedListFields,
  },
  {
    type: 'pod-delivery-proof',
    label: '配送証明 POD',
    description: '配達完了の証明データを出力します / 输出配送完成证明数据',
    fields: podDeliveryProofFields,
  },
  // 在庫・FBA系 / 库存・FBA系
  {
    type: 'inventory-certificate',
    label: '在庫証明書',
    description: '在庫の証明データを出力します / 输出库存证明数据',
    fields: inventoryCertificateFields,
  },
  {
    type: 'fba-report',
    label: 'FBA報告データ',
    description: 'Amazon FBA出荷プランの報告データを出力します / 输出FBA出货计划报告',
    fields: fbaReportFields,
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
