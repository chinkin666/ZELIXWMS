// 棚卸オーダーコントローラ / 盘点订单控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { StocktakingOrdersService } from './stocktaking-orders.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/stocktaking-orders')
export class StocktakingOrdersController {
  constructor(private readonly stocktakingOrdersService: StocktakingOrdersService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return { items: [], total: 0, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 20, message: 'Not implemented yet / 未実装 / 尚未实现' };
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // カウント登録 / 登记计数
  @Post(':id/count')
  registerCount(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // 完了 / 完成
  @Post(':id/complete')
  complete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // キャンセル / 取消
  @Post(':id/cancel')
  cancel(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }
}
