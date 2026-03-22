// ピークモードサービス / 高峰模式服务
import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module.js';
import { systemSettings } from '../database/schema/settings.js';
import type { DrizzleDB } from '../database/database.types.js';

const PEAK_MODE_KEY = 'peak_mode';

@Injectable()
export class PeakModeService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // ピークモードステータス取得 / 获取高峰模式状态
  async getStatus(tenantId: string) {
    const rows = await this.db
      .select()
      .from(systemSettings)
      .where(and(
        eq(systemSettings.tenantId, tenantId),
        eq(systemSettings.settingsKey, PEAK_MODE_KEY),
      ))
      .limit(1);

    if (rows.length === 0) {
      return {
        active: false,
        activatedAt: null,
        message: 'Peak mode is not active / ピークモード無効 / 高峰模式未激活',
      };
    }

    const settings = rows[0].settings as Record<string, unknown>;
    return {
      active: settings.active ?? false,
      activatedAt: settings.activatedAt ?? null,
      message: settings.active
        ? 'Peak mode is active / ピークモード有効 / 高峰模式已激活'
        : 'Peak mode is not active / ピークモード無効 / 高峰模式未激活',
    };
  }

  // ピークモード有効化 / 激活高峰模式
  async activate(tenantId: string) {
    const now = new Date();
    const settingsData = { active: true, activatedAt: now.toISOString() };

    // UPSERT: 既存があれば更新、なければ挿入 / 存在则更新，不存在则插入
    const existing = await this.db
      .select({ id: systemSettings.id })
      .from(systemSettings)
      .where(and(
        eq(systemSettings.tenantId, tenantId),
        eq(systemSettings.settingsKey, PEAK_MODE_KEY),
      ))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(systemSettings)
        .set({ settings: settingsData, updatedAt: now })
        .where(eq(systemSettings.id, existing[0].id));
    } else {
      await this.db
        .insert(systemSettings)
        .values({
          tenantId,
          settingsKey: PEAK_MODE_KEY,
          settings: settingsData,
        });
    }

    return {
      active: true,
      activatedAt: now.toISOString(),
      message: 'Peak mode activated / ピークモード有効化完了 / 高峰模式已激活',
    };
  }

  // ピークモード無効化 / 停用高峰模式
  async deactivate(tenantId: string) {
    const now = new Date();
    const settingsData = { active: false, deactivatedAt: now.toISOString() };

    // UPSERT: 既存があれば更新、なければ挿入 / 存在则更新，不存在则插入
    const existing = await this.db
      .select({ id: systemSettings.id })
      .from(systemSettings)
      .where(and(
        eq(systemSettings.tenantId, tenantId),
        eq(systemSettings.settingsKey, PEAK_MODE_KEY),
      ))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(systemSettings)
        .set({ settings: settingsData, updatedAt: now })
        .where(eq(systemSettings.id, existing[0].id));
    } else {
      await this.db
        .insert(systemSettings)
        .values({
          tenantId,
          settingsKey: PEAK_MODE_KEY,
          settings: settingsData,
        });
    }

    return {
      active: false,
      deactivatedAt: now.toISOString(),
      message: 'Peak mode deactivated / ピークモード無効化完了 / 高峰模式已停用',
    };
  }
}
