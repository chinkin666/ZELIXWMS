/**
 * apiLogController テスト / ApiLog Controller Tests
 *
 * API連携ログの一覧・詳細・統計・エクスポートの HTTP フローを検証する。
 * 验证API联动日志列表、详情、统计和导出的 HTTP 流程。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// API連携ログモデルのモック / API联动日志模型 mock
vi.mock('@/models/apiLog', () => ({
  ApiLog: {
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}))

import { ApiLog } from '@/models/apiLog'
import { listApiLogs, getApiLog, getApiStats, exportApiLogs } from '../apiLogController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('apiLogController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listApiLogs', () => {
    it('API連携ログ一覧を返す / 返回API联动日志列表', async () => {
      const mockData = [{ _id: 'al1', apiName: 'yamatoB2', status: 'success' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(ApiLog.find).mockReturnValue(chainMock as any)
      vi.mocked(ApiLog.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listApiLogs(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockData, total: 1 }))
    })

    it('検索フィルタが適用される / 应用搜索过滤器', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(ApiLog.find).mockReturnValue(chainMock as any)
      vi.mocked(ApiLog.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { apiName: 'yamatoB2', status: 'error', search: 'テスト' } })
      const res = mockRes()
      await listApiLogs(req, res)

      const filter = vi.mocked(ApiLog.find).mock.calls[0][0] as any
      expect(filter.apiName).toBe('yamatoB2')
      expect(filter.status).toBe('error')
      expect(filter.$or).toBeDefined()
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(ApiLog.find).mockImplementation(() => { throw new Error('DB error') })

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listApiLogs(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getApiLog', () => {
    it('API連携ログを返す / 返回API联动日志', async () => {
      const mockDoc = { _id: 'al1', apiName: 'yamatoB2' }
      vi.mocked(ApiLog.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockDoc) } as any)

      const req = mockReq({ params: { id: 'al1' } })
      const res = mockRes()
      await getApiLog(req, res)

      expect(res.json).toHaveBeenCalledWith(mockDoc)
    })

    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(ApiLog.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getApiLog(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(ApiLog.findById).mockImplementation(() => { throw new Error('DB error') })

      const req = mockReq({ params: { id: 'al1' } })
      const res = mockRes()
      await getApiLog(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getApiStats', () => {
    it('統計データを返す / 返回统计数据', async () => {
      vi.mocked(ApiLog.countDocuments).mockResolvedValue(100)
      vi.mocked(ApiLog.aggregate)
        .mockResolvedValueOnce([{ _id: 'success', count: 90 }, { _id: 'error', count: 10 }])
        .mockResolvedValueOnce([{ _id: 'yamatoB2', total: 100, successCount: 90, errorCount: 10 }])
        .mockResolvedValueOnce([{ _id: null, avgDuration: 250 }])

      const req = mockReq({ query: {} })
      const res = mockRes()
      await getApiStats(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        totalCalls: 100,
        successRate: 90,
        avgDurationMs: 250,
      }))
    })

    it('日付範囲フィルタ付き統計 / 带日期范围过滤的统计', async () => {
      vi.mocked(ApiLog.countDocuments).mockResolvedValue(0)
      vi.mocked(ApiLog.aggregate)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      const req = mockReq({ query: { dateFrom: '2026-01-01', dateTo: '2026-12-31' } })
      const res = mockRes()
      await getApiStats(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        totalCalls: 0,
        successRate: 0,
        avgDurationMs: 0,
      }))
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(ApiLog.countDocuments).mockRejectedValue(new Error('DB error'))

      const req = mockReq({ query: {} })
      const res = mockRes()
      await getApiStats(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('exportApiLogs', () => {
    it('全件エクスポートする / 全量导出', async () => {
      const mockData = [{ _id: 'al1', apiName: 'yamatoB2' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(ApiLog.find).mockReturnValue(chainMock as any)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await exportApiLogs(req, res)

      expect(res.json).toHaveBeenCalledWith(mockData)
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(ApiLog.find).mockImplementation(() => { throw new Error('DB error') })

      const req = mockReq({ query: {} })
      const res = mockRes()
      await exportApiLogs(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
