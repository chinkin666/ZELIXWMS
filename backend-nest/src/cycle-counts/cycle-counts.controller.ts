// 循環棚卸コントローラ / 循环盘点控制器
import { Controller, Get, Post, Put, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { CycleCountsService } from './cycle-counts.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/cycle-counts')
export class CycleCountsController {
  constructor(private readonly cycleCountsService: CycleCountsService) {}

  // 循環棚卸一覧取得 / 获取循环盘点列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.cycleCountsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      warehouseId,
    });
  }

  // 循環棚卸ID検索 / 按ID查找循环盘点
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cycleCountsService.findById(tenantId, id);
  }

  // 循環棚卸作成 / 创建循环盘点
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cycleCountsService.create(tenantId, body);
  }

  // 循環棚卸更新 / 更新循环盘点
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.cycleCountsService.update(tenantId, id, body);
  }

  // 循環棚卸開始 / 开始循环盘点
  @Post(':id/start')
  start(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cycleCountsService.start(tenantId, id);
  }

  // 循環棚卸完了 / 完成循环盘点
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cycleCountsService.complete(tenantId, id);
  }
}
