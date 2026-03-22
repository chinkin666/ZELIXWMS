// セット組み作業サービス / 组装作业管理服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { assemblyOrders } from '../database/schema/warehouse-ops.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class AssemblyOrdersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // セット組み一覧取得（テナント分離・ページネーション・フィルタ）
  // 获取组装作业列表（租户隔离・分页・过滤）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(assemblyOrders.tenantId, tenantId)];

    if (query.status) {
      conditions.push(eq(assemblyOrders.status, query.status));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(assemblyOrders)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(assemblyOrders.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(assemblyOrders)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return createPaginatedResult(items, total, page, limit);
  }

  // セット組み詳細取得 / 获取组装作业详情
  async findById(tenantId: string, id: string) {
    const [record] = await this.db
      .select()
      .from(assemblyOrders)
      .where(and(eq(assemblyOrders.id, id), eq(assemblyOrders.tenantId, tenantId)))
      .limit(1);

    if (!record) {
      throw new WmsException('ASSEMBLY_NOT_FOUND', `Assembly order ${id} not found`);
    }

    return record;
  }

  // セット組み作成 / 创建组装作业
  async create(tenantId: string, dto: Record<string, any>) {
    const [created] = await this.db
      .insert(assemblyOrders)
      .values({
        tenantId,
        assemblyNumber: dto.assemblyNumber,
        setProductId: dto.setProductId,
        items: dto.items || [],
        targetQuantity: dto.targetQuantity,
        assignedTo: dto.assignedTo,
        notes: dto.notes,
        status: 'draft',
      })
      .returning();

    return created;
  }

  // セット組み更新 / 更新组装作业
  async update(tenantId: string, id: string, dto: Record<string, any>) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(assemblyOrders)
      .set({
        assemblyNumber: dto.assemblyNumber,
        setProductId: dto.setProductId,
        items: dto.items,
        targetQuantity: dto.targetQuantity,
        assembledQuantity: dto.assembledQuantity,
        assignedTo: dto.assignedTo,
        notes: dto.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(assemblyOrders.id, id), eq(assemblyOrders.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // 作業開始（draft→in_progress）/ 开始作业（draft→in_progress）
  async start(tenantId: string, id: string) {
    const record = await this.findById(tenantId, id);

    if (record.status !== 'draft') {
      throw new WmsException('ASSEMBLY_INVALID_STATUS', `Cannot start: current status is ${record.status}`);
    }

    const [updated] = await this.db
      .update(assemblyOrders)
      .set({
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(assemblyOrders.id, id), eq(assemblyOrders.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // 作業完了（in_progress→completed）/ 完成作业（in_progress→completed）
  async complete(tenantId: string, id: string) {
    const record = await this.findById(tenantId, id);

    if (record.status !== 'in_progress') {
      throw new WmsException('ASSEMBLY_INVALID_STATUS', `Cannot complete: current status is ${record.status}`);
    }

    const [updated] = await this.db
      .update(assemblyOrders)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(assemblyOrders.id, id), eq(assemblyOrders.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // キャンセル / 取消
  async cancel(tenantId: string, id: string) {
    const record = await this.findById(tenantId, id);

    if (record.status === 'completed' || record.status === 'cancelled') {
      throw new WmsException('ASSEMBLY_INVALID_STATUS', `Cannot cancel: current status is ${record.status}`);
    }

    const [updated] = await this.db
      .update(assemblyOrders)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(eq(assemblyOrders.id, id), eq(assemblyOrders.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // 論理削除 / 软删除
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(assemblyOrders)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(eq(assemblyOrders.id, id), eq(assemblyOrders.tenantId, tenantId)))
      .returning();

    return { success: true, id: updated.id };
  }
}
