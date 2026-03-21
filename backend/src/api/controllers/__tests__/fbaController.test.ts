/**
 * fbaController 统合テスト / FBA Controller Integration Tests
 *
 * FbaShipmentPlan モデル層を通じた FBA 計画操作の HTTP フローを検証する。
 * Verifies HTTP flow for FBA shipment plan CRUD and status transition operations.
 *
 * モック方針 / Mock strategy:
 * - FbaShipmentPlan モデルをすべてモック（DB 不要）
 *   Mock FbaShipmentPlan model entirely to eliminate DB dependency
 * - getTenantId ヘルパーはモックせず req.user 経由で制御
 *   getTenantId is controlled via req.user (no separate mock needed)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted）──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/fbaShipmentPlan', () => ({
  FbaShipmentPlan: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
}))

// getTenantId が依存する Warehouse モデルもモック
// Mock Warehouse model required by tenantHelper
vi.mock('@/models/warehouse', () => ({
  Warehouse: {
    findById: vi.fn(),
  },
}))

import { FbaShipmentPlan } from '@/models/fbaShipmentPlan'
import {
  listFbaPlans,
  createFbaPlan,
  getFbaPlan,
  updateFbaPlan,
  confirmFbaPlan,
  shipFbaPlan,
  deleteFbaPlan,
} from '@/api/controllers/fbaController'

// ─── テストユーティリティ / Test utilities ────────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 * 最小限の Request オブジェクト / Minimal Request object
 */
const mockReq = (overrides: Record<string, unknown> = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: { id: 'u1', tenantId: 'T1' },
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

// ─── テスト用データ / Test data ───────────────────────────────────

const fakePlan = {
  _id: 'plan-001',
  tenantId: 'T1',
  planNumber: 'FBA-20260321-001',
  status: 'draft',
  destinationFc: 'NRT5',
  items: [{ productId: 'prod-1', sku: 'SKU-001', quantity: 10, preparedQuantity: 0, shippedQuantity: 0 }],
  totalQuantity: 10,
  createdAt: new Date('2026-03-21'),
  updatedAt: new Date('2026-03-21'),
}

// ─── listFbaPlans ────────────────────────────────────────────────

describe('listFbaPlans', () => {
  beforeEach(() => vi.clearAllMocks())

  it('フィルタなしで全プランを返す / returns all plans without filters', async () => {
    // Arrange
    const fakePlans = [fakePlan]
    vi.mocked(FbaShipmentPlan.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakePlans) }),
        }),
      }),
    } as any)
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(1)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listFbaPlans(req, res)

    // Assert: tenantId フィルタのみで検索 / search with tenantId filter only
    expect(FbaShipmentPlan.find).toHaveBeenCalledWith({ tenantId: 'T1' })
    expect(res.json).toHaveBeenCalledWith({ data: fakePlans, total: 1 })
  })

  it('status クエリでフィルタを追加する / adds status filter from query', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    } as any)
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { status: 'confirmed' } })
    const res = mockRes()

    // Act
    await listFbaPlans(req, res)

    // Assert: status フィルタが追加される / status filter is added
    expect(FbaShipmentPlan.find).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'T1', status: 'confirmed' }),
    )
  })

  it('空白の status クエリは無視される / blank status query is ignored', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    } as any)
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { status: '   ' } })
    const res = mockRes()

    // Act
    await listFbaPlans(req, res)

    // Assert: status がフィルタに含まれない / status not in filter
    const callArg = vi.mocked(FbaShipmentPlan.find).mock.calls[0][0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('status')
  })

  it('search クエリで $or 正規表現フィルタを構築する / builds $or regex filter from search query', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    } as any)
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { search: 'NRT5' } })
    const res = mockRes()

    // Act
    await listFbaPlans(req, res)

    // Assert: $or 検索が構築される / $or search is built
    const callArg = vi.mocked(FbaShipmentPlan.find).mock.calls[0][0] as Record<string, unknown>
    expect(callArg).toHaveProperty('$or')
    const orConditions = callArg.$or as Array<Record<string, unknown>>
    expect(orConditions).toHaveLength(4)
  })

  it('search クエリの正規表現特殊文字がエスケープされる / special regex chars in search are escaped', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    } as any)
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { search: 'FBA.001+' } })
    const res = mockRes()

    // Act
    await listFbaPlans(req, res)

    // Assert: 特殊文字がエスケープされる / special chars are escaped
    const callArg = vi.mocked(FbaShipmentPlan.find).mock.calls[0][0] as Record<string, unknown>
    const orConditions = callArg.$or as Array<Record<string, unknown>>
    const planNumberCond = orConditions[0] as any
    expect(planNumberCond.planNumber.$regex).toBe('FBA\\.001\\+')
  })

  it('ページネーションパラメータが反映される / pagination parameters are applied', async () => {
    // Arrange
    const sortMock = vi.fn()
    const skipMock = vi.fn()
    const limitMock = vi.fn()
    limitMock.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
    skipMock.mockReturnValue({ limit: limitMock })
    sortMock.mockReturnValue({ skip: skipMock })
    vi.mocked(FbaShipmentPlan.find).mockReturnValue({ sort: sortMock } as any)
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { page: '2', limit: '5' } })
    const res = mockRes()

    // Act
    await listFbaPlans(req, res)

    // Assert: skip=5（2ページ目）, limit=5 / skip=5 (page 2), limit=5
    expect(skipMock).toHaveBeenCalledWith(5)
    expect(limitMock).toHaveBeenCalledWith(5)
  })

  it('limit が 100 を超えた場合 100 に制限される / limit is capped at 100', async () => {
    // Arrange
    const sortMock = vi.fn()
    const skipMock = vi.fn()
    const limitMock = vi.fn()
    limitMock.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
    skipMock.mockReturnValue({ limit: limitMock })
    sortMock.mockReturnValue({ skip: skipMock })
    vi.mocked(FbaShipmentPlan.find).mockReturnValue({ sort: sortMock } as any)
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { limit: '500' } })
    const res = mockRes()

    // Act
    await listFbaPlans(req, res)

    // Assert: limit が 100 に制限される / limit capped at 100
    expect(limitMock).toHaveBeenCalledWith(100)
  })

  it('無効なページ番号はデフォルト 1 にフォールバック / invalid page falls back to 1', async () => {
    // Arrange
    const sortMock = vi.fn()
    const skipMock = vi.fn()
    const limitMock = vi.fn()
    limitMock.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) })
    skipMock.mockReturnValue({ limit: limitMock })
    sortMock.mockReturnValue({ skip: skipMock })
    vi.mocked(FbaShipmentPlan.find).mockReturnValue({ sort: sortMock } as any)
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: { page: 'abc' } })
    const res = mockRes()

    // Act
    await listFbaPlans(req, res)

    // Assert: skip=0（1 ページ目）/ skip=0 (page 1)
    expect(skipMock).toHaveBeenCalledWith(0)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error('DB down')) }),
        }),
      }),
    } as any)
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listFbaPlans(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FBAプランの取得に失敗しました') }),
    )
  })
})

// ─── createFbaPlan ───────────────────────────────────────────────

describe('createFbaPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  const validBody = {
    destinationFc: 'NRT5',
    items: [{ productId: 'prod-1', sku: 'SKU-001', quantity: 5 }],
  }

  it('正常なリクエストでプランを作成し 201 を返す / creates plan and returns 201 on valid input', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)
    const createdDoc = {
      ...fakePlan,
      toObject: () => fakePlan,
    }
    vi.mocked(FbaShipmentPlan.create).mockResolvedValue(createdDoc as any)

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert: 201 + 作成されたプランを返す / returns 201 + created plan
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'T1' }))
  })

  it('プラン番号が連番で自動生成される / auto-generates sequential plan number', async () => {
    // Arrange: 既存プランが 2 件ある場合 / 2 existing plans
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(2)
    const createdDoc = { ...fakePlan, toObject: () => fakePlan }
    vi.mocked(FbaShipmentPlan.create).mockResolvedValue(createdDoc as any)

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert: create が planNumber='FBA-YYYYMMDD-003' で呼ばれる
    // create is called with planNumber 'FBA-YYYYMMDD-003'
    const createCallArg = vi.mocked(FbaShipmentPlan.create).mock.calls[0][0] as any
    expect(createCallArg.planNumber).toMatch(/^FBA-\d{8}-003$/)
  })

  it('items の合計数量が totalQuantity に反映される / totalQuantity reflects sum of item quantities', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)
    const createdDoc = { ...fakePlan, toObject: () => fakePlan }
    vi.mocked(FbaShipmentPlan.create).mockResolvedValue(createdDoc as any)

    const bodyWithMultipleItems = {
      destinationFc: 'NRT5',
      items: [
        { productId: 'p1', sku: 'SKU-001', quantity: 3 },
        { productId: 'p2', sku: 'SKU-002', quantity: 7 },
      ],
    }
    const req = mockReq({ body: bodyWithMultipleItems })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert: totalQuantity = 10 / totalQuantity = 10
    const createCallArg = vi.mocked(FbaShipmentPlan.create).mock.calls[0][0] as any
    expect(createCallArg.totalQuantity).toBe(10)
  })

  it('destinationFc が未指定の場合 400 を返す / returns 400 when destinationFc is missing', async () => {
    // Arrange
    const req = mockReq({ body: { items: [{ sku: 'SKU-001', quantity: 1 }] } })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('destinationFc') }),
    )
  })

  it('destinationFc が空白文字のみの場合 400 を返す / returns 400 when destinationFc is whitespace only', async () => {
    // Arrange
    const req = mockReq({ body: { destinationFc: '   ', items: [{ sku: 'SKU-001', quantity: 1 }] } })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('items が空配列の場合 400 を返す / returns 400 when items is empty array', async () => {
    // Arrange
    const req = mockReq({ body: { destinationFc: 'NRT5', items: [] } })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('items') }),
    )
  })

  it('items が配列でない場合 400 を返す / returns 400 when items is not an array', async () => {
    // Arrange
    const req = mockReq({ body: { destinationFc: 'NRT5', items: 'not-an-array' } })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('DB の 11000 エラー（重複キー）時に 409 を返す / returns 409 for DB duplicate key error (code 11000)', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)
    const dbError = Object.assign(new Error('duplicate key'), { code: 11000 })
    vi.mocked(FbaShipmentPlan.create).mockRejectedValue(dbError)

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert: 重複エラーは 409 / duplicate error returns 409
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('重複') }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on generic DB error', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)
    vi.mocked(FbaShipmentPlan.create).mockRejectedValue(new Error('connection lost'))

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FBAプランの作成に失敗しました') }),
    )
  })

  it('オプションフィールドが正しくマッピングされる / optional fields are correctly mapped', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)
    const createdDoc = { ...fakePlan, toObject: () => fakePlan }
    vi.mocked(FbaShipmentPlan.create).mockResolvedValue(createdDoc as any)

    const bodyWithOptionals = {
      destinationFc: 'NRT5',
      amazonShipmentId: 'AMZ-123',
      shipFromName: '出荷元会社',
      shipFromAddress: '東京都',
      carrierId: 'yamato',
      boxCount: 3,
      shipDate: '2026-04-01',
      estimatedArrival: '2026-04-05',
      memo: 'テストメモ',
      items: [{ productId: 'p1', sku: 'SKU-001', fnsku: 'FNSKU-1', asin: 'ASIN-1', quantity: 2 }],
    }
    const req = mockReq({ body: bodyWithOptionals })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert: オプションフィールドが create に渡される / optional fields passed to create
    const createCallArg = vi.mocked(FbaShipmentPlan.create).mock.calls[0][0] as any
    expect(createCallArg.amazonShipmentId).toBe('AMZ-123')
    expect(createCallArg.carrierId).toBe('yamato')
    expect(createCallArg.boxCount).toBe(3)
    expect(createCallArg.memo).toBe('テストメモ')
    expect(createCallArg.items[0].fnsku).toBe('FNSKU-1')
    expect(createCallArg.items[0].asin).toBe('ASIN-1')
  })

  it('status が常に draft として作成される / status is always set to draft on creation', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)
    const createdDoc = { ...fakePlan, toObject: () => fakePlan }
    vi.mocked(FbaShipmentPlan.create).mockResolvedValue(createdDoc as any)

    const req = mockReq({ body: validBody })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert
    const createCallArg = vi.mocked(FbaShipmentPlan.create).mock.calls[0][0] as any
    expect(createCallArg.status).toBe('draft')
  })
})

// ─── getFbaPlan ──────────────────────────────────────────────────

describe('getFbaPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存プランを ID で取得する / retrieves existing plan by ID', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakePlan),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await getFbaPlan(req, res)

    // Assert: tenantId スコープで検索 / search scoped by tenantId
    expect(FbaShipmentPlan.findOne).toHaveBeenCalledWith({ _id: 'plan-001', tenantId: 'T1' })
    expect(res.json).toHaveBeenCalledWith(fakePlan)
  })

  it('存在しないプランの場合 404 を返す / returns 404 when plan not found', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FBAプランが見つかりません') }),
    )
  })

  it('別テナントのプランは取得できない / cannot retrieve plan from different tenant', async () => {
    // Arrange: 別テナントのプランは findOne が null を返す
    // findOne returns null for a plan belonging to a different tenant
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' }, user: { tenantId: 'OTHER_TENANT' } })
    const res = mockRes()

    // Act
    await getFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await getFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FBAプランの取得に失敗しました') }),
    )
  })
})

// ─── updateFbaPlan ───────────────────────────────────────────────

describe('updateFbaPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft プランの全フィールドを更新できる / updates all fields of a draft plan', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)
    const updatedPlan = { ...fakePlan, destinationFc: 'TYO3' }
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedPlan),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { destinationFc: 'TYO3' },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert: 更新されたプランを返す / returns updated plan
    expect(FbaShipmentPlan.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'plan-001', tenantId: 'T1' },
      { $set: expect.objectContaining({ destinationFc: 'TYO3' }) },
      { new: true, runValidators: true },
    )
    expect(res.json).toHaveBeenCalledWith(updatedPlan)
  })

  it('draft プランの items を更新すると totalQuantity が再計算される / updating items recalculates totalQuantity', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakePlan),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: {
        items: [
          { productId: 'p1', sku: 'SKU-001', quantity: 8 },
          { productId: 'p2', sku: 'SKU-002', quantity: 4 },
        ],
      },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert: totalQuantity = 12 / totalQuantity = 12
    const updateCallArg = vi.mocked(FbaShipmentPlan.findOneAndUpdate).mock.calls[0][1] as any
    expect(updateCallArg.$set.totalQuantity).toBe(12)
  })

  it('confirmed プランで許可されたフィールドのみ更新できる / only allowed fields can be updated on confirmed plan', async () => {
    // Arrange: confirmed 状態のプラン / confirmed status plan
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'confirmed' }),
    } as any)
    const updatedPlan = { ...fakePlan, status: 'confirmed', trackingNumber: 'TRK-001' }
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(updatedPlan),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { trackingNumber: 'TRK-001' },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert: 正常に更新される / updates successfully
    expect(res.json).toHaveBeenCalledWith(updatedPlan)
  })

  it('confirmed プランで不許可フィールドを更新しようとすると 400 を返す / returns 400 when updating disallowed fields on confirmed plan', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'confirmed' }),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { destinationFc: 'TYO3' }, // 不許可フィールド / disallowed field
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('destinationFc') }),
    )
  })

  it('confirmed プランで items を更新しようとすると 400 を返す / returns 400 when updating items on confirmed plan', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'confirmed' }),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { items: [{ productId: 'p1', sku: 'SKU-X', quantity: 1 }] },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('draft プランで items を空配列で更新しようとすると 400 を返す / returns 400 when updating items with empty array on draft plan', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { items: [] },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('存在しないプランの更新で 404 を返す / returns 404 when plan not found on initial lookup', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: { memo: 'test' } })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('更新後にプランが消えた場合 404 を返す / returns 404 when plan disappears after update', async () => {
    // Arrange: findOne は存在を確認するが findOneAndUpdate は null を返す
    // findOne confirms existence but findOneAndUpdate returns null (race condition)
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' }, body: { memo: 'test' } })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' }, body: { memo: 'test' } })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FBAプランの更新に失敗しました') }),
    )
  })
})

// ─── confirmFbaPlan ──────────────────────────────────────────────

describe('confirmFbaPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft プランを confirmed に変更する / transitions draft plan to confirmed', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)
    const confirmedPlan = { ...fakePlan, status: 'confirmed', confirmedAt: new Date() }
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(confirmedPlan),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await confirmFbaPlan(req, res)

    // Assert: status を confirmed にして confirmedAt を設定 / set status confirmed and confirmedAt
    expect(FbaShipmentPlan.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'plan-001', tenantId: 'T1' },
      { $set: expect.objectContaining({ status: 'confirmed', confirmedAt: expect.any(Date) }) },
      { new: true },
    )
    expect(res.json).toHaveBeenCalledWith(confirmedPlan)
  })

  it('存在しないプランの確認で 404 を返す / returns 404 when plan not found', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await confirmFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('draft 以外のプランは確認できない / cannot confirm non-draft plan', async () => {
    // Arrange: confirmed 状態のプラン / plan already confirmed
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'confirmed' }),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await confirmFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('draft') }),
    )
  })

  it('shipped プランの確認も 400 を返す / returns 400 when confirming shipped plan', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'shipped' }),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await confirmFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await confirmFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FBAプランの確認に失敗しました') }),
    )
  })
})

// ─── shipFbaPlan ─────────────────────────────────────────────────

describe('shipFbaPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('confirmed プランを shipped に変更する / transitions confirmed plan to shipped', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'confirmed' }),
    } as any)
    const shippedPlan = { ...fakePlan, status: 'shipped', shippedAt: new Date() }
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(shippedPlan),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' }, body: {} })
    const res = mockRes()

    // Act
    await shipFbaPlan(req, res)

    // Assert: status を shipped にして shippedAt を設定 / set status shipped and shippedAt
    expect(FbaShipmentPlan.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'plan-001', tenantId: 'T1' },
      { $set: expect.objectContaining({ status: 'shipped', shippedAt: expect.any(Date) }) },
      { new: true },
    )
    expect(res.json).toHaveBeenCalledWith(shippedPlan)
  })

  it('出荷時にトラッキング番号・配送業者・箱数を設定できる / can set tracking number, carrier and box count on ship', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'confirmed' }),
    } as any)
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakePlan),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { trackingNumber: 'TRK-9999', carrierId: 'yamato', boxCount: 5 },
    })
    const res = mockRes()

    // Act
    await shipFbaPlan(req, res)

    // Assert: 出荷情報が更新データに含まれる / shipping info included in update data
    const updateCallArg = vi.mocked(FbaShipmentPlan.findOneAndUpdate).mock.calls[0][1] as any
    expect(updateCallArg.$set.trackingNumber).toBe('TRK-9999')
    expect(updateCallArg.$set.carrierId).toBe('yamato')
    expect(updateCallArg.$set.boxCount).toBe(5)
  })

  it('存在しないプランの出荷で 404 を返す / returns 404 when plan not found', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()

    // Act
    await shipFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('confirmed 以外のプランは出荷できない / cannot ship non-confirmed plan', async () => {
    // Arrange: draft 状態のプラン / draft plan
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' }, body: {} })
    const res = mockRes()

    // Act
    await shipFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('confirmed') }),
    )
  })

  it('shipped プランの再出荷は 400 を返す / returns 400 when shipping already shipped plan', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'shipped' }),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' }, body: {} })
    const res = mockRes()

    // Act
    await shipFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' }, body: {} })
    const res = mockRes()

    // Act
    await shipFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FBAプランの出荷に失敗しました') }),
    )
  })
})

// ─── deleteFbaPlan ───────────────────────────────────────────────

describe('deleteFbaPlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('draft プランを削除して確認メッセージを返す / deletes draft plan and returns confirmation', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)
    vi.mocked(FbaShipmentPlan.deleteOne).mockResolvedValue({ deletedCount: 1 } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await deleteFbaPlan(req, res)

    // Assert
    expect(FbaShipmentPlan.deleteOne).toHaveBeenCalledWith({ _id: 'plan-001', tenantId: 'T1' })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('FBAプランを削除しました'),
        id: 'plan-001',
      }),
    )
  })

  it('存在しないプランの削除で 404 を返す / returns 404 when deleting non-existent plan', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await deleteFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FBAプランが見つかりません') }),
    )
  })

  it('draft 以外のプランは削除できない（confirmed）/ cannot delete non-draft plan (confirmed)', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'confirmed' }),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await deleteFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('draft') }),
    )
    // deleteOne は呼ばれない / deleteOne should not be called
    expect(FbaShipmentPlan.deleteOne).not.toHaveBeenCalled()
  })

  it('shipped プランも削除できない / cannot delete shipped plan', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'shipped' }),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await deleteFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(FbaShipmentPlan.deleteOne).not.toHaveBeenCalled()
  })

  it('cancelled プランも削除できない / cannot delete cancelled plan', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'cancelled' }),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await deleteFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    const req = mockReq({ params: { id: 'plan-001' } })
    const res = mockRes()

    // Act
    await deleteFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('FBAプランの削除に失敗しました') }),
    )
  })
})

// ─── ブランチカバレッジ補完テスト / Branch coverage gap tests ─────

describe('updateFbaPlan - branch coverage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shipDate に null/空文字を渡すと undefined にマッピングされる / null shipDate maps to undefined', async () => {
    // Arrange: shipDate='' （偽値）→ undefined に変換されることを確認
    // Verifies that empty shipDate (falsy) is mapped to undefined
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakePlan),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { shipDate: '', estimatedArrival: '' },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert: 空文字は undefined になる / empty string becomes undefined
    const updateCallArg = vi.mocked(FbaShipmentPlan.findOneAndUpdate).mock.calls[0][1] as any
    expect(updateCallArg.$set.shipDate).toBeUndefined()
    expect(updateCallArg.$set.estimatedArrival).toBeUndefined()
  })

  it('有効な日付は Date オブジェクトに変換される / valid date strings are converted to Date objects', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakePlan),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { shipDate: '2026-05-01', estimatedArrival: '2026-05-10' },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert: 日付文字列が Date に変換される / date strings converted to Date
    const updateCallArg = vi.mocked(FbaShipmentPlan.findOneAndUpdate).mock.calls[0][1] as any
    expect(updateCallArg.$set.shipDate).toBeInstanceOf(Date)
    expect(updateCallArg.$set.estimatedArrival).toBeInstanceOf(Date)
  })

  it('空文字の amazonShipmentId は undefined になる / empty amazonShipmentId becomes undefined', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakePlan),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { amazonShipmentId: '', memo: '' },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert: 空文字列の optional フィールドは undefined / empty optional fields become undefined
    const updateCallArg = vi.mocked(FbaShipmentPlan.findOneAndUpdate).mock.calls[0][1] as any
    expect(updateCallArg.$set.amazonShipmentId).toBeUndefined()
    expect(updateCallArg.$set.memo).toBeUndefined()
  })

  it('boxCount=0 は undefined になる / zero boxCount becomes undefined', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakePlan),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { boxCount: 0 },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert: 0 は undefined に変換される / 0 becomes undefined
    const updateCallArg = vi.mocked(FbaShipmentPlan.findOneAndUpdate).mock.calls[0][1] as any
    expect(updateCallArg.$set.boxCount).toBeUndefined()
  })

  it('items に非配列を指定した場合も 400 を返す / returns 400 when items is non-array on draft update', async () => {
    // Arrange
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'draft' }),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: { items: 'not-an-array' },
    })
    const res = mockRes()

    // Act
    await updateFbaPlan(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('createFbaPlan - branch coverage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shipDate/estimatedArrival が undefined の場合 undefined のまま / undefined dates stay undefined', async () => {
    // Arrange: オプション日付フィールドなし / no optional date fields
    vi.mocked(FbaShipmentPlan.countDocuments).mockResolvedValue(0)
    const createdDoc = { ...fakePlan, toObject: () => fakePlan }
    vi.mocked(FbaShipmentPlan.create).mockResolvedValue(createdDoc as any)

    const req = mockReq({
      body: {
        destinationFc: 'NRT5',
        items: [{ productId: 'p1', sku: 'SKU-001', quantity: 1 }],
        // shipDate と estimatedArrival を意図的に省略 / deliberately omitting shipDate and estimatedArrival
      },
    })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert: create が呼ばれた / create was called
    const createCallArg = vi.mocked(FbaShipmentPlan.create).mock.calls[0][0] as any
    expect(createCallArg.shipDate).toBeUndefined()
    expect(createCallArg.estimatedArrival).toBeUndefined()
  })

  it('非 Error オブジェクトの例外でも 500 を返す / returns 500 for non-Error thrown value', async () => {
    // Arrange: 文字列例外 / string exception
    vi.mocked(FbaShipmentPlan.countDocuments).mockRejectedValue('string-error')

    const req = mockReq({
      body: {
        destinationFc: 'NRT5',
        items: [{ productId: 'p1', sku: 'SKU-001', quantity: 1 }],
      },
    })
    const res = mockRes()

    // Act
    await createFbaPlan(req, res)

    // Assert: 文字列例外でも 500 / returns 500 for string exception
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'string-error' }),
    )
  })
})

describe('shipFbaPlan - branch coverage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('trackingNumber・carrierId・boxCount を省略しても出荷できる / ships without optional tracking fields', async () => {
    // Arrange: 出荷オプションフィールドなし / no optional shipping fields
    vi.mocked(FbaShipmentPlan.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ ...fakePlan, status: 'confirmed' }),
    } as any)
    const shippedPlan = { ...fakePlan, status: 'shipped', shippedAt: new Date() }
    vi.mocked(FbaShipmentPlan.findOneAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(shippedPlan),
    } as any)

    const req = mockReq({
      params: { id: 'plan-001' },
      body: {}, // trackingNumber/carrierId/boxCount なし / without optional fields
    })
    const res = mockRes()

    // Act
    await shipFbaPlan(req, res)

    // Assert: trackingNumber・carrierId・boxCount が updateData に含まれない
    // trackingNumber/carrierId/boxCount not included in updateData
    const updateCallArg = vi.mocked(FbaShipmentPlan.findOneAndUpdate).mock.calls[0][1] as any
    expect(updateCallArg.$set).not.toHaveProperty('trackingNumber')
    expect(updateCallArg.$set).not.toHaveProperty('carrierId')
    expect(updateCallArg.$set).not.toHaveProperty('boxCount')
    expect(res.json).toHaveBeenCalledWith(shippedPlan)
  })
})
