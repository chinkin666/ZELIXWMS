// 棚卸サービス / 盘点服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, isNull, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { stocktakingOrders } from '../database/schema/warehouse-ops.js';
import type { CreateStocktakingDto, UpdateStocktakingDto } from './dto/create-stocktaking.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
  warehouseId?: string;
  type?: string;
}

@Injectable()
export class StocktakingService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 棚卸一覧取得（テナント分離・ページネーション・フィルタ）/ 获取盘点列表（租户隔离・分页・筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(stocktakingOrders.tenantId, tenantId),
      isNull(stocktakingOrders.deletedAt),
    ];

    if (query.status) {
      conditions.push(eq(stocktakingOrders.status, query.status));
    }
    if (query.warehouseId) {
      conditions.push(eq(stocktakingOrders.warehouseId, query.warehouseId));
    }
    if (query.type) {
      conditions.push(eq(stocktakingOrders.type, query.type));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(stocktakingOrders).where(where).limit(limit).offset(offset).orderBy(stocktakingOrders.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(stocktakingOrders).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 棚卸ID検索 / 按ID查找盘点单
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(stocktakingOrders)
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
        isNull(stocktakingOrders.deletedAt),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('STOCKTAKING_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 棚卸作成 / 创建盘点单
  async create(tenantId: string, dto: CreateStocktakingDto) {
    // orderNumber重複チェック / orderNumber重复检查
    const existing = await this.db
      .select({ id: stocktakingOrders.id })
      .from(stocktakingOrders)
      .where(and(
        eq(stocktakingOrders.tenantId, tenantId),
        eq(stocktakingOrders.orderNumber, dto.orderNumber),
        isNull(stocktakingOrders.deletedAt),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
    }

    const rows = await this.db.insert(stocktakingOrders).values({
      tenantId,
      orderNumber: dto.orderNumber,
      type: dto.type,
      warehouseId: dto.warehouseId,
      locationIds: dto.locationIds,
      productIds: dto.productIds,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
      memo: dto.memo,
    }).returning();

    return rows[0];
  }

  // 棚卸更新 / 更新盘点单
  async update(tenantId: string, id: string, dto: UpdateStocktakingDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // orderNumber変更時の重複チェック / orderNumber变更时的重复检查
    if (dto.orderNumber) {
      const existing = await this.db
        .select({ id: stocktakingOrders.id })
        .from(stocktakingOrders)
        .where(and(
          eq(stocktakingOrders.tenantId, tenantId),
          eq(stocktakingOrders.orderNumber, dto.orderNumber),
          isNull(stocktakingOrders.deletedAt),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
      }
    }

    const updateData: Record<string, unknown> = { ...dto, updatedAt: new Date() };

    // scheduledDate文字列をDate変換 / scheduledDate字符串转Date
    if (updateData.scheduledDate !== undefined) {
      updateData.scheduledDate = updateData.scheduledDate ? new Date(updateData.scheduledDate as string) : null;
    }

    const rows = await this.db
      .update(stocktakingOrders)
      .set(updateData)
      .where(and(eq(stocktakingOrders.id, id), eq(stocktakingOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 棚卸カウント登録（itemsフィールドにカウント結果を追記）/ 登记盘点计数（将计数结果追加到items字段）
  async registerCount(tenantId: string, id: string, body: Record<string, unknown>) {
    const order = await this.findById(tenantId, id);
    if (order.status !== 'draft' && order.status !== 'in_progress') {
      throw new WmsException('STOCKTAKING_INVALID_STATUS', `Cannot register count: current status is ${order.status} / カウント登録不可: ステータスは${order.status} / 无法登记计数: 状态为${order.status}`);
    }

    const countItems = body.items as Array<{ productId: string; locationId: string; countedQuantity: number }> | undefined;
    if (!countItems || !Array.isArray(countItems) || countItems.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'items array is required / items配列は必須 / items数组必填');
    }

    // 既存のitemsにマージ / 合并到现有items
    const existingItems = Array.isArray(order.items) ? order.items : [];
    const mergedItems = [...existingItems, ...countItems.map((item) => ({
      ...item,
      countedAt: new Date().toISOString(),
    }))];

    const rows = await this.db
      .update(stocktakingOrders)
      .set({
        items: mergedItems,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(and(eq(stocktakingOrders.id, id), eq(stocktakingOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 棚卸完了（in_progress → completed）/ 完成盘点（in_progress → completed）
  async complete(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.status !== 'in_progress') {
      throw new WmsException('STOCKTAKING_INVALID_STATUS', `Cannot complete: current status is ${order.status}`);
    }

    const now = new Date();
    const rows = await this.db
      .update(stocktakingOrders)
      .set({ status: 'completed', completedAt: now, updatedAt: now })
      .where(and(eq(stocktakingOrders.id, id), eq(stocktakingOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 棚卸キャンセル（draft/in_progress → cancelled）/ 取消盘点（draft/in_progress → cancelled）
  async cancel(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new WmsException('STOCKTAKING_INVALID_STATUS', `Cannot cancel: current status is ${order.status}`);
    }

    const rows = await this.db
      .update(stocktakingOrders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(stocktakingOrders.id, id), eq(stocktakingOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 棚卸論理削除 / 盘点单软删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(stocktakingOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(stocktakingOrders.id, id), eq(stocktakingOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
