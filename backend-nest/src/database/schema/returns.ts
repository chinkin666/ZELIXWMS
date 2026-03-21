// 返品オーダー / 退货订单
import { pgTable, uuid, text, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';

/**
 * 返品オーダー / 退货订单
 * status: draft/inspecting/completed/cancelled
 * returnReason: customer_request/defective/wrong_item/damaged/other
 */
export const returnOrders = pgTable('return_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 注文番号 / 订单号
  orderNumber: text('order_number').notNull(),
  // ステータス / 状态
  status: text('status').notNull().default('draft'),

  // 返品理由 / 退货原因
  returnReason: text('return_reason').notNull(),
  // RMA番号（返品承認番号）/ RMA号（退货授权号）
  rmaNumber: text('rma_number'),
  // 返品配送伝票番号 / 退货物流单号
  returnTrackingId: text('return_tracking_id'),

  // 元出荷オーダー / 原出货订单
  shipmentOrderId: uuid('shipment_order_id'),

  // 顧客 / 客户
  clientId: uuid('client_id'),

  // 備考 / 备注
  notes: text('notes'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  uniqueIndex('return_orders_tenant_number_idx').on(table.tenantId, table.orderNumber),
  index('return_orders_tenant_status_idx').on(table.tenantId, table.status),
  index('return_orders_tenant_client_idx').on(table.tenantId, table.clientId),
  index('return_orders_shipment_idx').on(table.shipmentOrderId),
]);

/**
 * 返品オーダー明細行 / 退货订单明细行
 * disposition: restock/dispose/repair/pending
 */
export const returnOrderLines = pgTable('return_order_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 親オーダー / 父订单
  returnOrderId: uuid('return_order_id').references(() => returnOrders.id, { onDelete: 'cascade' }).notNull(),

  // 商品 / 商品
  productId: uuid('product_id').references(() => products.id),
  productSku: text('product_sku').notNull(),

  // 数量 / 数量
  quantity: integer('quantity').notNull().default(0),
  inspectedQuantity: integer('inspected_quantity').notNull().default(0),

  // 処分区分 / 处置方式（restock/dispose/repair/pending）
  disposition: text('disposition').notNull().default('pending'),

  // 再入庫・廃棄数量 / 重新入库・废弃数量
  restockedQuantity: integer('restocked_quantity').notNull().default(0),
  disposedQuantity: integer('disposed_quantity').notNull().default(0),

  // ロケーション・ロット / 库位・批次
  locationId: uuid('location_id'),
  lotId: uuid('lot_id'),

  // 検品メモ / 检验备注
  inspectionNotes: text('inspection_notes'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('return_lines_order_idx').on(table.returnOrderId),
  index('return_lines_tenant_product_idx').on(table.tenantId, table.productId),
]);
