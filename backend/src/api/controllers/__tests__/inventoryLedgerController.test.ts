/**
 * inventoryLedgerController 単元テスト / inventoryLedgerController 单元测试
 *
 * 在庫台帳・引当 CRUD + ステータス遷移のテスト
 * 库存台账・预留 CRUD + 状态转换测试
 *
 * モック方針 / Mock strategy:
 * - InventoryLedger, InventoryReservation モデルをモック
 *   Mock InventoryLedger, InventoryReservation models
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('mongoose', () => {
  class MockObjectId {
    value: string
    constructor(id: string) { this.value = id }
    toString() { return this.value }
  }
  return {
    default: {
      Types: {
        ObjectId: MockObjectId,
      },
    },
    Types: {
      ObjectId: MockObjectId,
    },
  }
})

vi.mock('@/models/inventoryLedger', () => ({
  InventoryLedger: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/models/inventoryReservation', () => ({
  InventoryReservation: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    create: vi.fn(),
  },
}))

// ─── インポート / 导入 ──────────

import { InventoryLedger } from '@/models/inventoryLedger'
import { InventoryReservation } from '@/models/inventoryReservation'
import {
  getLedgerEntries,
  getStockLevel,
  getStockLevels,
  createLedgerEntry,
  getReservations,
  createReservation,
  releaseReservation,
  fulfillReservation,
} from '../inventoryLedgerController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── getLedgerEntries テスト / getLedgerEntries 测试 ──────────

describe('getLedgerEntries / 在庫台帳取得 / 获取库存台账', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: ページネーション付き / 正常情况：带分页
  it('台帳エントリ一覧を返す / 返回台账条目列表', async () => {
    const entries = [{ type: 'inbound', quantity: 10 }]
    vi.mocked(InventoryLedger.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(entries),
          }),
        }),
      }),
    } as any)
    vi.mocked(InventoryLedger.countDocuments).mockResolvedValue(1)

    const req = mockReq()
    const res = mockRes()
    await getLedgerEntries(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: entries, total: 1 })
  })

  // 正常系: フィルター付き / 正常情况：带过滤器
  it('productId/type フィルターを適用する / 应用productId/type过滤器', async () => {
    vi.mocked(InventoryLedger.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(InventoryLedger.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { productId: 'p1', type: 'inbound', page: '2', limit: '10' } })
    const res = mockRes()
    await getLedgerEntries(req, res)

    expect(res.json).toHaveBeenCalledTimes(1)
  })

  // 異常系: DB エラー → 500 / 异常情况：DB错误 → 500
  it('エラー時に 500 を返す / 错误时返回500', async () => {
    vi.mocked(InventoryLedger.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()
    await getLedgerEntries(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── getStockLevel テスト / getStockLevel 测试 ──────────

describe('getStockLevel / 在庫数取得 / 获取库存水平', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 在庫レベル返却 / 正常情况：返回库存水平
  it('商品の在庫レベルを返す / 返回商品库存水平', async () => {
    vi.mocked(InventoryLedger.aggregate).mockResolvedValue([{ totalStock: 100 }] as any)
    vi.mocked(InventoryReservation.aggregate).mockResolvedValue([{ reservedStock: 20 }] as any)

    const req = mockReq({ query: { productId: 'p1' } })
    const res = mockRes()
    await getStockLevel(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'p1',
        totalStock: 100,
        reservedStock: 20,
        availableStock: 80,
      }),
    )
  })

  // 正常系: 在庫なし / 正常情况：无库存
  it('在庫がない場合 0 を返す / 无库存时返回0', async () => {
    vi.mocked(InventoryLedger.aggregate).mockResolvedValue([] as any)
    vi.mocked(InventoryReservation.aggregate).mockResolvedValue([] as any)

    const req = mockReq({ query: { productId: 'p1' } })
    const res = mockRes()
    await getStockLevel(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ totalStock: 0, reservedStock: 0, availableStock: 0 }),
    )
  })

  // 異常系: productId なし → 400 / 异常情况：缺少productId → 400
  it('productId がない場合 400 を返す / 缺少productId时返回400', async () => {
    const req = mockReq({ query: {} })
    const res = mockRes()
    await getStockLevel(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── getStockLevels テスト / getStockLevels 测试 ──────────

describe('getStockLevels / 在庫サマリー / 库存汇总', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('在庫サマリーを返す / 返回库存汇总', async () => {
    const stockData = [{ _id: 'p1', totalStock: 50, productSku: 'SKU-001' }]
    const reservedData = [{ _id: 'p1', reservedStock: 10 }]
    const totalProducts = [{ total: 1 }]

    vi.mocked(InventoryLedger.aggregate)
      .mockResolvedValueOnce(stockData as any)    // stockData
    vi.mocked(InventoryReservation.aggregate)
      .mockResolvedValueOnce(reservedData as any)  // reservedData
    vi.mocked(InventoryLedger.aggregate)
      .mockResolvedValueOnce(totalProducts as any) // totalProducts

    const req = mockReq()
    const res = mockRes()
    await getStockLevels(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ productSku: 'SKU-001', availableStock: 40 }),
        ]),
        total: 1,
      }),
    )
  })
})

// ─── createLedgerEntry テスト / createLedgerEntry 测试 ──────────

describe('createLedgerEntry / 台帳エントリ作成 / 创建台账条目', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 作成成功 → 201 / 正常情况：创建成功 → 201
  it('台帳エントリを作成して 201 を返す / 创建台账条目返回201', async () => {
    const created = {
      _id: 'le1',
      type: 'adjustment',
      quantity: 5,
      productId: 'p1',
      productSku: 'SKU-001',
      toObject: vi.fn().mockReturnValue({ _id: 'le1', type: 'adjustment', quantity: 5 }),
    }
    vi.mocked(InventoryLedger.create).mockResolvedValue(created as any)

    const req = mockReq({
      body: { productId: 'p1', productSku: 'SKU-001', type: 'adjustment', quantity: 5 },
    })
    const res = mockRes()
    await createLedgerEntry(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
  })

  // 異常系: 不正な type → 400 / 异常情况：无效type → 400
  it('不正な type で 400 を返す / 无效type返回400', async () => {
    const req = mockReq({
      body: { productId: 'p1', productSku: 'SKU-001', type: 'inbound', quantity: 5 },
    })
    const res = mockRes()
    await createLedgerEntry(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  // 異常系: productId なし → 400 / 异常情况：缺少productId → 400
  it('productId がない場合 400 を返す / 缺少productId时返回400', async () => {
    const req = mockReq({
      body: { productSku: 'SKU-001', type: 'adjustment', quantity: 5 },
    })
    const res = mockRes()
    await createLedgerEntry(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  // 異常系: productSku なし → 400 / 异常情况：缺少productSku → 400
  it('productSku がない場合 400 を返す / 缺少productSku时返回400', async () => {
    const req = mockReq({
      body: { productId: 'p1', type: 'adjustment', quantity: 5 },
    })
    const res = mockRes()
    await createLedgerEntry(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  // 異常系: quantity なし → 400 / 异常情况：缺少quantity → 400
  it('quantity がない場合 400 を返す / 缺少quantity时返回400', async () => {
    const req = mockReq({
      body: { productId: 'p1', productSku: 'SKU-001', type: 'adjustment' },
    })
    const res = mockRes()
    await createLedgerEntry(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── getReservations テスト / getReservations 测试 ──────────

describe('getReservations / 引当一覧 / 预留列表', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('引当一覧を返す / 返回预留列表', async () => {
    const reservations = [{ productId: 'p1', status: 'active', quantity: 5 }]
    vi.mocked(InventoryReservation.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(reservations),
          }),
        }),
      }),
    } as any)
    vi.mocked(InventoryReservation.countDocuments).mockResolvedValue(1)

    const req = mockReq()
    const res = mockRes()
    await getReservations(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: reservations, total: 1 })
  })
})

// ─── createReservation テスト / createReservation 测试 ──────────

describe('createReservation / 引当作成 / 创建预留', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 作成成功 → 201 / 正常情况：创建成功 → 201
  it('引当を作成して 201 を返す / 创建预留返回201', async () => {
    const created = {
      _id: 'r1',
      status: 'active',
      toObject: vi.fn().mockReturnValue({ _id: 'r1', status: 'active' }),
    }
    vi.mocked(InventoryReservation.create).mockResolvedValue(created as any)

    const req = mockReq({
      body: {
        productId: 'p1', productSku: 'SKU-001', quantity: 5,
        source: 'shipment', referenceId: 'ref1',
      },
    })
    const res = mockRes()
    await createReservation(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
  })

  // 異常系: quantity <= 0 → 400 / 异常情况：quantity <= 0 → 400
  it('quantity が 0 以下の場合 400 を返す / quantity小于等于0时返回400', async () => {
    const req = mockReq({
      body: {
        productId: 'p1', productSku: 'SKU-001', quantity: 0,
        source: 'shipment', referenceId: 'ref1',
      },
    })
    const res = mockRes()
    await createReservation(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  // 異常系: source なし → 400 / 异常情况：缺少source → 400
  it('source がない場合 400 を返す / 缺少source时返回400', async () => {
    const req = mockReq({
      body: { productId: 'p1', productSku: 'SKU-001', quantity: 5, referenceId: 'ref1' },
    })
    const res = mockRes()
    await createReservation(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── releaseReservation テスト / releaseReservation 测试 ──────────

describe('releaseReservation / 引当解放 / 释放预留', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: active → released / 正常情况：active → released
  it('アクティブな引当を解放する / 释放活跃预留', async () => {
    vi.mocked(InventoryReservation.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'active' }),
    } as any)
    const released = { _id: 'r1', status: 'released', releasedAt: new Date() }
    vi.mocked(InventoryReservation.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(released),
    } as any)

    const req = mockReq({ params: { id: 'r1' } })
    const res = mockRes()
    await releaseReservation(req, res)

    expect(res.json).toHaveBeenCalledWith(released)
  })

  // 異常系: 非アクティブ → 400 / 异常情况：非active → 400
  it('非アクティブな引当の解放を 400 で拒否する / 拒绝释放非active预留返回400', async () => {
    vi.mocked(InventoryReservation.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'released' }),
    } as any)

    const req = mockReq({ params: { id: 'r1' } })
    const res = mockRes()
    await releaseReservation(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  // 異常系: 見つからない → 404 / 异常情况：未找到 → 404
  it('見つからない場合 404 を返す / 未找到时返回404', async () => {
    vi.mocked(InventoryReservation.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    await releaseReservation(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── fulfillReservation テスト / fulfillReservation 测试 ──────────

describe('fulfillReservation / 引当消化 / 消化预留', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: active → fulfilled / 正常情况：active → fulfilled
  it('アクティブな引当を消化する / 消化活跃预留', async () => {
    vi.mocked(InventoryReservation.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'active' }),
    } as any)
    const fulfilled = { _id: 'r1', status: 'fulfilled', fulfilledAt: new Date() }
    vi.mocked(InventoryReservation.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fulfilled),
    } as any)

    const req = mockReq({ params: { id: 'r1' } })
    const res = mockRes()
    await fulfillReservation(req, res)

    expect(res.json).toHaveBeenCalledWith(fulfilled)
  })

  // 異常系: 非アクティブ → 400 / 异常情况：非active → 400
  it('非アクティブな引当の消化を 400 で拒否する / 拒绝消化非active预留返回400', async () => {
    vi.mocked(InventoryReservation.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'fulfilled' }),
    } as any)

    const req = mockReq({ params: { id: 'r1' } })
    const res = mockRes()
    await fulfillReservation(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  // 異常系: 見つからない → 404 / 异常情况：未找到 → 404
  it('見つからない場合 404 を返す / 未找到时返回404', async () => {
    vi.mocked(InventoryReservation.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    await fulfillReservation(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})
