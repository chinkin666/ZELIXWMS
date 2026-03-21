// 外部連携サービスのテスト / 外部集成服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { IntegrationsService } from './integrations.service';

// ヘルパー: チェーン可能なクエリモック生成 / 辅助: 生成可链式调用的查询mock
function createChain(resolveValue: any = []) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let mockDb: any;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [IntegrationsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== getFbaStatus =====
  describe('getFbaStatus', () => {
    it('should return unconfigured status when no settings exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getFbaStatus(tenantId);

      expect(result.configured).toBe(false);
      expect(result.provider).toBe('amazon-fba');
      expect(result.message).toContain('not configured');
      expect(result.config).toEqual({});
    });

    it('should return configured status when settings have enabled=true', async () => {
      mockDb.select.mockReturnValueOnce(
        createChain([{ settings: { enabled: true, apiKey: 'xxx' } }]),
      );

      const result = await service.getFbaStatus(tenantId);

      expect(result.configured).toBe(true);
      expect(result.message).toContain('active');
      expect(result.config).toEqual({ enabled: true, apiKey: 'xxx' });
    });

    it('should return disabled status when settings have enabled=false', async () => {
      mockDb.select.mockReturnValueOnce(
        createChain([{ settings: { enabled: false } }]),
      );

      const result = await service.getFbaStatus(tenantId);

      expect(result.configured).toBe(false);
      expect(result.message).toContain('disabled');
    });

    it('should handle null settings value', async () => {
      mockDb.select.mockReturnValueOnce(createChain([{ settings: null }]));

      const result = await service.getFbaStatus(tenantId);

      expect(result.configured).toBe(false);
    });

    it('should handle non-object settings value', async () => {
      mockDb.select.mockReturnValueOnce(createChain([{ settings: 'invalid' }]));

      const result = await service.getFbaStatus(tenantId);

      expect(result.configured).toBe(false);
    });
  });

  // ===== getRslStatus =====
  describe('getRslStatus', () => {
    it('should return unconfigured RSL status when no settings', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getRslStatus(tenantId);

      expect(result.configured).toBe(false);
      expect(result.provider).toBe('amazon-rsl');
    });

    it('should return configured RSL status when enabled', async () => {
      mockDb.select.mockReturnValueOnce(
        createChain([{ settings: { enabled: true } }]),
      );

      const result = await service.getRslStatus(tenantId);

      expect(result.configured).toBe(true);
    });
  });

  // ===== getOmsStatus =====
  describe('getOmsStatus', () => {
    it('should return unconfigured OMS status when no settings', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getOmsStatus(tenantId);

      expect(result.configured).toBe(false);
      expect(result.provider).toBe('oms');
    });

    it('should return configured OMS status when enabled', async () => {
      mockDb.select.mockReturnValueOnce(
        createChain([{ settings: { enabled: true } }]),
      );

      const result = await service.getOmsStatus(tenantId);

      expect(result.configured).toBe(true);
      expect(result.message).toContain('active');
    });
  });

  // ===== getErpStatus =====
  describe('getErpStatus', () => {
    it('should return unconfigured ERP status when no settings', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getErpStatus(tenantId);

      expect(result.configured).toBe(false);
      expect(result.provider).toBe('erp');
      expect(result.message).toContain('not configured');
    });

    it('should return configured ERP status when enabled', async () => {
      mockDb.select.mockReturnValueOnce(
        createChain([{ settings: { enabled: true, vendor: 'SAP' } }]),
      );

      const result = await service.getErpStatus(tenantId);

      expect(result.configured).toBe(true);
    });
  });

  // ===== getMarketplaceProviders =====
  describe('getMarketplaceProviders', () => {
    it('should return 5 default providers when no settings exist', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getMarketplaceProviders(tenantId);

      expect(result.providers).toHaveLength(5);
      expect(result.providers.map((p: any) => p.id)).toEqual([
        'shopify', 'rakuten', 'yahoo', 'amazon', 'base',
      ]);
    });

    it('should have all providers unconfigured by default', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getMarketplaceProviders(tenantId);

      result.providers.forEach((p: any) => {
        expect(p.configured).toBe(false);
      });
    });

    it('should return defaults when settings exist but providers is not array', async () => {
      mockDb.select.mockReturnValueOnce(
        createChain([{ settings: { providers: 'not-array' } }]),
      );

      const result = await service.getMarketplaceProviders(tenantId);

      expect(result.providers).toHaveLength(5);
    });

    it('should merge configured providers with defaults', async () => {
      mockDb.select.mockReturnValueOnce(
        createChain([{
          settings: {
            providers: [
              { id: 'shopify', configured: true },
              { id: 'amazon', configured: true },
            ],
          },
        }]),
      );

      const result = await service.getMarketplaceProviders(tenantId);

      expect(result.providers).toHaveLength(5);
      const shopify = result.providers.find((p: any) => p.id === 'shopify');
      const amazon = result.providers.find((p: any) => p.id === 'amazon');
      const rakuten = result.providers.find((p: any) => p.id === 'rakuten');

      expect(shopify!.configured).toBe(true);
      expect(amazon!.configured).toBe(true);
      expect(rakuten!.configured).toBe(false);
    });

    it('should use custom name from DB settings when available', async () => {
      mockDb.select.mockReturnValueOnce(
        createChain([{
          settings: {
            providers: [
              { id: 'shopify', name: 'My Shopify Store', configured: true },
            ],
          },
        }]),
      );

      const result = await service.getMarketplaceProviders(tenantId);

      const shopify = result.providers.find((p: any) => p.id === 'shopify');
      expect(shopify!.name).toBe('My Shopify Store');
    });

    it('should handle null settings', async () => {
      mockDb.select.mockReturnValueOnce(createChain([{ settings: null }]));

      const result = await service.getMarketplaceProviders(tenantId);

      expect(result.providers).toHaveLength(5);
    });
  });
});
