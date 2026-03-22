// ユーザーサービス / 用户服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { eq, and, ilike, sql, or, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { users } from '../database/schema/users.js';
import { createPaginatedResult } from '../common/dto/pagination.dto.js';
import type { DrizzleDB } from '../database/database.types.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ユーザー一覧取得 / 获取用户列表
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(200, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(users.tenantId, tenantId)];

    if (query.search) {
      conditions.push(
        or(
          ilike(users.email, `%${query.search}%`),
          ilike(users.displayName, `%${query.search}%`),
        )!,
      );
    }
    if (query.role) {
      conditions.push(eq(users.role, query.role));
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(users.isActive, query.isActive));
    }

    const where = and(...conditions);

    const [items, countResult] = await Promise.all([
      this.db.select().from(users).where(where).limit(limit).offset(offset).orderBy(users.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(users).where(where),
    ]);

    return createPaginatedResult(items, countResult[0]?.count ?? 0, page, limit);
  }

  // ユーザーID検索 / 按ID查找用户
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .limit(1);

    if (rows.length === 0) {
      throw new WmsException('USER_NOT_FOUND', `ID: ${id}`);
    }
    return rows[0];
  }

  // ユーザー作成 / 创建用户
  async create(tenantId: string, dto: Record<string, unknown>) {
    const rows = await this.db
      .insert(users)
      .values({ tenantId, ...dto } as any)
      .returning();
    return rows[0];
  }

  // ユーザー更新 / 更新用户
  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(users)
      .set({ ...dto, updatedAt: new Date() } as any)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // ユーザー削除 / 删除用户
  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const rows = await this.db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .returning();
    return rows[0];
  }

  // サブユーザー取得 / 获取子用户
  async findSubUsers(tenantId: string, _parentUserId: string) {
    // 現在はテナント内の全ユーザーを返す（将来的にparentUserIdフィルタを追加）
    // 目前返回租户内的所有用户（将来添加parentUserId过滤）
    return this.findAll(tenantId, { limit: 200 });
  }

  // パスワード変更 / 更改密码
  async changePassword(_tenantId: string, _id: string, _dto: { newPassword: string }) {
    // Supabase Auth経由でパスワード変更を処理する予定 / 计划通过Supabase Auth处理密码更改
    return { message: 'パスワード変更はSupabase Auth経由で処理されます / 密码更改通过Supabase Auth处理' };
  }
}
