/**
 * inventoryService 单元测试 / inventoryService ユニットテスト
 *
 * 覆盖所有导出函数，目标覆盖率 70%+
 * 全エクスポート関数をカバー、目標カバレッジ 70%+
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ─── チェーンモックヘルパー / 链式 Mock 辅助 ─────────────────────────────────

/** lean() を返すチェーンヘルパー / lean() を返すチェーンヘルパー */
const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });

/** sort() → lean() チェーンヘルパー / sort → lean chain helper */
const chainSortLean = (val: any) => ({ sort: () => chainLean(val) });

/** select() → lean() チェーンヘルパー / select → lean chain helper */
const chainSelectLean = (val: any) => ({ select: () => chainLean(val) });

/** テスト用 ObjectId 生成 / Generate ObjectId for tests */
const oid = () => new mongoose.Types.ObjectId();

// ─── モックセットアップ / Mock Setup ─────────────────────────────────────────
// 注意: vi.mock は巻き上げられるため import より前に記述
// 注意: vi.mock はホイストされるため import より前に書く必要はないが、慣習的に先頭に置く

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    find: vi.fn(() => chainLean([])),
    findOne: vi.fn(() => chainLean(null)),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    aggregate: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    bulkWrite: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/models/stockMove', () => ({
  StockMove: {
    find: vi.fn(() => chainLean([])),
    findOne: vi.fn(() => chainLean(null)),
    create: vi.fn().mockResolvedValue([{ _id: oid() }]),
    aggregate: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
  },
}));

vi.mock('@/models/location', () => ({
  Location: {
    findById: vi.fn(() => chainLean({ _id: oid(), code: 'A-01-01', name: '棚A-01-01' })),
    findOne: vi.fn(() => chainLean({ _id: oid(), code: 'VIRTUAL/SUPPLIER', name: '仮想仕入先' })),
    find: vi.fn(() => chainLean([])),
  },
}));

vi.mock('@/models/product', () => ({
  Product: {
    findById: vi.fn(() =>
      chainLean({
        _id: oid(),
        sku: 'SKU-001',
        name: 'テスト商品',
        inventoryEnabled: true,
        safetyStock: 10,
      }),
    ),
    findOne: vi.fn(() =>
      chainLean({
        _id: oid(),
        sku: 'SKU-001',
        name: 'テスト商品',
        inventoryEnabled: true,
        safetyStock: 10,
      }),
    ),
    find: vi.fn(() => chainLean([])),
  },
}));

vi.mock('@/models/lot', () => ({
  Lot: {
    findById: vi.fn(() => chainLean(null)),
    findOne: vi.fn(() => chainLean(null)),
    find: vi.fn(() => chainSelectLean([])),
  },
}));

// inventoryService は @/utils/sequenceGenerator を使用
// inventoryService は @/utils/sequenceGenerator を使用する
vi.mock('@/utils/sequenceGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('MV-20260319-0001'),
}));

vi.mock('@/config/database', () => ({
  checkTransactionSupport: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  logOperation: vi.fn(),
}));

vi.mock('@/services/operationLogger', () => ({
  logOperation: vi.fn().mockResolvedValue(undefined),
}));

// ─── テストスイート / Test Suite ──────────────────────────────────────────────

describe('inventoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── listStock / 在庫一覧 ─────────────────────────────────────────────────

  describe('listStock / 在庫一覧取得', () => {
    it('フィルタなしで aggregate を呼ぶこと / calls aggregate without filters', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { listStock } = await import('../inventoryService');
      const result = await listStock({});

      expect(StockQuant.aggregate).toHaveBeenCalledOnce();
      expect(result).toEqual([]);
    });

    it('productId フィルタで ObjectId を生成すること / builds ObjectId for productId', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      const mockData = [{ productId: oid(), quantity: 5 }];
      vi.mocked(StockQuant.aggregate).mockResolvedValue(mockData);

      const { listStock } = await import('../inventoryService');
      const productId = String(oid());
      const result = await listStock({ productId });

      expect(StockQuant.aggregate).toHaveBeenCalledOnce();
      // aggregate に渡されるパイプラインの最初の $match に productId が含まれる
      // aggregate に渡されるパイプラインの最初の $match に productId が含まれること
      const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0][0] as any[];
      expect(pipeline[0].$match.productId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(result).toEqual(mockData);
    });

    it('productSku フィルタで正規表現を使うこと / uses regex for productSku', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { listStock } = await import('../inventoryService');
      await listStock({ productSku: 'SKU-' });

      const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0][0] as any[];
      expect(pipeline[0].$match.productSku).toMatchObject({ $regex: 'SKU-', $options: 'i' });
    });

    it('locationId フィルタで ObjectId を生成すること / builds ObjectId for locationId', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { listStock } = await import('../inventoryService');
      const locationId = String(oid());
      await listStock({ locationId });

      const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0][0] as any[];
      expect(pipeline[0].$match.locationId).toBeInstanceOf(mongoose.Types.ObjectId);
    });

    it('locationIds フィルタで $in を使うこと / uses $in for locationIds', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { listStock } = await import('../inventoryService');
      const locationIds = [String(oid()), String(oid())];
      await listStock({ locationIds });

      const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0][0] as any[];
      expect(pipeline[0].$match.locationId).toMatchObject({ $in: expect.any(Array) });
      expect(pipeline[0].$match.locationId.$in).toHaveLength(2);
    });

    it('showZero=true のとき数量フィルタを含めないこと / skips quantity filter when showZero=true', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { listStock } = await import('../inventoryService');
      await listStock({ showZero: true });

      const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0][0] as any[];
      expect(pipeline[0].$match.quantity).toBeUndefined();
    });

    it('showZero=false(デフォルト) のとき $gt:0 フィルタを含むこと / includes $gt:0 filter by default', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { listStock } = await import('../inventoryService');
      await listStock({ showZero: false });

      const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0][0] as any[];
      expect(pipeline[0].$match.quantity).toMatchObject({ $gt: 0 });
    });

    it('locationIds が空配列のとき locationId フィルタを設定しないこと / does not set locationId filter for empty locationIds', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { listStock } = await import('../inventoryService');
      await listStock({ locationIds: [] });

      const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0][0] as any[];
      expect(pipeline[0].$match.locationId).toBeUndefined();
    });
  });

  // ─── getInventorySummary / 在庫集計 ──────────────────────────────────────

  describe('getInventorySummary / 在庫集計', () => {
    it('フィルタなしで aggregate を呼ぶこと / calls aggregate without search filter', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getInventorySummary } = await import('../inventoryService');
      const result = await getInventorySummary({});

      expect(StockQuant.aggregate).toHaveBeenCalledOnce();
      expect(result).toEqual([]);
    });

    it('search フィルタで productSku 正規表現を使うこと / uses regex for search filter', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getInventorySummary } = await import('../inventoryService');
      await getInventorySummary({ search: 'ABC' });

      const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0][0] as any[];
      expect(pipeline[0].$match.productSku).toMatchObject({ $regex: 'ABC', $options: 'i' });
    });

    it('集計結果を返すこと / returns aggregated results', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      const mockSummary = [
        {
          productId: oid(),
          productSku: 'SKU-001',
          totalQuantity: 100,
          totalReserved: 10,
          totalAvailable: 90,
          locationCount: 3,
          isBelowSafety: false,
        },
      ];
      vi.mocked(StockQuant.aggregate).mockResolvedValue(mockSummary);

      const { getInventorySummary } = await import('../inventoryService');
      const result = await getInventorySummary({});

      expect(result).toEqual(mockSummary);
    });
  });

  // ─── getProductStock / 商品別在庫 ─────────────────────────────────────────

  describe('getProductStock / 商品別在庫詳細', () => {
    it('productId で aggregate を呼ぶこと / calls aggregate with productId', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { getProductStock } = await import('../inventoryService');
      const productId = String(oid());
      const result = await getProductStock(productId);

      expect(StockQuant.aggregate).toHaveBeenCalledOnce();
      const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0][0] as any[];
      expect(pipeline[0].$match.productId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(pipeline[0].$match.quantity).toMatchObject({ $gt: 0 });
      expect(result).toEqual([]);
    });

    it('在庫データを返すこと / returns stock data per location', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      const mockStock = [
        { locationId: oid(), quantity: 50, reservedQuantity: 5, availableQuantity: 45 },
      ];
      vi.mocked(StockQuant.aggregate).mockResolvedValue(mockStock);

      const { getProductStock } = await import('../inventoryService');
      const result = await getProductStock(String(oid()));

      expect(result).toEqual(mockStock);
    });
  });

  // ─── adjustStock / 在庫調整（棚卸し） ────────────────────────────────────

  describe('adjustStock / 在庫調整（棚卸し）', () => {
    it('adjustQuantity=0 を拒否すること / rejects zero adjustQuantity', async () => {
      const { adjustStock } = await import('../inventoryService');
      await expect(
        adjustStock({
          productId: String(oid()),
          locationId: String(oid()),
          adjustQuantity: 0,
          memo: '棚卸しテスト',
        }),
      ).rejects.toThrow();
    });

    it('productId が空の場合を拒否すること / rejects empty productId', async () => {
      const { adjustStock } = await import('../inventoryService');
      await expect(
        adjustStock({
          productId: '',
          locationId: String(oid()),
          adjustQuantity: 10,
        }),
      ).rejects.toThrow();
    });

    it('locationId が空の場合を拒否すること / rejects empty locationId', async () => {
      const { adjustStock } = await import('../inventoryService');
      await expect(
        adjustStock({
          productId: String(oid()),
          locationId: '',
          adjustQuantity: 10,
        }),
      ).rejects.toThrow();
    });

    it('商品が見つからない場合にエラーを投げること / throws when product not found', async () => {
      const { Product } = await import('@/models/product');
      vi.mocked(Product.findById).mockReturnValue(chainLean(null) as any);

      const { adjustStock } = await import('../inventoryService');
      await expect(
        adjustStock({
          productId: String(oid()),
          locationId: String(oid()),
          adjustQuantity: 5,
        }),
      ).rejects.toThrow('商品が見つかりません');
    });

    it('ロケーションが見つからない場合にエラーを投げること / throws when location not found', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: oid(), sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById).mockReturnValue(chainLean(null) as any);

      const { adjustStock } = await import('../inventoryService');
      await expect(
        adjustStock({
          productId: String(oid()),
          locationId: String(oid()),
          adjustQuantity: 5,
        }),
      ).rejects.toThrow('ロケーションが見つかりません');
    });

    it('仮想ロケーションが見つからない場合にエラーを投げること / throws when virtual location missing', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');

      const productId = oid();
      const locationId = oid();

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById).mockReturnValue(
        chainLean({ _id: locationId, code: 'A-01-01' }) as any,
      );
      // 仮想ロケーションを null にする / Set virtual locations to null
      vi.mocked(Location.findOne).mockReturnValue(chainLean(null) as any);

      const { adjustStock } = await import('../inventoryService');
      await expect(
        adjustStock({
          productId: String(productId),
          locationId: String(locationId),
          adjustQuantity: 5,
        }),
      ).rejects.toThrow();
    });

    it('在庫増加（+qty）が正常に完了すること / successfully increases stock (+qty)', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');
      const { StockQuant } = await import('@/models/stockQuant');
      const { StockMove } = await import('@/models/stockMove');

      const productId = oid();
      const locationId = oid();
      const supplierId = oid();
      const customerId = oid();

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById).mockReturnValue(
        chainLean({ _id: locationId, code: 'A-01-01' }) as any,
      );
      // findOne は 2 回呼ばれる (VIRTUAL/SUPPLIER と VIRTUAL/CUSTOMER)
      // findOne は 2 回呼ばれる（VIRTUAL/SUPPLIER と VIRTUAL/CUSTOMER）
      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: supplierId, code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: customerId, code: 'VIRTUAL/CUSTOMER' }) as any);

      vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(StockMove.create).mockResolvedValue([{ _id: oid() }] as any);

      const { adjustStock } = await import('../inventoryService');
      const result = await adjustStock({
        productId: String(productId),
        locationId: String(locationId),
        adjustQuantity: 10,
        memo: '棚卸し入庫',
      });

      expect(result.moveNumber).toBe('MV-20260319-0001');
      expect(result.message).toContain('+10');
      expect(StockQuant.findOneAndUpdate).toHaveBeenCalledOnce();
      expect(StockMove.create).toHaveBeenCalledOnce();
    });

    it('在庫減少（-qty）が正常に完了すること / successfully decreases stock (-qty)', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');
      const { StockQuant } = await import('@/models/stockQuant');
      const { StockMove } = await import('@/models/stockMove');

      const productId = oid();
      const locationId = oid();
      const supplierId = oid();
      const customerId = oid();

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById).mockReturnValue(
        chainLean({ _id: locationId, code: 'A-01-01' }) as any,
      );
      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: supplierId, code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: customerId, code: 'VIRTUAL/CUSTOMER' }) as any);

      // 現在の在庫: quantity=20, reserved=0 → available=20
      // 现在库存: quantity=20, reserved=0 → available=20
      vi.mocked(StockQuant.findOne).mockReturnValue(
        chainLean({ quantity: 20, reservedQuantity: 0 }) as any,
      );
      vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(StockMove.create).mockResolvedValue([{ _id: oid() }] as any);

      const { adjustStock } = await import('../inventoryService');
      const result = await adjustStock({
        productId: String(productId),
        locationId: String(locationId),
        adjustQuantity: -5,
        memo: '棚卸し出庫',
      });

      expect(result.moveNumber).toBe('MV-20260319-0001');
      expect(result.message).toContain('-5');
    });

    it('在庫不足の場合にエラーを投げること / throws when stock insufficient for decrease', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');
      const { StockQuant } = await import('@/models/stockQuant');

      const productId = oid();
      const locationId = oid();
      const supplierId = oid();
      const customerId = oid();

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById).mockReturnValue(
        chainLean({ _id: locationId, code: 'A-01-01' }) as any,
      );
      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: supplierId, code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: customerId, code: 'VIRTUAL/CUSTOMER' }) as any);

      // 有効在庫: quantity=3, reserved=0 → available=3
      // 有効在庫: quantity=3, reserved=0 → available=3
      vi.mocked(StockQuant.findOne).mockReturnValue(
        chainLean({ quantity: 3, reservedQuantity: 0 }) as any,
      );

      const { adjustStock } = await import('../inventoryService');
      await expect(
        adjustStock({
          productId: String(productId),
          locationId: String(locationId),
          adjustQuantity: -10,
        }),
      ).rejects.toThrow('有効在庫が不足');
    });

    it('在庫なし（StockQuant が null）でも減少エラーを投げること / throws on decrease when quant is null', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');
      const { StockQuant } = await import('@/models/stockQuant');

      const productId = oid();
      const locationId = oid();
      const supplierId = oid();
      const customerId = oid();

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById).mockReturnValue(
        chainLean({ _id: locationId, code: 'A-01-01' }) as any,
      );
      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: supplierId, code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: customerId, code: 'VIRTUAL/CUSTOMER' }) as any);

      // StockQuant が存在しない場合 / When StockQuant doesn't exist
      vi.mocked(StockQuant.findOne).mockReturnValue(chainLean(null) as any);

      const { adjustStock } = await import('../inventoryService');
      await expect(
        adjustStock({
          productId: String(productId),
          locationId: String(locationId),
          adjustQuantity: -1,
        }),
      ).rejects.toThrow('有効在庫が不足');
    });

    it('lotId 付きで調整できること / adjusts stock with lotId', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');
      const { StockQuant } = await import('@/models/stockQuant');
      const { StockMove } = await import('@/models/stockMove');

      const productId = oid();
      const locationId = oid();
      const lotId = oid();
      const supplierId = oid();
      const customerId = oid();

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById).mockReturnValue(
        chainLean({ _id: locationId, code: 'A-01-01' }) as any,
      );
      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: supplierId, code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: customerId, code: 'VIRTUAL/CUSTOMER' }) as any);

      vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(StockMove.create).mockResolvedValue([{ _id: oid() }] as any);

      const { adjustStock } = await import('../inventoryService');
      const result = await adjustStock({
        productId: String(productId),
        locationId: String(locationId),
        lotId: String(lotId),
        adjustQuantity: 5,
        memo: 'ロット付き棚卸し',
      });

      expect(result.moveNumber).toBe('MV-20260319-0001');
    });
  });

  // ─── transferStock / 在庫移動（ロケーション間移動） ──────────────────────

  describe('transferStock / ロケーション間在庫移動', () => {
    it('quantity <= 0 を拒否すること / rejects non-positive quantity', async () => {
      const { transferStock } = await import('../inventoryService');
      await expect(
        transferStock({
          productId: String(oid()),
          fromLocationId: String(oid()),
          toLocationId: String(oid()),
          quantity: 0,
        }),
      ).rejects.toThrow();
    });

    it('同一ロケーションへの移動を拒否すること / rejects same-location transfer', async () => {
      const { transferStock } = await import('../inventoryService');
      const locId = String(oid());
      await expect(
        transferStock({
          productId: String(oid()),
          fromLocationId: locId,
          toLocationId: locId,
          quantity: 5,
        }),
      ).rejects.toThrow('移動元と移動先が同じです');
    });

    it('商品が見つからない場合にエラーを投げること / throws when product not found', async () => {
      const { Product } = await import('@/models/product');
      vi.mocked(Product.findById).mockReturnValue(chainLean(null) as any);

      const { transferStock } = await import('../inventoryService');
      await expect(
        transferStock({
          productId: String(oid()),
          fromLocationId: String(oid()),
          toLocationId: String(oid()),
          quantity: 5,
        }),
      ).rejects.toThrow('商品が見つかりません');
    });

    it('移動元ロケーションが見つからない場合にエラーを投げること / throws when source location not found', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: oid(), sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      // fromLoc = null, toLoc = null の両方を null にする
      // Set both locations to null
      vi.mocked(Location.findById).mockReturnValue(chainLean(null) as any);

      const { transferStock } = await import('../inventoryService');
      await expect(
        transferStock({
          productId: String(oid()),
          fromLocationId: String(oid()),
          toLocationId: String(oid()),
          quantity: 5,
        }),
      ).rejects.toThrow('移動元ロケーションが見つかりません');
    });

    it('移動先ロケーションが見つからない場合にエラーを投げること / throws when destination location not found', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: oid(), sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      // fromLoc は存在、toLoc は null
      // fromLoc exists, toLoc is null
      vi.mocked(Location.findById)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'A-01-01' }) as any)
        .mockReturnValueOnce(chainLean(null) as any);

      const { transferStock } = await import('../inventoryService');
      await expect(
        transferStock({
          productId: String(oid()),
          fromLocationId: String(oid()),
          toLocationId: String(oid()),
          quantity: 5,
        }),
      ).rejects.toThrow('移動先ロケーションが見つかりません');
    });

    it('有効在庫不足の場合にエラーを投げること / throws when available stock insufficient', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');
      const { StockQuant } = await import('@/models/stockQuant');

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: oid(), sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'A-01-01' }) as any)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'B-02-01' }) as any);

      // available = 2 < quantity = 10
      vi.mocked(StockQuant.findOne).mockReturnValue(
        chainLean({ quantity: 2, reservedQuantity: 0 }) as any,
      );

      const { transferStock } = await import('../inventoryService');
      await expect(
        transferStock({
          productId: String(oid()),
          fromLocationId: String(oid()),
          toLocationId: String(oid()),
          quantity: 10,
        }),
      ).rejects.toThrow('移動元の有効在庫が不足');
    });

    it('正常に在庫移動が完了すること / successfully transfers stock', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');
      const { StockQuant } = await import('@/models/stockQuant');
      const { StockMove } = await import('@/models/stockMove');

      const productId = oid();
      const fromId = oid();
      const toId = oid();

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById)
        .mockReturnValueOnce(chainLean({ _id: fromId, code: 'A-01-01' }) as any)
        .mockReturnValueOnce(chainLean({ _id: toId, code: 'B-02-01' }) as any);

      // available = 50 >= quantity = 5
      vi.mocked(StockQuant.findOne).mockReturnValue(
        chainLean({ quantity: 50, reservedQuantity: 0 }) as any,
      );
      vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(StockMove.create).mockResolvedValue([{ _id: oid() }] as any);

      const { transferStock } = await import('../inventoryService');
      const result = await transferStock({
        productId: String(productId),
        fromLocationId: String(fromId),
        toLocationId: String(toId),
        quantity: 5,
        memo: 'ロケーション間移動テスト',
      });

      expect(result.moveNumber).toBe('MV-20260319-0001');
      expect(result.message).toContain('A-01-01');
      expect(result.message).toContain('B-02-01');
      // findOneAndUpdate が 2 回呼ばれる（移動元減少 + 移動先増加）
      // findOneAndUpdate is called twice (source decrease + destination increase)
      expect(StockQuant.findOneAndUpdate).toHaveBeenCalledTimes(2);
      expect(StockMove.create).toHaveBeenCalledOnce();
    });

    it('stockQuant が null でも available=0 として扱うこと / treats null quant as available=0', async () => {
      const { Product } = await import('@/models/product');
      const { Location } = await import('@/models/location');
      const { StockQuant } = await import('@/models/stockQuant');

      vi.mocked(Product.findById).mockReturnValue(
        chainLean({ _id: oid(), sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Location.findById)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'A-01-01' }) as any)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'B-02-01' }) as any);

      // sourceQuant が null → available = 0
      vi.mocked(StockQuant.findOne).mockReturnValue(chainLean(null) as any);

      const { transferStock } = await import('../inventoryService');
      await expect(
        transferStock({
          productId: String(oid()),
          fromLocationId: String(oid()),
          toLocationId: String(oid()),
          quantity: 1,
        }),
      ).rejects.toThrow('移動元の有効在庫が不足');
    });
  });

  // ─── bulkAdjustStock / 一括在庫調整 ──────────────────────────────────────

  describe('bulkAdjustStock / 一括在庫調整（CSV インポート）', () => {
    it('空配列を拒否すること / rejects empty array', async () => {
      const { bulkAdjustStock } = await import('../inventoryService');
      await expect(bulkAdjustStock([])).rejects.toThrow('調整データが必要です');
    });

    it('配列以外を拒否すること / rejects non-array input', async () => {
      const { bulkAdjustStock } = await import('../inventoryService');
      await expect(bulkAdjustStock(null as any)).rejects.toThrow('調整データが必要です');
    });

    it('必須フィールドが欠落したアイテムを失敗として記録すること / records items with missing fields as failed', async () => {
      const { Location } = await import('@/models/location');
      const { Product } = await import('@/models/product');

      // 仮想ロケーション設定 / Setup virtual locations
      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'VIRTUAL/CUSTOMER' }) as any);

      const { bulkAdjustStock } = await import('../inventoryService');
      const result = await bulkAdjustStock([
        { productSku: '', locationCode: 'A-01', quantity: 5 },
        { productSku: 'SKU-001', locationCode: '', quantity: 5 },
        { productSku: 'SKU-001', locationCode: 'A-01', quantity: 0 },
      ]);

      expect(result.failCount).toBe(3);
      expect(result.successCount).toBe(0);
      expect(result.errors).toHaveLength(3);
    });

    it('商品が見つからない場合にエラーを記録すること / records error when product not found', async () => {
      const { Location } = await import('@/models/location');
      const { Product } = await import('@/models/product');

      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'VIRTUAL/CUSTOMER' }) as any)
        .mockReturnValue(chainLean({ _id: oid(), code: 'A-01-01' }) as any);

      vi.mocked(Product.findOne).mockReturnValue(chainLean(null) as any);

      const { bulkAdjustStock } = await import('../inventoryService');
      const result = await bulkAdjustStock([
        { productSku: 'SKU-NOTFOUND', locationCode: 'A-01-01', quantity: 5 },
      ]);

      expect(result.failCount).toBe(1);
      expect(result.errors[0]).toContain('商品が見つかりません');
    });

    it('ロケーションが見つからない場合にエラーを記録すること / records error when location not found', async () => {
      const { Location } = await import('@/models/location');
      const { Product } = await import('@/models/product');

      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: oid(), code: 'VIRTUAL/CUSTOMER' }) as any)
        .mockReturnValue(chainLean(null) as any); // ロケーションが見つからない

      vi.mocked(Product.findOne).mockReturnValue(
        chainLean({ _id: oid(), sku: 'SKU-001', name: 'テスト商品' }) as any,
      );

      const { bulkAdjustStock } = await import('../inventoryService');
      const result = await bulkAdjustStock([
        { productSku: 'SKU-001', locationCode: 'UNKNOWN', quantity: 5 },
      ]);

      expect(result.failCount).toBe(1);
      expect(result.errors[0]).toContain('ロケーション');
    });

    it('有効在庫不足の場合にエラーを記録すること / records error for insufficient stock on decrease', async () => {
      const { Location } = await import('@/models/location');
      const { Product } = await import('@/models/product');
      const { StockQuant } = await import('@/models/stockQuant');

      const productId = oid();
      const locationId = oid();
      const supplierId = oid();
      const customerId = oid();

      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: supplierId, code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: customerId, code: 'VIRTUAL/CUSTOMER' }) as any)
        .mockReturnValue(chainLean({ _id: locationId, code: 'A-01-01' }) as any);

      vi.mocked(Product.findOne).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );

      // 有効在庫: available = 2 < 調整量 5
      // available = 2 < adjustment = 5
      vi.mocked(StockQuant.findOne).mockReturnValue(
        chainLean({ quantity: 2, reservedQuantity: 0 }) as any,
      );

      const { bulkAdjustStock } = await import('../inventoryService');
      const result = await bulkAdjustStock([
        { productSku: 'SKU-001', locationCode: 'A-01-01', quantity: -5 },
      ]);

      expect(result.failCount).toBe(1);
      expect(result.errors[0]).toContain('有効在庫不足');
    });

    it('正常な一括調整が成功すること / successfully processes bulk adjustments', async () => {
      const { Location } = await import('@/models/location');
      const { Product } = await import('@/models/product');
      const { StockQuant } = await import('@/models/stockQuant');
      const { StockMove } = await import('@/models/stockMove');

      const productId = oid();
      const locationId = oid();
      const supplierId = oid();
      const customerId = oid();

      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: supplierId, code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: customerId, code: 'VIRTUAL/CUSTOMER' }) as any)
        .mockReturnValue(chainLean({ _id: locationId, code: 'A-01-01' }) as any);

      vi.mocked(Product.findOne).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(StockMove.create).mockResolvedValue({ _id: oid() } as any);

      const { bulkAdjustStock } = await import('../inventoryService');
      const result = await bulkAdjustStock([
        { productSku: 'SKU-001', locationCode: 'A-01-01', quantity: 10, memo: '一括調整テスト' },
      ]);

      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.message).toContain('成功1件');
    });

    it('複数アイテムで部分失敗を正しく処理すること / handles partial failures in multiple items', async () => {
      const { Location } = await import('@/models/location');
      const { Product } = await import('@/models/product');
      const { StockQuant } = await import('@/models/stockQuant');
      const { StockMove } = await import('@/models/stockMove');

      const productId = oid();
      const locationId = oid();
      const supplierId = oid();
      const customerId = oid();

      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: supplierId, code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: customerId, code: 'VIRTUAL/CUSTOMER' }) as any)
        // 1件目のロケーション: 存在する
        .mockReturnValueOnce(chainLean({ _id: locationId, code: 'A-01-01' }) as any)
        // 2件目のロケーション: 存在しない
        .mockReturnValueOnce(chainLean(null) as any);

      // 1件目の商品: 存在する / 2件目の商品: 存在する（ロケーション失敗）
      vi.mocked(Product.findOne)
        .mockReturnValueOnce(
          chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
        )
        .mockReturnValueOnce(
          chainLean({ _id: productId, sku: 'SKU-002', name: 'テスト商品2' }) as any,
        );

      vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(StockMove.create).mockResolvedValue({ _id: oid() } as any);

      const { bulkAdjustStock } = await import('../inventoryService');
      const result = await bulkAdjustStock([
        { productSku: 'SKU-001', locationCode: 'A-01-01', quantity: 10 },
        { productSku: 'SKU-002', locationCode: 'UNKNOWN', quantity: 5 },
      ]);

      expect(result.successCount).toBe(1);
      expect(result.failCount).toBe(1);
    });

    it('ロット番号付きで一括調整できること / handles bulk adjustment with lot number', async () => {
      const { Location } = await import('@/models/location');
      const { Product } = await import('@/models/product');
      const { Lot } = await import('@/models/lot');
      const { StockQuant } = await import('@/models/stockQuant');
      const { StockMove } = await import('@/models/stockMove');

      const productId = oid();
      const locationId = oid();
      const lotId = oid();
      const supplierId = oid();
      const customerId = oid();

      vi.mocked(Location.findOne)
        .mockReturnValueOnce(chainLean({ _id: supplierId, code: 'VIRTUAL/SUPPLIER' }) as any)
        .mockReturnValueOnce(chainLean({ _id: customerId, code: 'VIRTUAL/CUSTOMER' }) as any)
        .mockReturnValue(chainLean({ _id: locationId, code: 'A-01-01' }) as any);

      vi.mocked(Product.findOne).mockReturnValue(
        chainLean({ _id: productId, sku: 'SKU-001', name: 'テスト商品' }) as any,
      );
      vi.mocked(Lot.findOne).mockReturnValue(
        chainLean({ _id: lotId, lotNumber: 'LOT-2026-001' }) as any,
      );
      vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue(null);
      vi.mocked(StockMove.create).mockResolvedValue({ _id: oid() } as any);

      const { bulkAdjustStock } = await import('../inventoryService');
      const result = await bulkAdjustStock([
        {
          productSku: 'SKU-001',
          locationCode: 'A-01-01',
          quantity: 10,
          lotNumber: 'LOT-2026-001',
        },
      ]);

      expect(result.successCount).toBe(1);
      expect(Lot.findOne).toHaveBeenCalledOnce();
    });
  });

  // ─── listMovements / 入出庫履歴 ──────────────────────────────────────────

  describe('listMovements / 入出庫履歴取得', () => {
    it('デフォルトページネーションで結果を返すこと / returns results with default pagination', async () => {
      const { StockMove } = await import('@/models/stockMove');
      vi.mocked(StockMove.aggregate).mockResolvedValue([]);
      vi.mocked(StockMove.countDocuments).mockResolvedValue(0);

      const { listMovements } = await import('../inventoryService');
      const result = await listMovements({}, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it('productId フィルタで ObjectId を生成すること / builds ObjectId for productId filter', async () => {
      const { StockMove } = await import('@/models/stockMove');
      vi.mocked(StockMove.aggregate).mockResolvedValue([]);
      vi.mocked(StockMove.countDocuments).mockResolvedValue(0);

      const { listMovements } = await import('../inventoryService');
      const productId = String(oid());
      await listMovements({ productId }, {});

      expect(StockMove.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ productId: expect.any(mongoose.Types.ObjectId) }),
      );
    });

    it('moveType フィルタを適用すること / applies moveType filter', async () => {
      const { StockMove } = await import('@/models/stockMove');
      vi.mocked(StockMove.aggregate).mockResolvedValue([]);
      vi.mocked(StockMove.countDocuments).mockResolvedValue(0);

      const { listMovements } = await import('../inventoryService');
      await listMovements({ moveType: 'adjustment' }, {});

      expect(StockMove.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ moveType: 'adjustment' }),
      );
    });

    it('state フィルタを適用すること / applies state filter', async () => {
      const { StockMove } = await import('@/models/stockMove');
      vi.mocked(StockMove.aggregate).mockResolvedValue([]);
      vi.mocked(StockMove.countDocuments).mockResolvedValue(0);

      const { listMovements } = await import('../inventoryService');
      await listMovements({ state: 'done' }, {});

      expect(StockMove.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'done' }),
      );
    });

    it('カスタムページネーションを適用すること / applies custom pagination', async () => {
      const { StockMove } = await import('@/models/stockMove');
      vi.mocked(StockMove.aggregate).mockResolvedValue([]);
      vi.mocked(StockMove.countDocuments).mockResolvedValue(100);

      const { listMovements } = await import('../inventoryService');
      const result = await listMovements({}, { page: 3, limit: 20 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
      expect(result.total).toBe(100);
    });

    it('limit の上限（500）を超えないこと / does not exceed limit cap of 500', async () => {
      const { StockMove } = await import('@/models/stockMove');
      vi.mocked(StockMove.aggregate).mockResolvedValue([]);
      vi.mocked(StockMove.countDocuments).mockResolvedValue(0);

      const { listMovements } = await import('../inventoryService');
      const result = await listMovements({}, { limit: 9999 });

      expect(result.limit).toBe(500);
    });

    it('page < 1 の場合は 1 に補正されること / clamps page to minimum 1', async () => {
      const { StockMove } = await import('@/models/stockMove');
      vi.mocked(StockMove.aggregate).mockResolvedValue([]);
      vi.mocked(StockMove.countDocuments).mockResolvedValue(0);

      const { listMovements } = await import('../inventoryService');
      const result = await listMovements({}, { page: -5 });

      expect(result.page).toBe(1);
    });

    it('移動履歴アイテムを返すこと / returns movement items', async () => {
      const { StockMove } = await import('@/models/stockMove');
      const mockMoves = [
        {
          moveNumber: 'MV-0001',
          moveType: 'transfer',
          state: 'done',
          productSku: 'SKU-001',
          quantity: 10,
        },
      ];
      vi.mocked(StockMove.aggregate).mockResolvedValue(mockMoves);
      vi.mocked(StockMove.countDocuments).mockResolvedValue(1);

      const { listMovements } = await import('../inventoryService');
      const result = await listMovements({}, {});

      expect(result.items).toEqual(mockMoves);
      expect(result.total).toBe(1);
    });
  });

  // ─── listLowStockAlerts / 安全在庫アラート ───────────────────────────────

  describe('listLowStockAlerts / 安全在庫割れアラート', () => {
    it('在庫管理商品がない場合は空配列を返すこと / returns empty array when no managed products', async () => {
      const { Product } = await import('@/models/product');
      vi.mocked(Product.find).mockReturnValue(chainLean([]) as any);

      const { listLowStockAlerts } = await import('../inventoryService');
      const result = await listLowStockAlerts();

      expect(result).toEqual([]);
      // Product.find が呼ばれ StockQuant.aggregate は呼ばれないこと
      // Product.find is called but StockQuant.aggregate is not called
      const { StockQuant } = await import('@/models/stockQuant');
      expect(StockQuant.aggregate).not.toHaveBeenCalled();
    });

    it('安全在庫を割っていない商品は含まれないこと / excludes products above safety stock', async () => {
      const { Product } = await import('@/models/product');
      const { StockQuant } = await import('@/models/stockQuant');

      const productId = oid();
      vi.mocked(Product.find).mockReturnValue(
        chainLean([
          { _id: productId, sku: 'SKU-001', name: 'テスト商品', safetyStock: 10, inventoryEnabled: true },
        ]) as any,
      );

      // available = 20 > safetyStock = 10 → アラートなし
      // available = 20 > safetyStock = 10 → no alert
      vi.mocked(StockQuant.aggregate).mockResolvedValue([
        { _id: productId, totalQuantity: 20, totalReserved: 0, totalAvailable: 20 },
      ]);

      const { listLowStockAlerts } = await import('../inventoryService');
      const result = await listLowStockAlerts();

      expect(result).toEqual([]);
    });

    it('安全在庫を割っている商品を不足量でソートして返すこと / returns products below safety stock sorted by shortage', async () => {
      const { Product } = await import('@/models/product');
      const { StockQuant } = await import('@/models/stockQuant');

      const prodId1 = oid();
      const prodId2 = oid();

      vi.mocked(Product.find).mockReturnValue(
        chainLean([
          { _id: prodId1, sku: 'SKU-001', name: '商品1', safetyStock: 20, inventoryEnabled: true },
          { _id: prodId2, sku: 'SKU-002', name: '商品2', safetyStock: 50, inventoryEnabled: true },
        ]) as any,
      );

      // SKU-001: available=15 (shortage=5), SKU-002: available=10 (shortage=40)
      vi.mocked(StockQuant.aggregate).mockResolvedValue([
        { _id: prodId1, totalQuantity: 15, totalReserved: 0, totalAvailable: 15 },
        { _id: prodId2, totalQuantity: 10, totalReserved: 0, totalAvailable: 10 },
      ]);

      const { listLowStockAlerts } = await import('../inventoryService');
      const result = await listLowStockAlerts();

      // 不足量が多い順（SKU-002 が先）
      // Sorted by shortage descending (SKU-002 first)
      expect(result).toHaveLength(2);
      expect(result[0].productSku).toBe('SKU-002');
      expect(result[0].shortage).toBe(40);
      expect(result[1].productSku).toBe('SKU-001');
      expect(result[1].shortage).toBe(5);
    });

    it('在庫データなし商品は availableQuantity=0 として扱うこと / treats products with no stock data as available=0', async () => {
      const { Product } = await import('@/models/product');
      const { StockQuant } = await import('@/models/stockQuant');

      const productId = oid();
      vi.mocked(Product.find).mockReturnValue(
        chainLean([
          { _id: productId, sku: 'SKU-001', name: 'テスト商品', safetyStock: 5, inventoryEnabled: true },
        ]) as any,
      );

      // 在庫データなし → stockMap に存在しない
      // No stock data → not in stockMap
      vi.mocked(StockQuant.aggregate).mockResolvedValue([]);

      const { listLowStockAlerts } = await import('../inventoryService');
      const result = await listLowStockAlerts();

      expect(result).toHaveLength(1);
      expect(result[0].availableQuantity).toBe(0);
      expect(result[0].shortage).toBe(5);
    });
  });

  // ─── cleanupZeroStock / ゼロ在庫クリーンアップ ───────────────────────────

  describe('cleanupZeroStock / ゼロ在庫レコード削除', () => {
    it('deleteMany を呼び削除件数を返すこと / calls deleteMany and returns deleted count', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.deleteMany).mockResolvedValue({ deletedCount: 5 } as any);

      const { cleanupZeroStock } = await import('../inventoryService');
      const result = await cleanupZeroStock();

      expect(result.deletedCount).toBe(5);
      expect(StockQuant.deleteMany).toHaveBeenCalledOnce();
      // quantity <= 0 AND reservedQuantity <= 0 の条件であること
      // Should use quantity <= 0 AND reservedQuantity <= 0 condition
      expect(StockQuant.deleteMany).toHaveBeenCalledWith({
        quantity: { $lte: 0 },
        reservedQuantity: { $lte: 0 },
      });
    });

    it('削除件数 0 を返せること / returns zero deleted count when nothing to delete', async () => {
      const { StockQuant } = await import('@/models/stockQuant');
      vi.mocked(StockQuant.deleteMany).mockResolvedValue({ deletedCount: 0 } as any);

      const { cleanupZeroStock } = await import('../inventoryService');
      const result = await cleanupZeroStock();

      expect(result.deletedCount).toBe(0);
    });
  });

  // ─── rebuildInventory / 在庫リビルド ─────────────────────────────────────

  describe('rebuildInventory / 在庫整合性チェック＆修復', () => {
    it('fix=false で差異なしの場合を正しく処理すること / handles no discrepancies with fix=false', async () => {
      const { Location } = await import('@/models/location');
      const { StockMove } = await import('@/models/stockMove');
      const { StockQuant } = await import('@/models/stockQuant');
      const { Product } = await import('@/models/product');
      const { Lot } = await import('@/models/lot');

      // 仮想ロケーションなし / No virtual locations
      vi.mocked(Location.find).mockReturnValue(chainLean([]) as any);

      // 入出庫集計なし / No inbound/outbound aggregation
      vi.mocked(StockMove.aggregate).mockResolvedValue([]);

      // StockQuant なし / No StockQuants
      vi.mocked(StockQuant.find).mockReturnValue(chainLean([]) as any);

      vi.mocked(Product.find).mockReturnValue(chainLean([]) as any);
      vi.mocked(Lot.find).mockReturnValue(chainSelectLean([]) as any);

      const { rebuildInventory } = await import('../inventoryService');
      const result = await rebuildInventory(false);

      expect(result.discrepancies).toEqual([]);
      expect(result.discrepancyCount).toBe(0);
      expect(result.fixed).toBe(false);
    });

    it('差異がある場合に discrepancies を返すこと / returns discrepancies when mismatches found', async () => {
      const { Location } = await import('@/models/location');
      const { StockMove } = await import('@/models/stockMove');
      const { StockQuant } = await import('@/models/stockQuant');
      const { Product } = await import('@/models/product');
      const { Lot } = await import('@/models/lot');

      const productId = oid();
      const locationId = oid();

      vi.mocked(Location.find).mockReturnValue(chainLean([]) as any);

      // 入庫: productId @ locationId = 100
      // 出庫なし
      vi.mocked(StockMove.aggregate)
        .mockResolvedValueOnce([
          {
            _id: { productId, locationId, lotId: null },
            totalQty: 100,
          },
        ])
        .mockResolvedValueOnce([]); // 出庫集計

      // 現在の StockQuant: quantity=80 (不一致)
      // Current StockQuant: quantity=80 (mismatch)
      vi.mocked(StockQuant.find).mockReturnValue(
        chainLean([
          {
            productId,
            locationId,
            lotId: null,
            quantity: 80,
            reservedQuantity: 0,
            productSku: 'SKU-001',
          },
        ]) as any,
      );

      vi.mocked(Product.find).mockReturnValue(
        chainLean([{ _id: productId, sku: 'SKU-001', name: 'テスト商品' }]) as any,
      );
      vi.mocked(Location.find)
        .mockReturnValueOnce(chainLean([]) as any) // 仮想ロケーション検索
        .mockReturnValue(
          chainLean([{ _id: locationId, code: 'A-01-01', name: '棚A-01-01' }]) as any,
        );
      vi.mocked(Lot.find).mockReturnValue(chainSelectLean([]) as any);

      const { rebuildInventory } = await import('../inventoryService');
      const result = await rebuildInventory(false);

      expect(result.discrepancyCount).toBeGreaterThan(0);
      expect(result.fixed).toBe(false);
    });

    it('fix=true で差異がある場合に StockQuant を更新すること / updates StockQuant when fix=true with discrepancies', async () => {
      const { Location } = await import('@/models/location');
      const { StockMove } = await import('@/models/stockMove');
      const { StockQuant } = await import('@/models/stockQuant');
      const { Product } = await import('@/models/product');
      const { Lot } = await import('@/models/lot');
      const { logger } = await import('@/lib/logger');

      const productId = oid();
      const locationId = oid();

      vi.mocked(Location.find).mockReturnValue(chainLean([]) as any);

      vi.mocked(StockMove.aggregate)
        .mockResolvedValueOnce([
          { _id: { productId, locationId, lotId: null }, totalQty: 100 },
        ])
        .mockResolvedValueOnce([]);

      vi.mocked(StockQuant.find).mockReturnValue(
        chainLean([
          {
            productId,
            locationId,
            lotId: null,
            quantity: 80,
            reservedQuantity: 0,
            productSku: 'SKU-001',
          },
        ]) as any,
      );

      vi.mocked(Product.find).mockReturnValue(
        chainLean([{ _id: productId, sku: 'SKU-001', name: 'テスト商品' }]) as any,
      );
      vi.mocked(Location.find)
        .mockReturnValueOnce(chainLean([]) as any)
        .mockReturnValue(
          chainLean([{ _id: locationId, code: 'A-01-01', name: '棚A-01-01' }]) as any,
        );
      vi.mocked(Lot.find).mockReturnValue(chainSelectLean([]) as any);
      vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue(null);

      const { rebuildInventory } = await import('../inventoryService');
      const result = await rebuildInventory(true);

      // fix=true かつ差異あり → fixed=true
      // fix=true and has discrepancies → fixed=true
      expect(result.fixed).toBe(true);
      expect(logger.info).toHaveBeenCalled();
    });

    it('fix=false で差異があっても StockQuant を変更しないこと / does not modify StockQuant when fix=false', async () => {
      const { Location } = await import('@/models/location');
      const { StockMove } = await import('@/models/stockMove');
      const { StockQuant } = await import('@/models/stockQuant');
      const { Product } = await import('@/models/product');
      const { Lot } = await import('@/models/lot');

      const productId = oid();
      const locationId = oid();

      vi.mocked(Location.find).mockReturnValue(chainLean([]) as any);
      vi.mocked(StockMove.aggregate)
        .mockResolvedValueOnce([
          { _id: { productId, locationId, lotId: null }, totalQty: 50 },
        ])
        .mockResolvedValueOnce([]);

      vi.mocked(StockQuant.find).mockReturnValue(
        chainLean([
          {
            productId,
            locationId,
            lotId: null,
            quantity: 30,
            reservedQuantity: 0,
            productSku: 'SKU-001',
          },
        ]) as any,
      );

      vi.mocked(Product.find).mockReturnValue(
        chainLean([{ _id: productId, sku: 'SKU-001', name: 'テスト商品' }]) as any,
      );
      vi.mocked(Location.find)
        .mockReturnValueOnce(chainLean([]) as any)
        .mockReturnValue(
          chainLean([{ _id: locationId, code: 'A-01-01' }]) as any,
        );
      vi.mocked(Lot.find).mockReturnValue(chainSelectLean([]) as any);

      const { rebuildInventory } = await import('../inventoryService');
      const result = await rebuildInventory(false);

      expect(result.fixed).toBe(false);
      expect(StockQuant.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  // ─── releaseExpiredReservations / 期限切れ引当解放 ───────────────────────

  describe('releaseExpiredReservations / 期限切れ引当の自動解放', () => {
    it('timeoutMinutes=0 を拒否すること / rejects timeoutMinutes=0', async () => {
      const { releaseExpiredReservations } = await import('../inventoryService');
      await expect(releaseExpiredReservations(0)).rejects.toThrow();
    });

    it('timeoutMinutes が負の値を拒否すること / rejects negative timeoutMinutes', async () => {
      const { releaseExpiredReservations } = await import('../inventoryService');
      await expect(releaseExpiredReservations(-1)).rejects.toThrow();
    });

    it('期限切れ移動がない場合は 0 件を返すこと / returns 0 when no expired moves', async () => {
      const { StockMove } = await import('@/models/stockMove');
      vi.mocked(StockMove.find).mockReturnValue(chainLean([]) as any);

      const { releaseExpiredReservations } = await import('../inventoryService');
      const result = await releaseExpiredReservations(30);

      expect(result.releasedCount).toBe(0);
      expect(result.releasedMoves).toEqual([]);
    });

    it('期限切れ移動がある場合に引当を解放すること / releases reservations for expired moves', async () => {
      const { StockMove } = await import('@/models/stockMove');
      const { StockQuant } = await import('@/models/stockQuant');
      const { logger } = await import('@/lib/logger');

      const moveId1 = oid();
      const moveId2 = oid();
      const productId = oid();
      const fromLocId = oid();

      const expiredMoves = [
        {
          _id: moveId1,
          moveNumber: 'MV-0001',
          productId,
          productSku: 'SKU-001',
          fromLocationId: fromLocId,
          lotId: null,
          quantity: 5,
          referenceNumber: 'SO-001',
          createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1時間前
          state: 'confirmed',
        },
        {
          _id: moveId2,
          moveNumber: 'MV-0002',
          productId,
          productSku: 'SKU-002',
          fromLocationId: fromLocId,
          lotId: null,
          quantity: 3,
          referenceNumber: 'SO-002',
          createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45分前
          state: 'confirmed',
        },
      ];

      vi.mocked(StockMove.find).mockReturnValue(chainLean(expiredMoves) as any);
      vi.mocked(StockQuant.bulkWrite).mockResolvedValue({} as any);
      vi.mocked(StockMove.updateMany).mockResolvedValue({ modifiedCount: 2 } as any);

      const { releaseExpiredReservations } = await import('../inventoryService');
      const result = await releaseExpiredReservations(30);

      expect(result.releasedCount).toBe(2);
      expect(result.releasedMoves).toHaveLength(2);
      expect(result.releasedMoves[0].moveNumber).toBe('MV-0001');
      expect(result.releasedMoves[1].moveNumber).toBe('MV-0002');

      // StockQuant の bulkWrite が呼ばれること
      // StockQuant.bulkWrite should be called
      expect(StockQuant.bulkWrite).toHaveBeenCalledOnce();

      // StockMove の updateMany でキャンセル状態に更新すること
      // StockMove.updateMany should set state to 'cancelled'
      expect(StockMove.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [moveId1, moveId2] } },
        expect.objectContaining({ $set: expect.objectContaining({ state: 'cancelled' }) }),
      );

      expect(logger.info).toHaveBeenCalled();
    });

    it('lotId 付きの期限切れ移動を正しく処理すること / handles expired moves with lotId', async () => {
      const { StockMove } = await import('@/models/stockMove');
      const { StockQuant } = await import('@/models/stockQuant');

      const lotId = oid();
      const expiredMoves = [
        {
          _id: oid(),
          moveNumber: 'MV-LOT-001',
          productId: oid(),
          productSku: 'SKU-LOT',
          fromLocationId: oid(),
          lotId,
          quantity: 10,
          referenceNumber: undefined,
          createdAt: new Date(),
          state: 'confirmed',
        },
      ];

      vi.mocked(StockMove.find).mockReturnValue(chainLean(expiredMoves) as any);
      vi.mocked(StockQuant.bulkWrite).mockResolvedValue({} as any);
      vi.mocked(StockMove.updateMany).mockResolvedValue({ modifiedCount: 1 } as any);

      const { releaseExpiredReservations } = await import('../inventoryService');
      const result = await releaseExpiredReservations(15);

      expect(result.releasedCount).toBe(1);
      // bulkWrite に lotId が含まれていること
      // bulkWrite should include lotId in filter
      const bulkWriteArg = vi.mocked(StockQuant.bulkWrite).mock.calls[0][0] as any[];
      expect(bulkWriteArg[0].updateOne.filter.lotId).toEqual(lotId);
    });

    it('デフォルトタイムアウト（30分）で動作すること / works with default timeout of 30 minutes', async () => {
      const { StockMove } = await import('@/models/stockMove');

      vi.mocked(StockMove.find).mockReturnValue(chainLean([]) as any);

      const { releaseExpiredReservations } = await import('../inventoryService');
      const result = await releaseExpiredReservations();

      expect(result.releasedCount).toBe(0);
    });
  });
});
