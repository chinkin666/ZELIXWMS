// Amazon FBA関連テーブル / Amazon FBA相关表
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ============================================
// 1. FBA出荷プラン / FBA发货计划
// ============================================

export const fbaShipmentPlans = pgTable('fba_shipment_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  planName: text('plan_name').notNull(),                    // プラン名 / 计划名称
  status: text('status').default('draft').notNull(),        // draft/confirmed/shipped/completed/cancelled
  amazonShipmentId: text('amazon_shipment_id'),             // Amazon出荷ID / Amazon发货ID
  destinationFulfillmentCenter: text('destination_fulfillment_center'), // 送り先FC / 目标FC

  // 配送先住所 / 配送地址
  shipToAddress: jsonb('ship_to_address'),                  // { name, address1, address2, city, state, postalCode, country }

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
  index('fba_shipment_plans_tenant_idx').on(table.tenantId),
  index('fba_shipment_plans_status_idx').on(table.tenantId, table.status),
  index('fba_shipment_plans_amazon_id_idx').on(table.amazonShipmentId),
]);

// ============================================
// 2. FBAボックス / FBA箱
// ============================================

export const fbaBoxes = pgTable('fba_boxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 出荷プラン参照 / 发货计划引用
  shipmentPlanId: uuid('shipment_plan_id').references(() => fbaShipmentPlans.id).notNull(),

  // ボックス情報 / 箱信息
  boxNumber: text('box_number').notNull(),                  // ボックス番号 / 箱号
  weight: text('weight'),                                   // 重量 / 重量
  dimensions: jsonb('dimensions'),                          // { length, width, height, unit }

  // アイテム情報 / 商品信息
  items: jsonb('items'),                                    // [{ sku, quantity, ... }]

  // 追跡番号 / 追踪号
  trackingNumber: text('tracking_number'),

  // ステータス / 状态
  status: text('status').default('packing').notNull(),      // packing/sealed/shipped

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('fba_boxes_tenant_idx').on(table.tenantId),
  index('fba_boxes_plan_idx').on(table.shipmentPlanId),
  index('fba_boxes_status_idx').on(table.tenantId, table.status),
]);
