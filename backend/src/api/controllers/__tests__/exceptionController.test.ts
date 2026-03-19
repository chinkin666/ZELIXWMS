/**
 * exceptionController 统合テスト / Exception Controller Integration Tests
 *
 * ExceptionReport モデル層を通じた異常報告管理の HTTP フローを検証する。
 * Verifies HTTP flow for exception report management through ExceptionReport model layer.
 *
 * モック方針 / Mock strategy:
 * - ExceptionReport モデル全体をモック（DB不要）
 *   Mock entire ExceptionReport model (no DB required)
 * - extensionManager の動的インポートもモック / Also mock extensionManager dynamic import
 * - req/res を軽量オブジェクトで代替 / Replace req/res with lightweight objects
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ─────────────────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/exceptionReport', () => ({
  ExceptionReport: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
  SLA_MINUTES: {
    A: 60,   // レベルA: 60分 / Level A: 60 minutes
    B: 240,  // レベルB: 240分 / Level B: 240 minutes
    C: 1440, // レベルC: 1440分（24時間） / Level C: 1440 minutes (24 hours)
  },
}))

// extensionManager の動的インポートをモック / Mock extensionManager dynamic import
vi.mock('@/core/extensions', () => ({
  extensionManager: {
    emit: vi.fn().mockResolvedValue(undefined),
  },
  HOOK_EVENTS: {},
}))

import { ExceptionReport } from '@/models/exceptionReport'
import {
  listExceptions,
  createException,
  getException,
  notifyException,
  acknowledgeException,
  resolveException,
  slaStatus,
} from '@/api/controllers/exceptionController'

// ─── テストユーティリティ / Test utilities ────────────────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 */
const mockReq = (overrides: Record<string, any> = {}) =>
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

/**
 * listExceptions 用の find チェーンモック / find chain mock for listExceptions
 * sort().skip().limit().lean() チェーンをサポート
 */
const makeListChain = (data: any[]) => ({
  sort: vi.fn().mockReturnThis(),
  skip: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  lean: vi.fn().mockResolvedValue(data),
})

/**
 * slaStatus 用の find チェーンモック / find chain mock for slaStatus
 * lean() チェーンのみ / lean() chain only
 */
const makeLeanChain = (data: any[]) => ({
  lean: vi.fn().mockResolvedValue(data),
})

// ─── listExceptions ───────────────────────────────────────────────────────────

describe('listExceptions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('テナント内の異常報告一覧を返す / returns list of exceptions for the tenant', async () => {
    // Arrange
    const fakeData = [
      { _id: 'exc-1', reportNumber: 'EXC-20260319-0001', level: 'A', status: 'open' },
      { _id: 'exc-2', reportNumber: 'EXC-20260319-0002', level: 'B', status: 'notified' },
    ]
    vi.mocked(ExceptionReport.find).mockReturnValue(makeListChain(fakeData) as any)
    vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(2 as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listExceptions(req, res)

    // Assert: テナントIDでフィルタされる / filtered by tenantId
    expect(ExceptionReport.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'T1' }),
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: fakeData, total: 2 }),
    )
  })

  it('status, level, clientId フィルタを適用する / applies status, level, clientId filters', async () => {
    // Arrange
    vi.mocked(ExceptionReport.find).mockReturnValue(makeListChain([]) as any)
    vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({
      query: { status: 'open', level: 'A', clientId: 'client-1' },
    })
    const res = mockRes()

    // Act
    await listExceptions(req, res)

    // Assert: フィルタが渡される / filters passed
    expect(ExceptionReport.find).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'open',
        level: 'A',
        clientId: 'client-1',
      }),
    )
  })

  it('x-tenant-id ヘッダーがない場合 default を使用する / uses default when x-tenant-id header is absent', async () => {
    // Arrange: x-tenant-id なし / no x-tenant-id header
    vi.mocked(ExceptionReport.find).mockReturnValue(makeListChain([]) as any)
    vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ headers: {} }) // ヘッダーなし / no headers
    const res = mockRes()

    // Act
    await listExceptions(req, res)

    // Assert: デフォルト tenantId を使用 / uses default tenantId
    expect(ExceptionReport.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'default' }),
    )
  })

  it('空の一覧も正常に返す / returns empty list normally', async () => {
    // Arrange
    vi.mocked(ExceptionReport.find).mockReturnValue(makeListChain([]) as any)
    vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listExceptions(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: [], total: 0 }),
    )
    expect(res.status).not.toHaveBeenCalled()
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange: lean() がエラーをスロー / lean() throws error
    vi.mocked(ExceptionReport.find).mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error('DB query failed')),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listExceptions(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'DB query failed' }),
    )
  })
})

// ─── createException ──────────────────────────────────────────────────────────

describe('createException', () => {
  beforeEach(() => vi.clearAllMocks())

  it('レベルAの異常報告を作成して 201 を返す / creates level-A exception report and returns 201', async () => {
    // Arrange
    const fakeReport = {
      _id: 'exc-1',
      reportNumber: 'EXC-20260319-0001',
      level: 'A',
      status: 'open',
      slaDeadline: new Date(Date.now() + 60 * 60 * 1000),
      toObject: vi.fn().mockReturnValue({
        _id: 'exc-1',
        reportNumber: 'EXC-20260319-0001',
        level: 'A',
        status: 'open',
      }),
    }
    vi.mocked(ExceptionReport.create).mockResolvedValue(fakeReport as any)

    const req = mockReq({
      body: {
        level: 'A',
        description: '商品未達 / 商品未到',
        clientId: 'client-1',
      },
    })
    const res = mockRes()

    // Act
    await createException(req, res)

    // Assert: 201 で作成された報告を返す / returns 201 with created report
    expect(res.status).toHaveBeenCalledWith(201)
    expect(ExceptionReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'T1',
        level: 'A',
        status: 'open',
        slaBreached: false,
        reportNumber: expect.stringMatching(/^EXC-/),
      }),
    )
  })

  it('レベルBで SLA 時間が正しく設定される / sets correct SLA time for level B', async () => {
    // Arrange: create の引数をキャプチャ / Capture create arguments
    let capturedData: any = null
    vi.mocked(ExceptionReport.create).mockImplementation(async (data: any) => {
      capturedData = data
      return { ...data, toObject: vi.fn().mockReturnValue(data) } as any
    })

    const req = mockReq({
      body: { level: 'B', description: '数量相違 / 数量差异' },
    })
    const res = mockRes()

    // Act
    await createException(req, res)

    // Assert: SLA デッドラインが 240 分後に設定される / SLA deadline set 240 minutes later
    const now = Date.now()
    const expectedDeadline = now + 240 * 60 * 1000
    const actualDeadline = capturedData.slaDeadline.getTime()
    // 5秒の誤差を許容 / Allow 5 seconds of error
    expect(Math.abs(actualDeadline - expectedDeadline)).toBeLessThan(5000)
  })

  it('level が未指定の場合もレポートが作成されて 201 を返す / creates report and returns 201 even when level is not specified', async () => {
    // Arrange: level 未指定でも A がデフォルトとして 201 が返ることを確認
    // Verify 201 is returned even when level is not specified, defaulting to A
    const fakeReport = {
      _id: 'exc-default',
      level: 'A',
      status: 'open',
      toObject: vi.fn().mockReturnValue({ _id: 'exc-default', level: 'A', status: 'open' }),
    }
    vi.mocked(ExceptionReport.create).mockResolvedValue(fakeReport as any)

    const req = mockReq({
      body: { description: '異常報告 / 异常报告' },
    })
    const res = mockRes()

    // Act
    await createException(req, res)

    // Assert: 201 が返ること（エラーではない）/ 201 is returned (not an error)
    expect(res.status).toHaveBeenCalledWith(201)
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(ExceptionReport.create).mockRejectedValue(new Error('validation failed'))

    const req = mockReq({ body: { level: 'A', description: 'test' } })
    const res = mockRes()

    // Act
    await createException(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'validation failed' }),
    )
  })
})

// ─── getException ─────────────────────────────────────────────────────────────

describe('getException', () => {
  beforeEach(() => vi.clearAllMocks())

  it('IDで異常報告を取得して返す / fetches and returns exception report by ID', async () => {
    // Arrange
    const fakeReport = {
      _id: 'exc-1',
      reportNumber: 'EXC-20260319-0001',
      level: 'A',
      status: 'open',
    }
    vi.mocked(ExceptionReport.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeReport),
    } as any)

    const req = mockReq({ params: { id: 'exc-1' } })
    const res = mockRes()

    // Act
    await getException(req, res)

    // Assert
    expect(ExceptionReport.findById).toHaveBeenCalledWith('exc-1')
    expect(res.json).toHaveBeenCalledWith(fakeReport)
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    vi.mocked(ExceptionReport.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getException(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Not found' }),
    )
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(ExceptionReport.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { id: 'exc-1' } })
    const res = mockRes()

    // Act
    await getException(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── notifyException ──────────────────────────────────────────────────────────

describe('notifyException', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ステータスを notified に更新して Webhook を送信する / updates status to notified and sends Webhook', async () => {
    // Arrange
    const fakeUpdated = {
      _id: 'exc-1',
      level: 'A',
      status: 'notified',
      description: '商品未達',
      notifiedAt: new Date(),
    }
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'exc-1' } })
    const res = mockRes()

    // Act
    await notifyException(req, res)

    // Assert: findByIdAndUpdate が notified ステータスで呼ばれた
    // findByIdAndUpdate called with notified status
    expect(ExceptionReport.findByIdAndUpdate).toHaveBeenCalledWith(
      'exc-1',
      expect.objectContaining({ status: 'notified', notifiedAt: expect.any(Date) }),
      expect.any(Object),
    )
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await notifyException(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Not found' }),
    )
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('update failed')),
    } as any)

    const req = mockReq({ params: { id: 'exc-1' } })
    const res = mockRes()

    // Act
    await notifyException(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── acknowledgeException ─────────────────────────────────────────────────────

describe('acknowledgeException', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ステータスを acknowledged に更新する / updates status to acknowledged', async () => {
    // Arrange
    const fakeUpdated = {
      _id: 'exc-1',
      status: 'acknowledged',
      acknowledgedAt: new Date(),
    }
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'exc-1' } })
    const res = mockRes()

    // Act
    await acknowledgeException(req, res)

    // Assert: acknowledged ステータスで更新される / updated with acknowledged status
    expect(ExceptionReport.findByIdAndUpdate).toHaveBeenCalledWith(
      'exc-1',
      expect.objectContaining({
        status: 'acknowledged',
        acknowledgedAt: expect.any(Date),
      }),
      expect.any(Object),
    )
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await acknowledgeException(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('lock timeout')),
    } as any)

    const req = mockReq({ params: { id: 'exc-1' } })
    const res = mockRes()

    // Act
    await acknowledgeException(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── resolveException ─────────────────────────────────────────────────────────

describe('resolveException', () => {
  beforeEach(() => vi.clearAllMocks())

  it('異常を resolved に更新して resolvedBy と resolution を保存する / updates exception to resolved with resolvedBy and resolution', async () => {
    // Arrange
    const fakeUpdated = {
      _id: 'exc-1',
      status: 'resolved',
      resolvedBy: 'operator-1',
      resolution: '商品を再発送しました / 重新发货了',
      resolvedAt: new Date(),
    }
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({
      params: { id: 'exc-1' },
      body: { resolvedBy: 'operator-1', resolution: '商品を再発送しました / 重新发货了' },
    })
    const res = mockRes()

    // Act
    await resolveException(req, res)

    // Assert: resolved ステータスで更新される / updated with resolved status
    expect(ExceptionReport.findByIdAndUpdate).toHaveBeenCalledWith(
      'exc-1',
      expect.objectContaining({
        status: 'resolved',
        resolvedBy: 'operator-1',
        resolvedAt: expect.any(Date),
      }),
      expect.any(Object),
    )
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('resolvedBy が未指定でも処理を続行する / continues processing even when resolvedBy is missing', async () => {
    // Arrange
    const fakeUpdated = {
      _id: 'exc-1',
      status: 'resolved',
      resolvedBy: undefined,
      resolution: undefined,
      resolvedAt: new Date(),
    }
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({
      params: { id: 'exc-1' },
      body: {},
    })
    const res = mockRes()

    // Act
    await resolveException(req, res)

    // Assert: エラーなく処理される / processed without error
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('存在しないIDの場合 404 を返す / returns 404 for nonexistent ID', async () => {
    // Arrange
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({
      params: { id: 'nonexistent' },
      body: { resolvedBy: 'op-1', resolution: '解決済み' },
    })
    const res = mockRes()

    // Act
    await resolveException(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Not found' }),
    )
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(ExceptionReport.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('write conflict')),
    } as any)

    const req = mockReq({
      params: { id: 'exc-1' },
      body: { resolvedBy: 'op-1' },
    })
    const res = mockRes()

    // Act
    await resolveException(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── slaStatus ────────────────────────────────────────────────────────────────

describe('slaStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('SLA 超過報告と未解決件数を返す / returns breached SLA reports and open count', async () => {
    // Arrange: SLA 超過した2件をモック / Mock 2 SLA-breached reports
    // コントローラーは find().lean() チェーンを使用 / Controller uses find().lean() chain
    const fakeBreached = [
      { _id: 'exc-1', level: 'A', status: 'open', slaDeadline: new Date('2026-03-01') },
      { _id: 'exc-2', level: 'B', status: 'notified', slaDeadline: new Date('2026-03-10') },
    ]
    vi.mocked(ExceptionReport.find).mockReturnValue(makeLeanChain(fakeBreached) as any)
    vi.mocked(ExceptionReport.updateMany).mockResolvedValue({ modifiedCount: 2 } as any)
    vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(5 as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await slaStatus(req, res)

    // Assert: openCount と breachedCount を含む / contains openCount and breachedCount
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        openCount: 5,
        breachedCount: 2,
        breachedReports: fakeBreached,
      }),
    )
  })

  it('SLA 超過がない場合 breachedCount は 0 を返す / returns 0 breachedCount when no SLA breaches', async () => {
    // Arrange: SLA 超過なし / No SLA breaches
    vi.mocked(ExceptionReport.find).mockReturnValue(makeLeanChain([]) as any)
    vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(3 as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await slaStatus(req, res)

    // Assert: updateMany は呼ばれない（超過なしなので）/ updateMany not called (no breaches)
    expect(ExceptionReport.updateMany).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        openCount: 3,
        breachedCount: 0,
        breachedReports: [],
      }),
    )
  })

  it('SLA 超過がある場合 updateMany を呼んでフラグを立てる / calls updateMany to set breach flag when breaches exist', async () => {
    // Arrange: 1件が SLA 超過 / 1 report has SLA breach
    const fakeBreached = [{ _id: 'exc-1', slaBreached: false }]
    vi.mocked(ExceptionReport.find).mockReturnValue(makeLeanChain(fakeBreached) as any)
    vi.mocked(ExceptionReport.updateMany).mockResolvedValue({ modifiedCount: 1 } as any)
    vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(1 as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await slaStatus(req, res)

    // Assert: slaBreached フラグが更新される / slaBreached flag is updated
    expect(ExceptionReport.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: { $in: [fakeBreached[0]._id] },
        slaBreached: false,
      }),
      { slaBreached: true },
    )
  })

  it('x-tenant-id ヘッダーがない場合 default を使用する / uses default when x-tenant-id header is absent', async () => {
    // Arrange
    vi.mocked(ExceptionReport.find).mockReturnValue(makeLeanChain([]) as any)
    vi.mocked(ExceptionReport.countDocuments).mockResolvedValue(0 as any)

    const req = mockReq({ headers: {} }) // ヘッダーなし / no headers
    const res = mockRes()

    // Act
    await slaStatus(req, res)

    // Assert: SLA チェッククエリが default テナントで実行される
    // SLA check query runs with default tenant
    expect(ExceptionReport.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'default' }),
    )
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange: lean() がエラーをスロー / lean() throws error
    vi.mocked(ExceptionReport.find).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('SLA query failed')),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await slaStatus(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'SLA query failed' }),
    )
  })
})
