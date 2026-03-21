// 在庫区分コントローラ / 库存分类控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { InventoryCategoriesService } from './inventory-categories.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/inventory-categories')
export class InventoryCategoriesController {
  constructor(private readonly inventoryCategoriesService: InventoryCategoriesService) {}

  // 在庫区分一覧取得 / 获取库存分类列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.inventoryCategoriesService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // デフォルトカテゴリ初期化 / 初始化默认分类
  @Post('seed-defaults')
  seedDefaults(@TenantId() tenantId: string) {
    return this.inventoryCategoriesService.seedDefaults(tenantId);
  }

  // 在庫区分ID検索 / 按ID查找库存分类
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryCategoriesService.findById(tenantId, id);
  }

  // 在庫区分作成 / 创建库存分类
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.inventoryCategoriesService.create(tenantId, body);
  }

  // 在庫区分更新 / 更新库存分类
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.inventoryCategoriesService.update(tenantId, id, body);
  }

  // 在庫区分削除 / 删除库存分类
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inventoryCategoriesService.remove(tenantId, id);
  }
}
