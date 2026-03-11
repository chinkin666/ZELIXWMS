import type mongoose from 'mongoose';
import type { AnyBulkWriteOperation } from 'mongoose';
import { FormTemplate, type IFormTemplate } from '@/models/formTemplate';
import { logger } from '@/lib/logger';
import { loadSeedJsonArray } from './utils';

type FormTemplateSeedDoc = Omit<Partial<IFormTemplate>, '_id'> & { _id: mongoose.Types.ObjectId };

function stripMongoInternals<T extends Record<string, any>>(doc: T): Omit<T, '__v'> {
  const { __v, ...rest } = doc;
  return rest;
}

export async function seedFormTemplatesFromJson(): Promise<void> {
  logger.info('Seeding form_templates from seed_test JSON...');

  const docs = await loadSeedJsonArray<FormTemplateSeedDoc>(
    'nexand-shipment.form_templates.json',
  );
  if (docs.length === 0) {
    logger.info('No form templates to seed (empty file).');
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

  const res = await FormTemplate.bulkWrite(ops, { ordered: false });
  logger.info(
    {
      matched: res.matchedCount,
      upserted: res.upsertedCount,
      modified: res.modifiedCount,
    },
    'FormTemplate seeding completed',
  );
}
