// ルールコントローラ / 规则控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { RulesService } from './rules.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/rules')
@RequireRole('admin', 'manager', 'operator')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  // 一覧取得 / 获取列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('module') module?: string,
    @Query('isActive') isActive?: string,
    @Query('name') name?: string,
  ) {
    return this.rulesService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      module,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      name,
    });
  }

  // ID検索 / 按ID查找
  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.rulesService.findById(tenantId, id);
  }

  // 作成 / 创建
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.rulesService.create(tenantId, dto);
  }

  // 更新 / 更新
  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.rulesService.update(tenantId, id, dto);
  }

  // 削除 / 删除
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.rulesService.remove(tenantId, id);
  }
}
