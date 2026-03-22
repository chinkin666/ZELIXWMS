// FBAボックスサービス / FBA箱子服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, desc, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { fbaBoxes } from '../database/schema/fba.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

// 検索クエリ / 查询参数
interface FindFbaBoxesQuery {
  page?: number;
  limit?: number;
  shipmentPlanId?: string;
  status?: string;
}

@Injectable()
export class FbaBoxesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 一覧取得（テナント分離・ページネーション）/ 获取列表（租户隔离・分页）
  async findAll(tenantId: string, query: FindFbaBoxesQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(fbaBoxes.tenantId, tenantId),
    ];

    if (query.shipmentPlanId) {
      conditions.push(eq(fbaBoxes.shipmentPlanId, query.shipmentPlanId));
    }
    if (query.status) {
      conditions.push(eq(fbaBoxes.status, query.status));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(fbaBoxes)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(fbaBoxes.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(fbaBoxes)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ID検索 / 按ID查找
  async findOne(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(fbaBoxes)
      .where(and(
        eq(fbaBoxes.id, id),
        eq(fbaBoxes.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('FBA_BOX_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(fbaBoxes)
      .values({
        tenantId,
        shipmentPlanId: dto.shipmentPlanId as string,
        boxNumber: dto.boxNumber as string,
        weight: dto.weight as string ?? null,
        dimensions: dto.dimensions ?? null,
        items: dto.items ?? null,
        trackingNumber: dto.trackingNumber as string ?? null,
        status: 'packing',
      })
      .returning();

    return rows[0];
  }

  // 更新 / 更新
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    // 更新不可フィールドを除外 / 排除不可更新字段
    const { id: _id, tenantId: _tid, createdAt: _ca, ...updateData } = dto;

    const rows = await this.db
      .update(fbaBoxes)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(fbaBoxes.id, id),
        eq(fbaBoxes.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // 削除 / 删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    const rows = await this.db
      .delete(fbaBoxes)
      .where(and(
        eq(fbaBoxes.id, id),
        eq(fbaBoxes.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }
}
