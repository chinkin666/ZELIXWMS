// 日次レポートサービスのテスト / 日报服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { DailyReportsService } from './daily-reports.service';
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

describe('DailyReportsService', () => {
  let service: DailyReportsService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const reportId = 'report-001';
  const mockReport = {
    id: reportId,
    tenantId,
    date: new Date('2026-03-21'),
    summary: { ordersProcessed: 42 },
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
      where: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DailyReportsService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<DailyReportsService>(DailyReportsService);
  });

  it('should be defined / サービスが定義されていること / 服务应被定义', () => {
    expect(service).toBeDefined();
  });

  // === findAll テスト / findAll 测试 ===
  describe('findAll', () => {
    // ページネーション付き一覧取得 / 带分页获取列表
    it('should return paginated daily reports / ページネーション付きの日次レポートを返す / 返回分页日报', async () => {
      const mockItems = [mockReport];
      mockDb.select
        .mockReturnValueOnce(createSelectChain(mockItems))
        .mockReturnValueOnce(createSelectChain([{ count: 1 }]));

      const result = await service.findAll(tenantId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockItems);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    // デフォルトページネーション / 默认分页参数
    it('should use default pagination when not specified / 未指定時にデフォルトのページネーションを使用する / 未指定时使用默认分页', async () => {
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
    it('should return a report by id / IDでレポートを返す / 按ID返回日报', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([mockReport]));

      const result = await service.findById(tenantId, reportId);

      expect(result).toEqual(mockReport);
    });

    // 存在しない場合 WmsException / 不存在时抛出 WmsException
    it('should throw WmsException when not found / 見つからない場合にWmsExceptionを投げる / 未找到时抛出WmsException', async () => {
      mockDb.select.mockReturnValueOnce(createSelectChain([]));

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(WmsException);
    });
  });

  // === create テスト / create 测试 ===
  describe('create', () => {
    // 作成成功 / 创建成功
    it('should create a new daily report / 新しい日次レポートを作成する / 创建新日报', async () => {
      // 重複チェック: 既存なし / 重复检查: 无现有记录
      mockDb.select.mockReturnValueOnce(createSelectChain([]));
      mockDb.returning.mockResolvedValueOnce([mockReport]);

      const result = await service.create(tenantId, { date: '2026-03-21', summary: { ordersProcessed: 42 } });

      expect(result).toEqual(mockReport);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    // 同一日付で重複 / 同日期重复
    it('should throw WmsException on duplicate date / 重複日付でWmsExceptionを投げる / 日期重复时抛出WmsException', async () => {
      // 重複チェック: 既存あり / 重复检查: 存在记录
      mockDb.select.mockReturnValueOnce(createSelectChain([{ id: 'existing-id' }]));

      await expect(
        service.create(tenantId, { date: '2026-03-21', summary: {} }),
      ).rejects.toThrow(WmsException);
    });
  });

  // === update テスト / update 测试 ===
  describe('update', () => {
    // 更新成功 / 更新成功
    it('should update a daily report / 日次レポートを更新する / 更新日报', async () => {
      const updatedReport = { ...mockReport, summary: { ordersProcessed: 99 } };
      // findById で存在確認 / findById 确认存在
      mockDb.select.mockReturnValueOnce(createSelectChain([mockReport]));
      mockDb.returning.mockResolvedValueOnce([updatedReport]);

      const result = await service.update(tenantId, reportId, { summary: { ordersProcessed: 99 } });

      expect(result.summary).toEqual({ ordersProcessed: 99 });
    });
  });
});
