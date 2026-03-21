// 外部連携サービスのテスト / 外部集成服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationsService } from './integrations.service';

describe('IntegrationsService', () => {
  let service: IntegrationsService;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntegrationsService],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
  });

  it('should be defined / サービスが定義されていること / 服务应被定义', () => {
    expect(service).toBeDefined();
  });

  // === getFbaStatus テスト / getFbaStatus 测试 ===
  describe('getFbaStatus', () => {
    // FBA連携未設定のステータスを返す / 返回FBA集成未配置状态
    it('should return unconfigured FBA status / FBA連携未設定のステータスを返す / 返回FBA未配置状态', async () => {
      const result = await service.getFbaStatus(tenantId);

      expect(result.configured).toBe(false);
      expect(result.provider).toBe('amazon-fba');
      expect(result.message).toContain('not configured');
    });
  });

  // === getRslStatus テスト / getRslStatus 测试 ===
  describe('getRslStatus', () => {
    // RSL連携未設定のステータスを返す / 返回RSL集成未配置状态
    it('should return unconfigured RSL status / RSL連携未設定のステータスを返す / 返回RSL未配置状态', async () => {
      const result = await service.getRslStatus(tenantId);

      expect(result.configured).toBe(false);
      expect(result.provider).toBe('amazon-rsl');
    });
  });

  // === getOmsStatus テスト / getOmsStatus 测试 ===
  describe('getOmsStatus', () => {
    // OMS連携未設定のステータスを返す / 返回OMS集成未配置状态
    it('should return unconfigured OMS status / OMS連携未設定のステータスを返す / 返回OMS未配置状态', async () => {
      const result = await service.getOmsStatus(tenantId);

      expect(result.configured).toBe(false);
      expect(result.provider).toBe('oms');
    });
  });

  // === getMarketplaceProviders テスト / getMarketplaceProviders 测试 ===
  describe('getMarketplaceProviders', () => {
    // 5つのプロバイダを返す / 返回5个提供商
    it('should return 5 marketplace providers / 5つのマーケットプレイスプロバイダを返す / 返回5个市场平台提供商', async () => {
      const result = await service.getMarketplaceProviders(tenantId);

      expect(result.providers).toHaveLength(5);
      expect(result.providers.map((p: any) => p.id)).toEqual([
        'shopify', 'rakuten', 'yahoo', 'amazon', 'base',
      ]);
    });

    // 全プロバイダが未設定であること / 所有提供商应为未配置
    it('should have all providers unconfigured / 全プロバイダが未設定であること / 所有提供商应为未配置', async () => {
      const result = await service.getMarketplaceProviders(tenantId);

      result.providers.forEach((p: any) => {
        expect(p.configured).toBe(false);
      });
    });
  });

  // === getErpStatus テスト / getErpStatus 测试 ===
  describe('getErpStatus', () => {
    // ERP連携未設定のステータスを返す / 返回ERP集成未配置状态
    it('should return unconfigured ERP status / ERP連携未設定のステータスを返す / 返回ERP未配置状态', async () => {
      const result = await service.getErpStatus(tenantId);

      expect(result.configured).toBe(false);
      expect(result.provider).toBe('erp');
      expect(result.message).toContain('not configured');
    });
  });
});
