/**
 * inboundOrderController 统合テスト / Inbound Order Controller Integration Tests
 *
 * HTTPリクエストからコントローラーを通じて、モデル層への正しい流れを検証する。
 * Verifies correct request flow through controller to model layer.
 *
 * モック方針 / Mock strategy:
 * - InboundOrder, Product, Location, StockQuant, StockMove モデルをすべてモック
 *   Mock all models (InboundOrder, Product, Location, StockQuant, StockMove)
 * - generateSequenceNumber, logOperation, createAutoCharge もモック
 *   Mock generateSequenceNumber, logOperation, createAutoCharge
 * - DB不要・外部依存なし / No DB required, no external dependencies
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ─────────────────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}))

vi.mock('@/models/product', () => ({
  Product: {
    findById: vi.fn(),
  },
}))

vi.mock('@/models/location', () => ({
  Location: {
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
  },
}))

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    findOneAndUpdate: vi.fn(),
    aggregate: vi.fn(),
  },
}))

vi.mock('@/models/stockMove', () => ({
  StockMove: {
    create: vi.fn(),
    updateOne: vi.fn(),
  },
}))

vi.mock('@/utils/sequenceGenerator', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('IN-00001'),
}))

vi.mock('@/api/controllers/lotController', () => ({
  findOrCreateLot: vi.fn().mockResolvedValue('lot-id-1'),
}))

vi.mock('@/services/operationLogger', () => ({
  logOperation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/chargeService', () => ({
  createAutoCharge: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getWarehouseFilter: vi.fn(() => []),
}))

import { InboundOrder } from '@/models/inboundOrder'
import { Product } from '@/models/product'
import { Location } from '@/models/location'
import { StockMove } from '@/models/stockMove'
import {
  listInboundOrders,
  getInboundOrder,
  createInboundOrder,
  confirmInboundOrder,
  receiveInboundLine,
  putawayInboundLine,
  cancelInboundOrder,
  deleteInboundOrder,
} from '@/api/controllers/inboundOrderController'

// ─── テストユーティリティ / Test utilities ────────────────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 */
const mockReq = (overrides: Record<string, any> = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * status().json() チェーンをサポート / Supports status().json() chaining
 */
const mockRes = () => {
  const res: any = {
    json: vi.fn(),
    status: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

// ─── listInboundOrders ────────────────────────────────────────────────────────

describe('listInboundOrders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('statusフィルタなしで入庫指示一覧を返す / returns list without status filter', async () => {
    // Arrange: ページネーション付き一覧レスポンスをモック / Mock paginated list response
    const fakeItems = [{ _id: 'o1', orderNumber: 'IN-001', status: 'draft' }]
    const findChain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeItems),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findChain as any)
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(1 as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listInboundOrders(req, res)

    // Assert: ページネーション形式で返される / returned in paginated format
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ items: fakeItems, total: 1, page: 1 }),
    )
  })

  it('statusクエリパラメータをフィルタに適用する / applies status query param to filter', async () => {
    // Arrange
    const findChain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findChain as any)
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { status: 'confirmed' } })
    const res = mockRes()

    // Act
    await listInboundOrders(req, res)

    // Assert: status フィルタが渡される / status filter is passed
    expect(InboundOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed' }),
    )
  })

  it('空の入庫指示一覧も正常に返す / returns empty list normally', async () => {
    // Arrange
    const findChain = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findChain as any)
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listInboundOrders(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ items: [], total: 0 }),
    )
    expect(res.status).not.toHaveBeenCalled()
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(InboundOrder.find).mockImplementation(() => {
      throw new Error('DB error')
    })

    const req = mockReq()
    const res = mockRes()

    // Act
    await listInboundOrders(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'DB error' }),
    )
  })
})

// ─── getInboundOrder ──────────────────────────────────────────────────────────

describe('getInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('IDで入庫指示を取得して返す / fetches and returns inbound order by ID', async () => {
    // Arrange
    const fakeOrder = { _id: 'o1', orderNumber: 'IN-001', status: 'draft' }
    const chain = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrder),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await getInboundOrder(req, res)

    // Assert
    expect(InboundOrder.findById).toHaveBeenCalledWith('o1')
    expect(res.json).toHaveBeenCalledWith(fakeOrder)
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange: findById が null を返す / findById returns null
    const chain = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '入庫指示が見つかりません' }),
    )
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    const chain = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error('query failed')),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await getInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createInboundOrder ───────────────────────────────────────────────────────

describe('createInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('必須フィールドで入庫指示を作成し 201 を返す / creates inbound order with required fields and returns 201', async () => {
    // Arrange: Location と Product の存在チェックをモック（.lean() チェーン形式）
    // Mock location and product checks with .lean() chain
    vi.mocked(Location.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'loc-1', code: 'A-01', name: 'エリアA' }),
    } as any)
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'prod-1', sku: 'SKU-001', name: '商品A' }),
    } as any)

    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-00001',
      status: 'draft',
      lines: [{ lineNumber: 1, productId: 'prod-1', expectedQuantity: 10 }],
    }
    vi.mocked(InboundOrder.create).mockResolvedValue(fakeOrder as any)

    const req = mockReq({
      body: {
        destinationLocationId: 'loc-1',
        lines: [{ productId: 'prod-1', expectedQuantity: 10 }],
      },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert: 201 ステータスと作成されたオーダーを返す / returns 201 with created order
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(fakeOrder)
  })

  it('destinationLocationId が欠落している場合 400 を返す / returns 400 when destinationLocationId is missing', async () => {
    // Arrange: destinationLocationId なし / no destinationLocationId
    const req = mockReq({
      body: {
        lines: [{ productId: 'p1', expectedQuantity: 5 }],
      },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert: バリデーションエラー / validation error
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('必須') }),
    )
  })

  it('lines が空配列の場合 400 を返す / returns 400 when lines is empty array', async () => {
    // Arrange: 空行 / empty lines
    const req = mockReq({
      body: {
        destinationLocationId: 'loc-1',
        lines: [],
      },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('存在しないロケーションIDの場合 400 を返す / returns 400 for nonexistent location ID', async () => {
    // Arrange: Location が見つからない（.lean() は null を返す）
    // Location not found (.lean() returns null)
    vi.mocked(Location.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({
      body: {
        destinationLocationId: 'loc-unknown',
        lines: [{ productId: 'p1', expectedQuantity: 1 }],
      },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('ロケーション') }),
    )
  })

  it('存在しない商品IDの場合 400 を返す / returns 400 for nonexistent product ID', async () => {
    // Arrange: Location は存在するが Product が見つからない
    // Location exists but Product not found
    vi.mocked(Location.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'loc-1' }),
    } as any)
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({
      body: {
        destinationLocationId: 'loc-1',
        lines: [{ productId: 'prod-unknown', expectedQuantity: 5 }],
      },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('商品') }),
    )
  })
})

// ─── confirmInboundOrder ──────────────────────────────────────────────────────

describe('confirmInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft ステータスの入庫指示を confirmed に更新する / transitions draft order to confirmed', async () => {
    // Arrange: draft オーダーをモック / Mock draft order
    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-001',
      status: 'draft',
      lines: [],
      save: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)
    // Location.findOne は .lean() チェーンを返す / Location.findOne returns .lean() chain
    vi.mocked(Location.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'virt-1', code: 'VIRTUAL/SUPPLIER' }),
    } as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await confirmInboundOrder(req, res)

    // Assert: ステータスが confirmed に変わった / status changed to confirmed
    expect(fakeOrder.status).toBe('confirmed')
    expect(fakeOrder.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('確定') }),
    )
  })

  it('draft 以外のオーダーは 400 を返す / returns 400 for non-draft order', async () => {
    // Arrange: すでに confirmed の状態 / already confirmed state
    const fakeOrder = {
      _id: 'o1',
      status: 'confirmed',
      lines: [],
    }
    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await confirmInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('下書き') }),
    )
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await confirmInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── receiveInboundLine ───────────────────────────────────────────────────────

describe('receiveInboundLine', () => {
  beforeEach(() => vi.clearAllMocks())

  it('行の受入数量を更新して receiving ステータスに移行する / updates line quantity and transitions to receiving', async () => {
    // Arrange: confirmed オーダーの行をモック / Mock confirmed order with lines
    const fakeLine = {
      lineNumber: 1,
      productId: 'prod-1',
      productSku: 'SKU-001',
      productName: '商品A',
      expectedQuantity: 10,
      receivedQuantity: 0,
      lotNumber: undefined,
      lotId: undefined,
      stockMoveIds: [],
      locationId: undefined,
    }
    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-001',
      status: 'confirmed',
      flowType: 'standard',
      destinationLocationId: 'loc-1',
      lines: [fakeLine],
      save: vi.fn().mockResolvedValue(undefined),
    }
    // lines の配列メソッドを使えるようにする / Enable Array methods on lines
    fakeOrder.lines.find = Array.prototype.find
    fakeOrder.lines.every = Array.prototype.every

    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)
    // Product.findById は .lean() チェーンを返す / Product.findById returns .lean() chain
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'prod-1', lotTrackingEnabled: false }),
    } as any)
    // Location.findOne も .lean() チェーンを返す / Location.findOne also returns .lean() chain
    vi.mocked(Location.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'virt-1' }),
    } as any)
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'mv-1' } as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, receiveQuantity: 5 },
    })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert: 受入数量が更新され、ステータスが receiving に / quantity updated, status becomes receiving
    expect(fakeLine.receivedQuantity).toBe(5)
    expect(fakeOrder.status).toBe('receiving')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ orderStatus: 'receiving' }),
    )
  })

  it('予定数量を超える受入は 400 を返す / returns 400 when receive exceeds expected quantity', async () => {
    // Arrange: 既に 8 個受入済み、5個を追加 → 13 > 10 なのでエラー
    // Already received 8, trying to add 5 → 13 > 10 = error
    const fakeLine = {
      lineNumber: 1,
      expectedQuantity: 10,
      receivedQuantity: 8,
      stockMoveIds: [],
    }
    const fakeOrder = {
      _id: 'o1',
      status: 'receiving',
      lines: [fakeLine],
    }
    fakeOrder.lines.find = Array.prototype.find

    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, receiveQuantity: 5 },
    })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert: 過剰受入はエラー / over-receive is an error
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('超えます') }),
    )
  })

  it('receiveQuantity が 0 以下の場合 400 を返す / returns 400 when receiveQuantity is zero or negative', async () => {
    // Arrange
    const fakeLine = { lineNumber: 1, expectedQuantity: 10, receivedQuantity: 0, stockMoveIds: [] }
    const fakeOrder = { _id: 'o1', status: 'confirmed', lines: [fakeLine] }
    fakeOrder.lines.find = Array.prototype.find

    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, receiveQuantity: 0 },
    })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('存在しない行番号の場合 404 を返す / returns 404 for nonexistent line number', async () => {
    // Arrange: 行番号 99 は存在しない / line number 99 does not exist
    const fakeOrder = {
      _id: 'o1',
      status: 'confirmed',
      lines: [{ lineNumber: 1, expectedQuantity: 5, receivedQuantity: 0, stockMoveIds: [] }],
    }
    fakeOrder.lines.find = Array.prototype.find

    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 99, receiveQuantity: 1 },
    })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('エラー時に 500 を返す / returns 500 on unexpected error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockRejectedValue(new Error('connection lost'))

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, receiveQuantity: 3 },
    })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'connection lost' }),
    )
  })
})

// ─── putawayInboundLine ───────────────────────────────────────────────────────

describe('putawayInboundLine', () => {
  beforeEach(() => vi.clearAllMocks())

  it('received 状態の行に棚入れを実行する / executes putaway for a received line', async () => {
    // Arrange: 同じロケーションへの棚入れ（StockQuant移動なし）でシンプルなパスをテスト
    // Test simple path: putaway to same location (no StockQuant movement)
    const mongoose = await import('mongoose')
    const locId = new mongoose.default.Types.ObjectId()
    const locIdStr = String(locId)

    const fakeLine = {
      lineNumber: 1,
      productId: 'prod-1',
      productSku: 'SKU-001',
      productName: '商品A',
      receivedQuantity: 10,
      lotId: undefined,
      lotNumber: undefined,
      stockMoveIds: [],
      locationId: locId, // 同じロケーションID / Same location ID
      putawayLocationId: undefined,
      putawayQuantity: undefined,
    }
    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-001',
      status: 'received',
      destinationLocationId: locId,
      lines: [fakeLine],
      save: vi.fn().mockResolvedValue(undefined),
    }
    fakeOrder.lines.find = Array.prototype.find
    fakeOrder.lines.every = Array.prototype.every

    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)
    // Location.findById は .lean() チェーンを返す / Location.findById returns .lean() chain
    vi.mocked(Location.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: locId, code: 'A-01', type: 'storage' }),
    } as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, locationId: locIdStr, quantity: 10 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert: 棚入れ成功メッセージを返す / returns putaway success message
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('棚入れ完了') }),
    )
  })

  it('received 以外のステータスで 400 を返す / returns 400 for non-received status', async () => {
    // Arrange: まだ receiving 状態 / still in receiving state
    const fakeOrder = { _id: 'o1', status: 'receiving', lines: [] }
    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, locationId: 'loc-1', quantity: 5 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('検品済み') }),
    )
  })

  it('仮想ロケーションへの棚入れは 400 を返す / returns 400 for virtual location putaway', async () => {
    // Arrange: 仮想ロケーションへの棚入れは不可 / Cannot putaway to virtual location
    const fakeLine = {
      lineNumber: 1,
      receivedQuantity: 5,
      stockMoveIds: [],
    }
    const fakeOrder = { _id: 'o1', status: 'received', lines: [fakeLine] }
    fakeOrder.lines.find = Array.prototype.find

    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)
    // 仮想ロケーションを返す .lean() チェーン / .lean() chain returning virtual location
    vi.mocked(Location.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'virt-1',
        code: 'VIRTUAL/SUPPLIER',
        type: 'virtual/supplier',
      }),
    } as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, locationId: 'virt-1', quantity: 5 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('仮想ロケーション') }),
    )
  })
})

// ─── cancelInboundOrder ───────────────────────────────────────────────────────

describe('cancelInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft オーダーをキャンセルする / cancels a draft order', async () => {
    // Arrange
    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-001',
      status: 'draft',
      lines: [],
      save: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await cancelInboundOrder(req, res)

    // Assert
    expect(fakeOrder.status).toBe('cancelled')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('キャンセル') }),
    )
  })

  it('完了済みオーダーのキャンセルは 400 を返す / returns 400 for cancelling completed order', async () => {
    // Arrange: 完了済みはキャンセル不可 / Completed orders cannot be cancelled
    const fakeOrder = { _id: 'o1', status: 'done', lines: [] }
    vi.mocked(InboundOrder.findById).mockResolvedValue(fakeOrder as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await cancelInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── deleteInboundOrder ───────────────────────────────────────────────────────

describe('deleteInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft オーダーを削除する / deletes a draft order', async () => {
    // Arrange
    const chain = {
      lean: vi.fn().mockResolvedValue({ _id: 'o1', orderNumber: 'IN-001', status: 'draft' }),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(chain as any)
    vi.mocked(InboundOrder.findByIdAndDelete).mockResolvedValue({} as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await deleteInboundOrder(req, res)

    // Assert
    expect(InboundOrder.findByIdAndDelete).toHaveBeenCalledWith('o1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('削除') }),
    )
  })

  it('draft 以外のオーダーは削除できない / cannot delete non-draft order', async () => {
    // Arrange: confirmed は削除不可 / confirmed cannot be deleted
    const chain = {
      lean: vi.fn().mockResolvedValue({ _id: 'o1', status: 'confirmed' }),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await deleteInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('下書き') }),
    )
  })

  it('存在しないオーダーの削除は 404 を返す / returns 404 for nonexistent order', async () => {
    // Arrange
    const chain = { lean: vi.fn().mockResolvedValue(null) }
    vi.mocked(InboundOrder.findById).mockReturnValue(chain as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await deleteInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })
})
