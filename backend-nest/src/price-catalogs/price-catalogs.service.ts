// 価格カタログサービス / 价格目录服务
// serviceRates テーブルを使用 / 使用serviceRates表
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { serviceRates } from '../database/schema/billing.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  chargeType?: string;
  clientId?: string;
  isActive?: boolean;
  name?: string;
}

@Injectable()
export class PriceCatalogsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 価格カタログ一覧取得 / 获取价格目录列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(serviceRates.tenantId, tenantId),
    ];

    if (query.chargeType) {
      conditions.push(eq(serviceRates.chargeType, query.chargeType));
    }
    if (query.clientId) {
      conditions.push(eq(serviceRates.clientId, query.clientId));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(serviceRates.isActive, query.isActive));
    }
    if (query.name) {
      conditions.push(ilike(serviceRates.name, `%${query.name}%`));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(serviceRates).where(where).limit(limit).offset(offset).orderBy(serviceRates.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(serviceRates).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 価格カタログID検索 / 按ID查找价格目录
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(serviceRates)
      .where(and(
        eq(serviceRates.id, id),
        eq(serviceRates.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('PRICE_CATALOG_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 価格カタログ作成 / 创建价格目录
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db.insert(serviceRates).values({
      tenantId,
      name: dto.name as string,
      chargeType: dto.chargeType as string,
      unit: (dto.unit as string) || 'per_item',
      unitPrice: (dto.unitPrice as string) || '0',
      clientId: dto.clientId as string,
      clientName: dto.clientName as string,
      conditions: dto.conditions || null,
      validFrom: dto.validFrom ? new Date(dto.validFrom as string) : null,
      validTo: dto.validTo ? new Date(dto.validTo as string) : null,
      isActive: (dto.isActive as boolean) ?? true,
      memo: dto.memo as string,
    }).returning();

    return rows[0];
  }

  // 価格カタログ更新 / 更新价格目录
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // 更新可能フィールドの抽出 / 提取可更新字段
    const directFields = [
      'name', 'chargeType', 'unit', 'unitPrice',
      'clientId', 'clientName', 'conditions', 'isActive', 'memo',
    ] as const;

    for (const field of directFields) {
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
      .update(serviceRates)
      .set(updateData)
      .where(and(eq(serviceRates.id, id), eq(serviceRates.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 価格カタログ削除（物理削除）/ 删除价格目录（物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(serviceRates)
      .where(and(eq(serviceRates.id, id), eq(serviceRates.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
