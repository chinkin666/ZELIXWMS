/**
 * inspectionController 単体テスト / Inspection Controller Unit Tests
 *
 * InspectionRecord / ExceptionReport モデル層を通じた検品操作の HTTP フローを検証する。
 * 验证通过 InspectionRecord / ExceptionReport 模型层进行检品操作的 HTTP 流程。
 *
 * モック方針 / Mock strategy:
 * - InspectionRecord, ExceptionReport モデルをすべてモック（DB不要）
 *   Mock all models (InspectionRecord, ExceptionReport) to eliminate DB dependency
 * - getTenantId ヘルパーをモック
 *   Mock getTenantId helper for deterministic tenant resolution
 * - SLA_MINUTES はモジュール定数のため実値を使用
 *   SLA_MINUTES is a module constant so real values are used
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/inspectionRecord', () => ({
  InspectionRecord: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/exceptionReport', () => ({
  ExceptionReport: {
    create: vi.fn(),
  },
  SLA_MINUTES: {
    A: 240,
    B: 120,
    C: 30,
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(() => 'T1'),
}))

import { InspectionRecord } from '@/models/inspectionRecord'
import { ExceptionReport } from '@/models/exceptionReport'
import { getTenantId } from '@/api/helpers/tenantHelper'
import {
  listInspections,
  createInspection,
  getInspection,
  verifyInspection,
} from '@/api/controllers/inspectionController'

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

// ─── listInspections ──────────────────────────────────────────────

describe('listInspections', () => {
  beforeEach(() => vi.clearAllMocks())

  it('テナントフィルタですべての検品記録を返す / returns all inspection records with tenant filter', async () => {
    // Arrange
    const fakeRecords = [
      { _id: 'r1', recordNumber: 'INS-20260321-0001', tenantId: 'T1' },
      { _id: 'r2', recordNumber: 'INS-20260321-0002', tenantId: 'T1' },
    ]
    vi.mocked(InspectionRecord.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(fakeRecords),
          }),
        }),
      }),
    } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(2 as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert: テナント ID フィルタで find が呼ばれる / find called with tenantId filter
    expect(InspectionRecord.find).toHaveBeenCalledWith({ tenantId: 'T1' })
    expect(res.json).toHaveBeenCalledWith({ data: fakeRecords, total: 2 })
  })

  it('inboundOrderId クエリパラメータでフィルタリングする / filters by inboundOrderId query param', async () => {
    // Arrange
    vi.mocked(InspectionRecord.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { inboundOrderId: 'order-123' } })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert: inboundOrderId が filter に含まれる / inboundOrderId included in filter
    expect(InspectionRecord.find).toHaveBeenCalledWith({
      tenantId: 'T1',
      inboundOrderId: 'order-123',
    })
  })

  it('デフォルトページネーション（page=1, limit=50）が適用される / applies default pagination (page=1, limit=50)', async () => {
    // Arrange
    const skipMock = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    })
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock })
    vi.mocked(InspectionRecord.find).mockReturnValue({ sort: sortMock } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert: skip(0) で page=1, limit=50 のデフォルト / skip(0) for page=1, default limit=50
    expect(skipMock).toHaveBeenCalledWith(0)
    expect(skipMock().limit).toHaveBeenCalledWith(50)
  })

  it('カスタムページネーションパラメータを正しく処理する / correctly handles custom pagination params', async () => {
    // Arrange
    const skipMock = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    })
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock })
    vi.mocked(InspectionRecord.find).mockReturnValue({ sort: sortMock } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { page: '3', limit: '20' } })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert: page=3, limit=20 → skip=40 / page 3 with limit 20 → skip 40
    expect(skipMock).toHaveBeenCalledWith(40)
    expect(skipMock().limit).toHaveBeenCalledWith(20)
  })

  it('limit の上限は 200 に制限される / limit is capped at 200', async () => {
    // Arrange
    const skipMock = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    })
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock })
    vi.mocked(InspectionRecord.find).mockReturnValue({ sort: sortMock } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { limit: '9999' } })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert: 上限 200 に切り詰め / capped to 200
    expect(skipMock().limit).toHaveBeenCalledWith(200)
  })

  it('page が 0 以下のとき page=1 にフォールバックする / falls back to page=1 when page <= 0', async () => {
    // Arrange
    const skipMock = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    })
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock })
    vi.mocked(InspectionRecord.find).mockReturnValue({ sort: sortMock } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { page: '0' } })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert: page=0 → skip=0（page=1 として扱われる）/ treated as page=1, skip=0
    expect(skipMock).toHaveBeenCalledWith(0)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InspectionRecord.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockRejectedValue(new Error('DB connection lost')),
          }),
        }),
      }),
    } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'DB connection lost' }),
    )
  })

  it('page が数値でない文字列のとき page=1 にフォールバックする / falls back to page=1 when page is non-numeric string', async () => {
    // Arrange
    const skipMock = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    })
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock })
    vi.mocked(InspectionRecord.find).mockReturnValue({ sort: sortMock } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { page: 'abc' } })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert: parseInt("abc") は NaN → || 1 フォールバック → skip(0)
    // parseInt("abc") is NaN → || 1 fallback → skip(0)
    expect(skipMock).toHaveBeenCalledWith(0)
  })

  it('limit が数値でない文字列のとき limit=50 にフォールバックする / falls back to limit=50 when limit is non-numeric string', async () => {
    // Arrange
    const skipMock = vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    })
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock })
    vi.mocked(InspectionRecord.find).mockReturnValue({ sort: sortMock } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ query: { limit: 'xyz' } })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert: parseInt("xyz") は NaN → || 50 フォールバック / parseInt("xyz") is NaN → || 50 fallback
    expect(skipMock().limit).toHaveBeenCalledWith(50)
  })

  it('getTenantId が "default" を返すとき "default" テナントでフィルタリングする / filters by "default" tenant when getTenantId returns "default"', async () => {
    // Arrange
    vi.mocked(getTenantId).mockReturnValueOnce('default')
    vi.mocked(InspectionRecord.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(InspectionRecord.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ user: undefined })
    const res = mockRes()

    // Act
    await listInspections(req, res)

    // Assert: "default" テナントで検索 / searched with "default" tenant
    expect(InspectionRecord.find).toHaveBeenCalledWith({ tenantId: 'default' })
  })
})

// ─── createInspection ─────────────────────────────────────────────

describe('createInspection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('異常なしで検品記録を作成し 201 を返す / creates inspection record without exceptions and returns 201', async () => {
    // Arrange
    const body = {
      inboundOrderId: 'order-abc',
      inspectedBy: 'worker1',
      expectedQuantity: 100,
      inspectedQuantity: 100,
      passedQuantity: 100,
      failedQuantity: 0,
      exceptions: [],
    }
    const fakeRecord = {
      ...body,
      _id: 'rec-1',
      tenantId: 'T1',
      recordNumber: 'INS-20260321-0001',
      toObject: () => ({ ...body, _id: 'rec-1', tenantId: 'T1' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: 201 で作成した記録を返す / returns created record with 201
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ inspectedBy: 'worker1', tenantId: 'T1' }),
    )
    // ExceptionReport は作成されない / ExceptionReport should NOT be created
    expect(ExceptionReport.create).not.toHaveBeenCalled()
  })

  it('recordNumber に "INS-" プレフィックスが自動付与される / auto-assigns "INS-" prefixed recordNumber', async () => {
    // Arrange
    const body = { inspectedBy: 'worker1', exceptions: [] }
    const fakeRecord = {
      ...body,
      _id: 'rec-2',
      tenantId: 'T1',
      recordNumber: 'INS-20260321-0042',
      toObject: () => ({ ...body, _id: 'rec-2', recordNumber: 'INS-20260321-0042' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: create に tenantId と INS- から始まる recordNumber が渡される
    // create receives tenantId and recordNumber starting with INS-
    const createArg = vi.mocked(InspectionRecord.create).mock.calls[0][0] as any
    expect(createArg.tenantId).toBe('T1')
    expect(createArg.recordNumber).toMatch(/^INS-\d{8}-\d{4}$/)
  })

  it('異常が 1 件（quantity ≤ 3）のとき レベル A の ExceptionReport を作成する / creates level-A ExceptionReport for exception with quantity <= 3', async () => {
    // Arrange
    const body = {
      inboundOrderId: 'order-abc',
      clientId: 'client-1',
      sku: 'SKU-001',
      inspectedBy: 'worker1',
      exceptions: [
        { category: 'label_error', quantity: 2, description: 'ラベル誤り', photoUrls: [] },
      ],
    }
    const fakeRecord = {
      ...body,
      _id: 'rec-3',
      tenantId: 'T1',
      recordNumber: 'INS-20260321-0003',
      toObject: () => ({ ...body, _id: 'rec-3' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)
    vi.mocked(ExceptionReport.create).mockResolvedValue({} as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: ExceptionReport が level A で作成される / ExceptionReport created with level A
    expect(ExceptionReport.create).toHaveBeenCalledOnce()
    const excArg = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any
    expect(excArg.level).toBe('A')
    expect(excArg.category).toBe('label_error')
    expect(excArg.affectedQuantity).toBe(2)
    expect(excArg.tenantId).toBe('T1')
    expect(excArg.status).toBe('open')
    expect(excArg.slaBreached).toBe(false)
  })

  it('異常 quantity > 3 のとき レベル B の ExceptionReport を作成する / creates level-B ExceptionReport when exception quantity > 3', async () => {
    // Arrange
    const body = {
      inboundOrderId: 'order-xyz',
      clientId: 'client-2',
      sku: 'SKU-002',
      inspectedBy: 'worker2',
      exceptions: [
        { category: 'quantity_variance', quantity: 5, description: '数量不足', photoUrls: ['http://photo.test/1.jpg'] },
      ],
    }
    const fakeRecord = {
      ...body,
      _id: 'rec-4',
      tenantId: 'T1',
      toObject: () => ({ ...body, _id: 'rec-4' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)
    vi.mocked(ExceptionReport.create).mockResolvedValue({} as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: quantity=5 → level B / quantity=5 maps to level B
    const excArg = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any
    expect(excArg.level).toBe('B')
  })

  it('異常 quantity > 10 のとき レベル C の ExceptionReport を作成する / creates level-C ExceptionReport when exception quantity > 10', async () => {
    // Arrange
    const body = {
      inboundOrderId: 'order-urgent',
      clientId: 'client-3',
      sku: 'SKU-003',
      inspectedBy: 'worker3',
      exceptions: [
        { category: 'appearance_defect', quantity: 15, description: '大量破損', photoUrls: [] },
      ],
    }
    const fakeRecord = {
      ...body,
      _id: 'rec-5',
      tenantId: 'T1',
      toObject: () => ({ ...body, _id: 'rec-5' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)
    vi.mocked(ExceptionReport.create).mockResolvedValue({} as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: quantity=15 → level C / quantity=15 maps to level C
    const excArg = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any
    expect(excArg.level).toBe('C')
  })

  it('複数の異常があるとき複数の ExceptionReport を作成する / creates multiple ExceptionReports for multiple exceptions', async () => {
    // Arrange
    const body = {
      inboundOrderId: 'order-multi',
      inspectedBy: 'worker1',
      exceptions: [
        { category: 'label_error', quantity: 1, description: '異常1', photoUrls: [] },
        { category: 'quantity_variance', quantity: 5, description: '異常2', photoUrls: [] },
        { category: 'appearance_defect', quantity: 12, description: '異常3', photoUrls: [] },
      ],
    }
    const fakeRecord = {
      ...body,
      _id: 'rec-6',
      tenantId: 'T1',
      toObject: () => ({ ...body, _id: 'rec-6' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)
    vi.mocked(ExceptionReport.create).mockResolvedValue({} as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: 3 件の ExceptionReport が作成される / 3 ExceptionReports are created
    expect(ExceptionReport.create).toHaveBeenCalledTimes(3)
    const calls = vi.mocked(ExceptionReport.create).mock.calls.map((c: any) => c[0] as any)
    expect(calls[0].level).toBe('A')
    expect(calls[1].level).toBe('B')
    expect(calls[2].level).toBe('C')
  })

  it('SLA 期限が現在時刻からレベル A = 240 分後に設定される / sets slaDeadline 240 minutes from now for level A', async () => {
    // Arrange
    const fixedNow = new Date('2026-03-21T10:00:00.000Z')
    vi.setSystemTime(fixedNow)

    const body = {
      inboundOrderId: 'order-sla',
      inspectedBy: 'worker1',
      exceptions: [{ category: 'label_error', quantity: 1, description: 'SLA テスト', photoUrls: [] }],
    }
    const fakeRecord = {
      ...body, _id: 'rec-sla', tenantId: 'T1',
      toObject: () => ({ ...body, _id: 'rec-sla' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)
    vi.mocked(ExceptionReport.create).mockResolvedValue({} as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: slaDeadline = now + 240 min / slaDeadline = now + 240 minutes
    const excArg = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any
    const expectedDeadline = new Date(fixedNow.getTime() + 240 * 60 * 1000)
    expect(excArg.slaDeadline).toEqual(expectedDeadline)

    vi.useRealTimers()
  })

  it('description が未指定のとき default description が生成される / generates default description when exception.description is missing', async () => {
    // Arrange
    const body = {
      inboundOrderId: 'order-nodesc',
      inspectedBy: 'worker1',
      exceptions: [{ category: 'packaging_issue', quantity: 2, photoUrls: [] }],
    }
    const fakeRecord = {
      ...body, _id: 'rec-ndesc', tenantId: 'T1',
      toObject: () => ({ ...body, _id: 'rec-ndesc' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)
    vi.mocked(ExceptionReport.create).mockResolvedValue({} as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: デフォルト説明 "検品異常: <category>" が設定される
    // default description "検品異常: <category>" is set
    const excArg = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any
    expect(excArg.description).toBe('検品異常: packaging_issue')
  })

  it('photoUrls が指定されたとき photos フィールドに設定される / maps photoUrls to photos field in ExceptionReport', async () => {
    // Arrange
    const photos = ['http://cdn.test/a.jpg', 'http://cdn.test/b.jpg']
    const body = {
      inboundOrderId: 'order-photos',
      inspectedBy: 'worker1',
      exceptions: [{ category: 'other', quantity: 1, description: '写真テスト', photoUrls: photos }],
    }
    const fakeRecord = {
      ...body, _id: 'rec-ph', tenantId: 'T1',
      toObject: () => ({ ...body, _id: 'rec-ph' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)
    vi.mocked(ExceptionReport.create).mockResolvedValue({} as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: photos フィールドに photoUrls が入る / photos field contains the provided URLs
    const excArg = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any
    expect(excArg.photos).toEqual(photos)
  })

  it('exceptions が undefined のとき ExceptionReport を作成しない / does not create ExceptionReport when exceptions is undefined', async () => {
    // Arrange
    const body = { inboundOrderId: 'order-noexc', inspectedBy: 'worker1' }
    const fakeRecord = {
      ...body, _id: 'rec-noexc', tenantId: 'T1',
      toObject: () => ({ ...body, _id: 'rec-noexc' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: ExceptionReport は一切作成されない / no ExceptionReport created
    expect(ExceptionReport.create).not.toHaveBeenCalled()
  })

  it('photoUrls が未定義のとき ExceptionReport の photos は空配列になる / sets photos to empty array when photoUrls is undefined', async () => {
    // Arrange — exc.photoUrls is undefined → || [] fallback branch (line 61)
    const body = {
      inboundOrderId: 'order-nophoto',
      inspectedBy: 'worker1',
      exceptions: [{ category: 'other', quantity: 1, description: 'no photo' }],
    }
    const fakeRecord = {
      ...body, _id: 'rec-nophoto', tenantId: 'T1',
      toObject: () => ({ ...body, _id: 'rec-nophoto' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)
    vi.mocked(ExceptionReport.create).mockResolvedValue({} as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: photoUrls が undefined → photos = [] / photoUrls undefined → photos = []
    const excArg = vi.mocked(ExceptionReport.create).mock.calls[0][0] as any
    expect(excArg.photos).toEqual([])
  })

  it('InspectionRecord.create が失敗したとき 500 を返す / returns 500 when InspectionRecord.create fails', async () => {
    // Arrange
    vi.mocked(InspectionRecord.create).mockRejectedValue(new Error('write conflict'))

    const req = mockReq({ body: { inspectedBy: 'worker1', exceptions: [] } })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'write conflict' }),
    )
  })

  it('ExceptionReport.create が失敗したとき 500 を返す / returns 500 when ExceptionReport.create fails', async () => {
    // Arrange
    const body = {
      inboundOrderId: 'order-excfail',
      inspectedBy: 'worker1',
      exceptions: [{ category: 'label_error', quantity: 1, description: 'テスト', photoUrls: [] }],
    }
    const fakeRecord = {
      ...body, _id: 'rec-excfail', tenantId: 'T1',
      toObject: () => ({ ...body, _id: 'rec-excfail' }),
    }
    vi.mocked(InspectionRecord.create).mockResolvedValue(fakeRecord as any)
    vi.mocked(ExceptionReport.create).mockRejectedValue(new Error('exception create failed'))

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createInspection(req, res)

    // Assert: 内部エラーを 500 に変換 / internal error converted to 500
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'exception create failed' }),
    )
  })
})

// ─── getInspection ────────────────────────────────────────────────

describe('getInspection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存の検品記録を ID で取得する / retrieves existing inspection record by ID', async () => {
    // Arrange
    const fakeRecord = {
      _id: 'rec-1',
      recordNumber: 'INS-20260321-0001',
      tenantId: 'T1',
      inspectedBy: 'worker1',
    }
    vi.mocked(InspectionRecord.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeRecord),
    } as any)

    const req = mockReq({ params: { id: 'rec-1' } })
    const res = mockRes()

    // Act
    await getInspection(req, res)

    // Assert: findById が正しい ID で呼ばれ、レコードが返る
    // findById called with correct ID, record returned
    expect(InspectionRecord.findById).toHaveBeenCalledWith('rec-1')
    expect(res.json).toHaveBeenCalledWith(fakeRecord)
  })

  it('存在しない記録の場合 404 を返す / returns 404 when inspection record not found', async () => {
    // Arrange
    vi.mocked(InspectionRecord.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent-id' } })
    const res = mockRes()

    // Act
    await getInspection(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Not found' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InspectionRecord.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('read timeout')),
    } as any)

    const req = mockReq({ params: { id: 'rec-1' } })
    const res = mockRes()

    // Act
    await getInspection(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'read timeout' }),
    )
  })

  it('lean() が null を返すとき（ID フォーマット不正含む）404 を返す / returns 404 when lean() returns null (including malformed ID)', async () => {
    // Arrange
    vi.mocked(InspectionRecord.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'bad-id-format' } })
    const res = mockRes()

    // Act
    await getInspection(req, res)

    // Assert: null → 404 / null resolves to 404
    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── verifyInspection ─────────────────────────────────────────────

describe('verifyInspection', () => {
  beforeEach(() => vi.clearAllMocks())

  it('検品記録を正常に復核する / successfully verifies an inspection record', async () => {
    // Arrange
    const fixedNow = new Date('2026-03-21T12:00:00.000Z')
    vi.setSystemTime(fixedNow)

    const updatedRecord = {
      _id: 'rec-1',
      recordNumber: 'INS-20260321-0001',
      tenantId: 'T1',
      inspectedBy: 'worker1',
      verifiedBy: 'supervisor1',
      verifiedAt: fixedNow,
    }
    vi.mocked(InspectionRecord.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRecord),
    } as any)

    const req = mockReq({ params: { id: 'rec-1' }, body: { verifiedBy: 'supervisor1' } })
    const res = mockRes()

    // Act
    await verifyInspection(req, res)

    // Assert: 正しいパラメータで findByIdAndUpdate が呼ばれる
    // findByIdAndUpdate called with correct params
    expect(InspectionRecord.findByIdAndUpdate).toHaveBeenCalledWith(
      'rec-1',
      { verifiedBy: 'supervisor1', verifiedAt: fixedNow },
      { new: true },
    )
    expect(res.json).toHaveBeenCalledWith(updatedRecord)

    vi.useRealTimers()
  })

  it('verifiedAt に現在時刻が設定される / sets verifiedAt to current time', async () => {
    // Arrange
    const fixedNow = new Date('2026-03-21T15:30:00.000Z')
    vi.setSystemTime(fixedNow)

    vi.mocked(InspectionRecord.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'rec-ts', verifiedBy: 'sup', verifiedAt: fixedNow }),
    } as any)

    const req = mockReq({ params: { id: 'rec-ts' }, body: { verifiedBy: 'sup' } })
    const res = mockRes()

    // Act
    await verifyInspection(req, res)

    // Assert: verifiedAt が現在時刻と一致する / verifiedAt matches current time
    const updateArg = vi.mocked(InspectionRecord.findByIdAndUpdate).mock.calls[0][1] as any
    expect(updateArg.verifiedAt).toEqual(fixedNow)

    vi.useRealTimers()
  })

  it('{ new: true } オプションで更新後の記録を取得する / retrieves updated record using { new: true } option', async () => {
    // Arrange
    vi.mocked(InspectionRecord.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'rec-new', verifiedBy: 'sup2' }),
    } as any)

    const req = mockReq({ params: { id: 'rec-new' }, body: { verifiedBy: 'sup2' } })
    const res = mockRes()

    // Act
    await verifyInspection(req, res)

    // Assert: 第 3 引数に { new: true } が渡される / { new: true } passed as third argument
    const optionArg = vi.mocked(InspectionRecord.findByIdAndUpdate).mock.calls[0][2] as any
    expect(optionArg).toEqual({ new: true })
  })

  it('存在しない記録の復核で 404 を返す / returns 404 when verifying non-existent record', async () => {
    // Arrange
    vi.mocked(InspectionRecord.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost-rec' }, body: { verifiedBy: 'supervisor1' } })
    const res = mockRes()

    // Act
    await verifyInspection(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Not found' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(InspectionRecord.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('update failed')),
    } as any)

    const req = mockReq({ params: { id: 'rec-1' }, body: { verifiedBy: 'supervisor1' } })
    const res = mockRes()

    // Act
    await verifyInspection(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'update failed' }),
    )
  })

  it('verifiedBy が空文字のとき空文字のまま渡される / passes empty string verifiedBy as-is', async () => {
    // Arrange
    vi.mocked(InspectionRecord.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'rec-empty', verifiedBy: '' }),
    } as any)

    const req = mockReq({ params: { id: 'rec-empty' }, body: { verifiedBy: '' } })
    const res = mockRes()

    // Act
    await verifyInspection(req, res)

    // Assert: バリデーションなし、空文字のまま渡す / no validation, empty string passed through
    const updateArg = vi.mocked(InspectionRecord.findByIdAndUpdate).mock.calls[0][1] as any
    expect(updateArg.verifiedBy).toBe('')
  })
})
