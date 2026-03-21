// 返品サービスのテスト / 退货服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { ReturnsService } from './returns.service';
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

describe('ReturnsService', () => {
  let service: ReturnsService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const orderId = 'return-001';
  const mockOrder = {
    id: orderId,
    tenantId,
    orderNumber: 'RET-0001',
    status: 'pending',
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
      providers: [ReturnsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<ReturnsService>(ReturnsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll テスト / findAll 测试 ===
  describe('findAll', () => {
    // 返品一覧取得成功 / 成功获取退货列表
    it('should return paginated return orders', async () => {
      const mockItems = [mockOrder];
      mockDb.select
        .mockReturnValueOnce(createSelectChain(mockItems))
        .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    // ステータスフィルタ付き / 带状态筛选
    it('should apply status filter', async () => {
      mockDb.select
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, { status: 'completed' });

      expect(result.items).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  // === findById テスト / findById 测试 ===
  describe('findById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a return order by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));

      const result = await service.findById(tenantId, orderId);

      expect(result).toEqual(mockOrder);
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when order not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === findLines テスト / findLines 测试 ===
  describe('findLines', () => {
    // 返品明細行取得成功 / 成功获取退货明细行
    it('should return order lines for a return order', async () => {
      const mockLines = [{ id: 'line-1', productName: 'テスト商品', quantity: 5 }];
      // findById の呼び出し / findById 的调用
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
      // findLines のクエリ / findLines 的查询
      mockDb.select.mockReturnValueOnce(createSelectChain(mockLines));

      const result = await service.findLines(tenantId, orderId);

      expect(result).toEqual(mockLines);
    });

    // 親オーダーが存在しない場合 / 父订单不存在时
    it('should throw WmsException if parent order not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findLines(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === create テスト / create 测试 ===
  describe('create', () => {
    const createDto = { orderNumber: 'RET-0002', status: 'pending' } as any;

    // 作成成功 / 创建成功
    it('should create a new return order', async () => {
      // 重複チェック: 既存なし / 重复检查: 无已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.create(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
    });

    // 注文番号重複時 WmsException / 订单编号重复时抛出 WmsException
    it('should throw WmsException for duplicate order number', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.create(tenantId, { orderNumber: 'RET-0001' } as any),
      ).rejects.toThrow(WmsException);
    });
  });

  // === update テスト / update 测试 ===
  describe('update', () => {
    // 更新成功 / 更新成功
    it('should update a return order', async () => {
      const updateDto = { status: 'completed' } as any;
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockOrder, ...updateDto }]);

      const result = await service.update(tenantId, orderId, updateDto);

      expect(result.status).toBe('completed');
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when updating nonexistent order', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.update(tenantId, 'nonexistent', {} as any)).rejects.toThrow(
        WmsException,
      );
    });
  });

  // === remove テスト / remove 测试 ===
  describe('remove', () => {
    // 論理削除成功 / 软删除成功
    it('should soft-delete a return order', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockOrder, deletedAt: new Date() }]);

      const result = await service.remove(tenantId, orderId);

      expect(result).toHaveProperty('deletedAt');
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when removing nonexistent order', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });
});
