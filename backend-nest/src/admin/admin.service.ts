// 管理サービス / 管理服务
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, sql, SQL, desc } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { users } from '../database/schema/users.js';
import { systemSettings } from '../database/schema/settings.js';
import { operationLogs } from '../database/schema/settings.js';
import type { CreateUserDto, UpdateUserDto } from './dto/create-user.dto.js';

// ===== ユーザー検索クエリ / 用户查询参数 =====
interface FindAllUsersQuery {
  page?: number;
  limit?: number;
  email?: string;
  role?: string;
  isActive?: boolean;
}

// ===== 操作ログ検索クエリ / 操作日志查询参数 =====
interface FindOperationLogsQuery {
  page?: number;
  limit?: number;
  action?: string;
  resourceType?: string;
}

@Injectable()
export class AdminService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ========== ユーザー管理 / 用户管理 ==========

  // ユーザー一覧取得（テナント分離・ページネーション・検索）/ 获取用户列表（租户隔离・分页・搜索）
  async findAllUsers(tenantId: string, query: FindAllUsersQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(users.tenantId, tenantId)];

    if (query.email) {
      conditions.push(ilike(users.email, `%${query.email}%`));
    }
    if (query.role) {
      conditions.push(eq(users.role, query.role));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(users.isActive, query.isActive));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(users.createdAt),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // ユーザーID検索 / 按ID查找用户
  async findUserById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(
        `User ${id} not found / ユーザー ${id} が見つかりません / 用户 ${id} 未找到`,
      );
    }
    return rows[0];
  }

  // ユーザー作成 / 创建用户
  async createUser(tenantId: string, dto: CreateUserDto) {
    const rows = await this.db
      .insert(users)
      .values({
        id: sql`gen_random_uuid()`,
        tenantId,
        ...dto,
      })
      .returning();

    return rows[0];
  }

  // ユーザー更新 / 更新用户
  async updateUser(tenantId: string, id: string, dto: UpdateUserDto) {
    // 存在確認 / 确认存在
    await this.findUserById(tenantId, id);

    const rows = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ユーザー削除（isActive=false に設定、deletedAtカラムなし）/ 删除用户（设为isActive=false，无deletedAt列）
  async removeUser(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findUserById(tenantId, id);

    const rows = await this.db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ========== システム設定 / 系统设置 ==========

  // 設定取得 / 获取设置
  async getSettings(tenantId: string, key: string) {
    const rows = await this.db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.tenantId, tenantId),
          eq(systemSettings.settingsKey, key),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      // デフォルト空設定を返す / 返回默认空设置
      return { settingsKey: key, settings: {} };
    }
    return rows[0];
  }

  // 設定作成・更新（upsert）/ 创建或更新设置（upsert）
  async upsertSettings(tenantId: string, key: string, settings: Record<string, unknown>) {
    const rows = await this.db
      .insert(systemSettings)
      .values({
        tenantId,
        settingsKey: key,
        settings,
      })
      .onConflictDoUpdate({
        target: [systemSettings.tenantId, systemSettings.settingsKey],
        set: { settings, updatedAt: new Date() },
      })
      .returning();

    return rows[0];
  }

  // ========== 操作ログ / 操作日志 ==========

  // 操作ログ取得（ページネーション・フィルタ）/ 获取操作日志（分页・筛选）
  async findOperationLogs(tenantId: string, query: FindOperationLogsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(operationLogs.tenantId, tenantId)];

    if (query.action) {
      conditions.push(eq(operationLogs.action, query.action));
    }
    if (query.resourceType) {
      conditions.push(eq(operationLogs.resourceType, query.resourceType));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(operationLogs)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(operationLogs.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(operationLogs)
        .where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }
}
