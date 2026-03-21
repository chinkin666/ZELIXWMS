/**
 * returnOrderController 統合テスト / Return Order Controller Integration Tests
 *
 * 返品指示 CRUD と検品フローの HTTP フローを検証する。
 * Verifies HTTP flow for return order CRUD and inspection operations.
 *
 * モック方針 / Mock strategy:
 * - ReturnOrder, ShipmentOrder, Product, StockQuant, StockMove, Location モデルをモック
 *   Mock all models to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/models/returnOrder', () => ({
  ReturnOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    findById: vi.fn(),
  },
}))

vi.mock('@/models/product', () => ({
  Product: {
    findById: vi.fn(),
  },
}))

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    findOneAndUpdate: vi.fn(),
  },
}))

vi.mock('@/models/stockMove', () => ({
  StockMove: {
    create: vi.fn(),
  },
}))

vi.mock('@/models/location', () => ({
  Location: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}))

vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn().mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    }),
  },
}))

vi.mock('@/core/extensions', () => ({
  extensionManager: {
    executeHook: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/core/extensions/types', () => ({
  HOOK_EVENTS: {},
}))

vi.mock('@/services/operationLogger', () => ({
  logOperation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/services/chargeService', () => ({
  createAutoCharge: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/schemas/returnOrderSchema', () => ({
  createReturnOrderSchema: {
    safeParse: vi.fn(),
  },
  inspectLinesSchema: {
    safeParse: vi.fn(),
  },
}))

vi.mock('@/config/database', () => ({
  checkTransactionSupport: vi.fn().mockReturnValue(false),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { ReturnOrder } from '@/models/returnOrder'
import { listReturnOrders, getReturnOrder, createReturnOrder } from '../returnOrderController'
import { createReturnOrderSchema } from '@/schemas/returnOrderSchema'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('returnOrderController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── listReturnOrders ────────────────────────────────────

  describe('listReturnOrders', () => {
    it('返品指示一覧を返す / returns paginated return order list', async () => {
      const mockDocs = [{ _id: 'rt1', orderNumber: 'RT20260321-12345678' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockDocs),
      }
      vi.mocked(ReturnOrder.find).mockReturnValue(chainMock as any)
      vi.mocked(ReturnOrder.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: { page: '1', limit: '50' } })
      const res = mockRes()

      await listReturnOrders(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockDocs, total: 1, page: 1, limit: 50 }),
      )
    })

    it('ステータスフィルタが適用される / applies status filter', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(ReturnOrder.find).mockReturnValue(chainMock as any)
      vi.mocked(ReturnOrder.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { status: 'draft' } })
      const res = mockRes()

      await listReturnOrders(req, res)

      const filter = vi.mocked(ReturnOrder.find).mock.calls[0][0] as any
      expect(filter.status).toBe('draft')
    })

    it('DB例外の場合500を返す / returns 500 on DB error', async () => {
      vi.mocked(ReturnOrder.find).mockImplementation(() => {
        throw new Error('DB error')
      })
      const req = mockReq({ query: {} })
      const res = mockRes()

      await listReturnOrders(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ─── getReturnOrder ──────────────────────────────────────

  describe('getReturnOrder', () => {
    it('返品指示を返す / returns return order by id', async () => {
      const mockDoc = { _id: 'rt1', orderNumber: 'RT20260321-12345678' }
      const leanMock = vi.fn().mockResolvedValue(mockDoc)
      vi.mocked(ReturnOrder.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 'rt1' } })
      const res = mockRes()

      await getReturnOrder(req, res)

      expect(res.json).toHaveBeenCalledWith(mockDoc)
    })

    it('存在しない場合404を返す / returns 404 when not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(ReturnOrder.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()

      await getReturnOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // ─── createReturnOrder ───────────────────────────────────

  describe('createReturnOrder', () => {
    it('バリデーション失敗の場合400を返す / returns 400 on validation failure', async () => {
      vi.mocked(createReturnOrderSchema.safeParse).mockReturnValue({
        success: false,
        error: { errors: [{ path: ['lines'], message: 'Required' }] },
      } as any)

      const req = mockReq({ body: {} })
      const res = mockRes()

      await createReturnOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常に返品指示を作成 / creates return order successfully', async () => {
      vi.mocked(createReturnOrderSchema.safeParse).mockReturnValue({
        success: true,
        data: {},
      } as any)

      const mockDoc = {
        _id: 'rt1',
        orderNumber: 'RT20260321-12345678',
        status: 'draft',
        lines: [],
      }
      vi.mocked(ReturnOrder.create).mockResolvedValue(mockDoc as any)

      const req = mockReq({
        body: {
          returnReason: '不良品',
          customerName: 'テスト顧客',
          lines: [],
        },
      })
      const res = mockRes()

      await createReturnOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })
})
