// ウェーブサービスのテスト / 波次服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { WavesService } from './waves.service';

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

describe('WavesService', () => {
  let service: WavesService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const waveId = 'wave-001';
  const mockWave = {
    id: waveId,
    tenantId,
    waveNumber: 'WAVE-001',
    warehouseId: 'wh-001',
    status: 'pending',
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
      providers: [WavesService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<WavesService>(WavesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll テスト / findAll 测试 ===
  describe('findAll', () => {
    // ウェーブ一覧取得成功 / 成功获取波次列表
    it('should return paginated waves', async () => {
      const mockItems = [mockWave];
      const dataChain = createSelectChain(mockItems);
      const countChain = createSelectChain([{ count: 1 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result).toEqual({
        items: mockItems,
        total: 1,
        page: 1,
        limit: 10,
      });
    });

    // ページネーション上限チェック / 分页上限检查
    it('should cap limit at 100', async () => {
      const dataChain = createSelectChain([]);
      const countChain = createSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { limit: 999 });

      expect(result.limit).toBe(100);
    });
  });

  // === findById テスト / findById 测试 ===
  describe('findById', () => {
    // ID検索成功 / 按ID查找成功
    it('should return a wave by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockWave]));

      const result = await service.findById(tenantId, waveId);

      expect(result).toEqual(mockWave);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when wave not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // === create テスト / create 测试 ===
  describe('create', () => {
    const createDto = { waveNumber: 'WAVE-002', warehouseId: 'wh-001' } as any;

    // 作成成功 / 创建成功
    it('should create a new wave', async () => {
      // ウェーブ番号重複チェック: 既存なし / 波次编号重复检查: 无已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.create(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // ウェーブ番号重複時 ConflictException / 波次编号重复时抛出 ConflictException
    it('should throw ConflictException for duplicate wave number', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.create(tenantId, { waveNumber: 'WAVE-001' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  // === update テスト / update 测试 ===
  describe('update', () => {
    // 更新成功 / 更新成功
    it('should update a wave', async () => {
      const updateDto = { status: 'completed' } as any;
      // findById 成功 / findById 成功
      mockDb.select.mockReturnValueOnce(createSelectChain([mockWave]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockWave, ...updateDto }]);

      const result = await service.update(tenantId, waveId, updateDto);

      expect(result.status).toBe('completed');
    });

    // ウェーブ番号変更時の重複チェック / 波次编号变更时的重复检查
    it('should throw ConflictException when changing to duplicate wave number', async () => {
      const updateDto = { waveNumber: 'WAVE-EXISTING' } as any;
      // findById 成功 / findById 成功
      mockDb.select.mockReturnValueOnce(createSelectChain([mockWave]));
      // ウェーブ番号重複チェック: 別IDで既存 / 波次编号重复检查: 不同ID已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'other-id' }]));

      await expect(service.update(tenantId, waveId, updateDto)).rejects.toThrow(ConflictException);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when updating nonexistent wave', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.update(tenantId, 'nonexistent', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // === remove テスト / remove 测试 ===
  describe('remove', () => {
    // 削除成功 / 删除成功
    it('should delete a wave', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockWave]));
      mockDb.returning.mockResolvedValueOnce([mockWave]);

      const result = await service.remove(tenantId, waveId);

      expect(result).toEqual(mockWave);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when removing nonexistent wave', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
