// 依頼元会社サービス / 委托方公司服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { orderSourceCompanies } from '../database/schema/shipments.js';
import type { CreateOrderSourceCompanyDto, UpdateOrderSourceCompanyDto } from './dto/create-order-source-company.dto.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  senderName?: string;
  isActive?: boolean;
}

@Injectable()
export class OrderSourceCompaniesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 依頼元会社一覧取得 / 获取委托方公司列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(orderSourceCompanies.tenantId, tenantId)];

    if (query.senderName) {
      conditions.push(ilike(orderSourceCompanies.senderName, `%${query.senderName}%`));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(orderSourceCompanies.isActive, query.isActive));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(orderSourceCompanies).where(where).limit(limit).offset(offset).orderBy(orderSourceCompanies.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(orderSourceCompanies).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // 依頼元会社ID検索 / 按ID查找委托方公司
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(orderSourceCompanies)
      .where(and(eq(orderSourceCompanies.id, id), eq(orderSourceCompanies.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('ORDER_SOURCE_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // 依頼元会社作成 / 创建委托方公司
  async create(tenantId: string, dto: CreateOrderSourceCompanyDto) {
    // 送り主名重複チェック / 发件人名称重复检查
    const existing = await this.db
      .select({ id: orderSourceCompanies.id })
      .from(orderSourceCompanies)
      .where(and(eq(orderSourceCompanies.tenantId, tenantId), eq(orderSourceCompanies.senderName, dto.senderName)))
      .limit(1);

    if (existing.length > 0) {
      throw new WmsException('DUPLICATE_RESOURCE', `Sender name: ${dto.senderName}`);
    }

    const rows = await this.db.insert(orderSourceCompanies).values({ tenantId, ...dto }).returning();
    return rows[0];
  }

  // 依頼元会社更新 / 更新委托方公司
  async update(tenantId: string, id: string, dto: UpdateOrderSourceCompanyDto) {
    await this.findById(tenantId, id);

    if (dto.senderName) {
      const existing = await this.db
        .select({ id: orderSourceCompanies.id })
        .from(orderSourceCompanies)
        .where(and(eq(orderSourceCompanies.tenantId, tenantId), eq(orderSourceCompanies.senderName, dto.senderName)))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new WmsException('DUPLICATE_RESOURCE', `Sender name: ${dto.senderName}`);
      }
    }

    const rows = await this.db
      .update(orderSourceCompanies)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(orderSourceCompanies.id, id), eq(orderSourceCompanies.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // 依頼元会社削除（物理削除）/ 删除委托方公司（硬删除）
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(orderSourceCompanies)
      .where(and(eq(orderSourceCompanies.id, id), eq(orderSourceCompanies.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
