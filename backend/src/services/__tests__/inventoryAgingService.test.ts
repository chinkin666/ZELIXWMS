/**
 * inventoryAgingService 单元测试 / inventoryAgingService ユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

const oid = () => new mongoose.Types.ObjectId();

vi.mock('@/models/stockQuant', () => ({
  StockQuant: { find: vi.fn() },
}));

vi.mock('@/models/product', () => ({
  Product: { find: vi.fn() },
}));

vi.mock('@/models/location', () => ({
  Location: { find: vi.fn() },
}));

vi.mock('@/services/chargeService', () => ({
  createAutoCharge: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { StockQuant } from '@/models/stockQuant';
import { Product } from '@/models/product';
import { Location } from '@/models/location';
import { createAutoCharge } from '@/services/chargeService';

const chainSelect = (val: any) => ({
  select: () => ({ lean: () => Promise.resolve(val) }),
  lean: () => Promise.resolve(val),
});
const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

describe('inventoryAgingService / 在庫エイジングサービス', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAgingReport / エイジングレポート', () => {
    it('在庫なし→空レポート / 无库存返回空报告', async () => {
      vi.mocked(StockQuant.find).mockReturnValue(chainLean([]) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);

      const { getAgingReport } = await import('../inventoryAgingService');
      const result = await getAgingReport();

      expect(result.items).toHaveLength(0);
      expect(result.summary.total.count).toBe(0);
    });

    it('エイジングレベルを正しく分類すること / 正确分类老化级别', async () => {
      const now = new Date();
      const productId = oid();
      const locationId = oid();

      const quants = [
        // 10日前（正常）
        { productId, locationId, quantity: 50, productSku: 'SKU-A', lastMovedAt: new Date(now.getTime() - 10 * 86400000) },
        // 45日前（注意）
        { productId, locationId, quantity: 30, productSku: 'SKU-B', lastMovedAt: new Date(now.getTime() - 45 * 86400000) },
        // 75日前（警告）
        { productId, locationId, quantity: 20, productSku: 'SKU-C', lastMovedAt: new Date(now.getTime() - 75 * 86400000) },
        // 120日前（超過）
        { productId, locationId, quantity: 10, productSku: 'SKU-D', lastMovedAt: new Date(now.getTime() - 120 * 86400000) },
      ];

      vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([
        { _id: productId, sku: 'SKU-TEST', name: 'テスト商品' },
      ]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([
        { _id: locationId, name: 'A-01-01' },
      ]) as any);

      const { getAgingReport } = await import('../inventoryAgingService');
      const result = await getAgingReport();

      expect(result.items).toHaveLength(4);
      // 降順ソート（最古が先）
      expect(result.items[0].agingLevel).toBe('overdue');
      expect(result.items[1].agingLevel).toBe('warning');
      expect(result.items[2].agingLevel).toBe('caution');
      expect(result.items[3].agingLevel).toBe('normal');

      expect(result.summary.normal.count).toBe(50);
      expect(result.summary.caution.count).toBe(30);
      expect(result.summary.warning.count).toBe(20);
      expect(result.summary.overdue.count).toBe(10);
      expect(result.summary.total.count).toBe(110);
    });

    it('minDaysフィルターで古い在庫のみ返すこと / minDays过滤仅返回旧库存', async () => {
      const now = new Date();
      const quants = [
        { productId: oid(), locationId: oid(), quantity: 50, productSku: 'NEW', lastMovedAt: new Date(now.getTime() - 5 * 86400000) },
        { productId: oid(), locationId: oid(), quantity: 10, productSku: 'OLD', lastMovedAt: new Date(now.getTime() - 100 * 86400000) },
      ];

      vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);

      const { getAgingReport } = await import('../inventoryAgingService');
      const result = await getAgingReport({ minDays: 91 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].sku).toBe('OLD');
    });
  });

  describe('chargeOverdueStorage / 超期保管料', () => {
    it('超期在庫に対して課金すること / 对超期库存收费', async () => {
      const now = new Date();
      const quants = [
        { productId: oid(), locationId: oid(), quantity: 100, productSku: 'OVERDUE', clientId: 'C1', lastMovedAt: new Date(now.getTime() - 120 * 86400000) },
      ];

      vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);

      const { chargeOverdueStorage } = await import('../inventoryAgingService');
      const result = await chargeOverdueStorage('T1');

      expect(createAutoCharge).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'T1',
          clientId: 'C1',
          chargeType: 'overdue_storage',
        }),
      );
      expect(result.chargedItems).toBeGreaterThanOrEqual(1);
    });

    it('超期在庫なし→課金なし / 无超期库存不收费', async () => {
      const now = new Date();
      const quants = [
        { productId: oid(), locationId: oid(), quantity: 50, productSku: 'NEW', lastMovedAt: new Date(now.getTime() - 10 * 86400000) },
      ];

      vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
      vi.mocked(Product.find).mockReturnValue(chainSelect([]) as any);
      vi.mocked(Location.find).mockReturnValue(chainSelect([]) as any);

      const { chargeOverdueStorage } = await import('../inventoryAgingService');
      const result = await chargeOverdueStorage('T1');

      expect(createAutoCharge).not.toHaveBeenCalled();
      expect(result.chargedItems).toBe(0);
    });
  });
});
