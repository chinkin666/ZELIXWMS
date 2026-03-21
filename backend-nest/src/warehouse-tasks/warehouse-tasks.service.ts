// 倉庫タスクサービス / 仓库任务服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { warehouseTasks } from '../database/schema/warehouse-ops.js';
import type { CreateWarehouseTaskDto, UpdateWarehouseTaskDto } from './dto/create-warehouse-task.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  warehouseId?: string;
  status?: string;
  type?: string;
  waveId?: string;
}

@Injectable()
export class WarehouseTasksService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // タスク一覧取得（テナント分離・ページネーション・フィルタ）/ 获取任务列表（租户隔离・分页・筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(warehouseTasks.tenantId, tenantId),
    ];

    if (query.warehouseId) {
      conditions.push(eq(warehouseTasks.warehouseId, query.warehouseId));
    }
    if (query.status) {
      conditions.push(eq(warehouseTasks.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(warehouseTasks.type, query.type));
    }
    if (query.waveId) {
      conditions.push(eq(warehouseTasks.waveId, query.waveId));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(warehouseTasks).where(where).limit(limit).offset(offset).orderBy(warehouseTasks.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(warehouseTasks).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // タスクID検索 / 按ID查找任务
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(warehouseTasks)
      .where(and(
        eq(warehouseTasks.id, id),
        eq(warehouseTasks.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('TASK_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // タスク作成 / 创建任务
  async create(tenantId: string, dto: CreateWarehouseTaskDto) {
    // タスク番号重複チェック / 任务编号重复检查
    const existing = await this.db
      .select({ id: warehouseTasks.id })
      .from(warehouseTasks)
      .where(and(
        eq(warehouseTasks.tenantId, tenantId),
        eq(warehouseTasks.taskNumber, dto.taskNumber),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Task number: ${dto.taskNumber}`);
    }

    const rows = await this.db.insert(warehouseTasks).values({
      tenantId,
      ...dto,
    }).returning();

    return rows[0];
  }

  // タスク更新 / 更新任务
  async update(tenantId: string, id: string, dto: UpdateWarehouseTaskDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // タスク番号変更時の重複チェック / 任务编号变更时的重复检查
    if (dto.taskNumber) {
      const existing = await this.db
        .select({ id: warehouseTasks.id })
        .from(warehouseTasks)
        .where(and(
          eq(warehouseTasks.tenantId, tenantId),
          eq(warehouseTasks.taskNumber, dto.taskNumber),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Task number: ${dto.taskNumber}`);
      }
    }

    const rows = await this.db
      .update(warehouseTasks)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(warehouseTasks.id, id), eq(warehouseTasks.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // タスク削除（物理削除）/ 删除任务（物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(warehouseTasks)
      .where(and(eq(warehouseTasks.id, id), eq(warehouseTasks.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ========== ワークフロー / 工作流 ==========

  // タスクアサイン（担当者設定）/ 任务分配（设置负责人）
  async assign(tenantId: string, id: string, assigneeId: string, assigneeName: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(warehouseTasks)
      .set({ assigneeId, assigneeName, updatedAt: new Date() })
      .where(and(eq(warehouseTasks.id, id), eq(warehouseTasks.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // タスク完了（status → completed, completedAt設定）/ 任务完成（status → completed, 设置completedAt）
  async complete(tenantId: string, id: string) {
    const task = await this.findById(tenantId, id);

    if (task.status === 'completed' || task.status === 'cancelled') {
      throw new WmsException('TASK_INVALID_STATUS', `Cannot complete: current status is ${task.status}`);
    }

    const rows = await this.db
      .update(warehouseTasks)
      .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(warehouseTasks.id, id), eq(warehouseTasks.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // タスクキャンセル（status → cancelled）/ 任务取消（status → cancelled）
  async cancel(tenantId: string, id: string) {
    const task = await this.findById(tenantId, id);

    if (task.status === 'completed' || task.status === 'cancelled') {
      throw new WmsException('TASK_INVALID_STATUS', `Cannot cancel: current status is ${task.status}`);
    }

    const rows = await this.db
      .update(warehouseTasks)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(warehouseTasks.id, id), eq(warehouseTasks.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
