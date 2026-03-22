// 仕入先サービス / 供应商服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { suppliers } from '../database/schema/clients.js';
import type { CreateSupplierDto, UpdateSupplierDto } from './dto/create-supplier.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  code?: string;
  name?: string;
  isActive?: boolean;
}

@Injectable()
export class SuppliersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 仕入先一覧取得 / 获取供应商列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(suppliers.tenantId, tenantId)];

    if (query.code) {
      conditions.push(ilike(suppliers.code, `%${query.code}%`));
    }
    if (query.name) {
      conditions.push(ilike(suppliers.name, `%${query.name}%`));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(suppliers.isActive, query.isActive));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(suppliers).where(where).limit(limit).offset(offset).orderBy(suppliers.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(suppliers).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 仕入先ID検索 / 按ID查找供应商
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('SUPPLIER_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 仕入先作成 / 创建供应商
  async create(tenantId: string, dto: CreateSupplierDto) {
    const existing = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.code, dto.code)))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Code: ${dto.code}`);
    }

    const rows = await this.db.insert(suppliers).values({ tenantId, ...dto }).returning();
    return rows[0];
  }

  // 仕入先更新 / 更新供应商
  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    await this.findById(tenantId, id);

    if (dto.code) {
      const existing = await this.db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.code, dto.code)))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Code: ${dto.code}`);
      }
    }

    const rows = await this.db
      .update(suppliers)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 仕入先削除（物理削除）/ 删除供应商（硬删除）
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
