// ダッシュボードコントローラ / 仪表盘控制器
import { Controller, Get } from '@nestjs/common';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/dashboard')
export class DashboardController {
  // ダッシュボード統計（プレースホルダ）/ 仪表盘统计（占位符）
  @Get('stats')
  getStats(@TenantId() tenantId: string) {
    // TODO: 実データから集計 / 从实际数据聚合
    return {
      tenantId,
      totalOrders: 0,
      totalShipments: 0,
      totalInbounds: 0,
      totalProducts: 0,
      pendingTasks: 0,
    };
  }

  // 在庫サマリー（プレースホルダ）/ 库存摘要（占位符）
  @Get('inventory-summary')
  getInventorySummary(@TenantId() tenantId: string) {
    // TODO: 実データから集計 / 从实际数据聚合
    return {
      tenantId,
      totalSku: 0,
      totalQuantity: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    };
  }

  // 注文サマリー（プレースホルダ）/ 订单摘要（占位符）
  @Get('orders-summary')
  getOrdersSummary(@TenantId() tenantId: string) {
    // TODO: 実データから集計 / 从实际数据聚合
    return {
      tenantId,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    };
  }
}
