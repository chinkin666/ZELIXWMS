// 棚卸差異コントローラ / 盘点差异管理控制器
import { Controller, Get, Post, Put, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { StocktakingDiscrepanciesService } from './stocktaking-discrepancies.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/stocktaking-discrepancies')
export class StocktakingDiscrepanciesController {
  constructor(private readonly stocktakingDiscrepanciesService: StocktakingDiscrepanciesService) {}

  // 棚卸差異一覧取得 / 获取盘点差异列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stocktakingOrderId') stocktakingOrderId?: string,
    @Query('status') status?: string,
  ) {
    return this.stocktakingDiscrepanciesService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      stocktakingOrderId,
      status,
    });
  }

  // 棚卸差異詳細取得 / 获取盘点差异详情
  @Get(':id')
  findById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stocktakingDiscrepanciesService.findById(tenantId, id);
  }

  // 棚卸差異自動生成（棚卸結果 vs システム在庫）
  // 自动生成盘点差异（盘点结果 vs 系统库存）
  @Post('generate/:stocktakingOrderId')
  generate(
    @TenantId() tenantId: string,
    @Param('stocktakingOrderId', ParseUUIDPipe) stocktakingOrderId: string,
  ) {
    return this.stocktakingDiscrepanciesService.generate(tenantId, stocktakingOrderId);
  }

  // 棚卸差異更新 / 更新盘点差异
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.stocktakingDiscrepanciesService.update(tenantId, id, dto);
  }

  // 差異承認（在庫調整実行）/ 差异批准（执行库存调整）
  @Post(':id/approve')
  approve(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.stocktakingDiscrepanciesService.approve(tenantId, id, dto);
  }

  // 差異却下 / 差异驳回
  @Post(':id/reject')
  reject(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.stocktakingDiscrepanciesService.reject(tenantId, id, dto);
  }
}
