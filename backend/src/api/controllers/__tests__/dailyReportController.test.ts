/**
 * dailyReportController 統合テスト / Daily Report Controller Integration Tests
 *
 * 日次レポート CRUD の HTTP フローを検証する。
 * Verifies HTTP flow for daily report operations.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/models/dailyReport', () => ({
  DailyReport: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: { countDocuments: vi.fn(), aggregate: vi.fn() },
}))

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: { countDocuments: vi.fn(), aggregate: vi.fn() },
}))

vi.mock('@/models/returnOrder', () => ({
  ReturnOrder: { countDocuments: vi.fn() },
}))

vi.mock('@/models/stockQuant', () => ({
  StockQuant: { aggregate: vi.fn() },
}))

vi.mock('@/models/stockMove', () => ({
  StockMove: { countDocuments: vi.fn() },
}))

vi.mock('@/models/stocktakingOrder', () => ({
  StocktakingOrder: { countDocuments: vi.fn() },
}))

import { DailyReport } from '@/models/dailyReport'
import { listDailyReports, getDailyReport, generateDailyReport } from '../dailyReportController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('dailyReportController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listDailyReports', () => {
    it('日次レポート一覧を返す / returns paginated daily report list', async () => {
      const mockDocs = [{ _id: 'dr1', date: '2026-03-21', status: 'draft' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockDocs),
      }
      vi.mocked(DailyReport.find).mockReturnValue(chainMock as any)
      vi.mocked(DailyReport.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: { page: '1', limit: '50' } })
      const res = mockRes()
      await listDailyReports(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockDocs, total: 1 }),
      )
    })

    it('日付範囲フィルタが適用される / applies date range filter', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(DailyReport.find).mockReturnValue(chainMock as any)
      vi.mocked(DailyReport.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { from: '2026-03-01', to: '2026-03-31' } })
      const res = mockRes()
      await listDailyReports(req, res)

      const filter = vi.mocked(DailyReport.find).mock.calls[0][0] as any
      expect(filter.date).toBeDefined()
      expect(filter.date.$gte).toBe('2026-03-01')
      expect(filter.date.$lte).toBe('2026-03-31')
    })
  })

  describe('getDailyReport', () => {
    it('日次レポートを返す / returns daily report by date', async () => {
      const mockDoc = { _id: 'dr1', date: '2026-03-21' }
      const leanMock = vi.fn().mockResolvedValue(mockDoc)
      vi.mocked(DailyReport.findOne).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { date: '2026-03-21' } })
      const res = mockRes()
      await getDailyReport(req, res)

      expect(res.json).toHaveBeenCalledWith(mockDoc)
    })

    it('存在しない場合404を返す / returns 404 when not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(DailyReport.findOne).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { date: '2026-03-21' } })
      const res = mockRes()
      await getDailyReport(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('generateDailyReport', () => {
    it('日付が無効の場合400を返す / returns 400 for invalid date', async () => {
      const req = mockReq({ body: { date: 'invalid' } })
      const res = mockRes()
      await generateDailyReport(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('日付が空の場合400を返す / returns 400 when date is missing', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await generateDailyReport(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('ロック済みレポートの場合400を返す / returns 400 for locked report', async () => {
      vi.mocked(DailyReport.findOne).mockResolvedValue({ status: 'locked' } as any)

      const req = mockReq({ body: { date: '2026-03-21' } })
      const res = mockRes()
      await generateDailyReport(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })
})
