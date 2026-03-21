// 出荷関連テーブル / 出货相关表
import { pgTable, uuid, text, numeric, boolean, timestamp, jsonb, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';

// ============================================
// 出荷グループ / 出货分组
// ============================================
export const orderGroups = pgTable('order_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // グループ情報 / 分组信息
  name: text('name').notNull(),
  priority: integer('priority').default(0),
  enabled: boolean('enabled').default(true).notNull(),
  description: text('description'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('order_groups_tenant_idx').on(table.tenantId),
]);

// ============================================
// 依頼元会社 / 委托方公司
// ============================================
export const orderSourceCompanies = pgTable('order_source_companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 依頼主情報 / 委托方信息
  senderName: text('sender_name').notNull(),
  senderPostalCode: text('sender_postal_code'),
  senderAddressPrefecture: text('sender_address_prefecture'),
  senderAddressCity: text('sender_address_city'),
  senderAddressStreet: text('sender_address_street'),
  senderAddressBuilding: text('sender_address_building'),
  senderPhone: text('sender_phone'),

  // ヤマト発店コード / 大和发店编码
  hatsuBaseNo1: text('hatsu_base_no1'),
  hatsuBaseNo2: text('hatsu_base_no2'),

  // 有効フラグ / 有效标志
  isActive: boolean('is_active').default(true).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('order_source_companies_tenant_idx').on(table.tenantId),
]);

// ============================================
// 出荷注文（メインテーブル）/ 出货订单（主表）
// ============================================
export const shipmentOrders = pgTable('shipment_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 注文基本情報 / 订单基本信息
  orderNumber: text('order_number').notNull(),
  destinationType: text('destination_type').default('B2C'),  // B2C/B2B/FBA/RSL
  fbaShipmentId: text('fba_shipment_id'),
  fbaDestination: text('fba_destination'),

  // 配送業者情報 / 配送商信息
  carrierId: text('carrier_id'),
  trackingId: text('tracking_id'),
  customerManagementNumber: text('customer_management_number'),

  // ステータス: 確認 / 状态: 确认
  statusConfirmed: boolean('status_confirmed').default(false).notNull(),
  statusConfirmedAt: timestamp('status_confirmed_at'),

  // ステータス: 配送業者受付 / 状态: 配送商受理
  statusCarrierReceived: boolean('status_carrier_received').default(false).notNull(),
  statusCarrierReceivedAt: timestamp('status_carrier_received_at'),

  // ステータス: 印刷済み / 状态: 已打印
  statusPrinted: boolean('status_printed').default(false).notNull(),
  statusPrintedAt: timestamp('status_printed_at'),

  // ステータス: 検品済み / 状态: 已检品
  statusInspected: boolean('status_inspected').default(false).notNull(),
  statusInspectedAt: timestamp('status_inspected_at'),

  // ステータス: 出荷済み / 状态: 已出货
  statusShipped: boolean('status_shipped').default(false).notNull(),
  statusShippedAt: timestamp('status_shipped_at'),

  // ステータス: EC連携済み / 状态: 已EC对接
  statusEcExported: boolean('status_ec_exported').default(false).notNull(),
  statusEcExportedAt: timestamp('status_ec_exported_at'),

  // ステータス: 保留中 / 状态: 暂停中
  statusHeld: boolean('status_held').default(false).notNull(),
  statusHeldAt: timestamp('status_held_at'),

  // 送付先住所 / 收件人地址
  recipientPostalCode: text('recipient_postal_code'),
  recipientPrefecture: text('recipient_prefecture'),
  recipientCity: text('recipient_city'),
  recipientStreet: text('recipient_street'),
  recipientBuilding: text('recipient_building'),
  recipientName: text('recipient_name'),
  recipientPhone: text('recipient_phone'),
  honorific: text('honorific').default('様'),

  // 依頼主住所 / 发件人地址
  senderPostalCode: text('sender_postal_code'),
  senderPrefecture: text('sender_prefecture'),
  senderCity: text('sender_city'),
  senderStreet: text('sender_street'),
  senderBuilding: text('sender_building'),
  senderName: text('sender_name'),
  senderPhone: text('sender_phone'),

  // 注文者住所（全項目 optional）/ 下单人地址（全部可选）
  ordererPostalCode: text('orderer_postal_code'),
  ordererPrefecture: text('orderer_prefecture'),
  ordererCity: text('orderer_city'),
  ordererStreet: text('orderer_street'),
  ordererBuilding: text('orderer_building'),
  ordererName: text('orderer_name'),
  ordererPhone: text('orderer_phone'),

  // 配送希望 / 配送偏好
  shipPlanDate: text('ship_plan_date'),
  invoiceType: text('invoice_type'),
  coolType: text('cool_type'),           // 0:常温/1:冷蔵/2:冷凍
  deliveryTimeSlot: text('delivery_time_slot'),
  deliveryDatePreference: text('delivery_date_preference'),

  // 元注文日時 / 原始订单时间
  sourceOrderAt: timestamp('source_order_at'),

  // 配送業者固有データ（JSON）/ 配送商特有数据（JSON）
  carrierData: jsonb('carrier_data'),           // { yamato: { sortingCode, hatsuBaseNo1, hatsuBaseNo2 } }

  // コスト集計 / 成本汇总
  costSummary: jsonb('cost_summary'),           // { productCost, materialCost, shippingCost, totalCost }
  shippingCost: numeric('shipping_cost'),
  shippingCostBreakdown: jsonb('shipping_cost_breakdown'),  // { base, cool, cod, fuel, other }
  costSource: text('cost_source'),              // auto/manual/import
  costCalculatedAt: timestamp('cost_calculated_at'),

  // 荷扱いタグ / 处理标签
  handlingTags: jsonb('handling_tags').default([]),    // string[]

  // カスタムフィールド / 自定义字段
  customFields: jsonb('custom_fields').default({}),

  // 商品集約メタ（検索・フィルター最適化）/ 商品聚合元数据（搜索、过滤优化）
  _productsMeta: jsonb('_products_meta'),       // { skus, names, skuCount, totalQuantity, totalPrice }

  // 追跡用元データ / 追踪用原始数据
  sourceRawRows: jsonb('source_raw_rows'),      // Array<Record<string, unknown>>
  carrierRawRow: jsonb('carrier_raw_row'),      // Record<string, unknown>

  // 内部操作記録 / 内部操作记录
  internalRecord: jsonb('internal_record'),     // Array<{ user, timestamp, content }>

  // 出荷グループ / 出货分组
  orderGroupId: uuid('order_group_id').references(() => orderGroups.id),

  // 依頼元会社 / 委托方公司
  orderSourceCompanyId: uuid('order_source_company_id').references(() => orderSourceCompanies.id),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('shipment_orders_tenant_created_idx').on(table.tenantId, table.createdAt),
  index('shipment_orders_tenant_status_idx').on(table.tenantId, table.statusConfirmed, table.statusShipped),
  uniqueIndex('shipment_orders_tenant_order_number_idx').on(table.tenantId, table.orderNumber),
]);

// ============================================
// 出荷注文商品（子テーブル）/ 出货订单商品（子表）
// ============================================
export const shipmentOrderProducts = pgTable('shipment_order_products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  shipmentOrderId: uuid('shipment_order_id').references(() => shipmentOrders.id, { onDelete: 'cascade' }).notNull(),

  // ユーザー入力 / 用户输入
  inputSku: text('input_sku').notNull(),
  quantity: integer('quantity').notNull(),

  // auto-fill 解析結果 / 自动填充解析结果
  productId: uuid('product_id').references(() => products.id),
  productSku: text('product_sku'),
  productName: text('product_name'),

  // 価格情報 / 价格信息
  unitPrice: numeric('unit_price'),
  subtotal: numeric('subtotal'),

  // 親商品からスナップショット / 来自父商品的快照
  coolType: text('cool_type'),               // 0:常温/1:冷蔵/2:冷凍
  barcode: jsonb('barcode').default([]),      // string[]
  imageUrl: text('image_url'),

  // 子SKU 一致情報 / 子SKU匹配信息
  matchedSubSku: jsonb('matched_sub_sku'),   // { code, price, description }

  // メール便計算設定 / 邮件便计算设置
  mailCalcEnabled: boolean('mail_calc_enabled'),
  mailCalcMaxQuantity: integer('mail_calc_max_quantity'),
}, (table) => [
  index('shipment_order_products_order_idx').on(table.shipmentOrderId),
  index('shipment_order_products_product_idx').on(table.productId),
]);

// ============================================
// 出荷注文耗材（子テーブル）/ 出货订单耗材（子表）
// ============================================
export const shipmentOrderMaterials = pgTable('shipment_order_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  shipmentOrderId: uuid('shipment_order_id').references(() => shipmentOrders.id, { onDelete: 'cascade' }).notNull(),

  // 耗材情報 / 耗材信息
  materialSku: text('material_sku').notNull(),
  materialName: text('material_name'),
  quantity: integer('quantity').notNull(),
  unitCost: numeric('unit_cost'),
  totalCost: numeric('total_cost'),

  // 自動追加フラグ / 自动追加标志
  auto: boolean('auto').default(false),
}, (table) => [
  index('shipment_order_materials_order_idx').on(table.shipmentOrderId),
]);
