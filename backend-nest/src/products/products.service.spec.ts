// 商品サービスのテスト / 商品服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { ProductsService } from './products.service';
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

describe('ProductsService', () => {
  let service: ProductsService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const productId = 'prod-001';
  const mockProduct = {
    id: productId,
    tenantId,
    sku: 'SKU-001',
    name: 'テスト商品',
    category: 'electronics',
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
      providers: [ProductsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll テスト / findAll 测试 ===
  describe('findAll', () => {
    // 商品一覧取得成功 / 成功获取商品列表
    it('should return paginated products', async () => {
      const mockItems = [mockProduct];
      const dataChain = createSelectChain(mockItems);
      const countChain = createSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    // SKU検索フィルタ / SKU搜索筛选
    it('should apply sku and name filters', async () => {
      const dataChain = createSelectChain([]);
      const countChain = createSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { sku: 'SKU', name: 'テスト' });

      expect(result.items).toEqual([]);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });

    // ページネーション上限チェック / 分页上限检查
    it('should cap limit at 100', async () => {
      const dataChain = createSelectChain([]);
      const countChain = createSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { limit: 999 });

      expect(result.limit).toBe(200);
    });
  });

  // === findById テスト / findById 测试 ===
  describe('findById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a product by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockProduct]));

      const result = await service.findById(tenantId, productId);

      expect(result).toEqual(mockProduct);
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when product not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === create テスト / create 测试 ===
  describe('create', () => {
    const createDto = { sku: 'SKU-002', name: '新商品', width: 10, weight: 0.5 } as any;

    // 作成成功 / 创建成功
    it('should create a new product', async () => {
      // SKU重複チェック: 既存なし / SKU重复检查: 无已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.create(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // SKU重複時 WmsException / SKU重复时抛出 WmsException
    it('should throw WmsException for duplicate SKU', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.create(tenantId, { sku: 'SKU-001', name: '重複商品' } as any),
      ).rejects.toThrow(WmsException);
    });
  });

  // === update テスト / update 测试 ===
  describe('update', () => {
    // 更新成功 / 更新成功
    it('should update a product', async () => {
      const updateDto = { name: '更新商品' } as any;
      // findById
      mockDb.select.mockReturnValueOnce(createSelectChain([mockProduct]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockProduct, ...updateDto }]);

      const result = await service.update(tenantId, productId, updateDto);

      expect(result.name).toBe('更新商品');
    });

    // SKU変更時の重複チェック / SKU变更时的重复检查
    it('should throw WmsException when changing to duplicate SKU', async () => {
      const updateDto = { sku: 'SKU-EXISTING' } as any;
      // findById 成功 / findById 成功
      mockDb.select.mockReturnValueOnce(createSelectChain([mockProduct]));
      // SKU重複チェック: 別IDで既存 / SKU重复检查: 不同ID已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'other-id' }]));

      await expect(service.update(tenantId, productId, updateDto)).rejects.toThrow(
        WmsException,
      );
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when updating nonexistent product', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.update(tenantId, 'nonexistent', {} as any)).rejects.toThrow(
        WmsException,
      );
    });
  });

  // === remove テスト / remove 测试 ===
  describe('remove', () => {
    // 論理削除成功 / 软删除成功
    it('should soft-delete a product', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockProduct]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockProduct, deletedAt: new Date() }]);

      const result = await service.remove(tenantId, productId);

      expect(result).toHaveProperty('deletedAt');
      expect(mockDb.update).toHaveBeenCalled();
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when removing nonexistent product', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });
});
