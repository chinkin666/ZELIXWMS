/**
 * omsController 単元テスト / omsController 单元测试
 *
 * OMS 連携（注文取込・在庫照会・出荷通知）の動作を検証。
 * 验证 OMS 连接（订单导入、库存查询、出货通知）的行为。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言 / 模块Mock声明 ──────────

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    aggregate: vi.fn(),
  },
}))

vi.mock('@/lib/errors', () => ({
  AppError: class AppError extends Error {
    statusCode: number
    code: string
    details: any
    constructor(message: string, statusCode: number, code: string, details?: any) {
      super(message)
      this.statusCode = statusCode
      this.code = code
      this.details = details
    }
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { StockQuant } from '@/models/stockQuant'
import {
  importOrders,
  getStock,
  getStockBySku,
  shipmentNotify,
} from '../omsController'

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

// ─── テスト本体 / 测试主体 ────────────────────────

describe('omsController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === 注文取込 / 订单导入 ===
  describe('importOrders', () => {
    it('有効な注文で 202 を返す（スタブ） / 有效订单返回 202（桩）', async () => {
      const req = mockReq({
        body: {
          orders: [{ externalOrderId: 'ext1', sku: 'SKU1', quantity: 5 }],
        },
      })
      const res = mockRes()
      await importOrders(req, res)

      expect(res.status).toHaveBeenCalledWith(202)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ accepted: true, receivedCount: 1 }),
      )
    })

    it('orders が未指定の場合 400 / orders 缺失时返回 400', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await importOrders(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accepted: false }))
    })

    it('空配列の場合 400 / 空数组时返回 400', async () => {
      const req = mockReq({ body: { orders: [] } })
      const res = mockRes()
      await importOrders(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('必須フィールド欠落でバリデーションエラー / 必填字段缺失时验证错误', async () => {
      const req = mockReq({
        body: {
          orders: [{ sku: 'SKU1', quantity: 5 }], // externalOrderId 欠落 / 缺少
        },
      })
      const res = mockRes()
      await importOrders(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.any(Array) }))
    })

    it('quantity が不正な場合バリデーションエラー / quantity 无效时验证错误', async () => {
      const req = mockReq({
        body: {
          orders: [{ externalOrderId: 'ext1', sku: 'SKU1', quantity: -1 }],
        },
      })
      const res = mockRes()
      await importOrders(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // === 在庫一覧照会 / 库存查询 ===
  describe('getStock', () => {
    it('集計結果を返す / 返回汇总结果', async () => {
      const aggregated = [
        { sku: 'SKU1', available: 10, reserved: 2, total: 12 },
        { sku: 'SKU2', available: 5, reserved: 0, total: 5 },
      ]
      vi.mocked(StockQuant.aggregate).mockResolvedValue(aggregated as any)

      const req = mockReq()
      const res = mockRes()
      await getStock(req, res)

      expect(res.json).toHaveBeenCalledWith({ items: aggregated })
    })

    it('エラー時 500 を返す / 发生错误时返回 500', async () => {
      vi.mocked(StockQuant.aggregate).mockRejectedValue(new Error('DB error'))

      const req = mockReq()
      const res = mockRes()
      await getStock(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // === SKU 単位在庫照会 / SKU级库存查询 ===
  describe('getStockBySku', () => {
    it('SKU の在庫を返す / 返回指定 SKU 的库存', async () => {
      const result = [{ sku: 'SKU1', available: 10, reserved: 2, total: 12 }]
      vi.mocked(StockQuant.aggregate).mockResolvedValue(result as any)

      const req = mockReq({ params: { sku: 'SKU1' } })
      const res = mockRes()
      await getStockBySku(req, res)

      expect(res.json).toHaveBeenCalledWith(result[0])
    })

    it('存在しない SKU の場合ゼロ在庫を返す / SKU 不存在时返回零库存', async () => {
      vi.mocked(StockQuant.aggregate).mockResolvedValue([] as any)

      const req = mockReq({ params: { sku: 'UNKNOWN' } })
      const res = mockRes()
      await getStockBySku(req, res)

      expect(res.json).toHaveBeenCalledWith({ sku: 'UNKNOWN', available: 0, reserved: 0, total: 0 })
    })
  })

  // === 出荷完了通知 / 出货完成通知 ===
  describe('shipmentNotify', () => {
    it('通知受信スタブ応答を返す / 返回通知接收桩响应', async () => {
      const req = mockReq({ body: { trackingNumber: 'TRK1' } })
      const res = mockRes()
      await shipmentNotify(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ received: true }))
    })
  })
})
