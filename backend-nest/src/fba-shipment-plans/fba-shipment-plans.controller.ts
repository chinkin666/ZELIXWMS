// FBA出荷プランコントローラ / FBA出货计划控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { FbaShipmentPlansService } from './fba-shipment-plans.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/fba-shipment-plans')
export class FbaShipmentPlansController {
  constructor(private readonly fbaShipmentPlansService: FbaShipmentPlansService) {}

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

  // プラン提出 / 提交计划
  @Post(':id/submit')
  submit(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // ラベル取得 / 获取标签
  @Get(':id/labels')
  getLabels(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return { id, labels: [], message: 'Not implemented yet / 未実装 / 尚未实现' };
  }
}
