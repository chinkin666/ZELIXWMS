// 棚卸オーダーサービス / 盘点订单服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, desc, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { stocktakingOrders } from '../database/schema/warehouse-ops.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

// 検索クエリ / 查询参数
interface FindStocktakingQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

@Injectable()
export class StocktakingOrdersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 一覧取得（テナント分離・ページネーション）/ 获取列表（租户隔离・分页）
  async findAll(tenantId: string, query: FindStocktakingQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(stocktakingOrders.tenantId, tenantId),
    ];

    if (query.status) {
      conditions.push(eq(stocktakingOrders.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(stocktakingOrders.type, query.type));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(stocktakingOrders)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(stocktakingOrders.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(stocktakingOrders)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ID検索 / 按ID查找
  async findOne(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(stocktakingOrders)
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('STOCKTAKING_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    // 注文番号の自動生成 / 自动生成订单号
    const orderNumber = dto.orderNumber as string || `STK-${Date.now()}`;

    const rows = await this.db
      .insert(stocktakingOrders)
      .values({
        tenantId,
        orderNumber,
        type: dto.type as string,
        status: 'draft',
        warehouseId: dto.warehouseId as string,
        locationIds: dto.locationIds ?? [],
        productIds: dto.productIds ?? [],
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate as string) : null,
        memo: dto.memo as string ?? null,
        items: dto.items ?? [],
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
      .update(stocktakingOrders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // 削除（論理削除）/ 删除（软删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    const rows = await this.db
      .update(stocktakingOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // カウント登録（棚卸明細にカウント結果を追加）/ 登记计数（在盘点明细中添加计数结果）
  async registerCount(tenantId: string, id: string, body: Record<string, unknown>) {
    const order = await this.findOne(tenantId, id);

    // ステータスチェック / 状态检查
    if (order.status !== 'draft' && order.status !== 'in_progress') {
      throw new WmsException('STOCKTAKING_INVALID_STATUS', `Cannot register count for status: ${order.status}`);
    }

    // 既存のitemsにカウント結果を追加/更新 / 在现有items中添加/更新计数结果
    const existingItems = Array.isArray(order.items) ? [...order.items] : [];
    const countData = body.items ?? body;

    // 新しいカウントデータを追加 / 添加新的计数数据
    const updatedItems = Array.isArray(countData)
      ? [...existingItems, ...countData as unknown[]]
      : [...existingItems, countData];

    const rows = await this.db
      .update(stocktakingOrders)
      .set({
        items: updatedItems,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // 完了 / 完成
  async complete(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);

    // ステータスチェック / 状态检查
    if (order.status !== 'in_progress') {
      throw new WmsException('STOCKTAKING_INVALID_STATUS', `Cannot complete from status: ${order.status}`);
    }

    const rows = await this.db
      .update(stocktakingOrders)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .returning();

    // TODO: 棚卸完了時に stocktaking_discrepancies テーブルへ差異データを自動生成する
    // TODO: 盘点完成时自动向 stocktaking_discrepancies 表生成差异数据
    // 比較: items内のcountedQuantity vs inventoryのsystemQuantity → discrepancy レコード作成
    // 对比: items中的countedQuantity vs inventory的systemQuantity → 创建discrepancy记录

    return rows[0];
  }

  // キャンセル / 取消
  async cancel(tenantId: string, id: string) {
    const order = await this.findOne(tenantId, id);

    // 完了済みはキャンセル不可 / 已完成的不可取消
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new WmsException('STOCKTAKING_INVALID_STATUS', `Cannot cancel from status: ${order.status}`);
    }

    const rows = await this.db
      .update(stocktakingOrders)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(and(
        eq(stocktakingOrders.id, id),
        eq(stocktakingOrders.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }
}
