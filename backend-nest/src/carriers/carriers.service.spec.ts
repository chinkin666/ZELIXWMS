// 配送業者サービス単体テスト / 配送业者服务单元测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { CarriersService } from './carriers.service';
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

describe('CarriersService / 配送業者サービス / 配送业者服务', () => {
  let service: CarriersService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const carrierId = 'carrier-001';
  const mockCarrier = {
    id: carrierId,
    tenantId,
    code: 'YAMATO',
    name: 'Yamato Transport',
    enabled: true,
    isBuiltIn: false,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBuiltInCarrier = {
    ...mockCarrier,
    id: 'carrier-builtin',
    isBuiltIn: true,
    tenantId: null,
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
        CarriersService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<CarriersService>(CarriersService);
  });

  // ========================================
  // findAll テスト / findAll 测试
  // ========================================

  it('findAll: 共有＋テナント固有の配送業者一覧を返す / 返回共享＋租户专属配送业者列表', async () => {
    const mockItems = [mockBuiltInCarrier, mockCarrier];
    mockDb.select
      .mockReturnValueOnce(createSelectChain(mockItems))
      .mockReturnValueOnce(createSelectChain([{ count: 2 }]));

    const result = await service.findAll(tenantId, { page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('findAll: コード・名前でフィルタ / 按代码和名称筛选', async () => {
    mockDb.select
      .mockReturnValueOnce(createSelectChain([mockCarrier]))
      .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

    const result = await service.findAll(tenantId, {
      code: 'YAMATO',
      name: 'Yamato',
      enabled: true,
    });

    expect(result.items).toHaveLength(1);
    expect(mockDb.select).toHaveBeenCalled();
  });

  // ========================================
  // findById テスト / findById 测试
  // ========================================

  it('findById: 配送業者が見つかった場合に返す / 找到配送业者时返回', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockCarrier]));

    const result = await service.findById(tenantId, carrierId);

    expect(result).toEqual(mockCarrier);
  });

  it('findById: 見つからない場合NotFoundException / 未找到时抛出 NotFoundException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await expect(service.findById(tenantId, 'nonexistent'))
      .rejects.toThrow(WmsException);
  });

  // ========================================
  // create テスト / create 测试
  // ========================================

  it('create: 新規配送業者を作成する / 创建新配送业者', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));
    mockDb.returning.mockResolvedValueOnce([mockCarrier]);

    const result = await service.create(tenantId, { code: 'YAMATO', name: 'Yamato Transport' } as any);

    expect(result).toEqual(mockCarrier);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  it('create: コード重複でConflictException / 代码重复时抛出 ConflictException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

    await expect(service.create(tenantId, { code: 'YAMATO', name: 'Dup' } as any))
      .rejects.toThrow(WmsException);
  });

  // ========================================
  // update テスト / update 测试
  // ========================================

  it('update: 配送業者情報を更新する / 更新配送业者信息', async () => {
    const updated = { ...mockCarrier, name: 'Yamato Updated' };
    mockDb.select.mockReturnValueOnce(createSelectChain([mockCarrier]));
    mockDb.returning.mockResolvedValueOnce([updated]);

    const result = await service.update(tenantId, carrierId, { name: 'Yamato Updated' } as any);

    expect(result.name).toBe('Yamato Updated');
  });

  it('update: 内置業者はForbiddenException / 内置业者抛出 ForbiddenException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockBuiltInCarrier]));

    await expect(service.update(tenantId, 'carrier-builtin', { name: 'X' } as any))
      .rejects.toThrow(WmsException);
  });

  // ========================================
  // remove テスト / remove 测试
  // ========================================

  it('remove: 配送業者を物理削除する / 硬删除配送业者', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockCarrier]));
    mockDb.returning.mockResolvedValueOnce([mockCarrier]);

    const result = await service.remove(tenantId, carrierId);

    expect(result).toEqual(mockCarrier);
    expect(mockDb.delete).toHaveBeenCalled();
  });

  it('remove: 内置業者はForbiddenException / 内置业者抛出 ForbiddenException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockBuiltInCarrier]));

    await expect(service.remove(tenantId, 'carrier-builtin'))
      .rejects.toThrow(WmsException);
  });
});
