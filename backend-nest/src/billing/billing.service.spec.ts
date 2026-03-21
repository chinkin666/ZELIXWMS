// 請求サービスのテスト / 账单服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { BillingService } from './billing.service';

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

describe('BillingService', () => {
  let service: BillingService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const rateId = 'rate-001';
  const mockRate = {
    id: rateId,
    tenantId,
    chargeType: 'storage',
    unitPrice: '100',
    isActive: true,
    createdAt: new Date(),
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
      providers: [BillingService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAllServiceRates テスト / findAllServiceRates 测试 ===
  describe('findAllServiceRates', () => {
    // サービス料金一覧取得成功 / 成功获取服务费率列表
    it('should return paginated service rates', async () => {
      const mockItems = [mockRate];
      mockDb.select
        .mockReturnValueOnce(createSelectChain(mockItems))
        .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

      const result = await service.findAllServiceRates(tenantId, { page: 1, limit: 10 });

      expect(result).toEqual({
        items: mockItems,
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    // フィルタ付き検索 / 带筛选条件搜索
    it('should apply filters when provided', async () => {
      mockDb.select
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([{ count: 0 }]));

      const result = await service.findAllServiceRates(tenantId, {
        chargeType: 'storage',
        isActive: true,
      });

      expect(result.items).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  // === findServiceRateById テスト / findServiceRateById 测试 ===
  describe('findServiceRateById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a service rate by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockRate]));

      const result = await service.findServiceRateById(tenantId, rateId);

      expect(result).toEqual(mockRate);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when rate not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findServiceRateById(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // === createServiceRate テスト / createServiceRate 测试 ===
  describe('createServiceRate', () => {
    // 作成成功 / 创建成功
    it('should create a new service rate', async () => {
      const createDto = { chargeType: 'handling', unitPrice: '200' } as any;
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.createServiceRate(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // 日付文字列変換テスト / 日期字符串转换测试
    it('should convert date strings to Date objects', async () => {
      const createDto = {
        chargeType: 'storage',
        validFrom: '2026-01-01',
        validTo: '2026-12-31',
      } as any;
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      await service.createServiceRate(tenantId, createDto);

      expect(mockDb.values).toHaveBeenCalled();
    });
  });

  // === updateServiceRate テスト / updateServiceRate 测试 ===
  describe('updateServiceRate', () => {
    // 更新成功 / 更新成功
    it('should update a service rate', async () => {
      const updateDto = { unitPrice: '300' } as any;
      // findServiceRateById / findServiceRateById
      mockDb.select.mockReturnValueOnce(createSelectChain([mockRate]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockRate, ...updateDto }]);

      const result = await service.updateServiceRate(tenantId, rateId, updateDto);

      expect(result.unitPrice).toBe('300');
    });
  });

  // === removeServiceRate テスト / removeServiceRate 测试 ===
  describe('removeServiceRate', () => {
    // 論理削除（isActive=false）/ 软删除（isActive=false）
    it('should soft-delete by setting isActive to false', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockRate]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockRate, isActive: false }]);

      const result = await service.removeServiceRate(tenantId, rateId);

      expect(result.isActive).toBe(false);
      expect(mockDb.set).toHaveBeenCalled();
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when rate not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.removeServiceRate(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // === findAllWorkCharges テスト / findAllWorkCharges 测试 ===
  describe('findAllWorkCharges', () => {
    // 作業チャージ一覧取得成功 / 成功获取作业费用列表
    it('should return paginated work charges', async () => {
      const mockCharges = [{ id: 'charge-1', chargeType: 'picking', amount: '500' }];
      mockDb.select
        .mockReturnValueOnce(createSelectChain(mockCharges))
        .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

      const result = await service.findAllWorkCharges(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockCharges);
      expect(result.total).toBe(1);
    });
  });

  // === createWorkCharge テスト / createWorkCharge 测试 ===
  describe('createWorkCharge', () => {
    // 作成成功 / 创建成功
    it('should create a new work charge', async () => {
      const dto = { chargeType: 'picking', amount: '500' };
      mockDb.returning.mockResolvedValueOnce([{ id: 'charge-new', ...dto }]);

      const result = await service.createWorkCharge(tenantId, dto);

      expect(result).toHaveProperty('id', 'charge-new');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });
});
