// 出荷注文サービス / 出货订单服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, isNull, or, sql, SQL, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { shipmentOrders, shipmentOrderProducts, orderGroups } from '../database/schema/shipments.js';
import { stockQuants, locations } from '../database/schema/inventory.js';
import { products } from '../database/schema/products.js';
import type { CreateShipmentOrderDto, UpdateShipmentOrderDto } from './dto/create-shipment-order.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

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
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

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

  // ============================================
  // 出荷停止 / 出货停止
  // ============================================

  // 出荷停止（指定IDの注文を保留に設定、出荷済みは除外）
  // 出货停止（将指定ID的订单设为保留，已出货的除外）
  async stopOrders(tenantId: string, ids: string[], reason: string) {
    if (!ids || ids.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'No IDs provided / IDが未指定 / 未提供ID');
    }
    if (!reason || reason.trim().length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'Reason is required / 理由は必須 / 理由为必填');
    }

    const now = new Date();

    // 対象注文を先に取得してcustomFieldsをマージ / 先获取目标订单以合并customFields
    const targets = await this.db
      .select({ id: shipmentOrders.id, customFields: shipmentOrders.customFields })
      .from(shipmentOrders)
      .where(and(
        inArray(shipmentOrders.id, ids),
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusShipped, false),
        isNull(shipmentOrders.deletedAt),
      ));

    const results = [];
    for (const target of targets) {
      const existing = (target.customFields as Record<string, unknown>) || {};
      const merged = { ...existing, holdReason: reason.trim() };
      const [updated] = await this.db
        .update(shipmentOrders)
        .set({
          statusHeld: true,
          statusHeldAt: now,
          customFields: merged,
          updatedAt: now,
        })
        .where(and(
          eq(shipmentOrders.id, target.id),
          eq(shipmentOrders.tenantId, tenantId),
          eq(shipmentOrders.statusShipped, false),
          isNull(shipmentOrders.deletedAt),
        ))
        .returning();
      if (updated) results.push(updated);
    }

    return { stopped: results.length, items: results };
  }

  // 出荷停止解除（保留フラグをリセット）
  // 出货停止解除（重置保留标志）
  async releaseStoppedOrders(tenantId: string, ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'No IDs provided / IDが未指定 / 未提供ID');
    }

    const rows = await this.db
      .update(shipmentOrders)
      .set({
        statusHeld: false,
        updatedAt: new Date(),
      })
      .where(and(
        inArray(shipmentOrders.id, ids),
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusHeld, true),
        isNull(shipmentOrders.deletedAt),
      ))
      .returning();

    return { released: rows.length, items: rows };
  }

  // 出荷停止一覧（保留中の注文を全件取得）
  // 出货停止列表（获取所有保留中的订单）
  async findStoppedOrders(tenantId: string) {
    const rows = await this.db
      .select()
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusHeld, true),
        isNull(shipmentOrders.deletedAt),
      ))
      .orderBy(shipmentOrders.statusHeldAt);

    return { items: rows, total: rows.length };
  }

  // 注文番号で出荷停止（CSV一括停止用）
  // 按订单编号出货停止（用于CSV批量停止）
  async stopOrdersByNumbers(tenantId: string, orderNumbers: string[], reason: string) {
    if (!orderNumbers || orderNumbers.length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'No order numbers provided / 注文番号が未指定 / 未提供订单编号');
    }
    if (!reason || reason.trim().length === 0) {
      throw new WmsException('VALIDATION_ERROR', 'Reason is required / 理由は必須 / 理由为必填');
    }

    // 注文番号からIDを検索 / 按订单编号查找ID
    const orders = await this.db
      .select({ id: shipmentOrders.id, orderNumber: shipmentOrders.orderNumber })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        inArray(shipmentOrders.orderNumber, orderNumbers),
        eq(shipmentOrders.statusShipped, false),
        isNull(shipmentOrders.deletedAt),
      ));

    if (orders.length === 0) {
      return { stopped: 0, items: [], notFound: orderNumbers };
    }

    const ids = orders.map((o) => o.id);
    const foundNumbers = new Set(orders.map((o) => o.orderNumber));
    const notFound = orderNumbers.filter((n) => !foundNumbers.has(n));

    const result = await this.stopOrders(tenantId, ids, reason);
    return { ...result, notFound };
  }

  // ============================================
  // 送り状再発行・追加発行 / 运单重新发行・追加发行
  // ============================================

  // 送り状再発行（同一追跡番号で再印刷）/ 运单重新发行（使用相同追踪号重新打印）
  async reissueLabel(tenantId: string, id: string) {
    const order = await this.findById(tenantId, id);

    // 追跡番号が未設定の場合は再発行不可 / 追踪号未设置时不可重新发行
    if (!order.trackingId) {
      throw new WmsException('SHIP_INVALID_STATUS', 'No tracking ID assigned, cannot reissue label / 追跡番号が未設定のため再発行不可 / 未分配追踪号，无法重新发行');
    }

    // 印刷ステータスを更新 / 更新打印状态
    const now = new Date();
    const rows = await this.db
      .update(shipmentOrders)
      .set({
        statusPrinted: true,
        statusPrintedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(shipmentOrders.id, id),
        eq(shipmentOrders.tenantId, tenantId),
        sql`${shipmentOrders.trackingId} IS NOT NULL`,
      ))
      .returning();

    return {
      order: rows[0],
      reissuedAt: now,
      trackingId: order.trackingId,
      type: 'reissue' as const,
    };
  }

  // 追加発行（追加個口用の送り状発行）/ 追加发行（追加包裹用的运单发行）
  async issueAdditionalLabel(tenantId: string, id: string, body: { parcelCount: number }) {
    const order = await this.findById(tenantId, id);

    // 追跡番号が未設定の場合は追加発行不可 / 追踪号未设置时不可追加发行
    if (!order.trackingId) {
      throw new WmsException('SHIP_INVALID_STATUS', 'No tracking ID assigned, cannot issue additional label / 追跡番号が未設定のため追加発行不可 / 未分配追踪号，无法追加发行');
    }

    // 個口数バリデーション / 包裹数验证
    if (!body.parcelCount || body.parcelCount < 1) {
      throw new WmsException('VALIDATION_ERROR', 'parcelCount must be at least 1 / 個口数は1以上必須 / 包裹数至少为1');
    }

    // carrierDataにparcelCount情報を追記（既存データを維持）
    // 在carrierData中追加parcelCount信息（保留现有数据）
    const now = new Date();
    const existingCarrierData = (order.carrierData as Record<string, unknown>) ?? {};
    const updatedCarrierData = {
      ...existingCarrierData,
      parcelCount: body.parcelCount,
      additionalLabelIssuedAt: now.toISOString(),
    };

    const rows = await this.db
      .update(shipmentOrders)
      .set({
        carrierData: updatedCarrierData,
        statusPrinted: true,
        statusPrintedAt: now,
        updatedAt: now,
      })
      .where(and(eq(shipmentOrders.id, id), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return {
      order: rows[0],
      issuedAt: now,
      trackingId: order.trackingId,
      parcelCount: body.parcelCount,
      type: 'additional' as const,
    };
  }

  // ============================================
  // ピッキングリスト生成 / 拣货清单生成
  // ============================================

  // トータルピッキング: 全注文の商品をロケーション別に集約
  // 总拣货: 将所有订单的商品按库位汇总
  private async generateTotalPickingList(tenantId: string, orderIds: string[]) {
    const rows = await this.db
      .select({
        productSku: shipmentOrderProducts.productSku,
        productName: shipmentOrderProducts.productName,
        locationCode: locations.code,
        quantity: shipmentOrderProducts.quantity,
        shipmentOrderId: shipmentOrderProducts.shipmentOrderId,
      })
      .from(shipmentOrderProducts)
      .innerJoin(stockQuants, and(
        eq(stockQuants.productId, shipmentOrderProducts.productId),
        eq(stockQuants.tenantId, tenantId),
      ))
      .innerJoin(locations, eq(locations.id, stockQuants.locationId))
      .where(and(
        eq(shipmentOrderProducts.tenantId, tenantId),
        inArray(shipmentOrderProducts.shipmentOrderId, orderIds),
      ));

    // 商品SKU + ロケーションコードでグルーピング / 按商品SKU + 库位编码分组
    const grouped = new Map<string, {
      productSku: string | null;
      productName: string | null;
      locationCode: string;
      totalQuantity: number;
      orderIds: Set<string>;
    }>();

    for (const row of rows) {
      const key = `${row.productSku ?? ''}::${row.locationCode}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.totalQuantity += row.quantity;
        existing.orderIds.add(row.shipmentOrderId);
      } else {
        grouped.set(key, {
          productSku: row.productSku,
          productName: row.productName,
          locationCode: row.locationCode,
          totalQuantity: row.quantity,
          orderIds: new Set([row.shipmentOrderId]),
        });
      }
    }

    // ロケーションコード順にソート（歩行効率化）/ 按库位编码排序（提高行走效率）
    const items = Array.from(grouped.values())
      .map((g) => ({
        productSku: g.productSku,
        productName: g.productName,
        locationCode: g.locationCode,
        totalQuantity: g.totalQuantity,
        orderCount: g.orderIds.size,
      }))
      .sort((a, b) => a.locationCode.localeCompare(b.locationCode));

    return { type: 'total' as const, items };
  }

  // シングルピッキング: 1注文1リスト
  // 单拣货: 每个订单一个清单
  private async generateSinglePickingList(tenantId: string, orderIds: string[]) {
    // 注文情報と商品を取得 / 获取订单信息和商品
    const [orders, productRows] = await Promise.all([
      this.db.select({ id: shipmentOrders.id, orderNumber: shipmentOrders.orderNumber })
        .from(shipmentOrders)
        .where(and(
          eq(shipmentOrders.tenantId, tenantId),
          inArray(shipmentOrders.id, orderIds),
          isNull(shipmentOrders.deletedAt),
        )),
      this.db
        .select({
          shipmentOrderId: shipmentOrderProducts.shipmentOrderId,
          productSku: shipmentOrderProducts.productSku,
          quantity: shipmentOrderProducts.quantity,
          productId: shipmentOrderProducts.productId,
          locationCode: locations.code,
        })
        .from(shipmentOrderProducts)
        .leftJoin(stockQuants, and(
          eq(stockQuants.productId, shipmentOrderProducts.productId),
          eq(stockQuants.tenantId, tenantId),
        ))
        .leftJoin(locations, eq(locations.id, stockQuants.locationId))
        .where(and(
          eq(shipmentOrderProducts.tenantId, tenantId),
          inArray(shipmentOrderProducts.shipmentOrderId, orderIds),
        )),
    ]);

    // 注文番号マップ / 订单编号映射
    const orderMap = new Map(orders.map((o) => [o.id, o.orderNumber]));

    // 注文ごとにグループ化 / 按订单分组
    const orderProductsMap = new Map<string, Array<{ productSku: string | null; locationCode: string | null; quantity: number }>>();
    for (const row of productRows) {
      const list = orderProductsMap.get(row.shipmentOrderId) ?? [];
      list.push({
        productSku: row.productSku,
        locationCode: row.locationCode,
        quantity: row.quantity,
      });
      orderProductsMap.set(row.shipmentOrderId, list);
    }

    // 注文番号順→ロケーション順にソート / 按订单编号 → 库位排序
    const items = Array.from(orderProductsMap.entries())
      .map(([orderId, prods]) => ({
        orderNumber: orderMap.get(orderId) ?? orderId,
        items: prods.sort((a, b) => (a.locationCode ?? '').localeCompare(b.locationCode ?? '')),
      }))
      .sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));

    return { type: 'single' as const, orders: items };
  }

  // サブトータルピッキング: 注文グループ別に商品集約
  // 小计拣货: 按订单分组汇总商品
  private async generateSubtotalPickingList(tenantId: string, groupId: string) {
    // グループ情報取得 / 获取分组信息
    const [group] = await this.db
      .select({ id: orderGroups.id, name: orderGroups.name })
      .from(orderGroups)
      .where(and(eq(orderGroups.id, groupId), eq(orderGroups.tenantId, tenantId)))
      .limit(1);

    if (!group) {
      throw new WmsException('SHIP_NOT_FOUND', `Order group not found: ${groupId} / 注文グループが見つかりません / 订单分组未找到`);
    }

    // グループに属する注文の商品を取得 / 获取分组内订单的商品
    const rows = await this.db
      .select({
        productSku: shipmentOrderProducts.productSku,
        productName: shipmentOrderProducts.productName,
        quantity: shipmentOrderProducts.quantity,
        orderNumber: shipmentOrders.orderNumber,
        locationCode: locations.code,
      })
      .from(shipmentOrderProducts)
      .innerJoin(shipmentOrders, eq(shipmentOrders.id, shipmentOrderProducts.shipmentOrderId))
      .leftJoin(stockQuants, and(
        eq(stockQuants.productId, shipmentOrderProducts.productId),
        eq(stockQuants.tenantId, tenantId),
      ))
      .leftJoin(locations, eq(locations.id, stockQuants.locationId))
      .where(and(
        eq(shipmentOrderProducts.tenantId, tenantId),
        eq(shipmentOrders.orderGroupId, groupId),
        isNull(shipmentOrders.deletedAt),
      ));

    // 商品SKU別にグルーピング / 按商品SKU分组
    const grouped = new Map<string, {
      productSku: string | null;
      locationCode: string | null;
      totalQuantity: number;
      orderNumbers: Set<string>;
    }>();

    for (const row of rows) {
      const key = row.productSku ?? 'unknown';
      const existing = grouped.get(key);
      if (existing) {
        existing.totalQuantity += row.quantity;
        existing.orderNumbers.add(row.orderNumber);
      } else {
        grouped.set(key, {
          productSku: row.productSku,
          locationCode: row.locationCode,
          totalQuantity: row.quantity,
          orderNumbers: new Set([row.orderNumber]),
        });
      }
    }

    const productsList = Array.from(grouped.values())
      .map((g) => ({
        productSku: g.productSku,
        locationCode: g.locationCode,
        totalQuantity: g.totalQuantity,
        orderNumbers: Array.from(g.orderNumbers),
      }))
      .sort((a, b) => (a.locationCode ?? '').localeCompare(b.locationCode ?? ''));

    return { type: 'subtotal' as const, groupName: group.name, products: productsList };
  }

  // ピッキングリスト生成（3タイプ統合エントリポイント）
  // 拣货清单生成（3种类型统一入口）
  async generatePickingList(tenantId: string, type: 'total' | 'single' | 'subtotal', orderIds?: string[], groupId?: string) {
    if (type === 'total') {
      if (!orderIds || orderIds.length === 0) {
        throw new WmsException('VALIDATION_ERROR', 'orderIds is required for total picking / トータルピッキングにはorderIdsが必要 / 总拣货需要orderIds');
      }
      return this.generateTotalPickingList(tenantId, orderIds);
    }

    if (type === 'single') {
      if (!orderIds || orderIds.length === 0) {
        throw new WmsException('VALIDATION_ERROR', 'orderIds is required for single picking / シングルピッキングにはorderIdsが必要 / 单拣货需要orderIds');
      }
      return this.generateSinglePickingList(tenantId, orderIds);
    }

    if (type === 'subtotal') {
      if (!groupId) {
        throw new WmsException('VALIDATION_ERROR', 'groupId is required for subtotal picking / サブトータルピッキングにはgroupIdが必要 / 小计拣货需要groupId');
      }
      return this.generateSubtotalPickingList(tenantId, groupId);
    }

    throw new WmsException('VALIDATION_ERROR', `Unknown picking type: ${type} / 不明なピッキングタイプ / 未知拣货类型`);
  }

  // ============================================
  // 受注取りまとめ / 订单合并
  // ============================================

  // 同一送付先の注文を統合（郵便番号+電話+名前+住所が一致）
  // 合并同一收件人的订单（邮编+电话+姓名+地址一致）
  async consolidateOrders(tenantId: string, orderIds: string[]) {
    if (!orderIds || orderIds.length < 2) {
      throw new WmsException('VALIDATION_ERROR', 'At least 2 order IDs required / 最低2件のIDが必要 / 至少需要2个ID');
    }

    // 対象注文を取得 / 获取目标订单
    const orders = await this.db
      .select()
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        inArray(shipmentOrders.id, orderIds),
        isNull(shipmentOrders.deletedAt),
      ));

    if (orders.length < 2) {
      throw new WmsException('VALIDATION_ERROR', 'Not enough valid orders found / 有効な注文が不足 / 有效订单不足');
    }

    // 統合可能チェック: 送付先が全て一致するか / 合并可行性检查: 收件人是否全部一致
    const master = orders[0];
    const canConsolidate = orders.every(
      (o) =>
        o.recipientPostalCode === master.recipientPostalCode &&
        o.recipientPhone === master.recipientPhone &&
        o.recipientName === master.recipientName &&
        o.recipientStreet === master.recipientStreet,
    );

    if (!canConsolidate) {
      throw new WmsException('SHIP_INVALID_STATUS', 'Orders have different recipients, cannot consolidate / 送付先が異なるため統合不可 / 收件人不同无法合并');
    }

    // 最初の注文をマスターとして使用、他の注文の商品をマスターに移動
    // 使用第一个订单作为主订单，将其他订单的商品移动到主订单
    const mergedOrderIds = orders.slice(1).map((o) => o.id);

    // 他注文の商品をマスターに紐付け変更 / 将其他订单的商品关联到主订单
    for (const mergedId of mergedOrderIds) {
      await this.db
        .update(shipmentOrderProducts)
        .set({ shipmentOrderId: master.id })
        .where(and(
          eq(shipmentOrderProducts.shipmentOrderId, mergedId),
          eq(shipmentOrderProducts.tenantId, tenantId),
        ));
    }

    // 統合された注文を論理削除 / 软删除被合并的订单
    const now = new Date();
    await this.db
      .update(shipmentOrders)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(
        inArray(shipmentOrders.id, mergedOrderIds),
        eq(shipmentOrders.tenantId, tenantId),
      ));

    return {
      masterOrderId: master.id,
      mergedCount: mergedOrderIds.length,
      mergedOrderIds,
    };
  }

  // ============================================
  // 出荷検品取消 / 出货检品取消
  // ============================================

  // 検品ステータスをリセット（出荷前のみ許可）
  // 重置检品状态（仅在出货前允许）
  async cancelInspection(tenantId: string, orderId: string) {
    const order = await this.findById(tenantId, orderId);

    // 出荷済みの場合は取消不可 / 已出货时不允许取消
    if (order.statusShipped) {
      throw new WmsException('SHIP_INVALID_STATUS', 'Cannot cancel inspection after shipment / 出荷後の検品取消は不可 / 出货后不能取消检品');
    }

    // 検品ステータスが未設定の場合 / 检品状态未设置时
    if (!order.statusInspected) {
      throw new WmsException('SHIP_INVALID_STATUS', 'Order is not inspected / 未検品の注文です / 订单未检品');
    }

    const rows = await this.db
      .update(shipmentOrders)
      .set({
        statusInspected: false,
        statusInspectedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(shipmentOrders.id, orderId), eq(shipmentOrders.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ============================================
  // 保留注文自動管理 / 保留订单自动管理
  // ============================================

  // 保留7日超過注文を自動削除（ソフトデリート）/ 自动删除超过7天的保留订单（软删除）
  async cleanupExpiredHeldOrders(tenantId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const expired = await this.db
      .update(shipmentOrders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusHeld, true),
        eq(shipmentOrders.statusShipped, false),
        isNull(shipmentOrders.deletedAt),
        sql`${shipmentOrders.statusHeldAt} < ${sevenDaysAgo}`,
      ))
      .returning();

    return { deleted: expired.length, items: expired };
  }

  // 保留6日目アラート対象を取得 / 获取保留第6天需要告警的订单
  async findHeldOrdersNearExpiry(tenantId: string) {
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const nearExpiry = await this.db
      .select()
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusHeld, true),
        eq(shipmentOrders.statusShipped, false),
        isNull(shipmentOrders.deletedAt),
        sql`${shipmentOrders.statusHeldAt} <= ${sixDaysAgo}`,
        sql`${shipmentOrders.statusHeldAt} > ${sevenDaysAgo}`,
      ));

    return { count: nearExpiry.length, items: nearExpiry };
  }
}
