/**
 * stockService 全面单元测试 / stockService 包括的ユニットテスト
 *
 * 覆盖范围 / カバレッジ対象:
 *  - reserveStockForOrder  (引当 / 在庫引当)
 *  - unreserveStockForOrder (引当解除 / 引当キャンセル)
 *  - completeStockForOrder  (出庫完了 / 出庫完了消込)
 *
 * 日本語WMSシナリオ / 日本語WMSシナリオ:
 *  - FEFO: 先期限先出（賞味期限が近い順）
 *  - 引当: 出荷確定時の在庫ロック
 *  - 引当解除: 注文キャンセル時のロック解放
 *  - 出庫完了: 在庫の実際の減少
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// ── チェーンモックヘルパー / 链式mock辅助函数 ──────────────────────────────
// lean()を返すPromiseのモック / lean()を返すPromiseのモック
const chainLean = (val: any) => ({ lean: () => Promise.resolve(val) });
// select().lean() チェーン用 / select().lean() チェーン用
const chainSelectLean = (val: any) => ({
  select: (_fields: string) => ({ lean: () => Promise.resolve(val) }),
  lean: () => Promise.resolve(val),
});
// ObjectId生成ヘルパー / ObjectId生成ヘルパー
const oid = () => new mongoose.Types.ObjectId();

// ── モデルモック定義 / モデルモック定義 ────────────────────────────────────
// vi.mock はホイストされるため factory 内ではトップレベル変数を使用不可
// vi.mockはホイストされるため factory内ではトップレベル変数を使用不可

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    find: vi.fn(() => chainLean([])),
    findOne: vi.fn(() => chainLean(null)),
    aggregate: vi.fn().mockResolvedValue([]),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    bulkWrite: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
  },
}));

vi.mock('@/models/stockMove', () => ({
  StockMove: {
    // findは直接配列を返す（lean()なし）/ findは直接配列を返す
    find: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ _id: 'mock-move-id' }),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/models/location', () => ({
  Location: {
    findOne: vi.fn(() => chainLean({ _id: 'virtual-customer-id', code: 'VIRTUAL/CUSTOMER' })),
    find: vi.fn(() => chainLean([])),
  },
}));

vi.mock('@/models/product', () => ({
  Product: {
    findOne: vi.fn(() => chainLean(null)),
    find: vi.fn(() => chainLean([])),
  },
}));

vi.mock('@/models/lot', () => ({
  Lot: {
    find: vi.fn(() => chainSelectLean([])),
  },
}));

vi.mock('@/utils/sequenceGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('MV-20260319-0001'),
}));

vi.mock('@/core/extensions', () => ({
  extensionManager: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/core/extensions/types', () => ({
  HOOK_EVENTS: {
    STOCK_RESERVED: 'stock.reserved',
    STOCK_RELEASED: 'stock.released',
    INVENTORY_CHANGED: 'inventory.changed',
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── インポート（モック登録後に実施）/ モック登録後にインポート ─────────────
import { StockQuant } from '@/models/stockQuant';
import { StockMove } from '@/models/stockMove';
import { Location } from '@/models/location';
import { Product } from '@/models/product';
import { Lot } from '@/models/lot';
import { extensionManager } from '@/core/extensions';
import {
  reserveStockForOrder,
  unreserveStockForOrder,
  completeStockForOrder,
} from '../stockService';

// ── テストデータファクトリ / テストデータファクトリ ───────────────────────

/** 在庫数量レコード作成 / 在庫数量レコード作成 */
function makeQuant(overrides: Partial<{
  productId: mongoose.Types.ObjectId;
  locationId: mongoose.Types.ObjectId;
  lotId: mongoose.Types.ObjectId;
  quantity: number;
  reservedQuantity: number;
  lastMovedAt: Date;
}> = {}) {
  return {
    _id: oid(),
    productId: overrides.productId ?? oid(),
    locationId: overrides.locationId ?? oid(),
    lotId: overrides.lotId,
    quantity: overrides.quantity ?? 10,
    reservedQuantity: overrides.reservedQuantity ?? 0,
    lastMovedAt: overrides.lastMovedAt ?? new Date('2026-01-01'),
  };
}

/** 在庫移動レコード作成 / 在庫移動レコード作成 */
function makeMove(overrides: Partial<{
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  fromLocationId: mongoose.Types.ObjectId;
  lotId: mongoose.Types.ObjectId;
  quantity: number;
  state: string;
  referenceId: string;
}> = {}) {
  return {
    _id: overrides._id ?? oid(),
    productId: overrides.productId ?? oid(),
    fromLocationId: overrides.fromLocationId ?? oid(),
    lotId: overrides.lotId,
    quantity: overrides.quantity ?? 5,
    state: overrides.state ?? 'confirmed',
    referenceId: overrides.referenceId ?? 'order-1',
    moveType: 'outbound',
    referenceType: 'shipment-order',
  };
}

// ── デフォルトモック設定ヘルパー / デフォルトモック設定ヘルパー ──────────────

/** VIRTUAL/CUSTOMER ロケーションのモックを設定 / VIRTUAL/CUSTOMERロケーションのモックを設定 */
function setupVirtualCustomer() {
  vi.mocked(Location.findOne).mockReturnValue(
    chainLean({ _id: 'virtual-customer-id', code: 'VIRTUAL/CUSTOMER' }) as any,
  );
}

/** 商品マスタのモックを設定 / 商品マスタのモックを設定 */
function setupProduct(productId: mongoose.Types.ObjectId, options: {
  sku?: string;
  name?: string;
  inventoryEnabled?: boolean;
  allSku?: string[];
} = {}) {
  const product = {
    _id: productId,
    sku: options.sku ?? 'SKU-001',
    name: options.name ?? 'テスト商品',
    inventoryEnabled: options.inventoryEnabled ?? true,
    ...(options.allSku ? { _allSku: options.allSku } : {}),
  };
  vi.mocked(Product.find).mockReturnValue(chainLean([product]) as any);
  return product;
}

/** ロットなし在庫のモックを設定 / ロットなし在庫のモックを設定 */
function setupQuantsNoLot(quants: ReturnType<typeof makeQuant>[]) {
  vi.mocked(StockQuant.find).mockReturnValue(chainLean(quants) as any);
  vi.mocked(Lot.find).mockReturnValue(chainSelectLean([]) as any);
}

// ── テストスイート / テストスイート ────────────────────────────────────────

describe('stockService', () => {
  beforeEach(() => {
    // clearAllMocks はスパイのコールカウントをリセット / callsをリセット
    // resetAllMocks はモック実装もリセットするためデフォルト値の再設定が必要
    vi.clearAllMocks();

    // 各テストのデフォルト値を設定 / 各テストのデフォルト値を設定
    setupVirtualCustomer();
    vi.mocked(Product.find).mockReturnValue(chainLean([]) as any);
    vi.mocked(StockQuant.find).mockReturnValue(chainLean([]) as any);
    vi.mocked(Lot.find).mockReturnValue(chainSelectLean([]) as any);
    vi.mocked(StockMove.find).mockResolvedValue([] as any);
    vi.mocked(StockMove.create).mockResolvedValue({ _id: oid() } as any);
    vi.mocked(extensionManager.emit).mockResolvedValue(undefined as any);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // reserveStockForOrder / 在庫引当
  // ══════════════════════════════════════════════════════════════════════════
  describe('reserveStockForOrder / 在庫引当', () => {

    // ──────────────────────────────────────────────────────────────────────
    // 前提条件エラーのテスト / 前提条件エラーのテスト
    // ──────────────────────────────────────────────────────────────────────

    it('VIRTUAL/CUSTOMER ロケーションが存在しない場合はエラーを返すこと / VIRTUAL/CUSTOMERが存在しない場合', async () => {
      // VIRTUAL/CUSTOMER ロケーションが未作成の場合 / VIRTUAL/CUSTOMERが存在しない場合
      vi.mocked(Location.findOne).mockReturnValue(chainLean(null) as any);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 5 },
      ]);

      // エラーメッセージが含まれること / エラーメッセージが含まれること
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('VIRTUAL/CUSTOMER');
    });

    it('商品マスタが未登録の場合はエラーを記録してスキップすること / 商品マスタ未登録の場合', async () => {
      // 商品マスタが見つからない場合 / 商品マスタが見つからない場合
      vi.mocked(Product.find).mockReturnValue(chainLean([]) as any);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-UNKNOWN', inputSku: 'SKU-UNKNOWN', quantity: 5 },
      ]);

      // 引当なし、エラーあり / 引当なし、エラーあり
      expect(result.reservations).toHaveLength(0);
      expect(result.errors.some(e => e.includes('SKU-UNKNOWN'))).toBe(true);
    });

    it('inventoryEnabled=false の商品はスキップしてエラーを記録すること / 在庫管理無効商品をスキップ', async () => {
      // 在庫管理が無効な商品 / 在庫管理が無効な商品
      const productId = oid();
      setupProduct(productId, { sku: 'SKU-NO-INV', inventoryEnabled: false });

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-NO-INV', inputSku: 'SKU-NO-INV', quantity: 3 },
      ]);

      expect(result.reservations).toHaveLength(0);
      expect(result.errors.some(e => e.includes('SKU-NO-INV'))).toBe(true);
    });

    it('数量が0以下の場合はスキップすること / 数量0以下をスキップ', async () => {
      const productId = oid();
      setupProduct(productId);
      setupQuantsNoLot([makeQuant({ productId, quantity: 10, reservedQuantity: 0 })]);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 0 },
      ]);

      // quantity=0 はスキップされる、StockMoveが作成されない / quantity=0はスキップ
      expect(StockMove.create).not.toHaveBeenCalled();
      expect(result.reservations).toHaveLength(0);
    });

    // ──────────────────────────────────────────────────────────────────────
    // 引当成功のテスト / 引当成功テスト
    // ──────────────────────────────────────────────────────────────────────

    it('在庫が十分な場合は全量引当できること / 在庫十分の場合は全量引当', async () => {
      const productId = oid();
      const locationId = oid();
      const quant = makeQuant({ productId, locationId, quantity: 20, reservedQuantity: 0 });

      setupProduct(productId);
      setupQuantsNoLot([quant]);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 10 },
      ]);

      // 引当が作成されること / 引当が作成されること
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].quantity).toBe(10);
      // StockQuantが原子的に更新されること（TOCTOU防止）/ StockQuantが原子的に更新される
      expect(StockQuant.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: quant._id, $expr: expect.any(Object) }),
        { $inc: { reservedQuantity: 10 } },
      );
    });

    it('在庫不足の場合は可能な分だけ引当してエラーを記録すること / 在庫不足の場合', async () => {
      const productId = oid();
      const quant = makeQuant({ productId, quantity: 3, reservedQuantity: 0 });

      setupProduct(productId);
      setupQuantsNoLot([quant]);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 10 },
      ]);

      // 利用可能な3個だけ引当 / 利用可能な3個だけ引当
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].quantity).toBe(3);
      // 不足分7個のエラーが記録される / 不足分7個のエラーが記録される
      expect(result.errors.some(e => e.includes('7'))).toBe(true);
    });

    it('在庫が全くない場合は引当なしでエラーを返すこと / 在庫ゼロの場合', async () => {
      const productId = oid();

      setupProduct(productId);
      // 空の在庫 / 空の在庫
      setupQuantsNoLot([]);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 5 },
      ]);

      expect(result.reservations).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('在庫不足');
    });

    it('引当済み在庫は利用可能量の計算から除外すること / reservedQuantityを差し引く', async () => {
      const productId = oid();
      // 10個あるが5個は既に引当済み → 実際は5個のみ利用可能 / 10個中5個引当済み
      const quant = makeQuant({ productId, quantity: 10, reservedQuantity: 5 });

      setupProduct(productId);
      setupQuantsNoLot([quant]);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 8 },
      ]);

      // 利用可能は5個 → 5個引当、3個不足 / 利用可能は5個
      expect(result.reservations[0].quantity).toBe(5);
      expect(result.errors.some(e => e.includes('3'))).toBe(true);
    });

    // ──────────────────────────────────────────────────────────────────────
    // FEFO ソートのテスト / FEFO ソートのテスト
    // ──────────────────────────────────────────────────────────────────────

    it('FEFO: 賞味期限が近いロットから先に引当すること / FEFO先期限先出', async () => {
      const productId = oid();
      const lotEarlier = oid();  // 期限が近い / 期限が近い
      const lotLater = oid();    // 期限が遠い / 期限が遠い

      const quantEarlier = makeQuant({ productId, lotId: lotEarlier, quantity: 5, reservedQuantity: 0 });
      const quantLater = makeQuant({ productId, lotId: lotLater, quantity: 5, reservedQuantity: 0 });

      const lots = [
        { _id: lotEarlier, lotNumber: 'LOT-EARLY', expiryDate: new Date('2026-04-01') },
        { _id: lotLater, lotNumber: 'LOT-LATE', expiryDate: new Date('2026-12-31') },
      ];

      setupProduct(productId);
      // 意図的に遠い期限から返す（FEFOソートで近い方が先になることを確認）
      vi.mocked(StockQuant.find).mockReturnValue(chainLean([quantLater, quantEarlier]) as any);
      vi.mocked(Lot.find).mockReturnValue(chainSelectLean(lots) as any);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 3 },
      ]);

      // 期限の近いロットから引当されること / 期限の近いロットから引当
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].lotId).toBe(String(lotEarlier));
    });

    it('FEFO: 有期限ロット → 無期限ロット → ロットなしの順で引当すること / FEFO優先順位', async () => {
      const productId = oid();
      const lotWithExpiry = oid();    // 有期限 / 有期限
      const lotNoExpiry = oid();      // 無期限 / 無期限

      const noLotQuant = makeQuant({ productId, quantity: 5, reservedQuantity: 0 });
      const quantWithExpiry = makeQuant({ productId, lotId: lotWithExpiry, quantity: 5, reservedQuantity: 0 });
      const quantNoExpiry = makeQuant({ productId, lotId: lotNoExpiry, quantity: 5, reservedQuantity: 0 });

      const lots = [
        { _id: lotWithExpiry, lotNumber: 'LOT-EXP', expiryDate: new Date('2026-06-01') },
        { _id: lotNoExpiry, lotNumber: 'LOT-NO-EXP', expiryDate: null },
      ];

      setupProduct(productId);
      // ロットなし → 無期限 → 有期限の順で返す（ソートで逆になる）/ ソート確認
      vi.mocked(StockQuant.find).mockReturnValue(
        chainLean([noLotQuant, quantNoExpiry, quantWithExpiry]) as any,
      );
      vi.mocked(Lot.find).mockReturnValue(chainSelectLean(lots) as any);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 3 },
      ]);

      // 有期限ロットから先に引当されること / 有期限ロットから先に引当
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].lotId).toBe(String(lotWithExpiry));
    });

    it('非アクティブロット（lotsMapに存在しない）はスキップすること / 非アクティブロットをスキップ', async () => {
      const productId = oid();
      const inactiveLotId = oid();  // アクティブでないロット / アクティブでないロット
      const activeLotId = oid();    // アクティブなロット / アクティブなロット

      const quantInactive = makeQuant({ productId, lotId: inactiveLotId, quantity: 10, reservedQuantity: 0 });
      const quantActive = makeQuant({ productId, lotId: activeLotId, quantity: 5, reservedQuantity: 0 });

      // activeLotIdのみlotsMapに含まれる（非アクティブは除外）
      const lots = [
        { _id: activeLotId, lotNumber: 'LOT-ACTIVE', expiryDate: null },
      ];

      setupProduct(productId);
      vi.mocked(StockQuant.find).mockReturnValue(chainLean([quantInactive, quantActive]) as any);
      vi.mocked(Lot.find).mockReturnValue(chainSelectLean(lots) as any);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 3 },
      ]);

      // アクティブロットのみ引当される / アクティブロットのみ引当
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].lotId).toBe(String(activeLotId));
    });

    it('複数在庫から分割して引当できること（部分引当）/ 複数ロケーションからの分割引当', async () => {
      const productId = oid();
      const loc1 = oid();
      const loc2 = oid();
      // 各ロケーション3個ずつ、合計6個 / 各ロケーション3個ずつ
      const quant1 = makeQuant({ productId, locationId: loc1, quantity: 3, reservedQuantity: 0 });
      const quant2 = makeQuant({ productId, locationId: loc2, quantity: 3, reservedQuantity: 0 });

      setupProduct(productId);
      setupQuantsNoLot([quant1, quant2]);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 5 },
      ]);

      // 2つの引当が作成される（3+2） / 2つの引当が作成される
      expect(result.reservations).toHaveLength(2);
      const total = result.reservations.reduce((sum, r) => sum + r.quantity, 0);
      expect(total).toBe(5);
    });

    it('複数商品の一括引当が正しく動作すること / 複数商品の一括引当', async () => {
      const productId1 = oid();
      const productId2 = oid();
      const quant1 = makeQuant({ productId: productId1, quantity: 10, reservedQuantity: 0 });
      const quant2 = makeQuant({ productId: productId2, quantity: 10, reservedQuantity: 0 });

      vi.mocked(Product.find).mockReturnValue(
        chainLean([
          { _id: productId1, sku: 'SKU-001', name: '商品A', inventoryEnabled: true },
          { _id: productId2, sku: 'SKU-002', name: '商品B', inventoryEnabled: true },
        ]) as any,
      );
      // 2商品分の在庫 / 2商品分の在庫
      vi.mocked(StockQuant.find).mockReturnValue(chainLean([quant1, quant2]) as any);
      vi.mocked(Lot.find).mockReturnValue(chainSelectLean([]) as any);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 3 },
        { productSku: 'SKU-002', inputSku: 'SKU-002', quantity: 4 },
      ]);

      // 2商品分の引当が作成される / 2商品分の引当が作成される
      expect(result.reservations).toHaveLength(2);
    });

    it('productIdで商品を解決できること / productIdによる商品解決', async () => {
      const productId = oid();
      const quant = makeQuant({ productId, quantity: 10, reservedQuantity: 0 });

      vi.mocked(Product.find).mockReturnValue(
        chainLean([{ _id: productId, sku: 'SKU-001', name: 'テスト商品', inventoryEnabled: true }]) as any,
      );
      setupQuantsNoLot([quant]);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productId: String(productId), inputSku: 'SKU-001', quantity: 5 },
      ]);

      expect(result.reservations).toHaveLength(1);
    });

    it('引当成功時にSTOCK_RESERVEDイベントを発火すること / STOCK_RESERVEDイベント発火', async () => {
      const productId = oid();
      const quant = makeQuant({ productId, quantity: 10, reservedQuantity: 0 });

      setupProduct(productId);
      setupQuantsNoLot([quant]);

      await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 5 },
      ]);

      // 拡張システムイベントが発火されること / 拡張システムイベントが発火
      expect(extensionManager.emit).toHaveBeenCalledWith(
        'stock.reserved',
        expect.objectContaining({ orderId: 'order-1', orderNumber: 'SH-001' }),
      );
    });

    it('引当なしの場合はSTOCK_RESERVEDイベントを発火しないこと / 引当なし時はイベント不発火', async () => {
      // 商品なし（引当ゼロ）/ 商品なし
      vi.mocked(Product.find).mockReturnValue(chainLean([]) as any);

      await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-NONE', inputSku: 'SKU-NONE', quantity: 5 },
      ]);

      expect(extensionManager.emit).not.toHaveBeenCalled();
    });

    it('商品リストが空の場合は空の結果を返すこと / 空商品リストの処理', async () => {
      const result = await reserveStockForOrder('order-1', 'SH-001', []);

      expect(result.reservations).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.success).toBe(true);
    });

    it('ロットなし在庫はlastMovedAtの早い順（FIFO相当）で引当すること / ロットなしFIFO', async () => {
      const productId = oid();
      const older = makeQuant({
        productId, quantity: 5, reservedQuantity: 0,
        lastMovedAt: new Date('2026-01-01'),  // 古い在庫 / 古い在庫
      });
      const newer = makeQuant({
        productId, quantity: 5, reservedQuantity: 0,
        lastMovedAt: new Date('2026-03-01'),  // 新しい在庫 / 新しい在庫
      });

      setupProduct(productId);
      // 新しい順で返す（ソートで古い順になる）/ 新しい順で返す
      setupQuantsNoLot([newer, older]);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 3 },
      ]);

      // 古い在庫（older）から引当されること / 古い在庫から引当
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].quantId).toBe(String(older._id));
    });

    it('StockMoveが正しい属性で作成されること / StockMoveの属性確認', async () => {
      const productId = oid();
      const locationId = oid();
      const quant = makeQuant({ productId, locationId, quantity: 10, reservedQuantity: 0 });

      setupProduct(productId, { sku: 'SKU-001', name: 'テスト商品' });
      setupQuantsNoLot([quant]);

      await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 5 },
      ]);

      // StockMoveが正しい属性で作成されること / StockMoveが正しい属性で作成
      expect(StockMove.create).toHaveBeenCalledWith(
        expect.objectContaining({
          moveType: 'outbound',
          state: 'confirmed',
          referenceType: 'shipment-order',
          referenceId: 'order-1',
          referenceNumber: 'SH-001',
          quantity: 5,
        }),
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // unreserveStockForOrder / 引当解除（引当キャンセル）
  // ══════════════════════════════════════════════════════════════════════════
  describe('unreserveStockForOrder / 引当解除', () => {

    it('確定済み移動がない場合は0を返すこと / 移動なしで0を返す', async () => {
      vi.mocked(StockMove.find).mockResolvedValue([] as any);

      const result = await unreserveStockForOrder('order-nonexistent');

      expect(result.cancelledCount).toBe(0);
      // bulkWrite/updateMany は呼ばれないこと / bulkWrite/updateManyは呼ばれない
      expect(StockQuant.bulkWrite).not.toHaveBeenCalled();
      expect(StockMove.updateMany).not.toHaveBeenCalled();
    });

    it('確定済み移動が存在する場合はキャンセルして引当を解放すること / 引当解除の実行', async () => {
      const productId = oid();
      const fromLocationId = oid();
      const move1 = makeMove({ productId, fromLocationId, quantity: 5 });
      const move2 = makeMove({ productId, fromLocationId, quantity: 3 });

      vi.mocked(StockMove.find).mockResolvedValue([move1, move2] as any);

      const result = await unreserveStockForOrder('order-1');

      expect(result.cancelledCount).toBe(2);
      // StockQuantの引当を解放すること / StockQuantの引当を解放
      expect(StockQuant.bulkWrite).toHaveBeenCalledOnce();
      // StockMoveをcancelledにすること / StockMoveをcancelledに更新
      expect(StockMove.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [move1._id, move2._id] } },
        { $set: { state: 'cancelled' } },
      );
    });

    it('ロット付き移動も正しく引当解除されること / ロット付き移動の引当解除', async () => {
      const productId = oid();
      const fromLocationId = oid();
      const lotId = oid();
      const move = makeMove({ productId, fromLocationId, lotId, quantity: 5 });

      vi.mocked(StockMove.find).mockResolvedValue([move] as any);

      const result = await unreserveStockForOrder('order-1');

      expect(result.cancelledCount).toBe(1);

      // bulkWriteにlotIdが含まれること / bulkWriteにlotIdが含まれる
      const bulkWriteCall = vi.mocked(StockQuant.bulkWrite).mock.calls[0][0] as any[];
      expect(bulkWriteCall[0].updateOne.filter.lotId).toBe(lotId);
    });

    it('ロットなし移動のbulkWriteでlotIdがundefinedであること / ロットなし移動のbulkWrite', async () => {
      const productId = oid();
      const fromLocationId = oid();
      // lotIdなしの移動 / lotIdなしの移動
      const move = makeMove({ productId, fromLocationId, quantity: 5 });

      vi.mocked(StockMove.find).mockResolvedValue([move] as any);

      await unreserveStockForOrder('order-1');

      const bulkWriteCall = vi.mocked(StockQuant.bulkWrite).mock.calls[0][0] as any[];
      // lotIdがundefinedであること / lotIdがundefined
      expect(bulkWriteCall[0].updateOne.filter.lotId).toBeUndefined();
    });

    it('引当解除時にSTOCK_RELEASEDイベントを発火すること / STOCK_RELEASEDイベント発火', async () => {
      const move = makeMove();
      vi.mocked(StockMove.find).mockResolvedValue([move] as any);

      await unreserveStockForOrder('order-1');

      expect(extensionManager.emit).toHaveBeenCalledWith(
        'stock.released',
        expect.objectContaining({ orderId: 'order-1', cancelledCount: 1 }),
      );
    });

    it('移動なしの場合はSTOCK_RELEASEDイベントを発火しないこと / 移動なし時はイベント不発火', async () => {
      vi.mocked(StockMove.find).mockResolvedValue([] as any);

      await unreserveStockForOrder('order-1');

      expect(extensionManager.emit).not.toHaveBeenCalled();
    });

    it('bulkWriteでreservedQuantityを減算すること / reservedQuantityのデクリメント', async () => {
      const productId = oid();
      const fromLocationId = oid();
      const move = makeMove({ productId, fromLocationId, quantity: 7 });

      vi.mocked(StockMove.find).mockResolvedValue([move] as any);

      await unreserveStockForOrder('order-1');

      const bulkWriteCall = vi.mocked(StockQuant.bulkWrite).mock.calls[0][0] as any[];
      // reservedQuantityが-7されること / reservedQuantityが-7される
      expect(bulkWriteCall[0].updateOne.update.$inc.reservedQuantity).toBe(-7);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // completeStockForOrder / 出庫完了（在庫消込）
  // ══════════════════════════════════════════════════════════════════════════
  describe('completeStockForOrder / 出庫完了', () => {

    it('確定済み移動がない場合は0を返すこと / 移動なしで0を返す', async () => {
      vi.mocked(StockMove.find).mockResolvedValue([] as any);

      const result = await completeStockForOrder('order-nonexistent');

      expect(result.movedCount).toBe(0);
      expect(StockQuant.bulkWrite).not.toHaveBeenCalled();
      expect(StockMove.updateMany).not.toHaveBeenCalled();
    });

    it('確定済み移動が存在する場合は在庫を消込むこと / 在庫消込の実行', async () => {
      const productId = oid();
      const fromLocationId = oid();
      const move1 = makeMove({ productId, fromLocationId, quantity: 5 });
      const move2 = makeMove({ productId, fromLocationId, quantity: 3 });

      vi.mocked(StockMove.find).mockResolvedValue([move1, move2] as any);

      const result = await completeStockForOrder('order-1');

      expect(result.movedCount).toBe(2);
      // StockQuantを一括更新すること / StockQuantを一括更新
      expect(StockQuant.bulkWrite).toHaveBeenCalledOnce();
      // StockMoveをdoneにすること / StockMoveをdoneに更新
      expect(StockMove.updateMany).toHaveBeenCalledWith(
        { _id: { $in: [move1._id, move2._id] } },
        expect.objectContaining({ $set: expect.objectContaining({ state: 'done' }) }),
      );
    });

    it('出庫完了時にquantityとreservedQuantityを両方減算すること / quantity/reservedQuantity両方減算', async () => {
      const productId = oid();
      const fromLocationId = oid();
      const move = makeMove({ productId, fromLocationId, quantity: 8 });

      vi.mocked(StockMove.find).mockResolvedValue([move] as any);

      await completeStockForOrder('order-1');

      const bulkWriteCall = vi.mocked(StockQuant.bulkWrite).mock.calls[0][0] as any[];
      const updateOp = bulkWriteCall[0].updateOne.update;
      // quantityとreservedQuantityが両方-8されること / quantity/reservedQuantityが-8される
      expect(updateOp.$inc.quantity).toBe(-8);
      expect(updateOp.$inc.reservedQuantity).toBe(-8);
    });

    it('ロット付き移動の出庫完了が正しく動作すること / ロット付き移動の出庫完了', async () => {
      const productId = oid();
      const fromLocationId = oid();
      const lotId = oid();
      const move = makeMove({ productId, fromLocationId, lotId, quantity: 5 });

      vi.mocked(StockMove.find).mockResolvedValue([move] as any);

      const result = await completeStockForOrder('order-1');

      expect(result.movedCount).toBe(1);

      // bulkWriteのfilterにlotIdが含まれること / bulkWriteのfilterにlotIdが含まれる
      const bulkWriteCall = vi.mocked(StockQuant.bulkWrite).mock.calls[0][0] as any[];
      expect(bulkWriteCall[0].updateOne.filter.lotId).toBe(lotId);
    });

    it('出庫完了時にINVENTORY_CHANGEDイベントを発火すること / INVENTORY_CHANGEDイベント発火', async () => {
      const move = makeMove();
      vi.mocked(StockMove.find).mockResolvedValue([move] as any);

      await completeStockForOrder('order-1');

      expect(extensionManager.emit).toHaveBeenCalledWith(
        'inventory.changed',
        expect.objectContaining({ orderId: 'order-1', type: 'outbound', movedCount: 1 }),
      );
    });

    it('移動なしの場合はINVENTORY_CHANGEDイベントを発火しないこと / 移動なし時はイベント不発火', async () => {
      vi.mocked(StockMove.find).mockResolvedValue([] as any);

      await completeStockForOrder('order-1');

      expect(extensionManager.emit).not.toHaveBeenCalled();
    });

    it('複数移動の出庫完了でlastMovedAtが更新されること / lastMovedAt更新', async () => {
      const move1 = makeMove({ quantity: 5 });
      const move2 = makeMove({ quantity: 3 });

      vi.mocked(StockMove.find).mockResolvedValue([move1, move2] as any);

      await completeStockForOrder('order-1');

      const bulkWriteCall = vi.mocked(StockQuant.bulkWrite).mock.calls[0][0] as any[];
      // lastMovedAtが設定されること / lastMovedAtが設定される
      expect(bulkWriteCall[0].updateOne.update.$set.lastMovedAt).toBeInstanceOf(Date);
    });

    it('StockMoveのexecutedAtが設定されること / executedAt設定', async () => {
      const move = makeMove();
      vi.mocked(StockMove.find).mockResolvedValue([move] as any);

      await completeStockForOrder('order-1');

      const updateManyCall = vi.mocked(StockMove.updateMany).mock.calls[0][1] as any;
      // executedAtが設定されること / executedAtが設定される
      expect(updateManyCall.$set.executedAt).toBeInstanceOf(Date);
    });

    it('単一移動でも正しく消込されること / 単一移動の消込', async () => {
      const move = makeMove({ quantity: 1 });
      vi.mocked(StockMove.find).mockResolvedValue([move] as any);

      const result = await completeStockForOrder('order-1');

      expect(result.movedCount).toBe(1);
      expect(StockQuant.bulkWrite).toHaveBeenCalledOnce();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // エッジケース / エッジケース
  // ══════════════════════════════════════════════════════════════════════════
  describe('edge cases / エッジケース', () => {

    it('reserveStockForOrder: 拡張フックがエラーを投げてもメイン処理は継続すること / フックエラーを非ブロッキング処理', async () => {
      const productId = oid();
      const quant = makeQuant({ productId, quantity: 10, reservedQuantity: 0 });

      setupProduct(productId);
      setupQuantsNoLot([quant]);
      // 拡張フックがエラーを投げる / 拡張フックがエラーを投げる
      vi.mocked(extensionManager.emit).mockRejectedValue(new Error('hook error'));

      // エラーが伝播しないこと / エラーが伝播しない
      await expect(
        reserveStockForOrder('order-1', 'SH-001', [
          { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 5 },
        ]),
      ).resolves.toBeDefined();
    });

    it('unreserveStockForOrder: 拡張フックがエラーを投げてもキャンセル結果を返すこと / フックエラーを非ブロッキング処理', async () => {
      const move = makeMove();
      vi.mocked(StockMove.find).mockResolvedValue([move] as any);
      vi.mocked(extensionManager.emit).mockRejectedValue(new Error('hook error'));

      const result = await unreserveStockForOrder('order-1');
      expect(result.cancelledCount).toBe(1);
    });

    it('completeStockForOrder: 拡張フックがエラーを投げても完了結果を返すこと / フックエラーを非ブロッキング処理', async () => {
      const move = makeMove();
      vi.mocked(StockMove.find).mockResolvedValue([move] as any);
      vi.mocked(extensionManager.emit).mockRejectedValue(new Error('hook error'));

      const result = await completeStockForOrder('order-1');
      expect(result.movedCount).toBe(1);
    });

    it('reserveStockForOrder: _allSkuで商品を解決できること / _allSkuによる商品解決', async () => {
      const productId = oid();
      const quant = makeQuant({ productId, quantity: 10, reservedQuantity: 0 });

      // _allSku経由で解決できる商品 / _allSku経由で解決できる商品
      vi.mocked(Product.find).mockReturnValue(
        chainLean([{
          _id: productId,
          sku: 'SKU-MAIN',
          _allSku: ['SKU-ALIAS', 'SKU-001'],
          name: 'テスト商品',
          inventoryEnabled: true,
        }]) as any,
      );
      setupQuantsNoLot([quant]);

      // エイリアスSKUで引当を試みる / エイリアスSKUで引当を試みる
      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-ALIAS', inputSku: 'SKU-ALIAS', quantity: 5 },
      ]);

      expect(result.reservations).toHaveLength(1);
    });

    it('reserveStockForOrder: 利用可能在庫ゼロのquantをスキップすること / 利用可能在庫ゼロをスキップ', async () => {
      const productId = oid();
      // 全量引当済み（利用可能0）と利用可能ありの2つ / 全量引当済みと利用可能あり
      const quantFull = makeQuant({ productId, quantity: 5, reservedQuantity: 5 });  // available=0
      const quantFree = makeQuant({ productId, quantity: 5, reservedQuantity: 0 });  // available=5

      setupProduct(productId);
      setupQuantsNoLot([quantFull, quantFree]);

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-001', inputSku: 'SKU-001', quantity: 3 },
      ]);

      // 利用可能なquantFreeからのみ引当される / 利用可能なquantFreeからのみ引当
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].quantId).toBe(String(quantFree._id));
    });

    it('reserveStockForOrder: 全商品がinventoryEnabled=falseの場合はreservationsが空で返ること / 全商品管理無効', async () => {
      const productId1 = oid();
      const productId2 = oid();

      vi.mocked(Product.find).mockReturnValue(
        chainLean([
          { _id: productId1, sku: 'SKU-A', name: '商品A', inventoryEnabled: false },
          { _id: productId2, sku: 'SKU-B', name: '商品B', inventoryEnabled: false },
        ]) as any,
      );

      const result = await reserveStockForOrder('order-1', 'SH-001', [
        { productSku: 'SKU-A', inputSku: 'SKU-A', quantity: 5 },
        { productSku: 'SKU-B', inputSku: 'SKU-B', quantity: 3 },
      ]);

      // 引当なし / 引当なし
      expect(result.reservations).toHaveLength(0);
      // 2商品分のエラーあり / 2商品分のエラーあり
      expect(result.errors).toHaveLength(2);
    });

    it('unreserveStockForOrder: 複数移動がある場合にbulkWriteのオペレーション数が一致すること / bulkWriteオペレーション数', async () => {
      const moves = [
        makeMove({ quantity: 5 }),
        makeMove({ quantity: 3 }),
        makeMove({ quantity: 7 }),
      ];
      vi.mocked(StockMove.find).mockResolvedValue(moves as any);

      await unreserveStockForOrder('order-1');

      const bulkWriteCall = vi.mocked(StockQuant.bulkWrite).mock.calls[0][0] as any[];
      // 3つの移動に対して3つのbulkWriteオペレーション / 3つのbulkWriteオペレーション
      expect(bulkWriteCall).toHaveLength(3);
    });

    it('completeStockForOrder: 複数移動のbulkWriteオペレーション数が一致すること / bulkWriteオペレーション数', async () => {
      const moves = [makeMove({ quantity: 2 }), makeMove({ quantity: 4 })];
      vi.mocked(StockMove.find).mockResolvedValue(moves as any);

      await completeStockForOrder('order-1');

      const bulkWriteCall = vi.mocked(StockQuant.bulkWrite).mock.calls[0][0] as any[];
      // 2つの移動に対して2つのbulkWriteオペレーション / 2つのbulkWriteオペレーション
      expect(bulkWriteCall).toHaveLength(2);
    });
  });
});
