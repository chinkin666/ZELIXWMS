// ロットサービス / 批次服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { lots } from '../database/schema/inventory.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  productId?: string;
  lotNumber?: string;
}

@Injectable()
export class LotsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 一覧取得 / 获取列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(lots.tenantId, tenantId)];
    if (query.productId) {
      conditions.push(eq(lots.productId, query.productId));
    }
    if (query.lotNumber) {
      conditions.push(ilike(lots.lotNumber, `%${query.lotNumber}%`));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(lots).where(where).limit(limit).offset(offset).orderBy(lots.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(lots).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ID検索 / 按ID查找
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(lots)
      .where(and(eq(lots.id, id), eq(lots.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('LOT_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(lots)
      .values({ tenantId, ...dto })
      .returning();
    return rows[0];
  }

  // 更新 / 更新
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(lots)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(lots.id, id), eq(lots.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 削除 / 删除
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(lots)
      .where(and(eq(lots.id, id), eq(lots.tenantId, tenantId)))
      .returning();
    return rows[0];
  }
}
