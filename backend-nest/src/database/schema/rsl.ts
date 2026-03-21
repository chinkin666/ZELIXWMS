// 楽天RSL関連テーブル / 乐天RSL相关表
import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ============================================
// 1. RSL出荷プラン / RSL发货计划
// ============================================

export const rslShipmentPlans = pgTable('rsl_shipment_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  planName: text('plan_name').notNull(),                    // プラン名 / 计划名称
  status: text('status').default('draft').notNull(),        // draft/confirmed/shipped/completed/cancelled
  rslOrderId: text('rsl_order_id'),                         // RSL注文ID / RSL订单ID

  // アイテム情報 / 商品信息
  items: jsonb('items'),                                    // [{ sku, quantity, ... }]

  // 備考 / 备注
  notes: text('notes'),

  // ステータス日時 / 状态时间
  confirmedAt: timestamp('confirmed_at'),                   // 確認日時 / 确认时间
  shippedAt: timestamp('shipped_at'),                       // 出荷日時 / 发货时间
  completedAt: timestamp('completed_at'),                   // 完了日時 / 完成时间

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('rsl_shipment_plans_tenant_idx').on(table.tenantId),
  index('rsl_shipment_plans_status_idx').on(table.tenantId, table.status),
  index('rsl_shipment_plans_order_idx').on(table.rslOrderId),
]);

// ============================================
// 2. RSLアイテム / RSL商品明细
// ============================================

export const rslItems = pgTable('rsl_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 出荷プラン参照 / 发货计划引用
  shipmentPlanId: uuid('shipment_plan_id').references(() => rslShipmentPlans.id).notNull(),

  // 商品情報 / 商品信息
  productId: uuid('product_id'),                            // 商品ID / 商品ID
  sku: text('sku').notNull(),                               // SKU
  quantity: integer('quantity').notNull(),                   // 数量 / 数量
  processedQuantity: integer('processed_quantity').default(0).notNull(), // 処理済数量 / 已处理数量

  // ステータス / 状态
  status: text('status').default('pending').notNull(),      // pending/processing/completed

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('rsl_items_tenant_idx').on(table.tenantId),
  index('rsl_items_plan_idx').on(table.shipmentPlanId),
  index('rsl_items_status_idx').on(table.tenantId, table.status),
]);
