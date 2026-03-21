// 通知設定サービス / 通知偏好服务
// systemSettings テーブルを settingsKey='notification_preferences' で使用 / 使用systemSettings表并按settingsKey='notification_preferences'管理
import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { systemSettings } from '../database/schema/settings.js';

// 通知設定キー / 通知设置键
const NOTIF_PREF_KEY = 'notification_preferences';

// デフォルト通知設定 / 默认通知设置
const DEFAULT_PREFERENCES = {
  email: {
    enabled: true,
    orderCreated: true,
    orderShipped: true,
    orderCancelled: true,
    inboundReceived: true,
    lowStock: true,
    dailyReport: false,
  },
  push: {
    enabled: false,
    orderCreated: false,
    orderShipped: false,
    orderCancelled: false,
    inboundReceived: false,
    lowStock: false,
    dailyReport: false,
  },
  webhook: {
    enabled: false,
    orderCreated: false,
    orderShipped: false,
    orderCancelled: false,
    inboundReceived: false,
    lowStock: false,
    dailyReport: false,
  },
};

@Injectable()
export class NotificationPreferencesService {
  constructor(@Inject(DRIZZLE) private readonly db: any) {}

  // 通知設定取得（存在しない場合はデフォルト返却）/ 获取通知偏好（不存在时返回默认值）
  async findAll(tenantId: string) {
    const rows = await this.db
      .select()
      .from(systemSettings)
      .where(and(
        eq(systemSettings.tenantId, tenantId),
        eq(systemSettings.settingsKey, NOTIF_PREF_KEY),
      ))
      .limit(1);

    if (rows.length === 0) {
      // デフォルト設定を返却 / 返回默认设置
      return { preferences: DEFAULT_PREFERENCES };
    }

    return { preferences: rows[0].settings };
  }

  // 通知設定更新（upsert）/ 更新通知偏好（upsert）
  async update(tenantId: string, dto: Record<string, unknown>) {
    // 既存レコード検索 / 搜索现有记录
    const existing = await this.db
      .select()
      .from(systemSettings)
      .where(and(
        eq(systemSettings.tenantId, tenantId),
        eq(systemSettings.settingsKey, NOTIF_PREF_KEY),
      ))
      .limit(1);

    if (existing.length > 0) {
      // 既存設定とマージ / 与现有设置合并
      const currentSettings = (existing[0].settings || {}) as Record<string, unknown>;
      const mergedSettings = { ...currentSettings, ...dto };

      const rows = await this.db
        .update(systemSettings)
        .set({ settings: mergedSettings, updatedAt: new Date() })
        .where(and(
          eq(systemSettings.id, existing[0].id),
          eq(systemSettings.tenantId, tenantId),
        ))
        .returning();

      return { preferences: rows[0].settings };
    }

    // 新規作成 / 新建
    const newSettings = { ...DEFAULT_PREFERENCES, ...dto };
    const rows = await this.db.insert(systemSettings).values({
      tenantId,
      settingsKey: NOTIF_PREF_KEY,
      settings: newSettings,
    }).returning();

    return { preferences: rows[0].settings };
  }
}
