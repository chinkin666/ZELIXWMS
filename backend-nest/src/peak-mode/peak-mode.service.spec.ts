// ピークモードサービスのテスト / 高峰模式服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { PeakModeService } from './peak-mode.service';

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

describe('PeakModeService', () => {
  let service: PeakModeService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PeakModeService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<PeakModeService>(PeakModeService);
  });

  it('should be defined / サービスが定義されていること / 服务应被定义', () => {
    expect(service).toBeDefined();
  });

  // === getStatus テスト / getStatus 测试 ===
  describe('getStatus', () => {
    // 設定未登録の場合: 無効を返す / 无设置时: 返回未激活
    it('should return inactive when no setting found / 設定未登録の場合に無効を返す / 无设置时返回未激活', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      const result = await service.getStatus(tenantId);

      expect(result.active).toBe(false);
      expect(result.activatedAt).toBeNull();
    });

    // 設定あり・有効の場合: 有効を返す / 有设置且激活时: 返回已激活
    it('should return active when setting is active / 設定が有効の場合にアクティブを返す / 设置激活时返回已激活', async () => {
      const mockSetting = {
        id: 'setting-1',
        tenantId,
        settingsKey: 'peak_mode',
        settings: { active: true, activatedAt: '2026-03-21T00:00:00.000Z' },
      };
      mockDb.select.mockReturnValueOnce(createSelectChain([mockSetting]));

      const result = await service.getStatus(tenantId);

      expect(result.active).toBe(true);
      expect(result.activatedAt).toBe('2026-03-21T00:00:00.000Z');
    });
  });

  // === activate テスト / activate 测试 ===
  describe('activate', () => {
    // 新規作成で有効化 / 新建激活
    it('should activate peak mode (insert) / ピークモードを有効化する（挿入） / 激活高峰模式（插入）', async () => {
      // 既存レコードなし → insert / 无现有记录 → 插入
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      const result = await service.activate(tenantId);

      expect(result.active).toBe(true);
      expect(result.activatedAt).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // 既存レコード更新で有効化 / 更新现有记录激活
    it('should activate peak mode (update) / ピークモードを有効化する（更新） / 激活高峰模式（更新）', async () => {
      // 既存レコードあり → update / 存在记录 → 更新
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'setting-1' }]));

      const result = await service.activate(tenantId);

      expect(result.active).toBe(true);
      expect(result.activatedAt).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // === deactivate テスト / deactivate 测试 ===
  describe('deactivate', () => {
    // 無効化 / 停用
    it('should deactivate peak mode / ピークモードを無効化する / 停用高峰模式', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'setting-1' }]));

      const result = await service.deactivate(tenantId);

      expect(result.active).toBe(false);
      expect(result.deactivatedAt).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
