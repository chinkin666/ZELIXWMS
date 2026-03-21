// システム設定・通知・操作ログ・日次レポート / 系统设置・通知・操作日志・日报
import { pgTable, uuid, text, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ===== システム設定 / 系统设置 =====

export const systemSettings = pgTable('system_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 設定内容 / 设置内容
  settingsKey: text('settings_key').notNull(),   // general/shipping/notification 等
  settings: jsonb('settings').default({}).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('system_settings_tenant_key_idx').on(table.tenantId, table.settingsKey),
]);

// ===== 通知 / 通知 =====

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id').notNull(),

  // 通知内容 / 通知内容
  title: text('title').notNull(),
  body: text('body'),
  type: text('type').notNull(),                  // info/warning/error/success

  // 関連リソース / 关联资源
  referenceType: text('reference_type'),          // order/inbound/product 等
  referenceId: uuid('reference_id'),

  // 既読状態 / 已读状态
  isRead: boolean('is_read').default(false).notNull(),
  readAt: timestamp('read_at'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('notifications_tenant_user_idx').on(table.tenantId, table.userId),
  index('notifications_tenant_user_unread_idx').on(table.tenantId, table.userId, table.isRead),
]);

// ===== 操作ログ / 操作日志 =====

export const operationLogs = pgTable('operation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  userId: uuid('user_id'),

  // 操作内容 / 操作内容
  action: text('action').notNull(),               // create/update/delete/login/export 等
  resourceType: text('resource_type').notNull(),   // product/order/user 等
  resourceId: text('resource_id'),
  module: text('module'),                          // products/orders/settings 等

  // 変更詳細 / 变更详情
  changes: jsonb('changes'),                       // { before, after } 差分 / 变更差异
  metadata: jsonb('metadata'),                     // 追加メタ情報 / 附加元信息

  // リクエスト情報 / 请求信息
  requestId: text('request_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('operation_logs_tenant_idx').on(table.tenantId),
  index('operation_logs_tenant_resource_idx').on(table.tenantId, table.resourceType, table.resourceId),
  index('operation_logs_tenant_action_idx').on(table.tenantId, table.action),
  index('operation_logs_created_idx').on(table.createdAt),
]);

// ===== 日次レポート / 日报 =====

export const dailyReports = pgTable('daily_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // レポート内容 / 报表内容
  date: timestamp('date').notNull(),               // 対象日 / 对象日期
  summary: jsonb('summary').default({}).notNull(),  // 集計データ / 汇总数据

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('daily_reports_tenant_date_idx').on(table.tenantId, table.date),
]);
