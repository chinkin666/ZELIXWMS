// 管理サービス / 管理服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL, desc, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { users } from '../database/schema/users.js';
import { tenants } from '../database/schema/tenants.js';
import { systemSettings } from '../database/schema/settings.js';
import { operationLogs } from '../database/schema/settings.js';
import { shipmentOrders } from '../database/schema/shipments.js';
import { inboundOrders } from '../database/schema/inbound.js';
import { stockQuants } from '../database/schema/inventory.js';
import type { CreateUserDto, UpdateUserDto } from './dto/create-user.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

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
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ========== ユーザー管理 / 用户管理 ==========

  // ユーザー一覧取得（テナント分離・ページネーション・検索）/ 获取用户列表（租户隔离・分页・搜索）
  async findAllUsers(tenantId: string, query: FindAllUsersQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
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

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ユーザーID検索 / 按ID查找用户
  async findUserById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('USER_NOT_FOUND', `ID: ${id}`);
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

  // ========== ダッシュボード / 仪表盘 ==========

  // 管理ダッシュボード（プレースホルダ）/ 管理仪表盘（占位符）
  // TODO: 実データから集計 / 从实际数据聚合
  async getDashboard(tenantId: string) {
    const [userCount, tenantCount] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.tenantId, tenantId)),
      this.db.select({ count: sql<number>`count(*)::int` }).from(tenants),
    ]);

    return {
      totalUsers: userCount[0]?.count ?? 0,
      totalTenants: tenantCount[0]?.count ?? 0,
      activeUsers: 0,
      storageUsed: 0,
    };
  }

  // ========== テナント管理 / 租户管理 ==========

  // テナント一覧取得 / 获取租户列表
  async findAllTenants(query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const [items, countResult] = await Promise.all([
      this.db.select().from(tenants).limit(limit).offset(offset).orderBy(tenants.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(tenants),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // テナントID検索 / 按ID查找租户
  async findTenantById(id: string) {
    const rows = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('TENANT_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // テナント作成 / 创建租户
  async createTenant(dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(tenants)
      .values(dto as any)
      .returning();

    return rows[0];
  }

  // テナント更新 / 更新租户
  async updateTenant(id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findTenantById(id);

    const rows = await this.db
      .update(tenants)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();

    return rows[0];
  }

  // ========== APIログ / API日志 ==========

  // APIログ取得（プレースホルダ）/ 获取API日志（占位符）
  // TODO: 実テーブルから取得 / 从实际表中获取
  async findApiLogs(tenantId: string, query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));

    return createPaginatedResult([], 0, page, limit);
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
    const limit = Math.min(200, Math.max(1, query.limit || 20));
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

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // テナント統計ダッシュボード（テナント内の各種カウント集計）
  // 租户统计仪表盘（汇总租户内的各种计数）
  async getTenantStats(tenantId: string) {
    const [userResult, shipmentResult, inboundResult, stockResult] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` })
        .from(users).where(eq(users.tenantId, tenantId)),
      this.db.select({ count: sql<number>`count(*)::int` })
        .from(shipmentOrders).where(and(eq(shipmentOrders.tenantId, tenantId), isNull(shipmentOrders.deletedAt))),
      this.db.select({ count: sql<number>`count(*)::int` })
        .from(inboundOrders).where(and(eq(inboundOrders.tenantId, tenantId), isNull(inboundOrders.deletedAt))),
      this.db.select({
        totalProducts: sql<number>`count(DISTINCT ${stockQuants.productId})::int`,
        totalQuantity: sql<number>`coalesce(sum(${stockQuants.quantity}), 0)::int`,
      }).from(stockQuants).where(eq(stockQuants.tenantId, tenantId)),
    ]);

    return {
      tenantId,
      users: userResult[0]?.count ?? 0,
      shipmentOrders: shipmentResult[0]?.count ?? 0,
      inboundOrders: inboundResult[0]?.count ?? 0,
      totalProducts: stockResult[0]?.totalProducts ?? 0,
      totalStockQuantity: stockResult[0]?.totalQuantity ?? 0,
    };
  }
}
