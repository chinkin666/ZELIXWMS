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

  // 注文統計取得 / 获取订单统计
  @Get('orders')
  getOrderStats(
    @TenantId() tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.kpiService.getOrderStats(tenantId, dateFrom, dateTo);
  }
}
