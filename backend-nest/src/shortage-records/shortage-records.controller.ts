// 欠品管理コントローラ / 缺货记录管理控制器
import { Controller, Get, Post, Put, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ShortageRecordsService } from './shortage-records.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/shortage-records')
@RequireRole('admin', 'manager', 'operator')
export class ShortageRecordsController {
  constructor(private readonly shortageRecordsService: ShortageRecordsService) {}

  // 欠品一覧取得 / 获取缺货记录列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('productId') productId?: string,
  ) {
    return this.shortageRecordsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      productId,
    });
  }

  // 欠品詳細取得 / 获取缺货记录详情
  @Get(':id')
  findById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shortageRecordsService.findById(tenantId, id);
  }

  // 欠品作成 / 创建缺货记录
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.shortageRecordsService.create(tenantId, dto);
  }

  // 欠品ステータス更新 / 更新缺货记录状态
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.shortageRecordsService.update(tenantId, id, dto);
  }

  // 引当済みに変更 / 标记为已预留
  @Post(':id/reserve')
  reserve(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shortageRecordsService.reserve(tenantId, id);
  }

  // 充足済みに変更 / 标记为已满足
  @Post(':id/fulfill')
  fulfill(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shortageRecordsService.fulfill(tenantId, id);
  }
}
