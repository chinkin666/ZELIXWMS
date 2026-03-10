import mongoose from 'mongoose';
import type { AnyBulkWriteOperation } from 'mongoose';
import { PrintTemplate, type IPrintTemplate } from '@/models/printTemplate';
import { logger } from '@/lib/logger';
import { loadSeedJsonArray } from './utils';

type PrintTemplateSeedDoc = Omit<Partial<IPrintTemplate>, '_id'> & { _id: mongoose.Types.ObjectId };

function stripMongoInternals<T extends Record<string, any>>(doc: T): Omit<T, '__v'> {
  const { __v, ...rest } = doc;
  return rest;
}

export async function seedPrintTemplatesFromJson(): Promise<void> {
  logger.info('Seeding print_templates from seed_test JSON...');

  const docs = await loadSeedJsonArray<PrintTemplateSeedDoc>(
    'nexand-shipment.print_templates.json',
  );
  if (docs.length === 0) {
    logger.info('No print templates to seed (empty file).');
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

  const res = await PrintTemplate.bulkWrite(ops, { ordered: false });
  logger.info(
    {
      matched: res.matchedCount,
      upserted: res.upsertedCount,
      modified: res.modifiedCount,
    },
    'PrintTemplate seeding completed',
  );
}


