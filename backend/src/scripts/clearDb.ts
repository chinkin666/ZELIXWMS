/**
 * Clear (drop) the configured MongoDB database.
 *
 * Safety:
 * - Requires a CLI argument: the database name you intend to drop.
 * - Will only drop the DB if the argument EXACTLY matches the connected database name.
 *
 * Usage:
 *   npm run db:clear -- <dbName>
 */

import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '@/config/database';
import { logger } from '@/lib/logger';

function getConnectedDbName(): string {
  // mongoose.connection.name can be empty before fully connected; db.databaseName is most reliable.
  return (mongoose.connection as any)?.db?.databaseName ?? mongoose.connection.name ?? '';
}

async function main(): Promise<void> {
  try {
    logger.info('Starting DB clear (dropDatabase)...');

    await connectDatabase();

    const dbName = getConnectedDbName();
    const argv = process.argv.slice(2);
    // npm/ts-node invocation passes args after the script; at runtime `process.argv[1]` is the script path.
    const targetDbName = String(argv[0] ?? '').trim();

    if (!dbName) {
      throw new Error('Cannot determine connected database name.');
    }

    if (!targetDbName) {
      throw new Error(
        `Missing database name argument.\n` +
          `Usage: npm run db:clear -- ${dbName}\n` +
          `Connected DB: "${dbName}"`,
      );
    }

    if (targetDbName !== dbName) {
      throw new Error(
        `Refusing to clear DB.\n` +
          `Connected DB: "${dbName}"\n` +
          `Argument DB:  "${targetDbName}"\n` +
          `They must match exactly.`,
      );
    }

    logger.warn({ dbName }, 'Dropping database...');
    await mongoose.connection.dropDatabase();
    logger.warn({ dbName }, 'Database dropped successfully');
  } catch (error) {
    logger.error(error, 'DB clear failed');
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

if (require.main === module) {
  void main();
}


