// 倉庫作業関連テーブル / 仓库作业相关表
import { pgTable, uuid, text, integer, numeric, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { warehouses } from './warehouses';
import { products } from './products';
import { locations } from './inventory';

// ウェーブ / 波次
export const waves = pgTable('waves', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  waveNumber: text('wave_number').notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  status: text('status').default('pending'),    // pending/in_progress/completed/cancelled
  priority: integer('priority').default(0),
  shipmentIds: jsonb('shipment_ids').default([]),  // uuid[] 対象出荷ID / 关联出库ID
  assignedTo: uuid('assigned_to'),              // 担当者ID / 负责人ID
  assignedName: text('assigned_name'),          // 担当者名 / 负责人名
  totalOrders: integer('total_orders').default(0),
  totalItems: integer('total_items').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('waves_tenant_number_idx').on(table.tenantId, table.waveNumber),
  index('waves_warehouse_idx').on(table.warehouseId),
  index('waves_status_idx').on(table.tenantId, table.status),
]);

// 倉庫タスク / 仓库任务
export const warehouseTasks = pgTable('warehouse_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  taskNumber: text('task_number').notNull(),
  type: text('type').notNull(),                 // picking/packing/shipping/receiving/putaway/count
  status: text('status').default('pending'),    // pending/in_progress/completed/cancelled
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  orderId: uuid('order_id'),                    // 関連オーダーID / 关联订单ID
  waveId: uuid('wave_id').references(() => waves.id),
  assigneeId: uuid('assignee_id'),              // 作業者ID / 操作员ID
  assigneeName: text('assignee_name'),          // 作業者名 / 操作员名
  priority: integer('priority').default(0),
  items: jsonb('items').default([]),             // タスク明細 / 任务明细
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('warehouse_tasks_tenant_number_idx').on(table.tenantId, table.taskNumber),
  index('warehouse_tasks_warehouse_idx').on(table.warehouseId),
  index('warehouse_tasks_wave_idx').on(table.waveId),
  index('warehouse_tasks_status_idx').on(table.tenantId, table.status),
]);

// 棚卸指示 / 盘点单
export const stocktakingOrders = pgTable('stocktaking_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  orderNumber: text('order_number').notNull(),
  type: text('type').notNull(),                 // full/partial/cycle 全棚卸/一部/循環
  status: text('status').default('draft'),      // draft/in_progress/completed/cancelled
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  locationIds: jsonb('location_ids').default([]),  // 対象ロケーション / 目标库位
  productIds: jsonb('product_ids').default([]),    // 対象商品 / 目标商品
  scheduledDate: timestamp('scheduled_date'),      // 予定日 / 计划日期
  completedAt: timestamp('completed_at'),
  memo: text('memo'),
  items: jsonb('items').default([]),               // 棚卸明細 / 盘点明细
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  uniqueIndex('stocktaking_orders_tenant_number_idx').on(table.tenantId, table.orderNumber),
  index('stocktaking_orders_warehouse_idx').on(table.warehouseId),
  index('stocktaking_orders_status_idx').on(table.tenantId, table.status),
]);

// 資材 / 物料
export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  sku: text('sku').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  unitCost: numeric('unit_cost'),               // 単価 / 单价
  stockQuantity: integer('stock_quantity').default(0),  // 在庫数 / 库存数
  category: text('category'),                   // カテゴリ / 分类
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('materials_tenant_sku_idx').on(table.tenantId, table.sku),
  index('materials_tenant_category_idx').on(table.tenantId, table.category),
]);

// セット組み作業 / 组装作业
export const assemblyOrders = pgTable('assembly_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 組立番号 / 组装编号
  assemblyNumber: text('assembly_number').notNull(),
  // ステータス / 状态 (draft/in_progress/completed/cancelled)
  status: text('status').default('draft').notNull(),

  // セット商品ID / 套装商品ID
  setProductId: uuid('set_product_id'),
  // 構成品目 / 组成品目 [{productId, quantity}]
  items: jsonb('items').default([]),

  // 数量 / 数量
  assembledQuantity: integer('assembled_quantity').default(0).notNull(),  // 完成数 / 完成数
  targetQuantity: integer('target_quantity').notNull(),                    // 目標数 / 目标数

  // 担当者 / 负责人
  assignedTo: text('assigned_to'),
  // 備考 / 备注
  notes: text('notes'),

  // タイムスタンプ / 时间戳
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('assembly_orders_tenant_idx').on(table.tenantId),
  index('assembly_orders_status_idx').on(table.tenantId, table.status),
]);

// 棚卸差異 / 盘点差异
export const stocktakingDiscrepancies = pgTable('stocktaking_discrepancies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 棚卸指示ID / 盘点单ID
  stocktakingOrderId: uuid('stocktaking_order_id').references(() => stocktakingOrders.id).notNull(),
  // 商品ID / 商品ID
  productId: uuid('product_id').references(() => products.id).notNull(),
  // ロケーションID / 库位ID
  locationId: uuid('location_id').references(() => locations.id).notNull(),

  // 数量比較 / 数量比较
  systemQuantity: integer('system_quantity').notNull(),     // システム在庫 / 系统库存
  countedQuantity: integer('counted_quantity').notNull(),   // 実数 / 实际数量
  discrepancy: integer('discrepancy').notNull(),            // 差異（実数 - システム）/ 差异（实际 - 系统）

  // ステータス / 状态 (pending/approved/adjusted/rejected)
  status: text('status').default('pending').notNull(),

  // 調整情報 / 调整信息
  adjustedBy: uuid('adjusted_by'),                          // 調整者ID / 调整人ID
  adjustedAt: timestamp('adjusted_at'),                     // 調整日時 / 调整时间
  notes: text('notes'),                                     // 備考 / 备注

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('stocktaking_discrepancies_tenant_idx').on(table.tenantId),
  index('stocktaking_discrepancies_order_idx').on(table.stocktakingOrderId),
]);
