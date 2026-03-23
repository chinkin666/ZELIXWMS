// ワークフロー自動化コントローラ / 工作流自动化控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { WorkflowsService } from './workflows.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller()
@RequireRole('admin', 'manager', 'operator')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  // ===== ワークフロー / 工作流 =====

  // ワークフロー一覧取得 / 获取工作流列表
  @Get('api/workflows')
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowsService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // 補充ワークフローステータス / 补货工作流状态
  @Get('api/workflows/replenishment/status')
  getReplenishmentStatus(@TenantId() tenantId: string) {
    return { enabled: false, lastRun: null, pendingCount: 0 };
  }

  // ワークフロー詳細取得 / 获取工作流详情
  @Get('api/workflows/:id')
  findById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflowsService.findById(tenantId, id);
  }

  // ワークフロー作成 / 创建工作流
  @Post('api/workflows')
  create(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.workflowsService.create(tenantId, dto);
  }

  // ワークフロー更新 / 更新工作流
  @Put('api/workflows/:id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.workflowsService.update(tenantId, id, dto);
  }

  // ワークフロー削除 / 删除工作流
  @Delete('api/workflows/:id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workflowsService.remove(tenantId, id);
  }

  // ワークフロートリガー / 触发工作流
  @Post('api/workflows/trigger')
  trigger(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.workflowsService.trigger(tenantId, dto);
  }

  // ワークフロー実行ログ取得 / 获取工作流执行日志
  @Get('api/workflows/:id/logs')
  findLogs(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowsService.findLogs(tenantId, id, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ===== スロッティングルール / 上架规则 =====

  // スロッティングルール一覧取得 / 获取上架规则列表
  @Get('api/slotting-rules')
  findAllRules(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workflowsService.findAllRules(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // スロッティングルール作成 / 创建上架规则
  @Post('api/slotting-rules')
  createRule(
    @TenantId() tenantId: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.workflowsService.createRule(tenantId, dto);
  }

  // スロッティングルール更新 / 更新上架规则
  @Put('api/slotting-rules/:id')
  updateRule(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Record<string, any>,
  ) {
    return this.workflowsService.updateRule(tenantId, id, dto);
  }
}
