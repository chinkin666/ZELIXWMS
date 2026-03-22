// セット組み作業コントローラ / 组装作业管理控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { AssemblyOrdersService } from './assembly-orders.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/assembly-orders')
export class AssemblyOrdersController {
  constructor(private readonly assemblyOrdersService: AssemblyOrdersService) {}

  // セット組み一覧取得 / 获取组装作业列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.assemblyOrdersService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // セット組み詳細取得 / 获取组装作业详情
  @Get(':id')
  findById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assemblyOrdersService.findById(tenantId, id);
  }

  // セット組み作成 / 创建组装作业
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.assemblyOrdersService.create(tenantId, dto);
  }

  // セット組み更新 / 更新组装作业
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.assemblyOrdersService.update(tenantId, id, dto);
  }

  // 作業開始（draft→in_progress）/ 开始作业（draft→in_progress）
  @Post(':id/start')
  start(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assemblyOrdersService.start(tenantId, id);
  }

  // 作業完了（in_progress→completed）/ 完成作业（in_progress→completed）
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assemblyOrdersService.complete(tenantId, id);
  }

  // キャンセル / 取消
  @Post(':id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assemblyOrdersService.cancel(tenantId, id);
  }

  // 論理削除 / 软删除
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assemblyOrdersService.remove(tenantId, id);
  }
}
