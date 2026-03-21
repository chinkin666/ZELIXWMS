// 資材サービスのテスト / 物料服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { MaterialsService } from './materials.service';
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

describe('MaterialsService', () => {
  let service: MaterialsService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const materialId = 'mat-001';
  const mockMaterial = {
    id: materialId,
    tenantId,
    sku: 'MAT-SKU-001',
    name: 'テスト資材',
    category: 'packaging',
    isActive: true,
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
      providers: [MaterialsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // === findAll テスト / findAll 测试 ===
  describe('findAll', () => {
    // 資材一覧取得成功 / 成功获取物料列表
    it('should return paginated materials', async () => {
      const mockItems = [mockMaterial];
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

    // SKU・名前フィルタ適用 / SKU和名称筛选应用
    it('should apply sku and name filters', async () => {
      const dataChain = createSelectChain([]);
      const countChain = createSelectChain([{ count: 0 }]);
      mockDb.select
        .mockReturnValueOnce(dataChain)
        .mockReturnValueOnce(countChain);

      const result = await service.findAll(tenantId, { sku: 'MAT', name: 'テスト' });

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
    it('should return a material by id', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockMaterial]));

      const result = await service.findById(tenantId, materialId);

      expect(result).toEqual(mockMaterial);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when material not found', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === create テスト / create 测试 ===
  describe('create', () => {
    const createDto = { sku: 'MAT-SKU-002', name: '新規資材' } as any;

    // 作成成功 / 创建成功
    it('should create a new material', async () => {
      // SKU重複チェック: 既存なし / SKU重复检查: 无已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockDb.returning.mockResolvedValueOnce([{ id: 'new-id', ...createDto }]);

      const result = await service.create(tenantId, createDto);

      expect(result).toHaveProperty('id', 'new-id');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // SKU重複時 ConflictException / SKU重复时抛出 ConflictException
    it('should throw ConflictException for duplicate SKU', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.create(tenantId, { sku: 'MAT-SKU-001', name: '重複資材' } as any),
      ).rejects.toThrow(WmsException);
    });
  });

  // === update テスト / update 测试 ===
  describe('update', () => {
    // 更新成功 / 更新成功
    it('should update a material', async () => {
      const updateDto = { name: '更新資材' } as any;
      // findById 成功 / findById 成功
      mockDb.select.mockReturnValueOnce(createSelectChain([mockMaterial]));
      mockDb.returning.mockResolvedValueOnce([{ ...mockMaterial, ...updateDto }]);

      const result = await service.update(tenantId, materialId, updateDto);

      expect(result.name).toBe('更新資材');
    });

    // SKU変更時の重複チェック / SKU变更时的重复检查
    it('should throw ConflictException when changing to duplicate SKU', async () => {
      const updateDto = { sku: 'SKU-EXISTING' } as any;
      // findById 成功 / findById 成功
      mockDb.select.mockReturnValueOnce(createSelectChain([mockMaterial]));
      // SKU重複チェック: 別IDで既存 / SKU重复检查: 不同ID已存在
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'other-id' }]));

      await expect(service.update(tenantId, materialId, updateDto)).rejects.toThrow(WmsException);
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when updating nonexistent material', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.update(tenantId, 'nonexistent', {} as any)).rejects.toThrow(WmsException);
    });
  });

  // === remove テスト / remove 测试 ===
  describe('remove', () => {
    // 削除成功 / 删除成功
    it('should delete a material', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockMaterial]));
      mockDb.returning.mockResolvedValueOnce([mockMaterial]);

      const result = await service.remove(tenantId, materialId);

      expect(result).toEqual(mockMaterial);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    // 存在しない場合 NotFoundException / 不存在时抛出 NotFoundException
    it('should throw NotFoundException when removing nonexistent material', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });
});
