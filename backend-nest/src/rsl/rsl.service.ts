// 楽天RSLサービス / 乐天RSL服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { rslShipmentPlans, rslItems } from '../database/schema/rsl.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class RslService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // RSLプラン一覧取得（テナント分離・ページネーション・ステータスフィルタ）
  // 获取RSL计划列表（租户隔离・分页・状态过滤）
  async findAllPlans(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(rslShipmentPlans.tenantId, tenantId)];

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
        .orderBy(rslShipmentPlans.createdAt),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(rslShipmentPlans)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;
    return createPaginatedResult(items, total, page, limit);
  }

  // RSLプラン詳細取得 / 获取RSL计划详情
  async findPlanById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(rslShipmentPlans)
      .where(and(eq(rslShipmentPlans.id, id), eq(rslShipmentPlans.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('RSL_PLAN_NOT_FOUND', `id=${id}`);
    }
    return rows[0];
  }

  // RSLプラン作成（ステータスは draft で初期化）/ 创建RSL计划（状态初始化为 draft）
  async createPlan(tenantId: string, dto: Record<string, any>) {
    const rows = await this.db
      .insert(rslShipmentPlans)
      .values({
        tenantId,
        planName: dto.planName ?? `RSL-${Date.now()}`,
        rslOrderId: dto.rslOrderId ?? null,
        items: dto.items ?? null,
        notes: dto.notes ?? null,
        status: 'draft',
      } satisfies typeof rslShipmentPlans.$inferInsert)
      .returning();

    return rows[0];
  }

  // RSLプラン更新 / 更新RSL计划
  async updatePlan(tenantId: string, id: string, dto: Record<string, any>) {
    // 存在確認 / 确认存在
    await this.findPlanById(tenantId, id);

    const rows = await this.db
      .update(rslShipmentPlans)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(rslShipmentPlans.id, id), eq(rslShipmentPlans.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // RSLプラン確定（status を confirmed に更新）/ 确认RSL计划（更新 status 为 confirmed）
  async confirmPlan(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findPlanById(tenantId, id);

    const now = new Date();
    const rows = await this.db
      .update(rslShipmentPlans)
      .set({ status: 'confirmed', confirmedAt: now, updatedAt: now })
      .where(and(eq(rslShipmentPlans.id, id), eq(rslShipmentPlans.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // RSLプラン出荷（status を shipped に更新）/ RSL计划发货（更新 status 为 shipped）
  async shipPlan(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findPlanById(tenantId, id);

    const now = new Date();
    const rows = await this.db
      .update(rslShipmentPlans)
      .set({ status: 'shipped', shippedAt: now, updatedAt: now })
      .where(and(eq(rslShipmentPlans.id, id), eq(rslShipmentPlans.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // RSLプランキャンセル（status を cancelled に更新）/ 取消RSL计划（更新 status 为 cancelled）
  async cancelPlan(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findPlanById(tenantId, id);

    const now = new Date();
    const rows = await this.db
      .update(rslShipmentPlans)
      .set({ status: 'cancelled', updatedAt: now })
      .where(and(eq(rslShipmentPlans.id, id), eq(rslShipmentPlans.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
