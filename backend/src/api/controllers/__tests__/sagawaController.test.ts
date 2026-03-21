/**
 * sagawaController 单元测试 / sagawaController ユニットテスト
 *
 * 佐川急便 CSV导出・追跡番号取込・送り状種類 的测试
 * 佐川急便 CSVエクスポート・追跡番号インポート・送り状種類 のテスト
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// 模拟 ShipmentOrder / ShipmentOrder をモック
vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    find: vi.fn(),
    updateOne: vi.fn(),
  },
}))

// 模拟 SagawaService / SagawaService をモック
vi.mock('@/services/sagawaService', () => {
  class MockSagawaService {
    generateCsvRows = vi.fn().mockReturnValue([{ col: 'val' }])
    generateCsvString = vi.fn().mockReturnValue('csv-content')
    static getInvoiceTypes = vi.fn().mockReturnValue([
      { code: '1', name: '元払い' },
      { code: '2', name: '着払い' },
    ])
  }
  return {
    SagawaService: MockSagawaService,
    parseSagawaTrackingCsv: vi.fn(),
  }
})

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { ShipmentOrder } from '@/models/shipmentOrder'
import { SagawaService, parseSagawaTrackingCsv } from '@/services/sagawaService'
import {
  exportSagawaCsv,
  importSagawaTracking,
  getSagawaInvoiceTypes,
} from '../sagawaController'

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn(), setHeader: vi.fn(), send: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

describe('sagawaController / 佐川コントローラー', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- exportSagawaCsv ---

  describe('exportSagawaCsv / CSV导出 / CSVエクスポート', () => {
    it('orderIds 未提供时返回 400 / orderIds 未指定で 400 を返す', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await exportSagawaCsv(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: '注文IDが必要です' })
    })

    it('orderIds 为空数组时返回 400 / orderIds が空配列で 400 を返す', async () => {
      const req = mockReq({ body: { orderIds: [] } })
      const res = mockRes()
      await exportSagawaCsv(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('找不到订单时返回 404 / 注文が見つからない場合 404 を返す', async () => {
      const mockLean = vi.fn().mockResolvedValue([])
      ;(ShipmentOrder.find as any).mockReturnValue({ lean: mockLean })

      const req = mockReq({ body: { orderIds: ['id1'] } })
      const res = mockRes()
      await exportSagawaCsv(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('成功导出 CSV / CSV エクスポート成功', async () => {
      const orders = [{ _id: 'id1', orderNumber: 'ORD-001' }]
      const mockLean = vi.fn().mockResolvedValue(orders)
      ;(ShipmentOrder.find as any).mockReturnValue({ lean: mockLean })

      const req = mockReq({ body: { orderIds: ['id1'] } })
      const res = mockRes()
      await exportSagawaCsv(req, res)

      // CSV 出力が呼ばれたことを確認 / 确认CSV输出被调用
      expect(res.setHeader).toHaveBeenCalled()
      expect(res.send).toHaveBeenCalled()
    })
  })

  // --- importSagawaTracking ---

  describe('importSagawaTracking / 追跡番号取込 / 追跡番号インポート', () => {
    it('csvContent 未提供时返回 400 / csvContent 未指定で 400 を返す', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await importSagawaTracking(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'CSVデータが必要です' })
    })

    it('追跡番号がゼロ件の場合 400 を返す / 追踪号为空时返回 400', async () => {
      ;(parseSagawaTrackingCsv as any).mockReturnValue(new Map())

      const req = mockReq({ body: { csvContent: 'empty' } })
      const res = mockRes()
      await importSagawaTracking(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: '追跡番号が見つかりません' })
    })

    it('正常取込み / 正常导入追踪号', async () => {
      const trackingMap = new Map([
        ['ORD-001', 'TRK-111'],
        ['ORD-002', 'TRK-222'],
      ])
      ;(parseSagawaTrackingCsv as any).mockReturnValue(trackingMap)
      ;(ShipmentOrder.updateOne as any)
        .mockResolvedValueOnce({ modifiedCount: 1 })
        .mockResolvedValueOnce({ modifiedCount: 0 })

      const req = mockReq({ body: { csvContent: 'csv-data' } })
      const res = mockRes()
      await importSagawaTracking(req, res)

      expect(res.json).toHaveBeenCalledWith({ total: 2, updated: 1, skipped: 1 })
    })

    it('エラー時 500 を返す / 出错时返回 500', async () => {
      ;(parseSagawaTrackingCsv as any).mockImplementation(() => {
        throw new Error('parse error')
      })

      const req = mockReq({ body: { csvContent: 'bad' } })
      const res = mockRes()
      await importSagawaTracking(req, res)
      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // --- getSagawaInvoiceTypes ---

  describe('getSagawaInvoiceTypes / 送り状種類取得 / 获取送り状种类', () => {
    it('送り状種類の参照データを返す / 返回送り状种类参考数据', async () => {
      const invoiceTypes = [{ id: 1, name: '元払い' }]
      ;(SagawaService as any).getInvoiceTypes = vi.fn().mockReturnValue(invoiceTypes)

      const req = mockReq()
      const res = mockRes()
      await getSagawaInvoiceTypes(req, res)
      expect(res.json).toHaveBeenCalledWith(invoiceTypes)
    })
  })
})
