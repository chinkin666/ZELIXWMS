// クライアントポータルサービス / 客户门户服务
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { sql, count, eq, and, sum } from 'drizzle-orm';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import { shipmentOrders } from '../database/schema/shipments.js';
import { inboundOrders } from '../database/schema/inbound.js';
import { billingRecords } from '../database/schema/billing.js';
import { stockQuants } from '../database/schema/inventory.js';

interface PortalQuery {
  page?: number;
  limit?: number;
  status?: string;
}

@Injectable()
export class ClientPortalService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ポータルダッシュボード（出荷・入庫・請求の集計）/ 门户仪表盘（出货・入库・账单的汇总）
  async getDashboard(tenantId: string, clientId: string) {
    // 並列でクライアント関連データを集計 / 并行汇总客户相关数据
    const [
      shipmentStats,
      inboundStats,
      billingStats,
    ] = await Promise.all([
      // 出荷注文統計（orderSourceCompanyId でフィルタ）/ 出货订单统计（按orderSourceCompanyId筛选）
      this.db
        .select({
          total: count(),
          shipped: sql<number>`COUNT(*) FILTER (WHERE ${shipmentOrders.statusShipped} = true)`,
          pending: sql<number>`COUNT(*) FILTER (WHERE ${shipmentOrders.statusHeld} = true)`,
        })
        .from(shipmentOrders)
        .where(and(
          eq(shipmentOrders.tenantId, tenantId),
          eq(shipmentOrders.orderSourceCompanyId, clientId),
          sql`${shipmentOrders.deletedAt} IS NULL`,
        )),
      // 入庫注文統計 / 入库订单统计
      this.db
        .select({
          total: count(),
          pending: sql<number>`COUNT(*) FILTER (WHERE ${inboundOrders.status} IN ('draft', 'confirmed'))`,
        })
        .from(inboundOrders)
        .where(and(
          eq(inboundOrders.tenantId, tenantId),
          eq(inboundOrders.clientId, clientId),
          sql`${inboundOrders.deletedAt} IS NULL`,
        )),
      // 請求残高合計 / 账单余额合计
      this.db
        .select({
          totalAmount: sum(billingRecords.totalAmount),
        })
        .from(billingRecords)
        .where(and(
          eq(billingRecords.tenantId, tenantId),
          eq(billingRecords.clientId, clientId),
          sql`${billingRecords.status} != 'paid'`,
        )),
    ]);

    const shipment = shipmentStats[0];
    const inbound = inboundStats[0];
    const billing = billingStats[0];

    return {
      tenantId,
      clientId,
      stats: {
        totalOrders: shipment?.total ?? 0,
        pendingOrders: shipment?.pending ?? 0,
        shippedOrders: shipment?.shipped ?? 0,
        totalInbound: inbound?.total ?? 0,
        pendingInbound: inbound?.pending ?? 0,
        totalProducts: 0, // 商品数はクライアント別テーブルがないため概算 / 商品数因无客户专用表暂为概算
        outstandingBalance: Number(billing?.totalAmount ?? 0),
      },
    };
  }

  // クライアントの出荷注文一覧（ページネーション付き）/ 客户出货订单列表（带分页）
  async getOrders(tenantId: string, clientId: string, query: PortalQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const baseConditions = [
      eq(shipmentOrders.tenantId, tenantId),
      eq(shipmentOrders.orderSourceCompanyId, clientId),
      sql`${shipmentOrders.deletedAt} IS NULL`,
    ];

    // ステータスフィルタ / 状态筛选
    if (query.status === 'shipped') {
      baseConditions.push(eq(shipmentOrders.statusShipped, true));
    } else if (query.status === 'held') {
      baseConditions.push(eq(shipmentOrders.statusHeld, true));
    } else if (query.status === 'confirmed') {
      baseConditions.push(eq(shipmentOrders.statusConfirmed, true));
    }

    const whereClause = and(...baseConditions);

    // 件数とデータを並列取得 / 并行获取件数和数据
    const [countResult, items] = await Promise.all([
      this.db.select({ value: count() }).from(shipmentOrders).where(whereClause),
      this.db
        .select({
          id: shipmentOrders.id,
          orderNumber: shipmentOrders.orderNumber,
          recipientName: shipmentOrders.recipientName,
          recipientPrefecture: shipmentOrders.recipientPrefecture,
          statusConfirmed: shipmentOrders.statusConfirmed,
          statusShipped: shipmentOrders.statusShipped,
          statusHeld: shipmentOrders.statusHeld,
          trackingId: shipmentOrders.trackingId,
          createdAt: shipmentOrders.createdAt,
        })
        .from(shipmentOrders)
        .where(whereClause)
        .orderBy(sql`${shipmentOrders.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult[0]?.value ?? 0;
    return createPaginatedResult(items, total, page, limit);
  }

  // クライアントの入荷注文一覧（ページネーション付き）/ 客户入库订单列表（带分页）
  async getInbound(tenantId: string, clientId: string, query: PortalQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const baseConditions = [
      eq(inboundOrders.tenantId, tenantId),
      eq(inboundOrders.clientId, clientId),
      sql`${inboundOrders.deletedAt} IS NULL`,
    ];

    // ステータスフィルタ / 状态筛选
    if (query.status) {
      baseConditions.push(eq(inboundOrders.status, query.status));
    }

    const whereClause = and(...baseConditions);

    const [countResult, items] = await Promise.all([
      this.db.select({ value: count() }).from(inboundOrders).where(whereClause),
      this.db
        .select({
          id: inboundOrders.id,
          orderNumber: inboundOrders.orderNumber,
          status: inboundOrders.status,
          flowType: inboundOrders.flowType,
          expectedDate: inboundOrders.expectedDate,
          notes: inboundOrders.notes,
          createdAt: inboundOrders.createdAt,
        })
        .from(inboundOrders)
        .where(whereClause)
        .orderBy(sql`${inboundOrders.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult[0]?.value ?? 0;
    return createPaginatedResult(items, total, page, limit);
  }

  // クライアントの請求情報（ページネーション付き）/ 客户账单信息（带分页）
  async getBilling(tenantId: string, clientId: string, query: Omit<PortalQuery, 'status'>) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(billingRecords.tenantId, tenantId),
      eq(billingRecords.clientId, clientId),
    );

    const [countResult, items] = await Promise.all([
      this.db.select({ value: count() }).from(billingRecords).where(whereClause),
      this.db
        .select({
          id: billingRecords.id,
          period: billingRecords.period,
          orderCount: billingRecords.orderCount,
          totalQuantity: billingRecords.totalQuantity,
          totalShippingCost: billingRecords.totalShippingCost,
          handlingFee: billingRecords.handlingFee,
          storageFee: billingRecords.storageFee,
          totalAmount: billingRecords.totalAmount,
          status: billingRecords.status,
          createdAt: billingRecords.createdAt,
        })
        .from(billingRecords)
        .where(whereClause)
        .orderBy(sql`${billingRecords.createdAt} DESC`)
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult[0]?.value ?? 0;
    return createPaginatedResult(items, total, page, limit);
  }

  // クライアントの在庫一覧（stockQuantsをテナント分離でページネーション）
  // 获取客户库存列表（按租户隔离分页stockQuants）
  async getInventory(tenantId: string, clientId: string, query: Omit<PortalQuery, 'status'>) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // stockQuantsはclientIdを直接持たないため、テナント全体の在庫を返す
    // stockQuants没有直接的clientId字段，因此返回租户全体库存
    // NOTE: クライアント別フィルタは商品マスタとの結合が必要（将来実装）
    // 注意: 按客户筛选需要与商品主数据连接（将来实现）
    const whereClause = eq(stockQuants.tenantId, tenantId);

    const [countResult, items] = await Promise.all([
      this.db.select({ value: count() }).from(stockQuants).where(whereClause),
      this.db
        .select({
          id: stockQuants.id,
          productId: stockQuants.productId,
          locationId: stockQuants.locationId,
          quantity: stockQuants.quantity,
          reservedQuantity: stockQuants.reservedQuantity,
          available: sql<number>`(${stockQuants.quantity} - ${stockQuants.reservedQuantity})::int`,
          lastMovedAt: stockQuants.lastMovedAt,
        })
        .from(stockQuants)
        .where(whereClause)
        .orderBy(stockQuants.productId)
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult[0]?.value ?? 0;
    return createPaginatedResult(items, total, page, limit);
  }
}
