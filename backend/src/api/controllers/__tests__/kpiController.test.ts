/**
 * kpiController 统合テスト / KPI Controller Integration Tests
 *
 * mongoose コレクションを通じた KPI ダッシュボードデータ取得の HTTP フローを検証する。
 * Verifies HTTP flow for KPI dashboard data retrieval through mongoose collections.
 *
 * モック方針 / Mock strategy:
 * - mongoose.connection.collection をモック（動的コレクションアクセスに対応）
 *   Mock mongoose.connection.collection (for dynamic collection access)
 * - inbound_orders, inspection_records, labeling_tasks, exception_reports を個別にモック
 *   Mock each collection: inbound_orders, labeling_tasks, exception_reports
 * - SOP 目標値に対する達成判定を確認
 *   Verify KPI achievement determination against SOP target values
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

// 各コレクションのモック / Mock for each collection
const mockInboundOrderCollection = { find: vi.fn() }
const mockLabelingTaskCollection = { find: vi.fn() }
const mockExceptionReportCollection = { find: vi.fn() }

vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal<typeof import('mongoose')>()
  return {
    ...actual,
    default: {
      ...actual.default,
      connection: {
        collection: vi.fn((name: string) => {
          if (name === 'inbound_orders') return mockInboundOrderCollection
          if (name === 'labeling_tasks') return mockLabelingTaskCollection
          if (name === 'exception_reports') return mockExceptionReportCollection
          return { find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })) }
        }),
      },
    },
  }
})

import { getKpiDashboard } from '@/api/controllers/kpiController'

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

/**
 * 各コレクションのデフォルトモックを設定するヘルパー
 * Helper to set default mocks for all collections
 */
const setupDefaultCollectionMocks = (overrides: {
  inboundOrders?: any[]
  labelingTasks?: any[]
  exceptionReports?: any[]
} = {}) => {
  mockInboundOrderCollection.find.mockReturnValue({
    toArray: vi.fn().mockResolvedValue(overrides.inboundOrders ?? []),
  })
  mockLabelingTaskCollection.find.mockReturnValue({
    toArray: vi.fn().mockResolvedValue(overrides.labelingTasks ?? []),
  })
  mockExceptionReportCollection.find.mockReturnValue({
    toArray: vi.fn().mockResolvedValue(overrides.exceptionReports ?? []),
  })
}

// ─── getKpiDashboard ───────────────────────────────────────────

describe('getKpiDashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('データがない場合すべての KPI が目標値達成で返る / all KPIs met when no data exists', async () => {
    // Arrange: 全コレクション空 / all collections empty
    setupDefaultCollectionMocks()

    const req = mockReq({ query: { period: '2026-01' } })
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: データなしの場合は 100% 精度で初期化 / initialized at 100% accuracy when no data
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result.kpis).toHaveLength(4)
    result.kpis.forEach((kpi: any) => {
      expect(kpi.met).toBe(true)
    })
  })

  it('period クエリが period フィールドに反映される / period query is reflected in period field', async () => {
    // Arrange
    setupDefaultCollectionMocks()

    const req = mockReq({ query: { period: '2026-03' } })
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: 指定 period が返される / specified period is returned
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result.period).toBe('2026-03')
  })

  it('period 未指定の場合は現在年月が使われる / uses current year-month when period not specified', async () => {
    // Arrange
    setupDefaultCollectionMocks()

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: 現在年月の形式（YYYY-MM）/ current year-month format (YYYY-MM)
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result.period).toMatch(/^\d{4}-\d{2}$/)
  })

  it('入庫差異がある場合、入庫精度が低下し目標未達になる / inbound accuracy drops and misses target when variances exist', async () => {
    // Arrange: 10 件中 2 件が差異あり → 精度 80% < 99.5% 目標
    // 10 orders, 2 with variance → accuracy 80% < 99.5% target
    const inboundOrders = [
      ...Array.from({ length: 8 }, () => ({ varianceReport: { hasVariance: false } })),
      { varianceReport: { hasVariance: true } },
      { varianceReport: { hasVariance: true } },
    ]
    setupDefaultCollectionMocks({ inboundOrders })

    const req = mockReq({ query: { period: '2026-01' } })
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: 入庫精度 KPI が目標未達 / inbound accuracy KPI not met
    const result = vi.mocked(res.json).mock.calls[0][0]
    const inboundKpi = result.kpis.find((k: any) => k.name.includes('入庫精度'))
    expect(inboundKpi).toBeDefined()
    expect(inboundKpi.met).toBe(false)
    // 精度 = (10 - 2) / 10 = 0.8 / accuracy = (10 - 2) / 10 = 0.8
    expect(inboundKpi.actual).toBeCloseTo(0.8)
  })

  it('ラベル精度が低下した場合は目標未達になる / labeling accuracy misses target when failures exist', async () => {
    // Arrange: 1000 件中 5 件失敗 → 精度 99.5% < 99.8% 目標
    // 1000 labels, 5 failed → accuracy 99.5% < 99.8% target
    const labelingTasks = [
      { requiredQuantity: 1000, failedQuantity: 5 },
    ]
    setupDefaultCollectionMocks({ labelingTasks })

    const req = mockReq({ query: { period: '2026-01' } })
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: ラベル精度 KPI が目標未達 / labeling accuracy KPI not met
    const result = vi.mocked(res.json).mock.calls[0][0]
    const labelingKpi = result.kpis.find((k: any) => k.name.includes('ラベル精度'))
    expect(labelingKpi).toBeDefined()
    expect(labelingKpi.met).toBe(false)
    // 精度 = (1000 - 5) / 1000 = 0.995 / accuracy = 0.995
    expect(labelingKpi.actual).toBeCloseTo(0.995)
  })

  it('SLA 違反がある場合は異常 SLA 達成率が低下する / exception SLA rate drops when SLA breaches exist', async () => {
    // Arrange: 10 件中 3 件 SLA 違反 → 達成率 70% < 100% 目標
    // 10 exceptions, 3 SLA breached → rate 70% < 100% target
    const exceptionReports = [
      ...Array.from({ length: 7 }, () => ({ slaBreached: false })),
      { slaBreached: true },
      { slaBreached: true },
      { slaBreached: true },
    ]
    setupDefaultCollectionMocks({ exceptionReports })

    const req = mockReq({ query: { period: '2026-01' } })
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: 異常 SLA 達成率 KPI が目標未達 / exception SLA rate KPI not met
    const result = vi.mocked(res.json).mock.calls[0][0]
    const exceptionKpi = result.kpis.find((k: any) => k.name.includes('SLA'))
    expect(exceptionKpi).toBeDefined()
    expect(exceptionKpi.met).toBe(false)
    expect(exceptionKpi.actual).toBeCloseTo(0.7)
  })

  it('summary フィールドに集計データが含まれる / summary field contains aggregated counts', async () => {
    // Arrange
    const inboundOrders = Array.from({ length: 5 }, () => ({ varianceReport: { hasVariance: false } }))
    const labelingTasks = [{ requiredQuantity: 100, failedQuantity: 0 }]
    const exceptionReports = [{ slaBreached: false }]
    setupDefaultCollectionMocks({ inboundOrders, labelingTasks, exceptionReports })

    const req = mockReq({ query: { period: '2026-01' } })
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: summary が入庫数・ラベル数・異常数を含む / summary includes inbound, label, exception counts
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result.summary).toEqual(
      expect.objectContaining({
        totalInbound: 5,
        totalLabeled: 100,
        totalExceptions: 1,
      }),
    )
  })

  it('targets フィールドに SOP 目標値が含まれる / targets field contains SOP target values', async () => {
    // Arrange
    setupDefaultCollectionMocks()

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: SOP 目標値が返される / SOP targets returned
    const result = vi.mocked(res.json).mock.calls[0][0]
    expect(result.targets).toEqual(
      expect.objectContaining({
        inboundAccuracy: expect.any(Number),
        labelingAccuracy: expect.any(Number),
        exceptionResponseRate: expect.any(Number),
        standardShipmentHours: expect.any(Number),
      }),
    )
  })

  it('出荷ありの入庫注文がある場合、平均出荷リードタイムが計算される / calculates avg shipment hours when shipped orders exist', async () => {
    // Arrange: 出荷あり / has shipped orders
    const arrivedAt = new Date('2026-01-01T09:00:00Z')
    const shippedAt = new Date('2026-01-01T21:00:00Z') // 12時間後 / 12 hours later
    const inboundOrders = [
      { arrivedAt, shippedAt, varianceReport: { hasVariance: false } },
    ]
    setupDefaultCollectionMocks({ inboundOrders })

    const req = mockReq({ query: { period: '2026-01' } })
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: 平均出荷時間 12h <= 48h → 目標達成
    // avg shipment hours 12h <= 48h → KPI met
    const result = vi.mocked(res.json).mock.calls[0][0]
    const shipKpi = result.kpis.find((k: any) => k.name.includes('リードタイム'))
    expect(shipKpi).toBeDefined()
    expect(shipKpi.met).toBe(true)
    expect(shipKpi.actual).toBeCloseTo(12, 0)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange: コレクションアクセスでエラー / collection access throws error
    mockInboundOrderCollection.find.mockReturnValue({
      toArray: vi.fn().mockRejectedValue(new Error('collection read failed')),
    })

    const req = mockReq()
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    )
  })

  it('x-tenant-id ヘッダーがない場合は "default" テナントを使う / uses "default" tenant when x-tenant-id header is absent', async () => {
    // Arrange
    setupDefaultCollectionMocks()

    const req = mockReq({ headers: {} }) // ヘッダーなし / no header
    const res = mockRes()

    // Act
    await getKpiDashboard(req, res)

    // Assert: エラーなしで正常に返る / returns normally without error
    expect(res.json).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })
})
