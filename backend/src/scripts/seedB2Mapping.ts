/**
 * B2 マッピング設定のみをシードするスクリプト
 * Usage: npm run seed:b2-mapping
 */

import { connectDatabase, disconnectDatabase } from '@/config/database';
import { logger } from '@/lib/logger';
import { seedB2MappingConfigFromJson } from './seeds/seedB2MappingConfig';

async function main(): Promise<void> {
  try {
    logger.info('Starting B2 mapping config seed...');

    await connectDatabase();
    await seedB2MappingConfigFromJson();

    logger.info('B2 mapping config seed completed successfully');
  } catch (error) {
    logger.error(error, 'B2 mapping config seed failed');
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
