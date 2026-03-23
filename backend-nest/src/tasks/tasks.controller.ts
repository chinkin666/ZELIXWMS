// タスクコントローラ（/api/tasksパス）/ 任务控制器（/api/tasks路径）
import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { RequireRole } from '../common/decorators/require-role.decorator.js';

@Controller('api/tasks')
@RequireRole('admin', 'manager', 'operator')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.tasksService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return this.tasksService.create(tenantId, dto);
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return this.tasksService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.remove(tenantId, id);
  }

  // タスク完了 / 完成任务
  @Patch(':id/complete')
  complete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.complete(tenantId, id);
  }

  // タスク割り当て / 分配任务
  @Patch(':id/assign')
  assign(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) {
    return this.tasksService.assign(tenantId, id, body);
  }
}
