// 倉庫コントローラ / 仓库控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { WarehousesService } from './warehouses.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createWarehouseSchema, updateWarehouseSchema, type CreateWarehouseDto, type UpdateWarehouseDto } from './dto/create-warehouse.dto.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/warehouses')
@RequireRole('admin', 'manager', 'operator')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  // 倉庫一覧取得 / 获取仓库列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.warehousesService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      code,
      name,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // 倉庫ID検索 / 按ID查找仓库
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehousesService.findById(tenantId, id);
  }

  // 倉庫作成 / 创建仓库
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createWarehouseSchema)) dto: CreateWarehouseDto,
  ) {
    return this.warehousesService.create(tenantId, dto);
  }

  // 倉庫更新 / 更新仓库
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema)) dto: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(tenantId, id, dto);
  }

  // 倉庫削除（物理削除）/ 删除仓库（物理删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehousesService.remove(tenantId, id);
  }
}
