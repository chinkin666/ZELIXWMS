/**
 * dashboardController 統合テスト / Dashboard Controller Integration Tests
 *
 * ダッシュボード概要データの HTTP フローを検証する。
 * Verifies HTTP flow for dashboard overview data retrieval.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    aggregate: vi.fn(),
  },
}))

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}))

vi.mock('@/models/returnOrder', () => ({
  ReturnOrder: {
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { ShipmentOrder } from '@/models/shipmentOrder'
import { InboundOrder } from '@/models/inboundOrder'
import { ReturnOrder } from '@/models/returnOrder'
import { StockQuant } from '@/models/stockQuant'
import { getDashboardOverview } from '../dashboardController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('dashboardController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDashboardOverview', () => {
    it('ダッシュボードデータを返す / returns dashboard overview data', async () => {
      // Mock all the countDocuments calls
      vi.mocked(ShipmentOrder.countDocuments).mockResolvedValue(5)
      vi.mocked(InboundOrder.countDocuments).mockResolvedValue(3)
      vi.mocked(ReturnOrder.countDocuments).mockResolvedValue(1)

      // Mock StockQuant.aggregate
      vi.mocked(StockQuant.aggregate).mockResolvedValue([{ totalQuantity: 1000, skuCount: 50 }])
      vi.mocked(StockQuant.countDocuments).mockResolvedValue(100)

      // Mock InboundOrder.aggregate
      vi.mocked(InboundOrder.aggregate).mockResolvedValue([{ totalLines: 10 }])

      // Mock ShipmentOrder.find for recent shipments
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([
          { _id: 'so1', orderNumber: 'SO-001', status: {} },
        ]),
      }
      vi.mocked(ShipmentOrder.find).mockReturnValue(chainMock as any)

      const req = mockReq()
      const res = mockRes()
      await getDashboardOverview(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          shipments: expect.any(Object),
          generatedAt: expect.any(String),
        }),
      )
    })

    it('DB例外の場合500を返す / returns 500 on DB error', async () => {
      vi.mocked(ShipmentOrder.countDocuments).mockRejectedValue(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()
      await getDashboardOverview(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
