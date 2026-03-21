// ワークフロー自動化サービス / 工作流自动化服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { workflows, workflowLogs, slottingRules } from '../database/schema/workflows.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import { WmsException } from '../common/exceptions/wms.exception.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class WorkflowsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ===== ワークフロー / 工作流 =====

  // ワークフロー一覧取得（テナント分離・ページネーション）
  // 获取工作流列表（租户隔离・分页）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const where = eq(workflows.tenantId, tenantId);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(workflows)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(workflows.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(workflows)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return createPaginatedResult(items, total, page, limit);
  }

  // ワークフロー詳細取得 / 获取工作流详情
  async findById(tenantId: string, id: string) {
    const [workflow] = await this.db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
      .limit(1);

    if (!workflow) {
      throw new WmsException('WORKFLOW_NOT_FOUND', `Workflow ${id} not found`);
    }

    return workflow;
  }

  // ワークフロー作成 / 创建工作流
  async create(tenantId: string, dto: Record<string, any>) {
    const [created] = await this.db
      .insert(workflows)
      .values({
        tenantId,
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig,
        actions: dto.actions,
        enabled: dto.enabled ?? true,
      })
      .returning();

    return created;
  }

  // ワークフロー更新 / 更新工作流
  async update(tenantId: string, id: string, dto: Record<string, any>) {
    // 存在確認 / 存在确认
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(workflows)
      .set({
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig,
        actions: dto.actions,
        enabled: dto.enabled,
        updatedAt: new Date(),
      })
      .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)))
      .returning();

    return updated;
  }

  // ワークフロー削除 / 删除工作流
  async remove(tenantId: string, id: string) {
    // 存在確認 / 存在确认
    await this.findById(tenantId, id);

    await this.db
      .delete(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.tenantId, tenantId)));

    return { success: true, id };
  }

  // ワークフロートリガー（実行ログ作成）/ 触发工作流（创建执行日志）
  async trigger(tenantId: string, dto: Record<string, any>) {
    const workflowId = dto.workflowId;

    // ワークフロー存在確認 / 工作流存在确认
    const workflow = await this.findById(tenantId, workflowId);

    // 無効なワークフローはトリガー不可 / 已禁用的工作流不能触发
    if (!workflow.enabled) {
      throw new WmsException('WORKFLOW_DISABLED', `Workflow ${workflowId} is disabled`);
    }

    // 実行ログ作成 / 创建执行日志
    const [log] = await this.db
      .insert(workflowLogs)
      .values({
        tenantId,
        workflowId,
        status: 'running',
        triggerData: dto.triggerData,
        startedAt: new Date(),
      })
      .returning();

    // 最終実行日時を更新 / 更新最后执行时间
    await this.db
      .update(workflows)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(and(eq(workflows.id, workflowId), eq(workflows.tenantId, tenantId)));

    return log;
  }

  // ワークフロー実行ログ取得 / 获取工作流执行日志
  async findLogs(tenantId: string, workflowId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // ワークフロー存在確認 / 工作流存在确认
    await this.findById(tenantId, workflowId);

    const where = and(
      eq(workflowLogs.tenantId, tenantId),
      eq(workflowLogs.workflowId, workflowId),
    );

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(workflowLogs)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(workflowLogs.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(workflowLogs)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return createPaginatedResult(items, total, page, limit);
  }

  // ===== スロッティングルール / 上架规则 =====

  // スロッティングルール一覧取得 / 获取上架规则列表
  async findAllRules(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const where = eq(slottingRules.tenantId, tenantId);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(slottingRules)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(slottingRules.priority),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(slottingRules)
        .where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    return createPaginatedResult(items, total, page, limit);
  }

  // スロッティングルール作成 / 创建上架规则
  async createRule(tenantId: string, dto: Record<string, any>) {
    const [created] = await this.db
      .insert(slottingRules)
      .values({
        tenantId,
        name: dto.name,
        description: dto.description,
        priority: dto.priority ?? 0,
        conditions: dto.conditions,
        actions: dto.actions,
        enabled: dto.enabled ?? true,
      })
      .returning();

    return created;
  }

  // スロッティングルール更新 / 更新上架规则
  async updateRule(tenantId: string, id: string, dto: Record<string, any>) {
    // 存在確認 / 存在确认
    const [rule] = await this.db
      .select()
      .from(slottingRules)
      .where(and(eq(slottingRules.id, id), eq(slottingRules.tenantId, tenantId)))
      .limit(1);

    if (!rule) {
      throw new WmsException('SLOTTING_RULE_NOT_FOUND', `Slotting rule ${id} not found`);
    }

    const [updated] = await this.db
      .update(slottingRules)
      .set({
        name: dto.name,
        description: dto.description,
        priority: dto.priority,
        conditions: dto.conditions,
        actions: dto.actions,
        enabled: dto.enabled,
        updatedAt: new Date(),
      })
      .where(and(eq(slottingRules.id, id), eq(slottingRules.tenantId, tenantId)))
      .returning();

    return updated;
  }
}
