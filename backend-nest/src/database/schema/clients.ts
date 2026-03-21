// 顧客関連テーブル / 客户相关表
import { pgTable, uuid, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// 荷主（クライアント）/ 货主（客户）
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  name2: text('name2'),
  contactName: text('contact_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  postalCode: text('postal_code'),
  prefecture: text('prefecture'),
  city: text('city'),
  address: text('address'),
  address2: text('address2'),
  phone: text('phone'),
  billingCycle: text('billing_cycle'),          // 請求サイクル / 账单周期
  creditTier: text('credit_tier'),              // 信用ランク / 信用等级
  isActive: boolean('is_active').default(true).notNull(),
  memo: text('memo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  uniqueIndex('clients_tenant_code_idx').on(table.tenantId, table.code),
  index('clients_tenant_active_idx').on(table.tenantId, table.isActive),
]);

// サブクライアント / 子客户
export const subClients = pgTable('sub_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('sub_clients_tenant_code_idx').on(table.tenantId, table.code),
  index('sub_clients_client_idx').on(table.clientId),
]);

// ショップ / 店铺
export const shops = pgTable('shops', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  subClientId: uuid('sub_client_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  platform: text('platform'),                  // プラットフォーム / 平台 (shopify/rakuten/amazon/etc)
  platformShopId: text('platform_shop_id'),    // プラットフォーム店舗ID / 平台店铺ID
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('shops_tenant_code_idx').on(table.tenantId, table.code),
  index('shops_client_idx').on(table.clientId),
]);

// 届け先（カスタマー）/ 收件人（顾客）
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  clientId: uuid('client_id'),
  code: text('code').notNull(),
  name: text('name').notNull(),
  postalCode: text('postal_code'),
  prefecture: text('prefecture'),
  city: text('city'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('customers_tenant_code_idx').on(table.tenantId, table.code),
  index('customers_client_idx').on(table.clientId),
]);

// 仕入先 / 供应商
export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  address: text('address'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('suppliers_tenant_code_idx').on(table.tenantId, table.code),
]);
