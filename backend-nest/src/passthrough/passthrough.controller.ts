// パススルーコントローラ / 直通控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
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

  // パススルー注文更新 / 更新直通订单
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.passthroughService.update(tenantId, id, dto);
  }

  // パススルー注文削除 / 删除直通订单
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.passthroughService.remove(tenantId, id);
  }

  // パススルー注文確認 / 确认直通订单
  @Post(':id/confirm')
  confirm(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.passthroughService.confirm(tenantId, id);
  }

  // パススルー注文受領 / 接收直通订单
  @Post(':id/receive')
  receive(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.passthroughService.receive(tenantId, id);
  }

  // パススルー注文完了 / 完成直通订单
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.passthroughService.complete(tenantId, id);
  }

  // パススルー注文キャンセル / 取消直通订单
  @Post(':id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.passthroughService.cancel(tenantId, id);
  }

  // パススルーインポート / 直通导入
  @Post('import')
  importOrders(
    @TenantId() tenantId: string,
    @Body() body: { orders: Record<string, any>[] },
  ) {
    return this.passthroughService.importOrders(tenantId, body);
  }
}
