// 通知サービス / 通知服务
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql, SQL } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { notifications } from '../database/schema/settings.js';
import type { CreateNotificationDto } from './dto/create-notification.dto.js';

interface FindAllQuery {
  page?: number;
  limit?: number;
  userId?: string;
  type?: string;
  isRead?: boolean;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 通知一覧取得（テナント分離・ページネーション・フィルタ）/ 获取通知列表（租户隔离・分页・过滤）
  async findAll(tenantId: string, query: FindAllQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    // 検索条件構築 / 构建查询条件
    const conditions: SQL[] = [
      eq(notifications.tenantId, tenantId),
    ];

    if (query.userId) {
      conditions.push(eq(notifications.userId, query.userId));
    }
    if (query.type) {
      conditions.push(eq(notifications.type, query.type));
    }
    if (query.isRead !== undefined) {
      conditions.push(eq(notifications.isRead, query.isRead));
    }

    const where = and(...conditions);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(notifications).where(where).limit(limit).offset(offset).orderBy(notifications.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // 通知ID検索 / 按ID查找通知
  async findById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Notification ${id} not found / 通知 ${id} が見つかりません / 通知 ${id} 未找到`);
    }
    return rows[0];
  }

  // 通知作成 / 创建通知
  async create(tenantId: string, dto: CreateNotificationDto) {
    const rows = await this.db
      .insert(notifications)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // 単一通知を既読にする / 将单个通知标记为已读
  async markAsRead(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findById(tenantId, id);

    const rows = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ユーザーの全通知を既読にする / 将用户的全部通知标记为已读
  async markAllRead(tenantId: string, userId: string) {
    const rows = await this.db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId),
        eq(notifications.isRead, false),
      ))
      .returning();

    return { updated: rows.length };
  }
}
