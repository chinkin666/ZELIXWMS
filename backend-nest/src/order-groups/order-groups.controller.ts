// オーダーグループコントローラ / 订单分组控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { OrderGroupsService } from './order-groups.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/order-groups')
export class OrderGroupsController {
  constructor(private readonly orderGroupsService: OrderGroupsService) {}

  // 自動振り分け実行 / 执行自动分配
  // NOTE: この定義は :id ルートより先に配置する必要がある /
  // 注意: 此路由必须在 :id 路由之前定义
  @Post('auto-assign')
  autoAssign(@TenantId() tenantId: string) {
    return this.orderGroupsService.assignOrdersToGroups(tenantId);
  }

  // グループ別注文数取得 / 获取各分组订单数
  // NOTE: :id ルートより先に配置 / 注意: 必须在 :id 路由之前
  @Get('counts')
  getCounts(@TenantId() tenantId: string) {
    return this.orderGroupsService.getCounts(tenantId);
  }

  // 並び替え / 排序
  @Post('reorder')
  reorder(@TenantId() tenantId: string, @Body() body: { orderedIds: string[] }) {
    return this.orderGroupsService.reorder(tenantId, body.orderedIds);
  }

  // 一覧取得 / 获取列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('name') name?: string,
    @Query('enabled') enabled?: string,
  ) {
    return this.orderGroupsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      name,
      enabled: enabled !== undefined ? enabled === 'true' : undefined,
    });
  }

  // ID検索 / 按ID查找
  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.orderGroupsService.findById(tenantId, id);
  }

  // 作成 / 创建
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.orderGroupsService.create(tenantId, dto);
  }

  // 更新 / 更新
  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.orderGroupsService.update(tenantId, id, dto);
  }

  // 削除 / 删除
  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.orderGroupsService.remove(tenantId, id);
  }
}
