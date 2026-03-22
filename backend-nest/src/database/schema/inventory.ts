// 在庫関連テーブル / 库存相关表
import { pgTable, uuid, text, integer, numeric, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';
import { shipmentOrders } from './shipments';

// ロケーション / 库位
export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  warehouseId: uuid('warehouse_id'),
  parentId: uuid('parent_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),  // warehouse/zone/shelf/bin/staging/receiving/virtual
  fullPath: text('full_path').default(''),
  coolType: text('cool_type'),      // 0:常温/1:冷蔵/2:冷凍
  stockType: text('stock_type'),     // 01:良品/02:不良品/03:保留/04:返品/05:廃棄/06:その他
  temperatureType: text('temperature_type'), // 01:常温/02:冷蔵/03:冷凍/04:危険/05:その他
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0),
  memo: text('memo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('locations_tenant_code_idx').on(table.tenantId, table.code),
  index('locations_tenant_type_idx').on(table.tenantId, table.type),
  index('locations_warehouse_idx').on(table.warehouseId),
]);

// 在庫数量 / 库存数量
export const stockQuants = pgTable('stock_quants', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  locationId: uuid('location_id').references(() => locations.id).notNull(),
  lotId: uuid('lot_id'),
  quantity: integer('quantity').default(0).notNull(),
  reservedQuantity: integer('reserved_quantity').default(0).notNull(),
  lastMovedAt: timestamp('last_moved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('stock_quants_unique_idx').on(table.tenantId, table.productId, table.locationId, table.lotId),
  index('stock_quants_product_idx').on(table.tenantId, table.productId),
  index('stock_quants_location_idx').on(table.tenantId, table.locationId),
]);

// 在庫移動 / 库存移动
export const stockMoves = pgTable('stock_moves', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  moveNumber: text('move_number').notNull(),
  moveType: text('move_type').notNull(),  // inbound/outbound/transfer/adjustment/return
  status: text('status').default('draft'),  // draft/confirmed/done/cancelled
  productId: uuid('product_id').references(() => products.id).notNull(),
  productSku: text('product_sku'),
  fromLocationId: uuid('from_location_id').references(() => locations.id),
  toLocationId: uuid('to_location_id').references(() => locations.id),
  lotId: uuid('lot_id'),
  quantity: integer('quantity').notNull(),
  referenceType: text('reference_type'),  // inbound-order/shipment-order/adjustment/return-order
  referenceId: uuid('reference_id'),
  referenceNumber: text('reference_number'),
  reason: text('reason'),
  executedBy: text('executed_by'),
  executedAt: timestamp('executed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('stock_moves_tenant_created_idx').on(table.tenantId, table.createdAt),
  index('stock_moves_reference_idx').on(table.referenceType, table.referenceId),
  index('stock_moves_product_idx').on(table.productId),
]);

// ロット / 批次
export const lots = pgTable('lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  lotNumber: text('lot_number').notNull(),
  expiryDate: timestamp('expiry_date'),
  manufacturingDate: timestamp('manufacturing_date'),
  memo: text('memo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('lots_tenant_product_lot_idx').on(table.tenantId, table.productId, table.lotNumber),
]);

// 在庫台帳 / 库存台账
export const inventoryLedger = pgTable('inventory_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  productSku: text('product_sku'),
  locationId: uuid('location_id'),
  lotId: uuid('lot_id'),
  type: text('type').notNull(),  // inbound/outbound/reserve/release/adjustment/count
  quantity: integer('quantity').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  referenceNumber: text('reference_number'),
  reason: text('reason'),
  executedBy: text('executed_by'),
  executedAt: timestamp('executed_at'),
  memo: text('memo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('ledger_tenant_created_idx').on(table.tenantId, table.createdAt),
  index('ledger_product_idx').on(table.productId),
]);

// 欠品レコード / 缺货记录
export const shortageRecords = pgTable('shortage_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 出荷オーダーID / 出货订单ID
  shipmentOrderId: uuid('shipment_order_id').references(() => shipmentOrders.id).notNull(),
  // 商品ID / 商品ID
  productId: uuid('product_id').references(() => products.id).notNull(),

  // 数量情報 / 数量信息
  requestedQuantity: integer('requested_quantity').notNull(),   // 要求数量 / 请求数量
  availableQuantity: integer('available_quantity').notNull(),   // 利用可能数量 / 可用数量
  shortageQuantity: integer('shortage_quantity').notNull(),     // 欠品数量 / 缺货数量

  // ステータス / 状态 (pending/reserved/fulfilled/cancelled)
  status: text('status').default('pending').notNull(),

  // タイムスタンプ / 时间戳
  reservedAt: timestamp('reserved_at'),
  fulfilledAt: timestamp('fulfilled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('shortage_records_tenant_idx').on(table.tenantId),
  index('shortage_records_shipment_order_idx').on(table.shipmentOrderId),
  index('shortage_records_product_idx').on(table.productId),
  index('shortage_records_status_idx').on(table.status),
]);
