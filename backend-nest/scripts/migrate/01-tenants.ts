/**
 * 01: テナント移行 / 租户迁移
 *
 * MongoDB: tenants コレクション
 * PostgreSQL: tenants テーブル
 *
 * テナントは全テーブルの親。最初に移行する必要がある。
 * 租户是所有表的父级，必须最先迁移。
 */

import { Db } from 'mongodb';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { tenants } from '../../src/database/schema/tenants';
import {
  objectIdToUuid,
  toTimestamp,
  processBatch,
  logStart,
  logComplete,
  DEFAULT_BATCH_SIZE,
  BatchResult,
} from './utils';

/**
 * テナントを移行する / 迁移租户
 *
 * @param mongoDb - MongoDB データベース接続 / MongoDB 数据库连接
 * @param pgDb - PostgreSQL Drizzle インスタンス / PostgreSQL Drizzle 实例
 * @returns バッチ処理結果 / 批量处理结果
 */
export async function migrateTenants(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('01 - Tenants / テナント / 租户');

  // MongoDB からテナント一覧を取得 / 从 MongoDB 获取租户列表
  const mongoTenants = await mongoDb.collection('tenants').find({}).toArray();
  console.log(`  Found ${mongoTenants.length} tenants in MongoDB`);

  const result = await processBatch(mongoTenants, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((tenant) => ({
      id: objectIdToUuid(tenant._id.toString()),
      code: tenant.code || tenant.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
      name: tenant.name || 'Unknown Tenant',
      plan: tenant.plan || 'free',
      isActive: tenant.isActive ?? true,
      createdAt: toTimestamp(tenant.createdAt) || new Date(),
      updatedAt: toTimestamp(tenant.updatedAt) || new Date(),
    }));

    // 冪等挿入: 既存レコードはスキップ / 幂等插入: 跳过已存在记录
    await pgDb.insert(tenants).values(values).onConflictDoNothing();
  });

  logComplete('Tenants', result);
  return result;
}

// 単体実行用 / 单独执行用
// Usage: npx ts-node scripts/migrate/01-tenants.ts
if (require.main === module) {
  // TODO: MongoDB / PostgreSQL 接続を初期化して migrateTenants() を呼び出す
  // TODO: 初始化 MongoDB / PostgreSQL 连接后调用 migrateTenants()
  console.log('Run via run-all.ts or initialize connections manually.');
}
