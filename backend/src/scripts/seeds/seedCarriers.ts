import mongoose from 'mongoose';
import type { AnyBulkWriteOperation } from 'mongoose';
import { Carrier, type ICarrier } from '@/models/carrier';
import { logger } from '@/lib/logger';
import { loadSeedJsonArray } from './utils';

type CarrierSeedDoc = Omit<Partial<ICarrier>, '_id'> & { _id: mongoose.Types.ObjectId };

function stripMongoInternals<T extends Record<string, any>>(doc: T): Omit<T, '__v'> {
  const { __v, ...rest } = doc;
  return rest;
}

export async function seedCarriersFromJson(): Promise<void> {
  logger.info('Seeding carriers from seed_test JSON...');

  const docs = await loadSeedJsonArray<CarrierSeedDoc>('nexand-shipment.carriers.json');
  if (docs.length === 0) {
    logger.info('No carriers to seed (empty file).');
    return;
  }

  const codes = docs.map((d) => String((d as any).code)).filter(Boolean);

  // Remove conflicting docs so we can insert with the exported _id (code is unique).
  const existing = await Carrier.find({
    code: { $in: codes },
  })
    .select('_id code')
    .lean();

  const desiredIdByCode = new Map<string, string>();
  for (const d of docs) {
    if ((d as any).code) desiredIdByCode.set(String((d as any).code), d._id.toString());
  }

  const deleteIds: mongoose.Types.ObjectId[] = [];
  for (const e of existing) {
    const desired = desiredIdByCode.get(String((e as any).code));
    if (desired && e._id.toString() !== desired) {
      deleteIds.push(e._id);
    }
  }

  if (deleteIds.length > 0) {
    await Carrier.deleteMany({ _id: { $in: deleteIds } });
    logger.warn(
      { count: deleteIds.length },
      'Deleted existing carrier docs with conflicting unique keys so exported _id can be used',
    );
  }

  const ops = docs.map((d) => {
    const replacement = stripMongoInternals(d as any);
    return {
      replaceOne: {
        filter: { _id: d._id },
        // NOTE: bulkWrite typing expects `WithoutId<ICarrier>` for replacement. Our JSON guarantees fields at runtime.
        replacement: replacement as any,
        upsert: true,
      },
    };
  }) as AnyBulkWriteOperation<any>[];

  const res = await Carrier.bulkWrite(ops, { ordered: false });
  logger.info(
    {
      matched: res.matchedCount,
      upserted: res.upsertedCount,
      modified: res.modifiedCount,
    },
    'Carrier seeding completed',
  );
}


