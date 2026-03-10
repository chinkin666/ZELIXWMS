/**
 * 数据库种子数据脚本
 * - 从 `backend/seed_test/*.json` 导入基础数据
 * - 保留导出时的 `_id`，以确保不同集合之间引用的 id 生效
 * - seed 模块拆分在 `src/scripts/seeds/`，此文件仅负责串行调度
 */

import { connectDatabase, disconnectDatabase } from '@/config/database';
import { logger } from '@/lib/logger';
import { seedCarriersFromJson } from './seeds/seedCarriers';
import { seedFormTemplatesFromJson } from './seeds/seedFormTemplates';
import { seedMappingConfigsFromJson } from './seeds/seedMappingConfigs';
import { seedPrintTemplatesFromJson } from './seeds/seedPrintTemplates';

async function main(): Promise<void> {
  try {
    logger.info('Starting database seed...');

    await connectDatabase();

    // IMPORTANT: order matters for consistency (carrierId references, etc.)
    await seedCarriersFromJson();
    await seedMappingConfigsFromJson();
    await seedPrintTemplatesFromJson();
    await seedFormTemplatesFromJson();

    logger.info('Database seed completed successfully');
  } catch (error) {
    logger.error(error, 'Database seed failed');
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export {
  seedCarriersFromJson,
  seedFormTemplatesFromJson,
  seedMappingConfigsFromJson,
  seedPrintTemplatesFromJson,
};





