// FBA出荷プランコントローラ / FBA出货计划控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { FbaShipmentPlansService } from './fba-shipment-plans.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/fba-shipment-plans')
@RequireRole('admin', 'manager', 'operator')
export class FbaShipmentPlansController {
  constructor(private readonly fbaShipmentPlansService: FbaShipmentPlansService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.fbaShipmentPlansService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.fbaShipmentPlansService.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.fbaShipmentPlansService.create(tenantId, dto);
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.fbaShipmentPlansService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.fbaShipmentPlansService.remove(tenantId, id);
  }

  // プラン提出 / 提交计划
  @Post(':id/submit')
  submit(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.fbaShipmentPlansService.submit(tenantId, id);
  }

  // ラベル取得 / 获取标签
  @Get(':id/labels')
  getLabels(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.fbaShipmentPlansService.getLabels(tenantId, id);
  }
}
