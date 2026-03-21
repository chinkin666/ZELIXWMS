// 配送業者スキーマ / 配送业者Schema
import { pgTable, uuid, text, boolean, timestamp, jsonb, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ============================================
// 1. 配送業者マスタ / 配送业者主数据
// ============================================

export const carriers = pgTable('carriers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),

  // 基本情報 / 基本信息
  code: text('code').notNull(),           // 業者コード（システム内部識別子）/ 业者代码（系统内部标识）
  name: text('name').notNull(),           // 業者名（表示名称）/ 业者名（显示名称）
  description: text('description'),       // 説明 / 说明

  // 有効フラグ / 有效标志
  enabled: boolean('enabled').default(true).notNull(),

  // 実績ファイル設定 / 实绩文件设置
  trackingIdColumnName: text('tracking_id_column_name'),  // 回執ファイル内の伝票番号列名 / 回执文件中的单号列名

  // 格式定義（列配置リスト）/ 格式定义（列配置列表）
  // { columns: [{ name, description, type, maxWidth, required, userUploadable }] }
  formatDefinition: jsonb('format_definition').notNull().default({ columns: [] }),

  // 送り状種類ごとの印刷テンプレート設定 / 各送状类型的打印模板设置
  // [{ invoiceType, printTemplateId }]
  services: jsonb('services'),

  // 自動化タイプ / 自动化类型
  automationType: text('automation_type'),  // 'yamato-b2' | 'sagawa-api' | 'seino-api' | null

  // 内置フラグ（削除・編集不可）/ 内置标志（不可删除编辑）
  isBuiltIn: boolean('is_built_in').default(false).notNull(),

  // 表示順序 / 显示顺序
  sortOrder: integer('sort_order').default(0).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('carriers_code_idx').on(table.code),
  index('carriers_tenant_idx').on(table.tenantId),
  index('carriers_enabled_idx').on(table.enabled),
]);

// ============================================
// 2. 配送業者自動化設定 / 配送业者自动化配置
// ============================================

export const carrierAutomationConfigs = pgTable('carrier_automation_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 自動化タイプ / 自动化类型
  carrierType: text('carrier_type').notNull(),  // 'yamato-b2' | 'sagawa-api' | 'seino-api'
  // 有効フラグ / 有效标志
  enabled: boolean('enabled').default(false).notNull(),

  // 設定内容（キャリア固有: yamatoB2, autoValidation 等）/ 配置内容（运营商特有配置）
  // yamatoB2: { apiEndpoint, apiKey, customerCode, customerPassword, serviceTypeMapping, ... }
  // autoValidation: { enabled, intervalMinutes, maxRetries }
  config: jsonb('config').notNull().default({}),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('carrier_automation_tenant_type_idx').on(table.tenantId, table.carrierType),
]);

// ============================================
// 3. 配送業者セッションキャッシュ / 配送业者Session缓存
// ============================================

export const carrierSessionCaches = pgTable('carrier_session_caches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // キャリアタイプ / 运营商类型
  carrierType: text('carrier_type').notNull(),  // 'yamato-b2' | 'sagawa-api' etc.
  // セッショントークン / Session令牌
  sessionToken: text('session_token').notNull(),
  // 有効期限 / 有效期限
  expiresAt: timestamp('expires_at').notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('carrier_session_tenant_type_idx').on(table.tenantId, table.carrierType),
]);
