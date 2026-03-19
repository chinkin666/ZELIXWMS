/**
 * carrierController 统合テスト / Carrier Controller Integration Tests
 *
 * Carrier モデルと内蔵配送業者データを通じた配送業者操作の HTTP フローを検証する。
 * Verifies HTTP flow for carrier operations through Carrier model and built-in carrier data.
 *
 * モック方針 / Mock strategy:
 * - Carrier モデルをモック（DB不要）/ Mock Carrier model (no DB required)
 * - builtInCarriers データをモック（固定データに依存しない）
 *   Mock builtInCarriers data (no dependency on static data)
 * - createCarrierSchema / updateCarrierSchema もモック
 *   Mock Zod schemas for deterministic validation behavior
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/carrier', () => ({
  Carrier: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}))

vi.mock('@/data/builtInCarriers', () => ({
  BUILT_IN_CARRIERS: [
    { id: 'builtin-yamato', code: 'YAMATO', name: 'ヤマト運輸', enabled: true },
  ],
  isBuiltInCarrierId: vi.fn((id: string) => id === 'builtin-yamato'),
  getBuiltInCarrier: vi.fn((id: string) =>
    id === 'builtin-yamato'
      ? { id: 'builtin-yamato', code: 'YAMATO', name: 'ヤマト運輸', enabled: true }
      : undefined,
  ),
}))

vi.mock('@/schemas/carrierSchema', () => ({
  createCarrierSchema: {
    safeParse: vi.fn(),
  },
  updateCarrierSchema: {
    safeParse: vi.fn(),
  },
}))

import { Carrier } from '@/models/carrier'
import { isBuiltInCarrierId, getBuiltInCarrier } from '@/data/builtInCarriers'
import { createCarrierSchema, updateCarrierSchema } from '@/schemas/carrierSchema'
import {
  listCarriers,
  getCarrier,
  createCarrier,
  updateCarrier,
  deleteCarrier,
} from '@/api/controllers/carrierController'

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

// ─── listCarriers ──────────────────────────────────────────────

describe('listCarriers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('内蔵配送業者と DB 配送業者を結合して返す / returns merged built-in and DB carriers', async () => {
    // Arrange
    const dbCarriers = [{ code: 'SAGAWA', name: '佐川急便', enabled: true }]
    vi.mocked(Carrier.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(dbCarriers) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listCarriers(req, res)

    // Assert: 内蔵業者 + DB 業者の両方が含まれる / both built-in and DB carriers included
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ code: 'YAMATO' }),
        expect.objectContaining({ code: 'SAGAWA' }),
      ]),
    )
  })

  it('内蔵業者が先頭に来る / built-in carriers appear first', async () => {
    // Arrange
    vi.mocked(Carrier.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([{ code: 'DB-CARRIER' }]) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listCarriers(req, res)

    // Assert: 最初の要素が内蔵業者 / first element is built-in carrier
    const result = vi.mocked(res.json).mock.calls[0][0] as any[]
    expect(result[0]).toEqual(expect.objectContaining({ code: 'YAMATO' }))
  })

  it('name フィルタで内蔵業者もフィルタされる / built-in carriers also filtered by name', async () => {
    // Arrange
    vi.mocked(Carrier.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    // 'sagawa' は内蔵業者 'ヤマト運輸' にマッチしない / 'sagawa' doesn't match built-in 'ヤマト運輸'
    const req = mockReq({ query: { name: 'sagawa' } })
    const res = mockRes()

    // Act
    await listCarriers(req, res)

    // Assert: 内蔵業者はフィルタで除外される / built-in carriers excluded by filter
    const result = vi.mocked(res.json).mock.calls[0][0] as any[]
    expect(result.every((c) => c.code !== 'YAMATO')).toBe(true)
  })

  it('enabled=true フィルタが適用される / applies enabled=true filter', async () => {
    // Arrange
    vi.mocked(Carrier.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { enabled: 'true' } })
    const res = mockRes()

    // Act
    await listCarriers(req, res)

    // Assert: DB クエリに enabled:true が渡される / enabled:true passed to DB query
    expect(Carrier.find).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(Carrier.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error('DB down')) }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listCarriers(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to fetch carriers' }),
    )
  })
})

// ─── getCarrier ────────────────────────────────────────────────

describe('getCarrier', () => {
  beforeEach(() => vi.clearAllMocks())

  it('内蔵配送業者 ID で内蔵データを返す / returns built-in data for built-in carrier ID', async () => {
    // Arrange: isBuiltInCarrierId は 'builtin-yamato' に true を返すよう設定済み
    // isBuiltInCarrierId already mocked to return true for 'builtin-yamato'

    const req = mockReq({ params: { id: 'builtin-yamato' } })
    const res = mockRes()

    // Act
    await getCarrier(req, res)

    // Assert: DB を叩かず内蔵データを返す / returns built-in data without hitting DB
    expect(Carrier.findById).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'YAMATO' }),
    )
  })

  it('DB 配送業者 ID で DB から取得する / fetches from DB for non-built-in carrier ID', async () => {
    // Arrange: 通常の DB 業者 / regular DB carrier
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    const fakeCarrier = { _id: 'carrier-db', code: 'SAGAWA', name: '佐川急便' }
    vi.mocked(Carrier.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeCarrier),
    } as any)

    const req = mockReq({ params: { id: 'carrier-db' } })
    const res = mockRes()

    // Act
    await getCarrier(req, res)

    // Assert: DB から取得 / fetched from DB
    expect(Carrier.findById).toHaveBeenCalledWith('carrier-db')
    expect(res.json).toHaveBeenCalledWith(fakeCarrier)
  })

  it('DB に存在しない場合 404 を返す / returns 404 when not found in DB', async () => {
    // Arrange
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    vi.mocked(Carrier.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Carrier not found' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    vi.mocked(Carrier.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection lost')),
    } as any)

    const req = mockReq({ params: { id: 'carrier-db' } })
    const res = mockRes()

    // Act
    await getCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createCarrier ─────────────────────────────────────────────

describe('createCarrier', () => {
  beforeEach(() => vi.clearAllMocks())

  it('バリデーション成功時に配送業者を作成し 201 を返す / creates carrier and returns 201 on valid input', async () => {
    // Arrange
    const validData = { code: 'JAPAN-POST', name: '日本郵便', enabled: true }
    vi.mocked(createCarrierSchema.safeParse).mockReturnValue({ success: true, data: validData } as any)
    const fakeCreated = {
      ...validData,
      _id: 'carrier-new',
      toObject: () => ({ ...validData, _id: 'carrier-new' }),
    }
    vi.mocked(Carrier.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: validData })
    const res = mockRes()

    // Act
    await createCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'JAPAN-POST' }))
  })

  it('Zod バリデーション失敗時に 400 を返す / returns 400 when Zod validation fails', async () => {
    // Arrange
    vi.mocked(createCarrierSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: { code: ['Required'] } }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await createCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed' }),
    )
  })

  it('DB 重複キーエラー（11000）時に 409 を返す / returns 409 for DB duplicate key error (11000)', async () => {
    // Arrange
    vi.mocked(createCarrierSchema.safeParse).mockReturnValue({
      success: true,
      data: { code: 'YAMATO', name: 'ヤマト' },
    } as any)
    const dbError = Object.assign(new Error('duplicate'), {
      code: 11000,
      keyPattern: { code: 1 },
      keyValue: { code: 'YAMATO' },
    })
    vi.mocked(Carrier.create).mockRejectedValue(dbError)

    const req = mockReq({ body: { code: 'YAMATO', name: 'ヤマト' } })
    const res = mockRes()

    // Act
    await createCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ duplicateField: 'code' }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on general DB error', async () => {
    // Arrange
    vi.mocked(createCarrierSchema.safeParse).mockReturnValue({
      success: true,
      data: { code: 'NEW', name: '新業者' },
    } as any)
    vi.mocked(Carrier.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await createCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── updateCarrier ─────────────────────────────────────────────

describe('updateCarrier', () => {
  beforeEach(() => vi.clearAllMocks())

  it('内蔵配送業者の更新を拒否し 403 を返す / returns 403 when attempting to update built-in carrier', async () => {
    // Arrange: 内蔵業者 ID / built-in carrier ID
    vi.mocked(isBuiltInCarrierId).mockReturnValue(true)

    const req = mockReq({ params: { id: 'builtin-yamato' }, body: { name: '改名' } })
    const res = mockRes()

    // Act
    await updateCarrier(req, res)

    // Assert: 内蔵業者は編集不可 / built-in carrier cannot be edited
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '内蔵配送業者は編集できません' }),
    )
  })

  it('存在しない場合 404 を返す / returns 404 when carrier not found', async () => {
    // Arrange: 内蔵業者ではない / not a built-in carrier
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    vi.mocked(Carrier.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()

    // Act
    await updateCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Carrier not found' })
  })

  it('バリデーション失敗時に 400 を返す / returns 400 when validation fails', async () => {
    // Arrange
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    vi.mocked(Carrier.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'carrier-db' }),
    } as any)
    vi.mocked(updateCarrierSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: { enabled: ['Expected boolean'] } }) },
    } as any)

    const req = mockReq({ params: { id: 'carrier-db' }, body: { enabled: 'maybe' } })
    const res = mockRes()

    // Act
    await updateCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('正常に更新されたデータを返す / returns updated carrier data successfully', async () => {
    // Arrange
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    vi.mocked(Carrier.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'carrier-db', code: 'SAGAWA' }),
    } as any)
    vi.mocked(updateCarrierSchema.safeParse).mockReturnValue({
      success: true,
      data: { enabled: false },
    } as any)
    const fakeUpdated = { _id: 'carrier-db', code: 'SAGAWA', enabled: false }
    vi.mocked(Carrier.findByIdAndUpdate).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeUpdated),
    } as any)

    const req = mockReq({ params: { id: 'carrier-db' }, body: { enabled: false } })
    const res = mockRes()

    // Act
    await updateCarrier(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })
})

// ─── deleteCarrier ─────────────────────────────────────────────

describe('deleteCarrier', () => {
  beforeEach(() => vi.clearAllMocks())

  it('内蔵配送業者の削除を拒否し 403 を返す / returns 403 when attempting to delete built-in carrier', async () => {
    // Arrange
    vi.mocked(isBuiltInCarrierId).mockReturnValue(true)

    const req = mockReq({ params: { id: 'builtin-yamato' } })
    const res = mockRes()

    // Act
    await deleteCarrier(req, res)

    // Assert: 内蔵業者は削除不可 / built-in carrier cannot be deleted
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '内蔵配送業者は削除できません' }),
    )
  })

  it('DB 配送業者を正常に削除する / deletes DB carrier successfully', async () => {
    // Arrange
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    const fakeDeleted = { _id: 'carrier-db', code: 'SAGAWA' }
    vi.mocked(Carrier.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeDeleted),
    } as any)

    const req = mockReq({ params: { id: 'carrier-db' } })
    const res = mockRes()

    // Act
    await deleteCarrier(req, res)

    // Assert: 削除確認 / deletion confirmed
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Deleted' }),
    )
  })

  it('DB に存在しない場合 404 を返す / returns 404 when carrier not found in DB', async () => {
    // Arrange
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    vi.mocked(Carrier.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await deleteCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Carrier not found' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(isBuiltInCarrierId).mockReturnValue(false)
    vi.mocked(Carrier.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete failed')),
    } as any)

    const req = mockReq({ params: { id: 'carrier-db' } })
    const res = mockRes()

    // Act
    await deleteCarrier(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
