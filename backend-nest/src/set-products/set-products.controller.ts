// セット商品コントローラ / 组合商品控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { SetProductsService } from './set-products.service.js';
import { SetOrdersService } from '../set-orders/set-orders.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/set-products')
export class SetProductsController {
  constructor(
    private readonly setProductsService: SetProductsService,
    private readonly setOrdersService: SetOrdersService,
  ) {}

  // セット商品一覧取得 / 获取组合商品列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.setProductsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // セットオーダー一覧（/set-products/orders/list）/ 组合订单列表
  @Get('orders/list')
  findAllOrders(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.setOrdersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // セットオーダー作成（/set-products/orders）/ 创建组合订单
  @Post('orders')
  createOrder(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.setOrdersService.create(tenantId, dto);
  }

  // セットオーダーID検索（/set-products/orders/:id）/ 按ID查找组合订单
  @Get('orders/:id')
  findOneOrder(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.setOrdersService.findById(tenantId, id);
  }

  // セットオーダー完了 / 完成组合订单
  @Post('orders/:id/complete')
  completeOrder(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.setOrdersService.complete(tenantId, id);
  }

  // セットオーダーキャンセル / 取消组合订单
  @Post('orders/:id/cancel')
  cancelOrder(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.setOrdersService.cancel(tenantId, id);
  }

  // セット商品ID検索 / 按ID查找组合商品
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.setProductsService.findById(tenantId, id);
  }

  // セット商品作成 / 创建组合商品
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.setProductsService.create(tenantId, body);
  }

  // セット商品更新 / 更新组合商品
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.setProductsService.update(tenantId, id, body);
  }

  // セット商品削除 / 删除组合商品
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.setProductsService.remove(tenantId, id);
  }
}
