/**
 * setProductController テスト / SetProduct Controller Tests
 *
 * セット組 CRUD と組立指示の HTTP フローを検証する。
 * 验证套装商品 CRUD 和组装指令的 HTTP 流程。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// セット組モデルのモック / 套装商品模型 mock
vi.mock('@/models/setProduct', () => ({
  SetProduct: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

// セット組指示モデルのモック / 套装指令模型 mock
vi.mock('@/models/setOrder', () => ({
  SetOrder: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { SetProduct } from '@/models/setProduct'
import { SetOrder } from '@/models/setOrder'
import {
  listSetProducts,
  getSetProduct,
  createSetProduct,
  updateSetProduct,
  deleteSetProduct,
  createSetOrder,
  listSetOrders,
  getSetOrder,
  completeSetOrder,
  cancelSetOrder,
} from '../setProductController'

function mockReq(overrides: Record<string, unknown> = {}): any {
  return { body: {}, params: {}, query: {}, headers: {}, ...overrides }
}

function mockRes(): any {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

describe('setProductController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── SetProduct CRUD ─── セット組 CRUD / 套装商品 CRUD ───

  describe('listSetProducts', () => {
    it('セット組一覧を返す / 返回套装商品列表', async () => {
      const mockData = [{ _id: 'sp1', sku: 'SET001', name: 'テストセット' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(SetProduct.find).mockReturnValue(chainMock as any)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listSetProducts(req, res)

      expect(res.json).toHaveBeenCalledWith(mockData)
    })

    it('検索フィルタが適用される / 应用搜索过滤器', async () => {
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(SetProduct.find).mockReturnValue(chainMock as any)

      const req = mockReq({ query: { search: 'テスト', isActive: 'true' } })
      const res = mockRes()
      await listSetProducts(req, res)

      const filter = vi.mocked(SetProduct.find).mock.calls[0][0] as any
      expect(filter.$or).toBeDefined()
      expect(filter.isActive).toBe(true)
    })

    it('500エラーを返す / 返回500错误', async () => {
      vi.mocked(SetProduct.find).mockImplementation(() => { throw new Error('DB error') })

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listSetProducts(req, res)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('getSetProduct', () => {
    it('セット組を返す / 返回套装商品', async () => {
      const mockItem = { _id: 'sp1', sku: 'SET001' }
      vi.mocked(SetProduct.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockItem) } as any)

      const req = mockReq({ params: { id: 'sp1' } })
      const res = mockRes()
      await getSetProduct(req, res)

      expect(res.json).toHaveBeenCalledWith(mockItem)
    })

    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(SetProduct.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('createSetProduct', () => {
    it('品番が空の場合400を返す / 品番为空时返回400', async () => {
      const req = mockReq({ body: { name: 'テスト', components: [{ productId: 'p1', quantity: 1 }] } })
      const res = mockRes()
      await createSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('名称が空の場合400を返す / 名称为空时返回400', async () => {
      const req = mockReq({ body: { sku: 'SET001', components: [{ productId: 'p1', quantity: 1 }] } })
      const res = mockRes()
      await createSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('構成品が空の場合400を返す / 构成品为空时返回400', async () => {
      const req = mockReq({ body: { sku: 'SET001', name: 'テスト', components: [] } })
      const res = mockRes()
      await createSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('品番重複の場合409を返す / 品番重复时返回409', async () => {
      vi.mocked(SetProduct.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ sku: 'SET001' }) } as any)

      const req = mockReq({ body: { sku: 'SET001', name: 'テスト', components: [{ productId: 'p1', quantity: 1 }] } })
      const res = mockRes()
      await createSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })

    it('正常に作成される / 正常创建', async () => {
      vi.mocked(SetProduct.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)
      vi.mocked(SetProduct.create).mockResolvedValue({
        _id: 'sp1',
        sku: 'SET001',
        name: 'テストセット',
        toObject: () => ({ _id: 'sp1', sku: 'SET001', name: 'テストセット' }),
      } as any)

      const req = mockReq({ body: { sku: 'SET001', name: 'テストセット', components: [{ productId: 'p1', sku: 'SKU1', name: '部品1', quantity: 2 }] } })
      const res = mockRes()
      await createSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('MongoDB重複キーエラーの場合409を返す / MongoDB重复键错误时返回409', async () => {
      vi.mocked(SetProduct.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)
      const dupError: any = new Error('duplicate key')
      dupError.code = 11000
      vi.mocked(SetProduct.create).mockRejectedValue(dupError)

      const req = mockReq({ body: { sku: 'SET001', name: 'テスト', components: [{ productId: 'p1', quantity: 1 }] } })
      const res = mockRes()
      await createSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  describe('updateSetProduct', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(SetProduct.findById).mockResolvedValue(null)

      const req = mockReq({ params: { id: 'nonexistent' }, body: { name: '更新' } })
      const res = mockRes()
      await updateSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常に更新される / 正常更新', async () => {
      const mockItem = {
        _id: 'sp1',
        sku: 'SET001',
        name: 'テスト',
        components: [],
        save: vi.fn().mockResolvedValue(undefined),
        toObject: () => ({ _id: 'sp1', sku: 'SET001', name: '更新後' }),
      }
      vi.mocked(SetProduct.findById).mockResolvedValue(mockItem as any)

      const req = mockReq({ params: { id: 'sp1' }, body: { name: '更新後' } })
      const res = mockRes()
      await updateSetProduct(req, res)

      expect(res.json).toHaveBeenCalled()
    })

    it('空の品番は400を返す / 空品番返回400', async () => {
      const mockItem = { _id: 'sp1', sku: 'SET001', name: 'テスト' }
      vi.mocked(SetProduct.findById).mockResolvedValue(mockItem as any)

      const req = mockReq({ params: { id: 'sp1' }, body: { sku: '  ' } })
      const res = mockRes()
      await updateSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('deleteSetProduct', () => {
    it('セット組を削除する / 删除套装商品', async () => {
      vi.mocked(SetProduct.findByIdAndDelete).mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'sp1' }) } as any)

      const req = mockReq({ params: { id: 'sp1' } })
      const res = mockRes()
      await deleteSetProduct(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Deleted' }))
    })

    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(SetProduct.findByIdAndDelete).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await deleteSetProduct(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // ─── SetOrder (Assembly / Disassembly) ─── 組立・分解指示 / 组装・拆解指令 ───

  describe('createSetOrder', () => {
    it('必須パラメータが不足の場合400を返す / 必填参数不足时返回400', async () => {
      const req = mockReq({ body: { setProductId: 'sp1' } })
      const res = mockRes()
      await createSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('無効なtypeの場合400を返す / 无效type时返回400', async () => {
      const req = mockReq({ body: { setProductId: 'sp1', type: 'invalid', quantity: 1 } })
      const res = mockRes()
      await createSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('数量が0の場合400を返す / 数量为0时返回400', async () => {
      const req = mockReq({ body: { setProductId: 'sp1', type: 'assembly', quantity: 0 } })
      const res = mockRes()
      await createSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('セット組が存在しない場合404を返す / 套装商品不存在时返回404', async () => {
      vi.mocked(SetProduct.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ body: { setProductId: 'sp1', type: 'assembly', quantity: 1 } })
      const res = mockRes()
      await createSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常に組立指示を作成する / 正常创建组装指令', async () => {
      const mockSetProduct = {
        _id: 'sp1',
        sku: 'SET001',
        name: 'テストセット',
        components: [{ productId: 'p1', sku: 'SKU1', name: '部品1', quantity: 2 }],
      }
      vi.mocked(SetProduct.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockSetProduct) } as any)
      vi.mocked(SetOrder.findOne).mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) } as any)
      vi.mocked(SetOrder.create).mockResolvedValue({
        _id: 'so1',
        orderNumber: 'SET-20260321-001',
        toObject: () => ({ _id: 'so1', orderNumber: 'SET-20260321-001' }),
      } as any)

      const req = mockReq({ body: { setProductId: 'sp1', type: 'assembly', quantity: 5 } })
      const res = mockRes()
      await createSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  describe('listSetOrders', () => {
    it('指示一覧を返す / 返回指令列表', async () => {
      const mockData = [{ _id: 'so1', orderNumber: 'SET-20260321-001' }]
      const chainMock = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockData),
      }
      vi.mocked(SetOrder.find).mockReturnValue(chainMock as any)
      vi.mocked(SetOrder.countDocuments).mockResolvedValue(1)

      const req = mockReq({ query: {} })
      const res = mockRes()
      await listSetOrders(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ items: mockData, total: 1 }))
    })
  })

  describe('getSetOrder', () => {
    it('指示を返す / 返回指令', async () => {
      const mockOrder = { _id: 'so1', orderNumber: 'SET-20260321-001' }
      vi.mocked(SetOrder.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(mockOrder) } as any)

      const req = mockReq({ params: { id: 'so1' } })
      const res = mockRes()
      await getSetOrder(req, res)

      expect(res.json).toHaveBeenCalledWith(mockOrder)
    })

    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(SetOrder.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as any)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await getSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  describe('completeSetOrder', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(SetOrder.findById).mockResolvedValue(null)

      const req = mockReq({ params: { id: 'nonexistent' }, body: { completedQuantity: 5 } })
      const res = mockRes()
      await completeSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('完了済みの場合400を返す / 已完成时返回400', async () => {
      vi.mocked(SetOrder.findById).mockResolvedValue({ status: 'completed' } as any)

      const req = mockReq({ params: { id: 'so1' }, body: { completedQuantity: 5 } })
      const res = mockRes()
      await completeSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('完成数が不正の場合400を返す / 完成数无效时返回400', async () => {
      vi.mocked(SetOrder.findById).mockResolvedValue({ status: 'pending' } as any)

      const req = mockReq({ params: { id: 'so1' }, body: { completedQuantity: 0 } })
      const res = mockRes()
      await completeSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常に完了する / 正常完成', async () => {
      const mockOrder = {
        status: 'pending',
        completedQuantity: 0,
        save: vi.fn().mockResolvedValue(undefined),
        toObject: () => ({ _id: 'so1', status: 'completed' }),
      }
      vi.mocked(SetOrder.findById).mockResolvedValue(mockOrder as any)

      const req = mockReq({ params: { id: 'so1' }, body: { completedQuantity: 5 } })
      const res = mockRes()
      await completeSetOrder(req, res)

      expect(res.json).toHaveBeenCalled()
      expect(mockOrder.status).toBe('completed')
    })
  })

  describe('cancelSetOrder', () => {
    it('存在しない場合404を返す / 不存在时返回404', async () => {
      vi.mocked(SetOrder.findById).mockResolvedValue(null)

      const req = mockReq({ params: { id: 'nonexistent' } })
      const res = mockRes()
      await cancelSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('完了済みの場合400を返す / 已完成时返回400', async () => {
      vi.mocked(SetOrder.findById).mockResolvedValue({ status: 'completed' } as any)

      const req = mockReq({ params: { id: 'so1' } })
      const res = mockRes()
      await cancelSetOrder(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常にキャンセルする / 正常取消', async () => {
      const mockOrder = {
        status: 'pending',
        save: vi.fn().mockResolvedValue(undefined),
        toObject: () => ({ _id: 'so1', status: 'cancelled' }),
      }
      vi.mocked(SetOrder.findById).mockResolvedValue(mockOrder as any)

      const req = mockReq({ params: { id: 'so1' } })
      const res = mockRes()
      await cancelSetOrder(req, res)

      expect(res.json).toHaveBeenCalled()
      expect(mockOrder.status).toBe('cancelled')
    })
  })
})
