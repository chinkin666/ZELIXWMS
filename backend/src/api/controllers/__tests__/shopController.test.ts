/**
 * shopController 統合テスト / Shop Controller Integration Tests
 * 店舗コントローラの統合テスト / 店铺控制器集成测试
 *
 * 店舗 CRUD の HTTP フローを検証する。
 * 验证店铺 CRUD 的 HTTP 流程。
 *
 * モック方針 / Mock strategy:
 * - Shop, Client モデルをモック（DB不要）
 *   Mock Shop, Client models to eliminate DB dependency
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块Mock声明（提升） ──────────

vi.mock('@/models/shop', () => ({
  Shop: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/client', () => ({
  Client: {
    findById: vi.fn(),
  },
}))

import { Shop } from '@/models/shop'
import { Client } from '@/models/client'
import {
  listShops,
  getShop,
  createShop,
  updateShop,
  deleteShop,
} from '../shopController'

// ─── テストユーティリティ / 测试工具 ────────────────────────

/** モックリクエスト生成 / Mock请求工厂 */
const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: { 'x-tenant-id': 'T1' },
    ...overrides,
  }) as any

/** モックレスポンス生成 / Mock响应工厂 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── listShops / 店舗一覧 / 店铺列表 ──────────

describe('listShops', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ページネーション付きで一覧を返す / 返回分页列表', async () => {
    const fakeData = [{ _id: 'sh1', shopCode: 'SHOP-001', shopName: 'テスト店舗' }]
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(fakeData),
    }
    vi.mocked(Shop.find).mockReturnValue(chainMock as any)
    vi.mocked(Shop.countDocuments).mockResolvedValue(1)

    const req = mockReq({ query: { page: '1', limit: '50' } })
    const res = mockRes()

    await listShops(req, res)

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
    vi.mocked(Shop.find).mockReturnValue(chainMock as any)
    vi.mocked(Shop.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { search: 'テスト' } })
    const res = mockRes()

    await listShops(req, res)

    expect(Shop.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: expect.any(Array) }),
    )
  })

  it('テナント ID がフィルタに含まれる / 筛选包含租户ID', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(Shop.find).mockReturnValue(chainMock as any)
    vi.mocked(Shop.countDocuments).mockResolvedValue(0)

    const req = mockReq()
    const res = mockRes()

    await listShops(req, res)

    expect(Shop.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'T1' }),
    )
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    const chainMock = {
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockRejectedValue(new Error('DB down')),
    }
    vi.mocked(Shop.find).mockReturnValue(chainMock as any)
    vi.mocked(Shop.countDocuments).mockResolvedValue(0)

    const req = mockReq()
    const res = mockRes()

    await listShops(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── getShop / 店舗詳細 / 店铺详情 ──────────

describe('getShop', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存店舗を ID で取得する / 根据ID获取店铺', async () => {
    const fakeShop = { _id: 'sh1', shopCode: 'SHOP-001', shopName: 'テスト店舗' }
    vi.mocked(Shop.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeShop),
    } as any)

    const req = mockReq({ params: { id: 'sh1' } })
    const res = mockRes()

    await getShop(req, res)

    expect(Shop.findById).toHaveBeenCalledWith('sh1')
    expect(res.json).toHaveBeenCalledWith(fakeShop)
  })

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Shop.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    await getShop(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: '店舗が見つかりません / 店铺不存在' })
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Shop.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { id: 'sh1' } })
    const res = mockRes()

    await getShop(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createShop / 店舗作成 / 创建店铺 ──────────

describe('createShop', () => {
  beforeEach(() => vi.clearAllMocks())

  it('正常に作成し 201 を返す / 正常创建返回201', async () => {
    vi.mocked(Client.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'c1', name: 'テスト顧客' }),
    } as any)
    vi.mocked(Shop.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const fakeCreated = {
      _id: 'sh-new',
      shopCode: 'SHOP-NEW',
      shopName: '新店舗',
      toObject: () => ({ _id: 'sh-new', shopCode: 'SHOP-NEW', shopName: '新店舗' }),
    }
    vi.mocked(Shop.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({
      body: { clientId: 'c1', shopCode: 'SHOP-NEW', shopName: '新店舗', platform: 'rakuten' },
    })
    const res = mockRes()

    await createShop(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ shopCode: 'SHOP-NEW' }),
    )
  })

  it('clientId 不足で 400 を返す / 缺少clientId返回400', async () => {
    const req = mockReq({
      body: { shopCode: 'SHOP-001', shopName: 'テスト', platform: 'rakuten' },
    })
    const res = mockRes()

    await createShop(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('shopCode 不足で 400 を返す / 缺少shopCode返回400', async () => {
    const req = mockReq({
      body: { clientId: 'c1', shopName: 'テスト', platform: 'rakuten' },
    })
    const res = mockRes()

    await createShop(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('shopName 不足で 400 を返す / 缺少shopName返回400', async () => {
    const req = mockReq({
      body: { clientId: 'c1', shopCode: 'SHOP-001', platform: 'rakuten' },
    })
    const res = mockRes()

    await createShop(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('platform 不足で 400 を返す / 缺少platform返回400', async () => {
    const req = mockReq({
      body: { clientId: 'c1', shopCode: 'SHOP-001', shopName: 'テスト' },
    })
    const res = mockRes()

    await createShop(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('顧客が存在しない場合 404 を返す / 客户不存在返回404', async () => {
    vi.mocked(Client.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({
      body: { clientId: 'nonexistent', shopCode: 'SHOP-001', shopName: 'テスト', platform: 'rakuten' },
    })
    const res = mockRes()

    await createShop(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('コード重複時に 409 を返す / 编号重复返回409', async () => {
    vi.mocked(Client.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'c1', name: 'テスト' }),
    } as any)
    vi.mocked(Shop.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'existing', shopCode: 'SHOP-DUP' }),
    } as any)

    const req = mockReq({
      body: { clientId: 'c1', shopCode: 'SHOP-DUP', shopName: '重複店舗', platform: 'rakuten' },
    })
    const res = mockRes()

    await createShop(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('DB 11000 エラー時に 409 を返す / DB 11000错误返回409', async () => {
    vi.mocked(Client.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'c1', name: 'テスト' }),
    } as any)
    vi.mocked(Shop.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    const dbError = Object.assign(new Error('duplicate'), { code: 11000 })
    vi.mocked(Shop.create).mockRejectedValue(dbError)

    const req = mockReq({
      body: { clientId: 'c1', shopCode: 'SHOP-DUP', shopName: 'テスト', platform: 'rakuten' },
    })
    const res = mockRes()

    await createShop(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Client.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'c1', name: 'テスト' }),
    } as any)
    vi.mocked(Shop.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(Shop.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({
      body: { clientId: 'c1', shopCode: 'SHOP-ERR', shopName: 'エラー店舗', platform: 'rakuten' },
    })
    const res = mockRes()

    await createShop(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── updateShop / 店舗更新 / 更新店铺 ──────────

describe('updateShop', () => {
  beforeEach(() => vi.clearAllMocks())

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Shop.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { shopName: '更新' } })
    const res = mockRes()

    await updateShop(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('正常に更新する / 正常更新', async () => {
    const fakeExisting = { _id: 'sh1', shopCode: 'SHOP-001', shopName: '旧店舗' }
    vi.mocked(Shop.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeExisting),
    } as any)
    const fakeUpdated = { _id: 'sh1', shopCode: 'SHOP-001', shopName: '更新店舗' }
    vi.mocked(Shop.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'sh1' }, body: { shopName: '更新店舗' } })
    const res = mockRes()

    await updateShop(req, res)

    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('コード変更時の重複で 409 を返す / 编号变更重复返回409', async () => {
    const fakeExisting = { _id: 'sh1', shopCode: 'SHOP-001' }
    vi.mocked(Shop.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeExisting),
    } as any)
    vi.mocked(Shop.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'sh2', shopCode: 'SHOP-DUP' }),
    } as any)

    const req = mockReq({ params: { id: 'sh1' }, body: { shopCode: 'SHOP-DUP' } })
    const res = mockRes()

    await updateShop(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Shop.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    const req = mockReq({ params: { id: 'sh1' }, body: {} })
    const res = mockRes()

    await updateShop(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── deleteShop / 店舗削除 / 删除店铺 ──────────

describe('deleteShop', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ソフトデリートし確認を返す / 软删除并返回确认', async () => {
    const fakeUpdated = { _id: 'sh1', isActive: false }
    vi.mocked(Shop.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'sh1' } })
    const res = mockRes()

    await deleteShop(req, res)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Deleted' }),
    )
  })

  it('存在しない場合 404 を返す / 不存在时返回404', async () => {
    vi.mocked(Shop.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    await deleteShop(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('DB エラー時に 500 を返す / DB错误时返回500', async () => {
    vi.mocked(Shop.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete error')),
    } as any)

    const req = mockReq({ params: { id: 'sh1' } })
    const res = mockRes()

    await deleteShop(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
  })
})
