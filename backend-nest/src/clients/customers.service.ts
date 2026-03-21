// カスタマーサービス / 顾客服务
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { customers } from '../database/schema/clients.js';
import type { CreateCustomerDto, UpdateCustomerDto } from './dto/create-customer.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  clientId?: string;
  code?: string;
  name?: string;
  email?: string;
}

@Injectable()
export class CustomersService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // カスタマー一覧取得 / 获取顾客列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(customers.tenantId, tenantId)];

    if (query.clientId) {
      conditions.push(eq(customers.clientId, query.clientId));
    }
    if (query.code) {
      conditions.push(ilike(customers.code, `%${query.code}%`));
    }
    if (query.name) {
      conditions.push(ilike(customers.name, `%${query.name}%`));
    }
    if (query.email) {
      conditions.push(ilike(customers.email, `%${query.email}%`));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(customers).where(where).limit(limit).offset(offset).orderBy(customers.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(customers).where(where),
    ]);

    return { items, total: countResult[0]?.count ?? 0, page, limit };
  }

  // カスタマーID検索 / 按ID查找顾客
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Customer ${id} not found / カスタマー ${id} が見つかりません / 顾客 ${id} 未找到`);
    }
    return rows[0];
  }

  // カスタマー作成 / 创建顾客
  async create(tenantId: string, dto: CreateCustomerDto) {
    const existing = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.code, dto.code)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(`Code "${dto.code}" already exists / コード "${dto.code}" は既に存在します / 编码 "${dto.code}" 已存在`);
    }

    const rows = await this.db.insert(customers).values({ tenantId, ...dto }).returning();
    return rows[0];
  }

  // カスタマー更新 / 更新顾客
  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    await this.findById(tenantId, id);

    if (dto.code) {
      const existing = await this.db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.tenantId, tenantId), eq(customers.code, dto.code)))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new ConflictException(`Code "${dto.code}" already exists / コード "${dto.code}" は既に存在します / 编码 "${dto.code}" 已存在`);
      }
    }

    const rows = await this.db
      .update(customers)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // カスタマー削除（物理削除）/ 删除顾客（硬删除）
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
