// セットオーダーコントローラ / 套装订单控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { SetOrdersService } from './set-orders.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/set-orders')
@RequireRole('admin', 'manager', 'operator')
export class SetOrdersController {
  constructor(private readonly setOrdersService: SetOrdersService) {}

  // 一覧取得 / 获取列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.setOrdersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ID検索 / 按ID查找
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.setOrdersService.findById(tenantId, id);
  }

  // 作成 / 创建
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.setOrdersService.create(tenantId, dto);
  }

  // 更新 / 更新
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.setOrdersService.update(tenantId, id, dto);
  }

  // 削除 / 删除
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.setOrdersService.remove(tenantId, id);
  }

  // 完了 / 完成
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.setOrdersService.complete(tenantId, id);
  }

  // キャンセル / 取消
  @Post(':id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.setOrdersService.cancel(tenantId, id);
  }
}
