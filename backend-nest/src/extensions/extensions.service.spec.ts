// 拡張機能サービスのテスト / 扩展功能服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { ExtensionsService } from './extensions.service';
import { WmsException } from '../common/exceptions/wms.exception';

// ヘルパー: チェーン可能なクエリモック生成 / 辅助: 生成可链式调用的查询mock
function createSelectChain(resolveValue: any = []) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('ExtensionsService', () => {
  let service: ExtensionsService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const webhookId = 'webhook-001';
  const flagId = 'flag-001';
  const mockWebhook = {
    id: webhookId,
    tenantId,
    url: 'https://example.com/webhook',
    events: ['order.created'],
    createdAt: new Date(),
  };
  const mockFlag = {
    id: flagId,
    name: 'new_dashboard',
    enabled: false,
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtensionsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<ExtensionsService>(ExtensionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAllWebhooks テスト / findAllWebhooks 测试 ===
  describe('findAllWebhooks', () => {
    // Webhook一覧取得成功 / 成功获取Webhook列表
    it('should return paginated webhooks', async () => {
      const mockItems = [mockWebhook];
      mockDb.select
        .mockReturnValueOnce(createSelectChain(mockItems))
        .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

      const result = await service.findAllWebhooks(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  // === findWebhookById テスト / findWebhookById 测试 ===
  describe('findWebhookById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a webhook by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockWebhook]));

      const result = await service.findWebhookById(tenantId, webhookId);

      expect(result).toEqual(mockWebhook);
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when webhook not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findWebhookById(tenantId, 'nonexistent')).rejects.toThrow(
        WmsException,
      );
    });
  });

  // === createWebhook テスト / createWebhook 测试 ===
  describe('createWebhook', () => {
    // 作成成功 / 创建成功
    it('should create a new webhook', async () => {
      const createDto = { url: 'https://example.com/new', events: ['order.updated'] } as any;
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.createWebhook(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // === updateWebhook テスト / updateWebhook 测试 ===
  describe('updateWebhook', () => {
    // 更新成功 / 更新成功
    it('should update a webhook', async () => {
      const updateDto = { url: 'https://example.com/updated' } as any;
      mockDb.select.mockReturnValueOnce(createSelectChain([mockWebhook]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockWebhook, ...updateDto }]);

      const result = await service.updateWebhook(tenantId, webhookId, updateDto);

      expect(result.url).toBe('https://example.com/updated');
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when updating nonexistent webhook', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(
        service.updateWebhook(tenantId, 'nonexistent', {} as any),
      ).rejects.toThrow(WmsException);
    });
  });

  // === removeWebhook テスト / removeWebhook 测试 ===
  describe('removeWebhook', () => {
    // 物理削除成功 / 硬删除成功
    it('should hard-delete a webhook', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockWebhook]));
      mockDb.returning.mockResolvedValueOnce([mockWebhook]);

      const result = await service.removeWebhook(tenantId, webhookId);

      expect(result).toEqual(mockWebhook);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when removing nonexistent webhook', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.removeWebhook(tenantId, 'nonexistent')).rejects.toThrow(
        WmsException,
      );
    });
  });

  // === findAllFlags テスト / findAllFlags 测试 ===
  describe('findAllFlags', () => {
    // フィーチャーフラグ一覧取得成功 / 成功获取功能开关列表
    it('should return all feature flags', async () => {
      const mockFlags = [mockFlag, { ...mockFlag, id: 'flag-002', name: 'beta_feature' }];
      mockDb.select.mockReturnValueOnce(createSelectChain(mockFlags));

      const result = await service.findAllFlags();

      expect(result).toEqual({ items: mockFlags });
      expect(result.items).toHaveLength(2);
    });
  });

  // === toggleFlag テスト / toggleFlag 测试 ===
  describe('toggleFlag', () => {
    // フラグ切替成功（false→true）/ 功能开关切换成功（false→true）
    it('should toggle a feature flag from false to true', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockFlag]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockFlag, enabled: true }]);

      const result = await service.toggleFlag(flagId);

      expect(result.enabled).toBe(true);
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when flag not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.toggleFlag('nonexistent')).rejects.toThrow(WmsException);
    });
  });
});
