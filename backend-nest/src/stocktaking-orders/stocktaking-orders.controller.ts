// 棚卸オーダーコントローラ / 盘点订单控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { StocktakingOrdersService } from './stocktaking-orders.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/stocktaking-orders')
@RequireRole('admin', 'manager', 'operator')
export class StocktakingOrdersController {
  constructor(private readonly stocktakingOrdersService: StocktakingOrdersService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('stocktakingCategory') stocktakingCategory?: string,
  ) {
    return this.stocktakingOrdersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
      type,
      stocktakingCategory,
    });
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.stocktakingOrdersService.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.stocktakingOrdersService.create(tenantId, dto);
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.stocktakingOrdersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.stocktakingOrdersService.remove(tenantId, id);
  }

  // カウント登録 / 登记计数
  @Post(':id/count')
  registerCount(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) {
    return this.stocktakingOrdersService.registerCount(tenantId, id, body);
  }

  // 棚卸進捗ダッシュボード / 盘点进度看板
  @Get(':id/progress')
  getProgress(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.stocktakingOrdersService.getProgress(tenantId, id);
  }

  // 許容誤差チェック / 容差检查
  @Get(':id/tolerance-check')
  checkTolerance(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.stocktakingOrdersService.checkTolerance(tenantId, id);
  }

  // 棚卸明細行自動生成 / 自动生成盘点明细行
  @Post(':id/generate-lines')
  generateLines(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.stocktakingOrdersService.generateLines(tenantId, id);
  }

  // 完了（確定 + 在庫調整）/ 完成（确定 + 库存调整）
  @Post(':id/complete')
  complete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.stocktakingOrdersService.complete(tenantId, id);
  }

  // キャンセル / 取消
  @Post(':id/cancel')
  cancel(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.stocktakingOrdersService.cancel(tenantId, id);
  }
}
