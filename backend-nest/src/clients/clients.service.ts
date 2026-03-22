// 顧客サービス / 客户服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, isNull, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { clients } from '../database/schema/clients.js';
import type { CreateClientDto, UpdateClientDto } from './dto/create-client.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  code?: string;
  name?: string;
  isActive?: boolean;
}

@Injectable()
export class ClientsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 顧客一覧取得（テナント分離・ページネーション・検索）/ 获取客户列表（租户隔离・分页・搜索）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(clients.tenantId, tenantId),
      isNull(clients.deletedAt),
    ];

    if (query.code) {
      conditions.push(ilike(clients.code, `%${query.code}%`));
    }
    if (query.name) {
      conditions.push(ilike(clients.name, `%${query.name}%`));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(clients.isActive, query.isActive));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(clients).where(where).limit(limit).offset(offset).orderBy(clients.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(clients).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 顧客ID検索 / 按ID查找客户
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(clients)
      .where(and(
        eq(clients.id, id),
        eq(clients.tenantId, tenantId),
        isNull(clients.deletedAt),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('CLIENT_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 顧客作成 / 创建客户
  async create(tenantId: string, dto: CreateClientDto) {
    // コード重複チェック / 编码重复检查
    const existing = await this.db
      .select({ id: clients.id })
      .from(clients)
      .where(and(
        eq(clients.tenantId, tenantId),
        eq(clients.code, dto.code),
        isNull(clients.deletedAt),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Code: ${dto.code}`);
    }

    const rows = await this.db.insert(clients).values({ tenantId, ...dto }).returning();
    return rows[0];
  }

  // 顧客更新 / 更新客户
  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // コード変更時の重複チェック / 编码变更时的重复检查
    if (dto.code) {
      const existing = await this.db
        .select({ id: clients.id })
        .from(clients)
        .where(and(
          eq(clients.tenantId, tenantId),
          eq(clients.code, dto.code),
          isNull(clients.deletedAt),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Code: ${dto.code}`);
      }
    }

    const rows = await this.db
      .update(clients)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 顧客エクスポート（JSON配列を返す）/ 导出客户（返回JSON数组）
  async exportClients(tenantId: string) {
    const items = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.tenantId, tenantId), isNull(clients.deletedAt)))
      .orderBy(clients.code);

    return { items, total: items.length };
  }

  // 顧客論理削除 / 客户软删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(clients)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
