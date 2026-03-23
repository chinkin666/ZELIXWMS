// ラベリングタスクコントローラ / 贴标任务控制器
import { Controller, Get, Post, Put, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { LabelingTasksService } from './labeling-tasks.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/labeling-tasks')
@RequireRole('admin', 'manager', 'operator')
export class LabelingTasksController {
  constructor(private readonly labelingTasksService: LabelingTasksService) {}

  // ラベリングタスク一覧取得 / 获取贴标任务列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.labelingTasksService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  // ラベリングタスクID検索 / 按ID查找贴标任务
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.labelingTasksService.findById(tenantId, id);
  }

  // ラベリングタスク作成 / 创建贴标任务
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.labelingTasksService.create(tenantId, body);
  }

  // ラベリングタスク更新 / 更新贴标任务
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.labelingTasksService.update(tenantId, id, body);
  }

  // ラベリングタスク開始 / 开始贴标任务
  @Post(':id/start')
  start(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.labelingTasksService.start(tenantId, id);
  }

  // ラベリングタスク完了 / 完成贴标任务
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.labelingTasksService.complete(tenantId, id);
  }
}
