// 入庫サービス / 入库服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, isNull, sql, SQL, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { inboundOrders, inboundOrderLines } from '../database/schema/inbound.js';
import type { CreateInboundOrderDto, UpdateInboundOrderDto } from './dto/create-inbound-order.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
  warehouseId?: string;
  flowType?: string;
}

@Injectable()
export class InboundService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 入庫オーダー一覧取得（テナント分離・ページネーション・フィルタ）/ 获取入库订单列表（租户隔离・分页・筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(inboundOrders.tenantId, tenantId),
      isNull(inboundOrders.deletedAt),
    ];

    if (query.status) {
      conditions.push(eq(inboundOrders.status, query.status));
    }
    if (query.clientId) {
      conditions.push(eq(inboundOrders.clientId, query.clientId));
    }
    if (query.warehouseId) {
      conditions.push(eq(inboundOrders.warehouseId, query.warehouseId));
    }
    if (query.flowType) {
      conditions.push(eq(inboundOrders.flowType, query.flowType));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(inboundOrders).where(where).limit(limit).offset(offset).orderBy(inboundOrders.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(inboundOrders).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 入庫オーダーID検索 / 按ID查找入库订单
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(inboundOrders)
      .where(and(
        eq(inboundOrders.id, id),
        eq(inboundOrders.tenantId, tenantId),
        isNull(inboundOrders.deletedAt),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('INBOUND_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 入庫オーダー作成 / 创建入库订单
  async create(tenantId: string, dto: CreateInboundOrderDto) {
    // 注文番号重複チェック / 订单号重复检查
    const existing = await this.db
      .select({ id: inboundOrders.id })
      .from(inboundOrders)
      .where(and(
        eq(inboundOrders.tenantId, tenantId),
        eq(inboundOrders.orderNumber, dto.orderNumber),
        isNull(inboundOrders.deletedAt),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
    }

    const insertData = {
      tenantId,
      ...dto,
    };

    const rows = await this.db.insert(inboundOrders).values(insertData).returning();
    return rows[0];
  }

  // 入庫オーダー更新 / 更新入库订单
  async update(tenantId: string, id: string, dto: UpdateInboundOrderDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // 注文番号変更時の重複チェック / 订单号变更时的重复检查
    if (dto.orderNumber) {
      const existing = await this.db
        .select({ id: inboundOrders.id })
        .from(inboundOrders)
        .where(and(
          eq(inboundOrders.tenantId, tenantId),
          eq(inboundOrders.orderNumber, dto.orderNumber),
          isNull(inboundOrders.deletedAt),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
      }
    }

    const updateData: Record<string, unknown> = { ...dto, updatedAt: new Date() };

    const rows = await this.db
      .update(inboundOrders)
      .set(updateData)
      .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 入庫オーダー論理削除 / 入库订单软删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(inboundOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 入庫オーダー確認（draft → confirmed）/ 入库订单确认（draft → confirmed）
  async confirm(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.status !== 'draft') {
      throw new WmsException('INBOUND_INVALID_STATUS', `Cannot confirm: current status is ${order.status}`);
    }
    const rows = await this.db
      .update(inboundOrders)
      .set({ status: 'confirmed', updatedAt: new Date() })
      .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 入庫オーダー入荷開始（confirmed → receiving）/ 入库订单开始收货（confirmed → receiving）
  async receive(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.status !== 'confirmed') {
      throw new WmsException('INBOUND_INVALID_STATUS', `Cannot receive: current status is ${order.status}`);
    }
    const rows = await this.db
      .update(inboundOrders)
      .set({ status: 'receiving', updatedAt: new Date() })
      .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 入庫オーダー完了（receiving → done）/ 入库订单完成（receiving → done）
  async complete(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.status !== 'receiving') {
      throw new WmsException('INBOUND_INVALID_STATUS', `Cannot complete: current status is ${order.status}`);
    }
    const rows = await this.db
      .update(inboundOrders)
      .set({ status: 'done', updatedAt: new Date() })
      .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 入庫オーダーキャンセル（any → cancelled、done/cancelled 除外）/ 入库订单取消（any → cancelled、排除 done/cancelled）
  async cancel(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.status === 'done' || order.status === 'cancelled') {
      throw new WmsException('INBOUND_INVALID_STATUS', `Cannot cancel: current status is ${order.status}`);
    }
    const rows = await this.db
      .update(inboundOrders)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 入庫オーダー明細行取得 / 获取入库订单明细行
  async findLines(tenantId: string, orderId: string) {
    // 親オーダー存在確認 / 确认父订单存在
    await this.findById(tenantId, orderId);

    const rows = await this.db
      .select()
      .from(inboundOrderLines)
      .where(and(
        eq(inboundOrderLines.inboundOrderId, orderId),
        eq(inboundOrderLines.tenantId, tenantId),
      ))
      .orderBy(inboundOrderLines.createdAt);

    return rows;
  }

  // 入庫オーダー一括入荷（明細行のreceivedQuantityを一括更新）
  // 入库订单批量收货（批量更新明细行的receivedQuantity）
  async bulkReceive(tenantId: string, id: string, body: Record<string, unknown>) {
    const order = await this.findById(tenantId, id);
    if (order.status !== 'confirmed' && order.status !== 'receiving') {
      throw new WmsException('INBOUND_INVALID_STATUS', `Cannot bulk receive: current status is ${order.status}`);
    }

    const lines = body.lines as Array<{ lineId: string; receivedQuantity: number; damagedQuantity?: number }> | undefined;
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'lines array is required / lines配列は必須 / lines数组必填');
    }

    const now = new Date();
    const results = [];

    for (const line of lines) {
      if (!line.lineId || line.receivedQuantity === undefined) {
        continue;
      }

      const updateData: Record<string, unknown> = {
        receivedQuantity: line.receivedQuantity,
        updatedAt: now,
      };
      if (line.damagedQuantity !== undefined) {
        updateData.damagedQuantity = line.damagedQuantity;
      }

      const [updated] = await this.db
        .update(inboundOrderLines)
        .set(updateData)
        .where(and(
          eq(inboundOrderLines.id, line.lineId),
          eq(inboundOrderLines.inboundOrderId, id),
          eq(inboundOrderLines.tenantId, tenantId),
        ))
        .returning();

      if (updated) {
        results.push(updated);
      }
    }

    // ステータスをreceivingに更新（まだでなければ）/ 将状态更新为receiving（如果还不是）
    if (order.status === 'confirmed') {
      await this.db.update(inboundOrders)
        .set({ status: 'receiving', updatedAt: now })
        .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)));
    }

    return { updated: results.length, lines: results };
  }

  // 入庫オーダー棚入れ（明細行のputawayLocationIdとputawayQuantityを更新）
  // 入库订单上架（更新明细行的putawayLocationId和putawayQuantity）
  async putaway(tenantId: string, id: string, body: Record<string, unknown>) {
    await this.findById(tenantId, id);

    const lines = body.lines as Array<{ lineId: string; putawayLocationId: string; putawayQuantity: number }> | undefined;
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'lines array is required / lines配列は必須 / lines数组必填');
    }

    const now = new Date();
    const results = [];

    for (const line of lines) {
      if (!line.lineId || !line.putawayLocationId || !line.putawayQuantity) {
        continue;
      }

      const [updated] = await this.db
        .update(inboundOrderLines)
        .set({
          putawayLocationId: line.putawayLocationId,
          putawayQuantity: line.putawayQuantity,
          updatedAt: now,
        })
        .where(and(
          eq(inboundOrderLines.id, line.lineId),
          eq(inboundOrderLines.inboundOrderId, id),
          eq(inboundOrderLines.tenantId, tenantId),
        ))
        .returning();

      if (updated) {
        results.push(updated);
      }
    }

    return { updated: results.length, lines: results };
  }

  // 入庫オーダー差異取得（expectedQuantity vs receivedQuantityの差異）
  // 获取入库订单差异（expectedQuantity vs receivedQuantity的差异）
  async getVariance(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const lines = await this.db
      .select({
        lineId: inboundOrderLines.id,
        productSku: inboundOrderLines.productSku,
        expectedQuantity: inboundOrderLines.expectedQuantity,
        receivedQuantity: inboundOrderLines.receivedQuantity,
        damagedQuantity: inboundOrderLines.damagedQuantity,
        variance: sql<number>`(${inboundOrderLines.receivedQuantity} - ${inboundOrderLines.expectedQuantity})::int`,
      })
      .from(inboundOrderLines)
      .where(and(
        eq(inboundOrderLines.inboundOrderId, id),
        eq(inboundOrderLines.tenantId, tenantId),
      ))
      .orderBy(inboundOrderLines.createdAt);

    const totalExpected = lines.reduce((s: number, l: any) => s + (l.expectedQuantity ?? 0), 0);
    const totalReceived = lines.reduce((s: number, l: any) => s + (l.receivedQuantity ?? 0), 0);
    const totalDamaged = lines.reduce((s: number, l: any) => s + (l.damagedQuantity ?? 0), 0);

    return {
      orderId: id,
      items: lines,
      total: lines.length,
      totalExpected,
      totalReceived,
      totalDamaged,
      totalVariance: totalReceived - totalExpected,
    };
  }

  // 入庫履歴取得（完了/キャンセル済みオーダーのページネーション）
  // 获取入库历史（已完成/取消的订单分页）
  async getHistory(tenantId: string, query: { page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [
      eq(inboundOrders.tenantId, tenantId),
      isNull(inboundOrders.deletedAt),
      sql`${inboundOrders.status} IN ('done', 'cancelled')`,
    ];

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(inboundOrders).where(where).limit(limit).offset(offset).orderBy(sql`${inboundOrders.updatedAt} DESC`),
      this.db.select({ count: sql<number>`count(*)::int` }).from(inboundOrders).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 入庫インポート（CSV/JSONボディをパースして一括挿入）
  // 入库导入（解析CSV/JSON body后批量插入）
  async importOrders(tenantId: string, body: { orders: Record<string, any>[] }) {
    const { orders } = body;
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'orders array is required / orders配列は必須 / orders数组必填');
    }

    const results = [];
    for (const dto of orders) {
      const created = await this.create(tenantId, dto as CreateInboundOrderDto);
      results.push(created);
    }

    return { imported: results.length, items: results };
  }

  // 入庫エクスポート（CSV形式のバッファを返す）/ 入库导出（返回CSV格式buffer）
  async exportOrders(tenantId: string) {
    const items = await this.db
      .select()
      .from(inboundOrders)
      .where(and(
        eq(inboundOrders.tenantId, tenantId),
        isNull(inboundOrders.deletedAt),
      ))
      .orderBy(inboundOrders.createdAt);

    const headers = ['orderNumber', 'status', 'flowType', 'clientId', 'warehouseId', 'expectedDate', 'notes', 'createdAt'];
    const csvLines = [headers.join(',')];

    for (const item of items) {
      const row = headers.map((h) => {
        const val = (item as Record<string, unknown>)[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      });
      csvLines.push(row.join(','));
    }

    return {
      filename: `inbound-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv',
      data: csvLines.join('\n'),
      totalRows: items.length,
    };
  }
}
