// オーダーグループサービス / 订单分组服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { orderGroups } from '../database/schema/shipments.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  name?: string;
  enabled?: boolean;
}

@Injectable()
export class OrderGroupsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // オーダーグループ一覧取得 / 获取订单分组列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(orderGroups.tenantId, tenantId),
    ];

    if (query.name) {
      conditions.push(ilike(orderGroups.name, `%${query.name}%`));
    }
    if (query.enabled !== undefined) {
      conditions.push(eq(orderGroups.enabled, query.enabled));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(orderGroups).where(where).limit(limit).offset(offset).orderBy(orderGroups.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(orderGroups).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // オーダーグループID検索 / 按ID查找订单分组
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(orderGroups)
      .where(and(
        eq(orderGroups.id, id),
        eq(orderGroups.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('ORDER_GROUP_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // オーダーグループ作成 / 创建订单分组
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db.insert(orderGroups).values({
      tenantId,
      name: dto.name as string,
      priority: (dto.priority as number) ?? 0,
      enabled: (dto.enabled as boolean) ?? true,
      description: dto.description as string,
    }).returning();

    return rows[0];
  }

  // オーダーグループ更新 / 更新订单分组
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(orderGroups)
      .set({
        ...(dto.name !== undefined && { name: dto.name as string }),
        ...(dto.priority !== undefined && { priority: dto.priority as number }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled as boolean }),
        ...(dto.description !== undefined && { description: dto.description as string }),
        updatedAt: new Date(),
      })
      .where(and(eq(orderGroups.id, id), eq(orderGroups.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // オーダーグループ削除（物理削除）/ 删除订单分组（物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(orderGroups)
      .where(and(eq(orderGroups.id, id), eq(orderGroups.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
