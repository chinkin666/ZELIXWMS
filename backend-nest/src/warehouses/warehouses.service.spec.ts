// 倉庫サービス単体テスト / 仓库服务单元测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { WarehousesService } from './warehouses.service';
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

describe('WarehousesService / 倉庫サービス / 仓库服务', () => {
  let service: WarehousesService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const warehouseId = 'wh-001';
  const mockWarehouse = {
    id: warehouseId,
    tenantId,
    code: 'WH-001',
    name: 'Main Warehouse',
    isActive: true,
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
        WarehousesService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
  });

  // ========================================
  // findAll テスト / findAll 测试
  // ========================================

  // ページネーション付き一覧取得 / 分页获取列表
  it('findAll: ページネーション付き一覧を返す / 返回分页列表', async () => {
    const mockItems = [mockWarehouse];
    mockDb.select
      .mockReturnValueOnce(createSelectChain(mockItems))
      .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

    const result = await service.findAll(tenantId, { page: 1, limit: 10 });

    expect(result.items).toEqual(mockItems);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  // デフォルトページネーション / 默认分页
  it('findAll: デフォルト値でページネーション / 使用默认值分页', async () => {
    mockDb.select
      .mockReturnValueOnce(createSelectChain([]))
      .mockReturnValueOnce(createSelectChain([{ count: 0 }]));

    const result = await service.findAll(tenantId, {});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  // ========================================
  // findById テスト / findById 测试
  // ========================================

  it('findById: 倉庫が見つかった場合に返す / 找到仓库时返回', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockWarehouse]));

    const result = await service.findById(tenantId, warehouseId);

    expect(result).toEqual(mockWarehouse);
  });

  it('findById: 見つからない場合NotFoundException / 未找到时抛出 NotFoundException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await expect(service.findById(tenantId, 'nonexistent'))
      .rejects.toThrow(WmsException);
  });

  // ========================================
  // create テスト / create 测试
  // ========================================

  it('create: 新規倉庫を作成する / 创建新仓库', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));
    mockDb.returning.mockResolvedValueOnce([mockWarehouse]);

    const result = await service.create(tenantId, { code: 'WH-001', name: 'Main Warehouse' } as any);

    expect(result).toEqual(mockWarehouse);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('create: コード重複でConflictException / 编码重复时抛出 ConflictException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

    await expect(service.create(tenantId, { code: 'WH-001', name: 'Dup' } as any))
      .rejects.toThrow(WmsException);
  });

  // ========================================
  // update テスト / update 测试
  // ========================================

  it('update: 倉庫情報を更新する / 更新仓库信息', async () => {
    const updated = { ...mockWarehouse, name: 'Updated WH' };
    mockDb.select.mockReturnValueOnce(createSelectChain([mockWarehouse]));
    mockDb.returning.mockResolvedValueOnce([updated]);

    const result = await service.update(tenantId, warehouseId, { name: 'Updated WH' } as any);

    expect(result.name).toBe('Updated WH');
  });

  it('update: 存在しないIDでNotFoundException / 不存在的ID抛出 NotFoundException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await expect(service.update(tenantId, 'nonexistent', { name: 'X' } as any))
      .rejects.toThrow(WmsException);
  });

  // ========================================
  // remove テスト / remove 测试
  // ========================================

  it('remove: 倉庫を物理削除する / 硬删除仓库', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockWarehouse]));
    mockDb.returning.mockResolvedValueOnce([mockWarehouse]);

    const result = await service.remove(tenantId, warehouseId);

    expect(result).toEqual(mockWarehouse);
    expect(mockDb.delete).toHaveBeenCalled();
  });
});
