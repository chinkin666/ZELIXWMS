// ダッシュボードコントローラ / 仪表盘控制器
import { Controller, Get, Query } from '@nestjs/common';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { KpiService } from './kpi.service.js';

@Controller('api/dashboard')
export class DashboardController {
  constructor(private readonly kpiService: KpiService) {}

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
