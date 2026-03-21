// ショップコントローラ / 店铺控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { ShopsService } from './shops.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createShopSchema, updateShopSchema, type CreateShopDto, type UpdateShopDto } from './dto/create-shop.dto.js';

@Controller('api/shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  // ショップ一覧取得 / 获取店铺列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('clientId') clientId?: string,
    @Query('platform') platform?: string,
    @Query('code') code?: string,
    @Query('name') name?: string,
  ) {
    return this.shopsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      clientId,
      platform,
      code,
      name,
    });
  }

  // ショップID検索 / 按ID查找店铺
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shopsService.findById(tenantId, id);
  }

  // ショップ作成 / 创建店铺
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createShopSchema)) dto: CreateShopDto,
  ) {
    return this.shopsService.create(tenantId, dto);
  }

  // ショップ更新 / 更新店铺
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateShopSchema)) dto: UpdateShopDto,
  ) {
    return this.shopsService.update(tenantId, id, dto);
  }

  // ショップ削除 / 删除店铺
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shopsService.remove(tenantId, id);
  }
}
