// 棚卸差異サービス / 盘点差异管理服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { stocktakingDiscrepancies, stocktakingOrders } from '../database/schema/warehouse-ops.js';
import { stockQuants } from '../database/schema/inventory.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  stocktakingOrderId?: string;
  status?: string;
}

@Injectable()
export class StocktakingDiscrepanciesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 棚卸差異一覧取得（テナント分離・ページネーション・フィルタ）
  // 获取盘点差异列表（租户隔离・分页・过滤）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(stocktakingDiscrepancies.tenantId, tenantId)];

    if (query.stocktakingOrderId) {
      conditions.push(eq(stocktakingDiscrepancies.stocktakingOrderId, query.stocktakingOrderId));
    }
    if (query.status) {
      conditions.push(eq(stocktakingDiscrepancies.status, query.status));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(stocktakingDiscrepancies)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(stocktakingDiscrepancies.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(stocktakingDiscrepancies)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return createPaginatedResult(items, total, page, limit);
  }

  // 棚卸差異詳細取得 / 获取盘点差异详情
  async findById(tenantId: string, id: string) {
    const [record] = await this.db
      .select()
      .from(stocktakingDiscrepancies)
      .where(and(eq(stocktakingDiscrepancies.id, id), eq(stocktakingDiscrepancies.tenantId, tenantId)))
      .limit(1);

    if (!record) {
      throw new WmsException('DISCREPANCY_NOT_FOUND', `Stocktaking discrepancy ${id} not found`);
    }

    return record;
  }

  // 棚卸差異自動生成（棚卸結果 vs システム在庫）
  // 自动生成盘点差异（盘点结果 vs 系统库存）
  async generate(tenantId: string, stocktakingOrderId: string) {
    // 棚卸指示取得 / 获取盘点单
    const [order] = await this.db
      .select()
      .from(stocktakingOrders)
      .where(and(
        eq(stocktakingOrders.id, stocktakingOrderId),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .limit(1);

    if (!order) {
      throw new WmsException('STOCKTAKING_NOT_FOUND', `Stocktaking order ${stocktakingOrderId} not found`);
    }

    // 棚卸明細から差異を計算 / 从盘点明细计算差异
    const items = (order.items as any[]) || [];
    const discrepancies: any[] = [];

    for (const item of items) {
      // システム在庫を取得 / 获取系统库存
      const [systemStock] = await this.db
        .select()
        .from(stockQuants)
        .where(and(
          eq(stockQuants.tenantId, tenantId),
          eq(stockQuants.productId, item.productId),
          eq(stockQuants.locationId, item.locationId),
        ))
        .limit(1);

      const systemQuantity = systemStock?.quantity ?? 0;
      const countedQuantity = item.countedQuantity ?? 0;
      const diff = countedQuantity - systemQuantity;

      // 差異がある場合のみレコード作成 / 仅在有差异时创建记录
      if (diff !== 0) {
        discrepancies.push({
          tenantId,
          stocktakingOrderId,
          productId: item.productId,
          locationId: item.locationId,
          systemQuantity,
          countedQuantity,
          discrepancy: diff,
          status: 'pending',
        });
      }
    }

    if (discrepancies.length === 0) {
      return { generated: 0, discrepancies: [] };
    }

    const created = await this.db
      .insert(stocktakingDiscrepancies)
      .values(discrepancies)
      .returning();

    return { generated: created.length, discrepancies: created };
  }

  // 棚卸差異更新 / 更新盘点差异
  async update(tenantId: string, id: string, dto: Record<string, any>) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(stocktakingDiscrepancies)
      .set({
        status: dto.status,
        notes: dto.notes,
      })
      .where(and(eq(stocktakingDiscrepancies.id, id), eq(stocktakingDiscrepancies.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // 差異承認（在庫調整実行）/ 差异批准（执行库存调整）
  async approve(tenantId: string, id: string, dto: Record<string, any>) {
    const record = await this.findById(tenantId, id);

    if (record.status !== 'pending') {
      throw new WmsException('DISCREPANCY_INVALID_STATUS', `Cannot approve: current status is ${record.status}`);
    }

    const [updated] = await this.db
      .update(stocktakingDiscrepancies)
      .set({
        status: 'approved',
        adjustedBy: dto.adjustedBy,
        adjustedAt: new Date(),
        notes: dto.notes,
      })
      .where(and(eq(stocktakingDiscrepancies.id, id), eq(stocktakingDiscrepancies.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // 差異却下 / 差异驳回
  async reject(tenantId: string, id: string, dto: Record<string, any>) {
    const record = await this.findById(tenantId, id);

    if (record.status !== 'pending') {
      throw new WmsException('DISCREPANCY_INVALID_STATUS', `Cannot reject: current status is ${record.status}`);
    }

    const [updated] = await this.db
      .update(stocktakingDiscrepancies)
      .set({
        status: 'rejected',
        notes: dto.notes,
      })
      .where(and(eq(stocktakingDiscrepancies.id, id), eq(stocktakingDiscrepancies.tenantId, tenantId)))
      .returning();

    return updated;
  }
}
