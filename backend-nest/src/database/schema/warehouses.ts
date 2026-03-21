// 倉庫マスタ / 仓库主数据
import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// 倉庫 / 仓库
export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  name2: text('name2'),
  postalCode: text('postal_code'),
  prefecture: text('prefecture'),
  city: text('city'),
  address: text('address'),
  address2: text('address2'),
  phone: text('phone'),
  coolTypes: jsonb('cool_types').default([]),   // 対応温度帯 / 支持的温度类型 e.g. ["ambient","chilled","frozen"]
  capacity: integer('capacity'),                // 収容可能数量 / 容纳数量
  operatingHours: text('operating_hours'),      // 営業時間 / 营业时间
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0),
  memo: text('memo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('warehouses_tenant_code_idx').on(table.tenantId, table.code),
  index('warehouses_tenant_active_idx').on(table.tenantId, table.isActive),
]);
