// 拡張機能（Webhook・ルール・フィーチャーフラグ・カスタムフィールド）/ 扩展功能（Webhook・规则・功能开关・自定义字段）
import { pgTable, uuid, text, boolean, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ===== Webhook 設定 / Webhook 配置 =====

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),
  url: text('url').notNull(),
  secret: text('secret'),
  events: jsonb('events').default([]).notNull(),  // string[] 対象イベント / 目标事件
  enabled: boolean('enabled').default(true).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('webhooks_tenant_idx').on(table.tenantId),
]);

// ===== Webhook ログ / Webhook 日志 =====

export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  webhookId: uuid('webhook_id').references(() => webhooks.id, { onDelete: 'cascade' }).notNull(),

  // 実行結果 / 执行结果
  event: text('event').notNull(),
  url: text('url').notNull(),
  httpStatus: integer('http_status'),
  responseTimeMs: integer('response_time_ms'),
  success: boolean('success').notNull(),
  error: text('error'),
  payload: jsonb('payload'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('webhook_logs_tenant_idx').on(table.tenantId),
  index('webhook_logs_webhook_idx').on(table.webhookId),
]);

// ===== 自動処理ルール / 自动处理规则 =====

export const autoProcessingRules = pgTable('auto_processing_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),
  enabled: boolean('enabled').default(true).notNull(),

  // トリガー設定 / 触发器设置
  triggerMode: text('trigger_mode').notNull(),          // manual/event/schedule
  triggerEvents: jsonb('trigger_events').default([]),    // string[]
  conditions: jsonb('conditions').default([]).notNull(), // 条件配列 / 条件数组
  actions: jsonb('actions').default([]).notNull(),       // アクション配列 / 操作数组

  // 実行制御 / 执行控制
  priority: integer('priority').default(0).notNull(),
  allowRerun: boolean('allow_rerun').default(false).notNull(),
  memo: text('memo'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('auto_rules_tenant_idx').on(table.tenantId),
  index('auto_rules_tenant_priority_idx').on(table.tenantId, table.priority),
]);

// ===== ルール定義（汎用ルールエンジン）/ 规则定义（通用规则引擎）=====

export const ruleDefinitions = pgTable('rule_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),
  description: text('description'),
  module: text('module').notNull(),        // inbound/outbound/inventory 等
  warehouseId: uuid('warehouse_id'),
  clientId: uuid('client_id'),

  // ルール内容 / 规则内容
  priority: integer('priority').default(0).notNull(),
  conditionGroups: jsonb('condition_groups').default([]).notNull(),
  actions: jsonb('actions').default([]).notNull(),
  stopOnMatch: boolean('stop_on_match').default(false).notNull(),

  // ステータス / 状态
  isActive: boolean('is_active').default(true).notNull(),
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),

  // 統計 / 统计
  executionCount: integer('execution_count').default(0).notNull(),
  lastExecutedAt: timestamp('last_executed_at'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('rule_defs_tenant_idx').on(table.tenantId),
  index('rule_defs_tenant_module_idx').on(table.tenantId, table.module),
  index('rule_defs_tenant_priority_idx').on(table.tenantId, table.priority),
]);

// ===== フィーチャーフラグ（グローバル）/ 功能开关（全局）=====

export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').primaryKey().defaultRandom(),

  // テナント紐付けなし（グローバル設定）/ 不关联租户（全局设置）
  name: text('name').notNull().unique(),
  description: text('description'),
  enabled: boolean('enabled').default(false).notNull(),
  config: jsonb('config').default({}),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ===== プラグイン / 插件 =====

export const plugins = pgTable('plugins', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),
  description: text('description'),
  version: text('version').notNull().default('1.0.0'),
  author: text('author'),

  // ステータス / 状态
  enabled: boolean('enabled').default(false).notNull(),
  config: jsonb('config').default({}),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('plugins_tenant_idx').on(table.tenantId),
  index('plugins_tenant_enabled_idx').on(table.tenantId, table.enabled),
]);

// ===== スクリプト / 脚本 =====

export const scripts = pgTable('scripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),
  description: text('description'),
  language: text('language').notNull().default('javascript'),  // javascript | python
  code: text('code').notNull().default(''),
  enabled: boolean('enabled').default(true).notNull(),

  // 実行制御 / 执行控制
  triggerEvent: text('trigger_event'),   // 実行トリガーイベント / 触发事件
  lastRunAt: timestamp('last_run_at'),
  lastRunStatus: text('last_run_status'), // success | error

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('scripts_tenant_idx').on(table.tenantId),
]);

// ===== カスタムフィールド定義 / 自定义字段定义 =====

export const customFieldDefinitions = pgTable('custom_field_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // フィールド定義 / 字段定义
  entityType: text('entity_type').notNull(),   // product/order/inbound 等
  fieldName: text('field_name').notNull(),
  fieldType: text('field_type').notNull(),     // text/number/date/select/boolean
  label: text('label').notNull(),
  labelJa: text('label_ja'),

  // オプション / 选项
  required: boolean('required').default(false).notNull(),
  options: jsonb('options'),                    // select 型の選択肢 / select类型的选项
  defaultValue: text('default_value'),
  sortOrder: integer('sort_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('custom_fields_tenant_idx').on(table.tenantId),
  index('custom_fields_tenant_entity_idx').on(table.tenantId, table.entityType),
]);
