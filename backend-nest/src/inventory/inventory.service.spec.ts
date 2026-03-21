// 在庫サービス単体テスト / 库存服务单元测试
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { InventoryService } from './inventory.service';

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

describe('InventoryService / 在庫サービス / 库存服务', () => {
  let service: InventoryService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const locationId = 'loc-001';
  const mockLocation = {
    id: locationId,
    tenantId,
    warehouseId: 'wh-001',
    code: 'A-01-01',
    type: 'shelf',
    sortOrder: 0,
    createdAt: new Date(),
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
      providers: [
        InventoryService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  // ========================================
  // findAllLocations テスト / findAllLocations 测试
  // ========================================

  it('findAllLocations: ページネーション付き一覧を返す / 返回分页列表', async () => {
    mockDb.select
      .mockReturnValueOnce(createSelectChain([mockLocation]))
      .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

    const result = await service.findAllLocations(tenantId, { page: 1, limit: 10 });

    expect(result.items).toEqual([mockLocation]);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  // ========================================
  // findLocationById テスト / findLocationById 测试
  // ========================================

  it('findLocationById: ロケーションが見つかった場合に返す / 找到库位时返回', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockLocation]));

    const result = await service.findLocationById(tenantId, locationId);

    expect(result).toEqual(mockLocation);
  });

  it('findLocationById: 見つからない場合NotFoundException / 未找到时抛出 NotFoundException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await expect(service.findLocationById(tenantId, 'nonexistent'))
      .rejects.toThrow(NotFoundException);
  });

  // ========================================
  // createLocation テスト / createLocation 测试
  // ========================================

  it('createLocation: 新規ロケーションを作成する / 创建新库位', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));
    mockDb.returning.mockResolvedValueOnce([mockLocation]);

    const result = await service.createLocation(tenantId, { code: 'A-01-01', warehouseId: 'wh-001' } as any);

    expect(result).toEqual(mockLocation);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('createLocation: コード重複でConflictException / 编码重复时抛出 ConflictException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

    await expect(service.createLocation(tenantId, { code: 'A-01-01' } as any))
      .rejects.toThrow(ConflictException);
  });

  // ========================================
  // updateLocation テスト / updateLocation 测试
  // ========================================

  it('updateLocation: ロケーション情報を更新する / 更新库位信息', async () => {
    const updated = { ...mockLocation, type: 'floor' };
    mockDb.select.mockReturnValueOnce(createSelectChain([mockLocation]));
    mockDb.returning.mockResolvedValueOnce([updated]);

    const result = await service.updateLocation(tenantId, locationId, { type: 'floor' } as any);

    expect(result.type).toBe('floor');
  });

  it('updateLocation: 存在しないIDでNotFoundException / 不存在的ID抛出 NotFoundException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await expect(service.updateLocation(tenantId, 'nonexistent', { type: 'x' } as any))
      .rejects.toThrow(NotFoundException);
  });

  // ========================================
  // removeLocation テスト / removeLocation 测试
  // ========================================

  it('removeLocation: ロケーションを物理削除する / 硬删除库位', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockLocation]));
    mockDb.returning.mockResolvedValueOnce([mockLocation]);

    const result = await service.removeLocation(tenantId, locationId);

    expect(result).toEqual(mockLocation);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  // ========================================
  // getStockLevels テスト / getStockLevels 测试
  // ========================================

  it('getStockLevels: 商品別在庫レベルを返す / 返回按商品汇总的库存水平', async () => {
    const mockStock = [
      { productId: 'prod-001', totalQuantity: 100, reservedQuantity: 20, availableQuantity: 80 },
    ];
    mockDb.select
      .mockReturnValueOnce(createSelectChain(mockStock))
      .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

    const result = await service.getStockLevels(tenantId, { page: 1, limit: 10 });

    expect(result.items).toEqual(mockStock);
    expect(result.total).toBe(1);
  });

  // ========================================
  // getStockByProduct テスト / getStockByProduct 测试
  // ========================================

  it('getStockByProduct: 商品の在庫詳細を返す / 返回商品库存详情', async () => {
    const mockRows = [
      { id: 'sq-1', locationId: 'loc-1', lotId: null, quantity: 50, reservedQuantity: 10, availableQuantity: 40, lastMovedAt: null },
      { id: 'sq-2', locationId: 'loc-2', lotId: null, quantity: 30, reservedQuantity: 5, availableQuantity: 25, lastMovedAt: null },
    ];
    mockDb.select.mockReturnValueOnce(createSelectChain(mockRows));

    const result = await service.getStockByProduct(tenantId, 'prod-001');

    expect(result.productId).toBe('prod-001');
    expect(result.locations).toHaveLength(2);
    expect(result.totalQuantity).toBe(80);
    expect(result.totalReserved).toBe(15);
    expect(result.totalAvailable).toBe(65);
  });
});
