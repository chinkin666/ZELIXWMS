/**
 * subClientController テスト / SubClient Controller Tests
 *
 * 子顧客 CRUD の HTTP フローを検証する。
 * 验证子客户 CRUD 的 HTTP 流程。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// 子顧客モデルのモック / 子客户模型 mock
vi.mock('@/models/subClient', () => ({
  SubClient: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

// 顧客モデルのモック / 客户模型 mock
vi.mock('@/models/client', () => ({
  Client: {
    findById: vi.fn(),
  },
}))

import { SubClient } from '@/models/subClient'
import { Client } from '@/models/client'
import {
  listSubClients,
  getSubClient,
  createSubClient,
  updateSubClient,
  deleteSubClient,
} from '../subClientController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, headers: { 'x-tenant-id': 'default' }, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('subClientController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listSubClients', () => {
    it('子顧客一覧を返す / 返回子客户列表', async () => {
      const mockData = [{ _id: 'sc1', subClientCode: 'SC001', name: 'テスト子顧客' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(SubClient.find).mockReturnValue(chainMock as any)
      vi.mocked(SubClient.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listSubClients(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockData, total: 1 }))
    })

    it('検索フィルタが適用される / 应用搜索过滤器', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(SubClient.find).mockReturnValue(chainMock as any)
      vi.mocked(SubClient.countDocuments).mockResolvedValue(0)

      const req = mockReq({ query: { search: 'テスト', isActive: 'true', clientId: 'c1' } })
      const res = mockRes()
      await listSubClients(req, res)

      const filter = vi.mocked(SubClient.find).mock.calls[0][0] as any
      expect(filter.$or).toBeDefined()
      expect(filter.isActive).toBe(true)
      expect(filter.clientId).toBe('c1')
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(SubClient.find).mockImplementation(() => { throw new Error('DB error') })

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listSubClients(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getSubClient', () => {
    it('子顧客を返す / 返回子客户', async () => {
      const mockItem = { _id: 'sc1', subClientCode: 'SC001' }
      vi.mocked(SubClient.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockItem) } as any)

      const req = mockReq({ params: { id: 'sc1' } })
      const res = mockRes()
      await getSubClient(req, res)

      expect(res.json).toHaveBeenCalledWith(mockItem)
    })

    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(SubClient.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createSubClient', () => {
    it('所属顧客IDが空の場合400を返す / 所属客户ID为空时返回400', async () => {
      const req = mockReq({ body: { subClientCode: 'SC001', name: 'テスト' } })
      const res = mockRes()
      await createSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('子顧客コードが空の場合400を返す / 子客户编号为空时返回400', async () => {
      const req = mockReq({ body: { clientId: 'c1', name: 'テスト' } })
      const res = mockRes()
      await createSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('名前が空の場合400を返す / 名称为空时返回400', async () => {
      const req = mockReq({ body: { clientId: 'c1', subClientCode: 'SC001' } })
      const res = mockRes()
      await createSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('所属顧客が存在しない場合404を返す / 所属客户不存在时返回404', async () => {
      vi.mocked(Client.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ body: { clientId: 'c1', subClientCode: 'SC001', name: 'テスト' } })
      const res = mockRes()
      await createSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('コード重複の場合409を返す / 编号重复时返回409', async () => {
      vi.mocked(Client.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'c1' }) } as any)
      vi.mocked(SubClient.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ subClientCode: 'SC001' }) } as any)

      const req = mockReq({ body: { clientId: 'c1', subClientCode: 'SC001', name: 'テスト' } })
      const res = mockRes()
      await createSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('正常に作成される / 正常创建', async () => {
      vi.mocked(Client.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'c1' }) } as any)
      vi.mocked(SubClient.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)
      vi.mocked(SubClient.create).mockResolvedValue({
        _id: 'sc1',
        subClientCode: 'SC001',
        name: 'テスト子顧客',
        toObject: () => ({ _id: 'sc1', subClientCode: 'SC001', name: 'テスト子顧客' }),
      } as any)

      const req = mockReq({ body: { clientId: 'c1', subClientCode: 'SC001', name: 'テスト子顧客' } })
      const res = mockRes()
      await createSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('MongoDB重複キーエラーの場合409を返す / MongoDB重复键错误时返回409', async () => {
      vi.mocked(Client.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'c1' }) } as any)
      vi.mocked(SubClient.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)
      const dupError: any = new Error('duplicate key')
      dupError.code = 11000
      vi.mocked(SubClient.create).mockRejectedValue(dupError)

      const req = mockReq({ body: { clientId: 'c1', subClientCode: 'SC001', name: 'テスト' } })
      const res = mockRes()
      await createSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  describe('updateSubClient', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(SubClient.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' }, body: { name: '更新' } })
      const res = mockRes()
      await updateSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常に更新される / 正常更新', async () => {
      vi.mocked(SubClient.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'sc1', subClientCode: 'SC001' }) } as any)
      vi.mocked(SubClient.findByIdAndUpdate).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'sc1', name: '更新後' }) } as any)

      const req = mockReq({ params: { id: 'sc1' }, body: { name: '更新後' } })
      const res = mockRes()
      await updateSubClient(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: '更新後' }))
    })

    it('コード変更時に重複チェックする / 编号变更时检查重复', async () => {
      vi.mocked(SubClient.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'sc1', subClientCode: 'SC001' }) } as any)
      vi.mocked(SubClient.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'sc2', subClientCode: 'SC002' }) } as any)

      const req = mockReq({ params: { id: 'sc1' }, body: { subClientCode: 'SC002' } })
      const res = mockRes()
      await updateSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  describe('deleteSubClient', () => {
    it('ソフトデリートする / 软删除', async () => {
      vi.mocked(SubClient.findByIdAndUpdate).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'sc1', isActive: false }) } as any)

      const req = mockReq({ params: { id: 'sc1' } })
      const res = mockRes()
      await deleteSubClient(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Deleted' }))
    })

    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(SubClient.findByIdAndUpdate).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await deleteSubClient(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })
})
