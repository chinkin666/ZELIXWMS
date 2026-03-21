/**
 * supplierController 統合テスト / Supplier Controller Integration Tests
 * 仕入先コントローラの統合テスト / 供应商控制器集成测试
 *
 * 仕入先 CRUD の HTTP フローを検証する。
 * 验证供应商 CRUD 的 HTTP 流程。
 *
 * モック方針 / Mock strategy:
 * - Supplier モデルをモック（DB不要）
 *   Mock Supplier model to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('@/models/supplier', () => ({
  Supplier: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

import { Supplier } from '@/models/supplier'
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  bulkImportSuppliers,
  exportSuppliers,
} from '../supplierController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

/** モックリクエスト生成 / Mock请求工厂 */
const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    ...overrides,
  }) as any

/** モックレスポンス生成 / Mock响应工厂 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── listSuppliers / 仕入先一覧 / 供应商列表 ──────────

describe('listSuppliers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ページネーション付きで一覧を返す / 返回分页列表', async () => {
    const fakeData = [{ _id: 'sup1', supplierCode: 'SUP-001', name: 'テスト仕入先' }]
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeData),
    }
    vi.mocked(Supplier.find).mockReturnValue(chainMock as any)
    vi.mocked(Supplier.countDocuments).mockResolvedValue(1)

    const req = mockReq({ query: { page: '1', limit: '20' } })
    const res = mockRes()

    await listSuppliers(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: fakeData, total: 1 }),
    )
  })

  it('検索フィルタが適用される / 应用搜索筛选', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(Supplier.find).mockReturnValue(chainMock as any)
    vi.mocked(Supplier.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { search: 'テスト' } })
    const res = mockRes()

    await listSuppliers(req, res)

    expect(Supplier.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
    )
  })

  it('isActive フィルタが適用される / 应用isActive筛选', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(Supplier.find).mockReturnValue(chainMock as any)
    vi.mocked(Supplier.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { isActive: 'true' } })
    const res = mockRes()

    await listSuppliers(req, res)

    expect(Supplier.find).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error('DB down')),
    }
    vi.mocked(Supplier.find).mockReturnValue(chainMock as any)
    vi.mocked(Supplier.countDocuments).mockResolvedValue(0)

    const req = mockReq()
    const res = mockRes()

    await listSuppliers(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '仕入先の取得に失敗しました' }),
    )
  })
})

// ─── getSupplier / 仕入先詳細 / 供应商详情 ──────────

describe('getSupplier', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存仕入先を ID で取得する / 根据ID获取供应商', async () => {
    const fakeSupplier = { _id: 'sup1', supplierCode: 'SUP-001', name: 'テスト仕入先' }
    vi.mocked(Supplier.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeSupplier),
    } as any)

    const req = mockReq({ params: { id: 'sup1' } })
    const res = mockRes()

    await getSupplier(req, res)

    expect(Supplier.findById).toHaveBeenCalledWith('sup1')
    expect(res.json).toHaveBeenCalledWith(fakeSupplier)
  })

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Supplier.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await getSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '仕入先が見つかりません' })
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Supplier.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { id: 'sup1' } })
    const res = mockRes()

    await getSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createSupplier / 仕入先作成 / 创建供应商 ──────────

describe('createSupplier', () => {
  beforeEach(() => vi.clearAllMocks())

  it('正常に作成し 201 を返す / 正常创建返回201', async () => {
    vi.mocked(Supplier.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const fakeCreated = {
      _id: 'sup-new',
      supplierCode: 'SUP-NEW',
      name: '新仕入先',
      toObject: () => ({ _id: 'sup-new', supplierCode: 'SUP-NEW', name: '新仕入先' }),
    }
    vi.mocked(Supplier.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: { supplierCode: 'SUP-NEW', name: '新仕入先' } })
    const res = mockRes()

    await createSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ supplierCode: 'SUP-NEW' }),
    )
  })

  it('仕入先コード不足で 400 を返す / 缺少供应商编号返回400', async () => {
    const req = mockReq({ body: { name: 'テスト' } }) // supplierCode 欠落 / 缺少supplierCode
    const res = mockRes()

    await createSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '仕入先コードは必須です' }),
    )
  })

  it('仕入先名不足で 400 を返す / 缺少供应商名称返回400', async () => {
    const req = mockReq({ body: { supplierCode: 'SUP-001' } }) // name 欠落 / 缺少name
    const res = mockRes()

    await createSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '仕入先名は必須です' }),
    )
  })

  it('重複時に 409 を返す / 重复时返回409', async () => {
    vi.mocked(Supplier.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'existing', supplierCode: 'SUP-DUP' }),
    } as any)

    const req = mockReq({ body: { supplierCode: 'SUP-DUP', name: '重複仕入先' } })
    const res = mockRes()

    await createSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('DB 11000 エラー時に 409 を返す / DB 11000错误时返回409', async () => {
    vi.mocked(Supplier.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const dbError = Object.assign(new Error('duplicate'), {
      code: 11000,
      keyPattern: { supplierCode: 1 },
      keyValue: { supplierCode: 'SUP-DUP' },
    })
    vi.mocked(Supplier.create).mockRejectedValue(dbError)

    const req = mockReq({ body: { supplierCode: 'SUP-DUP', name: 'テスト' } })
    const res = mockRes()

    await createSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Supplier.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(Supplier.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: { supplierCode: 'SUP-ERR', name: 'エラー仕入先' } })
    const res = mockRes()

    await createSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── updateSupplier / 仕入先更新 / 更新供应商 ──────────

describe('updateSupplier', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Supplier.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { name: '更新' } })
    const res = mockRes()

    await updateSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('正常に更新する / 正常更新', async () => {
    const fakeUpdated = { _id: 'sup1', supplierCode: 'SUP-001', name: '更新仕入先' }
    vi.mocked(Supplier.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'sup1' }, body: { name: '更新仕入先' } })
    const res = mockRes()

    await updateSupplier(req, res)

    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Supplier.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('update error')),
    } as any)

    const req = mockReq({ params: { id: 'sup1' }, body: { name: 'テスト' } })
    const res = mockRes()

    await updateSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── deleteSupplier / 仕入先削除 / 删除供应商 ──────────

describe('deleteSupplier', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ソフトデリートし確認を返す / 软删除并返回确认', async () => {
    const fakeUpdated = { _id: 'sup1', isActive: false }
    vi.mocked(Supplier.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'sup1' } })
    const res = mockRes()

    await deleteSupplier(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '仕入先を無効にしました' }),
    )
  })

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Supplier.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    await deleteSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Supplier.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete error')),
    } as any)

    const req = mockReq({ params: { id: 'sup1' } })
    const res = mockRes()

    await deleteSupplier(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── bulkImportSuppliers / 一括取込 / 批量导入 ──────────

describe('bulkImportSuppliers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('空配列で 400 を返す / 空数组返回400', async () => {
    const req = mockReq({ body: { suppliers: [] } })
    const res = mockRes()

    await bulkImportSuppliers(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('正常にインポートする / 正常导入', async () => {
    vi.mocked(Supplier.findOneAndUpdate).mockResolvedValue({} as any)

    const req = mockReq({
      body: {
        suppliers: [
          { supplierCode: 'SUP-001', name: '仕入先1' },
          { supplierCode: 'SUP-002', name: '仕入先2' },
        ],
      },
    })
    const res = mockRes()

    await bulkImportSuppliers(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ successCount: 2, failCount: 0 }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    const req = mockReq({ body: null })
    const res = mockRes()

    // body.suppliers にアクセスするとエラー / 访问 body.suppliers 时报错
    await bulkImportSuppliers(
      { ...req, body: undefined } as any,
      res,
    )

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── exportSuppliers / エクスポート / 导出 ──────────

describe('exportSuppliers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('アクティブな仕入先を返す / 返回活跃供应商', async () => {
    const fakeData = [{ _id: 'sup1', supplierCode: 'SUP-001', name: 'テスト' }]
    vi.mocked(Supplier.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(fakeData),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    await exportSuppliers(req, res)

    expect(Supplier.find).toHaveBeenCalledWith({ isActive: true })
    expect(res.json).toHaveBeenCalledWith(fakeData)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Supplier.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('export error')),
      }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    await exportSuppliers(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
