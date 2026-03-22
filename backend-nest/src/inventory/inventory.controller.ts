// 在庫コントローラ / 库存控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createLocationSchema, updateLocationSchema, type CreateLocationDto, type UpdateLocationDto } from './dto/create-location.dto.js';

@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ========================================
  // ロケーション / 库位
  // ========================================

  // ロケーション一覧取得 / 获取库位列表
  @Get('locations')
  findAllLocations(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: string,
  ) {
    return this.inventoryService.findAllLocations(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      warehouseId,
      type,
    });
  }

  // ロケーションID検索 / 按ID查找库位
  @Get('locations/:id')
  findLocationById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.findLocationById(tenantId, id);
  }

  // ロケーション作成 / 创建库位
  @Post('locations')
  createLocation(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createLocationSchema)) dto: CreateLocationDto,
  ) {
    return this.inventoryService.createLocation(tenantId, dto);
  }

  // ロケーション更新 / 更新库位
  @Put('locations/:id')
  updateLocation(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLocationSchema)) dto: UpdateLocationDto,
  ) {
    return this.inventoryService.updateLocation(tenantId, id, dto);
  }

  // ロケーション削除（物理削除）/ 删除库位（硬删除）
  @Delete('locations/:id')
  removeLocation(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryService.removeLocation(tenantId, id);
  }

  // ロケーション一括作成 / 批量创建库位
  @Post('locations/bulk')
  bulkCreateLocations(
    @TenantId() tenantId: string,
    @Body() body: { locations: CreateLocationDto[] },
  ) {
    return this.inventoryService.bulkCreateLocations(tenantId, body.locations);
  }

  // ロケーションツリー取得 / 获取库位树
  @Get('locations/tree')
  getLocationTree(
    @TenantId() tenantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getLocationTree(tenantId, warehouseId);
  }

  // ========================================
  // 在庫操作 / 库存操作
  // ========================================

  // 在庫調整 / 库存调整
  @Post('adjust')
  adjustStock(
    @TenantId() tenantId: string,
    @Body() body: { productId: string; locationId: string; quantity: number; reason?: string },
  ) {
    return this.inventoryService.adjustStock(tenantId, body);
  }

  // 拠点間移動 / 跨仓库转移
  @Post('cross-site-transfer')
  crossSiteTransfer(
    @TenantId() tenantId: string,
    @Body() body: {
      productId: string;
      fromWarehouseId: string;
      fromLocationId: string;
      toWarehouseId: string;
      toLocationId: string;
      quantity: number;
      reason?: string;
    },
  ) {
    return this.inventoryService.crossSiteTransfer(tenantId, body);
  }

  // 在庫移動 / 库存转移
  @Post('transfer')
  transferStock(
    @TenantId() tenantId: string,
    @Body() body: { productId: string; fromLocationId: string; toLocationId: string; quantity: number },
  ) {
    return this.inventoryService.transferStock(tenantId, body);
  }

  // 在庫一括調整 / 库存批量调整
  @Post('bulk-adjust')
  bulkAdjustStock(
    @TenantId() tenantId: string,
    @Body() body: { adjustments: { productId: string; locationId: string; quantity: number; reason?: string }[] },
  ) {
    return this.inventoryService.bulkAdjustStock(tenantId, body.adjustments);
  }

  // ========================================
  // 在庫クエリ / 库存查询
  // ========================================

  // 在庫移動履歴取得 / 获取库存移动历史
  @Get('movements')
  getMovements(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
    @Query('moveType') moveType?: string,
  ) {
    return this.inventoryService.getMovements(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      productId,
      moveType,
    });
  }

  // 在庫エイジング分析（プレースホルダー）/ 库存老化分析（占位符）
  @Get('aging')
  getAgingAnalysis(
    @TenantId() tenantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getAgingAnalysis(tenantId, warehouseId);
  }

  // 在庫レベル取得（商品別集計）/ 获取库存水平（按商品汇总）
  @Get('stock')
  getStockLevels(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.inventoryService.getStockLevels(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      warehouseId,
      locationId,
    });
  }

  // 商品別在庫詳細 / 按商品查看库存详情
  @Get('stock/:productId')
  getStockByProduct(
    @TenantId() tenantId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.inventoryService.getStockByProduct(tenantId, productId);
  }

  // 在庫概要ダッシュボード / 库存概要仪表盘
  @Get('overview')
  getOverview(@TenantId() tenantId: string) {
    return this.inventoryService.getOverview(tenantId);
  }

  // ロケーション使用率 / 库位使用率
  @Get('location-usage')
  getLocationUsage(@TenantId() tenantId: string) {
    return this.inventoryService.getLocationUsage(tenantId);
  }

  // 在庫サマリー / 库存汇总
  @Get('stock/summary')
  getStockSummary(@TenantId() tenantId: string) {
    return this.inventoryService.getStockSummary(tenantId);
  }

  // 低在庫アラート / 低库存警报
  @Get('alerts/low-stock')
  getLowStockAlerts(@TenantId() tenantId: string) {
    return this.inventoryService.getLowStockAlerts(tenantId);
  }

  // 注文引当 / 订单预留
  @Post('reserve-orders')
  reserveOrders(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.inventoryService.reserveOrders(tenantId, body);
  }

  // ゼロ在庫クリーンアップ / 零库存清理
  @Post('cleanup-zero')
  cleanupZero(@TenantId() tenantId: string) {
    return this.inventoryService.cleanupZero(tenantId);
  }

  // 在庫リビルド / 库存重建
  @Post('rebuild')
  rebuild(@TenantId() tenantId: string) {
    return this.inventoryService.rebuild(tenantId);
  }

  // 期限切れ引当解放 / 释放过期预留
  @Post('release-expired-reservations')
  releaseExpiredReservations(@TenantId() tenantId: string) {
    return this.inventoryService.releaseExpiredReservations(tenantId);
  }

  // 在庫台帳サマリー / 库存台账汇总
  @Get('ledger-summary')
  getLedgerSummary(@TenantId() tenantId: string) {
    return this.inventoryService.getLedgerSummary(tenantId);
  }

  // 在庫エクスポート / 库存导出
  @Post('export')
  exportInventory(@TenantId() tenantId: string) {
    return this.inventoryService.exportInventory(tenantId);
  }
}
