// 外部連携サービス / 外部集成服务
import { Inject, Injectable } from '@nestjs/common';
import { WmsException } from '../common/exceptions/wms.exception.js';
import { DRIZZLE } from '../database/database.module.js';
import type { DrizzleDB } from '../database/database.types.js';
import { and, eq } from 'drizzle-orm';
import { systemSettings } from '../database/schema/settings.js';

// 連携ステータスの型定義 / 集成状态类型定义
export interface IntegrationStatus {
  configured: boolean;
  message: string;
  provider?: string;
  config?: Record<string, unknown>;
}

// 連携設定キー定数 / 集成设置键常量
const SETTINGS_KEYS = {
  FBA: 'integration/fba',
  RSL: 'integration/rsl',
  OMS: 'integration/oms',
  MARKETPLACE: 'integration/marketplace',
  ERP: 'integration/erp',
} as const;

// デフォルトマーケットプレイスプロバイダ / 默认市场平台提供商
const DEFAULT_MARKETPLACE_PROVIDERS = [
  { id: 'shopify', name: 'Shopify', configured: false },
  { id: 'rakuten', name: '楽天市場 / 乐天市场', configured: false },
  { id: 'yahoo', name: 'Yahoo!ショッピング / Yahoo!购物', configured: false },
  { id: 'amazon', name: 'Amazon', configured: false },
  { id: 'base', name: 'BASE', configured: false },
] as const;

@Injectable()
export class IntegrationsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  // 設定をDBから取得するヘルパー / 从DB获取设置的辅助方法
  private async getSettingsByKey(tenantId: string, key: string): Promise<Record<string, unknown> | null> {
    const [row] = await this.db
      .select({ settings: systemSettings.settings })
      .from(systemSettings)
      .where(and(
        eq(systemSettings.tenantId, tenantId),
        eq(systemSettings.settingsKey, key),
      ))
      .limit(1);

    if (!row?.settings || typeof row.settings !== 'object') {
      return null;
    }
    return row.settings as Record<string, unknown>;
  }

  // 共通の連携ステータス構築 / 通用集成状态构建
  private buildStatus(
    settings: Record<string, unknown> | null,
    provider: string,
    label: string,
  ): IntegrationStatus {
    if (!settings) {
      return {
        configured: false,
        message: `${label} integration not configured / ${label}連携未設定 / ${label}集成未配置`,
        provider,
        config: {},
      };
    }

    const enabled = settings.enabled === true;
    return {
      configured: enabled,
      message: enabled
        ? `${label} integration active / ${label}連携有効 / ${label}集成已启用`
        : `${label} integration disabled / ${label}連携無効 / ${label}集成已停用`,
      provider,
      config: settings,
    };
  }

  // FBA連携ステータス / FBA集成状态
  async getFbaStatus(tenantId: string): Promise<IntegrationStatus> {
    const settings = await this.getSettingsByKey(tenantId, SETTINGS_KEYS.FBA);
    return this.buildStatus(settings, 'amazon-fba', 'FBA');
  }

  // RSL連携ステータス / RSL集成状态
  async getRslStatus(tenantId: string): Promise<IntegrationStatus> {
    const settings = await this.getSettingsByKey(tenantId, SETTINGS_KEYS.RSL);
    return this.buildStatus(settings, 'amazon-rsl', 'RSL');
  }

  // OMS連携ステータス / OMS集成状态
  async getOmsStatus(tenantId: string): Promise<IntegrationStatus> {
    const settings = await this.getSettingsByKey(tenantId, SETTINGS_KEYS.OMS);
    return this.buildStatus(settings, 'oms', 'OMS');
  }

  // マーケットプレイスプロバイダ一覧 / 市场平台提供商列表
  async getMarketplaceProviders(tenantId: string) {
    const settings = await this.getSettingsByKey(tenantId, SETTINGS_KEYS.MARKETPLACE);

    if (!settings || !Array.isArray(settings.providers)) {
      // デフォルトプロバイダを返す / 返回默认提供商
      return {
        providers: DEFAULT_MARKETPLACE_PROVIDERS.map((p) => ({ ...p })),
      };
    }

    // DB設定のプロバイダリストをデフォルトとマージ / 将DB设置的提供商列表与默认合并
    const configuredIds = new Set(
      (settings.providers as Array<{ id: string }>).map((p) => p.id),
    );

    const providers = DEFAULT_MARKETPLACE_PROVIDERS.map((defaultProvider) => {
      const configured = configuredIds.has(defaultProvider.id);
      const dbProvider = configured
        ? (settings.providers as Array<{ id: string; name?: string; configured?: boolean }>).find((p) => p.id === defaultProvider.id)
        : null;

      return {
        id: defaultProvider.id,
        name: dbProvider?.name ?? defaultProvider.name,
        configured: dbProvider?.configured ?? false,
      };
    });

    return { providers };
  }

  // ERP連携ステータス / ERP集成状态
  async getErpStatus(tenantId: string): Promise<IntegrationStatus> {
    const settings = await this.getSettingsByKey(tenantId, SETTINGS_KEYS.ERP);
    return this.buildStatus(settings, 'erp', 'ERP');
  }

  // ===== 同期・設定更新メソッド / 同步・配置更新方法 =====

  // 設定をDBにupsertするヘルパー / 将设置upsert到DB的辅助方法
  private async upsertSettings(tenantId: string, key: string, settings: Record<string, unknown>) {
    await this.db
      .insert(systemSettings)
      .values({ tenantId, settingsKey: key, settings })
      .onConflictDoUpdate({
        target: [systemSettings.tenantId, systemSettings.settingsKey],
        set: { settings, updatedAt: new Date() },
      });
  }

  // OMS同期（同期リクエストを記録してステータスを返す）/ OMS同步（记录同步请求并返回状态）
  async syncOms(tenantId: string, body: Record<string, unknown>) {
    const settings = await this.getSettingsByKey(tenantId, SETTINGS_KEYS.OMS);
    if (!settings || !settings.enabled) {
      throw new WmsException('INTEGRATION_NOT_CONFIGURED', 'OMS integration is not enabled / OMS連携未有効 / OMS集成未启用');
    }

    const syncRecord = {
      requestedAt: new Date().toISOString(),
      syncType: body.syncType ?? 'full',
      status: 'requested',
    };

    // 最終同期記録を設定に保存 / 保存最后一次同步记录到设置
    await this.upsertSettings(tenantId, SETTINGS_KEYS.OMS, { ...settings, lastSync: syncRecord });

    return { ...syncRecord, message: 'OMS sync requested / OMS同期リクエスト受付 / OMS同步请求已受理' };
  }

  // OMS設定更新 / 更新OMS配置
  async updateOmsConfig(tenantId: string, body: Record<string, unknown>) {
    await this.upsertSettings(tenantId, SETTINGS_KEYS.OMS, body);
    return this.getOmsStatus(tenantId);
  }

  // マーケットプレイス同期 / 市场平台同步
  async syncMarketplace(tenantId: string, body: Record<string, unknown>) {
    const settings = await this.getSettingsByKey(tenantId, SETTINGS_KEYS.MARKETPLACE);

    const syncRecord = {
      requestedAt: new Date().toISOString(),
      provider: body.provider ?? 'all',
      syncType: body.syncType ?? 'orders',
      status: 'requested',
    };

    const updatedSettings = { ...(settings ?? {}), lastSync: syncRecord };
    await this.upsertSettings(tenantId, SETTINGS_KEYS.MARKETPLACE, updatedSettings);

    return { ...syncRecord, message: 'Marketplace sync requested / マーケットプレイス同期リクエスト受付 / 市场平台同步请求已受理' };
  }

  // マーケットプレイス設定更新 / 更新市场平台配置
  async updateMarketplaceConfig(tenantId: string, body: Record<string, unknown>) {
    await this.upsertSettings(tenantId, SETTINGS_KEYS.MARKETPLACE, body);
    return this.getMarketplaceProviders(tenantId);
  }

  // ERP同期 / ERP同步
  async syncErp(tenantId: string, body: Record<string, unknown>) {
    const settings = await this.getSettingsByKey(tenantId, SETTINGS_KEYS.ERP);
    if (!settings || !settings.enabled) {
      throw new WmsException('INTEGRATION_NOT_CONFIGURED', 'ERP integration is not enabled / ERP連携未有効 / ERP集成未启用');
    }

    const syncRecord = {
      requestedAt: new Date().toISOString(),
      syncType: body.syncType ?? 'full',
      entities: body.entities ?? ['products', 'orders'],
      status: 'requested',
    };

    await this.upsertSettings(tenantId, SETTINGS_KEYS.ERP, { ...settings, lastSync: syncRecord });

    return { ...syncRecord, message: 'ERP sync requested / ERP同期リクエスト受付 / ERP同步请求已受理' };
  }

  // ERP設定更新 / 更新ERP配置
  async updateErpConfig(tenantId: string, body: Record<string, unknown>) {
    await this.upsertSettings(tenantId, SETTINGS_KEYS.ERP, body);
    return this.getErpStatus(tenantId);
  }
}
