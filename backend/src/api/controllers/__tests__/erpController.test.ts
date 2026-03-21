/**
 * erpController 単元テスト / erpController 单元测试
 *
 * ERP エクスポート機能のテスト / ERP导出功能测试
 *
 * モック方針 / Mock strategy:
 * - ShipmentOrder, StockQuant モデルをモック（DB不要）
 *   Mock ShipmentOrder, StockQuant models to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    find: vi.fn(),
  },
}))

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
    constructor(message: string, statusCode: number, code?: string, details?: any) {
      super(message)
      this.statusCode = statusCode
      this.code = code || 'ERROR'
      this.details = details
    }
  },
}))

// ─── インポート / 导入 ──────────

import { ShipmentOrder } from '@/models/shipmentOrder'
import { StockQuant } from '@/models/stockQuant'
import { exportShipments, exportInvoices, exportInventory } from '../erpController'

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

// ─── exportShipments テスト / exportShipments 测试 ──────────

describe('exportShipments / 出荷データエクスポート / 出货数据导出', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 日付範囲指定で出荷データ取得 / 正常情况：指定日期范围获取出货数据
  it('有効な日付範囲で出荷データを返す / 有效日期范围返回出货数据', async () => {
    const orders = [
      {
        orderNumber: 'ORD-001',
        trackingId: 'TRK-001',
        recipient: { name: '田中太郎', postalCode: '100-0001', prefecture: '東京都', city: '千代田区', street: '1-1' },
        status: { shipped: { shippedAt: new Date('2026-03-01') } },
        _productsMeta: { totalQuantity: 5, totalPrice: 1000 },
        costSummary: { shippingCost: 500, totalCost: 1500 },
      },
    ]

    const mockSelect = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(orders) })
    vi.mocked(ShipmentOrder.find).mockReturnValue({ select: mockSelect } as any)

    const req = mockReq({ query: { from: '2026-03-01', to: '2026-03-31' } })
    const res = mockRes()
    await exportShipments(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-03-01',
        to: '2026-03-31',
        count: 1,
        rows: expect.any(Array),
      }),
    )
    expect(res.json.mock.calls[0][0].rows[0].orderNumber).toBe('ORD-001')
  })

  // 異常系: from/to パラメータなし → 400 / 异常情况：缺少from/to参数 → 400
  it('from/to がない場合 400 を返す / 缺少from/to时返回400', async () => {
    const req = mockReq({ query: {} })
    const res = mockRes()
    await exportShipments(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }))
  })

  // 異常系: 無効な日付 → 400 / 异常情况：无效日期 → 400
  it('無効な日付で 400 を返す / 无效日期返回400', async () => {
    const req = mockReq({ query: { from: 'invalid', to: 'invalid' } })
    const res = mockRes()
    await exportShipments(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  // 異常系: DB エラー → 500 / 异常情况：DB错误 → 500
  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    })
    vi.mocked(ShipmentOrder.find).mockReturnValue({ select: mockSelect } as any)

    const req = mockReq({ query: { from: '2026-03-01', to: '2026-03-31' } })
    const res = mockRes()
    await exportShipments(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── exportInvoices テスト / exportInvoices 测试 ──────────

describe('exportInvoices / 請求書データエクスポート / 发票数据导出', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: スタブ応答（未実装） / 正常情况：桩响应（未实现）
  it('有効な日付範囲でスタブ応答を返す / 有效日期范围返回桩响应', async () => {
    const req = mockReq({ query: { from: '2026-03-01', to: '2026-03-31' } })
    const res = mockRes()
    await exportInvoices(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        count: 0,
        rows: [],
        message: expect.stringContaining('未実装'),
      }),
    )
  })

  // 異常系: from/to パラメータなし → 400 / 异常情况：缺少from/to参数 → 400
  it('from/to がない場合 400 を返す / 缺少from/to时返回400', async () => {
    const req = mockReq({ query: {} })
    const res = mockRes()
    await exportInvoices(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── exportInventory テスト / exportInventory 测试 ──────────

describe('exportInventory / 在庫データエクスポート / 库存数据导出', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 在庫データ取得 / 正常情况：获取库存数据
  it('在庫データを返す / 返回库存数据', async () => {
    const aggregateResult = [
      { sku: 'SKU-001', available: 10, reserved: 2, total: 12, locationCount: 3 },
      { sku: 'SKU-002', available: 5, reserved: 0, total: 5, locationCount: 1 },
    ]
    vi.mocked(StockQuant.aggregate).mockResolvedValue(aggregateResult as any)

    const req = mockReq()
    const res = mockRes()
    await exportInventory(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        exportedAt: expect.any(String),
        count: 2,
        rows: aggregateResult,
      }),
    )
  })

  // 正常系: 空在庫 / 正常情况：空库存
  it('在庫がない場合空配列を返す / 库存为空时返回空数组', async () => {
    vi.mocked(StockQuant.aggregate).mockResolvedValue([] as any)

    const req = mockReq()
    const res = mockRes()
    await exportInventory(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ count: 0, rows: [] }),
    )
  })

  // 異常系: DB エラー → 500 / 异常情况：DB错误 → 500
  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(StockQuant.aggregate).mockRejectedValue(new Error('Aggregation failed'))

    const req = mockReq()
    const res = mockRes()
    await exportInventory(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    )
  })
})
