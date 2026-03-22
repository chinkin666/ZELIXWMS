// ルールサービス / 规则服务
// ruleDefinitions テーブルを使用 / 使用ruleDefinitions表
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { ruleDefinitions } from '../database/schema/extensions.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  module?: string;
  isActive?: boolean;
  name?: string;
}

@Injectable()
export class RulesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ルール一覧取得 / 获取规则列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(ruleDefinitions.tenantId, tenantId),
    ];

    if (query.module) {
      conditions.push(eq(ruleDefinitions.module, query.module));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(ruleDefinitions.isActive, query.isActive));
    }
    if (query.name) {
      conditions.push(ilike(ruleDefinitions.name, `%${query.name}%`));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(ruleDefinitions).where(where).limit(limit).offset(offset).orderBy(ruleDefinitions.priority),
      this.db.select({ count: sql<number>`count(*)::int` }).from(ruleDefinitions).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ルールID検索 / 按ID查找规则
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(ruleDefinitions)
      .where(and(
        eq(ruleDefinitions.id, id),
        eq(ruleDefinitions.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('RULE_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // ルール作成 / 创建规则
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db.insert(ruleDefinitions).values({
      tenantId,
      name: dto.name as string,
      description: dto.description as string,
      module: dto.module as string,
      warehouseId: dto.warehouseId as string,
      clientId: dto.clientId as string,
      priority: (dto.priority as number) ?? 0,
      conditionGroups: dto.conditionGroups || [],
      actions: dto.actions || [],
      stopOnMatch: (dto.stopOnMatch as boolean) ?? false,
      isActive: (dto.isActive as boolean) ?? true,
      validFrom: dto.validFrom ? new Date(dto.validFrom as string) : null,
      validTo: dto.validTo ? new Date(dto.validTo as string) : null,
    }).returning();

    return rows[0];
  }

  // ルール更新 / 更新规则
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // 更新可能フィールドの抽出 / 提取可更新字段
    const fields = [
      'name', 'description', 'module', 'warehouseId', 'clientId',
      'priority', 'conditionGroups', 'actions', 'stopOnMatch', 'isActive',
    ] as const;

    for (const field of fields) {
      if (dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    if (dto.validFrom !== undefined) {
      updateData.validFrom = dto.validFrom ? new Date(dto.validFrom as string) : null;
    }
    if (dto.validTo !== undefined) {
      updateData.validTo = dto.validTo ? new Date(dto.validTo as string) : null;
    }

    const rows = await this.db
      .update(ruleDefinitions)
      .set(updateData)
      .where(and(eq(ruleDefinitions.id, id), eq(ruleDefinitions.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ルール削除（物理削除）/ 删除规则（物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(ruleDefinitions)
      .where(and(eq(ruleDefinitions.id, id), eq(ruleDefinitions.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
