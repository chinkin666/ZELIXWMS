/**
 * tenantController 統合テスト / Tenant Controller Integration Tests
 *
 * テナント CRUD の HTTP フローを検証する。
 * Verifies HTTP flow for tenant CRUD operations.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/models/tenant', () => ({
  Tenant: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { Tenant } from '@/models/tenant'
import { listTenants, getTenant, createTenant } from '../tenantController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('tenantController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listTenants', () => {
    it('テナント一覧を返す / returns paginated tenant list', async () => {
      const mockData = [{ _id: 't1', tenantCode: 'TC1', name: 'テストテナント' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(Tenant.find).mockReturnValue(chainMock as any)
      vi.mocked(Tenant.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listTenants(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockData, total: 1 }))
    })

    it('検索・ステータス・プランフィルタが適用される / applies search, status, plan filters', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(Tenant.find).mockReturnValue(chainMock as any)
      vi.mocked(Tenant.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { search: 'テスト', status: 'active', plan: 'pro' } })
      const res = mockRes()
      await listTenants(req, res)

      const filter = vi.mocked(Tenant.find).mock.calls[0][0] as any
      expect(filter.$or).toBeDefined()
      expect(filter.status).toBe('active')
      expect(filter.plan).toBe('pro')
    })
  })

  describe('getTenant', () => {
    it('テナントを返す / returns tenant by id', async () => {
      const mockTenant = { _id: 't1', tenantCode: 'TC1' }
      const leanMock = vi.fn().mockResolvedValue(mockTenant)
      vi.mocked(Tenant.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 't1' } })
      const res = mockRes()
      await getTenant(req, res)

      expect(res.json).toHaveBeenCalledWith(mockTenant)
    })

    it('存在しない場合404を返す / returns 404 when not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Tenant.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getTenant(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createTenant', () => {
    it('コードが空の場合400を返す / returns 400 when code is missing', async () => {
      const req = mockReq({ body: { name: 'テナントA' } })
      const res = mockRes()
      await createTenant(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('名前が空の場合400を返す / returns 400 when name is missing', async () => {
      const req = mockReq({ body: { tenantCode: 'TC1' } })
      const res = mockRes()
      await createTenant(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('コード重複の場合409を返す / returns 409 for duplicate code', async () => {
      const leanMock = vi.fn().mockResolvedValue({ tenantCode: 'TC1' })
      vi.mocked(Tenant.findOne).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ body: { tenantCode: 'TC1', name: 'テナントA' } })
      const res = mockRes()
      await createTenant(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('正常に作成される / creates tenant successfully', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Tenant.findOne).mockReturnValue({ lean: leanMock } as any)
      vi.mocked(Tenant.create).mockResolvedValue({
        _id: 't1',
        tenantCode: 'TC1',
        name: 'テストテナント',
        toObject: () => ({ _id: 't1', tenantCode: 'TC1', name: 'テストテナント' }),
      } as any)

      const req = mockReq({ body: { tenantCode: 'TC1', name: 'テストテナント' } })
      const res = mockRes()
      await createTenant(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })
})
