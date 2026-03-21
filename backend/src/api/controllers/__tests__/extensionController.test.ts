/**
 * extensionController 単元テスト / extensionController 单元测试
 *
 * 拡張システム API（Hook 一覧・イベントログ）のテスト
 * 扩展系统 API（Hook列表・事件日志）测试
 *
 * モック方針 / Mock strategy:
 * - extensionManager, EventLog, HOOK_EVENTS をモック（DB不要）
 *   Mock extensionManager, EventLog, HOOK_EVENTS to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

const mockGetHandlers = vi.fn()
const mockGetSummary = vi.fn()

vi.mock('@/core/extensions', () => ({
  extensionManager: {
    getHookManager: vi.fn(() => ({
      getHandlers: mockGetHandlers,
      getSummary: mockGetSummary,
    })),
  },
}))

vi.mock('@/core/extensions/types', () => ({
  HOOK_EVENTS: {
    ORDER_CREATED: 'order.created',
    ORDER_SHIPPED: 'order.shipped',
  },
}))

vi.mock('@/models/eventLog', () => ({
  EventLog: {
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}))

// ─── インポート / 导入 ──────────

import { EventLog } from '@/models/eventLog'
import { listHooks, hooksSummary, listEventLogs, eventLogStats } from '../extensionController'

const mockEventLogFind = vi.mocked(EventLog.find)
const mockEventLogCountDocuments = vi.mocked(EventLog.countDocuments)
const mockEventLogAggregate = vi.mocked(EventLog.aggregate)

// ─── テストユーティリティ / 测试工具 ────────────────────────

const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
    ...overrides,
  }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── listHooks テスト / listHooks 测试 ──────────

describe('listHooks / Hook 一覧取得 / 获取Hook列表', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: Hook 一覧返却 / 正常情况：返回Hook列表
  it('Hook 一覧を返す / 返回Hook列表', async () => {
    mockGetHandlers.mockReturnValue([])

    const req = mockReq()
    const res = mockRes()
    await listHooks(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        totalEvents: 2,
        activeEvents: 0,
        hooks: expect.any(Array),
      }),
    )
  })

  // 正常系: アクティブハンドラー付き / 正常情况：有活跃handler
  it('アクティブハンドラーのカウントを返す / 返回活跃handler数', async () => {
    mockGetHandlers.mockImplementation((event: string) =>
      event === 'order.created' ? [{ name: 'handler1' }] : [],
    )

    const req = mockReq()
    const res = mockRes()
    await listHooks(req, res)

    const result = res.json.mock.calls[0][0]
    expect(result.activeEvents).toBe(1)
  })

  // 異常系: エラー → 500 / 异常情况：错误 → 500
  it('エラー時に 500 を返す / 错误时返回500', async () => {
    mockGetHandlers.mockImplementation(() => { throw new Error('Hook error') })

    const req = mockReq()
    const res = mockRes()
    await listHooks(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Hook error' })
  })
})

// ─── hooksSummary テスト / hooksSummary 测试 ──────────

describe('hooksSummary / Hook サマリー / Hook概要', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: サマリー返却 / 正常情况：返回概要
  it('サマリーデータを返す / 返回概要数据', async () => {
    const summaryData = { totalHooks: 5, activeHooks: 2 }
    mockGetSummary.mockReturnValue(summaryData)

    const req = mockReq()
    const res = mockRes()
    await hooksSummary(req, res)

    expect(res.json).toHaveBeenCalledWith(summaryData)
  })

  // 異常系: エラー → 500 / 异常情况：错误 → 500
  it('エラー時に 500 を返す / 错误时返回500', async () => {
    mockGetSummary.mockImplementation(() => { throw new Error('Summary error') })

    const req = mockReq()
    const res = mockRes()
    await hooksSummary(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── listEventLogs テスト / listEventLogs 测试 ──────────

describe('listEventLogs / イベントログ一覧 / 事件日志列表', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: ページネーション付き一覧 / 正常情况：分页列表
  it('ページネーション付きでログを返す / 返回分页日志', async () => {
    const logs = [{ event: 'order.created', status: 'success' }]
    mockEventLogFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(logs),
          }),
        }),
      }),
    })
    mockEventLogCountDocuments.mockResolvedValue(1)

    const req = mockReq()
    const res = mockRes()
    await listEventLogs(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: logs,
        pagination: expect.objectContaining({
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
        }),
      }),
    )
  })

  // 正常系: クエリフィルター付き / 正常情况：带查询过滤器
  it('event/source/status フィルターを適用する / 应用event/source/status过滤器', async () => {
    mockEventLogFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })
    mockEventLogCountDocuments.mockResolvedValue(0)

    const req = mockReq({
      query: { event: 'order.created', source: 'api', status: 'success', page: '2', limit: '10' },
    })
    const res = mockRes()
    await listEventLogs(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({ page: 2, limit: 10 }),
      }),
    )
  })

  // 正常系: 日付範囲フィルター / 正常情况：日期范围过滤
  it('dateFrom/dateTo フィルターを適用する / 应用dateFrom/dateTo过滤器', async () => {
    mockEventLogFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    })
    mockEventLogCountDocuments.mockResolvedValue(0)

    const req = mockReq({
      query: { dateFrom: '2026-03-01', dateTo: '2026-03-31' },
    })
    const res = mockRes()
    await listEventLogs(req, res)

    expect(res.json).toHaveBeenCalledTimes(1)
  })

  // 異常系: DB エラー → 500 / 异常情况：DB错误 → 500
  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    mockEventLogFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockRejectedValue(new Error('DB error')),
          }),
        }),
      }),
    })

    const req = mockReq()
    const res = mockRes()
    await listEventLogs(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── eventLogStats テスト / eventLogStats 测试 ──────────

describe('eventLogStats / イベントログ統計 / 事件日志统计', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 統計データ返却 / 正常情况：返回统计数据
  it('統計データを返す / 返回统计数据', async () => {
    const stats = [
      { _id: { event: 'order.created', status: 'success' }, count: 10, avgDuration: 50 },
    ]
    mockEventLogAggregate.mockResolvedValue(stats)

    const req = mockReq()
    const res = mockRes()
    await eventLogStats(req, res)

    expect(res.json).toHaveBeenCalledWith(stats)
  })

  // 異常系: エラー → 500 / 异常情况：错误 → 500
  it('エラー時に 500 を返す / 错误时返回500', async () => {
    mockEventLogAggregate.mockRejectedValue(new Error('Aggregate error'))

    const req = mockReq()
    const res = mockRes()
    await eventLogStats(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Aggregate error' })
  })
})
