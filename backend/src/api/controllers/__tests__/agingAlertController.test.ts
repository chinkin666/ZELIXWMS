/**
 * agingAlertController 単元テスト / agingAlertController 单元测试
 *
 * 在庫エイジング警告の取得テスト / 库龄预警获取测试
 *
 * モック方針 / Mock strategy:
 * - mongoose.connection.collection をモックして DB 不要にする
 *   Mock mongoose.connection.collection to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

const mockFind = vi.fn()
const mockFindOne = vi.fn()

vi.mock('mongoose', () => {
  const collection = vi.fn(() => ({
    find: mockFind,
    findOne: mockFindOne,
  }))
  return {
    default: {
      connection: { collection },
      Types: {
        ObjectId: vi.fn((id: string) => id),
      },
    },
  }
})

// ─── インポート / 导入 ──────────

import { getAgingAlerts } from '../agingAlertController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

/** モックリクエスト生成 / Mock请求工厂 */
const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

/** モックレスポンス生成 / Mock响应工厂 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

describe('getAgingAlerts / 在庫エイジング警告取得 / 获取库龄预警', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 正常系: 空結果 / 正常情况：空结果
  it('空データで summary と alerts を返す / 空数据返回summary和alerts', async () => {
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const req = mockReq()
    const res = mockRes()
    await getAgingAlerts(req, res)

    expect(res.json).toHaveBeenCalledWith({
      summary: expect.objectContaining({
        warning: 0,
        danger: 0,
        critical: 0,
        total: 0,
      }),
      alerts: [],
    })
  })

  // 正常系: エイジングデータ付き / 正常情况：有库龄数据
  it('エイジング quants を正しいレベルで返す / 返回正确级别的库龄数据', async () => {
    const now = Date.now()
    const quants = [
      {
        productId: 'p1',
        locationId: 'l1',
        clientId: 'c1',
        quantity: 10,
        lastMovedAt: new Date(now - 70 * 24 * 60 * 60 * 1000), // 70日 → warning
      },
      {
        productId: 'p2',
        locationId: 'l2',
        clientId: 'c2',
        quantity: 5,
        lastMovedAt: new Date(now - 100 * 24 * 60 * 60 * 1000), // 100日 → danger
      },
      {
        productId: 'p3',
        locationId: 'l3',
        clientId: 'c3',
        quantity: 2,
        lastMovedAt: new Date(now - 200 * 24 * 60 * 60 * 1000), // 200日 → critical
      },
    ]

    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(quants),
        }),
      }),
    })
    mockFindOne.mockResolvedValue(null)

    const req = mockReq()
    const res = mockRes()
    await getAgingAlerts(req, res)

    expect(res.json).toHaveBeenCalledTimes(1)
    const result = res.json.mock.calls[0][0]
    expect(result.summary.warning).toBe(1)
    expect(result.summary.danger).toBe(1)
    expect(result.summary.critical).toBe(1)
    expect(result.summary.total).toBe(3)
    expect(result.alerts).toHaveLength(3)
  })

  // 正常系: clientId フィルター / 正常情况：clientId过滤
  it('clientId クエリパラメータでフィルターする / 使用clientId查询参数过滤', async () => {
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const req = mockReq({ query: { clientId: 'abc123' } })
    const res = mockRes()
    await getAgingAlerts(req, res)

    expect(res.json).toHaveBeenCalledTimes(1)
  })

  // 正常系: threshold パラメータ / 正常情况：threshold参数
  it('threshold クエリパラメータを使用する / 使用threshold查询参数', async () => {
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const req = mockReq({ query: { threshold: '90' } })
    const res = mockRes()
    await getAgingAlerts(req, res)

    expect(res.json).toHaveBeenCalledTimes(1)
  })

  // 正常系: 商品・ロケーション情報付き / 正常情况：附带商品和库位信息
  it('商品・ロケーション情報を含めて返す / 包含商品和库位信息返回', async () => {
    const now = Date.now()
    const quants = [
      {
        productId: 'p1',
        locationId: 'l1',
        clientId: 'c1',
        quantity: 10,
        lastMovedAt: new Date(now - 70 * 24 * 60 * 60 * 1000),
      },
    ]

    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(quants),
        }),
      }),
    })
    mockFindOne.mockImplementation(({ _id }: any) => {
      if (_id === 'p1') return Promise.resolve({ sku: 'SKU-001', name: 'Product A' })
      if (_id === 'l1') return Promise.resolve({ code: 'LOC-A1' })
      return Promise.resolve(null)
    })

    const req = mockReq()
    const res = mockRes()
    await getAgingAlerts(req, res)

    const result = res.json.mock.calls[0][0]
    expect(result.alerts[0].sku).toBe('SKU-001')
    expect(result.alerts[0].productName).toBe('Product A')
    expect(result.alerts[0].locationCode).toBe('LOC-A1')
  })

  // 正常系: 商品が見つからない場合 / 正常情况：商品未找到时
  it('商品が見つからない場合 unknown を返す / 商品未找到时返回unknown', async () => {
    const now = Date.now()
    const quants = [
      {
        productId: 'p1',
        locationId: 'l1',
        quantity: 5,
        lastMovedAt: new Date(now - 70 * 24 * 60 * 60 * 1000),
      },
    ]

    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(quants),
        }),
      }),
    })
    mockFindOne.mockResolvedValue(null)

    const req = mockReq()
    const res = mockRes()
    await getAgingAlerts(req, res)

    const result = res.json.mock.calls[0][0]
    expect(result.alerts[0].sku).toBe('unknown')
    expect(result.alerts[0].locationCode).toBe('')
  })

  // 異常系: DB エラー時 500 / 异常情况：DB错误返回500
  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockRejectedValue(new Error('DB connection failed')),
        }),
      }),
    })

    const req = mockReq()
    const res = mockRes()
    await getAgingAlerts(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'DB connection failed' })
  })

  // エッジケース: threshold デフォルト値 / 边界情况：threshold默认值
  it('threshold が未指定の場合デフォルト 60 を使用する / threshold未指定时使用默认值60', async () => {
    mockFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    })

    const req = mockReq({ query: {} })
    const res = mockRes()
    await getAgingAlerts(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.objectContaining({ thresholds: expect.any(Array) }),
      }),
    )
  })
})
