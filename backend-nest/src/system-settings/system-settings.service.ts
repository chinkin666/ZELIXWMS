// システム設定サービス / 系统设置服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { systemSettings } from '../database/schema/settings.js';
import type { DrizzleDB } from '../database/database.types.js';

// デフォルト設定値 / 默认设置值
const DEFAULT_SETTINGS = {
  inboundRequireInspection: true,
  inboundAutoCreateLot: false,
  inboundDefaultLocationCode: '',
  inventoryAllowNegativeStock: false,
  inventoryDefaultSafetyStock: 0,
  inventoryLotTrackingEnabled: true,
  inventoryExpiryAlertDays: 30,
  outboundAutoAllocate: false,
  outboundAllocationRule: 'FIFO',
  outboundRequireInspection: true,
  barcodeDefaultFormat: 'code128',
  barcodeScanMode: 'single',
  systemLanguage: 'ja',
  timezone: 'Asia/Tokyo',
  dateFormat: 'YYYY-MM-DD',
  pageSize: 50,
};

const SETTINGS_KEY = 'general';

@Injectable()
export class SystemSettingsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 設定取得（存在しない場合はデフォルト値を返す）/ 获取设置（不存在时返回默认值）
  async getSettings(tenantId: string) {
    const rows = await this.db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.tenantId, tenantId),
          eq(systemSettings.settingsKey, SETTINGS_KEY),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return { ...DEFAULT_SETTINGS, settingsKey: SETTINGS_KEY };
    }

    const stored = rows[0].settings as Record<string, unknown>;
    return {
      _id: rows[0].id,
      settingsKey: rows[0].settingsKey,
      ...DEFAULT_SETTINGS,
      ...stored,
      createdAt: rows[0].createdAt?.toISOString(),
      updatedAt: rows[0].updatedAt?.toISOString(),
    };
  }

  // 設定更新（upsert）/ 更新设置（upsert）
  async updateSettings(tenantId: string, data: Record<string, unknown>) {
    // 不要なフィールドを除外 / 排除不需要的字段
    const { _id, settingsKey, createdAt, updatedAt, ...payload } = data;

    const existing = await this.db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.tenantId, tenantId),
          eq(systemSettings.settingsKey, SETTINGS_KEY),
        ),
      )
      .limit(1);

    if (existing.length === 0) {
      const rows = await this.db
        .insert(systemSettings)
        .values({
          tenantId,
          settingsKey: SETTINGS_KEY,
          settings: payload,
        })
        .returning();
      const stored = rows[0].settings as Record<string, unknown>;
      return { _id: rows[0].id, settingsKey: SETTINGS_KEY, ...DEFAULT_SETTINGS, ...stored };
    }

    const merged = { ...(existing[0].settings as Record<string, unknown>), ...payload };
    const rows = await this.db
      .update(systemSettings)
      .set({ settings: merged, updatedAt: new Date() })
      .where(
        and(
          eq(systemSettings.tenantId, tenantId),
          eq(systemSettings.settingsKey, SETTINGS_KEY),
        ),
      )
      .returning();

    const stored = rows[0].settings as Record<string, unknown>;
    return { _id: rows[0].id, settingsKey: SETTINGS_KEY, ...DEFAULT_SETTINGS, ...stored };
  }

  // リセット / 重置
  async resetSettings(tenantId: string) {
    await this.db
      .delete(systemSettings)
      .where(
        and(
          eq(systemSettings.tenantId, tenantId),
          eq(systemSettings.settingsKey, SETTINGS_KEY),
        ),
      );

    return { ...DEFAULT_SETTINGS, settingsKey: SETTINGS_KEY };
  }
}
