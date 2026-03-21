// 顧客サービス単体テスト / 客户服务单元测试
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { ClientsService } from './clients.service';

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

describe('ClientsService / 顧客サービス / 客户服务', () => {
  let service: ClientsService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const clientId = 'client-001';
  const mockClient = {
    id: clientId,
    tenantId,
    code: 'CLI-001',
    name: 'Test Client',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
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
        ClientsService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  // ========================================
  // findAll テスト / findAll 测试
  // ========================================

  // ページネーション付き一覧取得 / 分页获取列表
  it('findAll: ページネーション付き一覧を返す / 返回分页列表', async () => {
    const mockItems = [mockClient];
    mockDb.select
      .mockReturnValueOnce(createSelectChain(mockItems))
      .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

    const result = await service.findAll(tenantId, { page: 1, limit: 10 });

    expect(result.items).toEqual(mockItems);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });

  // フィルター付き検索 / 带筛选条件的搜索
  it('findAll: フィルター条件を適用する / 应用筛选条件', async () => {
    mockDb.select
      .mockReturnValueOnce(createSelectChain([]))
      .mockReturnValueOnce(createSelectChain([{ count: 0 }]));

    const result = await service.findAll(tenantId, {
      code: 'CLI',
      name: 'Test',
      isActive: true,
    });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(mockDb.select).toHaveBeenCalled();
  });

  // ========================================
  // findById テスト / findById 测试
  // ========================================

  // ID検索で見つかった場合 / 按ID查找成功
  it('findById: 顧客が見つかった場合に返す / 找到客户时返回', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([mockClient]));

    const result = await service.findById(tenantId, clientId);

    expect(result).toEqual(mockClient);
  });

  // ID検索で見つからない場合 / 按ID查找不到
  it('findById: 見つからない場合NotFoundException / 未找到时抛出 NotFoundException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await expect(service.findById(tenantId, 'nonexistent'))
      .rejects.toThrow(NotFoundException);
  });

  // ========================================
  // create テスト / create 测试
  // ========================================

  // 正常作成 / 正常创建
  it('create: 新規顧客を作成する / 创建新客户', async () => {
    // 重複チェック: 空配列 / 重复检查: 空数组
    mockDb.select.mockReturnValueOnce(createSelectChain([]));
    // insert → returning
    mockDb.returning.mockResolvedValueOnce([mockClient]);

    const result = await service.create(tenantId, { code: 'CLI-001', name: 'Test Client' } as any);

    expect(result).toEqual(mockClient);
    expect(mockDb.insert).toHaveBeenCalled();
  });

  // コード重複時 / 编码重复时
  it('create: コード重複でConflictException / 编码重复时抛出 ConflictException', async () => {
    // 重複チェック: 既存あり / 重复检查: 已存在
    mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

    await expect(service.create(tenantId, { code: 'CLI-001', name: 'Dup' } as any))
      .rejects.toThrow(ConflictException);
  });

  // ========================================
  // update テスト / update 测试
  // ========================================

  // 正常更新 / 正常更新
  it('update: 顧客情報を更新する / 更新客户信息', async () => {
    const updated = { ...mockClient, name: 'Updated' };
    // findById チェック / findById 检查
    mockDb.select.mockReturnValueOnce(createSelectChain([mockClient]));
    // update → returning
    mockDb.returning.mockResolvedValueOnce([updated]);

    const result = await service.update(tenantId, clientId, { name: 'Updated' } as any);

    expect(result.name).toBe('Updated');
  });

  // 存在しないID更新 / 更新不存在的ID
  it('update: 存在しないIDでNotFoundException / 不存在的ID抛出 NotFoundException', async () => {
    mockDb.select.mockReturnValueOnce(createSelectChain([]));

    await expect(service.update(tenantId, 'nonexistent', { name: 'X' } as any))
      .rejects.toThrow(NotFoundException);
  });

  // ========================================
  // remove テスト / remove 测试
  // ========================================

  // 論理削除成功 / 软删除成功
  it('remove: 顧客を論理削除する / 软删除客户', async () => {
    const deleted = { ...mockClient, deletedAt: new Date() };
    // findById チェック / findById 检查
    mockDb.select.mockReturnValueOnce(createSelectChain([mockClient]));
    // update (soft delete) → returning
    mockDb.returning.mockResolvedValueOnce([deleted]);

    const result = await service.remove(tenantId, clientId);

    expect(result.deletedAt).toBeDefined();
    expect(mockDb.update).toHaveBeenCalled();
  });
});
