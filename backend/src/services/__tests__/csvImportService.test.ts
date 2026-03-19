/**
 * CSV 导入服务测试 / CSV インポートサービステスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    insertMany: vi.fn((docs: any[]) => Promise.resolve(docs.map((_: any, i: number) => ({ _id: `order${i + 1}` })))),
  },
  calculateProductsMeta: vi.fn(() => ({ totalQuantity: 1, skuCount: 1, totalPrice: 0 })),
}));

vi.mock('@/models/product', () => ({
  Product: {
    find: vi.fn().mockReturnValue({ lean: () => Promise.resolve([]) }),
    insertMany: vi.fn().mockResolvedValue([{ _id: 'prod1' }]),
  },
}));

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: { insertMany: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/utils/sequenceGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('SH-20260316-0001'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('csvImportService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('importShipmentOrders / 出荷指示CSV导入', () => {
    it('should parse and import valid CSV / 有効な CSV をインポートすること', async () => {
      const { importShipmentOrders } = await import('../csvImportService');

      const csv = [
        'お客様管理番号,送り先名称,送り先郵便番号,商品SKU,商品名,数量,単価',
        'CMN-001,田中太郎,530-0001,SKU-001,テスト商品,2,1000',
      ].join('\n');

      const result = await importShipmentOrders(csv);

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(1);
      expect(result.importedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should support dry run / ドライランをサポートすること', async () => {
      const { importShipmentOrders } = await import('../csvImportService');

      const csv = 'お客様管理番号,送り先名称,商品SKU,数量\nCMN-001,テスト,SKU-001,1';
      const result = await importShipmentOrders(csv, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
      expect(result.importedIds).toHaveLength(0); // dry run = no actual insert
    });

    it('should report validation errors per row / 行ごとにバリデーションエラーを報告すること', async () => {
      const { importShipmentOrders } = await import('../csvImportService');

      const csv = [
        'お客様管理番号,送り先名称,商品SKU,数量',
        'CMN-001,,SKU-001,1', // missing name
        'CMN-002,OK,SKU-002,0', // invalid qty
      ].join('\n');

      const result = await importShipmentOrders(csv);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.skippedCount).toBeGreaterThan(0);
    });

    it('should handle empty CSV / 空 CSV を処理すること', async () => {
      const { importShipmentOrders } = await import('../csvImportService');
      const result = await importShipmentOrders('');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid CSV format / 無効な CSV フォーマットを処理すること', async () => {
      const { importShipmentOrders } = await import('../csvImportService');
      const result = await importShipmentOrders('not,valid\n"unclosed quote');
      expect(result.totalRows).toBeDefined();
    });

    it('should support English headers / 英語ヘッダーをサポートすること', async () => {
      const { importShipmentOrders } = await import('../csvImportService');

      const csv = 'customer_number,recipient_name,product_sku,qty\nCMN-EN,Test User,SKU-EN,3';
      const result = await importShipmentOrders(csv);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
    });

    it('should group multi-line orders / 複数行注文をグループ化すること', async () => {
      const { importShipmentOrders } = await import('../csvImportService');

      const csv = [
        'お客様管理番号,送り先名称,商品SKU,数量',
        'CMN-001,田中太郎,SKU-001,2',
        'CMN-001,田中太郎,SKU-002,3', // same order, different product
      ].join('\n');

      const result = await importShipmentOrders(csv);
      expect(result.importedCount).toBe(1); // 1 order with 2 products
    });
  });

  describe('importProducts / 商品CSV导入', () => {
    it('should parse and import valid products / 有効な商品をインポートすること', async () => {
      const { importProducts } = await import('../csvImportService');

      const csv = 'SKU,商品名,価格,安全在庫\nSKU-NEW,新商品,1500,10';
      const result = await importProducts(csv);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(1);
    });

    it('should reject duplicate SKUs / 重複 SKU を拒否すること', async () => {
      const { Product } = await import('@/models/product');
      vi.mocked(Product.find).mockReturnValue({
        lean: () => Promise.resolve([{ sku: 'SKU-EXIST' }]),
      } as any);

      const { importProducts } = await import('../csvImportService');
      const csv = 'SKU,商品名\nSKU-EXIST,既存商品';
      const result = await importProducts(csv);

      expect(result.skippedCount).toBe(1);
      expect(result.errors[0].message).toContain('既に存在');
    });

    it('should reject missing SKU / SKU なしを拒否すること', async () => {
      const { importProducts } = await import('../csvImportService');
      const csv = 'SKU,商品名\n,名前だけ';
      const result = await importProducts(csv);
      expect(result.skippedCount).toBe(1);
    });
  });
});
