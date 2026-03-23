// ダッシュボードコントローラ / 仪表盘控制器
import { Controller, Get, Query } from '@nestjs/common';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { KpiService } from './kpi.service.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/dashboard')
@RequireRole('admin', 'manager', 'operator', 'viewer')
export class DashboardController {
  constructor(private readonly kpiService: KpiService) {}

  // ダッシュボード概要（フロントエンドのWelcome.vue用）/ 仪表盘概览（前端Welcome.vue用）
  @Get('overview')
  async getOverview(@TenantId() tenantId: string) {
    const [overview, shipmentMetrics, inventoryMetrics] = await Promise.all([
      this.kpiService.getOverviewMetrics(tenantId),
      this.kpiService.getShipmentMetrics(tenantId),
      this.kpiService.getInventoryMetrics(tenantId),
    ]);

    return {
      shipments: {
        todayCreated: 0,
        todayShipped: shipmentMetrics.shipped,
        totalPending: shipmentMetrics.pending,
        totalHeld: shipmentMetrics.held,
        todayScheduled: shipmentMetrics.total,
      },
      inbound: {
        todayReceived: overview.totalInbounds,
        active: 0,
        pendingPutaway: 0,
      },
      returns: {
        inspecting: 0,
        completed: 0,
      },
      inventory: {
        totalSkus: overview.totalProducts,
        totalQuantity: inventoryMetrics.totalQuantity,
        reservedQuantity: inventoryMetrics.reservedQuantity,
        availableQuantity: inventoryMetrics.availableQuantity,
      },
      recentShipments: [],
      overdueOrders: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  // 7日間出荷トレンド / 7天出货趋势
  @Get('trend')
  async getTrend(@TenantId() tenantId: string) {
    // 過去7日間の空トレンドを返す（将来的にDB集計に置き換え）/ 返回过去7天的空趋势（将来替换为DB聚合）
    const trend = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      trend.push({
        date: d.toISOString().slice(0, 10),
        created: 0,
        shipped: 0,
      });
    }
    return trend;
  }

  // 出荷実績統計（レポート画面用）/ 出货统计（报表页面用）
  @Get('shipment-stats')
  async getShipmentStats(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const metrics = await this.kpiService.getShipmentMetrics(tenantId, from, to);
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);
    const defaultTo = now.toISOString().slice(0, 10);
    return {
      from: from || defaultFrom,
      to: to || defaultTo,
      totalShipped: metrics.shipped,
      totalQuantity: 0,
      totalSkus: 0,
      daily: [],
      carriers: [],
      invoiceTypes: [],
    };
  }

  // 荷主別業績レポート / 按客户的业绩报表
  @Get('client-report')
  async getClientReport(
    @TenantId() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);
    const defaultTo = now.toISOString().slice(0, 10);
    return {
      from: from || defaultFrom,
      to: to || defaultTo,
      shipments: [],
      inbound: [],
    };
  }

  // 在庫回転率レポート / 库存周转率报表
  @Get('inventory-turnover')
  async getInventoryTurnover(
    @TenantId() tenantId: string,
    @Query('days') daysParam?: string,
  ) {
    const days = daysParam ? parseInt(daysParam, 10) : 30;
    const result = await this.kpiService.getInventoryTurnover(tenantId, days);
    return result;
  }

  // ダッシュボード統計（出荷・入庫・商品・在庫の集計）/ 仪表盘统计（出货・入库・商品・库存的汇总）
  @Get('stats')
  async getStats(@TenantId() tenantId: string) {
    const [overview, orderStats] = await Promise.all([
      this.kpiService.getOverviewMetrics(tenantId),
      this.kpiService.getOrderStats(tenantId),
    ]);

    return {
      tenantId,
      totalOrders: orderStats.totalOrders,
      totalShipments: overview.totalShipments,
      totalInbounds: overview.totalInbounds,
      totalProducts: overview.totalProducts,
      pendingTasks: orderStats.pendingOrders,
    };
  }

  // 在庫サマリー（在庫数量・低在庫・欠品の集計）/ 库存摘要（库存数量・低库存・缺货的汇总）
  @Get('inventory-summary')
  async getInventorySummary(@TenantId() tenantId: string) {
    const [inventoryMetrics, alerts] = await Promise.all([
      this.kpiService.getInventoryMetrics(tenantId),
      this.kpiService.getAlerts(tenantId, 10),
    ]);

    // 欠品数 = quantity が 0 のアラート数 / 缺货数 = quantity为0的警报数
    const outOfStockCount = alerts.filter((a) => a.quantity <= 0).length;
    // ユニークSKU数 / 唯一SKU数
    const uniqueSkus = new Set(alerts.map((a) => a.productSku));

    return {
      tenantId,
      totalSku: uniqueSkus.size + (inventoryMetrics.totalQuantity > 0 ? inventoryMetrics.totalQuantity : 0),
      totalQuantity: inventoryMetrics.totalQuantity,
      lowStockCount: alerts.length,
      outOfStockCount,
    };
  }

  // 注文サマリー（ステータス別注文数の集計）/ 订单摘要（按状态分类的订单数汇总）
  @Get('orders-summary')
  async getOrdersSummary(@TenantId() tenantId: string) {
    const metrics = await this.kpiService.getShipmentMetrics(tenantId);

    return {
      tenantId,
      pendingOrders: metrics.pending,
      processingOrders: metrics.confirmed - metrics.shipped,
      shippedOrders: metrics.shipped,
      completedOrders: metrics.shipped,
      cancelledOrders: 0, // deletedAt ベースのキャンセルはgetOrderStatsで取得可能 / 基于deletedAt的取消可通过getOrderStats获取
    };
  }
}
