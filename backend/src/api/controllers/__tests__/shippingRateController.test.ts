/**
 * shippingRateController 统合テスト / ShippingRate Controller Integration Tests
 *
 * ShippingRate モデル層を通じた運賃テーブル操作の HTTP フローを検証する。
 * Verifies HTTP flow for shipping rate CRUD and calculation operations through the model layer.
 *
 * モック方針 / Mock strategy:
 * - ShippingRate モデルをすべてモック（DB不要）
 *   Mock ShippingRate model to eliminate DB dependency
 * - getTenantId ヘルパーもモック
 *   Mock getTenantId helper for deterministic tenant resolution
 * - logger はサイドエフェクトのためモック
 *   Mock logger (side-effect only, not under test)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/shippingRate', () => ({
  ShippingRate: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/api/helpers/tenantHelper', () => ({
  getTenantId: vi.fn(() => 'TENANT-1'),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import { ShippingRate } from '@/models/shippingRate'
import { getTenantId } from '@/api/helpers/tenantHelper'
import {
  listShippingRates,
  getShippingRate,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  calculateShippingCost,
} from '@/api/controllers/shippingRateController'

// ─── テストユーティリティ / Test utilities ────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 * 最小限の Request オブジェクト / Minimal Request object
 */
const mockReq = (overrides = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'TENANT-1' },
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * json() と status() をスパイとして持つオブジェクト
 * Object with json() and status() as spies
 */
const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  // status().json() チェーンを可能にする / Enable status().json() chaining
  res.status.mockReturnValue(res)
  return res
}

// ─── listShippingRates ─────────────────────────────────────────

describe('listShippingRates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('フィルタなしで全運賃テーブルを返す / returns all rates without filters', async () => {
    // Arrange
    const fakeRates = [{ name: 'ヤマト通常', carrierId: 'yamato', basePrice: 600 }]
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(fakeRates),
          }),
        }),
      }),
    } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(1)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert: tenantId フィルタで呼ばれる / called with tenantId filter
    expect(ShippingRate.find).toHaveBeenCalledWith({ tenantId: 'TENANT-1' })
    expect(res.json).toHaveBeenCalledWith({ data: fakeRates, total: 1 })
  })

  it('carrierId クエリでフィルタを適用する / applies carrierId filter', async () => {
    // Arrange
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { carrierId: 'yamato' } })
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert: carrierId が filter に含まれる / carrierId included in filter
    expect(ShippingRate.find).toHaveBeenCalledWith(
      expect.objectContaining({ carrierId: 'yamato' }),
    )
  })

  it('空の carrierId は無視される / empty carrierId is ignored', async () => {
    // Arrange
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { carrierId: '   ' } })
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert: carrierId がフィルタに含まれない / carrierId not in filter
    const filterArg = vi.mocked(ShippingRate.find).mock.calls[0][0] as Record<string, unknown>
    expect(filterArg).not.toHaveProperty('carrierId')
  })

  it('isActive=true クエリで boolean フィルタを適用する / applies isActive=true filter', async () => {
    // Arrange
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { isActive: 'true' } })
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert
    expect(ShippingRate.find).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    )
  })

  it('isActive=false クエリで boolean フィルタを適用する / applies isActive=false filter', async () => {
    // Arrange
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { isActive: 'false' } })
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert
    expect(ShippingRate.find).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    )
  })

  it('search クエリで $or 正規表現フィルタを構築する / builds $or regex filter from search query', async () => {
    // Arrange
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { search: 'ヤマト' } })
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert: $or が3フィールドに渡る / $or applied to 3 fields
    const filterArg = vi.mocked(ShippingRate.find).mock.calls[0][0] as Record<string, unknown>
    expect(filterArg).toHaveProperty('$or')
    const $or = filterArg.$or as any[]
    expect($or).toHaveLength(3)
    expect($or[0]).toMatchObject({ name: { $regex: 'ヤマト', $options: 'i' } })
    expect($or[1]).toMatchObject({ carrierName: { $regex: 'ヤマト', $options: 'i' } })
    expect($or[2]).toMatchObject({ memo: { $regex: 'ヤマト', $options: 'i' } })
  })

  it('search に正規表現特殊文字が含まれる場合エスケープする / escapes regex special chars in search', async () => {
    // Arrange
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { search: 'rate+fee' } })
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert: + がエスケープされる / + is escaped
    const filterArg = vi.mocked(ShippingRate.find).mock.calls[0][0] as Record<string, unknown>
    const $or = (filterArg.$or as any[])[0]
    expect($or.name.$regex).toBe('rate\\+fee')
  })

  it('page と limit でページネーションを制御する / paginates with page and limit params', async () => {
    // Arrange
    const mockSort = vi.fn()
    const mockSkip = vi.fn()
    const mockLimit = vi.fn()
    const mockLean = vi.fn().mockResolvedValue([])
    mockLimit.mockReturnValue({ lean: mockLean })
    mockSkip.mockReturnValue({ limit: mockLimit })
    mockSort.mockReturnValue({ skip: mockSkip })
    vi.mocked(ShippingRate.find).mockReturnValue({ sort: mockSort } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { page: '3', limit: '10' } })
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert: skip = (3-1)*10 = 20, limit = 10
    expect(mockSkip).toHaveBeenCalledWith(20)
    expect(mockLimit).toHaveBeenCalledWith(10)
  })

  it('limit は 100 を超えない / limit is capped at 100', async () => {
    // Arrange
    const mockSort = vi.fn()
    const mockSkip = vi.fn()
    const mockLimit = vi.fn()
    mockLimit.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
    mockSkip.mockReturnValue({ limit: mockLimit })
    mockSort.mockReturnValue({ skip: mockSkip })
    vi.mocked(ShippingRate.find).mockReturnValue({ sort: mockSort } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { limit: '999' } })
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert
    expect(mockLimit).toHaveBeenCalledWith(100)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockRejectedValue(new Error('DB connection lost')),
          }),
        }),
      }),
    } as any)
    vi.mocked(ShippingRate.countDocuments).mockResolvedValue(0)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listShippingRates(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '运费率表の取得に失敗しました' }),
    )
  })
})

// ─── getShippingRate ───────────────────────────────────────────

describe('getShippingRate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存レートを ID で取得する / retrieves existing rate by ID', async () => {
    // Arrange
    const fakeRate = { _id: 'r1', name: 'ヤマト通常', basePrice: 600 }
    vi.mocked(ShippingRate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeRate),
    } as any)

    const req = mockReq({ params: { id: 'r1' } })
    const res = mockRes()

    // Act
    await getShippingRate(req, res)

    // Assert
    expect(ShippingRate.findById).toHaveBeenCalledWith('r1')
    expect(res.json).toHaveBeenCalledWith(fakeRate)
  })

  it('存在しない ID の場合 404 を返す / returns 404 when rate not found', async () => {
    // Arrange
    vi.mocked(ShippingRate.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '运费率表が見つかりません / 未找到运费率表' }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(ShippingRate.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('findById failed')),
    } as any)

    const req = mockReq({ params: { id: 'r1' } })
    const res = mockRes()

    // Act
    await getShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '运费率表の取得に失敗しました' }),
    )
  })
})

// ─── createShippingRate ────────────────────────────────────────

describe('createShippingRate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('有効なデータで運賃テーブルを作成し 201 を返す / creates rate and returns 201 with valid data', async () => {
    // Arrange
    const body = {
      carrierId: 'yamato',
      carrierName: 'ヤマト運輸',
      name: '通常プラン',
      basePrice: 600,
      isActive: true,
    }
    const fakeCreated = { ...body, _id: 'r-new', tenantId: 'TENANT-1', toObject: () => ({ ...body, _id: 'r-new' }) }
    vi.mocked(ShippingRate.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ carrierId: 'yamato' }))
  })

  it('carrierId が空の場合 400 を返す / returns 400 when carrierId is missing', async () => {
    // Arrange
    const req = mockReq({ body: { carrierId: '', name: 'プラン', basePrice: 500 } })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '配送業者IDは必須です / 配送业者ID为必填项' }),
    )
  })

  it('carrierId が未定義の場合 400 を返す / returns 400 when carrierId is undefined', async () => {
    // Arrange
    const req = mockReq({ body: { name: 'プラン', basePrice: 500 } })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('carrierId が空白のみの場合 400 を返す / returns 400 when carrierId is whitespace only', async () => {
    // Arrange
    const req = mockReq({ body: { carrierId: '   ', name: 'プラン', basePrice: 500 } })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('name が空の場合 400 を返す / returns 400 when name is empty', async () => {
    // Arrange
    const req = mockReq({ body: { carrierId: 'yamato', name: '', basePrice: 500 } })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'プラン名は必須です / 方案名为必填项' }),
    )
  })

  it('basePrice が未定義の場合 400 を返す / returns 400 when basePrice is undefined', async () => {
    // Arrange
    const req = mockReq({ body: { carrierId: 'yamato', name: 'プラン' } })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '基本料金は0以上の数値で入力してください / 基本费用须为0以上的数值' }),
    )
  })

  it('basePrice が負の値の場合 400 を返す / returns 400 when basePrice is negative', async () => {
    // Arrange
    const req = mockReq({ body: { carrierId: 'yamato', name: 'プラン', basePrice: -1 } })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('basePrice が文字列の場合 400 を返す / returns 400 when basePrice is a string', async () => {
    // Arrange
    const req = mockReq({ body: { carrierId: 'yamato', name: 'プラン', basePrice: 'abc' } })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('sizeType がデフォルト flat で保存される / defaults sizeType to flat when not provided', async () => {
    // Arrange
    const body = { carrierId: 'yamato', name: 'フラットプラン', basePrice: 700 }
    const fakeCreated = { ...body, sizeType: 'flat', _id: 'r1', toObject: () => ({ ...body, sizeType: 'flat' }) }
    vi.mocked(ShippingRate.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert: create に sizeType:'flat' が渡る / create called with sizeType 'flat'
    expect(ShippingRate.create).toHaveBeenCalledWith(
      expect.objectContaining({ sizeType: 'flat' }),
    )
  })

  it('isActive が未指定の場合は true がデフォルト / isActive defaults to true when not provided', async () => {
    // Arrange
    const body = { carrierId: 'yamato', name: 'プラン', basePrice: 600 }
    const fakeCreated = { ...body, isActive: true, _id: 'r1', toObject: () => ({ ...body, isActive: true }) }
    vi.mocked(ShippingRate.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(ShippingRate.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    )
  })

  it('isActive=false が明示された場合は false で保存される / saves isActive=false when explicitly set', async () => {
    // Arrange
    const body = { carrierId: 'yamato', name: 'プラン', basePrice: 600, isActive: false }
    const fakeCreated = { ...body, _id: 'r1', toObject: () => ({ ...body }) }
    vi.mocked(ShippingRate.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(ShippingRate.create).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false }),
    )
  })

  it('fromPrefectures が配列でない場合 undefined で保存される / saves fromPrefectures as undefined when not array', async () => {
    // Arrange
    const body = { carrierId: 'yamato', name: 'プラン', basePrice: 600, fromPrefectures: 'Tokyo' }
    const fakeCreated = { ...body, _id: 'r1', toObject: () => ({ ...body }) }
    vi.mocked(ShippingRate.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert: 配列でなければ undefined / not array → undefined
    expect(ShippingRate.create).toHaveBeenCalledWith(
      expect.objectContaining({ fromPrefectures: undefined }),
    )
  })

  it('tenantId がリクエストから取得されて保存される / tenantId is taken from request', async () => {
    // Arrange
    vi.mocked(getTenantId).mockReturnValue('TENANT-X')
    const body = { carrierId: 'yamato', name: 'プラン', basePrice: 600 }
    const fakeCreated = { ...body, _id: 'r1', toObject: () => ({ ...body }) }
    vi.mocked(ShippingRate.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(ShippingRate.create).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'TENANT-X' }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(ShippingRate.create).mockRejectedValue(new Error('create failed'))

    const req = mockReq({ body: { carrierId: 'yamato', name: 'プラン', basePrice: 600 } })
    const res = mockRes()

    // Act
    await createShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '运费率表の作成に失敗しました' }),
    )
  })
})

// ─── updateShippingRate ────────────────────────────────────────

describe('updateShippingRate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存レートを正常に更新する / updates existing rate successfully', async () => {
    // Arrange
    const updatedRate = { _id: 'r1', name: '新プラン名', basePrice: 700 }
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRate),
    } as any)

    const req = mockReq({ params: { id: 'r1' }, body: { name: '新プラン名', basePrice: 700 } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert
    expect(ShippingRate.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({ name: '新プラン名', basePrice: 700 }),
      { new: true, runValidators: true },
    )
    expect(res.json).toHaveBeenCalledWith(updatedRate)
  })

  it('carrierId が空文字の場合 400 を返す / returns 400 when carrierId is empty string', async () => {
    // Arrange
    const req = mockReq({ params: { id: 'r1' }, body: { carrierId: '' } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '配送業者IDは必須です / 配送业者ID为必填项' }),
    )
  })

  it('carrierId が空白のみの場合 400 を返す / returns 400 when carrierId is whitespace only', async () => {
    // Arrange
    const req = mockReq({ params: { id: 'r1' }, body: { carrierId: '   ' } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('name が空文字の場合 400 を返す / returns 400 when name is empty string', async () => {
    // Arrange
    const req = mockReq({ params: { id: 'r1' }, body: { name: '' } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'プラン名は必須です / 方案名为必填项' }),
    )
  })

  it('存在しないレートの場合 404 を返す / returns 404 when rate not found', async () => {
    // Arrange
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { name: 'プラン' } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '运费率表が見つかりません / 未找到运费率表' }),
    )
  })

  it('undefined フィールドは updateData に含まれない / undefined fields are not included in updateData', async () => {
    // Arrange
    const updatedRate = { _id: 'r1', basePrice: 700 }
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRate),
    } as any)

    // name のみ送信、carrierId は省略 / send only name, omit carrierId
    const req = mockReq({ params: { id: 'r1' }, body: { basePrice: 700 } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert: name がフィールドに含まれない / name not in updateData
    const updateArg = vi.mocked(ShippingRate.findByIdAndUpdate).mock.calls[0][1] as Record<string, unknown>
    expect(updateArg).not.toHaveProperty('carrierId')
    expect(updateArg).not.toHaveProperty('name')
    expect(updateArg).toHaveProperty('basePrice', 700)
  })

  it('sizeMin=null の場合 undefined に変換される / converts sizeMin=null to undefined', async () => {
    // Arrange
    const updatedRate = { _id: 'r1' }
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRate),
    } as any)

    const req = mockReq({ params: { id: 'r1' }, body: { sizeMin: null } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert
    const updateArg = vi.mocked(ShippingRate.findByIdAndUpdate).mock.calls[0][1] as Record<string, unknown>
    expect(updateArg.sizeMin).toBeUndefined()
  })

  it('isActive は Boolean に変換される / isActive is cast to Boolean', async () => {
    // Arrange
    const updatedRate = { _id: 'r1', isActive: false }
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRate),
    } as any)

    const req = mockReq({ params: { id: 'r1' }, body: { isActive: 0 } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert
    const updateArg = vi.mocked(ShippingRate.findByIdAndUpdate).mock.calls[0][1] as Record<string, unknown>
    expect(updateArg.isActive).toBe(false)
  })

  it('有効な carrierId で updateData に carrierId がセットされる / sets carrierId in updateData when valid carrierId provided', async () => {
    // Arrange: 有効な carrierId を送信 / send valid carrierId
    const updatedRate = { _id: 'r1', carrierId: 'sagawa' }
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedRate),
    } as any)

    const req = mockReq({ params: { id: 'r1' }, body: { carrierId: '  sagawa  ' } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert: trim されて updateData に含まれる / trimmed and included in updateData
    const updateArg = vi.mocked(ShippingRate.findByIdAndUpdate).mock.calls[0][1] as Record<string, unknown>
    expect(updateArg.carrierId).toBe('sagawa')
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('update failed')),
    } as any)

    const req = mockReq({ params: { id: 'r1' }, body: { basePrice: 800 } })
    const res = mockRes()

    // Act
    await updateShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '运费率表の更新に失敗しました' }),
    )
  })
})

// ─── deleteShippingRate ────────────────────────────────────────

describe('deleteShippingRate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('論理削除（isActive=false）で無効化し確認メッセージを返す / soft-deletes by setting isActive=false', async () => {
    // Arrange
    const fakeUpdated = { _id: 'r1', isActive: false }
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'r1' } })
    const res = mockRes()

    // Act
    await deleteShippingRate(req, res)

    // Assert: isActive=false で更新される / updated with isActive=false
    expect(ShippingRate.findByIdAndUpdate).toHaveBeenCalledWith(
      'r1',
      { isActive: false },
      { new: true },
    )
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: '运费率表を無効にしました / 已停用运费率表',
        id: 'r1',
      }),
    )
  })

  it('存在しないレートの場合 404 を返す / returns 404 when rate not found', async () => {
    // Arrange
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await deleteShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '运费率表が見つかりません / 未找到运费率表' }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(ShippingRate.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete failed')),
    } as any)

    const req = mockReq({ params: { id: 'r1' } })
    const res = mockRes()

    // Act
    await deleteShippingRate(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '运费率表の削除に失敗しました' }),
    )
  })
})

// ─── calculateShippingCost ─────────────────────────────────────

describe('calculateShippingCost', () => {
  beforeEach(() => vi.clearAllMocks())

  /**
   * フラットレートのファクトリ / Factory for a flat-type rate fixture
   */
  const makeFlatRate = (overrides = {}) => ({
    _id: 'rate-1',
    name: 'フラットプラン',
    carrierId: 'yamato',
    sizeType: 'flat',
    basePrice: 600,
    coolSurcharge: 200,
    codSurcharge: 300,
    fuelSurcharge: 50,
    isActive: true,
    validFrom: null,
    validTo: null,
    fromPrefectures: [],
    toPrefectures: [],
    ...overrides,
  })

  it('carrierId が未指定の場合 400 を返す / returns 400 when carrierId is missing', async () => {
    // Arrange
    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '配送業者IDは必須です / 配送业者ID为必填项' }),
    )
  })

  it('マッチするレートがない場合 matched=false で返す / returns matched=false when no rate matches', async () => {
    // Arrange
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ matched: false }),
    )
  })

  it('フラットレートで基本料金を計算する / calculates base cost for flat rate', async () => {
    // Arrange
    const rate = makeFlatRate()
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: base + fuel のみ（isCool/isCod 未指定）
    // Only base + fuel (isCool/isCod not specified)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        matched: true,
        rateId: 'rate-1',
        rateName: 'フラットプラン',
        totalCost: 650, // 600 + 50 fuel
        breakdown: {
          base: 600,
          cool: 0,
          cod: 0,
          fuel: 50,
          other: 0,
        },
      }),
    )
  })

  it('isCool=true でクール料金が加算される / adds cool surcharge when isCool=true', async () => {
    // Arrange
    const rate = makeFlatRate()
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', isCool: true } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: base + cool + fuel = 600 + 200 + 50 = 850
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCost: 850,
        breakdown: expect.objectContaining({ cool: 200 }),
      }),
    )
  })

  it('isCod=true で代引き料金が加算される / adds cod surcharge when isCod=true', async () => {
    // Arrange
    const rate = makeFlatRate()
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', isCod: true } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: base + cod + fuel = 600 + 300 + 50 = 950
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        totalCost: 950,
        breakdown: expect.objectContaining({ cod: 300 }),
      }),
    )
  })

  it('isCool と isCod 両方で全追加料金が計上される / adds both surcharges when isCool and isCod are true', async () => {
    // Arrange
    const rate = makeFlatRate()
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', isCool: true, isCod: true } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: 600 + 200 + 300 + 50 = 1150
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ totalCost: 1150 }),
    )
  })

  it('weight タイプで重量範囲内のレートにマッチする / matches weight-type rate within weight range', async () => {
    // Arrange
    const rate = makeFlatRate({ sizeType: 'weight', sizeMin: 0, sizeMax: 10 })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', weight: 5 } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: 5kg は 0-10 範囲内でマッチ / 5kg is within 0-10 range
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: true }))
  })

  it('weight タイプで重量超過のレートはスキップされる / skips weight-type rate when weight exceeds sizeMax', async () => {
    // Arrange
    const rate = makeFlatRate({ sizeType: 'weight', sizeMin: 0, sizeMax: 5 })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', weight: 10 } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: 10kg > 5kg のため未マッチ / 10kg > 5kg so unmatched
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: false }))
  })

  it('weight タイプで重量が下限未満のレートはスキップされる / skips weight-type rate when weight is below sizeMin', async () => {
    // Arrange
    const rate = makeFlatRate({ sizeType: 'weight', sizeMin: 5, sizeMax: 20 })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', weight: 2 } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: 2kg < 5kg なのでマッチしない / 2kg < 5kg so no match
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: false }))
  })

  it('dimension タイプで才数範囲内のレートにマッチする / matches dimension-type rate within dimension range', async () => {
    // Arrange
    const rate = makeFlatRate({ sizeType: 'dimension', sizeMin: 0, sizeMax: 100 })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', dimension: 60 } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: true }))
  })

  it('dimension タイプで才数超過のレートはスキップされる / skips dimension-type rate when dimension exceeds sizeMax', async () => {
    // Arrange
    const rate = makeFlatRate({ sizeType: 'dimension', sizeMin: 0, sizeMax: 60 })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', dimension: 80 } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: false }))
  })

  it('有効期間内のレートにマッチする / matches rate within valid period', async () => {
    // Arrange: validFrom を過去、validTo を未来に設定 / validFrom in past, validTo in future
    const past = new Date(Date.now() - 86400_000).toISOString()
    const future = new Date(Date.now() + 86400_000).toISOString()
    const rate = makeFlatRate({ validFrom: past, validTo: future })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: true }))
  })

  it('有効期間が未来のレートはスキップされる / skips rate whose validFrom is in the future', async () => {
    // Arrange: まだ有効になっていないレート / rate not yet effective
    const future = new Date(Date.now() + 86400_000).toISOString()
    const rate = makeFlatRate({ validFrom: future })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: まだ有効でないためマッチしない / not yet valid, no match
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: false }))
  })

  it('有効期間が過去のレートはスキップされる / skips rate whose validTo has passed', async () => {
    // Arrange: 既に期限切れのレート / expired rate
    const past = new Date(Date.now() - 86400_000).toISOString()
    const rate = makeFlatRate({ validTo: past })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: false }))
  })

  it('fromPrefecture が一致する場合マッチする / matches when fromPrefecture is in rate list', async () => {
    // Arrange
    const rate = makeFlatRate({ fromPrefectures: ['Tokyo', 'Osaka'] })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', fromPrefecture: 'Tokyo' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: true }))
  })

  it('fromPrefecture が一致しない場合スキップされる / skips rate when fromPrefecture not in list', async () => {
    // Arrange
    const rate = makeFlatRate({ fromPrefectures: ['Osaka'] })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', fromPrefecture: 'Tokyo' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: false }))
  })

  it('toPrefecture が一致しない場合スキップされる / skips rate when toPrefecture not in list', async () => {
    // Arrange
    const rate = makeFlatRate({ toPrefectures: ['Hokkaido'] })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', toPrefecture: 'Okinawa' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: false }))
  })

  it('fromPrefectures が空配列の場合は都道府県フィルタを適用しない / skips prefecture filter when fromPrefectures is empty', async () => {
    // Arrange: 都道府県制限なし（全国対応） / no prefecture restriction (nationwide)
    const rate = makeFlatRate({ fromPrefectures: [] })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([rate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato', fromPrefecture: 'Hokkaido' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: 制限なしなのでマッチする / no restriction so matches
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ matched: true }))
  })

  it('複数レートから最初にマッチするものを選択する / selects first matching rate from multiple', async () => {
    // Arrange: 2つのレートのうち1つのみ有効 / only 1 of 2 rates is valid
    const expiredRate = makeFlatRate({
      _id: 'rate-expired',
      name: '期限切れ',
      validTo: new Date(Date.now() - 86400_000).toISOString(),
      basePrice: 100,
    })
    const activeRate = makeFlatRate({ _id: 'rate-active', name: '有効プラン', basePrice: 600 })
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([expiredRate, activeRate]),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert: 期限切れをスキップして有効なレートがマッチ / skips expired, matches active
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ rateId: 'rate-active', rateName: '有効プラン' }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(ShippingRate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('DB timeout')),
      }),
    } as any)

    const req = mockReq({ body: { carrierId: 'yamato' } })
    const res = mockRes()

    // Act
    await calculateShippingCost(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '配送料金の計算に失敗しました' }),
    )
  })
})
