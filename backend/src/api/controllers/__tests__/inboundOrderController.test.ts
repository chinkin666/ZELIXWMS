/**
 * inboundOrderController 単体テスト / Inbound Order Controller Unit Tests
 *
 * HTTPリクエストがコントローラーからモデル層へ正しく流れるかを検証する。
 * Verifies that HTTP requests flow correctly from controller to model layer.
 *
 * モック方針 / Mock strategy:
 * - DB モデル全体をモック（DB・外部依存を排除）
 *   Mock all DB models (eliminate DB and external dependencies)
 * - 外部サービス（logOperation, createAutoCharge）をモック
 *   Mock external services (logOperation, createAutoCharge)
 * - req/res を軽量オブジェクトで代替
 *   Replace req/res with lightweight objects
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ─────────────────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}))

vi.mock('@/models/product', () => ({
  Product: {
    // findById().lean() パターンをサポート / Support findById().lean() pattern
    findById: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
  },
}))

vi.mock('@/models/location', () => ({
  Location: {
    // findById().lean() / findOne().lean() パターンをサポート
    // Support findById().lean() / findOne().lean() pattern
    findById: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    find: vi.fn(),
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
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
  generateSequenceNumber: vi.fn().mockResolvedValue('MV-00001'),
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
  getWarehouseFilter: vi.fn().mockReturnValue([]),
}))

// ─── インポート / Imports ──────────────────────────────────────────────────
import { InboundOrder } from '@/models/inboundOrder'
import { Product } from '@/models/product'
import { Location } from '@/models/location'
import { StockQuant } from '@/models/stockQuant'
import { StockMove } from '@/models/stockMove'
import { generateSequenceNumber } from '@/utils/sequenceGenerator'
import { getWarehouseFilter } from '@/api/helpers/tenantHelper'
import {
  listInboundOrders,
  getInboundOrder,
  createInboundOrder,
  updateInboundOrder,
  confirmInboundOrder,
  receiveInboundLine,
  completeInboundOrder,
  cancelInboundOrder,
  putawayInboundLine,
  bulkReceiveInbound,
  deleteInboundOrder,
  searchInboundHistory,
  getInboundVariance,
  suggestPutawayLocations,
} from '@/api/controllers/inboundOrderController'

// ─── テストユーティリティ / Test utilities ────────────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 * 最小限の Request オブジェクト / Minimal Request object
 */
const mockReq = (overrides: Record<string, any> = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: undefined,
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * json() と status() をスパイとして持つオブジェクト
 * Object with json() and status() as spies
 */
const mockRes = () => {
  const res: any = {
    json: vi.fn(),
    status: vi.fn(),
  }
  // status().json() チェーンを可能にする / Enable status().json() chaining
  res.status.mockReturnValue(res)
  return res
}

/**
 * .lean() チェーンをサポートするモック生成ヘルパー / Helper to create mock supporting .lean() chain
 * Mongoose の findById().lean() / findOne().lean() パターンを模倣
 * Mimics Mongoose findById().lean() / findOne().lean() pattern
 */
const mockLean = (resolvedValue: any) => ({
  lean: vi.fn().mockResolvedValue(resolvedValue),
  populate: vi.fn().mockReturnThis(),
})

/**
 * 基本的な入庫指示オブジェクト生成 / Build a basic inbound order object
 */
const makeOrder = (overrides: Record<string, any> = {}) => ({
  _id: 'order-id-1',
  orderNumber: 'IN-00001',
  status: 'draft',
  flowType: 'standard',
  lines: [],
  destinationLocationId: 'loc-dest-1',
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

// ─── listInboundOrders ────────────────────────────────────────────────────

describe('listInboundOrders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('デフォルトパラメータで一覧を返す / returns list with default parameters', async () => {
    // Arrange: ページネーション付きの結果 / paginated result
    const fakeItems = [{ _id: 'o1', orderNumber: 'IN-001' }]
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeItems),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(1 as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listInboundOrders(req, res)

    // Assert: items, total, page, limit を含むレスポンス / response includes items, total, page, limit
    expect(res.json).toHaveBeenCalledWith({
      items: fakeItems,
      total: 1,
      page: 1,
      limit: 50,
    })
  })

  it('status フィルタをクエリに含める / includes status filter in query', async () => {
    // Arrange
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { status: 'confirmed' } })
    const res = mockRes()

    // Act
    await listInboundOrders(req, res)

    // Assert: status フィルタがクエリに含まれる / status filter included in query
    expect(InboundOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmed' }),
    )
  })

  it('limit は最大 500 にクランプされる / clamps limit to max 500', async () => {
    // Arrange
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { page: '1', limit: '99999' } })
    const res = mockRes()

    // Act
    await listInboundOrders(req, res)

    // Assert: limit は 500 以下 / limit capped at 500
    expect(findMock.limit).toHaveBeenCalledWith(500)
  })

  it('倉庫フィルタがある場合 Location.find を呼ぶ / calls Location.find when warehouse filter exists', async () => {
    // Arrange: 倉庫フィルタあり / warehouse filter present
    vi.mocked(getWarehouseFilter).mockReturnValueOnce(['wh-1'])
    const locFindMock = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ _id: 'loc-1' }]),
    }
    vi.mocked(Location.find).mockReturnValue(locFindMock as any)

    const findMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)
    vi.mocked(InboundOrder.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listInboundOrders(req, res)

    // Assert: 倉庫フィルタで Location.find が呼ばれる / Location.find called with warehouse filter
    expect(Location.find).toHaveBeenCalledWith({ warehouseId: { $in: ['wh-1'] } })
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.find).mockImplementation(() => {
      throw new Error('DB接続失敗')
    })

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listInboundOrders(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '入庫指示一覧の取得に失敗しました' }),
    )
  })
})

// ─── getInboundOrder ──────────────────────────────────────────────────────

describe('getInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('注文を返す / returns order', async () => {
    // Arrange
    const fakeOrder = { _id: 'o1', orderNumber: 'IN-001' }
    const populateMock = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrder),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(populateMock as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await getInboundOrder(req, res)

    // Assert
    expect(InboundOrder.findById).toHaveBeenCalledWith('o1')
    expect(res.json).toHaveBeenCalledWith(fakeOrder)
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    const populateMock = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(populateMock as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '入庫指示が見つかりません' })
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockImplementation(() => {
      throw new Error('クエリ失敗')
    })

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await getInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createInboundOrder ───────────────────────────────────────────────────

describe('createInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  const validBody = {
    destinationLocationId: 'loc-dest-1',
    lines: [
      {
        productId: 'prod-1',
        expectedQuantity: 10,
        lotNumber: 'LOT-A',
      },
    ],
    supplier: { name: '仕入先A' },
  }

  it('正常な入庫指示を作成し 201 を返す / creates inbound order and returns 201', async () => {
    // Arrange
    vi.mocked(Location.findById).mockReturnValue(mockLean({ _id: 'loc-dest-1', code: 'WH-01' }) as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({
      _id: 'prod-1',
      sku: 'SKU-001',
      name: '商品A',
    }) as any)
    const fakeOrder = {
      _id: 'new-order-id',
      orderNumber: 'IN-00001',
      lines: [{ expectedQuantity: 10 }],
    }
    vi.mocked(InboundOrder.create).mockResolvedValue(fakeOrder as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('IN-00001')

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert: 201 Created / 201 Created
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(fakeOrder)
  })

  it('destinationLocationId が欠落した場合 400 を返す / returns 400 when destinationLocationId missing', async () => {
    // Arrange: destinationLocationId なし / no destinationLocationId
    const req = mockReq({ body: { lines: [{ productId: 'prod-1', expectedQuantity: 5 }] } })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'destinationLocationId と lines（1行以上）は必須です' }),
    )
  })

  it('lines が空の場合 400 を返す / returns 400 when lines is empty', async () => {
    // Arrange: 空の lines / empty lines
    const req = mockReq({ body: { destinationLocationId: 'loc-1', lines: [] } })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('lines が配列でない場合 400 を返す / returns 400 when lines is not an array', async () => {
    // Arrange
    const req = mockReq({ body: { destinationLocationId: 'loc-1', lines: 'not-an-array' } })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('入庫先ロケーションが存在しない場合 400 を返す / returns 400 when destination location not found', async () => {
    // Arrange: Location が見つからない / location not found
    vi.mocked(Location.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '指定された入庫先ロケーションが見つかりません' }),
    )
  })

  it('行の productId がない場合 400 を返す / returns 400 when line productId missing', async () => {
    // Arrange
    vi.mocked(Location.findById).mockReturnValue(mockLean({ _id: 'loc-1' }) as any)

    const req = mockReq({
      body: {
        destinationLocationId: 'loc-1',
        lines: [{ expectedQuantity: 5 }], // productId なし / no productId
      },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('productId') }),
    )
  })

  it('行の expectedQuantity が 0 の場合 400 を返す / returns 400 when expectedQuantity is 0', async () => {
    // Arrange: expectedQuantity < 1 / expectedQuantity < 1
    vi.mocked(Location.findById).mockReturnValue(mockLean({ _id: 'loc-1' }) as any)

    const req = mockReq({
      body: {
        destinationLocationId: 'loc-1',
        lines: [{ productId: 'prod-1', expectedQuantity: 0 }],
      },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('行の商品が存在しない場合 400 を返す / returns 400 when line product not found', async () => {
    // Arrange
    vi.mocked(Location.findById).mockReturnValue(mockLean({ _id: 'loc-1' }) as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean(null) as any)

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('商品が見つかりません') }),
    )
  })

  it('flowType=crossdock を正しく設定する / correctly sets flowType crossdock', async () => {
    // Arrange
    vi.mocked(Location.findById).mockReturnValue(mockLean({ _id: 'loc-1' }) as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', sku: 'SKU-001', name: '商品A' }) as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('IN-00001')
    const fakeOrder = { _id: 'o1', orderNumber: 'IN-00001', lines: [{ expectedQuantity: 5 }] }
    vi.mocked(InboundOrder.create).mockResolvedValue(fakeOrder as any)

    const req = mockReq({
      body: { ...validBody, flowType: 'crossdock' },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert: flowType: 'crossdock' が create に渡される / flowType: 'crossdock' passed to create
    expect(InboundOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ flowType: 'crossdock' }),
    )
  })

  it('不正な flowType は standard にフォールバックする / invalid flowType falls back to standard', async () => {
    // Arrange
    vi.mocked(Location.findById).mockReturnValue(mockLean({ _id: 'loc-1' }) as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', sku: 'SKU-001', name: '商品A' }) as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('IN-00001')
    const fakeOrder = { _id: 'o1', orderNumber: 'IN-00001', lines: [{ expectedQuantity: 5 }] }
    vi.mocked(InboundOrder.create).mockResolvedValue(fakeOrder as any)

    const req = mockReq({
      body: { ...validBody, flowType: 'invalid_type' },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert: 不正な flowType は standard になる / invalid flowType becomes standard
    expect(InboundOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ flowType: 'standard' }),
    )
  })

  it('tenantId をリクエストユーザーから取得する / extracts tenantId from request user', async () => {
    // Arrange
    vi.mocked(Location.findById).mockReturnValue(mockLean({ _id: 'loc-1' }) as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', sku: 'SKU-001', name: '商品A' }) as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('IN-00001')
    const fakeOrder = { _id: 'o1', orderNumber: 'IN-00001', lines: [{ expectedQuantity: 5 }] }
    vi.mocked(InboundOrder.create).mockResolvedValue(fakeOrder as any)

    const req = mockReq({
      body: validBody,
      user: { tenantId: 'tenant-xyz' },
    })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert: tenantId がコレクションに渡される / tenantId passed to collection
    expect(InboundOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-xyz' }),
    )
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(Location.findById).mockReturnValue(mockLean({ _id: 'loc-1' }) as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', sku: 'SKU-001', name: '商品A' }) as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('IN-00001')
    vi.mocked(InboundOrder.create).mockRejectedValue(new Error('DB書き込み失敗'))

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '入庫指示の作成に失敗しました', error: 'DB書き込み失敗' }),
    )
  })
})

// ─── updateInboundOrder ───────────────────────────────────────────────────

describe('updateInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft 状態の注文を更新する / updates draft order', async () => {
    // Arrange
    const order = makeOrder({ status: 'draft' })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({
      params: { id: 'order-id-1' },
      body: { memo: '更新メモ', supplier: { name: '新仕入先' } },
    })
    const res = mockRes()

    // Act
    await updateInboundOrder(req, res)

    // Assert: save が呼ばれ、注文が返される / save called and order returned
    expect(order.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(order)
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()

    // Act
    await updateInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '入庫指示が見つかりません' })
  })

  it('draft 以外の状態は 400 を返す / returns 400 for non-draft status', async () => {
    // Arrange: confirmed 状態 / confirmed status
    const order = makeOrder({ status: 'confirmed' })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'order-id-1' }, body: { memo: '変更' } })
    const res = mockRes()

    // Act
    await updateInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: '下書き状態の入庫指示のみ編集可能です' })
  })

  it('lines 更新時に商品が見つからない場合 400 を返す / returns 400 when product not found in lines update', async () => {
    // Arrange
    const order = makeOrder({ status: 'draft' })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean(null) as any)

    const req = mockReq({
      params: { id: 'order-id-1' },
      body: {
        lines: [{ productId: 'bad-product', expectedQuantity: 5 }],
      },
    })
    const res = mockRes()

    // Act
    await updateInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('商品が見つかりません') }),
    )
  })

  it('lines を含む更新で Product.findById を呼ぶ / calls Product.findById for lines update', async () => {
    // Arrange
    const order = makeOrder({ status: 'draft', lines: [] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({
      _id: 'prod-1',
      sku: 'SKU-001',
      name: '商品A',
    }) as any)

    const req = mockReq({
      params: { id: 'order-id-1' },
      body: {
        lines: [{ productId: 'prod-1', expectedQuantity: 3 }],
      },
    })
    const res = mockRes()

    // Act
    await updateInboundOrder(req, res)

    // Assert: Product.findById が呼ばれた / Product.findById called
    expect(Product.findById).toHaveBeenCalledWith('prod-1')
    expect(order.save).toHaveBeenCalled()
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockRejectedValue(new Error('接続タイムアウト'))

    const req = mockReq({ params: { id: 'o1' }, body: {} })
    const res = mockRes()

    // Act
    await updateInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── confirmInboundOrder ──────────────────────────────────────────────────

describe('confirmInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft → confirmed に遷移し StockMove を作成する / transitions draft to confirmed and creates StockMove', async () => {
    // Arrange
    const line = {
      productId: 'prod-1',
      productSku: 'SKU-001',
      productName: '商品A',
      lotNumber: undefined,
      locationId: undefined,
      expectedQuantity: 5,
      stockMoveIds: [],
      push: vi.fn(),
    }
    line.stockMoveIds.push = vi.fn()
    const order = makeOrder({
      status: 'draft',
      expectedDate: new Date('2026-04-01'),
      destinationLocationId: 'loc-dest-1',
      lines: [line],
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean({ _id: 'virtual-supplier-id', code: 'VIRTUAL/SUPPLIER' }) as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('MV-00001')
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'move-1' } as any)

    const req = mockReq({ params: { id: 'order-id-1' } })
    const res = mockRes()

    // Act
    await confirmInboundOrder(req, res)

    // Assert: StockMove.create が呼ばれ、status が confirmed になる
    // StockMove.create called and status becomes confirmed
    expect(StockMove.create).toHaveBeenCalledWith(
      expect.objectContaining({ moveType: 'inbound', state: 'draft' }),
    )
    expect(order.status).toBe('confirmed')
    expect(order.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '入庫指示を確定しました' }),
    )
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await confirmInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('draft 以外の状態は 400 を返す / returns 400 for non-draft status', async () => {
    // Arrange: receiving 状態 / receiving status
    const order = makeOrder({ status: 'receiving' })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'order-id-1' } })
    const res = mockRes()

    // Act
    await confirmInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: '下書き状態の入庫指示のみ確定可能です' })
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockRejectedValue(new Error('確定DB障害'))

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await confirmInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '入庫指示の確定に失敗しました' }),
    )
  })

  it('仮想ロケーションが見つからない場合 500 を返す / returns 500 when virtual location not found', async () => {
    // Arrange: VIRTUAL/SUPPLIER が存在しない / VIRTUAL/SUPPLIER does not exist
    const order = makeOrder({ status: 'draft', lines: [{}] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean(null) as any)

    const req = mockReq({ params: { id: 'order-id-1' } })
    const res = mockRes()

    // Act
    await confirmInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('VIRTUAL/SUPPLIER') }),
    )
  })
})

// ─── receiveInboundLine ───────────────────────────────────────────────────

describe('receiveInboundLine', () => {
  beforeEach(() => vi.clearAllMocks())

  const makeLine = (overrides: Record<string, any> = {}) => ({
    lineNumber: 1,
    productId: 'prod-1',
    productSku: 'SKU-001',
    productName: '商品A',
    expectedQuantity: 10,
    receivedQuantity: 0,
    lotNumber: undefined,
    lotId: undefined,
    locationId: undefined,
    // 配列を使用（for...of イテレートに対応）/ Use array (supports for...of iteration)
    stockMoveIds: [],
    ...overrides,
  })

  it('正常に検品数量を登録する / registers received quantity successfully', async () => {
    // Arrange
    const line = makeLine()
    const order = makeOrder({
      status: 'confirmed',
      lines: [line],
      destinationLocationId: 'loc-dest-1',
      flowType: 'standard',
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', lotTrackingEnabled: false }) as any)
    vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue({} as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean({ _id: 'virtual-id' }) as any)
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'move-1' } as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('MV-00001')

    const req = mockReq({
      params: { id: 'order-id-1' },
      body: { lineNumber: 1, receiveQuantity: 5 },
    })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert: StockQuant が更新され、レスポンスが返る / StockQuant updated and response returned
    expect(StockQuant.findOneAndUpdate).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ orderStatus: 'receiving' }),
    )
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'ghost' }, body: { lineNumber: 1, receiveQuantity: 1 } })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('confirmed/receiving 以外の状態は 400 を返す / returns 400 for non-confirmed/receiving status', async () => {
    // Arrange
    const order = makeOrder({ status: 'draft' })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'o1' }, body: { lineNumber: 1, receiveQuantity: 5 } })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '確認済みまたは入庫作業中の入庫指示のみ検品可能です' }),
    )
  })

  it('存在しない行番号は 404 を返す / returns 404 for non-existent line number', async () => {
    // Arrange
    const order = makeOrder({ status: 'confirmed', lines: [makeLine({ lineNumber: 1 })] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'o1' }, body: { lineNumber: 99, receiveQuantity: 1 } })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('行番号 99') }),
    )
  })

  it('receiveQuantity < 1 の場合 400 を返す / returns 400 when receiveQuantity < 1', async () => {
    // Arrange
    const order = makeOrder({ status: 'confirmed', lines: [makeLine()] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'o1' }, body: { lineNumber: 1, receiveQuantity: 0 } })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'receiveQuantity は 1 以上必須です' })
  })

  it('予定数量を超える場合 400 を返す / returns 400 when quantity exceeds expected', async () => {
    // Arrange: expectedQuantity=10, receiveQuantity=11 / exceeds expected
    const order = makeOrder({
      status: 'confirmed',
      lines: [makeLine({ expectedQuantity: 10, receivedQuantity: 5 })],
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'o1' }, body: { lineNumber: 1, receiveQuantity: 6 } })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('受入数量が予定を超えます') }),
    )
  })

  it('全行受入完了で status が received になる / status becomes received when all lines complete', async () => {
    // Arrange: 1行で全量受入 / single line receiving all expected
    const line = makeLine({ expectedQuantity: 5, receivedQuantity: 0 })
    const order = makeOrder({
      status: 'confirmed',
      lines: [line],
      destinationLocationId: 'loc-1',
      flowType: 'standard',
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', lotTrackingEnabled: false }) as any)
    vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue({} as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean({ _id: 'virtual-id' }) as any)
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'move-1' } as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('MV-00001')

    const req = mockReq({ params: { id: 'o1' }, body: { lineNumber: 1, receiveQuantity: 5 } })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert: 全行受入完了で received に / all received becomes 'received'
    expect(order.status).toBe('received')
  })

  it('ロット管理商品は findOrCreateLot を呼ぶ / calls findOrCreateLot for lot-tracked product', async () => {
    // Arrange: ロット管理有効な商品 + lotNumber あり / lot-tracking product with lotNumber
    const { findOrCreateLot } = await import('@/api/controllers/lotController')
    const line = makeLine({
      expectedQuantity: 5,
      receivedQuantity: 0,
      lotNumber: 'LOT-ABC',
      lotId: undefined,
    })
    const order = makeOrder({
      status: 'confirmed',
      lines: [line],
      destinationLocationId: 'loc-1',
      flowType: 'standard',
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', lotTrackingEnabled: true }) as any)
    vi.mocked(findOrCreateLot).mockResolvedValue('created-lot-id' as any)
    vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue({} as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean({ _id: 'virtual-id' }) as any)
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'move-1' } as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('MV-00001')

    const req = mockReq({ params: { id: 'o1' }, body: { lineNumber: 1, receiveQuantity: 5 } })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert: findOrCreateLot が呼ばれた / findOrCreateLot called
    expect(findOrCreateLot).toHaveBeenCalledWith(
      expect.any(String), 'SKU-001', '商品A', 'LOT-ABC', undefined,
    )
    expect(res.json).toHaveBeenCalled()
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockRejectedValue(new Error('検品DB障害'))

    const req = mockReq({ params: { id: 'o1' }, body: { lineNumber: 1, receiveQuantity: 1 } })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '入庫検品に失敗しました' }),
    )
  })

  it('crossdock で全行受入完了時 status が done になる / status becomes done for crossdock when all lines complete', async () => {
    // Arrange: crossdock 注文で全量受入 / crossdock order receiving all
    const line = makeLine({ expectedQuantity: 3, receivedQuantity: 0 })
    const order = makeOrder({
      status: 'confirmed',
      lines: [line],
      destinationLocationId: 'loc-1',
      flowType: 'crossdock',
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', lotTrackingEnabled: false }) as any)
    vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue({} as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean({ _id: 'virtual-id' }) as any)
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'move-1' } as any)
    vi.mocked(StockMove.updateOne).mockResolvedValue({} as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('MV-00001')

    const req = mockReq({ params: { id: 'o1' }, body: { lineNumber: 1, receiveQuantity: 3 } })
    const res = mockRes()

    // Act
    await receiveInboundLine(req, res)

    // Assert: crossdock は棚入れスキップで done に / crossdock skips putaway, becomes 'done'
    expect(order.status).toBe('done')
  })
})

// ─── completeInboundOrder ─────────────────────────────────────────────────

describe('completeInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('receiving 状態の注文を done に完了する / completes receiving order to done', async () => {
    // Arrange
    const order = makeOrder({
      status: 'receiving',
      flowType: 'standard',
      lines: [{ stockMoveIds: ['move-1'] }],
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(StockMove.updateOne).mockResolvedValue({} as any)

    const req = mockReq({ params: { id: 'order-id-1' } })
    const res = mockRes()

    // Act
    await completeInboundOrder(req, res)

    // Assert: status が done になる / status becomes done
    expect(order.status).toBe('done')
    expect(order.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '入庫指示を完了にしました' }),
    )
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await completeInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('draft/cancelled 状態は 400 を返す / returns 400 for draft/cancelled status', async () => {
    // Arrange
    const order = makeOrder({ status: 'draft' })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await completeInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '確認済み・入庫作業中・検品済みの入庫指示のみ完了可能です' }),
    )
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockRejectedValue(new Error('完了DB障害'))

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await completeInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '入庫完了に失敗しました' }),
    )
  })

  it('crossdock の場合 通過型完了メッセージを返す / returns crossdock completion message', async () => {
    // Arrange
    const order = makeOrder({ status: 'receiving', flowType: 'crossdock', lines: [] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await completeInboundOrder(req, res)

    // Assert: crossdock メッセージ / crossdock message
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '通過型入庫を完了にしました' }),
    )
  })
})

// ─── cancelInboundOrder ───────────────────────────────────────────────────

describe('cancelInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft 状態の注文をキャンセルする / cancels draft order', async () => {
    // Arrange
    const order = makeOrder({ status: 'draft', lines: [{ stockMoveIds: [] }] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'order-id-1' } })
    const res = mockRes()

    // Act
    await cancelInboundOrder(req, res)

    // Assert: status が cancelled になる / status becomes cancelled
    expect(order.status).toBe('cancelled')
    expect(order.save).toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '入庫指示をキャンセルしました' }),
    )
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await cancelInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('done/cancelled 状態は 400 を返す / returns 400 for done/cancelled status', async () => {
    // Arrange
    const order = makeOrder({ status: 'done' })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await cancelInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '完了済み・キャンセル済みの入庫指示はキャンセルできません' }),
    )
  })

  it('receiving 状態で入庫済み行がある場合 400 を返す / returns 400 for receiving status with received lines', async () => {
    // Arrange: 入庫済み行あり / received line exists
    const order = makeOrder({
      status: 'receiving',
      lines: [{ receivedQuantity: 3, stockMoveIds: [] }],
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await cancelInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('入庫済み行') }),
    )
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockRejectedValue(new Error('キャンセルDB障害'))

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await cancelInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'キャンセルに失敗しました' }),
    )
  })

  it('confirmed 状態の注文は StockMove をキャンセルする / cancels StockMoves for confirmed order', async () => {
    // Arrange
    const order = makeOrder({
      status: 'confirmed',
      lines: [{ stockMoveIds: ['move-1', 'move-2'], receivedQuantity: 0 }],
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(StockMove.updateOne).mockResolvedValue({} as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await cancelInboundOrder(req, res)

    // Assert: StockMove.updateOne が呼ばれた / StockMove.updateOne called
    expect(StockMove.updateOne).toHaveBeenCalledTimes(2)
    expect(StockMove.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ state: { $ne: 'done' } }),
      { $set: { state: 'cancelled' } },
    )
  })
})

// ─── putawayInboundLine ───────────────────────────────────────────────────

describe('putawayInboundLine', () => {
  beforeEach(() => vi.clearAllMocks())

  const makePutawayLine = (overrides: Record<string, any> = {}) => ({
    lineNumber: 1,
    productId: 'prod-1',
    productSku: 'SKU-001',
    productName: '商品A',
    receivedQuantity: 10,
    putawayQuantity: undefined,
    putawayLocationId: undefined,
    locationId: 'loc-src-1',
    lotId: undefined,
    lotNumber: undefined,
    // 配列を使用（for...of イテレートに対応）/ Use array (supports for...of iteration)
    stockMoveIds: [],
    ...overrides,
  })

  it('棚入れを正常に実行する / executes putaway successfully', async () => {
    // Arrange: 有効な ObjectId を使用 / Use valid ObjectId
    const newLocId = '507f1f77bcf86cd799439011'
    const srcLocId = '507f1f77bcf86cd799439012'
    const line = makePutawayLine({ locationId: srcLocId })
    const order = makeOrder({
      status: 'received',
      lines: [line],
      destinationLocationId: 'loc-dest-1',
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findById).mockReturnValue(mockLean({
      _id: newLocId,
      code: 'A-01-01',
      name: 'ラック A-01',
      type: 'storage',
    }) as any)
    vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue({} as any)
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'move-transfer' } as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('MV-00002')

    const req = mockReq({
      params: { id: 'order-id-1' },
      body: { lineNumber: 1, locationId: newLocId, quantity: 10 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert: StockQuant が移動される / StockQuant moved
    expect(StockQuant.findOneAndUpdate).toHaveBeenCalledTimes(2)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('棚入れ完了') }),
    )
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockResolvedValue(null)

    const req = mockReq({
      params: { id: 'ghost' },
      body: { lineNumber: 1, locationId: 'loc-1', quantity: 5 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('received 以外の状態は 400 を返す / returns 400 for non-received status', async () => {
    // Arrange
    const order = makeOrder({ status: 'confirmed' })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, locationId: 'loc-1', quantity: 5 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: '検品済みの入庫指示のみ棚入れ可能です' })
  })

  it('存在しない行番号は 404 を返す / returns 404 for non-existent line number', async () => {
    // Arrange
    const order = makeOrder({ status: 'received', lines: [makePutawayLine({ lineNumber: 1 })] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 99, locationId: 'loc-1', quantity: 5 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('ロケーションが見つからない場合 400 を返す / returns 400 when location not found', async () => {
    // Arrange
    const order = makeOrder({ status: 'received', lines: [makePutawayLine()] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findById).mockReturnValue(mockLean(null) as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, locationId: 'bad-loc', quantity: 5 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'ロケーションが見つかりません' })
  })

  it('仮想ロケーションへの棚入れは 400 を返す / returns 400 for virtual location putaway', async () => {
    // Arrange: 仮想ロケーション / virtual location
    const order = makeOrder({ status: 'received', lines: [makePutawayLine()] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findById).mockReturnValue(mockLean({
      _id: 'virtual-loc',
      code: 'VIRTUAL/SUPPLIER',
      type: 'virtual/supplier',
    }) as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, locationId: 'virtual-loc', quantity: 5 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: '仮想ロケーションには棚入れできません' })
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockRejectedValue(new Error('棚入れDB障害'))

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, locationId: 'loc-1', quantity: 5 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '棚入れに失敗しました' }),
    )
  })

  it('棚入れ数量が範囲外の場合 400 を返す / returns 400 when putaway quantity out of range', async () => {
    // Arrange: receivedQuantity=5, quantity=10 / exceeds received
    const line = makePutawayLine({ receivedQuantity: 5 })
    const order = makeOrder({ status: 'received', lines: [line] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findById).mockReturnValue(mockLean({
      _id: 'loc-1',
      code: 'A-01',
      type: 'storage',
    }) as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { lineNumber: 1, locationId: 'loc-1', quantity: 10 },
    })
    const res = mockRes()

    // Act
    await putawayInboundLine(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('棚入れ数量は') }),
    )
  })
})

// ─── bulkReceiveInbound ───────────────────────────────────────────────────

describe('bulkReceiveInbound', () => {
  beforeEach(() => vi.clearAllMocks())

  it('全行を一括受入し received に遷移する / bulk receives all lines and transitions to received', async () => {
    // Arrange: stockMoveIds は配列 (for...of でイテレート可能) / stockMoveIds must be an array (iterable for...of)
    const lines = [
      {
        productId: 'prod-1',
        productSku: 'SKU-001',
        productName: '商品A',
        expectedQuantity: 5,
        receivedQuantity: 0,
        lotId: undefined,
        lotNumber: undefined,
        locationId: undefined,
        stockMoveIds: [],
      },
    ]
    const order = makeOrder({
      status: 'confirmed',
      flowType: 'standard',
      lines,
      destinationLocationId: 'loc-dest-1',
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean({ _id: 'virtual-id' }) as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', lotTrackingEnabled: false }) as any)
    vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue({} as any)
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'move-1' } as any)
    vi.mocked(StockMove.updateOne).mockResolvedValue({} as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('MV-00001')

    const req = mockReq({ params: { id: 'order-id-1' } })
    const res = mockRes()

    // Act
    await bulkReceiveInbound(req, res)

    // Assert: status が received に / status becomes received
    expect(order.status).toBe('received')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('一括検品完了') }),
    )
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockResolvedValue(null)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await bulkReceiveInbound(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('confirmed/receiving 以外の状態は 400 を返す / returns 400 for non-confirmed/receiving status', async () => {
    // Arrange
    const order = makeOrder({ status: 'received' })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await bulkReceiveInbound(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '確認済みまたは入庫作業中の入庫指示のみ一括検品可能です' }),
    )
  })

  it('仮想ロケーションが見つからない場合 500 を返す / returns 500 when virtual location not found', async () => {
    // Arrange
    const order = makeOrder({ status: 'confirmed', lines: [] })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean(null) as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await bulkReceiveInbound(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('VIRTUAL/SUPPLIER') }),
    )
  })

  it('crossdock 注文は done に遷移する / crossdock order transitions to done', async () => {
    // Arrange: stockMoveIds は配列 / stockMoveIds must be array
    const lines = [
      {
        productId: 'prod-1',
        productSku: 'SKU-001',
        productName: '商品A',
        expectedQuantity: 3,
        receivedQuantity: 0,
        lotId: undefined,
        lotNumber: undefined,
        locationId: undefined,
        stockMoveIds: [],
      },
    ]
    const order = makeOrder({
      status: 'confirmed',
      flowType: 'crossdock',
      lines,
      destinationLocationId: 'loc-1',
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean({ _id: 'virtual-id' }) as any)
    vi.mocked(Product.findById).mockReturnValue(mockLean({ _id: 'prod-1', lotTrackingEnabled: false }) as any)
    vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue({} as any)
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'move-1' } as any)
    vi.mocked(StockMove.updateOne).mockResolvedValue({} as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('MV-00001')

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await bulkReceiveInbound(req, res)

    // Assert: crossdock は done に / crossdock becomes done
    expect(order.status).toBe('done')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('棚入れスキップ') }),
    )
  })

  it('ロット管理商品は findOrCreateLot を呼ぶ / calls findOrCreateLot for lot-tracked products', async () => {
    // Arrange: ロット管理有効な商品 / lot-tracking enabled product
    const { findOrCreateLot } = await import('@/api/controllers/lotController')
    const lines = [
      {
        productId: 'prod-1',
        productSku: 'SKU-LOT',
        productName: 'ロット商品',
        expectedQuantity: 5,
        receivedQuantity: 0,
        lotId: undefined,
        lotNumber: 'LOT-2026-001',
        locationId: undefined,
        stockMoveIds: [],
      },
    ]
    const order = makeOrder({
      status: 'confirmed',
      flowType: 'standard',
      lines,
      destinationLocationId: 'loc-dest-1',
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findOne).mockReturnValue(mockLean({ _id: 'virtual-id' }) as any)
    // ロット管理有効な商品 / product with lot tracking enabled
    vi.mocked(Product.findById).mockReturnValue(mockLean({
      _id: 'prod-1',
      lotTrackingEnabled: true,
    }) as any)
    vi.mocked(findOrCreateLot).mockResolvedValue('new-lot-id' as any)
    vi.mocked(StockQuant.findOneAndUpdate).mockResolvedValue({} as any)
    vi.mocked(StockMove.create).mockResolvedValue({ _id: 'move-1' } as any)
    vi.mocked(StockMove.updateOne).mockResolvedValue({} as any)
    vi.mocked(generateSequenceNumber).mockResolvedValue('MV-00001')

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await bulkReceiveInbound(req, res)

    // Assert: findOrCreateLot が呼ばれた / findOrCreateLot called
    expect(findOrCreateLot).toHaveBeenCalledWith(
      expect.any(String), 'SKU-LOT', 'ロット商品', 'LOT-2026-001', undefined,
    )
  })

  it('既に受入済みの行はスキップする / skips already-received lines', async () => {
    // Arrange: 1行目は受入済み、2行目は未受入 / line1 already received, line2 not yet
    const lines = [
      {
        productId: 'prod-1',
        productSku: 'SKU-001',
        productName: '商品A',
        expectedQuantity: 5,
        receivedQuantity: 5, // 既に受入済み / already received
        lotId: undefined,
        lotNumber: undefined,
        locationId: undefined,
        stockMoveIds: { push: vi.fn() },
      },
    ]
    const order = makeOrder({
      status: 'confirmed',
      flowType: 'standard',
      lines,
      destinationLocationId: 'loc-1',
    })
    vi.mocked(InboundOrder.findById).mockResolvedValue(order as any)
    vi.mocked(Location.findOne).mockResolvedValue({ _id: 'virtual-id' } as any)
    vi.mocked(StockMove.updateOne).mockResolvedValue({} as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await bulkReceiveInbound(req, res)

    // Assert: StockQuant.findOneAndUpdate は呼ばれない（スキップ）
    // StockQuant.findOneAndUpdate not called (skipped)
    expect(StockQuant.findOneAndUpdate).not.toHaveBeenCalled()
  })
})

// ─── deleteInboundOrder ───────────────────────────────────────────────────

describe('deleteInboundOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft 状態の注文を削除する / deletes draft order', async () => {
    // Arrange
    const order = makeOrder({ status: 'draft' })
    const findByIdMock = {
      lean: vi.fn().mockResolvedValue(order),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(findByIdMock as any)
    vi.mocked(InboundOrder.findByIdAndDelete).mockResolvedValue({} as any)

    const req = mockReq({ params: { id: 'order-id-1' } })
    const res = mockRes()

    // Act
    await deleteInboundOrder(req, res)

    // Assert: 削除が呼ばれ、成功レスポンスが返る / delete called and success response returned
    expect(InboundOrder.findByIdAndDelete).toHaveBeenCalledWith('order-id-1')
    expect(res.json).toHaveBeenCalledWith({ message: '入庫指示を削除しました' })
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    const findByIdMock = {
      lean: vi.fn().mockResolvedValue(null),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(findByIdMock as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await deleteInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '入庫指示が見つかりません' })
  })

  it('draft 以外の状態は 400 を返す / returns 400 for non-draft status', async () => {
    // Arrange
    const order = makeOrder({ status: 'confirmed' })
    const findByIdMock = {
      lean: vi.fn().mockResolvedValue(order),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(findByIdMock as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await deleteInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: '下書き状態の入庫指示のみ削除可能です' })
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockImplementation(() => {
      throw new Error('DB削除失敗')
    })

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await deleteInboundOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── searchInboundHistory ─────────────────────────────────────────────────

describe('searchInboundHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('入庫履歴を行レベルでフラット化して返す / returns flattened line-level inbound history', async () => {
    // Arrange
    const fakeOrders = [
      {
        _id: 'o1',
        orderNumber: 'IN-001',
        status: 'done',
        lines: [
          {
            lineNumber: 1,
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10,
            stockCategory: 'new',
          },
        ],
      },
    ]
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrders),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: items, total, page, limit を含む / contains items, total, page, limit
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
      }),
    )
  })

  it('receivedQuantity=0 の行は除外する / excludes lines with receivedQuantity=0', async () => {
    // Arrange: 1行は受入あり、1行は受入なし / one line received, one not received
    const fakeOrders = [
      {
        _id: 'o1',
        orderNumber: 'IN-001',
        status: 'done',
        lines: [
          {
            lineNumber: 1,
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 10,
            receivedQuantity: 10, // 受入あり / received
            stockCategory: 'new',
          },
          {
            lineNumber: 2,
            productSku: 'SKU-002',
            productName: '商品B',
            expectedQuantity: 5,
            receivedQuantity: 0, // 受入なし → 除外 / not received → excluded
            stockCategory: 'new',
          },
        ],
      },
    ]
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrders),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: 受入あり行のみ返る / only received lines returned
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.total).toBe(1)
    expect(response.items[0].productSku).toBe('SKU-001')
  })

  it('productSku フィルタで絞り込む / filters by productSku', async () => {
    // Arrange: 2 SKU、1つはフィルタに一致 / 2 SKUs, 1 matches filter
    const fakeOrders = [
      {
        _id: 'o1',
        orderNumber: 'IN-001',
        status: 'done',
        lines: [
          {
            lineNumber: 1,
            productSku: 'SKU-MATCH',
            productName: '対象商品',
            expectedQuantity: 5,
            receivedQuantity: 5,
            stockCategory: 'new',
          },
          {
            lineNumber: 2,
            productSku: 'SKU-OTHER',
            productName: '別商品',
            expectedQuantity: 3,
            receivedQuantity: 3,
            stockCategory: 'new',
          },
        ],
      },
    ]
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrders),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: { productSku: 'MATCH' } })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: MATCH のみ返る / only MATCH returned
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.total).toBe(1)
    expect(response.items[0].productSku).toBe('SKU-MATCH')
  })

  it('ページネーションが正しく動作する / pagination works correctly', async () => {
    // Arrange: 3件を page=2, limit=1 でリクエスト / 3 items, request page=2 limit=1
    const lines = Array.from({ length: 3 }, (_, i) => ({
      lineNumber: i + 1,
      productSku: `SKU-00${i + 1}`,
      productName: `商品${i + 1}`,
      expectedQuantity: 5,
      receivedQuantity: 5,
      stockCategory: 'new',
    }))
    const fakeOrders = [{ _id: 'o1', orderNumber: 'IN-001', status: 'done', lines }]
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrders),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: { page: '2', limit: '1' } })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: 2ページ目、1件のみ / page 2 returns 1 item
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.total).toBe(3)
    expect(response.items).toHaveLength(1)
    expect(response.page).toBe(2)
    expect(response.limit).toBe(1)
  })

  it('stockCategory フィルタで絞り込む / filters by stockCategory', async () => {
    // Arrange: damaged と new を混在させ damaged のみ絞り込む
    // Mix damaged and new, filter to damaged only
    const fakeOrders = [
      {
        _id: 'o1',
        orderNumber: 'IN-001',
        status: 'done',
        lines: [
          {
            lineNumber: 1,
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 5,
            receivedQuantity: 5,
            stockCategory: 'damaged',
          },
          {
            lineNumber: 2,
            productSku: 'SKU-002',
            productName: '商品B',
            expectedQuantity: 3,
            receivedQuantity: 3,
            stockCategory: 'new',
          },
        ],
      },
    ]
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrders),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: { stockCategory: 'damaged' } })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: damaged のみ返る / only damaged returned
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.total).toBe(1)
    expect(response.items[0].stockCategory).toBe('damaged')
  })

  it('orderReferenceNumber フィルタで絞り込む / filters by orderReferenceNumber', async () => {
    // Arrange
    const fakeOrders = [
      {
        _id: 'o1',
        orderNumber: 'IN-001',
        status: 'done',
        lines: [
          {
            lineNumber: 1,
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 5,
            receivedQuantity: 5,
            stockCategory: 'new',
            orderReferenceNumber: 'REF-001',
          },
          {
            lineNumber: 2,
            productSku: 'SKU-002',
            productName: '商品B',
            expectedQuantity: 3,
            receivedQuantity: 3,
            stockCategory: 'new',
            orderReferenceNumber: 'OTHER-999',
          },
        ],
      },
    ]
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrders),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: { orderReferenceNumber: 'REF-001' } })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: REF-001 のみ返る / only REF-001 returned
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.total).toBe(1)
    expect(response.items[0].orderReferenceNumber).toBe('REF-001')
  })

  it('locationCode フィルタで棚入れロケーションを絞り込む / filters by putaway locationCode', async () => {
    // Arrange: putawayLocationId にコードを持たせる / putawayLocationId with code
    const fakeOrders = [
      {
        _id: 'o1',
        orderNumber: 'IN-001',
        status: 'done',
        lines: [
          {
            lineNumber: 1,
            productSku: 'SKU-001',
            productName: '商品A',
            expectedQuantity: 5,
            receivedQuantity: 5,
            stockCategory: 'new',
            putawayLocationId: { code: 'A-01-01', name: 'ラック A' },
          },
          {
            lineNumber: 2,
            productSku: 'SKU-002',
            productName: '商品B',
            expectedQuantity: 3,
            receivedQuantity: 3,
            stockCategory: 'new',
            putawayLocationId: { code: 'B-02-01', name: 'ラック B' },
          },
        ],
      },
    ]
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrders),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: { locationCode: 'A-01' } })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: A-01 のみ返る / only A-01 returned
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.total).toBe(1)
    expect(response.items[0].putawayLocationCode).toBe('A-01-01')
  })

  it('productName フィルタで絞り込む / filters by productName', async () => {
    // Arrange
    const fakeOrders = [
      {
        _id: 'o1',
        orderNumber: 'IN-001',
        status: 'done',
        lines: [
          {
            lineNumber: 1,
            productSku: 'SKU-001',
            productName: 'テスト商品ABC',
            expectedQuantity: 5,
            receivedQuantity: 5,
            stockCategory: 'new',
          },
          {
            lineNumber: 2,
            productSku: 'SKU-002',
            productName: 'サンプル品XYZ',
            expectedQuantity: 3,
            receivedQuantity: 3,
            stockCategory: 'new',
          },
        ],
      },
    ]
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrders),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: { productName: 'テスト' } })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.total).toBe(1)
    expect(response.items[0].productName).toBe('テスト商品ABC')
  })

  it('dateFrom/dateTo フィルタで完了日範囲を絞り込む / filters by completedAt date range', async () => {
    // Arrange: 日付範囲フィルタ / date range filter
    const fakeOrders: any[] = []
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrders),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: { dateFrom: '2026-01-01', dateTo: '2026-03-31' } })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: completedAt フィルタが組み込まれる / completedAt filter applied
    expect(InboundOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ completedAt: expect.any(Object) }),
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ total: 0, items: [] }),
    )
  })

  it('dateFrom のみのフィルタ / filters with dateFrom only', async () => {
    // Arrange
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: { dateFrom: '2026-01-01' } })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: dateFrom のみでもフィルタが適用される / dateFrom-only filter applied
    expect(InboundOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({ completedAt: expect.objectContaining({ $gte: expect.any(Date) }) }),
    )
  })

  it('supplierName フィルタで仕入先を絞り込む / filters by supplierName', async () => {
    // Arrange: 仕入先名フィルタ / supplier name filter
    const findMock = {
      sort: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(InboundOrder.find).mockReturnValue(findMock as any)

    const req = mockReq({ query: { supplierName: '仕入先ABC' } })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert: supplier.name の正規表現フィルタが適用される / regex filter for supplier.name applied
    expect(InboundOrder.find).toHaveBeenCalledWith(
      expect.objectContaining({
        'supplier.name': expect.objectContaining({ $regex: '仕入先ABC' }),
      }),
    )
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.find).mockImplementation(() => {
      throw new Error('集計失敗')
    })

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await searchInboundHistory(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── getInboundVariance ───────────────────────────────────────────────────

describe('getInboundVariance', () => {
  beforeEach(() => vi.clearAllMocks())

  it('差異レポートを正しく計算して返す / calculates and returns variance report correctly', async () => {
    // Arrange
    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-001',
      status: 'done',
      supplier: { name: '仕入先A' },
      lines: [
        { lineNumber: 1, productSku: 'SKU-001', productName: '商品A', expectedQuantity: 10, receivedQuantity: 8 },
        { lineNumber: 2, productSku: 'SKU-002', productName: '商品B', expectedQuantity: 5, receivedQuantity: 5 },
        { lineNumber: 3, productSku: 'SKU-003', productName: '商品C', expectedQuantity: 3, receivedQuantity: 0 },
      ],
    }
    const populateMock = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrder),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(populateMock as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await getInboundVariance(req, res)

    // Assert: 差異が正しく計算される / variance calculated correctly
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.totalExpected).toBe(18)
    expect(response.totalReceived).toBe(13)
    expect(response.totalVariance).toBe(-5)
    expect(response.hasVariance).toBe(true)
    expect(response.shortageCount).toBe(1) // SKU-001 shortage
    expect(response.pendingCount).toBe(1)  // SKU-003 pending
    // 行レベルの差異 / line-level variance
    const sku001 = response.lines.find((l: any) => l.productSku === 'SKU-001')
    expect(sku001.variance).toBe(-2)
    expect(sku001.status).toBe('shortage')
    const sku002 = response.lines.find((l: any) => l.productSku === 'SKU-002')
    expect(sku002.status).toBe('ok')
    const sku003 = response.lines.find((l: any) => l.productSku === 'SKU-003')
    expect(sku003.status).toBe('pending')
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    const populateMock = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(populateMock as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await getInboundVariance(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '入庫指示が見つかりません' })
  })

  it('差異ゼロの注文では hasVariance=false を返す / returns hasVariance=false when no variance', async () => {
    // Arrange: 全行入庫完了 / all lines fully received
    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-001',
      status: 'done',
      lines: [
        { lineNumber: 1, productSku: 'SKU-001', productName: '商品A', expectedQuantity: 5, receivedQuantity: 5 },
      ],
    }
    const populateMock = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrder),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(populateMock as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await getInboundVariance(req, res)

    // Assert
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.hasVariance).toBe(false)
    expect(response.totalVariance).toBe(0)
  })

  it('expectedQuantity=0 の行は variancePercent=0 を返す / returns variancePercent=0 when expectedQuantity is 0', async () => {
    // Arrange: expectedQuantity が 0 の行 / line with expectedQuantity=0
    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-001',
      status: 'done',
      lines: [
        {
          lineNumber: 1,
          productSku: 'SKU-001',
          productName: '商品A',
          expectedQuantity: 0, // エッジケース / edge case
          receivedQuantity: 0,
        },
      ],
    }
    const populateMock = {
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeOrder),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(populateMock as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await getInboundVariance(req, res)

    // Assert: variancePercent は 0 / variancePercent is 0 when expected=0
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.lines[0].variancePercent).toBe(0)
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockImplementation(() => {
      throw new Error('DB障害')
    })

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await getInboundVariance(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── suggestPutawayLocations ──────────────────────────────────────────────

describe('suggestPutawayLocations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('各行に棚入れ推薦ロケーションを返す / returns putaway location suggestions for each line', async () => {
    // Arrange: 有効な ObjectId を使用 / Use valid ObjectIds
    const prodId1 = '507f1f77bcf86cd799439021'
    const prodId2 = '507f1f77bcf86cd799439022'
    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-001',
      lines: [
        { lineNumber: 1, productId: prodId1, productSku: 'SKU-001' },
        { lineNumber: 2, productId: prodId2, productSku: 'SKU-002' },
      ],
    }
    const findByIdMock = {
      lean: vi.fn().mockResolvedValue(fakeOrder),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(findByIdMock as any)

    // prodId1 は在庫あり、prodId2 は在庫なし / prodId1 has stock, prodId2 has no stock
    vi.mocked(StockQuant.aggregate)
      .mockResolvedValueOnce([
        {
          locationId: 'loc-storage-1',
          location: { code: 'A-01-01', name: 'ラック A-01' },
          quantity: 100,
        },
      ] as any)
      .mockResolvedValueOnce([] as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await suggestPutawayLocations(req, res)

    // Assert
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.suggestions).toHaveLength(2)

    const sug1 = response.suggestions.find((s: any) => s.productSku === 'SKU-001')
    expect(sug1.suggestedLocationCode).toBe('A-01-01')
    expect(sug1.existingStock).toBe(100)
    expect(sug1.reason).toContain('100')

    const sug2 = response.suggestions.find((s: any) => s.productSku === 'SKU-002')
    expect(sug2.suggestedLocationId).toBeNull()
    expect(sug2.reason).toBeNull()
  })

  it('注文が見つからない場合 404 を返す / returns 404 when order not found', async () => {
    // Arrange
    const findByIdMock = {
      lean: vi.fn().mockResolvedValue(null),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(findByIdMock as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await suggestPutawayLocations(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '入庫指示が見つかりません' })
  })

  it('在庫クアンタムに location フィールドがない場合空文字にフォールバックする / falls back to empty string when quant has no location fields', async () => {
    // Arrange: location.code / location.name が未定義の場合 / when location.code/name undefined
    const prodId = '507f1f77bcf86cd799439031'
    const fakeOrder = {
      _id: 'o1',
      orderNumber: 'IN-001',
      lines: [{ lineNumber: 1, productId: prodId, productSku: 'SKU-001' }],
    }
    const findByIdMock = {
      lean: vi.fn().mockResolvedValue(fakeOrder),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(findByIdMock as any)

    // location フィールドなしの在庫クアンタム / stock quant without location fields
    vi.mocked(StockQuant.aggregate).mockResolvedValueOnce([
      {
        locationId: 'loc-1',
        location: null, // location が null / location is null
        quantity: 50,
      },
    ] as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await suggestPutawayLocations(req, res)

    // Assert: location が null の場合、code/name は空文字 → null にフォールバック
    // When location is null, code/name are empty string → falls back to null
    const response = vi.mocked(res.json).mock.calls[0][0]
    // locationCode/Name は空文字（falsy）のため null にフォールバックされる
    // locationCode/Name are empty string (falsy), so they fall back to null
    expect(response.suggestions[0].suggestedLocationCode).toBeNull()
    expect(response.suggestions[0].suggestedLocationName).toBeNull()
    expect(response.suggestions[0].existingStock).toBe(50)
  })

  it('行が空の場合は空の suggestions を返す / returns empty suggestions for empty lines', async () => {
    // Arrange: 行なし / no lines
    const fakeOrder = { _id: 'o1', orderNumber: 'IN-001', lines: [] }
    const findByIdMock = {
      lean: vi.fn().mockResolvedValue(fakeOrder),
    }
    vi.mocked(InboundOrder.findById).mockReturnValue(findByIdMock as any)

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await suggestPutawayLocations(req, res)

    // Assert
    const response = vi.mocked(res.json).mock.calls[0][0]
    expect(response.suggestions).toHaveLength(0)
  })

  it('DBエラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InboundOrder.findById).mockImplementation(() => {
      throw new Error('集計エラー')
    })

    const req = mockReq({ params: { id: 'o1' } })
    const res = mockRes()

    // Act
    await suggestPutawayLocations(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ロケーション推薦の取得に失敗しました' }),
    )
  })
})
