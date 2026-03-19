/**
 * FeatureFlagService 单元测试 / FeatureFlagService ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFlags = [
  {
    _id: 'f1',
    key: 'extensions.webhooks',
    defaultEnabled: true,
    group: 'extensions',
    tenantOverrides: [{ tenantId: 'tenant-a', enabled: false }],
  },
  {
    _id: 'f2',
    key: 'extensions.plugins',
    defaultEnabled: false,
    group: 'extensions',
    tenantOverrides: [],
  },
  {
    _id: 'f3',
    key: 'feature.newDashboard',
    defaultEnabled: true,
    group: 'feature',
    tenantOverrides: [
      { tenantId: 'tenant-a', enabled: true },
      { tenantId: 'tenant-b', enabled: false },
    ],
  },
];

vi.mock('@/models/featureFlag', () => ({
  FeatureFlag: {
    find: () => ({ sort: () => ({ lean: () => Promise.resolve([...mockFlags]) }) }),
    create: vi.fn((data: any) => Promise.resolve({ toObject: () => ({ ...data, _id: 'new' }) })),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

import { FeatureFlagService } from '../featureFlagService';

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  beforeEach(() => {
    service = new FeatureFlagService();
  });

  describe('isEnabled / 有効判定', () => {
    it('should return defaultEnabled when no tenant / テナントなしでデフォルト値を返すこと', async () => {
      expect(await service.isEnabled('extensions.webhooks')).toBe(true);
      expect(await service.isEnabled('extensions.plugins')).toBe(false);
    });

    it('should return false for unknown key / 未知のキーで false を返すこと', async () => {
      expect(await service.isEnabled('unknown.feature')).toBe(false);
    });

    it('should apply tenant override / テナントオーバーライドを適用すること', async () => {
      // webhooks: default=true, tenant-a=false
      expect(await service.isEnabled('extensions.webhooks', 'tenant-a')).toBe(false);
      // 他のテナントはデフォルト / 他のテナントはデフォルト
      expect(await service.isEnabled('extensions.webhooks', 'tenant-z')).toBe(true);
    });

    it('should handle multiple tenant overrides / 複数テナントオーバーライドを処理すること', async () => {
      expect(await service.isEnabled('feature.newDashboard', 'tenant-a')).toBe(true);
      expect(await service.isEnabled('feature.newDashboard', 'tenant-b')).toBe(false);
      expect(await service.isEnabled('feature.newDashboard')).toBe(true); // default
    });
  });

  describe('getFlagsForTenant / テナント別フラグマップ', () => {
    it('should return all flags with defaults / デフォルトで全フラグを返すこと', async () => {
      const flags = await service.getFlagsForTenant();
      expect(flags['extensions.webhooks']).toBe(true);
      expect(flags['extensions.plugins']).toBe(false);
      expect(flags['feature.newDashboard']).toBe(true);
    });

    it('should apply tenant overrides / テナントオーバーライドを適用すること', async () => {
      const flags = await service.getFlagsForTenant('tenant-a');
      expect(flags['extensions.webhooks']).toBe(false); // overridden
      expect(flags['extensions.plugins']).toBe(false); // default
      expect(flags['feature.newDashboard']).toBe(true); // overridden to true
    });
  });

  describe('createFlag / フラグ作成', () => {
    it('should create a flag / フラグを作成すること', async () => {
      const result = await service.createFlag({
        key: 'new.feature',
        defaultEnabled: false,
        group: 'test',
      } as any);
      expect(result.key).toBe('new.feature');
    });
  });

  describe('cache / キャッシュ', () => {
    it('should use cache on second call / 2回目の呼び出しでキャッシュを使うこと', async () => {
      // 1回目: DB 取得
      await service.isEnabled('extensions.webhooks');
      // 2回目: キャッシュ
      const result = await service.isEnabled('extensions.webhooks');
      expect(result).toBe(true);
    });
  });
});
