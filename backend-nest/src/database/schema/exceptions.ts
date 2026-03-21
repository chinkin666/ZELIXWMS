// 異常報告テーブル / 异常报告表
import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const exceptionReports = pgTable('exception_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),

  // 報告番号 / 报告编号
  reportNumber: text('report_number').notNull(),

  // 関連 / 关联
  referenceType: text('reference_type').notNull(),  // inbound_order/fba_plan/return_order/task/other
  referenceId: uuid('reference_id'),
  clientId: uuid('client_id'),
  clientName: text('client_name'),

  // 異常情報 / 异常信息
  level: text('level').notNull(),                     // A/B/C
  category: text('category').notNull(),               // quantity_variance/label_error/appearance_defect/packaging_issue/mixed_shipment/documentation_error/other
  boxNumber: text('box_number'),
  sku: text('sku'),
  affectedQuantity: integer('affected_quantity'),
  description: text('description').notNull(),
  photos: jsonb('photos').default([]),                // 写真URL配列 / 照片URL数组
  suggestedAction: text('suggested_action'),

  // 処理フロー / 处理流程
  status: text('status').default('open').notNull(),   // open/notified/acknowledged/resolved/closed
  reportedBy: text('reported_by').notNull(),
  reportedAt: timestamp('reported_at').defaultNow().notNull(),
  notifiedAt: timestamp('notified_at'),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  resolution: text('resolution'),

  // SLA
  slaDeadline: timestamp('sla_deadline').notNull(),
  slaBreached: boolean('sla_breached').default(false).notNull(),

  // タイムスタンプ / 时间戳
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('exception_reports_tenant_number_idx').on(table.tenantId, table.reportNumber),
  index('exception_reports_tenant_status_idx').on(table.tenantId, table.status, table.level),
  index('exception_reports_tenant_client_idx').on(table.tenantId, table.clientId),
  index('exception_reports_sla_idx').on(table.tenantId, table.slaDeadline, table.status),
]);
