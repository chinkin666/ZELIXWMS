// 資材コントローラ / 物料控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { MaterialsService } from './materials.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createMaterialSchema, updateMaterialSchema, type CreateMaterialDto, type UpdateMaterialDto } from './dto/create-material.dto.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/materials')
@RequireRole('admin', 'manager', 'operator')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  // 資材一覧取得 / 获取物料列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sku') sku?: string,
    @Query('name') name?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.materialsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sku,
      name,
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // 資材ID検索 / 按ID查找物料
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.materialsService.findById(tenantId, id);
  }

  // 資材作成 / 创建物料
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createMaterialSchema)) dto: CreateMaterialDto,
  ) {
    return this.materialsService.create(tenantId, dto);
  }

  // 資材更新 / 更新物料
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateMaterialSchema)) dto: UpdateMaterialDto,
  ) {
    return this.materialsService.update(tenantId, id, dto);
  }

  // 資材削除（物理削除）/ 删除物料（物理删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.materialsService.remove(tenantId, id);
  }
}
