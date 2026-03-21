// 返品コントローラ / 退货控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ReturnsService } from './returns.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  createReturnOrderSchema,
  updateReturnOrderSchema,
  type CreateReturnOrderDto,
  type UpdateReturnOrderDto,
} from './dto/create-return-order.dto.js';

@Controller('api/return-orders')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  // 返品オーダー一覧取得 / 获取退货订单列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.returnsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      clientId,
    });
  }

  // 返品オーダーID検索 / 按ID查找退货订单
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.findById(tenantId, id);
  }

  // 返品オーダー明細行取得 / 获取退货订单明细行
  @Get(':id/lines')
  findLines(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.findLines(tenantId, id);
  }

  // 返品オーダー作成 / 创建退货订单
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createReturnOrderSchema)) dto: CreateReturnOrderDto,
  ) {
    return this.returnsService.create(tenantId, dto);
  }

  // 返品オーダー更新 / 更新退货订单
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateReturnOrderSchema)) dto: UpdateReturnOrderDto,
  ) {
    return this.returnsService.update(tenantId, id, dto);
  }

  // 返品オーダー受領（draft → inspecting）/ 退货订单收货（draft → inspecting）
  @Post(':id/receive')
  receive(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.receive(tenantId, id);
  }

  // 返品オーダー完了（inspecting → completed）/ 退货订单完成（inspecting → completed）
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.complete(tenantId, id);
  }

  // 返品オーダーキャンセル（any → cancelled）/ 退货订单取消（any → cancelled）
  @Post(':id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.cancel(tenantId, id);
  }

  // 返品オーダー検品（inspecting状態更新）/ 退货订单检品（inspecting状态更新）
  @Post(':id/inspect')
  inspect(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.returnsService.inspect(tenantId, id, body);
  }

  // 返品オーダー再入庫 / 退货订单重新入库
  @Post(':id/putback')
  putback(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.returnsService.putback(tenantId, id, body);
  }

  // 返品インポート / 退货导入
  @Post('import')
  importOrders(
    @TenantId() tenantId: string,
    @Body() body: { orders: Record<string, any>[] },
  ) {
    return this.returnsService.importOrders(tenantId, body);
  }

  // 返品オーダー削除（論理削除）/ 删除退货订单（软删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.remove(tenantId, id);
  }
}
