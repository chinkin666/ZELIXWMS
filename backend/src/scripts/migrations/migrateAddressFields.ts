/**
 * 迁移脚本：将扁平地址字段转换为嵌套结构
 *
 * 旧结构：
 *   ordererPostalCode, ordererAddressPrefecture, ordererAddressCity, ordererAddressStreet, ordererName, ordererPhone
 *   recipientPostalCode, recipientAddressPrefecture, recipientAddressCity, recipientAddressStreet, recipientName, recipientPhone
 *   senderPostalCode, senderAddressPrefecture, senderAddressCity, senderAddressStreet, senderName, senderPhone
 *
 * 新结构：
 *   orderer: { postalCode, prefecture, city, street, name, phone }
 *   recipient: { postalCode, prefecture, city, street, name, phone }
 *   sender: { postalCode, prefecture, city, street, name, phone }
 */

import mongoose from 'mongoose';
import { loadEnv } from '@/config/env';
import { connectDatabase } from '@/config/database';
import { logger } from '@/lib/logger';

loadEnv();

async function migrateAddressFields() {
  try {
    await connectDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database not connected');
    }

    const collection = db.collection('orders');

    // 统计需要迁移的文档数量
    const totalCount = await collection.countDocuments({
      // 检查是否存在旧字段（使用 recipientPostalCode 作为标志）
      recipientPostalCode: { $exists: true },
    });

    logger.info({ totalCount }, 'Found documents to migrate');

    if (totalCount === 0) {
      logger.info('No documents to migrate, exiting');
      process.exit(0);
    }

    // 批量处理
    const batchSize = 100;
    let processed = 0;

    const cursor = collection.find({
      recipientPostalCode: { $exists: true },
    });

    const bulkOps: any[] = [];

    for await (const doc of cursor) {
      // 构建新的嵌套结构
      const orderer = {
        postalCode: doc.ordererPostalCode || '',
        prefecture: doc.ordererAddressPrefecture || '',
        city: doc.ordererAddressCity || '',
        street: doc.ordererAddressStreet || '',
        name: doc.ordererName || '',
        phone: doc.ordererPhone || '',
      };

      const recipient = {
        postalCode: doc.recipientPostalCode || '',
        prefecture: doc.recipientAddressPrefecture || '',
        city: doc.recipientAddressCity || '',
        street: doc.recipientAddressStreet || '',
        name: doc.recipientName || '',
        phone: doc.recipientPhone || '',
      };

      const sender = {
        postalCode: doc.senderPostalCode || '',
        prefecture: doc.senderAddressPrefecture || '',
        city: doc.senderAddressCity || '',
        street: doc.senderAddressStreet || '',
        name: doc.senderName || '',
        phone: doc.senderPhone || '',
      };

      // 检查 orderer 是否有实际数据
      const hasOrdererData = Object.values(orderer).some((v) => v && v.trim() !== '');

      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              orderer: hasOrdererData ? orderer : undefined,
              recipient,
              sender,
            },
            $unset: {
              // 删除旧字段
              ordererPostalCode: '',
              ordererAddressPrefecture: '',
              ordererAddressCity: '',
              ordererAddressStreet: '',
              ordererName: '',
              ordererPhone: '',
              recipientPostalCode: '',
              recipientAddressPrefecture: '',
              recipientAddressCity: '',
              recipientAddressStreet: '',
              recipientName: '',
              recipientPhone: '',
              senderPostalCode: '',
              senderAddressPrefecture: '',
              senderAddressCity: '',
              senderAddressStreet: '',
              senderName: '',
              senderPhone: '',
            },
          },
        },
      });

      // 批量执行
      if (bulkOps.length >= batchSize) {
        await collection.bulkWrite(bulkOps);
        processed += bulkOps.length;
        logger.info({ processed, total: totalCount }, 'Migration progress');
        bulkOps.length = 0;
      }
    }

    // 处理剩余的
    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps);
      processed += bulkOps.length;
    }

    logger.info({ processed }, 'Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(error, 'Migration failed');
    process.exit(1);
  }
}

void migrateAddressFields();
