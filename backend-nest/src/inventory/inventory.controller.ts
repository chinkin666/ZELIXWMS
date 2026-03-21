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

  // ========================================
  // 在庫クエリ / 库存查询
  // ========================================

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
}
