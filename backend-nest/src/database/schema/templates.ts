// テンプレート（印刷・メール・フォーム・マッピング）/ 模板（打印・邮件・表单・映射）
import { pgTable, uuid, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ===== 印刷テンプレート / 打印模板 =====

export const printTemplates = pgTable('print_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),
  type: text('type').notNull(),                // label/invoice/pickingList/packingList 等

  // キャンバス設定 / 画布设置
  canvas: jsonb('canvas'),                      // { width, height, unit } 等
  elements: jsonb('elements').default([]),      // テンプレート要素配列 / 模板元素数组

  // 用紙設定 / 纸张设置
  paperSize: text('paper_size'),                // A4/A5/B5/custom 等
  orientation: text('orientation'),             // portrait/landscape

  // 参照画像 / 参考图像
  referenceImageData: text('reference_image_data'),  // Base64 encoded

  // デフォルト / 默认
  isDefault: boolean('is_default').default(false).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('print_templates_tenant_idx').on(table.tenantId),
  index('print_templates_tenant_type_idx').on(table.tenantId, table.type),
]);

// ===== メールテンプレート / 邮件模板 =====

export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),

  // 送信者情報 / 发件人信息
  senderName: text('sender_name'),
  senderEmail: text('sender_email'),

  // テンプレート内容 / 模板内容
  subject: text('subject').notNull(),
  bodyTemplate: text('body_template').notNull(),
  footerText: text('footer_text'),

  // 関連設定 / 关联设置
  carrierId: uuid('carrier_id'),               // 配送会社紐付け / 关联物流公司

  // ステータス / 状态
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('email_templates_tenant_idx').on(table.tenantId),
]);

// ===== フォームテンプレート / 表单模板 =====

export const formTemplates = pgTable('form_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),
  targetType: text('target_type').notNull(),    // inbound/outbound/product 等

  // レイアウト設定 / 布局设置
  columns: jsonb('columns').default([]),        // カラム定義配列 / 列定义数组
  styles: jsonb('styles').default({}),          // スタイル設定 / 样式设置

  // デフォルト / 默认
  isDefault: boolean('is_default').default(false).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('form_templates_tenant_idx').on(table.tenantId),
  index('form_templates_tenant_target_idx').on(table.tenantId, table.targetType),
]);

// ===== マッピング設定 / 映射配置 =====

export const mappingConfigs = pgTable('mapping_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  configType: text('config_type').notNull(),    // csv_import/api_mapping/field_mapping 等
  name: text('name').notNull(),
  description: text('description'),

  // マッピング内容 / 映射内容
  mappings: jsonb('mappings').default([]).notNull(),  // フィールドマッピング配列 / 字段映射数组
  orderSourceCompanyName: text('order_source_company_name'),

  // デフォルト / 默认
  isDefault: boolean('is_default').default(false).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('mapping_configs_tenant_idx').on(table.tenantId),
  index('mapping_configs_tenant_type_idx').on(table.tenantId, table.configType),
]);
