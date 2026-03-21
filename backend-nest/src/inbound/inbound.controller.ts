// 入庫コントローラ / 入库控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { InboundService } from './inbound.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  createInboundOrderSchema,
  updateInboundOrderSchema,
  type CreateInboundOrderDto,
  type UpdateInboundOrderDto,
} from './dto/create-inbound-order.dto.js';

@Controller('api/inbound-orders')
export class InboundController {
  constructor(private readonly inboundService: InboundService) {}

  // 入庫オーダー一覧取得 / 获取入库订单列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('flowType') flowType?: string,
  ) {
    return this.inboundService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      clientId,
      warehouseId,
      flowType,
    });
  }

  // 入庫オーダーID検索 / 按ID查找入库订单
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inboundService.findById(tenantId, id);
  }

  // 入庫オーダー明細行取得 / 获取入库订单明细行
  @Get(':id/lines')
  findLines(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inboundService.findLines(tenantId, id);
  }

  // 入庫オーダー作成 / 创建入库订单
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createInboundOrderSchema)) dto: CreateInboundOrderDto,
  ) {
    return this.inboundService.create(tenantId, dto);
  }

  // 入庫オーダー更新 / 更新入库订单
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateInboundOrderSchema)) dto: UpdateInboundOrderDto,
  ) {
    return this.inboundService.update(tenantId, id, dto);
  }

  // 入庫オーダー確認（draft → confirmed）/ 入库订单确认（draft → confirmed）
  @Post(':id/confirm')
  confirm(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inboundService.confirm(tenantId, id);
  }

  // 入庫オーダー入荷開始（confirmed → receiving）/ 入库订单开始收货（confirmed → receiving）
  @Post(':id/receive')
  receive(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inboundService.receive(tenantId, id);
  }

  // 入庫オーダー完了（receiving → done）/ 入库订单完成（receiving → done）
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inboundService.complete(tenantId, id);
  }

  // 入庫オーダーキャンセル（any → cancelled）/ 入库订单取消（any → cancelled）
  @Post(':id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inboundService.cancel(tenantId, id);
  }

  // 入庫オーダー削除（論理削除）/ 删除入库订单（软删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inboundService.remove(tenantId, id);
  }
}
