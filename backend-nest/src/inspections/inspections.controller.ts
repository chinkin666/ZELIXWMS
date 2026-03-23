// 検品コントローラ / 检验控制器
import { Controller, Get, Post, Put, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { InspectionsService } from './inspections.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/inspections')
@RequireRole('admin', 'manager', 'operator')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  // 検品一覧取得 / 获取检验列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.inspectionsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      type,
    });
  }

  // 検品ID検索 / 按ID查找检验
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inspectionsService.findById(tenantId, id);
  }

  // 検品作成 / 创建检验
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.inspectionsService.create(tenantId, body);
  }

  // 検品更新 / 更新检验
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.inspectionsService.update(tenantId, id, body);
  }
}
