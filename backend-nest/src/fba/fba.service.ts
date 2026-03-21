// Amazon FBAサービス / Amazon FBA服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { fbaShipmentPlans, fbaBoxes } from '../database/schema/fba.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
  shipmentPlanId?: string;
}

@Injectable()
export class FbaService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ===== 出荷プラン / 出货计划 =====

  // 出荷プラン一覧取得（テナント分離・ページネーション・ステータスフィルタ）
  // 获取出货计划列表（租户隔离・分页・状态过滤）
  async findAllPlans(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(fbaShipmentPlans.tenantId, tenantId)];

    if (query.status) {
      conditions.push(eq(fbaShipmentPlans.status, query.status));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(fbaShipmentPlans)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(fbaShipmentPlans.createdAt),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(fbaShipmentPlans)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;
    return createPaginatedResult(items, total, page, limit);
  }

  // 出荷プラン詳細取得 / 获取出货计划详情
  async findPlanById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(fbaShipmentPlans)
      .where(and(eq(fbaShipmentPlans.id, id), eq(fbaShipmentPlans.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('FBA_PLAN_NOT_FOUND', `id=${id}`);
    }
    return rows[0];
  }

  // 出荷プラン作成（ステータスは draft で初期化）/ 创建出货计划（状态初始化为 draft）
  async createPlan(tenantId: string, dto: Record<string, any>) {
    const rows = await this.db
      .insert(fbaShipmentPlans)
      .values({
        tenantId,
        ...dto,
        status: 'draft',
      })
      .returning();

    return rows[0];
  }

  // 出荷プラン更新 / 更新出货计划
  async updatePlan(tenantId: string, id: string, dto: Record<string, any>) {
    // 存在確認 / 确认存在
    await this.findPlanById(tenantId, id);

    const rows = await this.db
      .update(fbaShipmentPlans)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(fbaShipmentPlans.id, id), eq(fbaShipmentPlans.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 出荷プラン確定（status を confirmed に更新、confirmedAt を設定）
  // 确认出货计划（更新 status 为 confirmed，设置 confirmedAt）
  async confirmPlan(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findPlanById(tenantId, id);

    const now = new Date();
    const rows = await this.db
      .update(fbaShipmentPlans)
      .set({ status: 'confirmed', confirmedAt: now, updatedAt: now })
      .where(and(eq(fbaShipmentPlans.id, id), eq(fbaShipmentPlans.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ===== FBAボックス / FBA箱子 =====

  // FBAボックス一覧取得（テナント分離・ページネーション・プランフィルタ）
  // 获取FBA箱子列表（租户隔离・分页・计划过滤）
  async findAllBoxes(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(fbaBoxes.tenantId, tenantId)];

    if (query.shipmentPlanId) {
      conditions.push(eq(fbaBoxes.shipmentPlanId, query.shipmentPlanId));
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
        .orderBy(fbaBoxes.createdAt),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(fbaBoxes)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;
    return createPaginatedResult(items, total, page, limit);
  }

  // FBAボックス作成 / 创建FBA箱子
  async createBox(tenantId: string, dto: Record<string, any>) {
    const rows = await this.db
      .insert(fbaBoxes)
      .values({
        tenantId,
        ...dto,
      })
      .returning();

    return rows[0];
  }

  // FBAボックス更新 / 更新FBA箱子
  async updateBox(tenantId: string, id: string, dto: Record<string, any>) {
    // 存在確認 / 确认存在
    const existing = await this.db
      .select()
      .from(fbaBoxes)
      .where(and(eq(fbaBoxes.id, id), eq(fbaBoxes.tenantId, tenantId)))
      .limit(1);

    if (existing.length === 0) {
      throw new WmsException('FBA_BOX_NOT_FOUND', `id=${id}`);
    }

    const rows = await this.db
      .update(fbaBoxes)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(fbaBoxes.id, id), eq(fbaBoxes.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
