/**
 * adminDashboardController 单元测试 / adminDashboardController ユニットテスト
 *
 * getAdminDashboard の HTTP フローを検証する。
 * Verifies the HTTP flow for getAdminDashboard.
 *
 * モック方針 / Mock strategy:
 * - mongoose.connection.db をモックして実 DB 接続不要
 *   Mock mongoose.connection.db to eliminate real DB dependency
 * - getTenantId ヘルパーをモック
 *   Mock getTenantId helper
 * - logger をモックしてログ出力を抑制
 *   Mock logger to suppress log output in tests
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('mongoose', () => {
  const mockToArray = vi.fn()
  const mockAggregate = vi.fn(() => ({ toArray: mockToArray }))
  const mockFind = vi.fn(() => ({
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: mockToArray,
  }))
  const mockCountDocuments = vi.fn()

  return {
    default: {
      connection: {
        db: {
          collection: vi.fn(() => ({
            countDocuments: mockCountDocuments,
            aggregate: mockAggregate,
            find: mockFind,
          })),
        },
      },
    },
    __mockCountDocuments: mockCountDocuments,
    __mockAggregate: mockAggregate,
    __mockFind: mockFind,
    __mockToArray: mockToArray,
  }
})

import mongoose from 'mongoose'
import { getTenantId } from '@/api/helpers/tenantHelper'
import { getAdminDashboard } from '@/api/controllers/adminDashboardController'

// ─── テストユーティリティ / Test utilities ────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 */
const mockReq = (overrides = {}) =>
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
 * json() と status() をスパイとして持つオブジェクト
 * Object with json() and status() as spies
 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  // status().json() チェーンを可能にする / Enable status().json() chaining
  res.status.mockReturnValue(res)
  return res
}

// ─── ヘルパー: モック DB コレクションを設定する ──────────────────
// Helper: configure mock DB collections

/**
 * デフォルトの正常系 DB モックを設定する
 * Configure default happy-path DB mocks
 *
 * @param overrides - 各カウンタ / aggregation の上書き値
 */
function setupDefaultMocks(overrides: {
  clientCount?: number
  activeClientCount?: number
  warehouseCount?: number
  activeOrders?: number
  shippedThisMonth?: number
  monthlyCharges?: any[]
  recentClients?: any[]
  ordersByStatus?: any[]
  revenueByClient?: any[]
} = {}) {
  const {
    clientCount = 10,
    activeClientCount = 8,
    warehouseCount = 3,
    activeOrders = 5,
    shippedThisMonth = 20,
    monthlyCharges = [{ total: 150000, count: 12 }],
    recentClients = [
      {
        _id: { toString: () => 'c1' },
        clientCode: 'CLI-001',
        name: 'テスト顧客 / Test Client',
        clientType: 'standard',
        creditTier: 'A',
        portalEnabled: true,
      },
    ],
    ordersByStatus = [
      { _id: 'confirmed', count: 3 },
      { _id: 'shipped', count: 2 },
    ],
    revenueByClient = [
      { _id: 'c1', clientName: '顧客A / Client A', total: 80000, count: 6 },
    ],
  } = overrides

  // Promise.all で呼ばれる 8 つの並行処理をシミュレート
  // Simulate the 8 concurrent operations called in Promise.all
  let countCallIndex = 0
  const countResults = [
    clientCount,
    activeClientCount,
    warehouseCount,
    activeOrders,
    shippedThisMonth,
  ]

  const mockDb = mongoose.connection.db!
  const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

  // collection() ごとに個別のモックを返す
  // Return individual mocks per collection() call
  mockCollection.mockImplementation((name: string) => {
    const toArrayForAgg = vi.fn()
    const toArrayForFind = vi.fn()

    return {
      countDocuments: vi.fn(() => {
        const result = countResults[countCallIndex] ?? 0
        countCallIndex++
        return Promise.resolve(result)
      }),
      aggregate: vi.fn(() => ({
        toArray: toArrayForAgg.mockImplementation(() => {
          // 1回目の aggregate 呼び出し = monthlyCharges (Promise.all 内)
          // 2回目以降 = ordersByStatus, revenueByClient
          return Promise.resolve(monthlyCharges)
        }),
      })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: toArrayForFind.mockResolvedValue(recentClients),
      })),
    }
  })

  // revenueByClient は独立した aggregate 呼び出し
  // revenueByClient is a separate aggregate call after Promise.all
  // We need to intercept the second set of aggregate calls

  return {
    // 検証に使えるよう集計データを返す / expose data for assertions
    monthlyCharges,
    recentClients,
    ordersByStatus,
    revenueByClient,
  }
}

// ─── getAdminDashboard ─────────────────────────────────────────

describe('getAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTenantId).mockReturnValue('T1')
  })

  // ── 正常系 / Happy path ──────────────────────────────────────

  it('stats オブジェクトを含むダッシュボードデータを返す / returns dashboard data with stats object', async () => {
    // Arrange: DB 呼び出しシーケンスをセットアップ
    // Arrange: set up DB call sequence
    let countCallIndex = 0
    const countSequence = [10, 8, 3, 5, 20]

    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn(() => {
        const val = countSequence[countCallIndex] ?? 0
        countCallIndex++
        return Promise.resolve(val)
      }),
      aggregate: vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue([{ total: 150000, count: 12 }]),
      })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([
          {
            _id: { toString: () => 'c1' },
            clientCode: 'CLI-001',
            name: 'クライアントA / Client A',
            clientType: 'standard',
            creditTier: 'A',
            portalEnabled: true,
          },
        ]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: stats フィールドが存在し、正しい値を持つ
    // Assert: stats field exists with correct values
    expect(res.json).toHaveBeenCalledOnce()
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload).toHaveProperty('stats')
    expect(payload.stats).toMatchObject({
      clientCount: 10,
      activeClientCount: 8,
      warehouseCount: 3,
      activeOrders: 5,
      shippedThisMonth: 20,
      monthlyRevenue: 150000,
      chargeCount: 12,
    })
  })

  it('recentClients が正しくマッピングされる / recentClients are mapped correctly', async () => {
    // Arrange
    const rawClient = {
      _id: { toString: () => 'client-id-42' },
      clientCode: 'CLI-042',
      name: '株式会社テスト / Test Corp',
      clientType: 'premium',
      creditTier: 'S',
      portalEnabled: false,
    }

    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(1),
      aggregate: vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue([]),
      })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([rawClient]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: _id が文字列に変換されている / _id is converted to string
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload.recentClients).toHaveLength(1)
    expect(payload.recentClients[0]).toEqual({
      _id: 'client-id-42',
      clientCode: 'CLI-042',
      name: '株式会社テスト / Test Corp',
      clientType: 'premium',
      creditTier: 'S',
      portalEnabled: false,
    })
  })

  it('ordersByStatus が status をキーとしたオブジェクトに変換される / ordersByStatus is reduced to status-keyed object', async () => {
    // Arrange
    const statusAgg = [
      { _id: 'confirmed', count: 4 },
      { _id: 'shipped', count: 7 },
      { _id: 'processing', count: 2 },
    ]
    let aggCallCount = 0

    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({
        toArray: vi.fn(() => {
          aggCallCount++
          if (aggCallCount === 1) return Promise.resolve([]) // monthlyCharges
          if (aggCallCount === 2) return Promise.resolve(statusAgg) // ordersByStatus
          return Promise.resolve([]) // revenueByClient
        }),
      })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: reduce の結果を確認 / verify reduce result
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload.ordersByStatus).toHaveProperty('confirmed', 4)
    expect(payload.ordersByStatus).toHaveProperty('shipped', 7)
    expect(payload.ordersByStatus).toHaveProperty('processing', 2)
  })

  it('revenueByClient が正しくマッピングされる / revenueByClient is mapped correctly', async () => {
    // Arrange
    const revenueAgg = [
      { _id: 'c1', clientName: '顧客A / Client A', total: 99000, count: 8 },
    ]
    let aggCallCount = 0

    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({
        toArray: vi.fn(() => {
          aggCallCount++
          // Promise.all 内の monthlyCharges(1回) と ordersByStatus(1回),
          // その後 revenueByClient(1回)
          // In Promise.all: monthlyCharges(1) + ordersByStatus(1), then revenueByClient(1)
          if (aggCallCount <= 2) return Promise.resolve([])
          return Promise.resolve(revenueAgg)
        }),
      })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: clientId, clientName, total, count が含まれる
    // Assert: clientId, clientName, total, count are present
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload.revenueByClient).toHaveLength(1)
    expect(payload.revenueByClient[0]).toEqual({
      clientId: 'c1',
      clientName: '顧客A / Client A',
      total: 99000,
      count: 8,
    })
  })

  it('clientName が null の場合 "unknown" にフォールバックする / falls back to "unknown" when clientName is null', async () => {
    // Arrange
    const revenueAggNoName = [
      { _id: 'c99', clientName: null, total: 5000, count: 1 },
    ]
    let aggCallCount = 0

    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({
        toArray: vi.fn(() => {
          aggCallCount++
          if (aggCallCount <= 2) return Promise.resolve([])
          return Promise.resolve(revenueAggNoName)
        }),
      })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: null clientName は "unknown" になる / null clientName becomes "unknown"
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload.revenueByClient[0].clientName).toBe('unknown')
  })

  it('monthlyCharges が空の場合 monthlyRevenue=0, chargeCount=0 になる / monthlyRevenue=0 and chargeCount=0 when monthlyCharges is empty', async () => {
    // Arrange
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({
        // 空配列 = monthlyCharges[0] が undefined / empty array → monthlyCharges[0] is undefined
        toArray: vi.fn().mockResolvedValue([]),
      })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: デフォルト 0 が使われる / default 0 values used
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload.stats.monthlyRevenue).toBe(0)
    expect(payload.stats.chargeCount).toBe(0)
  })

  it('tenantId を getTenantId ヘルパーから取得する / retrieves tenantId from getTenantId helper', async () => {
    // Arrange
    vi.mocked(getTenantId).mockReturnValue('TENANT-XYZ')

    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: getTenantId がリクエストで呼ばれる / getTenantId called with request
    expect(getTenantId).toHaveBeenCalledWith(req)
  })

  it('recentClients が空の場合でも正常に動作する / works correctly when recentClients is empty', async () => {
    // Arrange
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        // 空配列 / empty array
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: recentClients は空配列 / recentClients is empty array
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload.recentClients).toEqual([])
  })

  it('ordersByStatus が空の場合 {} を返す / returns empty object when ordersByStatus is empty', async () => {
    // Arrange
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload.ordersByStatus).toEqual({})
  })

  // ── エラー系 / Error paths ────────────────────────────────────

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange: countDocuments が拒否 / countDocuments rejects
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: 500 とエラーメッセージ / 500 with error message
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Internal server error') }),
    )
  })

  it('aggregate エラー時に 500 を返す / returns 500 on aggregate error', async () => {
    // Arrange: aggregate が拒否 / aggregate rejects
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({
        toArray: vi.fn().mockRejectedValue(new Error('aggregate timeout')),
      })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    )
  })

  it('find().toArray() エラー時に 500 を返す / returns 500 when find().toArray() rejects', async () => {
    // Arrange: recentClients の find が失敗 / recentClients find fails
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockRejectedValue(new Error('cursor closed')),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('エラー時にロガーが呼ばれる / logger.error is called on error', async () => {
    // Arrange
    const { logger } = await import('@/lib/logger')
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockRejectedValue(new Error('fatal DB error')),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: logger.error が呼ばれていること / logger.error was called
    expect(logger.error).toHaveBeenCalledOnce()
  })

  // ── テナント分離 / Tenant isolation ─────────────────────────

  it('認証なしユーザーは "default" テナントを使用する / unauthenticated user uses "default" tenant', async () => {
    // Arrange: user が undefined / user is undefined
    vi.mocked(getTenantId).mockReturnValue('default')

    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    // リクエストに user なし / request without user
    const req = mockReq({ user: undefined })
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: getTenantId が 'default' を返した / getTenantId returned 'default'
    expect(getTenantId).toHaveBeenCalledWith(req)
    expect(res.json).toHaveBeenCalledOnce()
  })

  // ── レスポンス構造 / Response shape ──────────────────────────

  it('レスポンスに必要な全フィールドが含まれる / response contains all required top-level fields', async () => {
    // Arrange
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: 全トップレベルフィールドの存在確認
    // Assert: verify all top-level fields exist
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload).toHaveProperty('stats')
    expect(payload).toHaveProperty('recentClients')
    expect(payload).toHaveProperty('ordersByStatus')
    expect(payload).toHaveProperty('revenueByClient')
  })

  it('stats に全必須フィールドが含まれる / stats contains all required fields', async () => {
    // Arrange
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: stats の各フィールド / each field in stats
    const { stats } = vi.mocked(res.json).mock.calls[0][0]
    expect(stats).toHaveProperty('clientCount')
    expect(stats).toHaveProperty('activeClientCount')
    expect(stats).toHaveProperty('warehouseCount')
    expect(stats).toHaveProperty('activeOrders')
    expect(stats).toHaveProperty('shippedThisMonth')
    expect(stats).toHaveProperty('monthlyRevenue')
    expect(stats).toHaveProperty('chargeCount')
  })

  it('全件ゼロのデータも正常にレスポンスできる / handles all-zero data gracefully', async () => {
    // Arrange: 全カウントが 0 / all counts are 0
    const mockDb = mongoose.connection.db!
    const mockCollection = mockDb.collection as ReturnType<typeof vi.fn>

    mockCollection.mockImplementation(() => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      aggregate: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      find: vi.fn(() => ({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockResolvedValue([]),
      })),
    }))

    const req = mockReq()
    const res = mockRes()

    // Act
    await getAdminDashboard(req, res)

    // Assert: 500 にならずに正常レスポンス / no 500, normal response
    expect(res.status).not.toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledOnce()
    const payload = vi.mocked(res.json).mock.calls[0][0]
    expect(payload.stats.clientCount).toBe(0)
    expect(payload.stats.monthlyRevenue).toBe(0)
    expect(payload.recentClients).toEqual([])
    expect(payload.revenueByClient).toEqual([])
  })
})
