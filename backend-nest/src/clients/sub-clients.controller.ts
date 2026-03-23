// サブクライアントコントローラ / 子客户控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { SubClientsService } from './sub-clients.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createSubClientSchema, updateSubClientSchema, type CreateSubClientDto, type UpdateSubClientDto } from './dto/create-sub-client.dto.js';

@Controller('api/sub-clients')
@RequireRole('admin', 'manager', 'operator')
export class SubClientsController {
  constructor(private readonly subClientsService: SubClientsService) {}

  // サブクライアント一覧取得 / 获取子客户列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientId') clientId?: string,
    @Query('code') code?: string,
    @Query('name') name?: string,
  ) {
    return this.subClientsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      clientId,
      code,
      name,
    });
  }

  // サブクライアントID検索 / 按ID查找子客户
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subClientsService.findById(tenantId, id);
  }

  // サブクライアント作成 / 创建子客户
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createSubClientSchema)) dto: CreateSubClientDto,
  ) {
    return this.subClientsService.create(tenantId, dto);
  }

  // サブクライアント更新 / 更新子客户
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateSubClientSchema)) dto: UpdateSubClientDto,
  ) {
    return this.subClientsService.update(tenantId, id, dto);
  }

  // サブクライアント削除 / 删除子客户
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.subClientsService.remove(tenantId, id);
  }
}
