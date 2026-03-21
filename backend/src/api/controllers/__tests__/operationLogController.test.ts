/**
 * operationLogController テスト / OperationLog Controller Tests
 *
 * 操作ログの一覧・エクスポートの HTTP フローを検証する。
 * 验证操作日志列表和导出的 HTTP 流程。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// 操作ログモデルのモック / 操作日志模型 mock
vi.mock('@/models/operationLog', () => ({
  OperationLog: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { OperationLog } from '@/models/operationLog'
import { listOperationLogs, exportOperationLogs } from '../operationLogController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('operationLogController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listOperationLogs', () => {
    it('操作ログ一覧を返す / 返回操作日志列表', async () => {
      const mockData = [{ _id: 'ol1', action: 'inbound', description: '入庫' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(OperationLog.find).mockReturnValue(chainMock as any)
      vi.mocked(OperationLog.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listOperationLogs(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockData, total: 1 }))
    })

    it('日付範囲フィルタが適用される / 应用日期范围过滤器', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(OperationLog.find).mockReturnValue(chainMock as any)
      vi.mocked(OperationLog.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { dateFrom: '2026-01-01', dateTo: '2026-12-31' } })
      const res = mockRes()
      await listOperationLogs(req, res)

      const filter = vi.mocked(OperationLog.find).mock.calls[0][0] as any
      expect(filter.createdAt).toBeDefined()
      expect(filter.createdAt.$gte).toBeDefined()
      expect(filter.createdAt.$lte).toBeDefined()
    })

    it('アクションフィルタが適用される / 应用操作过滤器', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(OperationLog.find).mockReturnValue(chainMock as any)
      vi.mocked(OperationLog.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { action: 'inbound,outbound' } })
      const res = mockRes()
      await listOperationLogs(req, res)

      const filter = vi.mocked(OperationLog.find).mock.calls[0][0] as any
      expect(filter.action).toEqual({ $in: ['inbound', 'outbound'] })
    })

    it('テキスト検索フィルタが適用される / 应用文本搜索过滤器', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(OperationLog.find).mockReturnValue(chainMock as any)
      vi.mocked(OperationLog.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { search: 'テスト', category: 'inventory' } })
      const res = mockRes()
      await listOperationLogs(req, res)

      const filter = vi.mocked(OperationLog.find).mock.calls[0][0] as any
      expect(filter.$or).toBeDefined()
      expect(filter.category).toBe('inventory')
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(OperationLog.find).mockImplementation(() => { throw new Error('DB error') })

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listOperationLogs(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('exportOperationLogs', () => {
    it('全件エクスポートする / 全量导出', async () => {
      const mockData = [{ _id: 'ol1', action: 'inbound' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(OperationLog.find).mockReturnValue(chainMock as any)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await exportOperationLogs(req, res)

      expect(res.json).toHaveBeenCalledWith(mockData)
    })

    it('フィルタ付きエクスポート / 带过滤器导出', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(OperationLog.find).mockReturnValue(chainMock as any)

      const req = mockReq({ query: { action: 'inbound', dateFrom: '2026-01-01' } })
      const res = mockRes()
      await exportOperationLogs(req, res)

      const filter = vi.mocked(OperationLog.find).mock.calls[0][0] as any
      expect(filter.action).toBe('inbound')
      expect(filter.createdAt).toBeDefined()
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(OperationLog.find).mockImplementation(() => { throw new Error('DB error') })

      const req = mockReq({ query: {} })
      const res = mockRes()
      await exportOperationLogs(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
