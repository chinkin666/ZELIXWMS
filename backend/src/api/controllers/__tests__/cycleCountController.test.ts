/**
 * cycleCountController 统合テスト / Cycle Count Controller Integration Tests
 *
 * CycleCountPlan モデルを通じた棚卸操作の HTTP フローを検証する。
 * Verifies HTTP flow for cycle count operations through the CycleCountPlan model.
 *
 * モック方針 / Mock strategy:
 * - CycleCountPlan モデルをモック（DB不要）
 *   Mock CycleCountPlan model (no DB required)
 * - mongoose.connection をモック（generateItems の動的コレクションアクセスに対応）
 *   Mock mongoose.connection (for dynamic collection access in generateItems)
 * - generateNumber はランダム生成のため結果を固定しない
 *   generateNumber is random, not asserted on its exact value
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

// CycleCountPlan モデルをモック / Mock CycleCountPlan model
vi.mock('@/models/cycleCountPlan', () => ({
  CycleCountPlan: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

// mongoose の動的コレクションアクセスをモック
// Mock mongoose dynamic collection access
const mockStockQuantCollection = {
  find: vi.fn(),
}
const mockLocationCollection = {
  findOne: vi.fn(),
}
const mockProductCollection = {
  findOne: vi.fn(),
}

vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mongoose')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      connection: {
        collection: vi.fn((name: string) => {
          if (name === 'stock_quants') return mockStockQuantCollection
          if (name === 'locations') return mockLocationCollection
          if (name === 'products') return mockProductCollection
          return {}
        }),
      },
    },
  }
})

import { CycleCountPlan } from '@/models/cycleCountPlan'
import {
  listCycleCounts,
  createCycleCount,
  getCycleCount,
  generateItems,
  submitCount,
  completeCycleCount,
  coverageStats,
} from '@/api/controllers/cycleCountController'

// ─── テストユーティリティ / Test utilities ────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 * 最小限の Request オブジェクト / Minimal Request object
 */
const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: { 'x-tenant-id': 'T1' },
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

// ─── listCycleCounts ───────────────────────────────────────────

describe('listCycleCounts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('テナント内の棚卸プラン一覧をページネーションで返す / returns paginated cycle count plans within tenant', async () => {
    // Arrange
    const fakePlans = [{ _id: 'cc-1', planNumber: 'CC-202601-0001', status: 'draft' }]
    vi.mocked(CycleCountPlan.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakePlans) }),
        }),
      }),
    } as any)
    vi.mocked(CycleCountPlan.countDocuments).mockResolvedValue(1 as any)

    const req = mockReq({ query: { page: '1', limit: '20' } })
    const res = mockRes()

    // Act
    await listCycleCounts(req, res)

    // Assert: tenantId でフィルタされ data と total を返す / filtered by tenantId, returns data and total
    expect(CycleCountPlan.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'T1' }),
    )
    expect(res.json).toHaveBeenCalledWith({ data: fakePlans, total: 1 })
  })

  it('status クエリでフィルタが適用される / applies status filter from query', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    } as any)
    vi.mocked(CycleCountPlan.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { status: 'in_progress' } })
    const res = mockRes()

    // Act
    await listCycleCounts(req, res)

    // Assert: status フィルタが適用される / status filter applied
    expect(CycleCountPlan.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress' }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error('DB down')) }),
        }),
      }),
    } as any)
    vi.mocked(CycleCountPlan.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listCycleCounts(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createCycleCount ──────────────────────────────────────────

describe('createCycleCount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('棚卸プランを作成し 201 を返す / creates cycle count plan and returns 201', async () => {
    // Arrange
    const fakePlan = {
      _id: 'cc-new',
      planNumber: 'CC-202601-0001',
      status: 'draft',
      alertTriggered: false,
      toObject: () => ({
        _id: 'cc-new',
        planNumber: 'CC-202601-0001',
        status: 'draft',
        alertTriggered: false,
      }),
    }
    vi.mocked(CycleCountPlan.create).mockResolvedValue(fakePlan as any)

    const req = mockReq({ body: { period: '2026-01', type: 'monthly' } })
    const res = mockRes()

    // Act
    await createCycleCount(req, res)

    // Assert: 201 で作成されたプランを返す / returns 201 with created plan
    expect(res.status).toHaveBeenCalledWith(201)
    // status が 'draft' で固定される / status fixed as 'draft'
    expect(CycleCountPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'draft', alertTriggered: false }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await createCycleCount(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── getCycleCount ─────────────────────────────────────────────

describe('getCycleCount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存の棚卸プランを取得する / retrieves existing cycle count plan', async () => {
    // Arrange
    const fakePlan = { _id: 'cc-1', planNumber: 'CC-202601-0001' }
    vi.mocked(CycleCountPlan.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakePlan),
    } as any)

    const req = mockReq({ params: { id: 'cc-1' } })
    const res = mockRes()

    // Act
    await getCycleCount(req, res)

    // Assert
    expect(CycleCountPlan.findById).toHaveBeenCalledWith('cc-1')
    expect(res.json).toHaveBeenCalledWith(fakePlan)
  })

  it('存在しない場合 404 を返す / returns 404 when not found', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await getCycleCount(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Not found' })
  })
})

// ─── generateItems ─────────────────────────────────────────────

describe('generateItems', () => {
  beforeEach(() => vi.clearAllMocks())

  it('在庫がない場合は空メッセージを返す / returns empty message when no stock exists', async () => {
    // Arrange
    const fakePlan = {
      _id: 'cc-1',
      items: [],
      save: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(fakePlan as any)
    // 在庫なし / no stock
    mockStockQuantCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    })

    const req = mockReq({ params: { id: 'cc-1' } })
    const res = mockRes()

    // Act
    await generateItems(req, res)

    // Assert: 在庫ゼロのメッセージ / no stock message
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'No stock to count', items: 0 }),
    )
  })

  it('棚卸プランが見つからない場合 404 を返す / returns 404 when plan not found', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await generateItems(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('在庫がある場合 20% をランダム選択してアイテムを生成する / generates items from 20% random selection when stock exists', async () => {
    // Arrange
    const fakePlan = {
      _id: 'cc-1',
      items: [],
      targetSkuCount: 0,
      totalSkuCount: 0,
      coverageRate: 0,
      status: 'draft',
      save: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(fakePlan as any)
    // 5 件の在庫 → 20% = 1件選択 / 5 stock items → 20% = 1 selected
    const fakeQuants = Array.from({ length: 5 }, (_, i) => ({
      productId: `prod-${i}`,
      locationId: `loc-${i}`,
      quantity: 10,
    }))
    mockStockQuantCollection.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue(fakeQuants),
    })
    mockLocationCollection.findOne.mockResolvedValue({ code: 'A-01' })
    mockProductCollection.findOne.mockResolvedValue({ sku: 'SKU-001' })

    const req = mockReq({ params: { id: 'cc-1' } })
    const res = mockRes()

    // Act
    await generateItems(req, res)

    // Assert: アイテム数が返る、save が呼ばれる / item count returned, save called
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result).toHaveProperty('items')
    expect(result.totalSkuCount).toBe(5)
    expect(fakePlan.save).toHaveBeenCalledOnce()
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.findById).mockRejectedValue(new Error('findById failed'))

    const req = mockReq({ params: { id: 'cc-1' } })
    const res = mockRes()

    // Act
    await generateItems(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── submitCount ───────────────────────────────────────────────

describe('submitCount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('棚卸結果を正しく記録する / records cycle count results correctly', async () => {
    // Arrange
    const fakePlan = {
      _id: 'cc-1',
      items: [
        {
          sku: 'SKU-001',
          locationCode: 'A-01',
          systemQuantity: 10,
          status: 'pending',
        },
      ],
      markModified: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      toObject: () => ({
        _id: 'cc-1',
        items: [{ sku: 'SKU-001', locationCode: 'A-01', countedQuantity: 8, variance: -2 }],
      }),
    }
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(fakePlan as any)

    const req = mockReq({
      params: { id: 'cc-1' },
      body: {
        counts: [{ sku: 'SKU-001', locationCode: 'A-01', countedQuantity: 8, countedBy: 'u1' }],
      },
    })
    const res = mockRes()

    // Act
    await submitCount(req, res)

    // Assert: アイテムが更新され save が呼ばれる / items updated and save called
    expect(fakePlan.markModified).toHaveBeenCalledWith('items')
    expect(fakePlan.save).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'cc-1' }))
  })

  it('counts が空の場合 400 を返す / returns 400 when counts is empty', async () => {
    // Arrange
    const fakePlan = {
      _id: 'cc-1',
      items: [],
      save: vi.fn(),
    }
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(fakePlan as any)

    const req = mockReq({
      params: { id: 'cc-1' },
      body: { counts: [] },
    })
    const res = mockRes()

    // Act
    await submitCount(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'counts required' })
  })

  it('棚卸プランが見つからない場合 404 を返す / returns 404 when plan not found', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'ghost' }, body: { counts: [{}] } })
    const res = mockRes()

    // Act
    await submitCount(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('差異（variance）が正しく計算される / variance is calculated correctly', async () => {
    // Arrange: systemQuantity=10, countedQuantity=7 → variance=-3
    const item = {
      sku: 'SKU-002',
      locationCode: 'B-01',
      systemQuantity: 10,
      status: 'pending',
      countedQuantity: undefined,
      variance: undefined,
      varianceRate: undefined,
      countedBy: undefined,
      countedAt: undefined,
    }
    const fakePlan = {
      _id: 'cc-2',
      items: [item],
      markModified: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      toObject: () => ({ _id: 'cc-2', items: [item] }),
    }
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(fakePlan as any)

    const req = mockReq({
      params: { id: 'cc-2' },
      body: {
        counts: [{ sku: 'SKU-002', locationCode: 'B-01', countedQuantity: 7, countedBy: 'u1' }],
      },
    })
    const res = mockRes()

    // Act
    await submitCount(req, res)

    // Assert: variance = countedQuantity - systemQuantity = 7 - 10 = -3
    expect(item.countedQuantity).toBe(7)
    expect(item.variance).toBe(-3)
    expect(item.status).toBe('counted')
  })
})

// ─── completeCycleCount ────────────────────────────────────────

describe('completeCycleCount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('差異率を計算して棚卸を完了する / calculates variance rate and completes cycle count', async () => {
    // Arrange: 差異あり（>0.5%）でアラート発生 / variance > 0.5% triggers alert
    const fakePlan = {
      _id: 'cc-1',
      items: [
        { status: 'counted', systemQuantity: 100, variance: 10 }, // 10% 差異
      ],
      totalVarianceRate: 0,
      alertTriggered: false,
      status: 'in_progress',
      completedAt: undefined,
      save: vi.fn().mockResolvedValue(undefined),
      toObject: () => ({ _id: 'cc-1', status: 'completed', alertTriggered: true }),
    }
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(fakePlan as any)

    const req = mockReq({ params: { id: 'cc-1' } })
    const res = mockRes()

    // Act
    await completeCycleCount(req, res)

    // Assert: status が 'completed'、alertTriggered が true
    // status becomes 'completed', alertTriggered becomes true
    expect(fakePlan.status).toBe('completed')
    expect(fakePlan.alertTriggered).toBe(true) // 10% > 0.5% threshold
    expect(fakePlan.save).toHaveBeenCalledOnce()
  })

  it('差異が小さい場合はアラートが発生しない / no alert when variance is small', async () => {
    // Arrange: 差異 0.3%（0.5% 未満）
    const fakePlan = {
      _id: 'cc-2',
      items: [
        { status: 'counted', systemQuantity: 1000, variance: 3 }, // 0.3%
      ],
      totalVarianceRate: 0,
      alertTriggered: false,
      status: 'in_progress',
      completedAt: undefined,
      save: vi.fn().mockResolvedValue(undefined),
      toObject: () => ({ _id: 'cc-2', status: 'completed', alertTriggered: false }),
    }
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(fakePlan as any)

    const req = mockReq({ params: { id: 'cc-2' } })
    const res = mockRes()

    // Act
    await completeCycleCount(req, res)

    // Assert: alertTriggered が false / alertTriggered is false
    expect(fakePlan.alertTriggered).toBe(false)
  })

  it('棚卸プランが見つからない場合 404 を返す / returns 404 when plan not found', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.findById).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await completeCycleCount(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── coverageStats ─────────────────────────────────────────────

describe('coverageStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('年度の棚卸カバレッジ統計を返す / returns cycle count coverage stats for the year', async () => {
    // Arrange
    const fakePlans = [
      {
        items: [
          { sku: 'SKU-001', status: 'counted' },
          { sku: 'SKU-002', status: 'confirmed' },
        ],
        totalVarianceRate: 0.002,
      },
      {
        items: [
          { sku: 'SKU-001', status: 'counted' }, // 重複 / duplicate
          { sku: 'SKU-003', status: 'counted' },
        ],
        totalVarianceRate: 0.001,
      },
    ]
    vi.mocked(CycleCountPlan.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakePlans),
    } as any)

    const req = mockReq({ query: { year: '2026' } })
    const res = mockRes()

    // Act
    await coverageStats(req, res)

    // Assert: 重複を除いたユニーク SKU 数 = 3 / unique SKU count = 3 (deduped)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        year: '2026',
        completedPlans: 2,
        countedSkuCount: 3,
      }),
    )
  })

  it('棚卸プランがない場合 averageVarianceRate=0 を返す / returns averageVarianceRate=0 when no plans', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await coverageStats(req, res)

    // Assert: 棚卸なし → 平均差異率 0 / no plans → average variance rate 0
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        completedPlans: 0,
        countedSkuCount: 0,
        averageVarianceRate: 0,
      }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(CycleCountPlan.find).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB down')),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await coverageStats(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
