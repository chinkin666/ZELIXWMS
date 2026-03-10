/**
 * 修复 order_source_companies 集合的索引
 * 删除旧的唯一索引，确保可以添加多个记录
 */

import mongoose from 'mongoose';
import { loadEnv } from '@/config/env';
import { connectDatabase } from '@/config/database';
import { logger } from '@/lib/logger';

loadEnv();

async function fixIndexes() {
  try {
    await connectDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection('order_source_companies');
    
    // 获取所有索引
    const indexes = await collection.indexes();
    logger.info({ indexes }, 'Current indexes on order_source_companies');

    // 删除所有唯一索引（除了 _id）和包含 tenantId 的索引
    for (const index of indexes) {
      const indexName = index.name;
      const indexKey = index.key;
      
      // 跳过 _id 索引或没有名称的索引
      if (!indexName || indexName === '_id_') {
        continue;
      }

      // 检查索引是否包含 tenantId 字段
      const hasTenantId = indexKey && typeof indexKey === 'object' && 'tenantId' in indexKey;
      
      // 如果索引是唯一的，或者包含 tenantId，删除它
      if (index.unique || hasTenantId) {
        logger.info({ indexName, indexKey, unique: index.unique, hasTenantId }, 'Dropping index');
        try {
          await collection.dropIndex(indexName);
          logger.info({ indexName }, 'Index dropped successfully');
        } catch (error: any) {
          logger.warn({ indexName, error: error.message }, 'Failed to drop index, may not exist');
        }
      }
    }

    // 删除旧的字段索引（如果存在）
    const oldIndexes = ['name_1', 'postalCode_1'];
    for (const oldIndexName of oldIndexes) {
      try {
        await collection.dropIndex(oldIndexName);
        logger.info({ oldIndexName }, 'Old index dropped');
      } catch (error: any) {
        // 索引可能不存在，忽略错误
        logger.debug({ oldIndexName, error: error.message }, 'Old index not found or already dropped');
      }
    }

    // 重新创建非唯一索引（如果不存在）
    try {
      await collection.createIndex({ senderName: 1 }, { unique: false, background: true });
      logger.info('Created senderName index');
    } catch (error: any) {
      logger.debug({ error: error.message }, 'senderName index may already exist');
    }
    
    try {
      await collection.createIndex({ senderPostalCode: 1 }, { unique: false, background: true });
      logger.info('Created senderPostalCode index');
    } catch (error: any) {
      logger.debug({ error: error.message }, 'senderPostalCode index may already exist');
    }
    
    logger.info('Indexes fixed successfully');
    
    // 显示最终的索引
    const finalIndexes = await collection.indexes();
    logger.info({ indexes: finalIndexes }, 'Final indexes on order_source_companies');
    
    process.exit(0);
  } catch (error) {
    logger.error(error, 'Failed to fix indexes');
    process.exit(1);
  }
}

fixIndexes();

