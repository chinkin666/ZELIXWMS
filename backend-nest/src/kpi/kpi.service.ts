// KPIサービス（読み取り専用分析）/ KPI服务（只读分析）
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { sql, count, eq, and, gte, lte, sum, desc } from 'drizzle-orm';
import { shipmentOrders, shipmentOrderProducts } from '../database/schema/shipments.js';
import { inboundOrders } from '../database/schema/inbound.js';
import { stockQuants } from '../database/schema/inventory.js';
import { products } from '../database/schema/products.js';

// ダッシュボード構造体 / 仪表盘结构体
export interface DashboardResult {
  orderCount: number;
  shipmentCount: number;
  inboundCount: number;
  returnCount: number;
}

// 注文統計構造体 / 订单统计结构体
export interface OrderStatsResult {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  dateFrom: string | null;
  dateTo: string | null;
}

// 概要メトリクス / 概要指标
export interface OverviewMetrics {
  totalShipments: number;
  totalInbounds: number;
  totalProducts: number;
  totalStockQuantity: number;
}

// 出荷メトリクス / 出货指标
export interface ShipmentMetrics {
  total: number;
  confirmed: number;
  shipped: number;
  held: number;
  pending: number;
}

// 在庫メトリクス / 库存指标
export interface InventoryMetrics {
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
}

// パフォーマンスメトリクス / 性能指标
export interface PerformanceMetrics {
  fulfillmentRate: number;
  averageProcessingHours: number | null;
}

// ABC分析結果 / ABC分析结果
export interface AbcAnalysisResult {
  period: number;
  totalVolume: number;
  products: Array<{
    productId: string | null;
    productSku: string | null;
    totalShipped: number;
    rank: number;
    classification: 'A' | 'B' | 'C';
  }>;
}

// 在庫回転率結果 / 库存周转率结果
export interface InventoryTurnoverResult {
  period: number;
  products: Array<{
    productId: string | null;
    productSku: string | null;
    totalOutbound: number;
    avgInventory: number;
    turnoverRate: number;
  }>;
}

// 低在庫アラート / 低库存警报
export interface StockAlert {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  locationId: string;
}

@Injectable()
export class KpiService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ダッシュボード集計 / 仪表盘汇总
  async getDashboard(tenantId: string): Promise<DashboardResult> {
    // 出荷注文数を取得 / 获取出货订单数
    const [shipmentResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        sql`${shipmentOrders.deletedAt} IS NULL`,
      ));

    // 入庫注文数を取得 / 获取入库订单数
    const [inboundResult] = await this.db
      .select({ value: count() })
      .from(inboundOrders)
      .where(and(
        eq(inboundOrders.tenantId, tenantId),
        sql`${inboundOrders.deletedAt} IS NULL`,
      ));

    // 出荷済み注文数（orderCount として使用）/ 已出货订单数（作为orderCount）
    const [shippedResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusShipped, true),
        sql`${shipmentOrders.deletedAt} IS NULL`,
      ));

    // 返品入庫数（cancelled ステータスを返品として概算）/ 退货入库数（cancelled状态作为退货概算）
    const [returnResult] = await this.db
      .select({ value: count() })
      .from(inboundOrders)
      .where(and(
        eq(inboundOrders.tenantId, tenantId),
        eq(inboundOrders.status, 'cancelled'),
        sql`${inboundOrders.deletedAt} IS NULL`,
      ));

    return {
      orderCount: shippedResult?.value ?? 0,
      shipmentCount: shipmentResult?.value ?? 0,
      inboundCount: inboundResult?.value ?? 0,
      returnCount: returnResult?.value ?? 0,
    };
  }

  // 注文統計（日付範囲フィルタ付き）/ 订单统计（带日期范围筛选）
  async getOrderStats(tenantId: string, dateFrom?: string, dateTo?: string): Promise<OrderStatsResult> {
    const conditions = [
      eq(shipmentOrders.tenantId, tenantId),
      sql`${shipmentOrders.deletedAt} IS NULL`,
    ];
    if (dateFrom) {
      conditions.push(gte(shipmentOrders.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(shipmentOrders.createdAt, new Date(dateTo)));
    }

    const baseWhere = and(...conditions);

    // 全注文数 / 总订单数
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(baseWhere);

    // 出荷完了数 / 已出货数
    const [completedResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(baseWhere, eq(shipmentOrders.statusShipped, true)));

    // 保留中の数 / 暂停中数量
    const [pendingResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(baseWhere, eq(shipmentOrders.statusHeld, true)));

    // キャンセル数（deletedAt が設定されているもの）/ 取消数（设置了deletedAt的）
    const cancelConditions = [
      eq(shipmentOrders.tenantId, tenantId),
      sql`${shipmentOrders.deletedAt} IS NOT NULL`,
    ];
    if (dateFrom) {
      cancelConditions.push(gte(shipmentOrders.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      cancelConditions.push(lte(shipmentOrders.createdAt, new Date(dateTo)));
    }
    const [cancelledResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(...cancelConditions));

    return {
      totalOrders: totalResult?.value ?? 0,
      completedOrders: completedResult?.value ?? 0,
      pendingOrders: pendingResult?.value ?? 0,
      cancelledOrders: cancelledResult?.value ?? 0,
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
    };
  }

  // 概要メトリクス / 概要指标
  async getOverviewMetrics(tenantId: string): Promise<OverviewMetrics> {
    // 各テーブルのCOUNTを並列実行 / 并行执行各表COUNT
    const [shipmentCount, inboundCount, productCount, stockSum] = await Promise.all([
      this.db
        .select({ value: count() })
        .from(shipmentOrders)
        .where(and(eq(shipmentOrders.tenantId, tenantId), sql`${shipmentOrders.deletedAt} IS NULL`)),
      this.db
        .select({ value: count() })
        .from(inboundOrders)
        .where(and(eq(inboundOrders.tenantId, tenantId), sql`${inboundOrders.deletedAt} IS NULL`)),
      this.db
        .select({ value: count() })
        .from(products)
        .where(and(eq(products.tenantId, tenantId), sql`${products.deletedAt} IS NULL`)),
      this.db
        .select({ value: sum(stockQuants.quantity) })
        .from(stockQuants)
        .where(eq(stockQuants.tenantId, tenantId)),
    ]);

    return {
      totalShipments: shipmentCount[0]?.value ?? 0,
      totalInbounds: inboundCount[0]?.value ?? 0,
      totalProducts: productCount[0]?.value ?? 0,
      totalStockQuantity: Number(stockSum[0]?.value ?? 0),
    };
  }

  // 出荷メトリクス（ステータス別集計）/ 出货指标（按状态聚合）
  async getShipmentMetrics(tenantId: string, dateFrom?: string, dateTo?: string): Promise<ShipmentMetrics> {
    const conditions = [
      eq(shipmentOrders.tenantId, tenantId),
      sql`${shipmentOrders.deletedAt} IS NULL`,
    ];
    if (dateFrom) {
      conditions.push(gte(shipmentOrders.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(shipmentOrders.createdAt, new Date(dateTo)));
    }
    const baseWhere = and(...conditions);

    const [total, confirmed, shipped, held] = await Promise.all([
      this.db.select({ value: count() }).from(shipmentOrders).where(baseWhere),
      this.db.select({ value: count() }).from(shipmentOrders).where(and(baseWhere, eq(shipmentOrders.statusConfirmed, true))),
      this.db.select({ value: count() }).from(shipmentOrders).where(and(baseWhere, eq(shipmentOrders.statusShipped, true))),
      this.db.select({ value: count() }).from(shipmentOrders).where(and(baseWhere, eq(shipmentOrders.statusHeld, true))),
    ]);

    const totalVal = total[0]?.value ?? 0;
    const confirmedVal = confirmed[0]?.value ?? 0;
    const shippedVal = shipped[0]?.value ?? 0;
    const heldVal = held[0]?.value ?? 0;

    return {
      total: totalVal,
      confirmed: confirmedVal,
      shipped: shippedVal,
      held: heldVal,
      // 未確認・未出荷・未保留 = pending / 未确认・未出货・未暂停 = 待处理
      pending: totalVal - confirmedVal - heldVal,
    };
  }

  // 在庫メトリクス / 库存指标
  async getInventoryMetrics(tenantId: string): Promise<InventoryMetrics> {
    const [result] = await this.db
      .select({
        totalQuantity: sum(stockQuants.quantity),
        reservedQuantity: sum(stockQuants.reservedQuantity),
      })
      .from(stockQuants)
      .where(eq(stockQuants.tenantId, tenantId));

    const totalQty = Number(result?.totalQuantity ?? 0);
    const reservedQty = Number(result?.reservedQuantity ?? 0);

    return {
      totalQuantity: totalQty,
      reservedQuantity: reservedQty,
      availableQuantity: totalQty - reservedQty,
    };
  }

  // パフォーマンスメトリクス / 性能指标
  async getPerformanceMetrics(tenantId: string): Promise<PerformanceMetrics> {
    // フルフィルメント率 = 出荷済み / 全注文 / 履行率 = 已出货 / 全部订单
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(eq(shipmentOrders.tenantId, tenantId), sql`${shipmentOrders.deletedAt} IS NULL`));

    const [shippedResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusShipped, true),
        sql`${shipmentOrders.deletedAt} IS NULL`,
      ));

    const totalOrders = totalResult?.value ?? 0;
    const shippedOrders = shippedResult?.value ?? 0;
    const fulfillmentRate = totalOrders > 0 ? Math.round((shippedOrders / totalOrders) * 10000) / 100 : 0;

    // 平均処理時間（確認から出荷まで）/ 平均处理时间（从确认到出货）
    const [avgResult] = await this.db
      .select({
        avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${shipmentOrders.statusShippedAt} - ${shipmentOrders.statusConfirmedAt})) / 3600)`,
      })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusShipped, true),
        sql`${shipmentOrders.statusConfirmedAt} IS NOT NULL`,
        sql`${shipmentOrders.statusShippedAt} IS NOT NULL`,
        sql`${shipmentOrders.deletedAt} IS NULL`,
      ));

    return {
      fulfillmentRate,
      averageProcessingHours: avgResult?.avgHours != null ? Math.round(avgResult.avgHours * 100) / 100 : null,
    };
  }

  // 低在庫アラート / 低库存警报
  async getAlerts(tenantId: string, threshold = 10): Promise<StockAlert[]> {
    const rows = await this.db
      .select({
        productId: stockQuants.productId,
        productSku: products.sku,
        productName: products.name,
        quantity: stockQuants.quantity,
        locationId: stockQuants.locationId,
      })
      .from(stockQuants)
      .innerJoin(products, eq(stockQuants.productId, products.id))
      .where(and(
        eq(stockQuants.tenantId, tenantId),
        sql`${stockQuants.quantity} < ${threshold}`,
      ))
      .orderBy(stockQuants.quantity)
      .limit(50);

    return rows.map((row) => ({
      productId: row.productId,
      productSku: row.productSku,
      productName: row.productName,
      quantity: row.quantity,
      locationId: row.locationId,
    }));
  }

  // 精度率 / 精度率
  async getAccuracyRate(tenantId: string): Promise<{ rate: number }> {
    // 検品済み / 全確認済み = 精度率 / 已检品 / 全部已确认 = 精度率
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusConfirmed, true),
        sql`${shipmentOrders.deletedAt} IS NULL`,
      ));

    const [inspectedResult] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusInspected, true),
        sql`${shipmentOrders.deletedAt} IS NULL`,
      ));

    const total = totalResult?.value ?? 0;
    const inspected = inspectedResult?.value ?? 0;
    const rate = total > 0 ? Math.round((inspected / total) * 10000) / 100 : 0;

    return { rate };
  }

  // フルフィルメント率 / 履行率
  async getFulfillmentRate(tenantId: string): Promise<{ rate: number }> {
    const metrics = await this.getPerformanceMetrics(tenantId);
    return { rate: metrics.fulfillmentRate };
  }

  // ============================================
  // ABC分析 / ABC分析
  // ============================================

  // 商品をABC分類（出荷数量ベース）/ 基于出货数量对商品进行ABC分类
  async getAbcAnalysis(tenantId: string, period?: number): Promise<AbcAnalysisResult> {
    const days = period ?? 90;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // 出荷済み注文の商品別出荷数を集計 / 汇总已出货订单的各商品出货数
    const rows = await this.db
      .select({
        productId: shipmentOrderProducts.productId,
        productSku: shipmentOrderProducts.productSku,
        totalShipped: sum(shipmentOrderProducts.quantity),
      })
      .from(shipmentOrderProducts)
      .innerJoin(shipmentOrders, eq(shipmentOrders.id, shipmentOrderProducts.shipmentOrderId))
      .where(and(
        eq(shipmentOrderProducts.tenantId, tenantId),
        eq(shipmentOrders.statusShipped, true),
        gte(shipmentOrders.statusShippedAt, dateFrom),
        sql`${shipmentOrders.deletedAt} IS NULL`,
      ))
      .groupBy(shipmentOrderProducts.productId, shipmentOrderProducts.productSku)
      .orderBy(desc(sum(shipmentOrderProducts.quantity)));

    // 累積比率でABC分類 / 按累计比率进行ABC分类
    const totalVolume = rows.reduce((acc, r) => acc + Number(r.totalShipped ?? 0), 0);
    let cumulative = 0;

    const classified = rows.map((row, index) => {
      const shipped = Number(row.totalShipped ?? 0);
      cumulative += shipped;
      const cumulativePercent = totalVolume > 0 ? (cumulative / totalVolume) * 100 : 0;

      // 上位20% = A, 次の30% = B, 残り50% = C / 前20% = A, 接下来30% = B, 剩余50% = C
      let classification: 'A' | 'B' | 'C';
      if (cumulativePercent <= 20) {
        classification = 'A';
      } else if (cumulativePercent <= 50) {
        classification = 'B';
      } else {
        classification = 'C';
      }

      return {
        productId: row.productId,
        productSku: row.productSku,
        totalShipped: shipped,
        rank: index + 1,
        classification,
      };
    });

    return { period: days, totalVolume, products: classified };
  }

  // ============================================
  // 在庫回転率 / 库存周转率
  // ============================================

  // 商品別在庫回転率（出荷数量 / 平均在庫数量）
  // 各商品库存周转率（出货数量 / 平均库存数量）
  async getInventoryTurnover(tenantId: string, period?: number): Promise<InventoryTurnoverResult> {
    const days = period ?? 90;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // 出荷数量の集計 / 出货数量汇总
    const shippedRows = await this.db
      .select({
        productId: shipmentOrderProducts.productId,
        productSku: shipmentOrderProducts.productSku,
        totalOutbound: sum(shipmentOrderProducts.quantity),
      })
      .from(shipmentOrderProducts)
      .innerJoin(shipmentOrders, eq(shipmentOrders.id, shipmentOrderProducts.shipmentOrderId))
      .where(and(
        eq(shipmentOrderProducts.tenantId, tenantId),
        eq(shipmentOrders.statusShipped, true),
        gte(shipmentOrders.statusShippedAt, dateFrom),
        sql`${shipmentOrders.deletedAt} IS NULL`,
      ))
      .groupBy(shipmentOrderProducts.productId, shipmentOrderProducts.productSku);

    // 現在の在庫数量（平均在庫の近似値として使用）/ 当前库存数量（作为平均库存的近似值）
    const stockRows = await this.db
      .select({
        productId: stockQuants.productId,
        avgInventory: sum(stockQuants.quantity),
      })
      .from(stockQuants)
      .where(eq(stockQuants.tenantId, tenantId))
      .groupBy(stockQuants.productId);

    // 在庫マップ構築 / 构建库存映射
    const stockMap = new Map(stockRows.map((r) => [r.productId, Number(r.avgInventory ?? 0)]));

    // 回転率計算 / 计算周转率
    const productsList = shippedRows.map((row) => {
      const totalOutbound = Number(row.totalOutbound ?? 0);
      const avgInventory = stockMap.get(row.productId ?? '') ?? 0;
      // 回転率 = 出荷数 / 平均在庫（0除算防止）/ 周转率 = 出货数 / 平均库存（防止除零）
      const turnoverRate = avgInventory > 0 ? Math.round((totalOutbound / avgInventory) * 100) / 100 : 0;

      return {
        productId: row.productId,
        productSku: row.productSku,
        totalOutbound,
        avgInventory,
        turnoverRate,
      };
    });

    return { period: days, products: productsList };
  }

  // スループット（直近30日の1日あたり出荷数）/ 吞吐量（最近30天每日出货数）
  async getThroughput(tenantId: string): Promise<{ rate: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [result] = await this.db
      .select({ value: count() })
      .from(shipmentOrders)
      .where(and(
        eq(shipmentOrders.tenantId, tenantId),
        eq(shipmentOrders.statusShipped, true),
        gte(shipmentOrders.statusShippedAt, thirtyDaysAgo),
        sql`${shipmentOrders.deletedAt} IS NULL`,
      ));

    const totalShipped = result?.value ?? 0;
    // 1日あたり平均 / 每日平均
    const rate = Math.round((totalShipped / 30) * 100) / 100;

    return { rate };
  }
}
