// 梱包ルールコントローラ / 包装规则控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { PackingRulesService } from './packing-rules.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/packing-rules')
@RequireRole('admin', 'manager', 'operator')
export class PackingRulesController {
  constructor(private readonly packingRulesService: PackingRulesService) {}

  // 一覧取得 / 获取列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('isActive') isActive?: string,
    @Query('name') name?: string,
  ) {
    return this.packingRulesService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      name,
    });
  }

  // ID検索 / 按ID查找
  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.packingRulesService.findById(tenantId, id);
  }

  // 作成 / 创建
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.packingRulesService.create(tenantId, dto);
  }

  // 更新 / 更新
  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.packingRulesService.update(tenantId, id, dto);
  }

  // 削除 / 删除
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.packingRulesService.remove(tenantId, id);
  }
}
