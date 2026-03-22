// 欠品管理サービス / 缺货记录管理服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { shortageRecords } from '../database/schema/inventory.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
  productId?: string;
}

@Injectable()
export class ShortageRecordsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 欠品一覧取得（テナント分離・ページネーション・フィルタ）
  // 获取缺货记录列表（租户隔离・分页・过滤）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [eq(shortageRecords.tenantId, tenantId)];

    if (query.status) {
      conditions.push(eq(shortageRecords.status, query.status));
    }
    if (query.productId) {
      conditions.push(eq(shortageRecords.productId, query.productId));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(shortageRecords)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(shortageRecords.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(shortageRecords)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return createPaginatedResult(items, total, page, limit);
  }

  // 欠品詳細取得 / 获取缺货记录详情
  async findById(tenantId: string, id: string) {
    const [record] = await this.db
      .select()
      .from(shortageRecords)
      .where(and(eq(shortageRecords.id, id), eq(shortageRecords.tenantId, tenantId)))
      .limit(1);

    if (!record) {
      throw new WmsException('SHORTAGE_NOT_FOUND', `Shortage record ${id} not found`);
    }

    return record;
  }

  // 欠品作成（出荷充足時に欠品検出）/ 创建缺货记录（出货拣选时检测到缺货）
  async create(tenantId: string, dto: Record<string, any>) {
    const [created] = await this.db
      .insert(shortageRecords)
      .values({
        tenantId,
        shipmentOrderId: dto.shipmentOrderId,
        productId: dto.productId,
        requestedQuantity: dto.requestedQuantity,
        availableQuantity: dto.availableQuantity,
        shortageQuantity: dto.shortageQuantity,
        status: 'pending',
      })
      .returning();

    return created;
  }

  // 欠品ステータス更新 / 更新缺货记录状态
  async update(tenantId: string, id: string, dto: Record<string, any>) {
    // 存在確認 / 存在确认
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(shortageRecords)
      .set({
        status: dto.status,
        updatedAt: new Date(),
      })
      .where(and(eq(shortageRecords.id, id), eq(shortageRecords.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // 引当済みに変更 / 标记为已预留
  async reserve(tenantId: string, id: string) {
    const record = await this.findById(tenantId, id);

    if (record.status !== 'pending') {
      throw new WmsException('SHORTAGE_INVALID_STATUS', `Cannot reserve: current status is ${record.status}`);
    }

    const [updated] = await this.db
      .update(shortageRecords)
      .set({
        status: 'reserved',
        reservedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(shortageRecords.id, id), eq(shortageRecords.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // 充足済みに変更 / 标记为已满足
  async fulfill(tenantId: string, id: string) {
    const record = await this.findById(tenantId, id);

    if (record.status !== 'reserved' && record.status !== 'pending') {
      throw new WmsException('SHORTAGE_INVALID_STATUS', `Cannot fulfill: current status is ${record.status}`);
    }

    const [updated] = await this.db
      .update(shortageRecords)
      .set({
        status: 'fulfilled',
        fulfilledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(shortageRecords.id, id), eq(shortageRecords.tenantId, tenantId)))
      .returning();

    return updated;
  }
}
