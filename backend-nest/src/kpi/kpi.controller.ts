// KPIコントローラ（読み取り専用）/ KPI控制器（只读）
import { Controller, Get, Query } from '@nestjs/common';
import { KpiService } from './kpi.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  // ダッシュボード集計取得 / 获取仪表盘汇总
  @Get('dashboard')
  getDashboard(@TenantId() tenantId: string) {
    return this.kpiService.getDashboard(tenantId);
  }

  // 概要メトリクス取得 / 获取概要指标
  @Get('overview-metrics')
  getOverviewMetrics(@TenantId() tenantId: string) {
    return this.kpiService.getOverviewMetrics(tenantId);
  }

  // 出荷メトリクス取得 / 获取出货指标
  @Get('shipment-metrics')
  getShipmentMetrics(
    @TenantId() tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.kpiService.getShipmentMetrics(tenantId, dateFrom, dateTo);
  }

  // 在庫メトリクス取得 / 获取库存指标
  @Get('inventory-metrics')
  getInventoryMetrics(@TenantId() tenantId: string) {
    return this.kpiService.getInventoryMetrics(tenantId);
  }

  // パフォーマンスメトリクス取得 / 获取性能指标
  @Get('performance')
  getPerformanceMetrics(@TenantId() tenantId: string) {
    return this.kpiService.getPerformanceMetrics(tenantId);
  }

  // 低在庫アラート取得 / 获取低库存警报
  @Get('alerts')
  getAlerts(
    @TenantId() tenantId: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.kpiService.getAlerts(tenantId, threshold ? parseInt(threshold, 10) : undefined);
  }

  // 注文統計取得 / 获取订单统计
  @Get('orders')
  getOrderStats(
    @TenantId() tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.kpiService.getOrderStats(tenantId, dateFrom, dateTo);
  }

  // 精度率取得 / 获取精度率
  @Get('accuracy-rate')
  getAccuracyRate(@TenantId() tenantId: string) {
    return this.kpiService.getAccuracyRate(tenantId);
  }

  // フルフィルメント率取得 / 获取履行率
  @Get('fulfillment-rate')
  getFulfillmentRate(@TenantId() tenantId: string) {
    return this.kpiService.getFulfillmentRate(tenantId);
  }

  // スループット取得 / 获取吞吐量
  @Get('throughput')
  getThroughput(@TenantId() tenantId: string) {
    return this.kpiService.getThroughput(tenantId);
  }

  // ABC分析（商品を出荷数量ベースでA/B/C分類）/ ABC分析（基于出货数量将商品分为A/B/C类）
  @Get('abc-analysis')
  getAbcAnalysis(
    @TenantId() tenantId: string,
    @Query('period') period?: string,
  ) {
    return this.kpiService.getAbcAnalysis(tenantId, period ? parseInt(period, 10) : undefined);
  }

  // 在庫回転率（商品別の出荷数/平均在庫数）/ 库存周转率（各商品出货数/平均库存数）
  @Get('inventory-turnover')
  getInventoryTurnover(
    @TenantId() tenantId: string,
    @Query('period') period?: string,
  ) {
    return this.kpiService.getInventoryTurnover(tenantId, period ? parseInt(period, 10) : undefined);
  }
}
