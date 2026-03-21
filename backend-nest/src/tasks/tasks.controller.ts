// タスクコントローラ（/api/tasksパス）/ 任务控制器（/api/tasks路径）
import { Controller, Get, Post, Put, Patch, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';

@Controller('api/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return { items: [], total: 0, page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 20, message: 'Not implemented yet / 未実装 / 尚未实现' };
  }

  @Get(':id')
  findOne(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: Record<string, unknown>) {
    return { message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  @Put(':id')
  update(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: Record<string, unknown>) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  @Delete(':id')
  remove(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // タスク完了 / 完成任务
  @Patch(':id/complete')
  complete(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }

  // タスク割り当て / 分配任务
  @Patch(':id/assign')
  assign(@TenantId() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Body() body: Record<string, unknown>) {
    return { id, message: 'Not implemented yet / 未実装 / 尚未实现', status: 'placeholder' };
  }
}
