// ロットコントローラ / 批次控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { LotsService } from './lots.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  // ロット一覧取得 / 获取批次列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
    @Query('lotNumber') lotNumber?: string,
  ) {
    return this.lotsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      productId,
      lotNumber,
    });
  }

  // ロットID検索 / 按ID查找批次
  @Get(':id')
  findById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.lotsService.findById(tenantId, id);
  }

  // ロット作成 / 创建批次
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.lotsService.create(tenantId, dto);
  }

  // ロット更新 / 更新批次
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    return this.lotsService.update(tenantId, id, dto);
  }

  // ロット削除 / 删除批次
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.lotsService.remove(tenantId, id);
  }
}
