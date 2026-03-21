/**
 * portalDashboardController 单元测试 / portalDashboardController ユニットテスト
 *
 * 客户门户仪表板数据聚合
 * 顧客ポータルダッシュボードデータ集約
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块mock声明 ─────────────────

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}))

vi.mock('@/models/workCharge', () => ({
  WorkCharge: {
    find: vi.fn(),
  },
}))

vi.mock('@/models/client', () => ({
  Client: {
    findById: vi.fn(),
  },
}))

vi.mock('@/models/exceptionReport', () => ({
  ExceptionReport: {
    find: vi.fn(),
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn().mockReturnValue('T1'),
}))

import { InboundOrder } from '@/models/inboundOrder'
import { WorkCharge } from '@/models/workCharge'
import { Client } from '@/models/client'
import { ExceptionReport } from '@/models/exceptionReport'
import { getPortalDashboard } from '@/api/controllers/portalDashboardController'

// ─── テストユーティリティ / 测试工具函数 ───────────────────────────

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1', clientId: 'cid1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

/** チェーンモック / 链式mock辅助 */
const chainMock = (result: any) => ({
  sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(result) }) }),
  lean: vi.fn().mockResolvedValue(result),
})

// ─── テスト / 测试 ─────────────────────────────────────────────────

describe('portalDashboardController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPortalDashboard', () => {
    it('clientId 未指定で 400 / 缺少clientId返回400', async () => {
      const res = mockRes()
      await getPortalDashboard(mockReq({ user: { id: 'u1' }, query: {} }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常にダッシュボードデータを返す / 正常返回仪表板数据', async () => {
      // 顧客情報 / 客户信息
      ;(Client.findById as any).mockReturnValue({
        lean: () => ({ name: 'TestClient', creditLimit: 100000, currentBalance: 50000 }),
      })

      // InboundOrder countDocuments（進行中 + 保留中） / 入库订单统计
      ;(InboundOrder.countDocuments as any)
        .mockResolvedValueOnce(5)  // inProgress
        .mockResolvedValueOnce(2)  // pending

      // InboundOrder.find (recentOrders) / 最近订单
      ;(InboundOrder.find as any)
        .mockReturnValueOnce({
          sort: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                {
                  _id: { toString: () => 'o1' },
                  orderNumber: 'ORD-001',
                  status: 'confirmed',
                  destinationType: 'fba',
                  totalBoxCount: 3,
                  expectedDate: '2026-04-01',
                  createdAt: new Date('2026-03-20'),
                  serviceOptions: [{ actualCost: 1000 }],
                },
              ]),
            }),
          }),
        })

      // WorkCharge.find (月費用) / 月费用
      ;(WorkCharge.find as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ amount: 5000 }, { amount: 3000 }]),
      })

      // ExceptionReport.find (未処理異常) / 未处理异常
      ;(ExceptionReport.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      // awaiting_label (FBA標未上传) / FBA标未上传
      ;(InboundOrder.find as any)
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([]) })
      // variance (差異未確認) / 差异未确认
      ;(InboundOrder.find as any)
        .mockReturnValueOnce({ lean: vi.fn().mockResolvedValue([]) })

      const res = mockRes()
      await getPortalDashboard(mockReq(), res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          client: expect.objectContaining({ name: 'TestClient' }),
          stats: expect.objectContaining({ inProgress: 5, pending: 2, monthlyFee: 8000 }),
          recentOrders: expect.any(Array),
          needsAttention: expect.any(Array),
          openExceptions: expect.any(Array),
        }),
      )
    })

    it('空データでもエラーなく返す / 无数据时也不报错', async () => {
      ;(Client.findById as any).mockReturnValue({ lean: () => null })
      ;(InboundOrder.countDocuments as any).mockResolvedValue(0)
      ;(InboundOrder.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
        lean: vi.fn().mockResolvedValue([]),
      })
      ;(WorkCharge.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
      ;(ExceptionReport.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      })

      const res = mockRes()
      await getPortalDashboard(mockReq(), res)

      expect(res.json).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('query.clientId からも clientId を取得できる / 从query.clientId获取clientId', async () => {
      ;(Client.findById as any).mockReturnValue({ lean: () => null })
      ;(InboundOrder.countDocuments as any).mockResolvedValue(0)
      ;(InboundOrder.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
        lean: vi.fn().mockResolvedValue([]),
      })
      ;(WorkCharge.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
      ;(ExceptionReport.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      })

      const res = mockRes()
      await getPortalDashboard(
        mockReq({ user: { id: 'u1' }, query: { clientId: 'cid2' } }),
        res,
      )

      expect(res.json).toHaveBeenCalled()
    })

    it('needsAttention に awaiting_label を含む / needsAttention包含awaiting_label', async () => {
      ;(Client.findById as any).mockReturnValue({ lean: () => ({ name: 'C' }) })
      ;(InboundOrder.countDocuments as any).mockResolvedValue(0)

      // recentOrders
      ;(InboundOrder.find as any).mockReturnValueOnce({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      })
      ;(WorkCharge.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
      ;(ExceptionReport.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      })

      // awaiting_label 注文 / awaiting_label订单
      ;(InboundOrder.find as any).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue([
          { _id: { toString: () => 'o1' }, orderNumber: 'ORD-001', createdAt: new Date('2026-03-20') },
        ]),
      })
      // variance
      ;(InboundOrder.find as any).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue([]),
      })

      const res = mockRes()
      await getPortalDashboard(mockReq(), res)

      const called = res.json.mock.calls[0][0]
      expect(called.needsAttention).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'awaiting_label' })]),
      )
    })

    it('エラー時 500 を返す / 错误时返回500', async () => {
      ;(Client.findById as any).mockImplementation(() => { throw new Error('DB error') })
      ;(InboundOrder.countDocuments as any).mockRejectedValue(new Error('DB error'))

      const res = mockRes()
      await getPortalDashboard(mockReq(), res)
      expect(res.status).toHaveBeenCalledWith(500)
    })

    it('needsAttention に variance を含む / needsAttention包含variance', async () => {
      ;(Client.findById as any).mockReturnValue({ lean: () => ({ name: 'C' }) })
      ;(InboundOrder.countDocuments as any).mockResolvedValue(0)

      // recentOrders
      ;(InboundOrder.find as any).mockReturnValueOnce({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      })
      ;(WorkCharge.find as any).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
      ;(ExceptionReport.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      })

      // awaiting_label
      ;(InboundOrder.find as any).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue([]),
      })
      // variance 注文 / 差异订单
      ;(InboundOrder.find as any).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValue([
          {
            _id: { toString: () => 'o2' },
            orderNumber: 'ORD-002',
            varianceReport: { hasVariance: true },
            arrivedAt: new Date('2026-03-19'),
            createdAt: new Date('2026-03-18'),
          },
        ]),
      })

      const res = mockRes()
      await getPortalDashboard(mockReq(), res)

      const called = res.json.mock.calls[0][0]
      expect(called.needsAttention).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'variance' })]),
      )
    })
  })
})
