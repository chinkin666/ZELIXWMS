// 出荷注文コントローラ / 出货订单控制器
import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ShipmentService } from './shipment.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  createShipmentOrderSchema,
  updateShipmentOrderSchema,
  type CreateShipmentOrderDto,
  type UpdateShipmentOrderDto,
} from './dto/create-shipment-order.dto.js';

@Controller('api/shipment-orders')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  // 出荷注文一覧取得 / 获取出货订单列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('statusConfirmed') statusConfirmed?: string,
    @Query('statusShipped') statusShipped?: string,
    @Query('carrierId') carrierId?: string,
    @Query('search') search?: string,
  ) {
    return this.shipmentService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      statusConfirmed: statusConfirmed !== undefined ? statusConfirmed === 'true' : undefined,
      statusShipped: statusShipped !== undefined ? statusShipped === 'true' : undefined,
      carrierId,
      search,
    });
  }

  // 出荷注文作成 / 创建出货订单
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createShipmentOrderSchema)) dto: CreateShipmentOrderDto,
  ) {
    return this.shipmentService.create(tenantId, dto);
  }

  // 出荷注文一括作成 / 批量创建出货订单
  @Post('bulk')
  bulkCreate(
    @TenantId() tenantId: string,
    @Body() body: { orders: CreateShipmentOrderDto[] },
  ) {
    return this.shipmentService.bulkCreate(tenantId, body.orders);
  }

  // 出荷注文一括削除 / 批量删除出货订单
  @Post('bulk-delete')
  bulkDelete(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[] },
  ) {
    return this.shipmentService.bulkDelete(tenantId, body.ids);
  }

  // 出荷注文ID検索 / 按ID查找出货订单
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentService.findById(tenantId, id);
  }

  // 出荷注文の商品取得 / 获取出货订单的商品
  @Get(':id/products')
  findProducts(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentService.findProducts(tenantId, id);
  }

  // 出荷注文確認（statusConfirmed=true）/ 出货订单确认（statusConfirmed=true）
  @Post(':id/confirm')
  confirm(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentService.confirm(tenantId, id);
  }

  // 出荷注文出荷（statusShipped=true）/ 出货订单发货（statusShipped=true）
  @Post(':id/ship')
  ship(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentService.ship(tenantId, id);
  }

  // 出荷注文更新 / 更新出货订单
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateShipmentOrderSchema)) dto: UpdateShipmentOrderDto,
  ) {
    return this.shipmentService.update(tenantId, id, dto);
  }

  // 手動一括作成（bulkのエイリアス）/ 手动批量创建（bulk的别名）
  @Post('manual/bulk')
  manualBulkCreate(
    @TenantId() tenantId: string,
    @Body() body: { orders: CreateShipmentOrderDto[] },
  ) {
    return this.shipmentService.bulkCreate(tenantId, body.orders);
  }

  // 出荷注文部分更新 / 出货订单部分更新
  @Patch(':id')
  partialUpdate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentOrderDto,
  ) {
    return this.shipmentService.update(tenantId, id, dto);
  }

  // 出荷注文一括部分更新（プレースホルダー）/ 出货订单批量部分更新（占位符）
  @Patch('bulk')
  bulkPartialUpdate(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[]; data: Record<string, unknown> },
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder', ids: body.ids };
  }

  // ID一括取得（プレースホルダー）/ 按ID批量获取（占位符）
  @Post('by-ids')
  findByIds(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[] },
  ) {
    return { items: [], ids: body.ids, message: 'Not implemented yet / 未実装 / 尚未实现' };
  }

  // 単一ステータス変更 / 单个状态变更
  @Post(':id/status')
  changeStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string },
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder', orderId: id, newStatus: body.status };
  }

  // 一括ステータス変更（プレースホルダー）/ 批量状态变更（占位符）
  @Post('status/bulk')
  bulkChangeStatus(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[]; status: string },
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder', ids: body.ids, newStatus: body.status };
  }

  // 配送業者受領インポート（プレースホルダー）/ 配送业者回单导入（占位符）
  @Post('carrier-receipts/import')
  importCarrierReceipts(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // グループ別件数取得（プレースホルダー）/ 获取分组计数（占位符）
  @Get('group-counts')
  getGroupCounts(@TenantId() tenantId: string) {
    return { groups: [], message: 'Not implemented yet / 未実装 / 尚未实现' };
  }

  // エクスポート（プレースホルダー）/ 导出（占位符）
  @Post('export')
  exportOrders(@TenantId() tenantId: string) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // 追跡情報取得（プレースホルダー）/ 获取跟踪信息（占位符）
  @Get(':id/tracking')
  getTracking(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return { events: [], orderId: id, message: 'Not implemented yet / 未実装 / 尚未实现' };
  }

  // 出荷注文削除（論理削除）/ 删除出货订单（软删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentService.remove(tenantId, id);
  }
}
