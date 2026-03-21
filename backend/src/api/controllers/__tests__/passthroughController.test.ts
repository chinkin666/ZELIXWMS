/**
 * passthroughController 単元テスト / passthroughController 单元测试
 *
 * 通過型入庫予約の一覧・詳細・サービス委譲・エラーハンドリングを検証。
 * 验证通过型入库预定的列表、详情、服务委托、错误处理。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言 / 模块Mock声明 ──────────

vi.mock('@/models/inboundOrder', () => ({
  InboundOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(),
}))

vi.mock('@/services/passthroughService', () => ({
  createPassthroughOrder: vi.fn(),
  arriveOrder: vi.fn(),
  completeServiceOption: vi.fn(),
  onLabelUploaded: vi.fn(),
  shipOrder: vi.fn(),
  acknowledgeVariance: vi.fn(),
}))

vi.mock('@/services/fbaLabelService', () => ({
  processOrderFbaLabel: vi.fn(),
}))

import { InboundOrder } from '@/models/inboundOrder'
import { getTenantId } from '@/api/helpers/tenantHelper'
import {
  createPassthroughOrder,
  arriveOrder,
  completeServiceOption,
  onLabelUploaded,
  shipOrder,
  acknowledgeVariance,
} from '@/services/passthroughService'
import { processOrderFbaLabel } from '@/services/fbaLabelService'
import {
  listPassthroughOrders,
  getPassthroughOrder,
  createOrder,
  arrive,
  completeOption,
  labelUploaded,
  ship,
  ackVariance,
  stagingDashboard,
  uploadAndSplitLabel,
} from '../passthroughController'

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

const toObjectResult = (data: any) => ({ ...data, toObject: () => data })

// ─── テスト本体 / 测试主体 ────────────────────────

describe('passthroughController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTenantId).mockReturnValue('T1')
  })

  // === 一覧取得 / 列表获取 ===
  describe('listPassthroughOrders', () => {
    it('テナント別通過型一覧を返す / 返回按租户筛选的通过型列表', async () => {
      const orders = [{ _id: '1', orderNumber: 'PT-001', flowType: 'passthrough' }]
      const chain = { sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(orders) }
      vi.mocked(InboundOrder.find).mockReturnValue(chain as any)
      vi.mocked(InboundOrder.countDocuments).mockResolvedValue(1 as any)

      const req = mockReq({ query: { page: '1', limit: '10' } })
      const res = mockRes()
      await listPassthroughOrders(req, res)

      expect(res.json).toHaveBeenCalledWith({ data: orders, total: 1 })
      expect(InboundOrder.find).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'T1', flowType: 'passthrough' }),
      )
    })
  })

  // === 詳細取得 / 获取详情 ===
  describe('getPassthroughOrder', () => {
    it('存在する場合返す / 存在时返回', async () => {
      const order = { _id: '1', orderNumber: 'PT-001' }
      const chain = { lean: vi.fn().mockResolvedValue(order) }
      vi.mocked(InboundOrder.findById).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()
      await getPassthroughOrder(req, res)

      expect(res.json).toHaveBeenCalledWith(order)
    })

    it('存在しない場合 404 / 不存在时返回 404', async () => {
      const chain = { lean: vi.fn().mockResolvedValue(null) }
      vi.mocked(InboundOrder.findById).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 'bad' } })
      const res = mockRes()
      await getPassthroughOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // === 入庫予約作成 / 创建入库预定 ===
  describe('createOrder', () => {
    it('サービスに委譲して 201 を返す / 委托服务并返回 201', async () => {
      const order = toObjectResult({ _id: 'new1', orderNumber: 'PT-002' })
      vi.mocked(createPassthroughOrder).mockResolvedValue(order as any)

      const req = mockReq({ body: { clientId: 'c1', items: [] } })
      const res = mockRes()
      await createOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(createPassthroughOrder).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'T1' }))
    })
  })

  // === 受付 / 到货 ===
  describe('arrive', () => {
    it('サービスに委譲 / 委托服务', async () => {
      const order = toObjectResult({ _id: '1', status: 'arrived' })
      vi.mocked(arriveOrder).mockResolvedValue(order as any)

      const req = mockReq({ params: { id: '1' }, body: { actualBoxCount: 5, receivedBy: 'op1' } })
      const res = mockRes()
      await arrive(req, res)

      expect(res.json).toHaveBeenCalled()
      expect(arriveOrder).toHaveBeenCalledWith('1', expect.objectContaining({ actualBoxCount: 5 }))
    })

    it('見つからない場合 404 / 未找到时返回 404', async () => {
      vi.mocked(arriveOrder).mockRejectedValue(new Error('見つかりません'))

      const req = mockReq({ params: { id: 'bad' }, body: {} })
      const res = mockRes()
      await arrive(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // === 作業オプション完了 / 作业选项完成 ===
  describe('completeOption', () => {
    it('optionCode 必須 / optionCode 必填', async () => {
      const req = mockReq({ params: { id: '1' }, body: {} })
      const res = mockRes()
      await completeOption(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('サービスに委譲 / 委托服务', async () => {
      const order = toObjectResult({ _id: '1', status: 'processing' })
      vi.mocked(completeServiceOption).mockResolvedValue(order as any)

      const req = mockReq({ params: { id: '1' }, body: { optionCode: 'labeling', actualQuantity: 10 } })
      const res = mockRes()
      await completeOption(req, res)

      expect(completeServiceOption).toHaveBeenCalledWith('1', 'labeling', 10)
    })
  })

  // === 出荷 / 出货 ===
  describe('ship', () => {
    it('trackingNumbers 必須 / trackingNumbers 必填', async () => {
      const req = mockReq({ params: { id: '1' }, body: {} })
      const res = mockRes()
      await ship(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('空配列の場合 400 / 空数组时返回 400', async () => {
      const req = mockReq({ params: { id: '1' }, body: { trackingNumbers: [] } })
      const res = mockRes()
      await ship(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('サービスに委譲 / 委托服务', async () => {
      const order = toObjectResult({ _id: '1', status: 'shipped' })
      vi.mocked(shipOrder).mockResolvedValue(order as any)

      const req = mockReq({ params: { id: '1' }, body: { trackingNumbers: ['TRK1'] } })
      const res = mockRes()
      await ship(req, res)

      expect(shipOrder).toHaveBeenCalledWith('1', { trackingNumbers: ['TRK1'] })
    })
  })

  // === FBAラベルアップロード / FBA标上传 ===
  describe('uploadAndSplitLabel', () => {
    it('ファイル未添付の場合 400 / 未上传文件时返回 400', async () => {
      const req = mockReq({ params: { id: '1' }, body: { format: '6up' } })
      const res = mockRes()
      await uploadAndSplitLabel(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('不正な format の場合 400 / format 无效时返回 400', async () => {
      const req = mockReq({ params: { id: '1' }, body: { format: 'invalid' }, file: { buffer: Buffer.from('pdf') } })
      const res = mockRes()
      await uploadAndSplitLabel(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常時にサービスに委譲 / 正常时委托服务', async () => {
      vi.mocked(processOrderFbaLabel).mockResolvedValue(['label1.pdf', 'label2.pdf'] as any)

      const req = mockReq({
        params: { id: '1' },
        body: { format: '6up' },
        file: { buffer: Buffer.from('fake-pdf') },
      })
      const res = mockRes()
      await uploadAndSplitLabel(req, res)

      expect(processOrderFbaLabel).toHaveBeenCalledWith('1', expect.any(Buffer), '6up')
      expect(res.json).toHaveBeenCalledWith({ splitLabels: ['label1.pdf', 'label2.pdf'], count: 2 })
    })
  })
})
