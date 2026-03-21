// 入庫オーダー / 入库订单
import { pgTable, uuid, text, numeric, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
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

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('inbound_lines_order_idx').on(table.inboundOrderId),
  index('inbound_lines_tenant_product_idx').on(table.tenantId, table.productId),
]);
