/**
 * materialController 統合テスト / Material Controller Integration Tests
 *
 * 耗材 CRUD の HTTP フローを検証する。
 * Verifies HTTP flow for material CRUD operations.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/models/material', () => ({
  Material: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(() => 'default'),
}))

import { Material } from '@/models/material'
import { listMaterials, getMaterial, createMaterial } from '../materialController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, headers: { 'x-tenant-id': 'default' }, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('materialController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listMaterials', () => {
    it('耗材一覧を返す / returns paginated material list', async () => {
      const mockData = [{ _id: 'm1', sku: 'MAT-001', name: '段ボール箱' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(Material.find).mockReturnValue(chainMock as any)
      vi.mocked(Material.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listMaterials(req, res)

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: mockData, total: 1 }),
      )
    })

    it('カテゴリ・検索フィルタが適用される / applies category and search filters', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(Material.find).mockReturnValue(chainMock as any)
      vi.mocked(Material.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { category: '梱包', search: '段ボール', isActive: 'true' } })
      const res = mockRes()
      await listMaterials(req, res)

      const filter = vi.mocked(Material.find).mock.calls[0][0] as any
      expect(filter.category).toBe('梱包')
      expect(filter.$or).toBeDefined()
      expect(filter.isActive).toBe(true)
    })
  })

  describe('getMaterial', () => {
    it('耗材を返す / returns material by id', async () => {
      const mockMaterial = { _id: 'm1', sku: 'MAT-001' }
      const leanMock = vi.fn().mockResolvedValue(mockMaterial)
      vi.mocked(Material.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 'm1' } })
      const res = mockRes()
      await getMaterial(req, res)

      expect(res.json).toHaveBeenCalledWith(mockMaterial)
    })

    it('存在しない場合404を返す / returns 404 when not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Material.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getMaterial(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createMaterial', () => {
    it('SKUが空の場合400を返す / returns 400 when sku is missing', async () => {
      const req = mockReq({ body: { name: '段ボール箱' } })
      const res = mockRes()
      await createMaterial(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('名前が空の場合400を返す / returns 400 when name is missing', async () => {
      const req = mockReq({ body: { sku: 'MAT-001' } })
      const res = mockRes()
      await createMaterial(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('カテゴリが無効の場合400を返す / returns 400 for invalid category', async () => {
      const req = mockReq({ body: { sku: 'MAT-001', name: '段ボール箱', category: 'invalid', unitCost: 100 } })
      const res = mockRes()
      await createMaterial(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('単価が未指定の場合400を返す / returns 400 when unitCost is missing', async () => {
      const req = mockReq({ body: { sku: 'MAT-001', name: '段ボール箱', category: 'box' } })
      const res = mockRes()
      await createMaterial(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('SKU重複の場合409を返す / returns 409 for duplicate sku', async () => {
      const leanMock = vi.fn().mockResolvedValue({ sku: 'MAT-001' })
      vi.mocked(Material.findOne).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ body: { sku: 'MAT-001', name: '段ボール箱', category: 'box', unitCost: 100 } })
      const res = mockRes()
      await createMaterial(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('正常に作成される / creates material successfully', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Material.findOne).mockReturnValue({ lean: leanMock } as any)
      vi.mocked(Material.create).mockResolvedValue({
        _id: 'm1',
        sku: 'MAT-001',
        name: '段ボール箱',
        toObject: () => ({ _id: 'm1', sku: 'MAT-001', name: '段ボール箱' }),
      } as any)

      const req = mockReq({ body: { sku: 'MAT-001', name: '段ボール箱', category: 'box', unitCost: 100 } })
      const res = mockRes()
      await createMaterial(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })
})
