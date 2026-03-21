// FBAボックスコントローラ / FBA箱子控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { FbaBoxesService } from './fba-boxes.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/fba-boxes')
export class FbaBoxesController {
  constructor(private readonly fbaBoxesService: FbaBoxesService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.fbaBoxesService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.fbaBoxesService.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.fbaBoxesService.create(tenantId, dto);
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.fbaBoxesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.fbaBoxesService.remove(tenantId, id);
  }
}
