// FBA出荷プランサービス / FBA出货计划服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, desc, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { fbaShipmentPlans, fbaBoxes } from '../database/schema/fba.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

// 検索クエリ / 查询参数
interface FindFbaPlansQuery {
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class FbaShipmentPlansService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 一覧取得（テナント分離・ページネーション）/ 获取列表（租户隔离・分页）
  async findAll(tenantId: string, query: FindFbaPlansQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(fbaShipmentPlans.tenantId, tenantId),
    ];

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
        .orderBy(desc(fbaShipmentPlans.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(fbaShipmentPlans)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ID検索 / 按ID查找
  async findOne(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(fbaShipmentPlans)
      .where(and(
        eq(fbaShipmentPlans.id, id),
        eq(fbaShipmentPlans.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('FBA_PLAN_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(fbaShipmentPlans)
      .values({
        tenantId,
        planName: dto.planName as string,
        status: 'draft',
        amazonShipmentId: dto.amazonShipmentId as string ?? null,
        destinationFulfillmentCenter: dto.destinationFulfillmentCenter as string ?? null,
        shipToAddress: dto.shipToAddress ?? null,
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
      .update(fbaShipmentPlans)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(fbaShipmentPlans.id, id),
        eq(fbaShipmentPlans.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // 削除 / 删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    const rows = await this.db
      .delete(fbaShipmentPlans)
      .where(and(
        eq(fbaShipmentPlans.id, id),
        eq(fbaShipmentPlans.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // プラン提出（draft → confirmed）/ 提交计划（draft → confirmed）
  async submit(tenantId: string, id: string) {
    const plan = await this.findOne(tenantId, id);

    // ステータスチェック / 状态检查
    if (plan.status !== 'draft') {
      throw new WmsException('SHIP_INVALID_STATUS', `Cannot submit from status: ${plan.status}`);
    }

    const rows = await this.db
      .update(fbaShipmentPlans)
      .set({
        status: 'confirmed',
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(fbaShipmentPlans.id, id),
        eq(fbaShipmentPlans.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // ラベル取得（プランに紐づくボックスのラベル情報を返す）/ 获取标签（返回计划关联的箱子标签信息）
  async getLabels(tenantId: string, id: string) {
    // プラン存在確認 / 确认计划存在
    const plan = await this.findOne(tenantId, id);

    // プランに紐づくボックス取得 / 获取计划关联的箱子
    const boxes = await this.db
      .select()
      .from(fbaBoxes)
      .where(and(
        eq(fbaBoxes.shipmentPlanId, id),
        eq(fbaBoxes.tenantId, tenantId),
      ))
      .orderBy(fbaBoxes.boxNumber);

    // ラベルデータ生成 / 生成标签数据
    const labels = boxes.map((box: any) => ({
      boxId: box.id,
      boxNumber: box.boxNumber,
      trackingNumber: box.trackingNumber,
      weight: box.weight,
      dimensions: box.dimensions,
      items: box.items,
      shipmentId: plan.amazonShipmentId,
      destination: plan.destinationFulfillmentCenter,
    }));

    return { planId: id, planName: plan.planName, labels };
  }
}
