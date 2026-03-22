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

  // ============================================
  // ピッキングリスト / 拣货清单
  // ============================================

  // トータルピッキングリスト取得 / 获取总拣货清单
  @Get('picking-list/total')
  getPickingListTotal(
    @TenantId() tenantId: string,
    @Query('orderIds') orderIds: string,
  ) {
    const ids = orderIds ? orderIds.split(',').filter(Boolean) : [];
    return this.shipmentService.generatePickingList(tenantId, 'total', ids);
  }

  // シングルピッキングリスト取得 / 获取单拣货清单
  @Get('picking-list/single')
  getPickingListSingle(
    @TenantId() tenantId: string,
    @Query('orderIds') orderIds: string,
  ) {
    const ids = orderIds ? orderIds.split(',').filter(Boolean) : [];
    return this.shipmentService.generatePickingList(tenantId, 'single', ids);
  }

  // サブトータルピッキングリスト取得 / 获取小计拣货清单
  @Get('picking-list/subtotal')
  getPickingListSubtotal(
    @TenantId() tenantId: string,
    @Query('groupId') groupId: string,
  ) {
    return this.shipmentService.generatePickingList(tenantId, 'subtotal', undefined, groupId);
  }

  // ============================================
  // 受注取りまとめ / 订单合并
  // ============================================

  // 注文統合（同一送付先の注文をマージ）/ 订单合并（合并同一收件人的订单）
  @Post('consolidate')
  consolidateOrders(
    @TenantId() tenantId: string,
    @Body() body: { orderIds: string[] },
  ) {
    return this.shipmentService.consolidateOrders(tenantId, body.orderIds);
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

  // ============================================
  // 出荷停止 / 出货停止
  // ============================================

  // 出荷停止（指定IDの注文を保留に設定）/ 出货停止（将指定ID的订单设为保留）
  @Post('stop')
  stopOrders(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[]; reason: string },
  ) {
    return this.shipmentService.stopOrders(tenantId, body.ids, body.reason);
  }

  // CSV一括出荷停止（注文番号で停止）/ CSV批量出货停止（按订单编号停止）
  @Post('stop/bulk-csv')
  stopOrdersByCsv(
    @TenantId() tenantId: string,
    @Body() body: { orderNumbers: string[]; reason: string },
  ) {
    return this.shipmentService.stopOrdersByNumbers(tenantId, body.orderNumbers, body.reason);
  }

  // 出荷停止解除 / 出货停止解除
  @Post('stop/release')
  releaseStoppedOrders(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[] },
  ) {
    return this.shipmentService.releaseStoppedOrders(tenantId, body.ids);
  }

  // 出荷停止一覧 / 出货停止列表
  @Get('stop/list')
  findStoppedOrders(@TenantId() tenantId: string) {
    return this.shipmentService.findStoppedOrders(tenantId);
  }

  // ============================================
  // 送り状再発行・追加発行 / 运单重新发行・追加发行
  // ============================================

  // 送り状再発行（同一追跡番号で再印刷）/ 运单重新发行（使用相同追踪号重新打印）
  @Post(':id/reissue-label')
  reissueLabel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentService.reissueLabel(tenantId, id);
  }

  // 追加発行（追加個口用の送り状発行）/ 追加发行（追加包裹用的运单发行）
  @Post(':id/additional-label')
  issueAdditionalLabel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { parcelCount: number },
  ) {
    return this.shipmentService.issueAdditionalLabel(tenantId, id, body);
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

  // 出荷注文一括部分更新 / 出货订单批量部分更新
  @Patch('bulk')
  bulkPartialUpdate(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[]; data: Record<string, unknown> },
  ) {
    return this.shipmentService.bulkPartialUpdate(tenantId, body.ids, body.data);
  }

  // ID一括取得 / 按ID批量获取
  @Post('by-ids')
  findByIds(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[] },
  ) {
    return this.shipmentService.findByIds(tenantId, body.ids);
  }

  // 単一ステータス変更 / 单个状态变更
  @Post(':id/status')
  changeStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string },
  ) {
    return this.shipmentService.changeStatus(tenantId, id, body.status);
  }

  // 一括ステータス変更 / 批量状态变更
  @Post('status/bulk')
  bulkChangeStatus(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[]; status: string },
  ) {
    return this.shipmentService.bulkChangeStatus(tenantId, body.ids, body.status);
  }

  // 配送業者受領インポート / 配送业者回单导入
  @Post('carrier-receipts/import')
  importCarrierReceipts(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.shipmentService.importCarrierReceipts(tenantId, body);
  }

  // グループ別件数取得 / 获取分组计数
  @Get('group-counts')
  getGroupCounts(@TenantId() tenantId: string) {
    return this.shipmentService.getGroupCounts(tenantId);
  }

  // エクスポート / 导出
  @Post('export')
  exportOrders(@TenantId() tenantId: string) {
    return this.shipmentService.exportOrders(tenantId);
  }

  // 出荷検品取消 / 出货检品取消
  @Post(':id/cancel-inspection')
  cancelInspection(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentService.cancelInspection(tenantId, id);
  }

  // 追跡情報取得 / 获取跟踪信息
  @Get(':id/tracking')
  getTracking(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentService.getTracking(tenantId, id);
  }

  // 出荷注文削除（論理削除）/ 删除出货订单（软删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentService.remove(tenantId, id);
  }

  // === 保留注文管理 / 保留订单管理 ===

  // 保留7日超過注文クリーンアップ / 清理超过7天的保留订单
  @Post('held/cleanup')
  cleanupExpiredHeldOrders(@TenantId() tenantId: string) {
    return this.shipmentService.cleanupExpiredHeldOrders(tenantId);
  }

  // 保留6日目アラート対象取得 / 获取保留第6天告警订单
  @Get('held/near-expiry')
  findHeldOrdersNearExpiry(@TenantId() tenantId: string) {
    return this.shipmentService.findHeldOrdersNearExpiry(tenantId);
  }
}
