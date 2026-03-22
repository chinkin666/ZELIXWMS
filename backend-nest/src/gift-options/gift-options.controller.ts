// ギフト設定コントローラ / 礼品设置控制器
import { Controller, Get, Post, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { GiftOptionsService } from './gift-options.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/gift-options')
export class GiftOptionsController {
  constructor(private readonly giftOptionsService: GiftOptionsService) {}

  // ギフトオプション一覧取得（出荷オーダー別）/ 获取礼品选项列表（按出货订单）
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('shipmentOrderId') shipmentOrderId?: string,
  ) {
    return this.giftOptionsService.findAll(tenantId, { shipmentOrderId });
  }

  // ギフトオプション作成 / 创建礼品选项
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.giftOptionsService.create(tenantId, dto);
  }

  // ギフトオプション削除 / 删除礼品选项
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.giftOptionsService.remove(tenantId, id);
  }
}
