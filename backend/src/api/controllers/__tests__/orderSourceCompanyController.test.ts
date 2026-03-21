/**
 * orderSourceCompanyController 単元テスト / orderSourceCompanyController 单元测试
 *
 * 发注元会社の CRUD・バリデーション・一括インポートを検証。
 * 验证发注元公司的 CRUD、验证、批量导入。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言 / 模块Mock声明 ──────────

vi.mock('@/models/orderSourceCompany', () => ({
  OrderSourceCompany: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    insertMany: vi.fn(),
  },
}))

vi.mock('@/schemas/orderSourceCompanySchema', () => ({
  createOrderSourceCompanySchema: {
    safeParse: vi.fn(),
  },
  updateOrderSourceCompanySchema: {
    safeParse: vi.fn(),
  },
}))

import { OrderSourceCompany } from '@/models/orderSourceCompany'
import { createOrderSourceCompanySchema, updateOrderSourceCompanySchema } from '@/schemas/orderSourceCompanySchema'
import {
  listOrderSourceCompanies,
  getOrderSourceCompany,
  createOrderSourceCompany,
  updateOrderSourceCompany,
  deleteOrderSourceCompany,
  validateImportOrderSourceCompanies,
  importOrderSourceCompaniesBulk,
} from '../orderSourceCompanyController'

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

describe('orderSourceCompanyController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // === 一覧取得 / 列表获取 ===
  describe('listOrderSourceCompanies', () => {
    it('全件取得 / 获取全部记录', async () => {
      const items = [{ _id: '1', senderName: 'CompanyA' }]
      const chain = { sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(items) }
      vi.mocked(OrderSourceCompany.find).mockReturnValue(chain as any)

      const req = mockReq()
      const res = mockRes()
      await listOrderSourceCompanies(req, res)

      expect(res.json).toHaveBeenCalledWith(items)
    })

    it('名前フィルター適用 / 应用名称过滤', async () => {
      const chain = { sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) }
      vi.mocked(OrderSourceCompany.find).mockReturnValue(chain as any)

      const req = mockReq({ query: { senderName: 'test' } })
      const res = mockRes()
      await listOrderSourceCompanies(req, res)

      expect(OrderSourceCompany.find).toHaveBeenCalledWith(
        expect.objectContaining({ senderName: { $regex: 'test', $options: 'i' } }),
      )
    })
  })

  // === 詳細取得 / 获取详情 ===
  describe('getOrderSourceCompany', () => {
    it('存在する場合返す / 存在时返回', async () => {
      const item = { _id: '1', senderName: 'CompanyA' }
      const chain = { lean: vi.fn().mockResolvedValue(item) }
      vi.mocked(OrderSourceCompany.findById).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()
      await getOrderSourceCompany(req, res)

      expect(res.json).toHaveBeenCalledWith(item)
    })

    it('存在しない場合 404 / 不存在时返回 404', async () => {
      const chain = { lean: vi.fn().mockResolvedValue(null) }
      vi.mocked(OrderSourceCompany.findById).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 'bad' } })
      const res = mockRes()
      await getOrderSourceCompany(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // === 作成 / 创建 ===
  describe('createOrderSourceCompany', () => {
    it('バリデーション成功時 201 を返す / 验证成功时返回 201', async () => {
      const parsed = { senderName: 'NewCo', senderPostalCode: '1234567', senderPhone: '0312345678' }
      vi.mocked(createOrderSourceCompanySchema.safeParse).mockReturnValue({ success: true, data: parsed } as any)
      const created = { toObject: () => ({ _id: 'new1', ...parsed }) }
      vi.mocked(OrderSourceCompany.create).mockResolvedValue(created as any)

      const req = mockReq({ body: parsed })
      const res = mockRes()
      await createOrderSourceCompany(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
    })

    it('バリデーション失敗時 400 / 验证失败时返回 400', async () => {
      vi.mocked(createOrderSourceCompanySchema.safeParse).mockReturnValue({
        success: false,
        error: { flatten: () => ({ fieldErrors: { senderName: ['required'] } }) },
      } as any)

      const req = mockReq({ body: {} })
      const res = mockRes()
      await createOrderSourceCompany(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('重複エラー 409 / 重复错误返回 409', async () => {
      vi.mocked(createOrderSourceCompanySchema.safeParse).mockReturnValue({ success: true, data: {} } as any)
      const err: any = new Error('duplicate')
      err.code = 11000
      err.keyPattern = { senderName: 1 }
      err.keyValue = { senderName: 'Dup' }
      vi.mocked(OrderSourceCompany.create).mockRejectedValue(err)

      const req = mockReq({ body: {} })
      const res = mockRes()
      await createOrderSourceCompany(req, res)

      expect(res.status).toHaveBeenCalledWith(409)
    })
  })

  // === 更新 / 更新 ===
  describe('updateOrderSourceCompany', () => {
    it('更新成功 / 更新成功', async () => {
      vi.mocked(updateOrderSourceCompanySchema.safeParse).mockReturnValue({ success: true, data: { senderName: 'Updated' } } as any)
      const chain = { lean: vi.fn().mockResolvedValue({ _id: '1', senderName: 'Updated' }) }
      vi.mocked(OrderSourceCompany.findByIdAndUpdate).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: '1' }, body: { senderName: 'Updated' } })
      const res = mockRes()
      await updateOrderSourceCompany(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ senderName: 'Updated' }))
    })
  })

  // === 削除 / 删除 ===
  describe('deleteOrderSourceCompany', () => {
    it('削除成功 / 删除成功', async () => {
      const chain = { lean: vi.fn().mockResolvedValue({ _id: '1' }) }
      vi.mocked(OrderSourceCompany.findByIdAndDelete).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: '1' } })
      const res = mockRes()
      await deleteOrderSourceCompany(req, res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Deleted' }))
    })

    it('存在しない場合 404 / 不存在时返回 404', async () => {
      const chain = { lean: vi.fn().mockResolvedValue(null) }
      vi.mocked(OrderSourceCompany.findByIdAndDelete).mockReturnValue(chain as any)

      const req = mockReq({ params: { id: 'bad' } })
      const res = mockRes()
      await deleteOrderSourceCompany(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
    })
  })

  // === インポートバリデーション / 导入验证 ===
  describe('validateImportOrderSourceCompanies', () => {
    it('rows が空の場合 400 / rows 为空时返回 400', async () => {
      const req = mockReq({ body: { rows: [] } })
      const res = mockRes()
      await validateImportOrderSourceCompanies(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('有効な rows で ok: true を返す / 有效 rows 返回 ok: true', async () => {
      const validRow = { senderName: 'Co1', senderPostalCode: '1234567', senderPhone: '0312345678' }
      const chain = { lean: vi.fn().mockResolvedValue([]) }
      vi.mocked(OrderSourceCompany.find).mockReturnValue(chain as any)

      const req = mockReq({ body: { rows: [validRow] } })
      const res = mockRes()
      await validateImportOrderSourceCompanies(req, res)

      expect(res.json).toHaveBeenCalledWith({ ok: true })
    })
  })

  // === 一括インポート / 批量导入 ===
  describe('importOrderSourceCompaniesBulk', () => {
    it('有効な rows で 201 を返す / 有效 rows 返回 201', async () => {
      const validRow = { senderName: 'Co2', senderPostalCode: '7654321', senderPhone: '0387654321' }
      const chain = { lean: vi.fn().mockResolvedValue([]) }
      vi.mocked(OrderSourceCompany.find).mockReturnValue(chain as any)
      vi.mocked(OrderSourceCompany.insertMany).mockResolvedValue([validRow] as any)

      const req = mockReq({ body: { rows: [validRow] } })
      const res = mockRes()
      await importOrderSourceCompaniesBulk(req, res)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ insertedCount: 1 })
    })
  })
})
