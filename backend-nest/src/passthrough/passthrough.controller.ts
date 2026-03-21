// パススルーコントローラ / 直通控制器
import { Controller, Get, Post, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { PassthroughService } from './passthrough.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/passthrough')
export class PassthroughController {
  constructor(private readonly passthroughService: PassthroughService) {}

  // パススルー注文一覧取得 / 获取直通订单列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.passthroughService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // パススルー注文詳細取得 / 获取直通订单详情
  @Get('dashboard')
  getDashboard(
    @TenantId() tenantId: string,
  ) {
    return this.passthroughService.getDashboard(tenantId);
  }

  // パススルー注文詳細取得 / 获取直通订单详情
  @Get(':id')
  findById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.passthroughService.findById(tenantId, id);
  }

  // パススルー注文作成 / 创建直通订单
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.passthroughService.create(tenantId, dto);
  }

  // パススルー注文到着処理 / 直通订单到货处理
  @Post(':id/arrive')
  arrive(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.passthroughService.arrive(tenantId, id);
  }

  // パススルー注文出荷処理 / 直通订单发货处理
  @Post(':id/ship')
  ship(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.passthroughService.ship(tenantId, id);
  }
}
