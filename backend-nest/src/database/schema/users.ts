// ユーザー（Supabase Auth連携）/ 用户（Supabase Auth关联）
import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),  // Supabase Auth の user.id と同一 / 与Supabase Auth的user.id一致
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').default('viewer').notNull(),  // admin/manager/operator/viewer
  warehouseIds: jsonb('warehouse_ids').default([]),  // UUID[] — アクセス可能倉庫 / 可访问仓库
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
