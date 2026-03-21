// クライアントポータルサービスのテスト / 客户门户服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { ClientPortalService } from './client-portal.service';

// ヘルパー: チェーン可能なクエリモック生成 / 辅助: 生成可链式调用的查询mock
function createChain(resolveValue: any = []) {
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

describe('ClientPortalService', () => {
  let service: ClientPortalService;
  let mockDb: any;

  const tenantId = 'tenant-001';
  const clientId = 'client-001';

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientPortalService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== getDashboard =====
  describe('getDashboard', () => {
    it('should return dashboard with aggregated stats', async () => {
      // Promise.all: shipment stats, inbound stats, billing stats
      mockDb.select
        .mockReturnValueOnce(createChain([{ total: 100, shipped: 80, pending: 5 }]))
        .mockReturnValueOnce(createChain([{ total: 30, pending: 10 }]))
        .mockReturnValueOnce(createChain([{ totalAmount: 50000 }]));

      const result = await service.getDashboard(tenantId, clientId);

      expect(result.tenantId).toBe(tenantId);
      expect(result.clientId).toBe(clientId);
      expect(result.stats.totalOrders).toBe(100);
      expect(result.stats.shippedOrders).toBe(80);
      expect(result.stats.pendingOrders).toBe(5);
      expect(result.stats.totalInbound).toBe(30);
      expect(result.stats.pendingInbound).toBe(10);
      expect(result.stats.outstandingBalance).toBe(50000);
    });

    it('should default totalProducts to 0', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ total: 0, shipped: 0, pending: 0 }]))
        .mockReturnValueOnce(createChain([{ total: 0, pending: 0 }]))
        .mockReturnValueOnce(createChain([{ totalAmount: 0 }]));

      const result = await service.getDashboard(tenantId, clientId);

      expect(result.stats.totalProducts).toBe(0);
    });

    it('should handle null billing amount gracefully', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ total: 0, shipped: 0, pending: 0 }]))
        .mockReturnValueOnce(createChain([{ total: 0, pending: 0 }]))
        .mockReturnValueOnce(createChain([{ totalAmount: null }]));

      const result = await service.getDashboard(tenantId, clientId);

      expect(result.stats.outstandingBalance).toBe(0);
    });

    it('should handle empty query results', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{}]))
        .mockReturnValueOnce(createChain([{}]))
        .mockReturnValueOnce(createChain([{}]));

      const result = await service.getDashboard(tenantId, clientId);

      expect(result.stats.totalOrders).toBe(0);
    });
  });

  // ===== getOrders =====
  describe('getOrders', () => {
    it('should return paginated orders', async () => {
      const mockOrders = [
        { id: 'o1', orderNumber: 'ORD-001', recipientName: 'User 1', statusShipped: true, createdAt: new Date() },
      ];
      // Promise.all: count, items
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 1 }]))
        .mockReturnValueOnce(createChain(mockOrders));

      const result = await service.getOrders(tenantId, clientId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockOrders);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter by shipped status', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 5 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getOrders(tenantId, clientId, { status: 'shipped' });

      expect(result.total).toBe(5);
    });

    it('should filter by held status', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 2 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getOrders(tenantId, clientId, { status: 'held' });

      expect(result.total).toBe(2);
    });

    it('should filter by confirmed status', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 10 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getOrders(tenantId, clientId, { status: 'confirmed' });

      expect(result.total).toBe(10);
    });

    it('should default to page 1 and limit 20', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getOrders(tenantId, clientId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should cap limit at 200', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getOrders(tenantId, clientId, { limit: 999 });

      expect(result.limit).toBe(200);
    });

    it('should return totalPages in result', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 25 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getOrders(tenantId, clientId, { page: 1, limit: 10 });

      expect(result.totalPages).toBe(3);
    });
  });

  // ===== getInbound =====
  describe('getInbound', () => {
    it('should return paginated inbound orders', async () => {
      const mockInbound = [
        { id: 'i1', orderNumber: 'INB-001', status: 'confirmed', createdAt: new Date() },
      ];
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 1 }]))
        .mockReturnValueOnce(createChain(mockInbound));

      const result = await service.getInbound(tenantId, clientId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockInbound);
      expect(result.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 3 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getInbound(tenantId, clientId, { status: 'draft' });

      expect(result.total).toBe(3);
    });

    it('should return empty when no inbound orders', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getInbound(tenantId, clientId, {});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ===== getBilling =====
  describe('getBilling', () => {
    it('should return paginated billing records', async () => {
      const mockBilling = [
        { id: 'b1', period: '2026-03', orderCount: 50, totalAmount: 100000, status: 'unpaid', createdAt: new Date() },
      ];
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 1 }]))
        .mockReturnValueOnce(createChain(mockBilling));

      const result = await service.getBilling(tenantId, clientId, { page: 1, limit: 10 });

      expect(result.items).toEqual(mockBilling);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should return empty when no billing records', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getBilling(tenantId, clientId, {});

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should cap limit at 200', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([]));

      const result = await service.getBilling(tenantId, clientId, { limit: 999 });

      expect(result.limit).toBe(200);
    });
  });
});
