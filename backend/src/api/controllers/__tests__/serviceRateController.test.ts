/**
 * serviceRateController 单元测试 / serviceRateController ユニットテスト
 *
 * サービス料金 CRUD + 論理削除テスト
 * 服务费率 CRUD + 逻辑删除测试
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// 模拟 ServiceRate / ServiceRate をモック
vi.mock('@/models/serviceRate', () => ({
  ServiceRate: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
  CHARGE_TYPES: ['storage', 'handling', 'shipping', 'other'],
  CHARGE_UNITS: ['per_unit', 'per_pallet', 'per_cbm', 'per_kg', 'flat'],
}))

vi.mock('@/api/helpers/tenantHelper', () => ({ getTenantId: vi.fn(() => 'T1') }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { ServiceRate } from '@/models/serviceRate'
import {
  listServiceRates,
  getServiceRate,
  createServiceRate,
  updateServiceRate,
  deleteServiceRate,
} from '../serviceRateController'

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

describe('serviceRateController / サービス料金コントローラー', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- listServiceRates ---

  describe('listServiceRates / 一覧取得 / 列表获取', () => {
    it('料金一覧をページネーション付きで返す / 返回分页费率列表', async () => {
      const data = [{ _id: 'r1', name: 'Rate A' }]
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(data),
      }
      ;(ServiceRate.find as any).mockReturnValue(mockChain)
      ;(ServiceRate.countDocuments as any).mockResolvedValue(1)

      const req = mockReq({ query: { page: '1', limit: '20' } })
      const res = mockRes()
      await listServiceRates(req, res)

      expect(res.json).toHaveBeenCalledWith({ data, total: 1 })
    })

    it('検索フィルターを適用 / 应用搜索过滤器', async () => {
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      ;(ServiceRate.find as any).mockReturnValue(mockChain)
      ;(ServiceRate.countDocuments as any).mockResolvedValue(0)

      const req = mockReq({ query: { clientId: 'c1', chargeType: 'storage', isActive: 'true' } })
      const res = mockRes()
      await listServiceRates(req, res)

      expect(ServiceRate.find).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'T1', clientId: 'c1', chargeType: 'storage', isActive: true }),
      )
    })
  })

  // --- getServiceRate ---

  describe('getServiceRate / 単一取得 / 单个获取', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(ServiceRate.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await getServiceRate(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('料金を返す / 返回费率', async () => {
      const item = { _id: 'r1', name: 'Rate A' }
      ;(ServiceRate.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(item) })

      const req = mockReq({ params: { id: 'r1' } })
      const res = mockRes()
      await getServiceRate(req, res)
      expect(res.json).toHaveBeenCalledWith(item)
    })
  })

  // --- createServiceRate ---

  describe('createServiceRate / 作成 / 创建', () => {
    it('無効な chargeType で 400 / 无效 chargeType 返回 400', async () => {
      const req = mockReq({ body: { chargeType: 'invalid', name: 'x', unit: 'per_unit', unitPrice: 100 } })
      const res = mockRes()
      await createServiceRate(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('name 未指定で 400 / name 未提供返回 400', async () => {
      const req = mockReq({ body: { chargeType: 'storage', unit: 'per_unit', unitPrice: 100 } })
      const res = mockRes()
      await createServiceRate(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('無効な unit で 400 / 无效 unit 返回 400', async () => {
      const req = mockReq({ body: { chargeType: 'storage', name: 'Rate', unit: 'invalid', unitPrice: 100 } })
      const res = mockRes()
      await createServiceRate(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('unitPrice が負数で 400 / unitPrice 为负数返回 400', async () => {
      const req = mockReq({ body: { chargeType: 'storage', name: 'Rate', unit: 'per_unit', unitPrice: -1 } })
      const res = mockRes()
      await createServiceRate(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常作成 201 / 正常创建返回 201', async () => {
      const created = { _id: 'r1', name: 'Rate', toObject: () => ({ _id: 'r1', name: 'Rate' }) }
      ;(ServiceRate.create as any).mockResolvedValue(created)

      const req = mockReq({
        body: { chargeType: 'storage', name: 'Rate', unit: 'per_unit', unitPrice: 100 },
      })
      const res = mockRes()
      await createServiceRate(req, res)
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ _id: 'r1', name: 'Rate' })
    })
  })

  // --- updateServiceRate ---

  describe('updateServiceRate / 更新 / 更新', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(ServiceRate.findByIdAndUpdate as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' }, body: { name: 'New' } })
      const res = mockRes()
      await updateServiceRate(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常更新 / 正常更新', async () => {
      const updated = { _id: 'r1', name: 'Updated' }
      ;(ServiceRate.findByIdAndUpdate as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(updated) })

      const req = mockReq({ params: { id: 'r1' }, body: { name: 'Updated' } })
      const res = mockRes()
      await updateServiceRate(req, res)
      expect(res.json).toHaveBeenCalledWith(updated)
    })
  })

  // --- deleteServiceRate ---

  describe('deleteServiceRate / 論理削除 / 逻辑删除', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(ServiceRate.findByIdAndUpdate as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await deleteServiceRate(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('isActive=false に設定（論理削除） / 设置 isActive=false（逻辑删除）', async () => {
      const updated = { _id: 'r1', isActive: false }
      ;(ServiceRate.findByIdAndUpdate as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(updated) })

      const req = mockReq({ params: { id: 'r1' } })
      const res = mockRes()
      await deleteServiceRate(req, res)

      expect(ServiceRate.findByIdAndUpdate).toHaveBeenCalledWith('r1', { isActive: false }, { new: true })
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r1' }),
      )
    })
  })
})
