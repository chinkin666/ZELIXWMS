// KPIサービスのテスト / KPI服务测试
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.module';
import { KpiService } from './kpi.service';

// ヘルパー: チェーン可能なクエリモック生成 / 辅助: 生成可链式调用的查询mock
function createChain(resolveValue: any = []) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
  };
  chain.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve);
  return chain;
}

describe('KpiService', () => {
  let service: KpiService;
  let mockDb: any;

  const tenantId = 'tenant-001';

  beforeEach(async () => {
    mockDb = {
      select: jest.fn(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [KpiService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    service = module.get<KpiService>(KpiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===== getDashboard =====
  describe('getDashboard', () => {
    it('should return dashboard with all count fields', async () => {
      // 4 sequential db calls: shipment count, inbound count, shipped count, return count
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 50 }]))
        .mockReturnValueOnce(createChain([{ value: 20 }]))
        .mockReturnValueOnce(createChain([{ value: 30 }]))
        .mockReturnValueOnce(createChain([{ value: 5 }]));

      const result = await service.getDashboard(tenantId);

      expect(result).toEqual({
        orderCount: 30,
        shipmentCount: 50,
        inboundCount: 20,
        returnCount: 5,
      });
    });

    it('should return all numeric fields', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]));

      const result = await service.getDashboard(tenantId);

      expect(typeof result.orderCount).toBe('number');
      expect(typeof result.shipmentCount).toBe('number');
      expect(typeof result.inboundCount).toBe('number');
      expect(typeof result.returnCount).toBe('number');
    });

    it('should default to 0 when db returns null counts', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: null }]))
        .mockReturnValueOnce(createChain([{ value: null }]))
        .mockReturnValueOnce(createChain([{ value: null }]))
        .mockReturnValueOnce(createChain([{ value: null }]));

      const result = await service.getDashboard(tenantId);

      expect(result.orderCount).toBe(0);
      expect(result.shipmentCount).toBe(0);
      expect(result.inboundCount).toBe(0);
      expect(result.returnCount).toBe(0);
    });
  });

  // ===== getOrderStats =====
  describe('getOrderStats', () => {
    it('should return order stats with date range', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 100 }]))
        .mockReturnValueOnce(createChain([{ value: 60 }]))
        .mockReturnValueOnce(createChain([{ value: 10 }]))
        .mockReturnValueOnce(createChain([{ value: 5 }]));

      const result = await service.getOrderStats(tenantId, '2026-01-01', '2026-03-22');

      expect(result.totalOrders).toBe(100);
      expect(result.completedOrders).toBe(60);
      expect(result.pendingOrders).toBe(10);
      expect(result.cancelledOrders).toBe(5);
      expect(result.dateFrom).toBe('2026-01-01');
      expect(result.dateTo).toBe('2026-03-22');
    });

    it('should return null dates when not provided', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]));

      const result = await service.getOrderStats(tenantId);

      expect(result.dateFrom).toBeNull();
      expect(result.dateTo).toBeNull();
    });

    it('should default to 0 for all counts when no data', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: null }]))
        .mockReturnValueOnce(createChain([{ value: null }]))
        .mockReturnValueOnce(createChain([{ value: null }]))
        .mockReturnValueOnce(createChain([{ value: null }]));

      const result = await service.getOrderStats(tenantId);

      expect(result.totalOrders).toBe(0);
      expect(result.completedOrders).toBe(0);
      expect(result.pendingOrders).toBe(0);
      expect(result.cancelledOrders).toBe(0);
    });
  });

  // ===== getOverviewMetrics =====
  describe('getOverviewMetrics', () => {
    it('should return overview metrics via parallel queries', async () => {
      // Promise.all with 4 queries
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 100 }]))
        .mockReturnValueOnce(createChain([{ value: 50 }]))
        .mockReturnValueOnce(createChain([{ value: 200 }]))
        .mockReturnValueOnce(createChain([{ value: 5000 }]));

      const result = await service.getOverviewMetrics(tenantId);

      expect(result.totalShipments).toBe(100);
      expect(result.totalInbounds).toBe(50);
      expect(result.totalProducts).toBe(200);
      expect(result.totalStockQuantity).toBe(5000);
    });

    it('should default stock quantity to 0 when null', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: null }]));

      const result = await service.getOverviewMetrics(tenantId);

      expect(result.totalStockQuantity).toBe(0);
    });
  });

  // ===== getShipmentMetrics =====
  describe('getShipmentMetrics', () => {
    it('should return shipment metrics by status', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 100 }]))
        .mockReturnValueOnce(createChain([{ value: 60 }]))
        .mockReturnValueOnce(createChain([{ value: 40 }]))
        .mockReturnValueOnce(createChain([{ value: 5 }]));

      const result = await service.getShipmentMetrics(tenantId);

      expect(result.total).toBe(100);
      expect(result.confirmed).toBe(60);
      expect(result.shipped).toBe(40);
      expect(result.held).toBe(5);
      expect(result.pending).toBe(35); // 100 - 60 - 5
    });

    it('should accept date range filters', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 10 }]))
        .mockReturnValueOnce(createChain([{ value: 8 }]))
        .mockReturnValueOnce(createChain([{ value: 5 }]))
        .mockReturnValueOnce(createChain([{ value: 1 }]));

      const result = await service.getShipmentMetrics(tenantId, '2026-03-01', '2026-03-22');

      expect(result.total).toBe(10);
    });

    it('should calculate pending correctly when all held', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 10 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 10 }]));

      const result = await service.getShipmentMetrics(tenantId);

      expect(result.pending).toBe(0); // 10 - 0 - 10
    });
  });

  // ===== getInventoryMetrics =====
  describe('getInventoryMetrics', () => {
    it('should return inventory metrics with available calculation', async () => {
      mockDb.select.mockReturnValueOnce(createChain([{ totalQuantity: 1000, reservedQuantity: 200 }]));

      const result = await service.getInventoryMetrics(tenantId);

      expect(result.totalQuantity).toBe(1000);
      expect(result.reservedQuantity).toBe(200);
      expect(result.availableQuantity).toBe(800);
    });

    it('should default to 0 when no stock data', async () => {
      mockDb.select.mockReturnValueOnce(createChain([{ totalQuantity: null, reservedQuantity: null }]));

      const result = await service.getInventoryMetrics(tenantId);

      expect(result.totalQuantity).toBe(0);
      expect(result.reservedQuantity).toBe(0);
      expect(result.availableQuantity).toBe(0);
    });
  });

  // ===== getPerformanceMetrics =====
  describe('getPerformanceMetrics', () => {
    it('should calculate fulfillment rate correctly', async () => {
      // total, shipped, avg processing
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 100 }]))
        .mockReturnValueOnce(createChain([{ value: 80 }]))
        .mockReturnValueOnce(createChain([{ avgHours: 4.567 }]));

      const result = await service.getPerformanceMetrics(tenantId);

      expect(result.fulfillmentRate).toBe(80);
      expect(result.averageProcessingHours).toBe(4.57);
    });

    it('should return 0 fulfillment rate when no orders', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ avgHours: null }]));

      const result = await service.getPerformanceMetrics(tenantId);

      expect(result.fulfillmentRate).toBe(0);
      expect(result.averageProcessingHours).toBeNull();
    });

    it('should handle null average processing hours', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 10 }]))
        .mockReturnValueOnce(createChain([{ value: 5 }]))
        .mockReturnValueOnce(createChain([{ avgHours: null }]));

      const result = await service.getPerformanceMetrics(tenantId);

      expect(result.averageProcessingHours).toBeNull();
    });
  });

  // ===== getAlerts =====
  describe('getAlerts', () => {
    it('should return low stock alerts', async () => {
      const alertRows = [
        { productId: 'p1', productSku: 'SKU-001', productName: 'Product 1', quantity: 3, locationId: 'loc-001' },
        { productId: 'p2', productSku: 'SKU-002', productName: 'Product 2', quantity: 5, locationId: 'loc-002' },
      ];
      mockDb.select.mockReturnValueOnce(createChain(alertRows));

      const result = await service.getAlerts(tenantId);

      expect(result).toHaveLength(2);
      expect(result[0].quantity).toBe(3);
      expect(result[0].productSku).toBe('SKU-001');
    });

    it('should return empty array when no low stock', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getAlerts(tenantId);

      expect(result).toEqual([]);
    });

    it('should accept custom threshold', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getAlerts(tenantId, 5);

      expect(result).toEqual([]);
    });

    it('should use default threshold of 10', async () => {
      mockDb.select.mockReturnValueOnce(createChain([]));

      const result = await service.getAlerts(tenantId);

      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  // ===== getAccuracyRate =====
  describe('getAccuracyRate', () => {
    it('should calculate accuracy rate correctly', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 100 }]))
        .mockReturnValueOnce(createChain([{ value: 95 }]));

      const result = await service.getAccuracyRate(tenantId);

      expect(result.rate).toBe(95);
    });

    it('should return 0 when no confirmed orders', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 0 }]))
        .mockReturnValueOnce(createChain([{ value: 0 }]));

      const result = await service.getAccuracyRate(tenantId);

      expect(result.rate).toBe(0);
    });
  });

  // ===== getFulfillmentRate =====
  describe('getFulfillmentRate', () => {
    it('should return fulfillment rate using getPerformanceMetrics', async () => {
      mockDb.select
        .mockReturnValueOnce(createChain([{ value: 100 }]))
        .mockReturnValueOnce(createChain([{ value: 75 }]))
        .mockReturnValueOnce(createChain([{ avgHours: null }]));

      const result = await service.getFulfillmentRate(tenantId);

      expect(result.rate).toBe(75);
    });
  });

  // ===== getThroughput =====
  describe('getThroughput', () => {
    it('should calculate daily throughput rate', async () => {
      mockDb.select.mockReturnValueOnce(createChain([{ value: 300 }]));

      const result = await service.getThroughput(tenantId);

      expect(result.rate).toBe(10); // 300 / 30
    });

    it('should return 0 when no shipments in 30 days', async () => {
      mockDb.select.mockReturnValueOnce(createChain([{ value: 0 }]));

      const result = await service.getThroughput(tenantId);

      expect(result.rate).toBe(0);
    });

    it('should handle fractional throughput', async () => {
      mockDb.select.mockReturnValueOnce(createChain([{ value: 1 }]));

      const result = await service.getThroughput(tenantId);

      expect(result.rate).toBe(0.03); // 1/30 rounded to 2 decimal places
    });
  });
});
