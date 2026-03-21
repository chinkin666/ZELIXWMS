// 出荷注文サービスのテスト / 出货订单服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { ShipmentService } from './shipment.service';

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

describe('ShipmentService', () => {
  let service: ShipmentService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const orderId = 'order-001';
  const mockOrder = {
    id: orderId,
    tenantId,
    orderNumber: 'SHP-0001',
    recipientName: '田中太郎',
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
      providers: [ShipmentService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<ShipmentService>(ShipmentService);
  });

  // サービスのインスタンス化確認 / 确认服务实例化
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll テスト / findAll 测试 ===
  describe('findAll', () => {
    // 一覧取得成功（ページネーション付き）/ 成功获取列表（含分页）
    it('should return paginated shipment orders', async () => {
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

    // デフォルトページネーション / 默认分页参数
    it('should use default pagination when not specified', async () => {
      mockDb.select
        .mockReturnValueOnce(createSelectChain([]))
        .mockReturnValueOnce(createSelectChain([{ count: 0 }]));

      const result = await service.findAll(tenantId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // === findById テスト / findById 测试 ===
  describe('findById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a shipment order by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));

      const result = await service.findById(tenantId, orderId);

      expect(result).toEqual(mockOrder);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when order not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // === findProducts テスト / findProducts 测试 ===
  describe('findProducts', () => {
    // 出荷注文の商品取得成功 / 成功获取出货订单商品
    it('should return products for a shipment order', async () => {
      const mockProducts = [{ id: 'prod-1', name: 'テスト商品' }];
      // findById 呼び出し用 / findById 调用用
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
      // findProducts のクエリ / findProducts 的查询
      mockDb.select.mockReturnValueOnce(createSelectChain(mockProducts));

      const result = await service.findProducts(tenantId, orderId);

      expect(result).toEqual(mockProducts);
    });
  });

  // === create テスト / create 测试 ===
  describe('create', () => {
    const createDto = { orderNumber: 'SHP-0002', recipientName: '鈴木花子' } as any;

    // 作成成功 / 创建成功
    it('should create a new shipment order', async () => {
      // 重複チェック: 既存なし / 重复检查: 无已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      // insert の returning / insert 的 returning
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.create(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // 注文番号重複時 ConflictException / 订单编号重复时抛出 ConflictException
    it('should throw ConflictException for duplicate order number', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(service.create(tenantId, { orderNumber: 'SHP-0001' } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // === update テスト / update 测试 ===
  describe('update', () => {
    const updateDto = { recipientName: '佐藤一郎' } as any;

    // 更新成功 / 更新成功
    it('should update a shipment order', async () => {
      // findById / findById
      mockDb.select.mockReturnValueOnce(createSelectChain([mockOrder]));
      // update returning / update returning
      mockDb.returning.mockResolvedValueOnce([{ ...mockOrder, ...updateDto }]);

      const result = await service.update(tenantId, orderId, updateDto);

      expect(result.recipientName).toBe('佐藤一郎');
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when updating nonexistent order', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.update(tenantId, 'nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // === remove テスト / remove 测试 ===
  describe('remove', () => {
    // 論理削除成功 / 软删除成功
    it('should soft-delete a shipment order', async () => {
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
