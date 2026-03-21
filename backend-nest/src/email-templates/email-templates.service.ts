// メールテンプレートサービス / 邮件模板服务
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { emailTemplates } from '../database/schema/templates.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class EmailTemplatesService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 一覧取得 / 获取列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const where = eq(emailTemplates.tenantId, tenantId);

    const [items, countResult] = await Promise.all([
      this.db.select().from(emailTemplates).where(where).limit(limit).offset(offset).orderBy(emailTemplates.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(emailTemplates).where(where),
    ]);

    return { items, total: countResult[0]?.count ?? 0, page, limit };
  }

  // ID検索 / 按ID查找
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`EmailTemplate ${id} not found / メールテンプレート ${id} が見つかりません / 邮件模板 ${id} 未找到`);
    }
    return rows[0];
  }

  // 作成 / 创建
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(emailTemplates)
      .values({ tenantId, ...dto })
      .returning();
    return rows[0];
  }

  // 更新 / 更新
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(emailTemplates)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // 削除 / 删除
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.tenantId, tenantId)))
      .returning();
    return rows[0];
  }
}
