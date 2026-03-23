// 棚卸コントローラ / 盘点控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { StocktakingService } from './stocktaking.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createStocktakingSchema, updateStocktakingSchema, type CreateStocktakingDto, type UpdateStocktakingDto } from './dto/create-stocktaking.dto.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/stocktaking')
@RequireRole('admin', 'manager', 'operator')
export class StocktakingController {
  constructor(private readonly stocktakingService: StocktakingService) {}

  // 棚卸一覧取得 / 获取盘点列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: string,
  ) {
    return this.stocktakingService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      warehouseId,
      type,
    });
  }

  // 棚卸ID検索 / 按ID查找盘点单
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stocktakingService.findById(tenantId, id);
  }

  // 棚卸作成 / 创建盘点单
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createStocktakingSchema)) dto: CreateStocktakingDto,
  ) {
    return this.stocktakingService.create(tenantId, dto);
  }

  // 棚卸更新 / 更新盘点单
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateStocktakingSchema)) dto: UpdateStocktakingDto,
  ) {
    return this.stocktakingService.update(tenantId, id, dto);
  }

  // 棚卸カウント登録 / 登记盘点计数
  @Post(':id/count')
  registerCount(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.stocktakingService.registerCount(tenantId, id, body);
  }

  // 棚卸完了 / 完成盘点
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stocktakingService.complete(tenantId, id);
  }

  // 棚卸キャンセル / 取消盘点
  @Post(':id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stocktakingService.cancel(tenantId, id);
  }

  // 棚卸削除（論理削除）/ 删除盘点单（软删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.stocktakingService.remove(tenantId, id);
  }
}
