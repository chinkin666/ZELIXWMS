// 倉庫タスクコントローラ / 仓库任务控制器
import { Controller, Get, Post, Put, Delete, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { WarehouseTasksService } from './warehouse-tasks.service.js';
import { TenantId } from '../common/decorators/tenant-id.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { createWarehouseTaskSchema, updateWarehouseTaskSchema, type CreateWarehouseTaskDto, type UpdateWarehouseTaskDto } from './dto/create-warehouse-task.dto.js';

@Controller('api/warehouse-tasks')
export class WarehouseTasksController {
  constructor(private readonly warehouseTasksService: WarehouseTasksService) {}

  // タスク一覧取得 / 获取任务列表
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('waveId') waveId?: string,
  ) {
    return this.warehouseTasksService.findAll(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      warehouseId,
      status,
      type,
      waveId,
    });
  }

  // タスクID検索 / 按ID查找任务
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseTasksService.findById(tenantId, id);
  }

  // タスク作成 / 创建任务
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(createWarehouseTaskSchema)) dto: CreateWarehouseTaskDto,
  ) {
    return this.warehouseTasksService.create(tenantId, dto);
  }

  // タスク更新 / 更新任务
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWarehouseTaskSchema)) dto: UpdateWarehouseTaskDto,
  ) {
    return this.warehouseTasksService.update(tenantId, id, dto);
  }

  // タスク削除（物理削除）/ 删除任务（物理删除）
  @Delete(':id')
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseTasksService.remove(tenantId, id);
  }

  // ========== ワークフロー / 工作流 ==========

  // タスクアサイン（担当者設定）/ 任务分配（设置负责人）
  @Post(':id/assign')
  assign(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { assigneeId: string; assigneeName: string },
  ) {
    return this.warehouseTasksService.assign(tenantId, id, dto.assigneeId, dto.assigneeName);
  }

  // タスク完了（status → completed）/ 任务完成（status → completed）
  @Post(':id/complete')
  complete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseTasksService.complete(tenantId, id);
  }

  // タスクキャンセル（status → cancelled）/ 任务取消（status → cancelled）
  @Post(':id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.warehouseTasksService.cancel(tenantId, id);
  }
}
