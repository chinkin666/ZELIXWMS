/**
 * 07: 在庫関連移行 / 库存相关迁移
 *
 * MongoDB: stockQuants, stockMoves, lots, inventoryLedger コレクション
 * PostgreSQL: stock_quants, stock_moves, lots, inventory_ledger テーブル
 *
 * 依存: tenants, products, locations が先に移行済みであること。
 * 依赖: tenants, products, locations 必须先完成迁移。
 */

import { Db } from 'mongodb';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { stockQuants, stockMoves, lots, inventoryLedger } from '../../src/database/schema/inventory';
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

// ============================================
// ロット / 批次
// ============================================

/**
 * ロットを移行 / 迁移批次
 * ロットは stockQuants / stockMoves から参照されるため先に移行する。
 * 批次被 stockQuants / stockMoves 引用，需先迁移。
 */
export async function migrateLots(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('07a - Lots / ロット / 批次');

  const mongoDocs = await mongoDb.collection('lots').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} lots in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      productId: objectIdToUuid((doc.productId || doc.product_id).toString()),
      lotNumber: doc.lotNumber || doc.lot_number || `LOT-${doc._id}`,
      expiryDate: toTimestamp(doc.expiryDate || doc.expiry_date),
      manufacturingDate: toTimestamp(doc.manufacturingDate || doc.manufacturing_date),
      memo: doc.memo || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(lots).values(values).onConflictDoNothing();
  });

  logComplete('Lots', result);
  return result;
}

// ============================================
// 在庫数量 / 库存数量
// ============================================

/**
 * 在庫数量を移行 / 迁移库存数量
 */
export async function migrateStockQuants(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('07b - Stock Quants / 在庫数量 / 库存数量');

  const mongoDocs = await mongoDb.collection('stockQuants').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} stock quants in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      productId: objectIdToUuid((doc.productId || doc.product_id).toString()),
      locationId: objectIdToUuid((doc.locationId || doc.location_id).toString()),
      lotId: objectIdToUuidOrNull(doc.lotId || doc.lot_id),
      quantity: doc.quantity ?? 0,
      reservedQuantity: doc.reservedQuantity ?? doc.reserved_quantity ?? 0,
      lastMovedAt: toTimestamp(doc.lastMovedAt || doc.last_moved_at),
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(stockQuants).values(values).onConflictDoNothing();
  });

  logComplete('Stock Quants', result);
  return result;
}

// ============================================
// 在庫移動 / 库存移动
// ============================================

/**
 * 在庫移動を移行 / 迁移库存移动
 */
export async function migrateStockMoves(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('07c - Stock Moves / 在庫移動 / 库存移动');

  const mongoDocs = await mongoDb.collection('stockMoves').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} stock moves in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      moveNumber: doc.moveNumber || doc.move_number || `MOV-${doc._id}`,
      moveType: doc.moveType || doc.move_type || 'adjustment',
      status: doc.status || 'done',
      productId: objectIdToUuid((doc.productId || doc.product_id).toString()),
      productSku: doc.productSku || doc.product_sku || null,
      fromLocationId: objectIdToUuidOrNull(doc.fromLocationId || doc.from_location_id),
      toLocationId: objectIdToUuidOrNull(doc.toLocationId || doc.to_location_id),
      lotId: objectIdToUuidOrNull(doc.lotId || doc.lot_id),
      quantity: doc.quantity ?? 0,
      referenceType: doc.referenceType || doc.reference_type || null,
      referenceId: objectIdToUuidOrNull(doc.referenceId || doc.reference_id),
      referenceNumber: doc.referenceNumber || doc.reference_number || null,
      reason: doc.reason || null,
      executedBy: doc.executedBy || doc.executed_by || null,
      executedAt: toTimestamp(doc.executedAt || doc.executed_at),
      createdAt: toTimestamp(doc.createdAt) || new Date(),
      updatedAt: toTimestamp(doc.updatedAt) || new Date(),
    }));

    await pgDb.insert(stockMoves).values(values).onConflictDoNothing();
  });

  logComplete('Stock Moves', result);
  return result;
}

// ============================================
// 在庫台帳 / 库存台账
// ============================================

/**
 * 在庫台帳を移行 / 迁移库存台账
 */
export async function migrateInventoryLedger(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('07d - Inventory Ledger / 在庫台帳 / 库存台账');

  const mongoDocs = await mongoDb.collection('inventoryLedger').find({}).toArray();
  console.log(`  Found ${mongoDocs.length} ledger entries in MongoDB`);

  const result = await processBatch(mongoDocs, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((doc) => ({
      id: objectIdToUuid(doc._id.toString()),
      tenantId: objectIdToUuid((doc.tenantId || doc.tenant_id || doc._id).toString()),
      productId: objectIdToUuid((doc.productId || doc.product_id).toString()),
      productSku: doc.productSku || doc.product_sku || null,
      locationId: objectIdToUuidOrNull(doc.locationId || doc.location_id),
      lotId: objectIdToUuidOrNull(doc.lotId || doc.lot_id),
      type: doc.type || 'adjustment',
      quantity: doc.quantity ?? 0,
      referenceType: doc.referenceType || doc.reference_type || null,
      referenceId: doc.referenceId?.toString() || doc.reference_id?.toString() || null,
      referenceNumber: doc.referenceNumber || doc.reference_number || null,
      reason: doc.reason || null,
      executedBy: doc.executedBy || doc.executed_by || null,
      executedAt: toTimestamp(doc.executedAt || doc.executed_at),
      memo: doc.memo || null,
      createdAt: toTimestamp(doc.createdAt) || new Date(),
    }));

    await pgDb.insert(inventoryLedger).values(values).onConflictDoNothing();
  });

  logComplete('Inventory Ledger', result);
  return result;
}

/**
 * 在庫関連を一括移行 / 一次性迁移库存相关数据
 */
export async function migrateAllInventory(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<void> {
  await migrateLots(mongoDb, pgDb);
  await migrateStockQuants(mongoDb, pgDb);
  await migrateStockMoves(mongoDb, pgDb);
  await migrateInventoryLedger(mongoDb, pgDb);
}

if (require.main === module) {
  console.log('Run via run-all.ts or initialize connections manually.');
}
