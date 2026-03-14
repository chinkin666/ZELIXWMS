/**
 * 功能开关服务 / フィーチャーフラグサービス
 *
 * 管理功能开关，支持按租户覆盖，带内存缓存。
 * 機能フラグ管理、テナントごとのオーバーライドをサポート、メモリキャッシュ付き。
 */

import { logger } from '@/lib/logger';
import { FeatureFlag, type IFeatureFlag } from '@/models/featureFlag';

/** 缓存条目 / キャッシュエントリ */
interface CacheEntry {
  data: IFeatureFlag[];
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 1分钟缓存 / 1分キャッシュ

export class FeatureFlagService {
  private cache: CacheEntry | null = null;

  /**
   * 判断指定功能是否启用 / 指定機能が有効かどうか判定
   */
  async isEnabled(key: string, tenantId?: string): Promise<boolean> {
    const flags = await this.getAllFlags();
    const flag = flags.find((f) => f.key === key);

    if (!flag) return false;

    // 检查租户覆盖 / テナントオーバーライドをチェック
    if (tenantId) {
      const override = flag.tenantOverrides.find((o) => o.tenantId === tenantId);
      if (override) return override.enabled;
    }

    return flag.defaultEnabled;
  }

  /**
   * 获取所有功能开关 / 全フィーチャーフラグを取得
   */
  async getAllFlags(): Promise<IFeatureFlag[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.data;
    }

    const flags = await FeatureFlag.find().sort({ group: 1, key: 1 }).lean();
    this.cache = { data: flags, expiresAt: Date.now() + CACHE_TTL_MS };
    return flags;
  }

  /**
   * 获取租户的功能开关状态映射 / テナントの機能フラグ状態マップを取得
   */
  async getFlagsForTenant(tenantId?: string): Promise<Record<string, boolean>> {
    const flags = await this.getAllFlags();
    const result: Record<string, boolean> = {};
    for (const flag of flags) {
      if (tenantId) {
        const override = flag.tenantOverrides.find((o) => o.tenantId === tenantId);
        result[flag.key] = override ? override.enabled : flag.defaultEnabled;
      } else {
        result[flag.key] = flag.defaultEnabled;
      }
    }
    return result;
  }

  /**
   * 创建功能开关 / フィーチャーフラグを作成
   */
  async createFlag(data: Partial<IFeatureFlag>): Promise<IFeatureFlag> {
    const flag = await FeatureFlag.create(data);
    this.invalidateCache();
    logger.info({ key: data.key }, 'Feature flag created / フィーチャーフラグを作成');
    return flag.toObject();
  }

  /**
   * 更新功能开关 / フィーチャーフラグを更新
   */
  async updateFlag(id: string, data: Partial<IFeatureFlag>): Promise<IFeatureFlag | null> {
    // 不允许修改 key / key の変更は不可
    const { key: _k, ...updateData } = data as Record<string, unknown>;

    const updated = await FeatureFlag.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    if (updated) {
      this.invalidateCache();
      logger.info({ id }, 'Feature flag updated / フィーチャーフラグを更新');
    }
    return updated;
  }

  /**
   * 删除功能开关 / フィーチャーフラグを削除
   */
  async deleteFlag(id: string): Promise<boolean> {
    const result = await FeatureFlag.findByIdAndDelete(id);
    if (result) {
      this.invalidateCache();
      logger.info({ id }, 'Feature flag deleted / フィーチャーフラグを削除');
    }
    return !!result;
  }

  /**
   * 切换全局默认值 / グローバルデフォルト値をトグル
   */
  async toggleFlag(id: string): Promise<IFeatureFlag | null> {
    const flag = await FeatureFlag.findById(id);
    if (!flag) return null;

    flag.defaultEnabled = !flag.defaultEnabled;
    await flag.save();
    this.invalidateCache();

    logger.info(
      { id, key: flag.key, enabled: flag.defaultEnabled },
      'Feature flag toggled / フィーチャーフラグをトグル',
    );
    return flag.toObject();
  }

  /**
   * 设置租户覆盖 / テナントオーバーライドを設定
   */
  async setTenantOverride(
    flagId: string,
    tenantId: string,
    enabled: boolean,
  ): Promise<IFeatureFlag | null> {
    const flag = await FeatureFlag.findById(flagId);
    if (!flag) return null;

    const existing = flag.tenantOverrides.find((o) => o.tenantId === tenantId);
    if (existing) {
      existing.enabled = enabled;
    } else {
      flag.tenantOverrides.push({ tenantId, enabled });
    }

    await flag.save();
    this.invalidateCache();
    return flag.toObject();
  }

  /**
   * 删除租户覆盖 / テナントオーバーライドを削除
   */
  async removeTenantOverride(flagId: string, tenantId: string): Promise<IFeatureFlag | null> {
    const flag = await FeatureFlag.findById(flagId);
    if (!flag) return null;

    flag.tenantOverrides = flag.tenantOverrides.filter((o) => o.tenantId !== tenantId);
    await flag.save();
    this.invalidateCache();
    return flag.toObject();
  }

  private invalidateCache(): void {
    this.cache = null;
  }
}
