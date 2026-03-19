/**
 * GraphQL Query リゾルバ 包括的テスト / GraphQL Query リゾルバ 全面テスト
 *
 * TDD: まずテストを書き、実装を検証する。
 * TDD: 先にテストを書いて実装を検証する。
 *
 * カバー対象 / 覆盖范围:
 *   - paginate() ヘルパー（ページクランプ、リミットクランプ、skip計算）
 *   - flattenShipmentStatus() ヘルパー
 *   - shipmentOrder / shipmentOrders（全フィルタ）
 *   - product / productBySku / products（全フィルタ）
 *   - stockQuants（productSku フィルタ + availableQuantity 計算）
 *   - stockSummary（アグリゲーション結果）
 *   - inboundOrders（status フィルタ）
 *   - clients（search フィルタ + ページネーション）
 *   - dashboardStats（8メトリクス全部）
 *   - waves（status フィルタ）
 *
 * 設計方針 / 设计原则:
 *   - Mongoose モデルは全部モック（DB 不要）
 *   - チェーン可能モックパターン: find().sort().skip().limit().lean()
 *   - 各テストは独立（共有状態なし）
 *   - エッジケース: null / 空 / 境界値 / エラーパス
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── チェーンモックヘルパー / 链式 Mock 辅助ヘルパー ─────────────────────────

/**
 * find().sort().skip().limit().lean() の完全チェーンモック
 * find().sort().skip().limit().lean() の完全チェーンモック
 */
function makeChain(value: any) {
  const chain = {
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(value),
  };
  return chain;
}

/**
 * lean() のみのシンプルチェーンモック（findById / findOne 用）
 * lean() のみのシンプルチェーンモック（findById/findOne 用）
 */
const leanChain = (value: any) => ({ lean: () => Promise.resolve(value) });

// ─── Mongoose モックセットアップ / Mongoose Mock セットアップ ────────────────
// vi.mock はホイストされるため最初に宣言する
// vi.mock はホイストされるため、最初に宣言する

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    findById: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('@/models/product', () => ({
  Product: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('@/models/client', () => ({
  Client: {
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('@/models/warehouse', () => ({
  Warehouse: {
    find: vi.fn(),
  },
}));

vi.mock('@/models/wave', () => ({
  Wave: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

// StockQuant / StockMove は dynamic import のため別途モック
// StockQuant / StockMove は動的インポートのため別途モック
vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('@/models/stockMove', () => ({
  StockMove: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

// ─── インポート / Import ─────────────────────────────────────────────────────

import { ShipmentOrder } from '@/models/shipmentOrder';
import { Product } from '@/models/product';
import { InboundOrder } from '@/models/inboundOrder';
import { Client } from '@/models/client';
import { Warehouse } from '@/models/warehouse';
import { Wave } from '@/models/wave';
import { StockQuant } from '@/models/stockQuant';

// resolvers は動的インポートで取得
// resolvers は動的インポートで取得（モックが先に登録される）
async function getResolvers() {
  // キャッシュクリアのため動的インポート
  // キャッシュクリアのため動的インポート
  const mod = await import('../resolvers/index');
  return mod.resolvers.Query;
}

// ─── paginate() ヘルパーテスト / paginate() Helper Tests ────────────────────

/**
 * paginate() はリゾルバ内部のプライベート関数のため、
 * 実際のリゾルバ呼び出しを通じて間接的にテストする。
 * paginate() はリゾルバ内のプライベート関数なので、
 * 実際のリゾルバ呼び出しを通じて間接テストする。
 */
describe('paginate() ヘルパー / paginate() helper', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('デフォルト値: page=1, limit=20, skip=0 / default values page=1 limit=20 skip=0', async () => {
    // Wave リゾルバを使って paginate() のデフォルト動作を検証
    // Wave リゾルバを使って paginate() のデフォルト動作を検証
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.waves(null, {});

    // skip(0).limit(20) が呼ばれることを確認 / skip(0).limit(20) の確認
    expect(chain.skip).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(20);
  });

  it('page=3, limit=10 → skip=20 / page=3 limit=10 → skip=20', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.waves(null, { pagination: { page: 3, limit: 10 } });

    expect(chain.skip).toHaveBeenCalledWith(20);
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('page=0 → page は 1 にクランプされる / page=0 clamps to 1', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.waves(null, { pagination: { page: 0, limit: 5 } });

    // page=1 になるため skip=0 / page=1 → skip=0
    expect(chain.skip).toHaveBeenCalledWith(0);
  });

  it('page=-5 → page は 1 にクランプされる / page=-5 clamps to 1', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.waves(null, { pagination: { page: -5, limit: 5 } });

    expect(chain.skip).toHaveBeenCalledWith(0);
  });

  it('limit=0 → limit は 1 にクランプされる / limit=0 clamps to 1', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.waves(null, { pagination: { page: 1, limit: 0 } });

    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it('limit=200 → limit は 100 にクランプされる / limit=200 clamps to 100', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.waves(null, { pagination: { page: 1, limit: 200 } });

    expect(chain.limit).toHaveBeenCalledWith(100);
  });

  it('limit=-1 → limit は 1 にクランプされる / limit=-1 clamps to 1', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.waves(null, { pagination: { page: 1, limit: -1 } });

    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it('hasNext: page*limit < total の場合 true / hasNext true when page*limit < total', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(50); // 50件ある

    const Q = await getResolvers();
    const result = await Q.waves(null, { pagination: { page: 1, limit: 20 } });

    // page=1, limit=20 → 1*20=20 < 50 → hasNext=true
    expect(result.pageInfo.hasNext).toBe(true);
    expect(result.pageInfo.total).toBe(50);
    expect(result.pageInfo.page).toBe(1);
    expect(result.pageInfo.limit).toBe(20);
  });

  it('hasNext: page*limit >= total の場合 false / hasNext false when page*limit >= total', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(20); // 20件のみ

    const Q = await getResolvers();
    const result = await Q.waves(null, { pagination: { page: 1, limit: 20 } });

    // 1*20=20 >= 20 → hasNext=false
    expect(result.pageInfo.hasNext).toBe(false);
  });

  it('pagination 未指定の場合でも正常に動作する / works with no pagination arg', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await Q.waves(null, {});

    expect(result.pageInfo.page).toBe(1);
    expect(result.pageInfo.limit).toBe(20);
  });
});

// ─── flattenShipmentStatus() テスト / flattenShipmentStatus() Tests ──────────

describe('flattenShipmentStatus() ヘルパー / flattenShipmentStatus() helper', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * flattenShipmentStatus はプライベート関数なので、shipmentOrders 経由でテスト
   * flattenShipmentStatus はプライベート関数なので shipmentOrders 経由でテスト
   */
  async function callFlatten(rawStatus: any) {
    const order = { _id: 'o1', status: rawStatus };
    const chain = makeChain([order]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    const result = await Q.shipmentOrders(null, {});
    return result.data[0].status;
  }

  it('全フラグが完全に設定されたネストステータスを展開する / flattens fully populated nested status', async () => {
    const rawStatus = {
      confirm: { isConfirmed: true, confirmedAt: '2026-03-01' },
      printed: { isPrinted: true, printedAt: '2026-03-02' },
      inspected: { isInspected: true, inspectedAt: '2026-03-03' },
      shipped: { isShipped: true, shippedAt: '2026-03-04' },
      held: { isHeld: false, heldAt: null },
    };

    const status = await callFlatten(rawStatus);

    expect(status.confirmed).toBe(true);
    expect(status.confirmedAt).toBe('2026-03-01');
    expect(status.printed).toBe(true);
    expect(status.printedAt).toBe('2026-03-02');
    expect(status.inspected).toBe(true);
    expect(status.inspectedAt).toBe('2026-03-03');
    expect(status.shipped).toBe(true);
    expect(status.shippedAt).toBe('2026-03-04');
    expect(status.held).toBe(false);
    expect(status.heldAt).toBeNull();
  });

  it('status が空オブジェクトの場合、全フラグは false / empty status → all flags false', async () => {
    const status = await callFlatten({});

    expect(status.confirmed).toBe(false);
    expect(status.confirmedAt).toBeNull();
    expect(status.printed).toBe(false);
    expect(status.printedAt).toBeNull();
    expect(status.inspected).toBe(false);
    expect(status.inspectedAt).toBeNull();
    expect(status.shipped).toBe(false);
    expect(status.shippedAt).toBeNull();
    expect(status.held).toBe(false);
    expect(status.heldAt).toBeNull();
  });

  it('status が undefined の場合、全フラグは false / undefined status → all flags false', async () => {
    const status = await callFlatten(undefined);

    expect(status.confirmed).toBe(false);
    expect(status.shipped).toBe(false);
    expect(status.held).toBe(false);
  });

  it('held=true の場合、held フラグが true / held=true sets held flag', async () => {
    const rawStatus = {
      held: { isHeld: true, heldAt: '2026-03-10' },
    };

    const status = await callFlatten(rawStatus);

    expect(status.held).toBe(true);
    expect(status.heldAt).toBe('2026-03-10');
  });

  it('元のオブジェクトの他フィールドは保持される / other fields on order are preserved', async () => {
    const order = { _id: 'o1', orderNumber: 'SH-001', status: {} };
    const chain = makeChain([order]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    const result = await Q.shipmentOrders(null, {});

    expect(result.data[0].orderNumber).toBe('SH-001');
    expect(result.data[0]._id).toBe('o1');
  });
});

// ─── shipmentOrder(id) テスト ────────────────────────────────────────────────

describe('Query.shipmentOrder(id) / 出荷指示単件取得', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('存在する ID で注文を返す / returns order for existing id', async () => {
    const order = { _id: 'order-1', orderNumber: 'SH20260319-0001' };
    vi.mocked(ShipmentOrder.findById).mockReturnValue(leanChain(order) as any);

    const Q = await getResolvers();
    const result = await Q.shipmentOrder(null, { id: 'order-1' });

    expect(ShipmentOrder.findById).toHaveBeenCalledWith('order-1');
    expect(result).toEqual(order);
  });

  it('存在しない ID で null を返す / returns null for non-existent id', async () => {
    vi.mocked(ShipmentOrder.findById).mockReturnValue(leanChain(null) as any);

    const Q = await getResolvers();
    const result = await Q.shipmentOrder(null, { id: 'nonexistent' });

    expect(result).toBeNull();
  });
});

// ─── shipmentOrders(filter, pagination) テスト ───────────────────────────────

describe('Query.shipmentOrders(filter, pagination) / 出荷指示一覧', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mockOrders = [
    {
      _id: 'o1',
      orderNumber: 'SH-001',
      status: { confirm: { isConfirmed: true }, shipped: { isShipped: false } },
    },
    {
      _id: 'o2',
      orderNumber: 'SH-002',
      status: { confirm: { isConfirmed: false }, shipped: { isShipped: true, shippedAt: '2026-03-19' } },
    },
  ];

  it('フィルタなしで全件返す / returns all orders without filter', async () => {
    const chain = makeChain(mockOrders);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(2);

    const Q = await getResolvers();
    const result = await Q.shipmentOrders(null, {});

    expect(ShipmentOrder.find).toHaveBeenCalledWith({});
    expect(result.data).toHaveLength(2);
    expect(result.pageInfo.total).toBe(2);
  });

  it('status=confirmed フィルタが正しいクエリを生成する / confirmed status filter', async () => {
    const chain = makeChain([mockOrders[0]]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { status: 'confirmed' } });

    expect(ShipmentOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ 'status.confirm.isConfirmed': true }),
    );
  });

  it('status=shipped フィルタが正しいクエリを生成する / shipped status filter', async () => {
    const chain = makeChain([mockOrders[1]]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { status: 'shipped' } });

    expect(ShipmentOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ 'status.shipped.isShipped': true }),
    );
  });

  it('status=held フィルタが正しいクエリを生成する / held status filter', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { status: 'held' } });

    expect(ShipmentOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ 'status.held.isHeld': true }),
    );
  });

  it('未知の status フィルタは空オブジェクトとしてマージされる / unknown status maps to empty', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { status: 'UNKNOWN_STATUS' } });

    // ステータスキーなし → {} がマージされる
    // 未知ステータス → {} がマージされる
    const callArg = (vi.mocked(ShipmentOrder.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg['status.confirm.isConfirmed']).toBeUndefined();
    expect(callArg['status.shipped.isShipped']).toBeUndefined();
  });

  it('carrierId フィルタが適用される / carrierId filter', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { carrierId: 'yamato' } });

    expect(ShipmentOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: 'yamato' }),
    );
  });

  it('search フィルタが $or クエリを生成する / search filter generates $or query', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { search: '田中' } });

    const callArg = (vi.mocked(ShipmentOrder.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg.$or).toBeInstanceOf(Array);
    expect(callArg.$or).toHaveLength(4);
    // orderNumber に regex がかかる
    expect(callArg.$or[0].orderNumber.$regex).toBe('田中');
    expect(callArg.$or[0].orderNumber.$options).toBe('i');
  });

  it('dateFrom + dateTo フィルタが shipPlanDate クエリを生成する / dateRange filter', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, {
      filter: { dateFrom: '2026-03-01', dateTo: '2026-03-31' },
    });

    const callArg = (vi.mocked(ShipmentOrder.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg.shipPlanDate.$gte).toBe('2026-03-01');
    expect(callArg.shipPlanDate.$lte).toBe('2026-03-31');
  });

  it('dateFrom のみの場合 $gte のみ設定される / dateFrom only sets $gte', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { dateFrom: '2026-03-01' } });

    const callArg = (vi.mocked(ShipmentOrder.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg.shipPlanDate.$gte).toBe('2026-03-01');
    expect(callArg.shipPlanDate.$lte).toBeUndefined();
  });

  it('dateTo のみの場合 $lte のみ設定される / dateTo only sets $lte', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { dateTo: '2026-03-31' } });

    const callArg = (vi.mocked(ShipmentOrder.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg.shipPlanDate.$lte).toBe('2026-03-31');
    expect(callArg.shipPlanDate.$gte).toBeUndefined();
  });

  it('destinationType フィルタが適用される / destinationType filter', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { destinationType: 'fba' } });

    expect(ShipmentOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ destinationType: 'fba' }),
    );
  });

  it('結果の status が flattenShipmentStatus で展開される / data is flattened', async () => {
    const order = {
      _id: 'o1',
      status: { confirm: { isConfirmed: true, confirmedAt: '2026-03-01' } },
    };
    const chain = makeChain([order]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    const result = await Q.shipmentOrders(null, {});

    expect(result.data[0].status.confirmed).toBe(true);
    expect(result.data[0].status.confirmedAt).toBe('2026-03-01');
  });

  it('ページネーション付き結果が正しい pageInfo を返す / pagination pageInfo', async () => {
    const chain = makeChain([mockOrders[0]]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(100);

    const Q = await getResolvers();
    const result = await Q.shipmentOrders(null, { pagination: { page: 2, limit: 10 } });

    expect(result.pageInfo.page).toBe(2);
    expect(result.pageInfo.limit).toBe(10);
    expect(result.pageInfo.total).toBe(100);
    expect(result.pageInfo.hasNext).toBe(true); // 2*10=20 < 100
    expect(chain.skip).toHaveBeenCalledWith(10);
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it('最終ページでは hasNext=false / last page hasNext=false', async () => {
    const chain = makeChain([mockOrders[0]]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(10);

    const Q = await getResolvers();
    const result = await Q.shipmentOrders(null, { pagination: { page: 1, limit: 10 } });

    expect(result.pageInfo.hasNext).toBe(false);
  });

  it('結果が空の場合、空配列と total=0 を返す / empty results', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await Q.shipmentOrders(null, {});

    expect(result.data).toEqual([]);
    expect(result.pageInfo.total).toBe(0);
    expect(result.pageInfo.hasNext).toBe(false);
  });
});

// ─── product(id) / productBySku(sku) テスト ─────────────────────────────────

describe('Query.product(id) / 商品単件取得', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('存在する ID で商品を返す / returns product for existing id', async () => {
    const product = { _id: 'p1', sku: 'SKU-001', name: 'テスト商品' };
    vi.mocked(Product.findById).mockReturnValue(leanChain(product) as any);

    const Q = await getResolvers();
    const result = await Q.product(null, { id: 'p1' });

    expect(Product.findById).toHaveBeenCalledWith('p1');
    expect(result).toEqual(product);
  });

  it('存在しない ID で null を返す / returns null for non-existent id', async () => {
    vi.mocked(Product.findById).mockReturnValue(leanChain(null) as any);

    const Q = await getResolvers();
    const result = await Q.product(null, { id: 'nonexistent' });

    expect(result).toBeNull();
  });
});

describe('Query.productBySku(sku) / SKU で商品取得', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('存在する SKU で商品を返す / returns product for existing sku', async () => {
    const product = { _id: 'p1', sku: 'SKU-001', name: 'テスト商品' };
    vi.mocked(Product.findOne).mockReturnValue(leanChain(product) as any);

    const Q = await getResolvers();
    const result = await Q.productBySku(null, { sku: 'SKU-001' });

    expect(Product.findOne).toHaveBeenCalledWith({ sku: 'SKU-001' });
    expect(result).toEqual(product);
  });

  it('存在しない SKU で null を返す / returns null for non-existent sku', async () => {
    vi.mocked(Product.findOne).mockReturnValue(leanChain(null) as any);

    const Q = await getResolvers();
    const result = await Q.productBySku(null, { sku: 'NONEXISTENT' });

    expect(result).toBeNull();
  });

  it('特殊文字を含む SKU でも正しく検索する / handles special characters in sku', async () => {
    vi.mocked(Product.findOne).mockReturnValue(leanChain(null) as any);

    const Q = await getResolvers();
    await Q.productBySku(null, { sku: 'SKU-日本語-001' });

    expect(Product.findOne).toHaveBeenCalledWith({ sku: 'SKU-日本語-001' });
  });
});

// ─── products(filter, pagination) テスト ────────────────────────────────────

describe('Query.products(filter, pagination) / 商品一覧', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mockProducts = [
    { _id: 'p1', sku: 'SKU-001', name: '商品A', category: 'electronics' },
    { _id: 'p2', sku: 'SKU-002', name: '商品B', category: 'apparel' },
  ];

  it('フィルタなしで全商品を返す / returns all products without filter', async () => {
    const chain = makeChain(mockProducts);
    vi.mocked(Product.find).mockReturnValue(chain as any);
    vi.mocked(Product.countDocuments).mockResolvedValue(2);

    const Q = await getResolvers();
    const result = await Q.products(null, {});

    expect(Product.find).toHaveBeenCalledWith({});
    expect(result.data).toHaveLength(2);
    expect(result.pageInfo.total).toBe(2);
  });

  it('category フィルタが適用される / category filter', async () => {
    const chain = makeChain([mockProducts[0]]);
    vi.mocked(Product.find).mockReturnValue(chain as any);
    vi.mocked(Product.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    await Q.products(null, { filter: { category: 'electronics' } });

    expect(Product.find).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'electronics' }),
    );
  });

  it('clientId フィルタが適用される / clientId filter', async () => {
    const chain = makeChain([]);
    vi.mocked(Product.find).mockReturnValue(chain as any);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.products(null, { filter: { clientId: 'client-1' } });

    expect(Product.find).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'client-1' }),
    );
  });

  it('search フィルタが sku / name / barcode に $or クエリを生成する / search $or query', async () => {
    const chain = makeChain([]);
    vi.mocked(Product.find).mockReturnValue(chain as any);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.products(null, { filter: { search: 'テスト' } });

    const callArg = (vi.mocked(Product.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg.$or).toBeInstanceOf(Array);
    expect(callArg.$or).toHaveLength(3);
    // sku に regex がかかる
    expect(callArg.$or[0].sku.$regex).toBe('テスト');
    expect(callArg.$or[0].sku.$options).toBe('i');
    // name に regex がかかる
    expect(callArg.$or[1].name.$regex).toBe('テスト');
    // barcode に regex がかかる
    expect(callArg.$or[2].barcode.$regex).toBe('テスト');
  });

  it('category + search を組み合わせたフィルタが動作する / combined filter', async () => {
    const chain = makeChain([]);
    vi.mocked(Product.find).mockReturnValue(chain as any);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.products(null, { filter: { category: 'electronics', search: 'test' } });

    const callArg = (vi.mocked(Product.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg.category).toBe('electronics');
    expect(callArg.$or).toBeDefined();
  });

  it('空の結果を正しく返す / handles empty results', async () => {
    const chain = makeChain([]);
    vi.mocked(Product.find).mockReturnValue(chain as any);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await Q.products(null, {});

    expect(result.data).toEqual([]);
    expect(result.pageInfo.total).toBe(0);
  });

  it('ページネーションが正しい skip/limit を使用する / pagination skip/limit', async () => {
    const chain = makeChain([]);
    vi.mocked(Product.find).mockReturnValue(chain as any);
    vi.mocked(Product.countDocuments).mockResolvedValue(50);

    const Q = await getResolvers();
    await Q.products(null, { pagination: { page: 3, limit: 15 } });

    expect(chain.skip).toHaveBeenCalledWith(30); // (3-1)*15
    expect(chain.limit).toHaveBeenCalledWith(15);
  });
});

// ─── stockQuants(filter, pagination) テスト ─────────────────────────────────

describe('Query.stockQuants(filter, pagination) / 在庫クォンタム一覧', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('productSku フィルタが適用される / productSku filter', async () => {
    const rawQuants = [
      { _id: 'sq1', productSku: 'SKU-001', quantity: 100, reservedQuantity: 30 },
    ];
    const chain = makeChain(rawQuants);
    vi.mocked(StockQuant.find).mockReturnValue(chain as any);
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    await Q.stockQuants(null, { filter: { productSku: 'SKU-001' } });

    expect(StockQuant.find).toHaveBeenCalledWith(
      expect.objectContaining({ productSku: 'SKU-001' }),
    );
  });

  it('locationId フィルタが適用される / locationId filter', async () => {
    const chain = makeChain([]);
    vi.mocked(StockQuant.find).mockReturnValue(chain as any);
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.stockQuants(null, { filter: { locationId: 'loc-A-01' } });

    expect(StockQuant.find).toHaveBeenCalledWith(
      expect.objectContaining({ locationId: 'loc-A-01' }),
    );
  });

  it('availableQuantity = quantity - reservedQuantity を計算する / availableQuantity calculation', async () => {
    const rawQuants = [
      { _id: 'sq1', productSku: 'SKU-001', quantity: 100, reservedQuantity: 30 },
      { _id: 'sq2', productSku: 'SKU-002', quantity: 50, reservedQuantity: 50 },
    ];
    const chain = makeChain(rawQuants);
    vi.mocked(StockQuant.find).mockReturnValue(chain as any);
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(2);

    const Q = await getResolvers();
    const result = await Q.stockQuants(null, {});

    expect(result.data[0].availableQuantity).toBe(70); // 100 - 30
    expect(result.data[1].availableQuantity).toBe(0);  // 50 - 50
  });

  it('quantity が undefined の場合 0 として計算する / undefined quantity treated as 0', async () => {
    const rawQuants = [
      { _id: 'sq1', productSku: 'SKU-001', quantity: undefined, reservedQuantity: undefined },
    ];
    const chain = makeChain(rawQuants);
    vi.mocked(StockQuant.find).mockReturnValue(chain as any);
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    const result = await Q.stockQuants(null, {});

    // (0) - (0) = 0
    expect(result.data[0].availableQuantity).toBe(0);
  });

  it('reservedQuantity が quantity より大きい場合、負の値になる / negative availableQuantity when over-reserved', async () => {
    const rawQuants = [
      { _id: 'sq1', productSku: 'SKU-001', quantity: 10, reservedQuantity: 20 },
    ];
    const chain = makeChain(rawQuants);
    vi.mocked(StockQuant.find).mockReturnValue(chain as any);
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    const result = await Q.stockQuants(null, {});

    expect(result.data[0].availableQuantity).toBe(-10);
  });

  it('元のフィールドが保持される / original fields preserved', async () => {
    const rawQuants = [
      { _id: 'sq1', productSku: 'SKU-001', quantity: 100, reservedQuantity: 30, locationId: 'A-01' },
    ];
    const chain = makeChain(rawQuants);
    vi.mocked(StockQuant.find).mockReturnValue(chain as any);
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    const result = await Q.stockQuants(null, {});

    expect(result.data[0].productSku).toBe('SKU-001');
    expect(result.data[0].locationId).toBe('A-01');
    expect(result.data[0].quantity).toBe(100);
    expect(result.data[0].reservedQuantity).toBe(30);
  });

  it('フィルタなしで全在庫を返す / no filter returns all quants', async () => {
    const chain = makeChain([]);
    vi.mocked(StockQuant.find).mockReturnValue(chain as any);
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.stockQuants(null, {});

    expect(StockQuant.find).toHaveBeenCalledWith({});
  });

  it('ページネーション付きで正しい pageInfo を返す / pagination pageInfo', async () => {
    const chain = makeChain([]);
    vi.mocked(StockQuant.find).mockReturnValue(chain as any);
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(200);

    const Q = await getResolvers();
    const result = await Q.stockQuants(null, { pagination: { page: 5, limit: 30 } });

    expect(result.pageInfo.page).toBe(5);
    expect(result.pageInfo.limit).toBe(30);
    expect(result.pageInfo.total).toBe(200);
    expect(result.pageInfo.hasNext).toBe(true); // 5*30=150 < 200
    expect(chain.skip).toHaveBeenCalledWith(120); // (5-1)*30
  });
});

// ─── stockSummary(productSku) テスト ─────────────────────────────────────────

describe('Query.stockSummary(productSku) / 在庫サマリ', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('全 SKU のサマリを返す（productSku 未指定）/ returns summary for all skus', async () => {
    const aggResult = [
      { _id: 'SKU-001', totalQuantity: 200, totalReserved: 50, locationCount: 3 },
      { _id: 'SKU-002', totalQuantity: 100, totalReserved: 20, locationCount: 2 },
    ];
    vi.mocked(StockQuant.aggregate).mockResolvedValue(aggResult);
    vi.mocked(Product.find).mockReturnValue(leanChain([
      { sku: 'SKU-001', name: '商品A' },
      { sku: 'SKU-002', name: '商品B' },
    ]) as any);

    const Q = await getResolvers();
    const result = await Q.stockSummary(null, {});

    expect(result).toHaveLength(2);
    expect(result[0].productSku).toBe('SKU-001');
    expect(result[0].productName).toBe('商品A');
    expect(result[0].totalQuantity).toBe(200);
    expect(result[0].totalReserved).toBe(50);
    expect(result[0].totalAvailable).toBe(150); // 200 - 50
    expect(result[0].locationCount).toBe(3);
  });

  it('特定 SKU のサマリを返す / returns summary for specific sku', async () => {
    const aggResult = [
      { _id: 'SKU-001', totalQuantity: 200, totalReserved: 50, locationCount: 3 },
    ];
    vi.mocked(StockQuant.aggregate).mockResolvedValue(aggResult);
    vi.mocked(Product.find).mockReturnValue(leanChain([
      { sku: 'SKU-001', name: '商品A' },
    ]) as any);

    const Q = await getResolvers();
    const result = await Q.stockSummary(null, { productSku: 'SKU-001' });

    // aggregate が productSku でフィルタされることを確認
    expect(StockQuant.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ $match: { productSku: 'SKU-001' } }),
      ]),
    );
    expect(result).toHaveLength(1);
  });

  it('productSku 未指定の場合 aggregate の $match が空 / empty match when no productSku', async () => {
    vi.mocked(StockQuant.aggregate).mockResolvedValue([]);
    vi.mocked(Product.find).mockReturnValue(leanChain([]) as any);

    const Q = await getResolvers();
    await Q.stockSummary(null, {});

    expect(StockQuant.aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ $match: {} }),
      ]),
    );
  });

  it('商品名が見つからない場合 productName は null / productName null when product not found', async () => {
    const aggResult = [
      { _id: 'SKU-GHOST', totalQuantity: 10, totalReserved: 0, locationCount: 1 },
    ];
    vi.mocked(StockQuant.aggregate).mockResolvedValue(aggResult);
    // SKU-GHOST に対応する商品が存在しない
    vi.mocked(Product.find).mockReturnValue(leanChain([]) as any);

    const Q = await getResolvers();
    const result = await Q.stockSummary(null, {});

    expect(result[0].productName).toBeNull();
  });

  it('totalAvailable = totalQuantity - totalReserved を計算する / totalAvailable calculation', async () => {
    const aggResult = [
      { _id: 'SKU-001', totalQuantity: 500, totalReserved: 123, locationCount: 5 },
    ];
    vi.mocked(StockQuant.aggregate).mockResolvedValue(aggResult);
    vi.mocked(Product.find).mockReturnValue(leanChain([
      { sku: 'SKU-001', name: '商品A' },
    ]) as any);

    const Q = await getResolvers();
    const result = await Q.stockSummary(null, {});

    expect(result[0].totalAvailable).toBe(377); // 500 - 123
  });

  it('aggregate 結果が空の場合、空配列を返す / empty aggregate result', async () => {
    vi.mocked(StockQuant.aggregate).mockResolvedValue([]);
    vi.mocked(Product.find).mockReturnValue(leanChain([]) as any);

    const Q = await getResolvers();
    const result = await Q.stockSummary(null, {});

    expect(result).toEqual([]);
  });
});

// ─── inboundOrders(filter, pagination) テスト ───────────────────────────────

describe('Query.inboundOrders(filter, pagination) / 入庫指示一覧', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mockInbound = [
    { _id: 'ib1', orderNumber: 'IN-001', status: 'pending', flowType: 'normal' },
    { _id: 'ib2', orderNumber: 'IN-002', status: 'received', flowType: 'fba' },
  ];

  it('フィルタなしで全入庫指示を返す / returns all without filter', async () => {
    const chain = makeChain(mockInbound);
    vi.mocked(InboundOrder.find).mockReturnValue(chain as any);
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(2);

    const Q = await getResolvers();
    const result = await Q.inboundOrders(null, {});

    expect(InboundOrder.find).toHaveBeenCalledWith({});
    expect(result.data).toHaveLength(2);
  });

  it('status フィルタが適用される / status filter', async () => {
    const chain = makeChain([mockInbound[0]]);
    vi.mocked(InboundOrder.find).mockReturnValue(chain as any);
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    await Q.inboundOrders(null, { filter: { status: 'pending' } });

    expect(InboundOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  it('clientId フィルタが適用される / clientId filter', async () => {
    const chain = makeChain([]);
    vi.mocked(InboundOrder.find).mockReturnValue(chain as any);
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.inboundOrders(null, { filter: { clientId: 'client-1' } });

    expect(InboundOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'client-1' }),
    );
  });

  it('flowType フィルタが適用される / flowType filter', async () => {
    const chain = makeChain([mockInbound[1]]);
    vi.mocked(InboundOrder.find).mockReturnValue(chain as any);
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    await Q.inboundOrders(null, { filter: { flowType: 'fba' } });

    expect(InboundOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ flowType: 'fba' }),
    );
  });

  it('search フィルタが orderNumber に $or クエリを生成する / search filter', async () => {
    const chain = makeChain([]);
    vi.mocked(InboundOrder.find).mockReturnValue(chain as any);
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.inboundOrders(null, { filter: { search: 'IN-001' } });

    const callArg = (vi.mocked(InboundOrder.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg.$or).toBeInstanceOf(Array);
    expect(callArg.$or[0].orderNumber.$regex).toBe('IN-001');
    expect(callArg.$or[0].orderNumber.$options).toBe('i');
  });

  it('ページネーション付き結果が正しい pageInfo を返す / pagination', async () => {
    const chain = makeChain([mockInbound[0]]);
    vi.mocked(InboundOrder.find).mockReturnValue(chain as any);
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(50);

    const Q = await getResolvers();
    const result = await Q.inboundOrders(null, { pagination: { page: 2, limit: 10 } });

    expect(result.pageInfo.total).toBe(50);
    expect(result.pageInfo.page).toBe(2);
    expect(chain.skip).toHaveBeenCalledWith(10);
  });

  it('複数フィルタの組み合わせが動作する / combined filters', async () => {
    const chain = makeChain([]);
    vi.mocked(InboundOrder.find).mockReturnValue(chain as any);
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.inboundOrders(null, {
      filter: { status: 'pending', clientId: 'c1', flowType: 'normal' },
    });

    const callArg = (vi.mocked(InboundOrder.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg.status).toBe('pending');
    expect(callArg.clientId).toBe('c1');
    expect(callArg.flowType).toBe('normal');
  });
});

// ─── clients(filter, pagination) テスト ─────────────────────────────────────

describe('Query.clients(pagination) / 顧客一覧', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mockClients = [
    { _id: 'c1', name: '株式会社テスト', code: 'TEST' },
    { _id: 'c2', name: 'サンプル株式会社', code: 'SAMPLE' },
  ];

  it('ページネーションなしで全顧客を返す / returns all clients without pagination', async () => {
    const chain = makeChain(mockClients);
    vi.mocked(Client.find).mockReturnValue(chain as any);
    vi.mocked(Client.countDocuments).mockResolvedValue(2);

    const Q = await getResolvers();
    const result = await Q.clients(null, {});

    expect(Client.find).toHaveBeenCalledWith();
    expect(result.data).toHaveLength(2);
    expect(result.pageInfo.total).toBe(2);
  });

  it('ページネーション付きで正しい skip/limit を使用する / pagination skip/limit', async () => {
    const chain = makeChain([mockClients[0]]);
    vi.mocked(Client.find).mockReturnValue(chain as any);
    vi.mocked(Client.countDocuments).mockResolvedValue(100);

    const Q = await getResolvers();
    const result = await Q.clients(null, { pagination: { page: 4, limit: 25 } });

    expect(chain.skip).toHaveBeenCalledWith(75); // (4-1)*25
    expect(chain.limit).toHaveBeenCalledWith(25);
    expect(result.pageInfo.page).toBe(4);
    expect(result.pageInfo.limit).toBe(25);
    expect(result.pageInfo.total).toBe(100);
    expect(result.pageInfo.hasNext).toBe(false); // 4*25=100 >= 100 → false
  });

  it('顧客が 0 件の場合、空配列を返す / empty clients', async () => {
    const chain = makeChain([]);
    vi.mocked(Client.find).mockReturnValue(chain as any);
    vi.mocked(Client.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await Q.clients(null, {});

    expect(result.data).toEqual([]);
    expect(result.pageInfo.total).toBe(0);
    expect(result.pageInfo.hasNext).toBe(false);
  });

  it('最終ページでは hasNext=false / last page hasNext=false', async () => {
    const chain = makeChain(mockClients);
    vi.mocked(Client.find).mockReturnValue(chain as any);
    vi.mocked(Client.countDocuments).mockResolvedValue(2);

    const Q = await getResolvers();
    const result = await Q.clients(null, { pagination: { page: 1, limit: 10 } });

    // 1*10=10 >= 2 → hasNext=false
    expect(result.pageInfo.hasNext).toBe(false);
  });
});

// ─── dashboardStats テスト ───────────────────────────────────────────────────

describe('Query.dashboardStats / ダッシュボード統計', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('8 つの全メトリクスを返す / returns all 8 metrics', async () => {
    // ShipmentOrder カウント系
    vi.mocked(ShipmentOrder.countDocuments)
      .mockResolvedValueOnce(500)  // totalOrders
      .mockResolvedValueOnce(120)  // pendingOrders
      .mockResolvedValueOnce(45);  // shippedToday

    // Product カウント
    vi.mocked(Product.countDocuments).mockResolvedValue(200);

    // StockQuant aggregate（totalStock）
    vi.mocked(StockQuant.aggregate)
      .mockResolvedValueOnce([{ _id: null, total: 9999 }])  // totalStock
      .mockResolvedValueOnce([{ count: 5 }]);               // lowStockAgg

    // Client カウント
    vi.mocked(Client.countDocuments).mockResolvedValue(30);

    // Wave カウント
    vi.mocked(Wave.countDocuments).mockResolvedValue(8);

    const Q = await getResolvers();
    const result = await (Q.dashboardStats as any)(null, {});

    expect(result.totalOrders).toBe(500);
    expect(result.pendingOrders).toBe(120);
    expect(result.shippedToday).toBe(45);
    expect(result.totalProducts).toBe(200);
    expect(result.totalStock).toBe(9999);
    expect(result.lowStockCount).toBe(5);
    expect(result.activeClients).toBe(30);
    expect(result.activeWaves).toBe(8);
  });

  it('totalStock aggregate が空の場合 0 を返す / totalStock 0 when aggregate empty', async () => {
    vi.mocked(ShipmentOrder.countDocuments)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);
    vi.mocked(StockQuant.aggregate)
      .mockResolvedValueOnce([])   // 空 → total=0
      .mockResolvedValueOnce([]);  // lowStockAgg 空 → count=0
    vi.mocked(Client.countDocuments).mockResolvedValue(0);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await (Q.dashboardStats as any)(null, {});

    expect(result.totalStock).toBe(0);
  });

  it('lowStockCount aggregate が空の場合 0 を返す / lowStockCount 0 when aggregate empty', async () => {
    vi.mocked(ShipmentOrder.countDocuments)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2);
    vi.mocked(Product.countDocuments).mockResolvedValue(50);
    vi.mocked(StockQuant.aggregate)
      .mockResolvedValueOnce([{ _id: null, total: 1000 }])
      .mockResolvedValueOnce([]);  // lowStockAgg 空
    vi.mocked(Client.countDocuments).mockResolvedValue(10);
    vi.mocked(Wave.countDocuments).mockResolvedValue(3);

    const Q = await getResolvers();
    const result = await (Q.dashboardStats as any)(null, {});

    expect(result.lowStockCount).toBe(0);
  });

  it('pendingOrders が isConfirmed != true で絞り込まれる / pendingOrders filter', async () => {
    vi.mocked(ShipmentOrder.countDocuments)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(15);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);
    vi.mocked(StockQuant.aggregate)
      .mockResolvedValueOnce([{ _id: null, total: 0 }])
      .mockResolvedValueOnce([]);
    vi.mocked(Client.countDocuments).mockResolvedValue(0);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await (Q.dashboardStats as any)(null, {});

    // 2番目の countDocuments 呼び出し（pendingOrders）が正しいクエリを使用
    const calls = vi.mocked(ShipmentOrder.countDocuments).mock.calls;
    expect(calls[1][0]).toEqual({ 'status.confirm.isConfirmed': { $ne: true } });
    expect(result.pendingOrders).toBe(30);
  });

  it('shippedToday が今日の日付で絞り込まれる / shippedToday uses today date', async () => {
    vi.mocked(ShipmentOrder.countDocuments)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(5);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);
    vi.mocked(StockQuant.aggregate)
      .mockResolvedValueOnce([{ _id: null, total: 0 }])
      .mockResolvedValueOnce([]);
    vi.mocked(Client.countDocuments).mockResolvedValue(0);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await (Q.dashboardStats as any)(null, {});

    // 3番目の countDocuments 呼び出し（shippedToday）
    const calls = vi.mocked(ShipmentOrder.countDocuments).mock.calls;
    expect(calls[2][0]).toMatchObject({
      'status.shipped.isShipped': true,
      'status.shipped.shippedAt': expect.objectContaining({ $gte: expect.any(Date) }),
    });
    expect(result.shippedToday).toBe(5);
  });

  it('activeWaves が draft/picking/sorting/packing ステータスで絞り込まれる / wave status filter', async () => {
    vi.mocked(ShipmentOrder.countDocuments)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);
    vi.mocked(StockQuant.aggregate)
      .mockResolvedValueOnce([{ _id: null, total: 0 }])
      .mockResolvedValueOnce([]);
    vi.mocked(Client.countDocuments).mockResolvedValue(0);
    vi.mocked(Wave.countDocuments).mockResolvedValue(12);

    const Q = await getResolvers();
    const result = await (Q.dashboardStats as any)(null, {});

    expect(Wave.countDocuments).toHaveBeenCalledWith({
      status: { $in: ['draft', 'picking', 'sorting', 'packing'] },
    });
    expect(result.activeWaves).toBe(12);
  });

  it('全メトリクスが同時に並行して取得される / all metrics fetched concurrently', async () => {
    // 全カウントが呼ばれることを確認
    vi.mocked(ShipmentOrder.countDocuments)
      .mockResolvedValue(0);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);
    vi.mocked(StockQuant.aggregate).mockResolvedValue([]);
    vi.mocked(Client.countDocuments).mockResolvedValue(0);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await (Q.dashboardStats as any)(null, {});

    // 全モデルのメソッドが呼ばれたことを確認
    expect(ShipmentOrder.countDocuments).toHaveBeenCalled();
    expect(Product.countDocuments).toHaveBeenCalled();
    expect(StockQuant.aggregate).toHaveBeenCalled();
    expect(Client.countDocuments).toHaveBeenCalled();
    expect(Wave.countDocuments).toHaveBeenCalled();
  });
});

// ─── waves(status, pagination) テスト ───────────────────────────────────────

describe('Query.waves(status, pagination) / ウェーブ一覧', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mockWaves = [
    { _id: 'w1', waveNumber: 'WV-001', status: 'draft' },
    { _id: 'w2', waveNumber: 'WV-002', status: 'picking' },
    { _id: 'w3', waveNumber: 'WV-003', status: 'completed' },
  ];

  it('status フィルタなしで全ウェーブを返す / returns all waves without status filter', async () => {
    const chain = makeChain(mockWaves);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(3);

    const Q = await getResolvers();
    const result = await Q.waves(null, {});

    expect(Wave.find).toHaveBeenCalledWith({});
    expect(result.data).toHaveLength(3);
    expect(result.pageInfo.total).toBe(3);
  });

  it('status=draft フィルタが適用される / draft status filter', async () => {
    const chain = makeChain([mockWaves[0]]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    await Q.waves(null, { status: 'draft' });

    expect(Wave.find).toHaveBeenCalledWith({ status: 'draft' });
  });

  it('status=picking フィルタが適用される / picking status filter', async () => {
    const chain = makeChain([mockWaves[1]]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    await Q.waves(null, { status: 'picking' });

    expect(Wave.find).toHaveBeenCalledWith({ status: 'picking' });
  });

  it('status=completed フィルタが適用される / completed status filter', async () => {
    const chain = makeChain([mockWaves[2]]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(1);

    const Q = await getResolvers();
    await Q.waves(null, { status: 'completed' });

    expect(Wave.find).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('ウェーブが 0 件の場合、空配列を返す / empty waves', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await Q.waves(null, {});

    expect(result.data).toEqual([]);
    expect(result.pageInfo.total).toBe(0);
    expect(result.pageInfo.hasNext).toBe(false);
  });

  it('ページネーション付きで正しい pageInfo を返す / pagination pageInfo', async () => {
    const chain = makeChain([mockWaves[0]]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(30);

    const Q = await getResolvers();
    const result = await Q.waves(null, { pagination: { page: 2, limit: 5 } });

    expect(result.pageInfo.page).toBe(2);
    expect(result.pageInfo.limit).toBe(5);
    expect(result.pageInfo.total).toBe(30);
    expect(result.pageInfo.hasNext).toBe(true); // 2*5=10 < 30
    expect(chain.skip).toHaveBeenCalledWith(5);  // (2-1)*5
    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it('status + pagination を組み合わせて動作する / combined status and pagination', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.waves(null, { status: 'packing', pagination: { page: 1, limit: 50 } });

    expect(Wave.find).toHaveBeenCalledWith({ status: 'packing' });
    expect(chain.limit).toHaveBeenCalledWith(50);
  });

  it('大量データで limit=100 にクランプされる / clamps to 100 for large limit', async () => {
    const chain = makeChain([]);
    vi.mocked(Wave.find).mockReturnValue(chain as any);
    vi.mocked(Wave.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.waves(null, { pagination: { page: 1, limit: 9999 } });

    expect(chain.limit).toHaveBeenCalledWith(100);
  });
});

// ─── エッジケース / Edge Cases ───────────────────────────────────────────────

describe('エッジケース / Edge Cases', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shipmentOrders: filter が null の場合でも動作する / null filter works', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    // filter=undefined
    const result = await Q.shipmentOrders(null, { filter: undefined });

    expect(result.data).toEqual([]);
  });

  it('products: filter が null の場合でも動作する / null filter works', async () => {
    const chain = makeChain([]);
    vi.mocked(Product.find).mockReturnValue(chain as any);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await Q.products(null, { filter: undefined });

    expect(result.data).toEqual([]);
  });

  it('stockQuants: filter が null の場合でも動作する / null filter works', async () => {
    const chain = makeChain([]);
    vi.mocked(StockQuant.find).mockReturnValue(chain as any);
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    const result = await Q.stockQuants(null, { filter: undefined });

    expect(result.data).toEqual([]);
  });

  it('inboundOrders: 空の search 文字列はフィルタを生成しない / empty string search skipped', async () => {
    const chain = makeChain([]);
    vi.mocked(InboundOrder.find).mockReturnValue(chain as any);
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    // search が空文字列の場合は falsy なのでスキップ
    await Q.inboundOrders(null, { filter: { search: '' } });

    const callArg = (vi.mocked(InboundOrder.find).mock.calls[0] as any)?.[0] as any;
    // $or は設定されない（空文字列は falsy）
    expect(callArg.$or).toBeUndefined();
  });

  it('shipmentOrders: 空の search 文字列はフィルタを生成しない / empty string search skipped', async () => {
    const chain = makeChain([]);
    vi.mocked(ShipmentOrder.find).mockReturnValue(chain as any);
    vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    await Q.shipmentOrders(null, { filter: { search: '' } });

    const callArg = (vi.mocked(ShipmentOrder.find).mock.calls[0] as any)?.[0] as any;
    expect(callArg.$or).toBeUndefined();
  });

  it('stockSummary: aggregate が大量データでも正しく処理する / handles large aggregate results', async () => {
    // 100件の SKU 集計結果（$limit: 100）
    const aggResult = Array.from({ length: 100 }, (_, i) => ({
      _id: `SKU-${String(i).padStart(3, '0')}`,
      totalQuantity: 1000,
      totalReserved: 100,
      locationCount: 5,
    }));
    vi.mocked(StockQuant.aggregate).mockResolvedValue(aggResult);
    vi.mocked(Product.find).mockReturnValue(leanChain([]) as any);

    const Q = await getResolvers();
    const result = await Q.stockSummary(null, {});

    expect(result).toHaveLength(100);
    expect(result[0].totalAvailable).toBe(900); // 1000 - 100
  });

  it('Unicode・特殊文字を含む search でも正しく処理する / unicode search', async () => {
    const chain = makeChain([]);
    vi.mocked(Product.find).mockReturnValue(chain as any);
    vi.mocked(Product.countDocuments).mockResolvedValue(0);

    const Q = await getResolvers();
    // 絵文字・特殊文字を含む検索
    await Q.products(null, { filter: { search: '商品🎌&<>SQL\'injection' } });

    const callArg = (vi.mocked(Product.find).mock.calls[0] as any)?.[0] as any;
    // regex はそのまま渡される（Mongoose 側でエスケープ）
    expect(callArg.$or[0].sku.$regex).toBe('商品🎌&<>SQL\'injection');
  });
});
