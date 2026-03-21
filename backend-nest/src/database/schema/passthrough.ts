// パススルー（直送）入荷注文テーブル / 直通（直送）入库订单表
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ============================================
// パススルー注文 / 直通订单
// ============================================

export const passthroughOrders = pgTable('passthrough_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  orderNumber: text('order_number').notNull(),              // 注文番号 / 订单号
  clientId: uuid('client_id'),                              // 顧客ID / 客户ID

  // ステータス / 状态
  status: text('status').default('draft').notNull(),        // draft/confirmed/receiving/completed/cancelled

  // アイテム情報 / 商品信息
  items: jsonb('items'),                                    // [{ sku, quantity, ... }]

  // 備考 / 备注
  notes: text('notes'),

  // ステータス日時 / 状态时间
  confirmedAt: timestamp('confirmed_at'),                   // 確認日時 / 确认时间
  receivedAt: timestamp('received_at'),                     // 受取日時 / 接收时间
  completedAt: timestamp('completed_at'),                   // 完了日時 / 完成时间
  cancelledAt: timestamp('cancelled_at'),                   // キャンセル日時 / 取消时间

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('passthrough_orders_tenant_idx').on(table.tenantId),
  index('passthrough_orders_status_idx').on(table.tenantId, table.status),
  index('passthrough_orders_client_idx').on(table.clientId),
  index('passthrough_orders_number_idx').on(table.tenantId, table.orderNumber),
]);
