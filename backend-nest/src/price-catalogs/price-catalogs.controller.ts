// 価格カタログコントローラ / 价格目录控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { PriceCatalogsService } from './price-catalogs.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/price-catalogs')
@RequireRole('admin', 'manager', 'operator')
export class PriceCatalogsController {
  constructor(private readonly priceCatalogsService: PriceCatalogsService) {}

  // 一覧取得 / 获取列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('chargeType') chargeType?: string,
    @Query('clientId') clientId?: string,
    @Query('isActive') isActive?: string,
    @Query('name') name?: string,
  ) {
    return this.priceCatalogsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      chargeType,
      clientId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      name,
    });
  }

  // ID検索 / 按ID查找
  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.priceCatalogsService.findById(tenantId, id);
  }

  // 作成 / 创建
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.priceCatalogsService.create(tenantId, dto);
  }

  // 更新 / 更新
  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.priceCatalogsService.update(tenantId, id, dto);
  }

  // 削除 / 删除
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.priceCatalogsService.remove(tenantId, id);
  }
}
