// 顧客コントローラ / 客户控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, UsePipes, ParseUUIDPipe } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createClientSchema, updateClientSchema, type CreateClientDto, type UpdateClientDto } from './dto/create-client.dto.js';

@Controller('api/clients')
@RequireRole('admin', 'manager', 'operator')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // 顧客一覧取得 / 获取客户列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.clientsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      code,
      name,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // 顧客エクスポート / 导出客户
  @Get('export')
  exportClients(@TenantId() tenantId: string) {
    return this.clientsService.exportClients(tenantId);
  }

  // 顧客ID検索 / 按ID查找客户
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.findById(tenantId, id);
  }

  // 顧客作成 / 创建客户
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createClientSchema)) dto: CreateClientDto,
  ) {
    return this.clientsService.create(tenantId, dto);
  }

  // 顧客更新 / 更新客户
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateClientSchema)) dto: UpdateClientDto,
  ) {
    return this.clientsService.update(tenantId, id, dto);
  }

  // 顧客削除（論理削除）/ 删除客户（软删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.remove(tenantId, id);
  }
}
