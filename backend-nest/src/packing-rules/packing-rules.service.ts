// 梱包ルールサービス / 包装规则服务
// ruleDefinitions テーブルを module='packing' でフィルタして使用 / 使用ruleDefinitions表并按module='packing'过滤
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { ruleDefinitions } from '../database/schema/extensions.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

// 梱包ルール固定モジュール名 / 包装规则固定模块名
const PACKING_MODULE = 'packing';

interface FindAllQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  name?: string;
}

@Injectable()
export class PackingRulesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 梱包ルール一覧取得 / 获取包装规则列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築（module='packing' 固定）/ 构建查询条件（module='packing'固定）
    const conditions: SQL[] = [
      eq(ruleDefinitions.tenantId, tenantId),
      eq(ruleDefinitions.module, PACKING_MODULE),
    ];

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

  // 梱包ルールID検索 / 按ID查找包装规则
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(ruleDefinitions)
      .where(and(
        eq(ruleDefinitions.id, id),
        eq(ruleDefinitions.tenantId, tenantId),
        eq(ruleDefinitions.module, PACKING_MODULE),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('PACKING_RULE_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 梱包ルール作成 / 创建包装规则
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db.insert(ruleDefinitions).values({
      tenantId,
      name: dto.name as string,
      description: dto.description as string,
      module: PACKING_MODULE,
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

  // 梱包ルール更新 / 更新包装规则
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // module は変更不可 / 不允许修改module
    const fields = [
      'name', 'description', 'warehouseId', 'clientId',
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

  // 梱包ルール削除（物理削除）/ 删除包装规则（物理删除）
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
