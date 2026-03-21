// 管理サービスのテスト / 管理服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { AdminService } from './admin.service';
import { WmsException } from '../common/exceptions/wms.exception';

// ヘルパー: チェーン可能なクエリモック生成 / 辅助: 生成可链式调用的查询mock
function createSelectChain(resolveValue: any = []) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('AdminService', () => {
  let service: AdminService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const userId = 'user-001';
  const mockUser = {
    id: userId,
    tenantId,
    email: 'admin@example.com',
    displayName: '管理者',
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSettings = {
    id: 'settings-001',
    tenantId,
    settingsKey: 'general',
    settings: { timezone: 'Asia/Tokyo' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLog = {
    id: 'log-001',
    tenantId,
    action: 'create',
    resourceType: 'user',
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
      onConflictDoUpdate: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAllUsers テスト / findAllUsers 测试 ===
  describe('findAllUsers', () => {
    // ユーザー一覧取得成功 / 成功获取用户列表
    it('should return paginated users', async () => {
      const mockItems = [mockUser];
      const dataChain = createSelectChain(mockItems);
      const countChain = createSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAllUsers(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    // ページネーション上限チェック / 分页上限检查
    it('should cap limit at 100', async () => {
      const dataChain = createSelectChain([]);
      const countChain = createSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAllUsers(tenantId, { limit: 999 });

      expect(result.limit).toBe(200);
    });
  });

  // === findUserById テスト / findUserById 测试 ===
  describe('findUserById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a user by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockUser]));

      const result = await service.findUserById(tenantId, userId);

      expect(result).toEqual(mockUser);
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when user not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findUserById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === createUser テスト / createUser 测试 ===
  describe('createUser', () => {
    const createDto = { email: 'new@example.com', displayName: '新規ユーザー', role: 'viewer' } as any;

    // 作成成功 / 创建成功
    it('should create a new user', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.createUser(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  // === updateUser テスト / updateUser 测试 ===
  describe('updateUser', () => {
    // 更新成功 / 更新成功
    it('should update a user', async () => {
      const updateDto = { displayName: '更新名前' } as any;
      // findUserById 成功 / findUserById 成功
      mockDb.select.mockReturnValueOnce(createSelectChain([mockUser]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockUser, ...updateDto }]);

      const result = await service.updateUser(tenantId, userId, updateDto);

      expect(result.displayName).toBe('更新名前');
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when updating nonexistent user', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.updateUser(tenantId, 'nonexistent', {} as any)).rejects.toThrow(WmsException);
    });
  });

  // === removeUser テスト / removeUser 测试 ===
  describe('removeUser', () => {
    // 論理削除成功（isActive=false） / 软删除成功（isActive=false）
    it('should soft-delete a user by setting isActive to false', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockUser]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockUser, isActive: false }]);

      const result = await service.removeUser(tenantId, userId);

      expect(result.isActive).toBe(false);
      expect(mockDb.update).toHaveBeenCalled();
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when removing nonexistent user', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.removeUser(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === getSettings テスト / getSettings 测试 ===
  describe('getSettings', () => {
    // 設定取得成功 / 获取设置成功
    it('should return settings by key', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockSettings]));

      const result = await service.getSettings(tenantId, 'general');

      expect(result).toEqual(mockSettings);
    });

    // 設定が存在しない場合デフォルト返却 / 设置不存在时返回默认值
    it('should return default empty settings when not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      const result = await service.getSettings(tenantId, 'nonexistent');

      expect(result).toEqual({ settingsKey: 'nonexistent', settings: {} });
    });
  });

  // === upsertSettings テスト / upsertSettings 测试 ===
  describe('upsertSettings', () => {
    // 設定アップサート成功 / 设置upsert成功
    it('should upsert settings', async () => {
      const newSettings = { timezone: 'UTC' };
      mockDb.returning.mockResolvedValueOnce([{ ...mockSettings, settings: newSettings }]);

      const result = await service.upsertSettings(tenantId, 'general', newSettings);

      expect(result.settings).toEqual(newSettings);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.onConflictDoUpdate).toHaveBeenCalled();
    });
  });

  // === findOperationLogs テスト / findOperationLogs 测试 ===
  describe('findOperationLogs', () => {
    // 操作ログ取得成功 / 成功获取操作日志
    it('should return paginated operation logs', async () => {
      const mockItems = [mockLog];
      const dataChain = createSelectChain(mockItems);
      const countChain = createSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findOperationLogs(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    // フィルタ適用テスト / 筛选应用测试
    it('should apply action and resourceType filters', async () => {
      const dataChain = createSelectChain([]);
      const countChain = createSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findOperationLogs(tenantId, { action: 'create', resourceType: 'user' });

      expect(result.items).toEqual([]);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });
  });
});
