/**
 * lotController 統合テスト / Lot Controller Integration Tests
 * ロットコントローラの統合テスト / 批次控制器集成测试
 *
 * ロット CRUD の HTTP フローを検証する。
 * 验证批次 CRUD 的 HTTP 流程。
 *
 * モック方針 / Mock strategy:
 * - Lot, Product, StockQuant モデルをモック（DB不要）
 *   Mock Lot, Product, StockQuant models to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('@/models/lot', () => ({
  Lot: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock('@/models/product', () => ({
  Product: {
    findById: vi.fn(),
  },
}))

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}))

vi.mock('mongoose', () => {
  class ObjectId {
    value: string
    constructor(v: string) { this.value = v }
    toString() { return this.value }
  }
  return {
    default: { Types: { ObjectId } },
    Types: { ObjectId },
  }
})

import { Lot } from '@/models/lot'
import { Product } from '@/models/product'
import { StockQuant } from '@/models/stockQuant'
import {
  listLots,
  getLot,
  createLot,
  updateLot,
  deleteLot,
  listExpiryAlerts,
  updateExpiredLots,
} from '../lotController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

/** モックリクエスト生成 / Mock请求工厂 */
const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides,
  }) as any

/** モックレスポンス生成 / Mock响应工厂 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── listLots / ロット一覧 / 批次列表 ──────────

describe('listLots', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ページネーション付きで一覧を返す / 返回分页列表', async () => {
    const fakeItems = [{ _id: 'l1', lotNumber: 'LOT-001' }]
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeItems),
    }
    vi.mocked(Lot.find).mockReturnValue(chainMock as any)
    vi.mocked(Lot.countDocuments).mockResolvedValue(1)

    const req = mockReq({ query: { page: '1', limit: '50' } })
    const res = mockRes()

    await listLots(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ items: fakeItems, total: 1, page: 1, limit: 50 }),
    )
  })

  it('検索フィルタが適用される / 应用搜索筛选', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(Lot.find).mockReturnValue(chainMock as any)
    vi.mocked(Lot.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { search: 'LOT' } })
    const res = mockRes()

    await listLots(req, res)

    expect(Lot.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error('DB down')),
    }
    vi.mocked(Lot.find).mockReturnValue(chainMock as any)
    vi.mocked(Lot.countDocuments).mockResolvedValue(0)

    const req = mockReq()
    const res = mockRes()

    await listLots(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ロット一覧の取得に失敗しました' }),
    )
  })
})

// ─── getLot / ロット詳細 / 批次详情 ──────────

describe('getLot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存ロットを ID で取得する / 根据ID获取批次', async () => {
    const fakeLot = { _id: 'l1', lotNumber: 'LOT-001' }
    vi.mocked(Lot.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeLot),
    } as any)

    const fakeQuants = [{ quantity: 10, reservedQuantity: 2, locationId: 'loc1' }]
    vi.mocked(StockQuant.find).mockReturnValue({
      populate: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(fakeQuants),
      }),
    } as any)

    const req = mockReq({ params: { id: 'l1' } })
    const res = mockRes()

    await getLot(req, res)

    expect(Lot.findById).toHaveBeenCalledWith('l1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        lotNumber: 'LOT-001',
        totalQuantity: 10,
        totalReserved: 2,
        totalAvailable: 8,
      }),
    )
  })

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Lot.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await getLot(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'ロットが見つかりません' })
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Lot.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { id: 'l1' } })
    const res = mockRes()

    await getLot(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createLot / ロット作成 / 创建批次 ──────────

describe('createLot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('正常に作成し 201 を返す / 正常创建返回201', async () => {
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'p1', sku: 'SKU-001', name: 'テスト商品' }),
    } as any)
    vi.mocked(Lot.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const fakeLot = { _id: 'l-new', lotNumber: 'LOT-NEW', productId: 'p1' }
    vi.mocked(Lot.create).mockResolvedValue(fakeLot as any)

    const req = mockReq({ body: { lotNumber: 'LOT-NEW', productId: 'p1' } })
    const res = mockRes()

    await createLot(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(fakeLot)
  })

  it('必須フィールド不足で 400 を返す / 缺少必填字段返回400', async () => {
    const req = mockReq({ body: { lotNumber: 'LOT-001' } }) // productId 欠落 / 缺少productId
    const res = mockRes()

    await createLot(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'lotNumber と productId は必須です' }),
    )
  })

  it('商品が存在しない場合 400 を返す / 商品不存在返回400', async () => {
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ body: { lotNumber: 'LOT-001', productId: 'nonexistent' } })
    const res = mockRes()

    await createLot(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '商品が見つかりません' }),
    )
  })

  it('重複時に 409 を返す / 重复时返回409', async () => {
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'p1', sku: 'SKU-001', name: 'テスト' }),
    } as any)
    vi.mocked(Lot.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'existing', lotNumber: 'LOT-DUP' }),
    } as any)

    const req = mockReq({ body: { lotNumber: 'LOT-DUP', productId: 'p1' } })
    const res = mockRes()

    await createLot(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'p1', sku: 'SKU-001', name: 'テスト' }),
    } as any)
    vi.mocked(Lot.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(Lot.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: { lotNumber: 'LOT-ERR', productId: 'p1' } })
    const res = mockRes()

    await createLot(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── updateLot / ロット更新 / 更新批次 ──────────

describe('updateLot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Lot.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()

    await updateLot(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('正常に更新する / 正常更新', async () => {
    const fakeLot = {
      _id: 'l1',
      lotNumber: 'LOT-001',
      save: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(Lot.findById).mockResolvedValue(fakeLot as any)

    const req = mockReq({ params: { id: 'l1' }, body: { status: 'quarantine' } })
    const res = mockRes()

    await updateLot(req, res)

    expect(fakeLot.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(fakeLot)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Lot.findById).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ params: { id: 'l1' }, body: {} })
    const res = mockRes()

    await updateLot(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── deleteLot / ロット削除 / 删除批次 ──────────

describe('deleteLot', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Lot.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await deleteLot(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('在庫がある場合 400 を返す / 有库存时返回400', async () => {
    vi.mocked(Lot.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'l1', lotNumber: 'LOT-001' }),
    } as any)
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(3)

    const req = mockReq({ params: { id: 'l1' } })
    const res = mockRes()

    await deleteLot(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'このロットに在庫があるため削除できません' }),
    )
  })

  it('在庫なしで正常に削除する / 无库存正常删除', async () => {
    vi.mocked(Lot.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'l1', lotNumber: 'LOT-001' }),
    } as any)
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(0)
    vi.mocked(Lot.findByIdAndDelete).mockResolvedValue({} as any)

    const req = mockReq({ params: { id: 'l1' } })
    const res = mockRes()

    await deleteLot(req, res)

    expect(Lot.findByIdAndDelete).toHaveBeenCalledWith('l1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ロットを削除しました' }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Lot.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    const req = mockReq({ params: { id: 'l1' } })
    const res = mockRes()

    await deleteLot(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── updateExpiredLots / 期限切れ更新 / 过期更新 ──────────

describe('updateExpiredLots', () => {
  beforeEach(() => vi.clearAllMocks())

  it('期限切れロットを更新する / 更新过期批次', async () => {
    vi.mocked(Lot.updateMany).mockResolvedValue({ modifiedCount: 3 } as any)

    const req = mockReq()
    const res = mockRes()

    await updateExpiredLots(req, res)

    expect(Lot.updateMany).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ modifiedCount: 3 }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Lot.updateMany).mockRejectedValue(new Error('update failed'))

    const req = mockReq()
    const res = mockRes()

    await updateExpiredLots(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── listExpiryAlerts / 賞味期限アラート / 保质期预警 ──────────

describe('listExpiryAlerts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('アラートを返す / 返回预警列表', async () => {
    const fakeLots = [{
      _id: 'l1',
      lotNumber: 'LOT-001',
      productId: 'p1',
      productSku: 'SKU-001',
      productName: 'テスト商品',
      expiryDate: new Date('2026-03-25'),
    }]
    vi.mocked(Lot.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(fakeLots),
      }),
    } as any)
    vi.mocked(StockQuant.aggregate).mockResolvedValue([
      { totalQuantity: 100, totalReserved: 10 },
    ])

    const req = mockReq({ query: { daysAhead: '30' } })
    const res = mockRes()

    await listExpiryAlerts(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ daysAhead: 30, alerts: expect.any(Array) }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Lot.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('DB error')),
      }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    await listExpiryAlerts(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
