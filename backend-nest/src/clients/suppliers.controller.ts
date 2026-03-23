// 仕入先コントローラ / 供应商控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { SuppliersService } from './suppliers.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createSupplierSchema, updateSupplierSchema, type CreateSupplierDto, type UpdateSupplierDto } from './dto/create-supplier.dto.js';

@Controller('api/suppliers')
@RequireRole('admin', 'manager', 'operator')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // 仕入先一覧取得 / 获取供应商列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.suppliersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      code,
      name,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // 仕入先ID検索 / 按ID查找供应商
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.suppliersService.findById(tenantId, id);
  }

  // 仕入先作成 / 创建供应商
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createSupplierSchema)) dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(tenantId, dto);
  }

  // 仕入先更新 / 更新供应商
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSupplierSchema)) dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(tenantId, id, dto);
  }

  // 仕入先削除 / 删除供应商
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.suppliersService.remove(tenantId, id);
  }
}
