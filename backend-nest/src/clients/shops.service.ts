// ショップサービス / 店铺服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { shops } from '../database/schema/clients.js';
import type { CreateShopDto, UpdateShopDto } from './dto/create-shop.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  clientId?: string;
  platform?: string;
  code?: string;
  name?: string;
}

@Injectable()
export class ShopsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ショップ一覧取得 / 获取店铺列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(shops.tenantId, tenantId)];

    if (query.clientId) {
      conditions.push(eq(shops.clientId, query.clientId));
    }
    if (query.platform) {
      conditions.push(ilike(shops.platform, `%${query.platform}%`));
    }
    if (query.code) {
      conditions.push(ilike(shops.code, `%${query.code}%`));
    }
    if (query.name) {
      conditions.push(ilike(shops.name, `%${query.name}%`));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(shops).where(where).limit(limit).offset(offset).orderBy(shops.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(shops).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ショップID検索 / 按ID查找店铺
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(shops)
      .where(and(eq(shops.id, id), eq(shops.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('SHOP_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // ショップ作成 / 创建店铺
  async create(tenantId: string, dto: CreateShopDto) {
    const existing = await this.db
      .select({ id: shops.id })
      .from(shops)
      .where(and(eq(shops.tenantId, tenantId), eq(shops.code, dto.code)))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Code: ${dto.code}`);
    }

    const rows = await this.db.insert(shops).values({ tenantId, ...dto }).returning();
    return rows[0];
  }

  // ショップ更新 / 更新店铺
  async update(tenantId: string, id: string, dto: UpdateShopDto) {
    await this.findById(tenantId, id);

    if (dto.code) {
      const existing = await this.db
        .select({ id: shops.id })
        .from(shops)
        .where(and(eq(shops.tenantId, tenantId), eq(shops.code, dto.code)))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Code: ${dto.code}`);
      }
    }

    const rows = await this.db
      .update(shops)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(shops.id, id), eq(shops.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ショップ削除（物理削除）/ 删除店铺（硬删除）
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(shops)
      .where(and(eq(shops.id, id), eq(shops.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
