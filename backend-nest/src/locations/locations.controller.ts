// ロケーションコントローラ（スタンドアロン）/ 库位控制器（独立）
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { LocationsService } from './locations.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/locations')
@RequireRole('admin', 'manager', 'operator')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // 一覧取得 / 获取列表
  @Get()
  findAll(@TenantId() tenantId: string, @Query('page') page?: string, @Query('limit') limit?: string, @Query('warehouseId') warehouseId?: string) {
    return this.locationsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      warehouseId,
    });
  }

  // ツリー取得 / 获取树形结构
  @Get('tree')
  getTree(@TenantId() tenantId: string, @Query('warehouseId') warehouseId?: string) {
    return this.locationsService.getTree(tenantId, warehouseId);
  }

  // ID検索 / 按ID查找
  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.findOne(tenantId, id);
  }

  // 作成 / 创建
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.locationsService.create(tenantId, dto);
  }

  // 一括作成 / 批量创建
  @Post('bulk')
  bulkCreate(@TenantId() tenantId: string, @Body() body: { locations: Record<string, unknown>[] }) {
    return this.locationsService.bulkCreate(tenantId, body.locations);
  }

  // 更新 / 更新
  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.locationsService.update(tenantId, id, dto);
  }

  // 削除 / 删除
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.locationsService.remove(tenantId, id);
  }
}
