/**
 * outboundRequestController 単元テスト / outboundRequestController 单元测试
 *
 * 保管型出庫申請の CRUD・ステータス遷移を検証。
 * 验证保管型出库申请的 CRUD、状态流转。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── mongoose モック / mongoose Mock ──────────

const mockCollection = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  insertOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  countDocuments: vi.fn(),
}))

vi.mock('mongoose', () => {
  class ObjectId {
    id: string
    constructor(id: string) { this.id = id }
    toString() { return this.id }
  }
  return {
    default: {
      connection: {
        collection: vi.fn(() => mockCollection),
      },
      Types: { ObjectId },
    },
    Types: { ObjectId },
  }
})

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(),
}))

import { getTenantId } from '@/api/helpers/tenantHelper'
import {
  listOutboundRequests,
  createOutboundRequest,
  getOutboundRequest,
  approveOutboundRequest,
  shipOutboundRequest,
} from '../outboundRequestController'

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

describe('outboundRequestController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTenantId).mockReturnValue('T1')
  })

  // === 一覧取得 / 列表获取 ===
  describe('listOutboundRequests', () => {
    it('テナント別一覧を返す / 返回按租户筛选的列表', async () => {
      const data = [{ _id: '1', requestNumber: 'OB-001', status: 'pending' }]
      const chain = { sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue(data) }
      mockCollection.find.mockReturnValue(chain)
      mockCollection.countDocuments.mockResolvedValue(1)

      const req = mockReq({ query: { page: '1', limit: '10' } })
      const res = mockRes()
      await listOutboundRequests(req, res)

      expect(res.json).toHaveBeenCalledWith({ data, total: 1 })
    })

    it('ステータスフィルターを適用 / 应用状态过滤', async () => {
      const chain = { sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), toArray: vi.fn().mockResolvedValue([]) }
      mockCollection.find.mockReturnValue(chain)
      mockCollection.countDocuments.mockResolvedValue(0)

      const req = mockReq({ query: { status: 'approved' } })
      const res = mockRes()
      await listOutboundRequests(req, res)

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'T1', status: 'approved' }),
      )
    })
  })

  // === 作成 / 创建 ===
  describe('createOutboundRequest', () => {
    it('出庫申請を作成し 201 / 创建出库申请并返回 201', async () => {
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'new1' })

      const req = mockReq({
        body: {
          clientId: 'c1',
          items: [{ productId: 'p1', sku: 'S1', productName: 'Product1', quantity: 3 }],
          recipientName: 'TestRecipient',
        },
      })
      const res = mockRes()
      await createOutboundRequest(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'T1', status: 'pending' }),
      )
    })

    it('items が空の場合 400 / items 为空时返回 400', async () => {
      const req = mockReq({ body: { items: [] } })
      const res = mockRes()
      await createOutboundRequest(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('items が未指定の場合 400 / items 缺失时返回 400', async () => {
      const req = mockReq({ body: {} })
      const res = mockRes()
      await createOutboundRequest(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // === 詳細取得 / 获取详情 ===
  describe('getOutboundRequest', () => {
    it('存在する場合返す / 存在时返回', async () => {
      const doc = { _id: '1', requestNumber: 'OB-001' }
      mockCollection.findOne.mockResolvedValue(doc)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()
      await getOutboundRequest(req, res)

      expect(res.json).toHaveBeenCalledWith(doc)
    })

    it('存在しない場合 404 / 不存在时返回 404', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'bad' } })
      const res = mockRes()
      await getOutboundRequest(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // === 承認 / 审批 ===
  describe('approveOutboundRequest', () => {
    it('pending → approved に遷移 / pending 转为 approved', async () => {
      const updated = { _id: '1', status: 'approved' }
      mockCollection.findOneAndUpdate.mockResolvedValue(updated)

      const req = mockReq({ params: { id: '1' }, body: { approvedBy: 'admin1' } })
      const res = mockRes()
      await approveOutboundRequest(req, res)

      expect(res.json).toHaveBeenCalledWith(updated)
    })

    it('存在しないまたは pending でない場合 404 / 不存在或非 pending 时返回 404', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'bad' }, body: {} })
      const res = mockRes()
      await approveOutboundRequest(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // === 出荷完了 / 出货完成 ===
  describe('shipOutboundRequest', () => {
    it('shipped に遷移 / 转为 shipped 状态', async () => {
      const updated = { _id: '1', status: 'shipped', trackingNumber: 'TRK1' }
      mockCollection.findOneAndUpdate.mockResolvedValue(updated)

      const req = mockReq({
        params: { id: '1' },
        body: { trackingNumber: 'TRK1', carrier: 'yamato' },
      })
      const res = mockRes()
      await shipOutboundRequest(req, res)

      expect(res.json).toHaveBeenCalledWith(updated)
    })

    it('存在しない場合 404 / 不存在时返回 404', async () => {
      mockCollection.findOneAndUpdate.mockResolvedValue(null)

      const req = mockReq({ params: { id: 'bad' }, body: {} })
      const res = mockRes()
      await shipOutboundRequest(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })
})
