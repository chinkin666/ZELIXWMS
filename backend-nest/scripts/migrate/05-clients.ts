/**
 * 05: 顧客関連移行 / 客户相关迁移
 *
 * MongoDB: clients, subClients, shops, customers, suppliers コレクション
 * PostgreSQL: clients, sub_clients, shops, customers, suppliers テーブル
 *
 * 依存順序: clients → sub_clients → shops → customers, suppliers
 * 依赖顺序: clients → sub_clients → shops → customers, suppliers
 */

import { Db } from 'mongodb';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { clients, subClients, shops, customers, suppliers } from '../../src/database/schema/clients';
import {
  objectIdToUuid,
  objectIdToUuidOrNull,
  toTimestamp,
  processBatch,
  logStart,
  logComplete,
  DEFAULT_BATCH_SIZE,
  BatchResult,
} from './utils';

/**
 * 荷主（クライアント）を移行 / 迁移货主（客户）
 */
export async function migrateClients(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('05a - Clients / 荷主 / 货主');

  const mongoDocs = await mongoDb.collection('clients').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} clients in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      code: doc.code || doc.clientCode || `CLI-${doc._id}`,
      name: doc.name || doc.clientName || 'Unknown Client',
      name2: doc.name2 || null,
      contactName: doc.contactName || null,
      contactEmail: doc.contactEmail || null,
      contactPhone: doc.contactPhone || null,
      postalCode: doc.postalCode || null,
      prefecture: doc.prefecture || null,
      city: doc.city || null,
      address: doc.address || null,
      address2: doc.address2 || null,
      phone: doc.phone || null,
      billingCycle: doc.billingCycle || null,
      creditTier: doc.creditTier || null,
      isActive: doc.isActive ?? true,
      memo: doc.memo || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
      deletedAt: toTimestamp(doc.deletedAt),
    }));

    await pgDb.insert(clients).values(values).onConflictDoNothing();
  });

  logComplete('Clients', result);
  return result;
}

/**
 * サブクライアントを移行 / 迁移子客户
 */
export async function migrateSubClients(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('05b - SubClients / サブクライアント / 子客户');

  const mongoDocs = await mongoDb.collection('subClients').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} subClients in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      clientId: objectIdToUuid((doc.clientId || doc.client_id).toString()),
      code: doc.code || `SUB-${doc._id}`,
      name: doc.name || 'Unknown SubClient',
      isActive: doc.isActive ?? true,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(subClients).values(values).onConflictDoNothing();
  });

  logComplete('SubClients', result);
  return result;
}

/**
 * ショップを移行 / 迁移店铺
 */
export async function migrateShops(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('05c - Shops / ショップ / 店铺');

  const mongoDocs = await mongoDb.collection('shops').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} shops in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      clientId: objectIdToUuid((doc.clientId || doc.client_id).toString()),
      subClientId: objectIdToUuidOrNull(doc.subClientId || doc.sub_client_id),
      code: doc.code || `SHOP-${doc._id}`,
      name: doc.name || 'Unknown Shop',
      platform: doc.platform || null,
      platformShopId: doc.platformShopId || null,
      isActive: doc.isActive ?? true,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(shops).values(values).onConflictDoNothing();
  });

  logComplete('Shops', result);
  return result;
}

/**
 * 届け先（カスタマー）を移行 / 迁移收件人（顾客）
 */
export async function migrateCustomers(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('05d - Customers / カスタマー / 顾客');

  const mongoDocs = await mongoDb.collection('customers').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} customers in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      clientId: objectIdToUuidOrNull(doc.clientId || doc.client_id),
      code: doc.code || `CUST-${doc._id}`,
      name: doc.name || 'Unknown Customer',
      postalCode: doc.postalCode || null,
      prefecture: doc.prefecture || null,
      city: doc.city || null,
      address: doc.address || null,
      phone: doc.phone || null,
      email: doc.email || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(customers).values(values).onConflictDoNothing();
  });

  logComplete('Customers', result);
  return result;
}

/**
 * 仕入先を移行 / 迁移供应商
 */
export async function migrateSuppliers(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('05e - Suppliers / 仕入先 / 供应商');

  const mongoDocs = await mongoDb.collection('suppliers').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} suppliers in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      code: doc.code || `SUP-${doc._id}`,
      name: doc.name || 'Unknown Supplier',
      contactName: doc.contactName || null,
      contactPhone: doc.contactPhone || null,
      contactEmail: doc.contactEmail || null,
      address: doc.address || null,
      isActive: doc.isActive ?? true,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(suppliers).values(values).onConflictDoNothing();
  });

  logComplete('Suppliers', result);
  return result;
}

/**
 * 顧客関連を一括移行 / 一次性迁移客户相关数据
 */
export async function migrateAllClients(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<void> {
  await migrateClients(mongoDb, pgDb);
  await migrateSubClients(mongoDb, pgDb);
  await migrateShops(mongoDb, pgDb);
  await migrateCustomers(mongoDb, pgDb);
  await migrateSuppliers(mongoDb, pgDb);
}

if (require.main === module) {
  console.log('Run via run-all.ts or initialize connections manually.');
}
