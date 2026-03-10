import mongoose from 'mongoose';
import type { AnyBulkWriteOperation } from 'mongoose';
import { Product, type IProduct } from '@/models/product';
import { logger } from '@/lib/logger';
import { loadSeedJsonArray } from './utils';

type ProductSeedDoc = Omit<Partial<IProduct>, '_id'> & { _id: mongoose.Types.ObjectId; sku: string };

function stripMongoInternals<T extends Record<string, any>>(doc: T): Omit<T, '__v'> {
  const { __v, ...rest } = doc;
  return rest;
}

export async function seedProductsFromJson(): Promise<void> {
  logger.info('Seeding products from seed_test JSON...');

  const docs = await loadSeedJsonArray<ProductSeedDoc>('nexand-shipment.products.json');
  if (docs.length === 0) {
    logger.info('No products to seed (empty file).');
    return;
  }

  // `products.sku` is unique. If the DB already has a product with the same sku but a different _id,
  // we must delete the existing one so the exported _id can be used (to keep cross-collection IDs stable).
  const desiredIdBySku = new Map<string, string>();
  const skus: string[] = [];
  for (const d of docs) {
    const sku = String((d as any).sku ?? '').trim();
    if (!sku) continue;
    skus.push(sku);
    desiredIdBySku.set(sku, d._id.toString());
  }

  const existing = await Product.find({ sku: { $in: skus } }).select('_id sku').lean();

  const deleteIds: mongoose.Types.ObjectId[] = [];
  for (const e of existing) {
    const desired = desiredIdBySku.get(String((e as any).sku));
    if (desired && e._id.toString() !== desired) {
      deleteIds.push(e._id);
    }
  }

  if (deleteIds.length > 0) {
    await Product.deleteMany({ _id: { $in: deleteIds } });
    logger.warn(
      { count: deleteIds.length },
      'Deleted existing product docs with conflicting unique sku so exported _id can be used',
    );
  }

  const ops = docs.map((d) => {
    const replacement = stripMongoInternals(d as any);
    return {
      replaceOne: {
        filter: { _id: d._id },
        replacement: replacement as any,
        upsert: true,
      },
    };
  }) as AnyBulkWriteOperation<any>[];

  const res = await Product.bulkWrite(ops, { ordered: false });
  logger.info(
    {
      matched: res.matchedCount,
      upserted: res.upsertedCount,
      modified: res.modifiedCount,
    },
    'Product seeding completed',
  );
}


