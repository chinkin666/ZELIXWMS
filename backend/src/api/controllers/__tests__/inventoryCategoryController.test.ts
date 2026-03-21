/**
 * inventoryCategoryController 単元テスト / inventoryCategoryController 单元测试
 *
 * 在庫区分 CRUD + シード + デフォルト保護のテスト
 * 库存分类 CRUD + 种子数据 + 默认保护测试
 *
 * モック方針 / Mock strategy:
 * - InventoryCategory モデルをモック（DB不要）
 *   Mock InventoryCategory model to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('@/models/inventoryCategory', () => ({
  InventoryCategory: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}))

// ─── インポート / 导入 ──────────

import { InventoryCategory } from '@/models/inventoryCategory'
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaults,
} from '../inventoryCategoryController'

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

// ─── listCategories テスト / listCategories 测试 ──────────

describe('listCategories / 在庫区分一覧 / 库存分类列表', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('区分一覧を返す / 返回分类列表', async () => {
    const items = [{ code: 'normal', name: '通常' }]
    vi.mocked(InventoryCategory.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(items) }),
    } as any)

    const req = mockReq()
    const res = mockRes()
    await listCategories(req, res)

    expect(res.json).toHaveBeenCalledWith({ data: items, total: 1 })
  })

  // 異常系 / 异常情况
  it('エラー時に 500 を返す / 错误时返回500', async () => {
    vi.mocked(InventoryCategory.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error('DB error')) }),
    } as any)

    const req = mockReq()
    const res = mockRes()
    await listCategories(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── getCategory テスト / getCategory 测试 ──────────

describe('getCategory / 在庫区分取得 / 获取库存分类', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('ID で区分を返す / 根据ID返回分类', async () => {
    const item = { _id: 'c1', code: 'normal', name: '通常' }
    vi.mocked(InventoryCategory.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(item),
    } as any)

    const req = mockReq({ params: { id: 'c1' } })
    const res = mockRes()
    await getCategory(req, res)

    expect(res.json).toHaveBeenCalledWith(item)
  })

  // 異常系: 見つからない → 404 / 异常情况：未找到 → 404
  it('見つからない場合 404 を返す / 未找到时返回404', async () => {
    vi.mocked(InventoryCategory.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    await getCategory(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── createCategory テスト / createCategory 测试 ──────────

describe('createCategory / 在庫区分作成 / 创建库存分类', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 作成成功 → 201 / 正常情况：创建成功 → 201
  it('新しい区分を作成して 201 を返す / 创建新分类返回201', async () => {
    vi.mocked(InventoryCategory.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const created = {
      _id: 'c1', code: 'custom', name: 'カスタム',
      toObject: vi.fn().mockReturnValue({ _id: 'c1', code: 'custom', name: 'カスタム' }),
    }
    vi.mocked(InventoryCategory.create).mockResolvedValue(created as any)

    const req = mockReq({ body: { code: 'custom', name: 'カスタム' } })
    const res = mockRes()
    await createCategory(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
  })

  // 異常系: code/name 未指定 → 400 / 异常情况：缺少code/name → 400
  it('code/name がない場合 400 を返す / 缺少code/name时返回400', async () => {
    const req = mockReq({ body: {} })
    const res = mockRes()
    await createCategory(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  // 異常系: 重複コード → 409 / 异常情况：重复code → 409
  it('重複コードで 409 を返す / 重复code返回409', async () => {
    vi.mocked(InventoryCategory.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'existing', code: 'dup' }),
    } as any)

    const req = mockReq({ body: { code: 'dup', name: '重複' } })
    const res = mockRes()
    await createCategory(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ duplicateField: 'code' }),
    )
  })

  // 異常系: MongoDB 11000 重複キーエラー → 409 / 异常情况：MongoDB 11000重复键错误 → 409
  it('MongoDB 重複キーエラーで 409 を返す / MongoDB重复键错误返回409', async () => {
    vi.mocked(InventoryCategory.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const dupError: any = new Error('E11000 duplicate key error')
    dupError.code = 11000
    dupError.keyPattern = { code: 1 }
    dupError.keyValue = { code: 'dup' }
    vi.mocked(InventoryCategory.create).mockRejectedValue(dupError)

    const req = mockReq({ body: { code: 'dup', name: '重複' } })
    const res = mockRes()
    await createCategory(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })
})

// ─── updateCategory テスト / updateCategory 测试 ──────────

describe('updateCategory / 在庫区分更新 / 更新库存分类', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系 / 正常情况
  it('区分を更新して返す / 更新分类并返回', async () => {
    vi.mocked(InventoryCategory.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'c1', code: 'custom', isDefault: false }),
    } as any)
    const updated = { _id: 'c1', code: 'custom', name: '更新済み' }
    vi.mocked(InventoryCategory.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updated),
    } as any)

    const req = mockReq({ params: { id: 'c1' }, body: { name: '更新済み' } })
    const res = mockRes()
    await updateCategory(req, res)

    expect(res.json).toHaveBeenCalledWith(updated)
  })

  // 異常系: デフォルト区分のコード変更 → 403 / 异常情况：修改默认分类的代码 → 403
  it('デフォルト区分のコード変更を 403 で拒否する / 拒绝修改默认分类的代码返回403', async () => {
    vi.mocked(InventoryCategory.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'c1', code: 'normal', isDefault: true }),
    } as any)

    const req = mockReq({ params: { id: 'c1' }, body: { code: 'new_code' } })
    const res = mockRes()
    await updateCategory(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  // 異常系: 見つからない → 404 / 异常情况：未找到 → 404
  it('見つからない場合 404 を返す / 未找到时返回404', async () => {
    vi.mocked(InventoryCategory.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()
    await updateCategory(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── deleteCategory テスト / deleteCategory 测试 ──────────

describe('deleteCategory / 在庫区分削除 / 删除库存分类', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: カスタム区分削除 / 正常情况：删除自定义分类
  it('カスタム区分を削除する / 删除自定义分类', async () => {
    vi.mocked(InventoryCategory.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'c1', code: 'custom', isDefault: false }),
    } as any)
    vi.mocked(InventoryCategory.findByIdAndDelete).mockResolvedValue({} as any)

    const req = mockReq({ params: { id: 'c1' } })
    const res = mockRes()
    await deleteCategory(req, res)

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Deleted' }))
  })

  // 異常系: デフォルト区分削除 → 403 / 异常情况：删除默认分类 → 403
  it('デフォルト区分の削除を 403 で拒否する / 拒绝删除默认分类返回403', async () => {
    vi.mocked(InventoryCategory.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'c1', code: 'normal', isDefault: true }),
    } as any)

    const req = mockReq({ params: { id: 'c1' } })
    const res = mockRes()
    await deleteCategory(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  // 異常系: 見つからない → 404 / 异常情况：未找到 → 404
  it('見つからない場合 404 を返す / 未找到时返回404', async () => {
    vi.mocked(InventoryCategory.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()
    await deleteCategory(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })
})

// ─── seedDefaults テスト / seedDefaults 测试 ──────────

describe('seedDefaults / デフォルトシード / 种子默认数据', () => {
  beforeEach(() => { vi.clearAllMocks() })

  // 正常系: 新規作成 / 正常情况：新建
  it('デフォルト区分をシードする / 播种默认分类', async () => {
    vi.mocked(InventoryCategory.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(InventoryCategory.create).mockResolvedValue({} as any)

    const req = mockReq()
    const res = mockRes()
    await seedDefaults(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        results: expect.arrayContaining([
          expect.objectContaining({ status: 'created' }),
        ]),
      }),
    )
  })

  // 正常系: 既存スキップ / 正常情况：跳过已存在
  it('既存の区分をスキップする / 跳过已存在的分类', async () => {
    vi.mocked(InventoryCategory.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'existing' }),
    } as any)

    const req = mockReq()
    const res = mockRes()
    await seedDefaults(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        results: expect.arrayContaining([
          expect.objectContaining({ status: 'already_exists' }),
        ]),
      }),
    )
    expect(InventoryCategory.create).not.toHaveBeenCalled()
  })

  // 異常系: エラー → 500 / 异常情况：错误 → 500
  it('エラー時に 500 を返す / 错误时返回500', async () => {
    vi.mocked(InventoryCategory.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('Seed error')),
    } as any)

    const req = mockReq()
    const res = mockRes()
    await seedDefaults(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
