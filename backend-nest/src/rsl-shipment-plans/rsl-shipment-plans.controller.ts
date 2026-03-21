// RSL出荷プランコントローラ / RSL出货计划控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { RslShipmentPlansService } from './rsl-shipment-plans.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/rsl-shipment-plans')
export class RslShipmentPlansController {
  constructor(private readonly rslShipmentPlansService: RslShipmentPlansService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.rslShipmentPlansService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.rslShipmentPlansService.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.rslShipmentPlansService.create(tenantId, dto);
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.rslShipmentPlansService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.rslShipmentPlansService.remove(tenantId, id);
  }
}
