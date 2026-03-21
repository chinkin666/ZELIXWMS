// 拡張機能サービス（Webhook・フィーチャーフラグ）/ 扩展功能服务（Webhook・功能开关）
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { webhooks, featureFlags } from '../database/schema/extensions.js';
import type { CreateWebhookDto, UpdateWebhookDto } from './dto/create-webhook.dto.js';

interface FindAllWebhooksQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class ExtensionsService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // ===== Webhook CRUD / Webhook 增删改查 =====

  // Webhook一覧取得（テナント分離・ページネーション）/ 获取Webhook列表（租户隔离・分页）
  async findAllWebhooks(tenantId: string, query: FindAllWebhooksQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const where = eq(webhooks.tenantId, tenantId);

    // 並列でデータ取得とカウント実行 / 并行执行数据获取和计数
    const [items, countResult] = await Promise.all([
      this.db.select().from(webhooks).where(where).limit(limit).offset(offset).orderBy(webhooks.createdAt),
      this.db.select({ count: sql<number>`count(*)::int` }).from(webhooks).where(where),
    ]);

    return {
      items,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
    };
  }

  // WebhookID検索 / 按ID查找Webhook
  async findWebhookById(tenantId: string, id: string) {
    const rows = await this.db
      .select()
      .from(webhooks)
      .where(and(
        eq(webhooks.id, id),
        eq(webhooks.tenantId, tenantId),
      ))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Webhook ${id} not found / Webhook ${id} が見つかりません / Webhook ${id} 未找到`);
    }
    return rows[0];
  }

  // Webhook作成 / 创建Webhook
  async createWebhook(tenantId: string, dto: CreateWebhookDto) {
    const rows = await this.db
      .insert(webhooks)
      .values({ tenantId, ...dto })
      .returning();

    return rows[0];
  }

  // Webhook更新 / 更新Webhook
  async updateWebhook(tenantId: string, id: string, dto: UpdateWebhookDto) {
    // 存在確認 / 确认存在
    await this.findWebhookById(tenantId, id);

    const rows = await this.db
      .update(webhooks)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(webhooks.id, id), eq(webhooks.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // Webhook削除（物理削除）/ 删除Webhook（硬删除）
  async removeWebhook(tenantId: string, id: string) {
    // 存在確認 / 确认存在
    await this.findWebhookById(tenantId, id);

    const rows = await this.db
      .delete(webhooks)
      .where(and(eq(webhooks.id, id), eq(webhooks.tenantId, tenantId)))
      .returning();

    return rows[0];
  }

  // ===== フィーチャーフラグ / 功能开关 =====

  // フィーチャーフラグ一覧取得（グローバル設定）/ 获取功能开关列表（全局设置）
  async findAllFlags() {
    const items = await this.db
      .select()
      .from(featureFlags)
      .orderBy(featureFlags.name);

    return { items };
  }

  // フィーチャーフラグ切替 / 切换功能开关
  async toggleFlag(id: string) {
    const existing = await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Feature flag ${id} not found / フィーチャーフラグ ${id} が見つかりません / 功能开关 ${id} 未找到`);
    }

    const rows = await this.db
      .update(featureFlags)
      .set({
        enabled: !existing[0].enabled,
        updatedAt: new Date(),
      })
      .where(eq(featureFlags.id, id))
      .returning();

    return rows[0];
  }
}
