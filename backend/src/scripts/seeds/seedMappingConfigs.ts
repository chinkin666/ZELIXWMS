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

export async function seedMappingConfigsFromJson(): Promise<void> {
  logger.info('Seeding mapping_configs from seed_test JSON...');

  const docs = await loadSeedJsonArray<MappingConfigSeedDoc>(
    'nexand-shipment.mapping_configs.json',
  );
  if (docs.length === 0) {
    logger.info('No mapping configs to seed (empty file).');
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
    'MappingConfig seeding completed',
  );
}


