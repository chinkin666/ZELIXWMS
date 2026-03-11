import type mongoose from 'mongoose';
import type { AnyBulkWriteOperation } from 'mongoose';
import { MappingConfig, type IMappingConfig } from '@/models/mappingConfig';
import { logger } from '@/lib/logger';
import { loadSeedJsonArray } from './utils';

type MappingConfigSeedDoc = Omit<Partial<IMappingConfig>, '_id'> & { _id: mongoose.Types.ObjectId };

function stripMongoInternals<T extends Record<string, any>>(doc: T): Omit<T, '__v'> {
  const { __v, ...rest } = doc;
  return rest;
}

/**
 * Seed only the B2 mapping config from b2_mapping_config.json
 */
export async function seedB2MappingConfigFromJson(): Promise<void> {
  logger.info('Seeding B2 mapping config from seed_test JSON...');

  const docs = await loadSeedJsonArray<MappingConfigSeedDoc>(
    'nexand-shipment.b2_mapping_config.json',
  );
  if (docs.length === 0) {
    logger.info('No B2 mapping config to seed (empty file).');
    return;
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

  const res = await MappingConfig.bulkWrite(ops, { ordered: false });
  logger.info(
    {
      matched: res.matchedCount,
      upserted: res.upsertedCount,
      modified: res.modifiedCount,
    },
    'B2 MappingConfig seeding completed',
  );
}
