/**
 * Restore database from BSON dump files in local-db/dump/.
 *
 * Reads each .bson file, deserializes the documents, and inserts them
 * into the corresponding collection (dropping existing data first).
 *
 * Usage:
 *   npm run db:restore
 */

import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { BSON } from 'bson';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { logger } from '@/lib/logger';

const DUMP_DIR = path.resolve(__dirname, '../../../local-db/dump');

function parseBsonFile(filePath: string): Record<string, unknown>[] {
  const buf = fs.readFileSync(filePath);
  const docs: Record<string, unknown>[] = [];
  let offset = 0;

  while (offset < buf.length) {
    const docSize = buf.readInt32LE(offset);
    if (docSize <= 0 || offset + docSize > buf.length) break;
    const docBuf = buf.slice(offset, offset + docSize);
    docs.push(BSON.deserialize(docBuf) as Record<string, unknown>);
    offset += docSize;
  }

  return docs;
}

async function main(): Promise<void> {
  try {
    logger.info('Starting database restore from local-db/dump/ ...');

    if (!fs.existsSync(DUMP_DIR)) {
      throw new Error(`Dump directory not found: ${DUMP_DIR}`);
    }

    await connectDatabase();
    const db = mongoose.connection.db!;

    const bsonFiles = fs.readdirSync(DUMP_DIR).filter((f) => f.endsWith('.bson'));

    if (bsonFiles.length === 0) {
      throw new Error(`No .bson files found in ${DUMP_DIR}`);
    }

    for (const file of bsonFiles) {
      const colName = file.replace('.bson', '');
      const docs = parseBsonFile(path.join(DUMP_DIR, file));

      if (docs.length === 0) {
        logger.info({ collection: colName }, 'Skipped (0 docs)');
        continue;
      }

      await db.collection(colName).drop().catch(() => {});
      await db.collection(colName).insertMany(docs);
      logger.info({ collection: colName, count: docs.length }, 'Restored');
    }

    logger.info('Database restore completed successfully');
  } catch (error) {
    logger.error(error, 'Database restore failed');
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

if (require.main === module) {
  void main();
}
