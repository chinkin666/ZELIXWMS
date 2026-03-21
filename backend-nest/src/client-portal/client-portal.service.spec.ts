// クライアントポータルサービスのテスト / 客户门户服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { ClientPortalService } from './client-portal.service';

describe('ClientPortalService', () => {
  let service: ClientPortalService;
  let mockDb: any;

  // テスト用定数 / 测试用常量
  const tenantId = 'tenant-001';
  const clientId = 'client-001';

  beforeEach(async () => {
    mockDb = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientPortalService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
  });

  it('should be defined / サービスが定義されていること / 服务应被定义', () => {
    expect(service).toBeDefined();
  });

  // === getDashboard テスト / getDashboard 测试 ===
  describe('getDashboard', () => {
    // ダッシュボードのプレースホルダーデータを返す / 返回仪表盘占位符数据
    it('should return dashboard with stats / ダッシュボードの統計情報を返す / 返回仪表盘统计', async () => {
      const result = await service.getDashboard(tenantId, clientId);

      expect(result.tenantId).toBe(tenantId);
      expect(result.clientId).toBe(clientId);
      expect(result.stats).toBeDefined();
      expect(result.stats.totalOrders).toBe(0);
      expect(result.stats.totalProducts).toBe(0);
    });
  });

  // === getOrders テスト / getOrders 测试 ===
  describe('getOrders', () => {
    // 空の注文リストを返す / 返回空订单列表
    it('should return empty order list / 空の注文リストを返す / 返回空订单列表', async () => {
      const result = await service.getOrders(tenantId, clientId, { page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    // デフォルトページネーション / 默认分页
    it('should use default pagination / デフォルトのページネーションを使用する / 使用默认分页', async () => {
      const result = await service.getOrders(tenantId, clientId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // === getInbound テスト / getInbound 测试 ===
  describe('getInbound', () => {
    // 空の入荷リストを返す / 返回空入库列表
    it('should return empty inbound list / 空の入荷リストを返す / 返回空入库列表', async () => {
      const result = await service.getInbound(tenantId, clientId, { page: 1, limit: 5 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(5);
    });
  });

  // === getBilling テスト / getBilling 测试 ===
  describe('getBilling', () => {
    // 空の請求リストを返す / 返回空账单列表
    it('should return empty billing list / 空の請求リストを返す / 返回空账单列表', async () => {
      const result = await service.getBilling(tenantId, clientId, { page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });
});
