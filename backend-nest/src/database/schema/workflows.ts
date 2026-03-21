// ワークフロー自動化テーブル / 工作流自动化表
import { pgTable, uuid, text, boolean, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ============================================
// 1. ワークフロー / 工作流
// ============================================

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),                             // ワークフロー名 / 工作流名称
  description: text('description'),                         // 説明 / 说明

  // トリガー設定 / 触发器设置
  triggerType: text('trigger_type').notNull(),               // manual/event/schedule
  triggerConfig: jsonb('trigger_config'),                    // トリガー設定詳細 / 触发器配置详情

  // アクション設定 / 动作设置
  actions: jsonb('actions'),                                // [{ type, config, ... }]

  // 有効フラグ / 有效标志
  enabled: boolean('enabled').default(true).notNull(),

  // 最終実行日時 / 最后执行时间
  lastRunAt: timestamp('last_run_at'),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('workflows_tenant_idx').on(table.tenantId),
  index('workflows_enabled_idx').on(table.tenantId, table.enabled),
  index('workflows_trigger_type_idx').on(table.tenantId, table.triggerType),
]);

// ============================================
// 2. ワークフロー実行ログ / 工作流执行日志
// ============================================

export const workflowLogs = pgTable('workflow_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // ワークフロー参照 / 工作流引用
  workflowId: uuid('workflow_id').references(() => workflows.id).notNull(),

  // 実行情報 / 执行信息
  status: text('status').notNull(),                         // running/completed/failed
  triggerData: jsonb('trigger_data'),                       // トリガーデータ / 触发数据
  result: jsonb('result'),                                  // 実行結果 / 执行结果
  error: text('error'),                                     // エラーメッセージ / 错误消息

  // 実行日時 / 执行时间
  startedAt: timestamp('started_at'),                       // 開始日時 / 开始时间
  completedAt: timestamp('completed_at'),                   // 完了日時 / 完成时间

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('workflow_logs_tenant_idx').on(table.tenantId),
  index('workflow_logs_workflow_idx').on(table.workflowId),
  index('workflow_logs_status_idx').on(table.tenantId, table.status),
  index('workflow_logs_created_idx').on(table.createdAt),
]);

// ============================================
// 3. スロッティングルール / 上架规则
// ============================================

export const slottingRules = pgTable('slotting_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 基本情報 / 基本信息
  name: text('name').notNull(),                             // ルール名 / 规则名称
  description: text('description'),                         // 説明 / 说明

  // 優先度 / 优先级
  priority: integer('priority').default(0).notNull(),       // 優先度（大きいほど優先）/ 优先级（越大越优先）

  // 条件とアクション / 条件与动作
  conditions: jsonb('conditions'),                          // [{ field, operator, value, ... }]
  actions: jsonb('actions'),                                // [{ type, config, ... }]

  // 有効フラグ / 有效标志
  enabled: boolean('enabled').default(true).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('slotting_rules_tenant_idx').on(table.tenantId),
  index('slotting_rules_enabled_idx').on(table.tenantId, table.enabled),
  index('slotting_rules_priority_idx').on(table.tenantId, table.priority),
]);
