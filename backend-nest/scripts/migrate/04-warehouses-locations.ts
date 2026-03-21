/**
 * 04: 倉庫・ロケーション移行 / 仓库・库位迁移
 *
 * MongoDB: warehouses, locations コレクション
 * PostgreSQL: warehouses, locations テーブル
 *
 * 倉庫を先に移行し、次にロケーションを移行する（FK依存）。
 * 先迁移仓库，再迁移库位（外键依赖）。
 */

import { Db } from 'mongodb';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { warehouses } from '../../src/database/schema/warehouses';
import { locations } from '../../src/database/schema/inventory';
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
 * 倉庫を移行する / 迁移仓库
 */
export async function migrateWarehouses(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('04a - Warehouses / 倉庫 / 仓库');

  const mongoWarehouses = await mongoDb.collection('warehouses').find({}).toArray();
  console.log(`  Found ${mongoWarehouses.length} warehouses in MongoDB`);

  const result = await processBatch(mongoWarehouses, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((wh) => ({
      id: objectIdToUuid(wh._id.toString()),
      tenantId: objectIdToUuid((wh.tenantId || wh.tenant_id || wh._id).toString()),
      code: wh.code || wh.name?.toUpperCase().replace(/\s+/g, '-') || `WH-${wh._id}`,
      name: wh.name || 'Unknown Warehouse',
      name2: wh.name2 || null,
      postalCode: wh.postalCode || wh.postal_code || null,
      prefecture: wh.prefecture || null,
      city: wh.city || null,
      address: wh.address || null,
      address2: wh.address2 || null,
      phone: wh.phone || null,
      coolTypes: wh.coolTypes || [],
      capacity: wh.capacity || null,
      operatingHours: wh.operatingHours || null,
      isActive: wh.isActive ?? true,
      sortOrder: wh.sortOrder ?? 0,
      memo: wh.memo || null,
      createdAt: toTimestamp(wh.createdAt) || new Date(),
      updatedAt: toTimestamp(wh.updatedAt) || new Date(),
    }));

    await pgDb.insert(warehouses).values(values).onConflictDoNothing();
  });

  logComplete('Warehouses', result);
  return result;
}

/**
 * ロケーションを移行する / 迁移库位
 */
export async function migrateLocations(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('04b - Locations / ロケーション / 库位');

  const mongoLocations = await mongoDb.collection('locations').find({}).toArray();
  console.log(`  Found ${mongoLocations.length} locations in MongoDB`);

  const result = await processBatch(mongoLocations, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((loc) => ({
      id: objectIdToUuid(loc._id.toString()),
      tenantId: objectIdToUuid((loc.tenantId || loc.tenant_id || loc._id).toString()),
      warehouseId: objectIdToUuidOrNull(loc.warehouseId || loc.warehouse_id),
      parentId: objectIdToUuidOrNull(loc.parentId || loc.parent_id),
      code: loc.code || loc.name || `LOC-${loc._id}`,
      name: loc.name || loc.code || 'Unknown Location',
      type: loc.type || 'bin',
      fullPath: loc.fullPath || loc.full_path || '',
      coolType: loc.coolType || null,
      stockType: loc.stockType || null,
      temperatureType: loc.temperatureType || null,
      isActive: loc.isActive ?? true,
      sortOrder: loc.sortOrder ?? 0,
      memo: loc.memo || null,
      createdAt: toTimestamp(loc.createdAt) || new Date(),
      updatedAt: toTimestamp(loc.updatedAt) || new Date(),
    }));

    await pgDb.insert(locations).values(values).onConflictDoNothing();
  });

  logComplete('Locations', result);
  return result;
}

/**
 * 倉庫・ロケーションを一括移行 / 一次性迁移仓库和库位
 */
export async function migrateWarehousesAndLocations(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<void> {
  await migrateWarehouses(mongoDb, pgDb);
  await migrateLocations(mongoDb, pgDb);
}

if (require.main === module) {
  console.log('Run via run-all.ts or initialize connections manually.');
}
