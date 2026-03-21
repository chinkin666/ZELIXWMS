/**
 * stocktakingController 統合テスト / Stocktaking Controller Integration Tests
 *
 * 棚卸指示 CRUD の HTTP フローを検証する。
 * Verifies HTTP flow for stocktaking order operations.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/models/stocktakingOrder', () => ({
  StocktakingOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/stockQuant', () => ({
  StockQuant: { find: vi.fn() },
}))

vi.mock('@/models/stockMove', () => ({
  StockMove: { create: vi.fn() },
}))

vi.mock('@/models/location', () => ({
  Location: { find: vi.fn(), findById: vi.fn() },
}))

vi.mock('@/models/product', () => ({
  Product: { find: vi.fn(), findById: vi.fn() },
}))

vi.mock('@/models/lot', () => ({
  Lot: { find: vi.fn() },
}))

vi.mock('mongoose', () => ({
  default: {
    Types: {
      ObjectId: vi.fn((id: string) => id),
    },
    startSession: vi.fn().mockResolvedValue({
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      abortTransaction: vi.fn(),
      endSession: vi.fn(),
    }),
  },
}))

vi.mock('@/services/operationLogger', () => ({
  logOperation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/core/extensions', () => ({
  extensionManager: { executeHook: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/core/extensions/types', () => ({ HOOK_EVENTS: {} }))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}))

import { StocktakingOrder } from '@/models/stocktakingOrder'
import { StockQuant } from '@/models/stockQuant'
import { Location } from '@/models/location'
import { Product } from '@/models/product'
import { Lot } from '@/models/lot'
import { listStocktakingOrders, getStocktakingOrder, createStocktakingOrder } from '../stocktakingController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('stocktakingController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listStocktakingOrders', () => {
    it('棚卸指示一覧を返す / returns paginated stocktaking list', async () => {
      const mockDocs = [{ _id: 'st1', orderNumber: 'ST20260321-12345678' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockDocs),
      }
      vi.mocked(StocktakingOrder.find).mockReturnValue(chainMock as any)
      vi.mocked(StocktakingOrder.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: { page: '1', limit: '50' } })
      const res = mockRes()
      await listStocktakingOrders(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockDocs, total: 1 }),
      )
    })

    it('ステータス・タイプフィルタが適用される / applies status and type filters', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(StocktakingOrder.find).mockReturnValue(chainMock as any)
      vi.mocked(StocktakingOrder.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { status: 'counting', type: 'full' } })
      const res = mockRes()
      await listStocktakingOrders(req, res)

      const filter = vi.mocked(StocktakingOrder.find).mock.calls[0][0] as any
      expect(filter.status).toBe('counting')
      expect(filter.type).toBe('full')
    })
  })

  describe('getStocktakingOrder', () => {
    it('棚卸指示を返す / returns stocktaking order by id', async () => {
      const mockDoc = { _id: 'st1', orderNumber: 'ST20260321-12345678' }
      const leanMock = vi.fn().mockResolvedValue(mockDoc)
      vi.mocked(StocktakingOrder.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 'st1' } })
      const res = mockRes()
      await getStocktakingOrder(req, res)

      expect(res.json).toHaveBeenCalledWith(mockDoc)
    })

    it('存在しない場合404を返す / returns 404 when not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(StocktakingOrder.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getStocktakingOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createStocktakingOrder', () => {
    it('在庫スナップショットから棚卸指示を作成 / creates order from inventory snapshot', async () => {
      const mockQuants = [
        {
          _id: 'q1',
          locationId: 'loc1',
          productId: 'prod1',
          quantity: 10,
          lotId: 'lot1',
        },
      ]
      vi.mocked(StockQuant.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockQuants),
      } as any)
      vi.mocked(Location.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: 'loc1', name: 'A-01-01' }]),
      } as any)
      vi.mocked(Product.find).mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ _id: 'prod1', sku: 'SKU001', name: 'テスト商品' }]),
      } as any)
      vi.mocked(Lot.find).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([{ _id: 'lot1', lotNumber: 'LOT-001' }]),
      } as any)

      const mockCreated = {
        _id: 'st1',
        orderNumber: 'ST20260321-12345678',
        status: 'draft',
        lines: [],
        toObject: () => ({ _id: 'st1', orderNumber: 'ST20260321-12345678' }),
      }
      vi.mocked(StocktakingOrder.create).mockResolvedValue(mockCreated as any)

      const req = mockReq({
        body: {
          type: 'full',
          scheduledDate: '2026-03-21',
        },
      })
      const res = mockRes()
      await createStocktakingOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })
})
