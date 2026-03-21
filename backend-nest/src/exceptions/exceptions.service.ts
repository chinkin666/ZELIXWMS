// 異常報告サービス / 异常报告服务
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { exceptionReports } from '../database/schema/exceptions.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  status?: string;
  level?: string;
}

@Injectable()
export class ExceptionsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 一覧取得 / 获取列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(exceptionReports.tenantId, tenantId)];
    if (query.status) {
      conditions.push(eq(exceptionReports.status, query.status));
    }
    if (query.level) {
      conditions.push(eq(exceptionReports.level, query.level));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(exceptionReports).where(where).limit(limit).offset(offset).orderBy(exceptionReports.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(exceptionReports).where(where),
    ]);

    return { items, total: countResult[0]?.count ?? 0, page, limit };
  }

  // ID検索 / 按ID查找
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(exceptionReports)
      .where(and(eq(exceptionReports.id, id), eq(exceptionReports.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`ExceptionReport ${id} not found / 異常報告 ${id} が見つかりません / 异常报告 ${id} 未找到`);
    }
    return rows[0];
  }

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(exceptionReports)
      .values({ tenantId, ...dto })
      .returning();
    return rows[0];
  }

  // 更新 / 更新
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(exceptionReports)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(exceptionReports.id, id), eq(exceptionReports.tenantId, tenantId)))
      .returning();
    return rows[0];
  }
}
