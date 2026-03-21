/**
 * workChargeController 单元测试 / workChargeController ユニットテスト
 *
 * 作業チャージ CRUD（更新なし）+ サマリー集計 + 請求済み削除ガード
 * 作业费用 CRUD（无更新）+ 汇总聚合 + 已计费删除保护
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// 模拟 WorkCharge / WorkCharge をモック
vi.mock('@/models/workCharge', () => ({
  WorkCharge: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
  REFERENCE_TYPES: ['shipment', 'inbound', 'return', 'manual'],
}))

vi.mock('@/models/serviceRate', () => ({
  CHARGE_TYPES: ['storage', 'handling', 'shipping', 'other'],
}))

vi.mock('@/api/helpers/tenantHelper', () => ({ getTenantId: vi.fn(() => 'T1') }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { WorkCharge } from '@/models/workCharge'
import {
  listWorkCharges,
  getWorkCharge,
  createWorkCharge,
  getWorkChargeSummary,
  deleteWorkCharge,
} from '../workChargeController'

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

describe('workChargeController / 作業チャージコントローラー', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- listWorkCharges ---

  describe('listWorkCharges / 一覧取得 / 列表获取', () => {
    it('チャージ一覧をページネーション付きで返す / 返回分页费用列表', async () => {
      const data = [{ _id: 'wc1', description: 'Pick' }]
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(data),
      }
      ;(WorkCharge.find as any).mockReturnValue(mockChain)
      ;(WorkCharge.countDocuments as any).mockResolvedValue(1)

      const req = mockReq({ query: { page: '1', limit: '20' } })
      const res = mockRes()
      await listWorkCharges(req, res)

      expect(res.json).toHaveBeenCalledWith({ data, total: 1 })
    })

    it('フィルター適用 / 应用过滤器', async () => {
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      ;(WorkCharge.find as any).mockReturnValue(mockChain)
      ;(WorkCharge.countDocuments as any).mockResolvedValue(0)

      const req = mockReq({ query: { clientId: 'c1', period: '2026-03', isBilled: 'false' } })
      const res = mockRes()
      await listWorkCharges(req, res)

      expect(WorkCharge.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'T1',
          clientId: 'c1',
          billingPeriod: '2026-03',
          isBilled: false,
        }),
      )
    })
  })

  // --- getWorkCharge ---

  describe('getWorkCharge / 単一取得 / 单个获取', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(WorkCharge.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await getWorkCharge(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('チャージを返す / 返回费用', async () => {
      const item = { _id: 'wc1', description: 'Pick' }
      ;(WorkCharge.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(item) })

      const req = mockReq({ params: { id: 'wc1' } })
      const res = mockRes()
      await getWorkCharge(req, res)
      expect(res.json).toHaveBeenCalledWith(item)
    })
  })

  // --- createWorkCharge ---

  describe('createWorkCharge / 作成 / 创建', () => {
    it('無効な chargeType で 400 / 无效 chargeType 返回 400', async () => {
      const req = mockReq({
        body: { chargeType: 'invalid', chargeDate: '2026-03-01', description: 'x', quantity: 1, unitPrice: 100 },
      })
      const res = mockRes()
      await createWorkCharge(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('chargeDate 未指定で 400 / chargeDate 未提供返回 400', async () => {
      const req = mockReq({
        body: { chargeType: 'handling', description: 'x', quantity: 1, unitPrice: 100 },
      })
      const res = mockRes()
      await createWorkCharge(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('description 未指定で 400 / description 未提供返回 400', async () => {
      const req = mockReq({
        body: { chargeType: 'handling', chargeDate: '2026-03-01', quantity: 1, unitPrice: 100 },
      })
      const res = mockRes()
      await createWorkCharge(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('quantity が負数で 400 / quantity 为负数返回 400', async () => {
      const req = mockReq({
        body: { chargeType: 'handling', chargeDate: '2026-03-01', description: 'x', quantity: -1, unitPrice: 100 },
      })
      const res = mockRes()
      await createWorkCharge(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常作成 201 + amount 自動計算 / 正常创建 201 + amount 自动计算', async () => {
      const created = {
        _id: 'wc1',
        amount: 500,
        toObject: () => ({ _id: 'wc1', amount: 500 }),
      }
      ;(WorkCharge.create as any).mockResolvedValue(created)

      const req = mockReq({
        body: {
          chargeType: 'handling',
          chargeDate: '2026-03-01',
          description: 'Pick and pack',
          quantity: 5,
          unitPrice: 100,
        },
      })
      const res = mockRes()
      await createWorkCharge(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      // amount = quantity * unitPrice が渡されることを確認 / 确认传递了 amount = quantity * unitPrice
      expect(WorkCharge.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500, quantity: 5, unitPrice: 100 }),
      )
    })
  })

  // --- getWorkChargeSummary ---

  describe('getWorkChargeSummary / サマリー集計 / 汇总聚合', () => {
    it('集計結果を返す / 返回聚合结果', async () => {
      const summary = [
        { clientId: 'c1', chargeType: 'handling', totalAmount: 1000, count: 5 },
      ]
      ;(WorkCharge.aggregate as any).mockResolvedValue(summary)

      const req = mockReq({ query: { period: '2026-03' } })
      const res = mockRes()
      await getWorkChargeSummary(req, res)

      expect(res.json).toHaveBeenCalledWith({ data: summary })
      expect(WorkCharge.aggregate).toHaveBeenCalled()
    })
  })

  // --- deleteWorkCharge ---

  describe('deleteWorkCharge / 削除 / 删除', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(WorkCharge.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await deleteWorkCharge(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('請求済みの場合 400 で削除拒否 / 已计费时返回 400 拒绝删除', async () => {
      const item = { _id: 'wc1', isBilled: true }
      ;(WorkCharge.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(item) })

      const req = mockReq({ params: { id: 'wc1' } })
      const res = mockRes()
      await deleteWorkCharge(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('請求済み'),
        }),
      )
    })

    it('未請求の場合は正常削除 / 未计费时正常删除', async () => {
      const item = { _id: 'wc1', isBilled: false }
      ;(WorkCharge.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(item) })
      ;(WorkCharge.findByIdAndDelete as any).mockResolvedValue({})

      const req = mockReq({ params: { id: 'wc1' } })
      const res = mockRes()
      await deleteWorkCharge(req, res)

      expect(WorkCharge.findByIdAndDelete).toHaveBeenCalledWith('wc1')
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'wc1' }),
      )
    })
  })
})
