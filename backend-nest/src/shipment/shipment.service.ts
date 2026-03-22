// 出荷注文サービス / 出货订单服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, isNull, or, sql, SQL, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { shipmentOrders, shipmentOrderProducts } from '../database/schema/shipments.js';
import type { CreateShipmentOrderDto, UpdateShipmentOrderDto } from './dto/create-shipment-order.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  statusConfirmed?: boolean;
  statusShipped?: boolean;
  carrierId?: string;
  search?: string; // 注文番号・送付先名で検索 / 按订单编号・收件人名搜索
}

@Injectable()
export class ShipmentService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 出荷注文一覧取得（テナント分離・ページネーション・検索）/ 获取出货订单列表（租户隔离・分页・搜索）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(shipmentOrders.tenantId, tenantId),
      isNull(shipmentOrders.deletedAt),
    ];

    if (query.statusConfirmed !== undefined) {
      conditions.push(eq(shipmentOrders.statusConfirmed, query.statusConfirmed));
    }
    if (query.statusShipped !== undefined) {
      conditions.push(eq(shipmentOrders.statusShipped, query.statusShipped));
    }
    if (query.carrierId) {
      conditions.push(eq(shipmentOrders.carrierId, query.carrierId));
    }
    if (query.search) {
      // 注文番号または送付先名で部分一致検索 / 按订单编号或收件人名模糊搜索
      conditions.push(
        or(
          ilike(shipmentOrders.orderNumber, `%${query.search}%`),
          ilike(shipmentOrders.recipientName, `%${query.search}%`),
        )!,
      );
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(shipmentOrders).where(where).limit(limit).offset(offset).orderBy(shipmentOrders.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(shipmentOrders).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 出荷注文ID検索 / 按ID查找出货订单
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.id, id),
        eq(shipmentOrders.tenantId, tenantId),
        isNull(shipmentOrders.deletedAt),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('SHIP_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 出荷注文の商品取得 / 获取出货订单的商品
  async findProducts(tenantId: string, orderId: string) {
    // 注文の存在確認（テナント分離）/ 确认订单存在（租户隔离）
    await this.findById(tenantId, orderId);

    return this.db
      .select()
      .from(shipmentOrderProducts)
      .where(and(
        eq(shipmentOrderProducts.shipmentOrderId, orderId),
        eq(shipmentOrderProducts.tenantId, tenantId),
      ));
  }

  // 出荷注文作成 / 创建出货订单
  async create(tenantId: string, dto: CreateShipmentOrderDto) {
    // 注文番号の重複チェック / 订单编号重复检查
    const existing = await this.db
      .select({ id: shipmentOrders.id })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.orderNumber, dto.orderNumber),
        isNull(shipmentOrders.deletedAt),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
    }

    const rows = await this.db
      .insert(shipmentOrders)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // 出荷注文更新 / 更新出货订单
  async update(tenantId: string, id: string, dto: UpdateShipmentOrderDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // 注文番号変更時の重複チェック / 订单编号变更时的重复检查
    if (dto.orderNumber) {
      const existing = await this.db
        .select({ id: shipmentOrders.id })
        .from(shipmentOrders)
        .where(and(
          eq(shipmentOrders.tenantId, tenantId),
          eq(shipmentOrders.orderNumber, dto.orderNumber),
          isNull(shipmentOrders.deletedAt),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Order number: ${dto.orderNumber}`);
      }
    }

    const rows = await this.db
      .update(shipmentOrders)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 出荷注文確認（statusConfirmed=true）/ 出货订单确认（statusConfirmed=true）
  async confirm(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.statusConfirmed) {
      throw new WmsException('SHIP_INVALID_STATUS', `Order ${id} is already confirmed`);
    }
    const rows = await this.db
      .update(shipmentOrders)
      .set({ statusConfirmed: true, updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 出荷注文出荷（statusShipped=true）/ 出货订单发货（statusShipped=true）
  async ship(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);
    if (order.statusShipped) {
      throw new WmsException('SHIP_ALREADY_SHIPPED', `ID: ${id}`);
    }
    const rows = await this.db
      .update(shipmentOrders)
      .set({ statusShipped: true, updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 出荷注文一括作成 / 批量创建出货订单
  async bulkCreate(tenantId: string, orders: CreateShipmentOrderDto[]) {
    const results = [];
    for (const dto of orders) {
      const created = await this.create(tenantId, dto);
      results.push(created);
    }
    return results;
  }

  // 出荷注文一括削除（論理削除）/ 批量删除出货订单（软删除）
  async bulkDelete(tenantId: string, ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'No IDs provided');
    }
    const rows = await this.db
      .update(shipmentOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        inArray(shipmentOrders.id, ids),
        eq(shipmentOrders.tenantId, tenantId),
        isNull(shipmentOrders.deletedAt),
      ))
      .returning();
    return { deleted: rows.length, items: rows };
  }

  // 出荷注文一括部分更新（指定IDリストに共通データを適用、フィールドホワイトリスト制限）
  // 出货订单批量部分更新（对指定ID列表应用通用数据，字段白名单限制）
  async bulkPartialUpdate(tenantId: string, ids: string[], data: Record<string, unknown>) {
    if (!ids || ids.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'No IDs provided / IDが未指定 / 未提供ID');
    }

    // 更新可能フィールドのホワイトリスト / 可更新字段白名单
    const ALLOWED_FIELDS = new Set([
      'notes', 'priority', 'assignedTo', 'shippingMethod',
      'carrierCode', 'trackingNumber', 'labelUrl',
      'scheduledDate', 'tags', 'metadata',
    ]);

    const safeData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (ALLOWED_FIELDS.has(key)) {
        safeData[key] = value;
      }
    }

    if (Object.keys(safeData).length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'No valid fields to update / 更新可能なフィールドがありません / 没有可更新的字段');
    }

    const rows = await this.db
      .update(shipmentOrders)
      .set({ ...safeData, updatedAt: new Date() })
      .where(and(
        inArray(shipmentOrders.id, ids),
        eq(shipmentOrders.tenantId, tenantId),
        isNull(shipmentOrders.deletedAt),
      ))
      .returning();

    return { updated: rows.length, items: rows };
  }

  // 出荷注文ID一括取得 / 按ID批量获取出货订单
  async findByIds(tenantId: string, ids: string[]) {
    if (!ids || ids.length === 0) {
      return { items: [] };
    }

    const rows = await this.db
      .select()
      .from(shipmentOrders)
      .where(and(
        inArray(shipmentOrders.id, ids),
        eq(shipmentOrders.tenantId, tenantId),
        isNull(shipmentOrders.deletedAt),
      ));

    return { items: rows };
  }

  // 出荷注文ステータス変更（単一）/ 出货订单状态变更（单个）
  async changeStatus(tenantId: string, id: string, status: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // ステータスフラグマッピング / 状态标志映射
    const statusMap: Record<string, Record<string, unknown>> = {
      confirmed: { statusConfirmed: true, statusConfirmedAt: new Date() },
      shipped: { statusShipped: true, statusShippedAt: new Date() },
      held: { statusHeld: true, statusHeldAt: new Date() },
      printed: { statusPrinted: true, statusPrintedAt: new Date() },
      inspected: { statusInspected: true, statusInspectedAt: new Date() },
      carrier_received: { statusCarrierReceived: true, statusCarrierReceivedAt: new Date() },
      ec_exported: { statusEcExported: true, statusEcExportedAt: new Date() },
    };

    const fields = statusMap[status];
    if (!fields) {
      throw new WmsException('SHIP_INVALID_STATUS', `Unknown status: ${status} / 不明なステータス / 未知状态`);
    }

    const rows = await this.db
      .update(shipmentOrders)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 出荷注文一括ステータス変更 / 出货订单批量状态变更
  async bulkChangeStatus(tenantId: string, ids: string[], status: string) {
    if (!ids || ids.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'No IDs provided / IDが未指定 / 未提供ID');
    }

    const results = [];
    for (const id of ids) {
      const result = await this.changeStatus(tenantId, id, status);
      results.push(result);
    }

    return { updated: results.length, items: results };
  }

  // 配送業者受領インポート（受領データをパースしてtrackingId等を更新）
  // 配送业者回单导入（解析回单数据后更新trackingId等）
  async importCarrierReceipts(tenantId: string, body: Record<string, unknown>) {
    const receipts = body.receipts as Array<{ orderNumber: string; trackingId: string; [key: string]: unknown }> | undefined;
    if (!receipts || !Array.isArray(receipts) || receipts.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'receipts array is required / receipts配列は必須 / receipts数组必填');
    }

    const results = [];
    for (const receipt of receipts) {
      if (!receipt.orderNumber || !receipt.trackingId) {
        continue;
      }

      // 注文番号で検索 / 按订单号搜索
      const [order] = await this.db
        .select({ id: shipmentOrders.id })
        .from(shipmentOrders)
        .where(and(
          eq(shipmentOrders.tenantId, tenantId),
          eq(shipmentOrders.orderNumber, receipt.orderNumber),
          isNull(shipmentOrders.deletedAt),
        ))
        .limit(1);

      if (!order) {
        results.push({ orderNumber: receipt.orderNumber, status: 'not_found' });
        continue;
      }

      // trackingId更新 + statusCarrierReceived / 更新trackingId + statusCarrierReceived
      const now = new Date();
      await this.db
        .update(shipmentOrders)
        .set({
          trackingId: receipt.trackingId,
          statusCarrierReceived: true,
          statusCarrierReceivedAt: now,
          updatedAt: now,
        })
        .where(and(eq(shipmentOrders.id, order.id), eq(shipmentOrders.tenantId, tenantId)));

      results.push({ orderNumber: receipt.orderNumber, status: 'updated', trackingId: receipt.trackingId });
    }

    return { processed: results.length, results };
  }

  // グループ別件数取得（ステータス別集計）/ 获取分组计数（按状态汇总）
  async getGroupCounts(tenantId: string) {
    const rows = await this.db
      .select({
        statusConfirmed: shipmentOrders.statusConfirmed,
        statusShipped: shipmentOrders.statusShipped,
        statusHeld: shipmentOrders.statusHeld,
        count: sql<number>`count(*)::int`,
      })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        isNull(shipmentOrders.deletedAt),
      ))
      .groupBy(shipmentOrders.statusConfirmed, shipmentOrders.statusShipped, shipmentOrders.statusHeld);

    // 集計をわかりやすい形に変換 / 将汇总转换为易懂的形式
    let total = 0;
    let confirmed = 0;
    let shipped = 0;
    let held = 0;
    let pending = 0;

    for (const row of rows) {
      total += row.count;
      if (row.statusShipped) shipped += row.count;
      if (row.statusConfirmed && !row.statusShipped) confirmed += row.count;
      if (row.statusHeld) held += row.count;
      if (!row.statusConfirmed && !row.statusShipped) pending += row.count;
    }

    return { groups: { total, pending, confirmed, shipped, held } };
  }

  // 出荷注文エクスポート（CSV形式のバッファを返す）/ 出货订单导出（返回CSV格式buffer）
  async exportOrders(tenantId: string) {
    const items = await this.db
      .select()
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        isNull(shipmentOrders.deletedAt),
      ))
      .orderBy(shipmentOrders.createdAt);

    // CSVヘッダー / CSV头部
    const headers = [
      'orderNumber', 'recipientName', 'recipientPostalCode', 'recipientPrefecture',
      'recipientCity', 'recipientStreet', 'recipientPhone', 'trackingId',
      'carrierId', 'statusConfirmed', 'statusShipped', 'createdAt',
    ];

    const csvLines = [headers.join(',')];
    for (const item of items) {
      const row = headers.map((h) => {
        const val = (item as Record<string, unknown>)[h];
        const str = val === null || val === undefined ? '' : String(val);
        // カンマやクォートを含む場合はエスケープ / 包含逗号或引号时转义
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      });
      csvLines.push(row.join(','));
    }

    return {
      filename: `shipment-orders-${new Date().toISOString().slice(0, 10)}.csv`,
      contentType: 'text/csv',
      data: csvLines.join('\n'),
      totalRows: items.length,
    };
  }

  // 追跡情報取得（trackingId + キャリアデータを返す）/ 获取跟踪信息（返回trackingId + 配送商数据）
  async getTracking(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingId: order.trackingId,
      carrierId: order.carrierId,
      statusShipped: order.statusShipped,
      statusShippedAt: order.statusShippedAt,
      statusCarrierReceived: order.statusCarrierReceived,
      statusCarrierReceivedAt: order.statusCarrierReceivedAt,
      carrierData: order.carrierData,
      // 追跡イベントは配送業者APIから取得（将来実装）/ 追踪事件从配送商API获取（将来实现）
      events: [],
    };
  }

  // 出荷注文論理削除 / 出货订单软删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(shipmentOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
