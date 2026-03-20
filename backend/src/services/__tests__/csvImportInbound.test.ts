/**
 * 入庫予定CSV導入テスト / 入库预定CSV导入测试
 *
 * LOGIFAST 0531版準拠の入庫予定CSVインポート機能をテスト。
 * 测试符合LOGIFAST 0531版的入库预定CSV导入功能。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── モック設定 / Mock 设置 ───

vi.mock('csv-parse/sync', () => ({
  parse: vi.fn((content: Buffer | string, _opts: any) => {
    const str = typeof content === 'string' ? content : content.toString('utf-8');
    if (!str.trim()) return [];
    const lines = str.trim().split('\n');
    if (lines.length <= 1) return [];
    const headers = lines[0].split(',');
    return lines.slice(1).map((line) => {
      const values = line.split(',');
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim(); });
      return row;
    });
  }),
}));

vi.mock('@/models/product', () => ({
  Product: {
    find: vi.fn().mockReturnValue({
      lean: () => Promise.resolve([]),
    }),
  },
}));

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    create: vi.fn().mockImplementation((doc: any) =>
      Promise.resolve({ _id: 'inbound-001', ...doc }),
    ),
  },
}));

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: { insertMany: vi.fn().mockResolvedValue([]) },
  calculateProductsMeta: vi.fn(() => ({ totalQuantity: 0, skuCount: 0, totalPrice: 0 })),
}));

vi.mock('@/utils/sequenceGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('IN-TEST-001'),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── テストデータ / 测试数据 ───

const TEST_PRODUCT = {
  _id: 'prod-abc',
  sku: 'SKU-001',
  name: 'テスト商品',
  customerProductCode: 'CPC-001',
  barcode: ['4901234567890'],
  _allSku: ['SKU-001'],
};

const TEST_PRODUCT_2 = {
  _id: 'prod-def',
  sku: 'SKU-002',
  name: 'テスト商品2',
  customerProductCode: 'CPC-002',
  barcode: ['4901234567891'],
  _allSku: ['SKU-002'],
};

// ─── テスト本体 / 测试主体 ───

describe('importInboundOrders / 入庫予定CSVインポート / 入库预定CSV导入', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('空CSV: totalRows=0, importedCount=0 を返す / 空CSV应返回totalRows=0, importedCount=0', async () => {
    const { importInboundOrders } = await import('../csvImportService');

    const result = await importInboundOrders(Buffer.from(''));

    expect(result.totalRows).toBe(0);
    expect(result.importedCount).toBe(0);
    expect(result.success).toBe(true);
  });

  it('有効な1行CSV: 1つの入庫予定を作成する / 有效单行CSV应创建1个入库预定', async () => {
    const { Product } = await import('@/models/product');
    vi.mocked(Product.find).mockReturnValue({
      lean: () => Promise.resolve([TEST_PRODUCT]),
    } as any);

    const { importInboundOrders } = await import('../csvImportService');

    const csv = [
      '入庫予定番号,商品コード,入庫予定数,入庫予定日,納品元名称',
      'INB-001,SKU-001,100,2026-04-01,株式会社テスト',
    ].join('\n');

    const result = await importInboundOrders(Buffer.from(csv));

    expect(result.totalRows).toBe(1);
    expect(result.importedCount).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(result.importedIds).toHaveLength(1);
  });

  it('同一入庫予定番号の複数行: 1つの入庫予定に2明細 / 相同入库预定番号的多行应合并为1个预定含2明细', async () => {
    const { Product } = await import('@/models/product');
    vi.mocked(Product.find).mockReturnValue({
      lean: () => Promise.resolve([TEST_PRODUCT, TEST_PRODUCT_2]),
    } as any);

    const { InboundOrder } = await import('@/models/inboundOrder');

    const { importInboundOrders } = await import('../csvImportService');

    const csv = [
      '入庫予定番号,商品コード,入庫予定数,入庫予定日',
      'INB-001,SKU-001,50,2026-04-01',
      'INB-001,SKU-002,30,2026-04-01',
    ].join('\n');

    const result = await importInboundOrders(Buffer.from(csv));

    expect(result.importedCount).toBe(1);
    expect(result.errors).toHaveLength(0);

    // InboundOrder.create が1回だけ呼ばれ、lines が2つあること / 应只调用1次create，lines有2条
    expect(InboundOrder.create).toHaveBeenCalledTimes(1);
    const createArg = vi.mocked(InboundOrder.create).mock.calls[0][0] as any;
    expect(createArg.lines).toHaveLength(2);
    expect(createArg.lines[0].productSku).toBe('SKU-001');
    expect(createArg.lines[1].productSku).toBe('SKU-002');
  });

  it('存在しないSKU: エラーを追加してスキップ / 不存在的SKU应添加错误并跳过', async () => {
    const { Product } = await import('@/models/product');
    vi.mocked(Product.find).mockReturnValue({
      lean: () => Promise.resolve([]), // 商品なし / 无商品
    } as any);

    const { importInboundOrders } = await import('../csvImportService');

    const csv = [
      '入庫予定番号,商品コード,入庫予定数',
      'INB-001,UNKNOWN-SKU,10',
    ].join('\n');

    const result = await importInboundOrders(Buffer.from(csv));

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('商品が見つかりません');
    expect(result.skippedCount).toBe(1);
    expect(result.importedCount).toBe(0);
  });

  it('英語ヘッダー: SKU, Expected Quantity, Expected Date でも動作する / 英文标题也应正常工作', async () => {
    const { Product } = await import('@/models/product');
    vi.mocked(Product.find).mockReturnValue({
      lean: () => Promise.resolve([TEST_PRODUCT]),
    } as any);

    const { importInboundOrders } = await import('../csvImportService');

    const csv = [
      'Order Number,SKU,Expected Quantity,Expected Date,Supplier Name',
      'INB-EN-001,SKU-001,200,2026-05-01,Test Corp',
    ].join('\n');

    const result = await importInboundOrders(Buffer.from(csv));

    expect(result.totalRows).toBe(1);
    expect(result.importedCount).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('LOGIFASTフィールド: ケース数/ケース単位/検品コードが明細に設定される / LOGIFAST字段应正确填充到明细', async () => {
    const { Product } = await import('@/models/product');
    vi.mocked(Product.find).mockReturnValue({
      lean: () => Promise.resolve([TEST_PRODUCT]),
    } as any);

    const { InboundOrder } = await import('@/models/inboundOrder');

    const { importInboundOrders } = await import('../csvImportService');

    const csv = [
      '入庫予定番号,商品コード,入庫予定数,入庫予定数（ケース数）,入庫ケース単位,検品コード',
      'INB-001,SKU-001,100,10,ダンボール,INSP-001',
    ].join('\n');

    const result = await importInboundOrders(Buffer.from(csv));

    expect(result.importedCount).toBe(1);

    const createArg = vi.mocked(InboundOrder.create).mock.calls[0][0] as any;
    const line = createArg.lines[0];
    expect(line.expectedCaseCount).toBe(10);
    expect(line.caseUnitType).toBe('ダンボール');
    expect(line.inspectionCode).toBe('INSP-001');
  });

  it('コンテナ種別マッピング: 1→20ft, 2→40ft, 3→40ftH / 容器类型映射: 1→20ft, 2→40ft, 3→40ftH', async () => {
    const { Product } = await import('@/models/product');
    vi.mocked(Product.find).mockReturnValue({
      lean: () => Promise.resolve([TEST_PRODUCT]),
    } as any);

    const { InboundOrder } = await import('@/models/inboundOrder');

    const { importInboundOrders } = await import('../csvImportService');

    // テスト: コンテナ種別 '1' → '20ft' / 测试: 容器类型 '1' → '20ft'
    const csv1 = [
      '入庫予定番号,商品コード,入庫予定数,入庫コンテナ',
      'INB-C1,SKU-001,10,1',
    ].join('\n');

    await importInboundOrders(Buffer.from(csv1));
    let arg = vi.mocked(InboundOrder.create).mock.calls[0][0] as any;
    expect(arg.containerType).toBe('20ft');

    vi.mocked(InboundOrder.create).mockClear();

    // テスト: コンテナ種別 '2' → '40ft' / 测试: 容器类型 '2' → '40ft'
    const csv2 = [
      '入庫予定番号,商品コード,入庫予定数,入庫コンテナ',
      'INB-C2,SKU-001,10,2',
    ].join('\n');

    await importInboundOrders(Buffer.from(csv2));
    arg = vi.mocked(InboundOrder.create).mock.calls[0][0] as any;
    expect(arg.containerType).toBe('40ft');

    vi.mocked(InboundOrder.create).mockClear();

    // テスト: コンテナ種別 '3' → '40ftH' / 测试: 容器类型 '3' → '40ftH'
    const csv3 = [
      '入庫予定番号,商品コード,入庫予定数,入庫コンテナ',
      'INB-C3,SKU-001,10,3',
    ].join('\n');

    await importInboundOrders(Buffer.from(csv3));
    arg = vi.mocked(InboundOrder.create).mock.calls[0][0] as any;
    expect(arg.containerType).toBe('40ftH');
  });

  it('入庫区分マッピング: 2→crossdock / 入库区分映射: 2→crossdock', async () => {
    const { Product } = await import('@/models/product');
    vi.mocked(Product.find).mockReturnValue({
      lean: () => Promise.resolve([TEST_PRODUCT]),
    } as any);

    const { InboundOrder } = await import('@/models/inboundOrder');

    const { importInboundOrders } = await import('../csvImportService');

    const csv = [
      '入庫予定番号,商品コード,入庫予定数,入庫区分',
      'INB-FLOW,SKU-001,50,2',
    ].join('\n');

    const result = await importInboundOrders(Buffer.from(csv));

    expect(result.importedCount).toBe(1);
    const createArg = vi.mocked(InboundOrder.create).mock.calls[0][0] as any;
    expect(createArg.flowType).toBe('crossdock');
  });
});
