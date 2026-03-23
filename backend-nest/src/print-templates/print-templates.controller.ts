// 印刷テンプレートコントローラ / 打印模板控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { PrintTemplatesService } from './print-templates.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/print-templates')
@RequireRole('admin', 'manager', 'operator')
export class PrintTemplatesController {
  constructor(private readonly service: PrintTemplatesService) {}

  // テンプレート解決（3階層継承） / 模板解析（三层继承）
  // 優先順位: client → tenant → system / 优先级: client → tenant → system
  @Get('resolve')
  resolveTemplate(
    @TenantId() tenantId: string,
    @Query('type') type: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.service.resolveTemplate(tenantId, type, clientId);
  }

  // 一覧取得 / 获取列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('scope') scope?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.service.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      type,
      scope,
      clientId,
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

  // 新バージョン作成 / 创建新版本
  @Post(':id/new-version')
  createVersion(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.service.createVersion(tenantId, id, dto);
  }

  // クライアント専用コピー作成 / 创建客户专用副本
  @Post(':id/client-copy')
  createClientCopy(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.service.createClientTemplate(tenantId, id, clientId);
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

  // 削除 / 删除
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }
}
