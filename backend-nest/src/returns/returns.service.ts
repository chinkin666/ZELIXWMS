// 返品サービス / 退货服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, isNull, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { returnOrders, returnOrderLines } from '../database/schema/returns.js';
import type { CreateReturnOrderDto, UpdateReturnOrderDto } from './dto/create-return-order.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
}

@Injectable()
export class ReturnsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 返品オーダー一覧取得（テナント分離・ページネーション・フィルタ）/ 获取退货订单列表（租户隔离・分页・过滤）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(returnOrders.tenantId, tenantId),
      isNull(returnOrders.deletedAt),
    ];

    if (query.status) {
      conditions.push(eq(returnOrders.status, query.status));
    }
    if (query.clientId) {
      conditions.push(eq(returnOrders.clientId, query.clientId));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(returnOrders)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(returnOrders.createdAt),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(returnOrders)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 返品オーダーID検索（テナント分離・論理削除除外）/ 按ID查找退货订单（租户隔离・排除软删除）
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(returnOrders)
      .where(
        and(
          eq(returnOrders.id, id),
          eq(returnOrders.tenantId, tenantId),
          isNull(returnOrders.deletedAt),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('RETURN_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 返品オーダー明細行取得 / 获取退货订单明细行
  async findLines(tenantId: string, orderId: string) {
    // 親オーダー存在確認 / 确认父订单存在
    await this.findById(tenantId, orderId);

    return this.db
      .select()
      .from(returnOrderLines)
      .where(
        and(
          eq(returnOrderLines.returnOrderId, orderId),
          eq(returnOrderLines.tenantId, tenantId),
        ),
      )
      .orderBy(returnOrderLines.createdAt);
  }

  // 返品オーダー作成 / 创建退货订单
  async create(tenantId: string, dto: CreateReturnOrderDto) {
    // orderNumber 重複チェック / orderNumber 重复检查
    const existing = await this.db
      .select({ id: returnOrders.id })
      .from(returnOrders)
      .where(
        and(
          eq(returnOrders.tenantId, tenantId),
          eq(returnOrders.orderNumber, dto.orderNumber),
          isNull(returnOrders.deletedAt),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
    }

    const rows = await this.db
      .insert(returnOrders)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // 返品オーダー更新 / 更新退货订单
  async update(tenantId: string, id: string, dto: UpdateReturnOrderDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // orderNumber 変更時の重複チェック / orderNumber 变更时的重复检查
    if (dto.orderNumber) {
      const existing = await this.db
        .select({ id: returnOrders.id })
        .from(returnOrders)
        .where(
          and(
            eq(returnOrders.tenantId, tenantId),
            eq(returnOrders.orderNumber, dto.orderNumber),
            isNull(returnOrders.deletedAt),
          ),
        )
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
      }
    }

    const rows = await this.db
      .update(returnOrders)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(returnOrders.id, id), eq(returnOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 返品オーダー受領（draft → inspecting）/ 退货订单收货（draft → inspecting）
  async receive(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.status !== 'draft') {
      throw new WmsException('RETURN_INVALID_STATUS', `Cannot receive: current status is ${order.status}`);
    }
    const rows = await this.db
      .update(returnOrders)
      .set({ status: 'inspecting', updatedAt: new Date() })
      .where(and(eq(returnOrders.id, id), eq(returnOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 返品オーダー完了（inspecting → completed）/ 退货订单完成（inspecting → completed）
  async complete(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.status !== 'inspecting') {
      throw new WmsException('RETURN_INVALID_STATUS', `Cannot complete: current status is ${order.status}`);
    }
    const rows = await this.db
      .update(returnOrders)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(and(eq(returnOrders.id, id), eq(returnOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 返品オーダーキャンセル（any → cancelled）/ 退货订单取消（any → cancelled）
  async cancel(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.status === 'completed' || order.status === 'cancelled') {
      throw new WmsException('RETURN_INVALID_STATUS', `Cannot cancel: current status is ${order.status}`);
    }
    const rows = await this.db
      .update(returnOrders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(returnOrders.id, id), eq(returnOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 返品オーダー論理削除 / 退货订单软删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(returnOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(returnOrders.id, id), eq(returnOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
