// 棚卸サービスのテスト / 盘点服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { StocktakingService } from './stocktaking.service';

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

describe('StocktakingService', () => {
  let service: StocktakingService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const orderId = 'stock-001';
  const mockOrder = {
    id: orderId,
    tenantId,
    orderNumber: 'STK-0001',
    type: 'full',
    status: 'pending',
    warehouseId: 'wh-001',
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
      providers: [StocktakingService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<StocktakingService>(StocktakingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll テスト / findAll 测试 ===
  describe('findAll', () => {
    // 棚卸一覧取得成功 / 成功获取盘点列表
    it('should return paginated stocktaking orders', async () => {
      const mockItems = [mockOrder];
      mockDb.select
        .mockReturnValueOnce(createSelectChain(mockItems))
        .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result).toEqual({
        items: mockItems,
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    // フィルタ付き検索 / 带筛选搜索
    it('should apply status and warehouseId filters', async () => {
      mockDb.select
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, {
        status: 'completed',
        warehouseId: 'wh-001',
      });

      expect(result.items).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  // === findById テスト / findById 测试 ===
  describe('findById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a stocktaking order by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));

      const result = await service.findById(tenantId, orderId);

      expect(result).toEqual(mockOrder);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when order not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // === create テスト / create 测试 ===
  describe('create', () => {
    const createDto = {
      orderNumber: 'STK-0002',
      type: 'partial',
      warehouseId: 'wh-001',
    } as any;

    // 作成成功 / 创建成功
    it('should create a new stocktaking order', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.create(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // 棚卸番号重複時 ConflictException / 盘点单号重复时抛出 ConflictException
    it('should throw ConflictException for duplicate order number', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.create(tenantId, { orderNumber: 'STK-0001' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  // === update テスト / update 测试 ===
  describe('update', () => {
    // 更新成功 / 更新成功
    it('should update a stocktaking order', async () => {
      const updateDto = { status: 'in_progress' } as any;
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockOrder, ...updateDto }]);

      const result = await service.update(tenantId, orderId, updateDto);

      expect(result.status).toBe('in_progress');
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when updating nonexistent order', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.update(tenantId, 'nonexistent', {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    // orderNumber変更時の重複チェック / orderNumber变更时的重复检查
    it('should throw ConflictException when changing to duplicate order number', async () => {
      const updateDto = { orderNumber: 'STK-EXISTING' } as any;
      // findById 成功 / findById 成功
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
      // 重複チェック: 別IDで既存 / 重复检查: 不同ID已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'other-id' }]));

      await expect(service.update(tenantId, orderId, updateDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // === remove テスト / remove 测试 ===
  describe('remove', () => {
    // 論理削除成功 / 软删除成功
    it('should soft-delete a stocktaking order', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockOrder, deletedAt: new Date() }]);

      const result = await service.remove(tenantId, orderId);

      expect(result).toHaveProperty('deletedAt');
      expect(mockDb.update).toHaveBeenCalled();
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when removing nonexistent order', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
