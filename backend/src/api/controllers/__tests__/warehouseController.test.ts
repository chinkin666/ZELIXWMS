/**
 * warehouseController 統合テスト / Warehouse Controller Integration Tests
 *
 * 倉庫 CRUD の HTTP フローを検証する。
 * Verifies HTTP flow for warehouse CRUD operations.
 *
 * モック方針 / Mock strategy:
 * - Warehouse モデルをモック（DB不要）
 *   Mock Warehouse model to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/models/warehouse', () => ({
  Warehouse: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { Warehouse } from '@/models/warehouse'
import {
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  exportWarehouses,
} from '../warehouseController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('warehouseController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── listWarehouses ──────────────────────────────────────

  describe('listWarehouses', () => {
    it('倉庫一覧を返す / returns paginated warehouse list', async () => {
      const mockData = [{ _id: 'w1', code: 'WH01', name: '東京倉庫' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(Warehouse.find).mockReturnValue(chainMock as any)
      vi.mocked(Warehouse.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: { page: '1', limit: '50' } })
      const res = mockRes()

      await listWarehouses(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockData, total: 1 }))
    })

    it('検索フィルタが正しく適用される / applies search filter correctly', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(Warehouse.find).mockReturnValue(chainMock as any)
      vi.mocked(Warehouse.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { search: '東京', isActive: 'true' } })
      const res = mockRes()

      await listWarehouses(req, res)

      const filter = vi.mocked(Warehouse.find).mock.calls[0][0] as any
      expect(filter.$or).toBeDefined()
      expect(filter.isActive).toBe(true)
    })

    it('DB例外の場合500を返す / returns 500 on DB error', async () => {
      vi.mocked(Warehouse.find).mockImplementation(() => {
        throw new Error('DB error')
      })
      const req = mockReq({ query: {} })
      const res = mockRes()

      await listWarehouses(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  // ─── getWarehouse ────────────────────────────────────────

  describe('getWarehouse', () => {
    it('倉庫を返す / returns warehouse by id', async () => {
      const mockWh = { _id: 'w1', code: 'WH01' }
      const leanMock = vi.fn().mockResolvedValue(mockWh)
      vi.mocked(Warehouse.findById).mockReturnValue({ lean: leanMock } as any)
      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()

      await getWarehouse(req, res)

      expect(res.json).toHaveBeenCalledWith(mockWh)
    })

    it('存在しない場合404を返す / returns 404 when not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Warehouse.findById).mockReturnValue({ lean: leanMock } as any)
      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()

      await getWarehouse(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // ─── createWarehouse ─────────────────────────────────────

  describe('createWarehouse', () => {
    it('コードが空の場合400を返す / returns 400 when code is missing', async () => {
      const req = mockReq({ body: { name: '倉庫A' } })
      const res = mockRes()

      await createWarehouse(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('名前が空の場合400を返す / returns 400 when name is missing', async () => {
      const req = mockReq({ body: { code: 'WH01' } })
      const res = mockRes()

      await createWarehouse(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('コード重複の場合409を返す / returns 409 for duplicate code', async () => {
      const leanMock = vi.fn().mockResolvedValue({ code: 'WH01' })
      vi.mocked(Warehouse.findOne).mockReturnValue({ lean: leanMock } as any)
      const req = mockReq({ body: { code: 'WH01', name: '倉庫A' } })
      const res = mockRes()

      await createWarehouse(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('正常に作成される / creates warehouse successfully', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Warehouse.findOne).mockReturnValue({ lean: leanMock } as any)
      const mockCreated = {
        _id: 'w1',
        code: 'WH01',
        name: '東京倉庫',
        toObject: () => ({ _id: 'w1', code: 'WH01', name: '東京倉庫' }),
      }
      vi.mocked(Warehouse.create).mockResolvedValue(mockCreated as any)
      const req = mockReq({ body: { code: 'WH01', name: '東京倉庫' } })
      const res = mockRes()

      await createWarehouse(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  // ─── updateWarehouse ─────────────────────────────────────

  describe('updateWarehouse', () => {
    it('存在しない場合404を返す / returns 404 when warehouse not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Warehouse.findById).mockReturnValue({ lean: leanMock } as any)
      const req = mockReq({ params: { id: 'nonexistent' }, body: { name: 'Updated' } })
      const res = mockRes()

      await updateWarehouse(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常に更新される / updates warehouse successfully', async () => {
      const existingLean = vi.fn().mockResolvedValue({ _id: 'w1', code: 'WH01' })
      vi.mocked(Warehouse.findById).mockReturnValue({ lean: existingLean } as any)
      const updateLean = vi.fn().mockResolvedValue({ _id: 'w1', code: 'WH01', name: 'Updated' })
      vi.mocked(Warehouse.findByIdAndUpdate).mockReturnValue({ lean: updateLean } as any)

      const req = mockReq({ params: { id: 'w1' }, body: { name: 'Updated' } })
      const res = mockRes()

      await updateWarehouse(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' }))
    })
  })

  // ─── deleteWarehouse ─────────────────────────────────────

  describe('deleteWarehouse', () => {
    it('存在しない場合404を返す / returns 404 when not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Warehouse.findByIdAndUpdate).mockReturnValue({ lean: leanMock } as any)
      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()

      await deleteWarehouse(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('論理削除（isActive=false）で正常に削除 / soft deletes by setting isActive=false', async () => {
      const leanMock = vi.fn().mockResolvedValue({ _id: 'w1', isActive: false })
      vi.mocked(Warehouse.findByIdAndUpdate).mockReturnValue({ lean: leanMock } as any)
      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()

      await deleteWarehouse(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Deleted' }))
    })
  })

  // ─── exportWarehouses ────────────────────────────────────

  describe('exportWarehouses', () => {
    it('アクティブな倉庫一覧をエクスポート / exports active warehouses', async () => {
      const mockData = [{ _id: 'w1', code: 'WH01' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(Warehouse.find).mockReturnValue(chainMock as any)
      const req = mockReq()
      const res = mockRes()

      await exportWarehouses(req, res)

      expect(res.json).toHaveBeenCalledWith(mockData)
    })
  })
})
