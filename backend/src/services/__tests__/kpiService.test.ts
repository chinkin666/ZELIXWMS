/**
 * kpiService 单元测试 / kpiService ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: { countDocuments: vi.fn().mockResolvedValue(0) },
}));

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: { countDocuments: vi.fn().mockResolvedValue(0) },
}));

vi.mock('@/models/returnOrder', () => ({
  ReturnOrder: {
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/models/warehouseTask', () => ({
  WarehouseTask: {
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/models/workCharge', () => ({
  WorkCharge: { aggregate: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/models/stockQuant', () => ({
  StockQuant: { aggregate: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/models/stockMove', () => ({
  StockMove: {},
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { ShipmentOrder } from '@/models/shipmentOrder';
import { InboundOrder } from '@/models/inboundOrder';
import { ReturnOrder } from '@/models/returnOrder';
import { WarehouseTask } from '@/models/warehouseTask';
import { WorkCharge } from '@/models/workCharge';
import { StockQuant } from '@/models/stockQuant';

describe('kpiService / KPIサービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getKPIDashboard / KPIダッシュボード', () => {
    it('全指標を含むダッシュボードを返すこと / 返回包含所有指标的仪表盘', async () => {
      // 出荷統計
      vi.mocked(ShipmentOrder.countDocuments)
        .mockResolvedValueOnce(100 as any) // total
        .mockResolvedValueOnce(85 as any)  // shipped
        .mockResolvedValueOnce(5 as any);  // cancelled

      // 入庫統計
      vi.mocked(InboundOrder.countDocuments)
        .mockResolvedValueOnce(50 as any)  // total
        .mockResolvedValueOnce(45 as any); // completed

      // 返品統計
      vi.mocked(ReturnOrder.countDocuments)
        .mockResolvedValueOnce(10 as any) // total
        .mockResolvedValueOnce(8 as any); // completed
      vi.mocked(ReturnOrder.aggregate).mockResolvedValue([
        { restockedQuantity: 30, disposedQuantity: 5 },
      ]);

      // タスク統計
      vi.mocked(WarehouseTask.countDocuments)
        .mockResolvedValueOnce(500 as any)  // total
        .mockResolvedValueOnce(480 as any); // completed
      vi.mocked(WarehouseTask.aggregate)
        .mockResolvedValueOnce([
          { _id: 'picking', count: 200 },
          { _id: 'packing', count: 150 },
          { _id: 'receiving', count: 100 },
          { _id: 'sorting', count: 50 },
        ])
        .mockResolvedValueOnce([
          { avgDuration: 300000 }, // 5分
        ]);

      // 在庫統計
      vi.mocked(StockQuant.aggregate).mockResolvedValue([
        { totalQuantity: 50000, skus: ['A', 'B', 'C'], locations: ['L1', 'L2'] },
      ]);

      // 売上統計
      vi.mocked(WorkCharge.aggregate).mockResolvedValue([
        { _id: 'picking', count: 200, amount: 20000 },
        { _id: 'storage', count: 30, amount: 150000 },
      ]);

      const { getKPIDashboard } = await import('../kpiService');
      const period = {
        from: new Date('2026-03-01'),
        to: new Date('2026-03-31'),
      };

      const dashboard = await getKPIDashboard(period, 'T1');

      // 出荷
      expect(dashboard.shipment.totalOrders).toBe(100);
      expect(dashboard.shipment.shippedOrders).toBe(85);
      expect(dashboard.shipment.onTimeRate).toBeCloseTo(85 / 95); // shipped / (total - cancelled)

      // 入庫
      expect(dashboard.inbound.totalOrders).toBe(50);
      expect(dashboard.inbound.completedOrders).toBe(45);

      // 返品
      expect(dashboard.returns.totalOrders).toBe(10);
      expect(dashboard.returns.restockedQuantity).toBe(30);
      expect(dashboard.returns.disposedQuantity).toBe(5);

      // タスク
      expect(dashboard.tasks.totalTasks).toBe(500);
      expect(dashboard.tasks.completedTasks).toBe(480);
      expect(dashboard.tasks.avgDurationMinutes).toBe(5);
      expect(dashboard.tasks.tasksByType['picking']).toBe(200);

      // 在庫
      expect(dashboard.inventory.totalSKUs).toBe(3);
      expect(dashboard.inventory.totalQuantity).toBe(50000);

      // 売上
      expect(dashboard.revenue.totalAmount).toBe(170000);
      expect(dashboard.revenue.byChargeType['storage']).toBe(150000);
    });

    it('データなし→0値のダッシュボードを返すこと / 无数据返回0值仪表盘', async () => {
      // 全モック0/空を返す
      vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0 as any);
      vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0 as any);
      vi.mocked(ReturnOrder.countDocuments).mockResolvedValue(0 as any);
      vi.mocked(ReturnOrder.aggregate).mockResolvedValue([]);
      vi.mocked(WarehouseTask.countDocuments).mockResolvedValue(0 as any);
      vi.mocked(WarehouseTask.aggregate).mockResolvedValue([]);
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);
      vi.mocked(WorkCharge.aggregate).mockResolvedValue([]);

      const { getKPIDashboard } = await import('../kpiService');
      const dashboard = await getKPIDashboard({
        from: new Date('2026-01-01'),
        to: new Date('2026-01-31'),
      });

      expect(dashboard.shipment.totalOrders).toBe(0);
      expect(dashboard.inbound.totalOrders).toBe(0);
      expect(dashboard.returns.totalOrders).toBe(0);
      expect(dashboard.tasks.totalTasks).toBe(0);
      expect(dashboard.inventory.totalSKUs).toBe(0);
      expect(dashboard.revenue.totalAmount).toBe(0);
    });
  });
});
