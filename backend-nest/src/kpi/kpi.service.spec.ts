// KPIサービスのテスト / KPI服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { KpiService } from './kpi.service';

describe('KpiService', () => {
  let service: KpiService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';

  beforeEach(async () => {
    mockDb = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [KpiService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<KpiService>(KpiService);
  });

  it('should be defined / サービスが定義されていること / 服务应被定义', () => {
    expect(service).toBeDefined();
  });

  // === getDashboard テスト / getDashboard 测试 ===
  describe('getDashboard', () => {
    // プレースホルダーのダッシュボードデータを返す / 返回占位符仪表盘数据
    it('should return placeholder dashboard data / プレースホルダーのダッシュボードを返す / 返回占位符仪表盘', async () => {
      const result = await service.getDashboard(tenantId);

      expect(result).toEqual({
        orderCount: 0,
        shipmentCount: 0,
        inboundCount: 0,
        returnCount: 0,
      });
    });

    // 全フィールドが数値型であること / 所有字段应为数值类型
    it('should return numeric fields / 全フィールドが数値であること / 所有字段应为数值', async () => {
      const result = await service.getDashboard(tenantId);

      expect(typeof result.orderCount).toBe('number');
      expect(typeof result.shipmentCount).toBe('number');
      expect(typeof result.inboundCount).toBe('number');
      expect(typeof result.returnCount).toBe('number');
    });
  });

  // === getOrderStats テスト / getOrderStats 测试 ===
  describe('getOrderStats', () => {
    // 日付パラメータなしでプレースホルダーを返す / 无日期参数时返回占位符
    it('should return placeholder stats without dates / 日付なしでプレースホルダー統計を返す / 无日期时返回占位符统计', async () => {
      const result = await service.getOrderStats(tenantId);

      expect(result).toEqual({
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        dateFrom: null,
        dateTo: null,
      });
    });

    // 日付パラメータ付きで日付を含めて返す / 带日期参数时返回包含日期
    it('should include date params when provided / 日付パラメータを含めて返す / 提供日期参数时包含日期', async () => {
      const result = await service.getOrderStats(tenantId, '2026-01-01', '2026-03-21');

      expect(result.dateFrom).toBe('2026-01-01');
      expect(result.dateTo).toBe('2026-03-21');
      expect(result.totalOrders).toBe(0);
    });
  });
});
