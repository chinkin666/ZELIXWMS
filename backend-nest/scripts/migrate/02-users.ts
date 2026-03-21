/**
 * 02: ユーザー移行 / 用户迁移
 *
 * MongoDB: users コレクション
 * PostgreSQL: users テーブル
 *
 * 注意: PostgreSQL の users.id は Supabase Auth の user.id と一致させる。
 * 移行時は元の ObjectId から UUID を生成し、後で Supabase Auth と紐付ける。
 * 注意: PostgreSQL 的 users.id 需与 Supabase Auth 的 user.id 一致。
 * 迁移时先从 ObjectId 生成 UUID，后续再与 Supabase Auth 关联。
 */

import { Db } from 'mongodb';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../../src/database/schema/users';
import {
  objectIdToUuid,
  objectIdToUuidOrNull,
  toTimestamp,
  processBatch,
  logStart,
  logComplete,
  DEFAULT_BATCH_SIZE,
  BatchResult,
} from './utils';

/**
 * MongoDB ユーザーロール → PostgreSQL ロール マッピング
 * MongoDB 用户角色 → PostgreSQL 角色映射
 */
function mapRole(mongoRole: string | undefined): string {
  const roleMap: Record<string, string> = {
    superadmin: 'admin',
    admin: 'admin',
    manager: 'manager',
    operator: 'operator',
    viewer: 'viewer',
    warehouse_staff: 'operator',
    client: 'viewer',
  };
  return roleMap[mongoRole || ''] || 'viewer';
}

/**
 * ユーザーを移行する / 迁移用户
 *
 * @param mongoDb - MongoDB データベース接続 / MongoDB 数据库连接
 * @param pgDb - PostgreSQL Drizzle インスタンス / PostgreSQL Drizzle 实例
 * @returns バッチ処理結果 / 批量处理结果
 */
export async function migrateUsers(
  mongoDb: Db,
  pgDb: NodePgDatabase,
): Promise<BatchResult> {
  logStart('02 - Users / ユーザー / 用户');

  const mongoUsers = await mongoDb.collection('users').find({}).toArray();
  console.log(`  Found ${mongoUsers.length} users in MongoDB`);

  const result = await processBatch(mongoUsers, DEFAULT_BATCH_SIZE, async (batch) => {
    const values = batch.map((user) => ({
      id: objectIdToUuid(user._id.toString()),
      tenantId: objectIdToUuid((user.tenantId || user.tenant_id || user._id).toString()),
      email: user.email || `unknown-${user._id}@migration.local`,
      displayName: user.displayName || user.name || user.username || null,
      role: mapRole(user.role),
      warehouseIds: Array.isArray(user.warehouseIds)
        ? user.warehouseIds.map((id: any) => objectIdToUuid(id.toString()))
        : [],
      isActive: user.isActive ?? true,
      lastLoginAt: toTimestamp(user.lastLoginAt),
      createdAt: toTimestamp(user.createdAt) || new Date(),
      updatedAt: toTimestamp(user.updatedAt) || new Date(),
    }));

    // 冪等挿入 / 幂等插入
    await pgDb.insert(users).values(values).onConflictDoNothing();
  });

  logComplete('Users', result);
  return result;
}

if (require.main === module) {
  console.log('Run via run-all.ts or initialize connections manually.');
}
