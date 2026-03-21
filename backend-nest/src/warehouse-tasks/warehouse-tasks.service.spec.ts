// 倉庫タスクサービスのテスト / 仓库任务服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { WarehouseTasksService } from './warehouse-tasks.service';
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

describe('WarehouseTasksService', () => {
  let service: WarehouseTasksService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const taskId = 'task-001';
  const mockTask = {
    id: taskId,
    tenantId,
    taskNumber: 'TASK-001',
    warehouseId: 'wh-001',
    type: 'pick',
    status: 'pending',
    waveId: 'wave-001',
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
      providers: [WarehouseTasksService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<WarehouseTasksService>(WarehouseTasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll テスト / findAll 测试 ===
  describe('findAll', () => {
    // タスク一覧取得成功 / 成功获取任务列表
    it('should return paginated warehouse tasks', async () => {
      const mockItems = [mockTask];
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

    // フィルタ適用テスト / 筛选应用测试
    it('should apply status and type filters', async () => {
      const dataChain = createSelectChain([]);
      const countChain = createSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { status: 'pending', type: 'pick' });

      expect(result.items).toEqual([]);
      expect(mockDb.select).toHaveBeenCalledTimes(2);
    });
  });

  // === findById テスト / findById 测试 ===
  describe('findById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a task by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockTask]));

      const result = await service.findById(tenantId, taskId);

      expect(result).toEqual(mockTask);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when task not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === create テスト / create 测试 ===
  describe('create', () => {
    const createDto = { taskNumber: 'TASK-002', warehouseId: 'wh-001', type: 'pick' } as any;

    // 作成成功 / 创建成功
    it('should create a new warehouse task', async () => {
      // タスク番号重複チェック: 既存なし / 任务编号重复检查: 无已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.create(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // タスク番号重複時 ConflictException / 任务编号重复时抛出 ConflictException
    it('should throw ConflictException for duplicate task number', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.create(tenantId, { taskNumber: 'TASK-001' } as any),
      ).rejects.toThrow(WmsException);
    });
  });

  // === update テスト / update 测试 ===
  describe('update', () => {
    // 更新成功 / 更新成功
    it('should update a warehouse task', async () => {
      const updateDto = { status: 'completed' } as any;
      // findById 成功 / findById 成功
      mockDb.select.mockReturnValueOnce(createSelectChain([mockTask]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockTask, ...updateDto }]);

      const result = await service.update(tenantId, taskId, updateDto);

      expect(result.status).toBe('completed');
    });

    // タスク番号変更時の重複チェック / 任务编号变更时的重复检查
    it('should throw ConflictException when changing to duplicate task number', async () => {
      const updateDto = { taskNumber: 'TASK-EXISTING' } as any;
      // findById 成功 / findById 成功
      mockDb.select.mockReturnValueOnce(createSelectChain([mockTask]));
      // タスク番号重複チェック: 別IDで既存 / 任务编号重复检查: 不同ID已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'other-id' }]));

      await expect(service.update(tenantId, taskId, updateDto)).rejects.toThrow(WmsException);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when updating nonexistent task', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.update(tenantId, 'nonexistent', {} as any)).rejects.toThrow(WmsException);
    });
  });

  // === remove テスト / remove 测试 ===
  describe('remove', () => {
    // 削除成功 / 删除成功
    it('should delete a warehouse task', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockTask]));
      mockDb.returning.mockResolvedValueOnce([mockTask]);

      const result = await service.remove(tenantId, taskId);

      expect(result).toEqual(mockTask);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when removing nonexistent task', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });
});
