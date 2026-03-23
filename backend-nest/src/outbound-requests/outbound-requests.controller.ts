// 出庫依頼コントローラ / 出库请求控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { OutboundRequestsService } from './outbound-requests.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/outbound-requests')
@RequireRole('admin', 'manager', 'operator')
export class OutboundRequestsController {
  constructor(private readonly outboundRequestsService: OutboundRequestsService) {}

  // 出庫依頼一覧取得 / 获取出库请求列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.outboundRequestsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // 出庫依頼ID検索 / 按ID查找出库请求
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.outboundRequestsService.findById(tenantId, id);
  }

  // 出庫依頼作成 / 创建出库请求
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.outboundRequestsService.create(tenantId, body);
  }

  // 出庫依頼更新 / 更新出库请求
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.outboundRequestsService.update(tenantId, id, body);
  }

  // 出庫依頼削除 / 删除出库请求
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.outboundRequestsService.remove(tenantId, id);
  }

  // 出庫依頼承認 / 审批出库请求
  @Post(':id/approve')
  approve(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.outboundRequestsService.approve(tenantId, id);
  }

  // 出庫依頼出荷実行 / 执行出库发货
  @Post(':id/ship')
  ship(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.outboundRequestsService.ship(tenantId, id);
  }
}
