/**
 * clientController 統合テスト / Client Controller Integration Tests
 *
 * 顧客 CRUD の HTTP フローを検証する。
 * Verifies HTTP flow for client CRUD operations.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/models/client', () => ({
  Client: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { Client } from '@/models/client'
import { listClients, getClient, createClient } from '../clientController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, headers: { 'x-tenant-id': 'default' }, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('clientController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listClients', () => {
    it('顧客一覧を返す / returns paginated client list', async () => {
      const mockData = [{ _id: 'c1', clientCode: 'CL001', name: 'テスト顧客' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(Client.find).mockReturnValue(chainMock as any)
      vi.mocked(Client.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listClients(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockData, total: 1 }))
    })

    it('検索フィルタが適用される / applies search and isActive filter', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(Client.find).mockReturnValue(chainMock as any)
      vi.mocked(Client.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { search: 'テスト', isActive: 'true' } })
      const res = mockRes()
      await listClients(req, res)

      const filter = vi.mocked(Client.find).mock.calls[0][0] as any
      expect(filter.$or).toBeDefined()
      expect(filter.isActive).toBe(true)
    })
  })

  describe('getClient', () => {
    it('顧客を返す / returns client by id', async () => {
      const mockClient = { _id: 'c1', clientCode: 'CL001' }
      const leanMock = vi.fn().mockResolvedValue(mockClient)
      vi.mocked(Client.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 'c1' } })
      const res = mockRes()
      await getClient(req, res)

      expect(res.json).toHaveBeenCalledWith(mockClient)
    })

    it('存在しない場合404を返す / returns 404 when not found', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Client.findById).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getClient(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createClient', () => {
    it('コードが空の場合400を返す / returns 400 when code is missing', async () => {
      const req = mockReq({ body: { name: '顧客A' } })
      const res = mockRes()
      await createClient(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('名前が空の場合400を返す / returns 400 when name is missing', async () => {
      const req = mockReq({ body: { clientCode: 'CL001' } })
      const res = mockRes()
      await createClient(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('コード重複の場合409を返す / returns 409 for duplicate code', async () => {
      const leanMock = vi.fn().mockResolvedValue({ clientCode: 'CL001' })
      vi.mocked(Client.findOne).mockReturnValue({ lean: leanMock } as any)

      const req = mockReq({ body: { clientCode: 'CL001', name: '顧客A' } })
      const res = mockRes()
      await createClient(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('正常に作成される / creates client successfully', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Client.findOne).mockReturnValue({ lean: leanMock } as any)
      vi.mocked(Client.create).mockResolvedValue({
        _id: 'c1',
        clientCode: 'CL001',
        name: 'テスト顧客',
        toObject: () => ({ _id: 'c1', clientCode: 'CL001', name: 'テスト顧客' }),
      } as any)

      const req = mockReq({ body: { clientCode: 'CL001', name: 'テスト顧客' } })
      const res = mockRes()
      await createClient(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('MongoDB重複キーエラーの場合409を返す / returns 409 for MongoDB duplicate key error', async () => {
      const leanMock = vi.fn().mockResolvedValue(null)
      vi.mocked(Client.findOne).mockReturnValue({ lean: leanMock } as any)
      const duplicateError: any = new Error('duplicate key')
      duplicateError.code = 11000
      duplicateError.keyPattern = { clientCode: 1 }
      duplicateError.keyValue = { clientCode: 'CL001' }
      vi.mocked(Client.create).mockRejectedValue(duplicateError)

      const req = mockReq({ body: { clientCode: 'CL001', name: '顧客A' } })
      const res = mockRes()
      await createClient(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })
})
