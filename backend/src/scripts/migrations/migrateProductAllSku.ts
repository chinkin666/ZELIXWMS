/**
 * 迁移脚本：为现有商品数据回填 _allSku 字段
 *
 * _allSku = [sku, ...subSkus.map(s => s.subSku)]
 * 用于 unique index 实现全局 SKU/子SKU 唯一性约束
 *
 * 运行: npx tsx src/scripts/migrations/migrateProductAllSku.ts
 */

import mongoose from 'mongoose';
import { loadEnv } from '@/config/env';
import { connectDatabase } from '@/config/database';
import { logger } from '@/lib/logger';

loadEnv();

async function migrateProductAllSku() {
  try {
    await connectDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection('products');

    // Find all products that don't have _allSku yet
    const totalCount = await collection.countDocuments({
      $or: [{ _allSku: { $exists: false } }, { _allSku: { $size: 0 } }],
    });

    logger.info({ totalCount }, 'Found products to migrate');

    if (totalCount === 0) {
      logger.info('No products to migrate, exiting');
      process.exit(0);
    }

    const batchSize = 100;
    let processed = 0;

    const cursor = collection.find({
      $or: [{ _allSku: { $exists: false } }, { _allSku: { $size: 0 } }],
    });

    const bulkOps: any[] = [];

    for await (const doc of cursor) {
      const allSku: string[] = [doc.sku];
      if (Array.isArray(doc.subSkus)) {
        for (const sub of doc.subSkus) {
          if (sub.subSku) allSku.push(sub.subSku);
        }
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { _allSku: allSku } },
        },
      });

      if (bulkOps.length >= batchSize) {
        await collection.bulkWrite(bulkOps);
        processed += bulkOps.length;
        logger.info({ processed, total: totalCount }, 'Migration progress');
        bulkOps.length = 0;
      }
    }

    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps);
      processed += bulkOps.length;
    }

    logger.info({ processed }, 'Migration completed successfully');

    // Drop old sparse index on subSkus.subSku if it exists
    try {
      const indexes = await collection.indexes();
      const oldIndex = indexes.find((idx: any) => idx.key?.['subSkus.subSku'] !== undefined);
      if (oldIndex?.name) {
        await collection.dropIndex(oldIndex.name);
        logger.info({ indexName: oldIndex.name }, 'Dropped old subSkus.subSku sparse index');
      }
    } catch (e) {
      logger.warn(e, 'Could not drop old index (may not exist)');
    }

    process.exit(0);
  } catch (error) {
    logger.error(error, 'Migration failed');
    process.exit(1);
  }
}

migrateProductAllSku();
