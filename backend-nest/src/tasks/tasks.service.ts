// タスクサービス（warehouse-tasksのエイリアス）/ 任务服务（warehouse-tasks的别名）
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, sql, desc, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { warehouseTasks } from '../database/schema/warehouse-ops.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

// 検索クエリ / 查询参数
interface FindTasksQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  warehouseId?: string;
}

@Injectable()
export class TasksService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 一覧取得（テナント分離・ページネーション）/ 获取列表（租户隔离・分页）
  async findAll(tenantId: string, query: FindTasksQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(warehouseTasks.tenantId, tenantId),
    ];

    if (query.status) {
      conditions.push(eq(warehouseTasks.status, query.status));
    }
    if (query.type) {
      conditions.push(eq(warehouseTasks.type, query.type));
    }
    if (query.warehouseId) {
      conditions.push(eq(warehouseTasks.warehouseId, query.warehouseId));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(warehouseTasks)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(warehouseTasks.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(warehouseTasks)
        .where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ID検索 / 按ID查找
  async findOne(tenantId: string, id: string) {
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

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    // タスク番号の自動生成 / 自动生成任务编号
    const taskNumber = dto.taskNumber as string || `TASK-${Date.now()}`;

    const rows = await this.db
      .insert(warehouseTasks)
      .values({
        tenantId,
        taskNumber,
        type: dto.type as string,
        status: 'pending',
        warehouseId: dto.warehouseId as string,
        orderId: dto.orderId as string ?? null,
        waveId: dto.waveId as string ?? null,
        assigneeId: dto.assigneeId as string ?? null,
        assigneeName: dto.assigneeName as string ?? null,
        priority: (dto.priority as number) ?? 0,
        items: dto.items ?? [],
      })
      .returning();

    return rows[0];
  }

  // 更新 / 更新
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    // 更新不可フィールドを除外 / 排除不可更新字段
    const { id: _id, tenantId: _tid, createdAt: _ca, ...updateData } = dto;

    const rows = await this.db
      .update(warehouseTasks)
      .set({ ...updateData, updatedAt: new Date() })
      .where(and(
        eq(warehouseTasks.id, id),
        eq(warehouseTasks.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // 削除 / 删除
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findOne(tenantId, id);

    const rows = await this.db
      .delete(warehouseTasks)
      .where(and(
        eq(warehouseTasks.id, id),
        eq(warehouseTasks.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // タスク完了 / 完成任务
  async complete(tenantId: string, id: string) {
    const task = await this.findOne(tenantId, id);

    // ステータスチェック / 状态检查
    if (task.status !== 'pending' && task.status !== 'in_progress') {
      throw new WmsException('TASK_INVALID_STATUS', `Cannot complete from status: ${task.status}`);
    }

    const rows = await this.db
      .update(warehouseTasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(warehouseTasks.id, id),
        eq(warehouseTasks.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }

  // タスク割り当て / 分配任务
  async assign(tenantId: string, id: string, body: Record<string, unknown>) {
    const task = await this.findOne(tenantId, id);

    // 完了・キャンセル済みには割り当て不可 / 已完成・已取消不可分配
    if (task.status === 'completed' || task.status === 'cancelled') {
      throw new WmsException('TASK_INVALID_STATUS', `Cannot assign task with status: ${task.status}`);
    }

    const rows = await this.db
      .update(warehouseTasks)
      .set({
        assigneeId: body.assigneeId as string,
        assigneeName: body.assigneeName as string ?? null,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(and(
        eq(warehouseTasks.id, id),
        eq(warehouseTasks.tenantId, tenantId),
      ))
      .returning();

    return rows[0];
  }
}
