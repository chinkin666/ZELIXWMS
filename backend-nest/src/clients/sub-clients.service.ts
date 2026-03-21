// サブクライアントサービス / 子客户服务
import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { subClients } from '../database/schema/clients.js';
import type { CreateSubClientDto, UpdateSubClientDto } from './dto/create-sub-client.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  clientId?: string;
  code?: string;
  name?: string;
}

@Injectable()
export class SubClientsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // サブクライアント一覧取得 / 获取子客户列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(subClients.tenantId, tenantId)];

    if (query.clientId) {
      conditions.push(eq(subClients.clientId, query.clientId));
    }
    if (query.code) {
      conditions.push(ilike(subClients.code, `%${query.code}%`));
    }
    if (query.name) {
      conditions.push(ilike(subClients.name, `%${query.name}%`));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(subClients).where(where).limit(limit).offset(offset).orderBy(subClients.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(subClients).where(where),
    ]);

    return { items, total: countResult[0]?.count ?? 0, page, limit };
  }

  // サブクライアントID検索 / 按ID查找子客户
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(subClients)
      .where(and(eq(subClients.id, id), eq(subClients.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`SubClient ${id} not found / サブクライアント ${id} が見つかりません / 子客户 ${id} 未找到`);
    }
    return rows[0];
  }

  // サブクライアント作成 / 创建子客户
  async create(tenantId: string, dto: CreateSubClientDto) {
    // コード重複チェック / 编码重复检查
    const existing = await this.db
      .select({ id: subClients.id })
      .from(subClients)
      .where(and(eq(subClients.tenantId, tenantId), eq(subClients.code, dto.code)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(`Code "${dto.code}" already exists / コード "${dto.code}" は既に存在します / 编码 "${dto.code}" 已存在`);
    }

    const rows = await this.db.insert(subClients).values({ tenantId, ...dto }).returning();
    return rows[0];
  }

  // サブクライアント更新 / 更新子客户
  async update(tenantId: string, id: string, dto: UpdateSubClientDto) {
    await this.findById(tenantId, id);

    if (dto.code) {
      const existing = await this.db
        .select({ id: subClients.id })
        .from(subClients)
        .where(and(eq(subClients.tenantId, tenantId), eq(subClients.code, dto.code)))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== id) {
        throw new ConflictException(`Code "${dto.code}" already exists / コード "${dto.code}" は既に存在します / 编码 "${dto.code}" 已存在`);
      }
    }

    const rows = await this.db
      .update(subClients)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(subClients.id, id), eq(subClients.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // サブクライアント削除（物理削除）/ 删除子客户（硬删除）
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(subClients)
      .where(and(eq(subClients.id, id), eq(subClients.tenantId, tenantId)))
      .returning();

    return rows[0];
  }
}
