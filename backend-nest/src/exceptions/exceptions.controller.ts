// 異常報告コントローラ / 异常报告控制器
import { Controller, Get, Post, Put, Patch, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ExceptionsService } from './exceptions.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/exceptions')
export class ExceptionsController {
  constructor(private readonly service: ExceptionsService) {}

  // 一覧取得 / 获取列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('level') level?: string,
  ) {
    return this.service.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      level,
    });
  }

  // ID検索 / 按ID查找
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(tenantId, id);
  }

  // 作成 / 创建
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.service.create(tenantId, dto);
  }

  // 更新 / 更新
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  // 異常解決 / 解决异常
  @Patch(':id/resolve')
  resolve(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.resolve(tenantId, id, body);
  }
}
