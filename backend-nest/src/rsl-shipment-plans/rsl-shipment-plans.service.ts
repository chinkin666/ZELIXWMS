// RSL出荷プランサービス / RSL出货计划服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, desc, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { rslShipmentPlans } from '../database/schema/rsl.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

// 検索クエリ / 查询参数
interface FindRslPlansQuery {
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class RslShipmentPlansService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 一覧取得（テナント分離・ページネーション）/ 获取列表（租户隔离・分页）
  async findAll(tenantId: string, query: FindRslPlansQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(rslShipmentPlans.tenantId, tenantId),
    ];

    if (query.status) {
      conditions.push(eq(rslShipmentPlans.status, query.status));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(rslShipmentPlans)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(rslShipmentPlans.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(rslShipmentPlans)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ID検索 / 按ID查找
  async findOne(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(rslShipmentPlans)
      .where(and(
        eq(rslShipmentPlans.id, id),
        eq(rslShipmentPlans.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('RSL_PLAN_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(rslShipmentPlans)
      .values({
        tenantId,
        planName: dto.planName as string,
        status: 'draft',
        rslOrderId: dto.rslOrderId as string ?? null,
        items: dto.items ?? null,
        notes: dto.notes as string ?? null,
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
      .update(rslShipmentPlans)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(rslShipmentPlans.id, id),
        eq(rslShipmentPlans.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // 削除 / 删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    const rows = await this.db
      .delete(rslShipmentPlans)
      .where(and(
        eq(rslShipmentPlans.id, id),
        eq(rslShipmentPlans.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }
}
