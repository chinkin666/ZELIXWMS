/**
 * Dump the current database to BSON files in local-db/dump/.
 *
 * Exports every collection as a .bson + .metadata.json pair,
 * compatible with restoreDb.ts.
 *
 * Usage:
 *   npm run db:dump
 */

import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { BSON } from 'bson';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { logger } from '@/lib/logger';

const DUMP_DIR = path.resolve(__dirname, '../../../local-db/dump');

async function main(): Promise<void> {
  try {
    logger.info('Starting database dump to local-db/dump/ ...');

    fs.mkdirSync(DUMP_DIR, { recursive: true });

    await connectDatabase();
    const db = mongoose.connection.db!;

    const collections = await db.listCollections().toArray();

    for (const col of collections) {
      const colName = col.name;
      const docs = await db.collection(colName).find().toArray();

      const buffers = docs.map((d) => BSON.serialize(d));
      const combined = Buffer.concat(buffers);
      fs.writeFileSync(path.join(DUMP_DIR, `${colName}.bson`), combined);

      const indexes = await db.collection(colName).indexes();
      const meta = JSON.stringify({ indexes }, null, 2);
      fs.writeFileSync(path.join(DUMP_DIR, `${colName}.metadata.json`), meta);

      logger.info({ collection: colName, count: docs.length }, 'Dumped');
    }

    logger.info('Database dump completed successfully');
  } catch (error) {
    logger.error(error, 'Database dump failed');
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

if (require.main === module) {
  void main();
}
