// 配送業者コントローラ / 配送业者控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { CarriersService } from './carriers.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createCarrierSchema, updateCarrierSchema, type CreateCarrierDto, type UpdateCarrierDto } from './dto/create-carrier.dto.js';

@Controller('api/carriers')
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  // 配送業者一覧取得 / 获取配送业者列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('enabled') enabled?: string,
  ) {
    return this.carriersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      code,
      name,
      // 文字列→ブーリアン変換 / 字符串转布尔值
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
    });
  }

  // 配送業者ID検索 / 按ID查找配送业者
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.carriersService.findById(tenantId, id);
  }

  // 配送業者作成 / 创建配送业者
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createCarrierSchema)) dto: CreateCarrierDto,
  ) {
    return this.carriersService.create(tenantId, dto);
  }

  // 配送業者更新 / 更新配送业者
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateCarrierSchema)) dto: UpdateCarrierDto,
  ) {
    return this.carriersService.update(tenantId, id, dto);
  }

  // 配送業者削除（物理削除）/ 删除配送业者（物理删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.carriersService.remove(tenantId, id);
  }
}
