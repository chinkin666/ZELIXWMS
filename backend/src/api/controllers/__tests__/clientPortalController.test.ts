/**
 * clientPortalController 単体テスト / 货主门户控制器单元测试
 *
 * 荷主ポータルの全エンドポイントを検証する。
 * 验证货主门户所有端点的行为。
 *
 * モック方針 / Mock strategy:
 * - Invoice, OrderSourceCompany, StockQuant モデルをモック（DB不要）
 *   Mock Invoice, OrderSourceCompany, StockQuant models (no DB needed)
 * - mongoose.connection.collection をモックして orders コレクションを制御
 *   Mock mongoose.connection.collection to control the orders collection
 * - getTenantId はシンプルなヘルパーのためモック
 *   Mock getTenantId (simple helper)
 * - logger はサイドエフェクトのためモック
 *   Mock logger (side-effect only)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/invoice', () => ({
  Invoice: {
    find: vi.fn(),
  },
}))

vi.mock('@/models/orderSourceCompany', () => ({
  OrderSourceCompany: {
    findById: vi.fn(),
  },
}))

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    aggregate: vi.fn(),
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(() => 'T1'),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// mongoose はコレクションアクセスのためモック / Mock mongoose for collection access
vi.mock('mongoose', () => {
  const mockToArray = vi.fn()
  const mockLimit = vi.fn(() => ({ toArray: mockToArray }))
  const mockSort = vi.fn(() => ({ limit: mockLimit }))
  const mockFind = vi.fn(() => ({ sort: mockSort }))
  const mockAggregate = vi.fn(() => ({ toArray: mockToArray }))

  return {
    default: {
      connection: {
        collection: vi.fn(() => ({
          aggregate: mockAggregate,
          find: mockFind,
        })),
      },
    },
    // 名前付きエクスポートも必要 / named exports also needed
    connection: {
      collection: vi.fn(() => ({
        aggregate: mockAggregate,
        find: mockFind,
      })),
    },
  }
})

import { Invoice } from '@/models/invoice'
import { OrderSourceCompany } from '@/models/orderSourceCompany'
import { StockQuant } from '@/models/stockQuant'
import { getTenantId } from '@/api/helpers/tenantHelper'
import { logger } from '@/lib/logger'
import mongoose from 'mongoose'
import {
  getClientDashboard,
  getClientStock,
  searchTracking,
} from '@/api/controllers/clientPortalController'

// ─── テストユーティリティ / Test utilities ────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 * 荷主ロールユーザーをデフォルトに設定 / Default to client-role user
 */
const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1', clientId: 'client-123', displayName: 'テスト荷主' },
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * json() と status() をスパイとして持つオブジェクト
 * Object with json() and status() as spies
 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  // status().json() チェーンを可能にする / Enable status().json() chaining
  res.status.mockReturnValue(res)
  return res
}

// ─── モックコレクションビルダー ──────────────────────────────────
// Mock collection builder helpers

/**
 * orders コレクションのモックを構築する / Build mock for orders collection
 * aggregate と find の toArray に返す値を設定できる
 * Allows setting return values for aggregate and find toArray
 */
function buildOrderCollectionMock({
  aggregateResult = [{}],
  findResult = [],
}: {
  aggregateResult?: unknown[]
  findResult?: unknown[]
} = {}) {
  const aggregateToArray = vi.fn().mockResolvedValue(aggregateResult)
  const findToArray = vi.fn().mockResolvedValue(findResult)
  const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
  const findSort = vi.fn().mockReturnValue({ limit: findLimit })
  const findMock = vi.fn().mockReturnValue({ sort: findSort })
  const aggregateMock = vi.fn().mockReturnValue({ toArray: aggregateToArray })

  vi.mocked(mongoose.connection.collection).mockReturnValue({
    aggregate: aggregateMock,
    find: findMock,
  } as any)

  return { aggregateMock, findMock, aggregateToArray, findToArray }
}

// ─── getClientDashboard ────────────────────────────────────────

describe('getClientDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('clientId がない場合は 403 を返す / returns 403 when clientId is missing', async () => {
    // Arrange: clientId なしユーザー / user without clientId
    const req = mockReq({ user: { id: 'u1', tenantId: 'T1' } })
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
    )
  })

  it('user が undefined の場合は 403 を返す / returns 403 when user is undefined', async () => {
    // Arrange
    const req = mockReq({ user: undefined })
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('正常なダッシュボードデータを返す / returns dashboard data successfully', async () => {
    // Arrange
    const clientDocMock = { senderName: '株式会社テスト' }
    vi.mocked(OrderSourceCompany.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(clientDocMock),
      }),
    } as any)

    const aggregateStats = [
      {
        totalOrders: 50,
        shippedOrders: 40,
        pendingOrders: 10,
        totalShippingCost: 150000,
      },
    ]
    const recentOrders = [
      { orderNumber: 'ORD-001', shippingCost: 1000 },
      { orderNumber: 'ORD-002', shippingCost: 1500 },
    ]
    buildOrderCollectionMock({
      aggregateResult: aggregateStats,
      findResult: recentOrders,
    })

    const invoicesMock = [{ _id: 'inv-1', amount: 10000 }]
    vi.mocked(Invoice.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(invoicesMock),
        }),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert: 正しい構造のレスポンス / response has correct structure
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        clientName: '株式会社テスト',
        stats: expect.objectContaining({
          totalOrders: 50,
          shippedOrders: 40,
          pendingOrders: 10,
          totalShippingCost: 150000,
        }),
        recentOrders,
        invoices: invoicesMock,
      }),
    )
  })

  it('集計結果が空の場合はデフォルト値 0 を返す / returns default zeros when aggregate is empty', async () => {
    // Arrange
    vi.mocked(OrderSourceCompany.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as any)

    // 集計結果なし / no aggregate results
    buildOrderCollectionMock({ aggregateResult: [], findResult: [] })

    vi.mocked(Invoice.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert: デフォルト統計 / default stats
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stats: {
          totalOrders: 0,
          shippedOrders: 0,
          pendingOrders: 0,
          totalShippingCost: 0,
        },
      }),
    )
  })

  it('clientDoc が null のとき displayName を使用する / uses displayName when clientDoc is null', async () => {
    // Arrange: OrderSourceCompany が見つからない / OrderSourceCompany not found
    vi.mocked(OrderSourceCompany.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as any)

    buildOrderCollectionMock({ aggregateResult: [], findResult: [] })

    vi.mocked(Invoice.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any)

    const req = mockReq({
      user: { id: 'u1', tenantId: 'T1', clientId: 'client-123', displayName: 'フォールバック名' },
    })
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert: フォールバックとして displayName を使用 / use displayName as fallback
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ clientName: 'フォールバック名' }),
    )
  })

  it('getTenantId を呼び出す / calls getTenantId', async () => {
    // Arrange
    vi.mocked(OrderSourceCompany.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as any)

    buildOrderCollectionMock({ aggregateResult: [], findResult: [] })

    vi.mocked(Invoice.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert
    expect(getTenantId).toHaveBeenCalledWith(req)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange: OrderSourceCompany が例外をスロー / OrderSourceCompany throws
    vi.mocked(OrderSourceCompany.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'DB connection failed' }),
    )
  })

  it('Error インスタンスでない例外もハンドルする / handles non-Error exceptions', async () => {
    // Arrange: 文字列例外 / string exception
    vi.mocked(OrderSourceCompany.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue('some string error'),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert: デフォルトメッセージ / default message
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unknown error / 不明なエラー' }),
    )
  })

  it('clientDoc も displayName もない場合は空文字列を返す / returns empty string when both clientDoc and displayName are absent', async () => {
    // Arrange: clientDoc も displayName も存在しない / neither clientDoc nor displayName exist
    vi.mocked(OrderSourceCompany.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as any)

    buildOrderCollectionMock({ aggregateResult: [], findResult: [] })

    vi.mocked(Invoice.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any)

    // displayName なしユーザー / user without displayName
    const req = mockReq({
      user: { id: 'u1', tenantId: 'T1', clientId: 'client-123' },
    })
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert: clientName は空文字列 / clientName is empty string
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ clientName: '' }),
    )
  })

  it('Invoice.find が tenantId と clientId でフィルタされる / Invoice.find is filtered by tenantId and clientId', async () => {
    // Arrange
    vi.mocked(OrderSourceCompany.findById).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as any)

    buildOrderCollectionMock({ aggregateResult: [], findResult: [] })

    const invoiceFindSpy = vi.mocked(Invoice.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientDashboard(req, res)

    // Assert: Invoice.find は tenantId と clientId を含む / Invoice.find includes tenantId and clientId
    expect(invoiceFindSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'T1',
        clientId: 'client-123',
      }),
    )
  })
})

// ─── getClientStock ────────────────────────────────────────────

describe('getClientStock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('在庫サマリーを正常に返す / returns stock summary successfully', async () => {
    // Arrange
    const stockData = [
      {
        _id: 'prod-1',
        productSku: 'SKU-001',
        productName: '商品A',
        quantity: 100,
        reservedQuantity: 20,
        availableQuantity: 80,
      },
      {
        _id: 'prod-2',
        productSku: 'SKU-002',
        productName: '商品B',
        quantity: 50,
        reservedQuantity: 0,
        availableQuantity: 50,
      },
    ]
    vi.mocked(StockQuant.aggregate).mockResolvedValue(stockData as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientStock(req, res)

    // Assert: 集計結果をそのまま返す / returns aggregate result directly
    expect(StockQuant.aggregate).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith(stockData)
  })

  it('在庫がゼロ件の場合は空配列を返す / returns empty array when no stock', async () => {
    // Arrange
    vi.mocked(StockQuant.aggregate).mockResolvedValue([] as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientStock(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('aggregate パイプラインが quantity > 0 フィルタを含む / aggregate pipeline includes quantity > 0 filter', async () => {
    // Arrange
    vi.mocked(StockQuant.aggregate).mockResolvedValue([] as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientStock(req, res)

    // Assert: パイプラインの最初のステージ確認 / verify first pipeline stage
    const pipeline = vi.mocked(StockQuant.aggregate).mock.calls[0]?.[0] as any[]
    expect(pipeline[0]).toEqual({ $match: { quantity: { $gt: 0 } } })
  })

  it('DB エラー時に 500 を返しエラーログを記録する / returns 500 and logs error on DB failure', async () => {
    // Arrange
    const dbError = new Error('aggregate failed')
    vi.mocked(StockQuant.aggregate).mockRejectedValue(dbError)

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientStock(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'aggregate failed' }),
    )
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: dbError }),
      expect.stringContaining('failed'),
    )
  })

  it('Error インスタンスでない例外もハンドルする / handles non-Error throw', async () => {
    // Arrange
    vi.mocked(StockQuant.aggregate).mockRejectedValue('raw string error')

    const req = mockReq()
    const res = mockRes()

    // Act
    await getClientStock(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unknown error' }),
    )
  })
})

// ─── searchTracking ────────────────────────────────────────────

describe('searchTracking', () => {
  beforeEach(() => vi.clearAllMocks())

  it('クエリが空の場合は空配列を返す / returns empty array when query is empty', async () => {
    // Arrange
    const req = mockReq({ query: { q: '' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert: DB を呼ばずに空配列を返す / returns empty array without DB call
    expect(res.json).toHaveBeenCalledWith([])
    expect(mongoose.connection.collection).not.toHaveBeenCalled()
  })

  it('q パラメータがない場合は空配列を返す / returns empty array when q param is absent', async () => {
    // Arrange
    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('空白のみのクエリは空配列を返す / whitespace-only query returns empty array', async () => {
    // Arrange
    const req = mockReq({ query: { q: '   ' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert: trim 後に空なので DB クエリをスキップ / skip DB after trim
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('出荷済みオーダーを正しくマッピングする / maps shipped orders correctly', async () => {
    // Arrange
    const rawOrders = [
      {
        orderNumber: 'ORD-001',
        trackingId: 'TRK-001',
        carrierId: 'yamato',
        status: { shipped: { isShipped: true, shippedAt: '2026-01-15T10:00:00Z' } },
        recipient: { name: '山田太郎' },
      },
    ]

    const findToArray = vi.fn().mockResolvedValue(rawOrders)
    const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
    const findSort = vi.fn().mockReturnValue({ limit: findLimit })
    const findMock = vi.fn().mockReturnValue({ sort: findSort })

    vi.mocked(mongoose.connection.collection).mockReturnValue({
      find: findMock,
    } as any)

    const req = mockReq({ query: { q: 'ORD-001' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert: 出荷済みステータスが正しくマッピングされる / shipped status mapped correctly
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        orderNumber: 'ORD-001',
        trackingId: 'TRK-001',
        carrierName: 'yamato',
        status: '出荷済',
        shippedAt: '2026-01-15T10:00:00Z',
        recipient: '山田太郎',
      }),
    ])
  })

  it('確認済みオーダーのステータスを確認済にマッピングする / maps confirmed orders to 確認済 status', async () => {
    // Arrange
    const rawOrders = [
      {
        orderNumber: 'ORD-002',
        trackingId: '',
        carrierId: null,
        status: {
          shipped: { isShipped: false },
          confirm: { isConfirmed: true },
        },
        recipient: { name: '鈴木花子' },
      },
    ]

    const findToArray = vi.fn().mockResolvedValue(rawOrders)
    const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
    const findSort = vi.fn().mockReturnValue({ limit: findLimit })
    const findMock = vi.fn().mockReturnValue({ sort: findSort })

    vi.mocked(mongoose.connection.collection).mockReturnValue({
      find: findMock,
    } as any)

    const req = mockReq({ query: { q: 'ORD-002' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ status: '確認済' }),
    ])
  })

  it('未確認オーダーのステータスを未確認にマッピングする / maps unconfirmed orders to 未確認 status', async () => {
    // Arrange
    const rawOrders = [
      {
        orderNumber: 'ORD-003',
        trackingId: 'TRK-003',
        carrierId: 'sagawa',
        status: {
          shipped: { isShipped: false },
          confirm: { isConfirmed: false },
        },
        recipient: { name: '' },
      },
    ]

    const findToArray = vi.fn().mockResolvedValue(rawOrders)
    const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
    const findSort = vi.fn().mockReturnValue({ limit: findLimit })
    const findMock = vi.fn().mockReturnValue({ sort: findSort })

    vi.mocked(mongoose.connection.collection).mockReturnValue({
      find: findMock,
    } as any)

    const req = mockReq({ query: { q: 'TRK-003' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert: ステータスが未確認 / status is 未確認
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ status: '未確認' }),
    ])
  })

  it('$or クエリで orderNumber/trackingId/customerManagementNumber を検索する / searches by $or on three fields', async () => {
    // Arrange
    const findToArray = vi.fn().mockResolvedValue([])
    const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
    const findSort = vi.fn().mockReturnValue({ limit: findLimit })
    const findMock = vi.fn().mockReturnValue({ sort: findSort })

    vi.mocked(mongoose.connection.collection).mockReturnValue({
      find: findMock,
    } as any)

    const req = mockReq({ query: { q: 'search-term' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert: $or クエリが正しく構築される / $or query is built correctly
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [
          { orderNumber: { $regex: 'search-term', $options: 'i' } },
          { trackingId: { $regex: 'search-term', $options: 'i' } },
          { customerManagementNumber: { $regex: 'search-term', $options: 'i' } },
        ],
      }),
      expect.any(Object),
    )
  })

  it('最大 20 件に制限される / limits results to 20', async () => {
    // Arrange
    const findToArray = vi.fn().mockResolvedValue([])
    const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
    const findSort = vi.fn().mockReturnValue({ limit: findLimit })
    const findMock = vi.fn().mockReturnValue({ sort: findSort })

    vi.mocked(mongoose.connection.collection).mockReturnValue({
      find: findMock,
    } as any)

    const req = mockReq({ query: { q: 'abc' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert: limit(20) が呼ばれる / limit(20) is called
    expect(findLimit).toHaveBeenCalledWith(20)
  })

  it('recipient が存在しないオーダーでも正常に動作する / handles orders without recipient gracefully', async () => {
    // Arrange
    const rawOrders = [
      {
        orderNumber: 'ORD-004',
        // trackingId と carrierId が undefined
        status: {},
        // recipient が undefined
      },
    ]

    const findToArray = vi.fn().mockResolvedValue(rawOrders)
    const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
    const findSort = vi.fn().mockReturnValue({ limit: findLimit })
    const findMock = vi.fn().mockReturnValue({ sort: findSort })

    vi.mocked(mongoose.connection.collection).mockReturnValue({
      find: findMock,
    } as any)

    const req = mockReq({ query: { q: 'ORD-004' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert: デフォルト値で正常にマッピングされる / mapped with default values
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        orderNumber: 'ORD-004',
        trackingId: '',
        carrierName: '',
        status: '未確認',
        recipient: '',
      }),
    ])
  })

  it('DB エラー時に 500 を返しエラーログを記録する / returns 500 and logs error on DB failure', async () => {
    // Arrange
    const dbError = new Error('collection not found')
    const findToArray = vi.fn().mockRejectedValue(dbError)
    const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
    const findSort = vi.fn().mockReturnValue({ limit: findLimit })
    const findMock = vi.fn().mockReturnValue({ sort: findSort })

    vi.mocked(mongoose.connection.collection).mockReturnValue({
      find: findMock,
    } as any)

    const req = mockReq({ query: { q: 'ORD-001' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'collection not found' }),
    )
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: dbError }),
      expect.stringContaining('failed'),
    )
  })

  it('Error インスタンスでない例外もハンドルする / handles non-Error throw in searchTracking', async () => {
    // Arrange
    const findToArray = vi.fn().mockRejectedValue({ code: 500 })
    const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
    const findSort = vi.fn().mockReturnValue({ limit: findLimit })
    const findMock = vi.fn().mockReturnValue({ sort: findSort })

    vi.mocked(mongoose.connection.collection).mockReturnValue({
      find: findMock,
    } as any)

    const req = mockReq({ query: { q: 'X' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Unknown error' }),
    )
  })

  it('クエリ前後の空白がトリムされる / query whitespace is trimmed before search', async () => {
    // Arrange
    const findToArray = vi.fn().mockResolvedValue([])
    const findLimit = vi.fn().mockReturnValue({ toArray: findToArray })
    const findSort = vi.fn().mockReturnValue({ limit: findLimit })
    const findMock = vi.fn().mockReturnValue({ sort: findSort })

    vi.mocked(mongoose.connection.collection).mockReturnValue({
      find: findMock,
    } as any)

    const req = mockReq({ query: { q: '  ORD-001  ' } })
    const res = mockRes()

    // Act
    await searchTracking(req, res)

    // Assert: トリムされた値で検索される / search with trimmed value
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { orderNumber: { $regex: 'ORD-001', $options: 'i' } },
        ]),
      }),
      expect.any(Object),
    )
  })
})
