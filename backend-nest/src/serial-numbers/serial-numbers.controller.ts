// シリアル番号コントローラ / 序列号控制器
import { Controller, Get, Post, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { SerialNumbersService } from './serial-numbers.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/serial-numbers')
export class SerialNumbersController {
  constructor(private readonly serialNumbersService: SerialNumbersService) {}

  // シリアル番号一覧取得 / 获取序列号列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
  ) {
    return this.serialNumbersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      productId,
      status,
    });
  }

  // シリアル番号ID検索 / 按ID查找序列号
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serialNumbersService.findById(tenantId, id);
  }

  // シリアル番号登録 / 创建序列号
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.serialNumbersService.create(tenantId, body);
  }

  // シリアル番号削除 / 删除序列号
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.serialNumbersService.remove(tenantId, id);
  }
}
