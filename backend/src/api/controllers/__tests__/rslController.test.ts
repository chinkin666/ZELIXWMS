/**
 * rslController 单元测试 / rslController ユニットテスト
 *
 * RSL 出荷計画 CRUD + ステータス遷移（draft→confirmed→shipped）
 * RSL 出货计划 CRUD + 状态流转（draft→confirmed→shipped）
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块mock声明 ─────────────────

vi.mock('@/models/rslShipmentPlan', () => ({
  RslShipmentPlan: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    deleteOne: vi.fn(),
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn().mockReturnValue('T1'),
}))

import { RslShipmentPlan } from '@/models/rslShipmentPlan'
import {
  listRslPlans,
  createRslPlan,
  getRslPlan,
  updateRslPlan,
  confirmRslPlan,
  shipRslPlan,
  deleteRslPlan,
} from '@/api/controllers/rslController'

// ─── テストユーティリティ / 测试工具函数 ───────────────────────────

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── テスト / 测试 ─────────────────────────────────────────────────

describe('rslController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 一覧 / 列表
  describe('listRslPlans', () => {
    it('ページネーション付きで一覧を返す / 带分页返回列表', async () => {
      const data = [{ _id: 'r1', planNumber: 'RSL-001' }]
      ;(RslShipmentPlan.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(data) }),
          }),
        }),
      })
      ;(RslShipmentPlan.countDocuments as any).mockResolvedValue(1)

      const res = mockRes()
      await listRslPlans(mockReq({ query: { page: '1', limit: '20' } }), res)

      expect(res.json).toHaveBeenCalledWith({ data, total: 1 })
    })

    it('ステータスフィルターを適用 / 应用状态过滤', async () => {
      ;(RslShipmentPlan.find as any).mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
          }),
        }),
      })
      ;(RslShipmentPlan.countDocuments as any).mockResolvedValue(0)

      const res = mockRes()
      await listRslPlans(mockReq({ query: { status: 'draft' } }), res)

      expect(RslShipmentPlan.find).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'T1', status: 'draft' }),
      )
    })
  })

  // 作成 / 创建
  describe('createRslPlan', () => {
    it('正常作成で 201 を返す / 正常创建返回201', async () => {
      ;(RslShipmentPlan.countDocuments as any).mockResolvedValue(0)
      const created = {
        _id: 'r1',
        planNumber: 'RSL-20260321-001',
        status: 'draft',
        toObject: () => ({ _id: 'r1', planNumber: 'RSL-20260321-001', status: 'draft' }),
      }
      ;(RslShipmentPlan.create as any).mockResolvedValue(created)

      const res = mockRes()
      await createRslPlan(
        mockReq({
          body: {
            destinationWarehouse: 'WH1',
            items: [{ sku: 'SKU1', quantity: 10 }],
          },
        }),
        res,
      )

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('destinationWarehouse 未入力で 400 / 缺少destinationWarehouse返回400', async () => {
      const res = mockRes()
      await createRslPlan(mockReq({ body: { items: [{ sku: 'S', quantity: 1 }] } }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('items 空配列で 400 / items为空数组返回400', async () => {
      const res = mockRes()
      await createRslPlan(mockReq({ body: { destinationWarehouse: 'WH1', items: [] } }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('重複プラン番号で 409 / 计划编号重复返回409', async () => {
      ;(RslShipmentPlan.countDocuments as any).mockResolvedValue(0)
      ;(RslShipmentPlan.create as any).mockRejectedValue({ code: 11000 })

      const res = mockRes()
      await createRslPlan(
        mockReq({ body: { destinationWarehouse: 'WH1', items: [{ sku: 'S', quantity: 1 }] } }),
        res,
      )
      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  // 詳細 / 详情
  describe('getRslPlan', () => {
    it('存在するプランを返す / 返回存在的计划', async () => {
      const plan = { _id: 'r1', planNumber: 'RSL-001' }
      ;(RslShipmentPlan.findOne as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(plan) })

      const res = mockRes()
      await getRslPlan(mockReq({ params: { id: 'r1' } }), res)

      expect(res.json).toHaveBeenCalledWith(plan)
    })

    it('存在しないプランで 404 / 不存在的计划返回404', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const res = mockRes()
      await getRslPlan(mockReq({ params: { id: 'none' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // 更新 / 更新
  describe('updateRslPlan', () => {
    it('draft ステータスでは全フィールド更新可能 / draft状态可更新所有字段', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'draft' }),
      })
      ;(RslShipmentPlan.findOneAndUpdate as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', memo: 'updated' }),
      })

      const res = mockRes()
      await updateRslPlan(
        mockReq({ params: { id: 'r1' }, body: { memo: 'updated', destinationWarehouse: 'WH2' } }),
        res,
      )

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ memo: 'updated' }))
    })

    it('confirmed ステータスでは許可外フィールド更新不可で 400 / confirmed状态下不允许更新受限字段返回400', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'confirmed' }),
      })

      const res = mockRes()
      await updateRslPlan(
        mockReq({ params: { id: 'r1' }, body: { destinationWarehouse: 'WH2' } }),
        res,
      )

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // 確認 / 确认
  describe('confirmRslPlan', () => {
    it('draft→confirmed に遷移 / draft→confirmed状态流转', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'draft' }),
      })
      ;(RslShipmentPlan.findOneAndUpdate as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'confirmed' }),
      })

      const res = mockRes()
      await confirmRslPlan(mockReq({ params: { id: 'r1' } }), res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }))
    })

    it('draft 以外のステータスで確認不可で 400 / 非draft状态无法确认返回400', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'shipped' }),
      })

      const res = mockRes()
      await confirmRslPlan(mockReq({ params: { id: 'r1' } }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // 出荷 / 出货
  describe('shipRslPlan', () => {
    it('confirmed→shipped に遷移 / confirmed→shipped状态流转', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'confirmed' }),
      })
      ;(RslShipmentPlan.findOneAndUpdate as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'shipped' }),
      })

      const res = mockRes()
      await shipRslPlan(mockReq({ params: { id: 'r1' }, body: { trackingNumber: 'TRK1' } }), res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'shipped' }))
    })

    it('confirmed 以外のステータスで出荷不可で 400 / 非confirmed状态无法出货返回400', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'draft' }),
      })

      const res = mockRes()
      await shipRslPlan(mockReq({ params: { id: 'r1' }, body: {} }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  // 削除 / 删除
  describe('deleteRslPlan', () => {
    it('draft ステータスのプランを削除 / 删除draft状态的计划', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'draft' }),
      })
      ;(RslShipmentPlan.deleteOne as any).mockResolvedValue({})

      const res = mockRes()
      await deleteRslPlan(mockReq({ params: { id: 'r1' } }), res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('削除') }))
    })

    it('draft 以外のステータスでは削除不可で 400 / 非draft状态无法删除返回400', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'r1', status: 'confirmed' }),
      })

      const res = mockRes()
      await deleteRslPlan(mockReq({ params: { id: 'r1' } }), res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('存在しないプランで 404 / 不存在的计划返回404', async () => {
      ;(RslShipmentPlan.findOne as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      })

      const res = mockRes()
      await deleteRslPlan(mockReq({ params: { id: 'none' } }), res)
      expect(res.status).toHaveBeenCalledWith(404)
    })
  })
})
