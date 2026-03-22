// 入庫オーダー / 入库订单
import { pgTable, uuid, text, numeric, integer, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';

/**
 * 入庫オーダー / 入库订单
 * status: draft/confirmed/arrived/processing/awaiting_label/ready_to_ship/shipped/receiving/received/done/cancelled
 * flowType: standard/crossdock/passthrough
 */
export const inboundOrders = pgTable('inbound_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 注文番号 / 订单号
  orderNumber: text('order_number').notNull(),
  // ステータス / 状态
  status: text('status').notNull().default('draft'),
  // フロータイプ / 流程类型
  flowType: text('flow_type').notNull().default('standard'),

  // 関連先 / 关联方
  clientId: uuid('client_id'),
  supplierId: uuid('supplier_id'),
  warehouseId: uuid('warehouse_id'),

  // 予定日 / 预计到货日
  expectedDate: timestamp('expected_date'),

  // 備考 / 备注
  notes: text('notes'),

  // 関連オーダーID / 关联订单ID（出荷先连携用）
  linkedOrderIds: jsonb('linked_order_ids').default([]),

  // FBA情報 / FBA信息（shipmentId, destinationFc, labelPdfUrl 等）
  fbaInfo: jsonb('fba_info'),
  // RSL情報 / RSL信息（rslPlanId, destinationWarehouse 等）
  rslInfo: jsonb('rsl_info'),
  // B2B情報 / B2B信息（recipientName, postalCode 等）
  b2bInfo: jsonb('b2b_info'),

  // 作業オプション / 作业选项（課金ポイント / 收费点）
  serviceOptions: jsonb('service_options').default([]),

  // 着払い入庫 / 到付入库
  isCodDelivery: boolean('is_cod_delivery').default(false),
  // 予定外入庫 / 计划外入库
  isUnplanned: boolean('is_unplanned').default(false),

  // --- 要件ギャップ追加フィールド / 需求差距补充字段 ---
  // 発注番号 / 采购订单号
  poNumber: text('po_number'),
  // 入庫希望日 / 期望入库日期
  desiredDate: timestamp('desired_date'),
  // 納品元名称 / 供货方名称
  supplierName: text('supplier_name'),
  // 納品元電話番号 / 供货方电话
  supplierPhone: text('supplier_phone'),
  // 納品元郵便番号 / 供货方邮编
  supplierPostalCode: text('supplier_postal_code'),
  // 納品元住所 / 供货方地址
  supplierAddress: text('supplier_address'),
  // 完納フラグ / 完纳标志
  completionFlag: boolean('completion_flag').default(false),
  // 完納日付 / 完纳日期
  completionDate: timestamp('completion_date'),
  // 取込管理番号 / 导入管理编号
  importControlNumber: text('import_control_number'),
  // 取込管理日 / 导入管理日期
  importControlDate: timestamp('import_control_date'),
  // 入庫/納品会社 / 入库/交货公司
  deliveryCompany: text('delivery_company'),
  // 入庫/納品伝票番号 / 入库/交货单号
  deliverySlipNumber: text('delivery_slip_number'),
  // 入庫コメント / 入库备注
  inboundComment: text('inbound_comment'),
  // 入庫コンテナ / 入库集装箱 (20ft/40ft/40ftH)
  containerType: text('container_type'),
  // 入庫立方数 / 入库立方数
  totalCbm: text('total_cbm'),
  // 入庫パレット数 / 入库托盘数
  totalPallets: integer('total_pallets').default(0),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  uniqueIndex('inbound_orders_tenant_number_idx').on(table.tenantId, table.orderNumber),
  index('inbound_orders_tenant_status_idx').on(table.tenantId, table.status),
  index('inbound_orders_tenant_client_idx').on(table.tenantId, table.clientId),
  index('inbound_orders_tenant_warehouse_idx').on(table.tenantId, table.warehouseId),
]);

/**
 * 入庫オーダー明細行 / 入库订单明细行
 */
export const inboundOrderLines = pgTable('inbound_order_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 親オーダー / 父订单
  inboundOrderId: uuid('inbound_order_id').references(() => inboundOrders.id, { onDelete: 'cascade' }).notNull(),

  // 商品 / 商品
  productId: uuid('product_id').references(() => products.id),
  productSku: text('product_sku').notNull(),

  // 数量 / 数量
  expectedQuantity: integer('expected_quantity').notNull().default(0),
  receivedQuantity: integer('received_quantity').notNull().default(0),
  damagedQuantity: integer('damaged_quantity').notNull().default(0),

  // ロケーション・ロット / 库位・批次
  locationId: uuid('location_id'),
  lotId: uuid('lot_id'),

  // 単価 / 单价
  unitPrice: numeric('unit_price'),

  // 棚入れ / 上架
  putawayLocationId: uuid('putaway_location_id'),
  putawayQuantity: integer('putaway_quantity').notNull().default(0),

  // 在庫移動ID / 库存移动ID
  stockMoveIds: jsonb('stock_move_ids').default([]),

  // メモ / 备注
  memo: text('memo'),

  // --- 要件ギャップ追加フィールド / 需求差距补充字段 ---
  // 入庫予定明細番号 / 入库预定明细编号
  detailNumber: text('detail_number'),
  // 商品取扱区分 / 商品处理区分 (normal/urgent)
  handlingCategory: text('handling_category'),
  // 入庫区分 / 入库区分 (stock/passthrough)
  inboundType: text('inbound_type'),
  // 倉庫コード / 仓库编码
  warehouseCode: text('warehouse_code'),
  // 倉庫種類 / 仓库种类 (normal/refrigerated/frozen/hazardous)
  warehouseType: text('warehouse_type'),
  // ケース数 / 箱数
  caseQuantity: integer('case_quantity'),
  // ケース単位 / 箱单位 (piece/case/unit/box/roll)
  caseUnitType: text('case_unit_type'),
  // ケース単位入数 / 箱单位入数
  caseUnitQuantity: integer('case_unit_quantity'),
  // インナー箱数 / 内箱数
  innerBoxQuantity: integer('inner_box_quantity'),
  // シリアル番号 / 序列号
  serialNumber: text('serial_number'),
  // 賞味期限 / 保质期限
  bestBeforeDate: timestamp('best_before_date'),
  // 有効期限（入力）/ 有效期限（输入）
  expiryDateInput: text('expiry_date_input'),
  // ラック番号 / 货架号
  rackNumber: text('rack_number'),
  // 危険区分 / 危险区分
  hazardousFlag: boolean('hazardous_flag').default(false),
  // 有償無償区分 / 有偿无偿区分
  paidFreeFlag: text('paid_free_flag').default('free'),
  // 原産国 / 原产国
  originCountry: text('origin_country'),
  // 航空搭載禁止 / 禁止航空运输
  airShippingProhibited: boolean('air_shipping_prohibited').default(false),
  // 商品委託作業区分 / 商品委托作业区分
  serviceWorkType: text('service_work_type'),
  // 販売単価 / 销售单价
  sellingPrice: text('selling_price'),
  // 販売単位 / 销售单位
  sellingPriceUnit: text('selling_price_unit'),
  // 仕入単価 / 采购单价
  purchasePrice: text('purchase_price'),
  // 仕入単位 / 采购单位
  purchasePriceUnit: text('purchase_price_unit'),
  // 税区分 / 税区分
  taxType: text('tax_type'),
  // 税率 / 税率
  taxRate: text('tax_rate'),
  // 通貨 / 货币
  currency: text('currency').default('JPY'),
  // 予備項目1-6 / 预留字段1-6
  reserveFields: jsonb('reserve_fields').default({}),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('inbound_lines_order_idx').on(table.inboundOrderId),
  index('inbound_lines_tenant_product_idx').on(table.tenantId, table.productId),
]);
