// 資材サービス / 物料服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { materials } from '../database/schema/warehouse-ops.js';
import type { CreateMaterialDto, UpdateMaterialDto } from './dto/create-material.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  sku?: string;
  name?: string;
  category?: string;
  isActive?: boolean;
}

@Injectable()
export class MaterialsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 資材一覧取得（テナント分離・ページネーション・検索・フィルタ）/ 获取物料列表（租户隔离・分页・搜索・筛选）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(materials.tenantId, tenantId),
    ];

    if (query.sku) {
      conditions.push(ilike(materials.sku, `%${query.sku}%`));
    }
    if (query.name) {
      conditions.push(ilike(materials.name, `%${query.name}%`));
    }
    if (query.category) {
      conditions.push(eq(materials.category, query.category));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(materials.isActive, query.isActive));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(materials).where(where).limit(limit).offset(offset).orderBy(materials.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(materials).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 資材ID検索 / 按ID查找物料
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(materials)
      .where(and(
        eq(materials.id, id),
        eq(materials.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('MATERIAL_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 資材作成 / 创建物料
  async create(tenantId: string, dto: CreateMaterialDto) {
    // SKU重複チェック / SKU重复检查
    const existing = await this.db
      .select({ id: materials.id })
      .from(materials)
      .where(and(
        eq(materials.tenantId, tenantId),
        eq(materials.sku, dto.sku),
      ))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('PROD_DUPLICATE_SKU', `SKU: ${dto.sku}`);
    }

    const rows = await this.db.insert(materials).values({
      tenantId,
      ...dto,
    }).returning();

    return rows[0];
  }

  // 資材更新 / 更新物料
  async update(tenantId: string, id: string, dto: UpdateMaterialDto) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    // SKU変更時の重複チェック / SKU变更时的重复检查
    if (dto.sku) {
      const existing = await this.db
        .select({ id: materials.id })
        .from(materials)
        .where(and(
          eq(materials.tenantId, tenantId),
          eq(materials.sku, dto.sku),
        ))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('PROD_DUPLICATE_SKU', `SKU: ${dto.sku}`);
      }
    }

    const rows = await this.db
      .update(materials)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(materials.id, id), eq(materials.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 資材削除（物理削除）/ 删除物料（物理删除）
  async remove(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(materials)
      .where(and(eq(materials.id, id), eq(materials.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
