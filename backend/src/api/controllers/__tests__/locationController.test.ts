/**
 * locationController 统合テスト / Location Controller Integration Tests
 *
 * Location, StockQuant モデル層を通じたロケーション操作の HTTP フローを検証する。
 * Verifies HTTP flow for location operations through Location and StockQuant models.
 *
 * モック方針 / Mock strategy:
 * - Location, StockQuant モデルをすべてモック（DB不要）
 *   Mock all models (Location, StockQuant) to eliminate DB dependency
 * - req/res を軽量オブジェクトで代替 / Replace req/res with lightweight objects
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/location', () => ({
  Location: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

vi.mock('@/models/stockQuant', () => ({
  StockQuant: {
    countDocuments: vi.fn(),
  },
}))

import { Location } from '@/models/location'
import { StockQuant } from '@/models/stockQuant'
import {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
} from '@/api/controllers/locationController'

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

// ─── listLocations ─────────────────────────────────────────────

describe('listLocations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('フィルタなしで全ロケーションを返す / returns all locations without filters', async () => {
    // Arrange
    const fakeLocs = [{ code: 'A-01', name: '棚A-01', type: 'shelf' }]
    vi.mocked(Location.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeLocs) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listLocations(req, res)

    // Assert: 空フィルタでモデルが呼ばれる / model called with empty filter
    expect(Location.find).toHaveBeenCalledWith({})
    expect(res.json).toHaveBeenCalledWith(fakeLocs)
  })

  it('type クエリでフィルタを構築する / builds filter from type query', async () => {
    // Arrange
    vi.mocked(Location.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { type: 'shelf' } })
    const res = mockRes()

    // Act
    await listLocations(req, res)

    // Assert
    expect(Location.find).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'shelf' }),
    )
  })

  it('parentId=null のとき $exists: false フィルタを使う / uses $exists:false filter when parentId=null', async () => {
    // Arrange
    vi.mocked(Location.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { parentId: 'null' } })
    const res = mockRes()

    // Act
    await listLocations(req, res)

    // Assert: null 文字列は $exists:false に変換 / 'null' string maps to $exists:false
    expect(Location.find).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: { $exists: false } }),
    )
  })

  it('isActive クエリが boolean に変換される / isActive query converted to boolean', async () => {
    // Arrange
    vi.mocked(Location.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { isActive: 'true' } })
    const res = mockRes()

    // Act
    await listLocations(req, res)

    // Assert: 文字列 'true' が boolean true に変換される / 'true' string converted to boolean
    expect(Location.find).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: true }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(Location.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error('DB down')) }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listLocations(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ロケーション一覧の取得に失敗しました' }),
    )
  })
})

// ─── getLocation ───────────────────────────────────────────────

describe('getLocation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存ロケーションを ID で取得する / retrieves existing location by ID', async () => {
    // Arrange
    const fakeLoc = { _id: 'loc-1', code: 'A-01' }
    vi.mocked(Location.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeLoc),
    } as any)

    const req = mockReq({ params: { id: 'loc-1' } })
    const res = mockRes()

    // Act
    await getLocation(req, res)

    // Assert
    expect(Location.findById).toHaveBeenCalledWith('loc-1')
    expect(res.json).toHaveBeenCalledWith(fakeLoc)
  })

  it('存在しない場合 404 を返す / returns 404 when not found', async () => {
    // Arrange
    vi.mocked(Location.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getLocation(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'ロケーションが見つかりません' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(Location.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('timeout')),
    } as any)

    const req = mockReq({ params: { id: 'loc-1' } })
    const res = mockRes()

    // Act
    await getLocation(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createLocation ────────────────────────────────────────────

describe('createLocation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('必須フィールドが揃っている場合にロケーションを作成し 201 を返す / creates location and returns 201 with required fields', async () => {
    // Arrange
    vi.mocked(Location.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null), // コード未使用 / code not taken
    } as any)
    const fakeCreated = { _id: 'loc-new', code: 'B-01', name: '棚B-01', type: 'shelf' }
    vi.mocked(Location.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: { code: 'B-01', name: '棚B-01', type: 'shelf' } })
    const res = mockRes()

    // Act
    await createLocation(req, res)

    // Assert: 201 で作成結果を返す / returns 201 with created location
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(fakeCreated)
  })

  it('必須フィールドが欠けている場合 400 を返す / returns 400 when required fields missing', async () => {
    // Arrange: name が欠如 / name is missing
    const req = mockReq({ body: { code: 'B-01', type: 'shelf' } })
    const res = mockRes()

    // Act
    await createLocation(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'code, name, type は必須です' })
  })

  it('ロケーションコードが重複している場合 409 を返す / returns 409 when location code already exists', async () => {
    // Arrange: 既存コードあり / existing code found
    vi.mocked(Location.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ code: 'A-01' }),
    } as any)

    const req = mockReq({ body: { code: 'A-01', name: '棚A-01', type: 'shelf' } })
    const res = mockRes()

    // Act
    await createLocation(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('A-01') }),
    )
  })

  it('親ロケーションがある場合 fullPath を構築する / builds fullPath when parentId is provided', async () => {
    // Arrange
    vi.mocked(Location.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null), // code not taken
    } as any)
    // 親ロケーション / parent location
    vi.mocked(Location.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ fullPath: 'メイン倉庫' }),
    } as any)
    vi.mocked(Location.create).mockResolvedValue({ _id: 'loc-child' } as any)

    const req = mockReq({
      body: { code: 'WH-MAIN/A', name: 'エリアA', type: 'area', parentId: 'wh-main-id' },
    })
    const res = mockRes()

    // Act
    await createLocation(req, res)

    // Assert: fullPath が「親 > 子」の形式で構築される / fullPath built as "parent > child"
    expect(Location.create).toHaveBeenCalledWith(
      expect.objectContaining({ fullPath: 'メイン倉庫 > エリアA' }),
    )
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(Location.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)
    vi.mocked(Location.create).mockRejectedValue(new Error('insert failed'))

    const req = mockReq({ body: { code: 'ERR-01', name: 'エラー棚', type: 'shelf' } })
    const res = mockRes()

    // Act
    await createLocation(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'ロケーションの作成に失敗しました' }),
    )
  })
})

// ─── updateLocation ────────────────────────────────────────────

describe('updateLocation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ロケーションを正常に更新する / updates location successfully', async () => {
    // Arrange
    const fakeLocation = {
      _id: 'loc-1',
      code: 'A-01',
      name: '旧名前',
      type: 'shelf',
      parentId: undefined,
      fullPath: '旧名前',
      save: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(Location.findById).mockResolvedValue(fakeLocation as any)

    const req = mockReq({ params: { id: 'loc-1' }, body: { name: '新名前' } })
    const res = mockRes()

    // Act
    await updateLocation(req, res)

    // Assert: save が呼ばれ更新結果を返す / save called and updated result returned
    expect(fakeLocation.save).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith(fakeLocation)
  })

  it('ロケーションが存在しない場合 404 を返す / returns 404 when location not found', async () => {
    // Arrange
    vi.mocked(Location.findById).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'ghost' }, body: { name: '更新' } })
    const res = mockRes()

    // Act
    await updateLocation(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'ロケーションが見つかりません' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(Location.findById).mockRejectedValue(new Error('update error'))

    const req = mockReq({ params: { id: 'loc-1' }, body: {} })
    const res = mockRes()

    // Act
    await updateLocation(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── deleteLocation ────────────────────────────────────────────

describe('deleteLocation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('在庫がなく子ロケーションもない場合に削除する / deletes when no stock and no children', async () => {
    // Arrange: 在庫なし、子なし / no stock, no children
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(0 as any)
    vi.mocked(Location.countDocuments).mockResolvedValue(0 as any)
    vi.mocked(Location.findByIdAndDelete).mockResolvedValue({ _id: 'loc-1' } as any)

    const req = mockReq({ params: { id: 'loc-1' } })
    const res = mockRes()

    // Act
    await deleteLocation(req, res)

    // Assert: 削除完了メッセージ / deletion complete message
    expect(res.json).toHaveBeenCalledWith({ message: 'ロケーションを削除しました' })
  })

  it('在庫があるロケーションは削除できず 409 を返す / returns 409 when location has stock', async () => {
    // Arrange: 在庫あり / stock exists
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(5 as any)

    const req = mockReq({ params: { id: 'loc-1' } })
    const res = mockRes()

    // Act
    await deleteLocation(req, res)

    // Assert: 在庫あり = 削除不可 / has stock = cannot delete
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ message: '在庫があるため削除できません' })
  })

  it('子ロケーションがある場合 409 を返す / returns 409 when location has children', async () => {
    // Arrange: 在庫なし、子あり / no stock, has children
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(0 as any)
    vi.mocked(Location.countDocuments).mockResolvedValue(3 as any)

    const req = mockReq({ params: { id: 'loc-parent' } })
    const res = mockRes()

    // Act
    await deleteLocation(req, res)

    // Assert: 子あり = 削除不可 / has children = cannot delete
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ message: '子ロケーションがあるため削除できません' })
  })

  it('ロケーションが見つからない場合 404 を返す / returns 404 when location not found', async () => {
    // Arrange
    vi.mocked(StockQuant.countDocuments).mockResolvedValue(0 as any)
    vi.mocked(Location.countDocuments).mockResolvedValue(0 as any)
    vi.mocked(Location.findByIdAndDelete).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await deleteLocation(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(StockQuant.countDocuments).mockRejectedValue(new Error('count error'))

    const req = mockReq({ params: { id: 'loc-1' } })
    const res = mockRes()

    // Act
    await deleteLocation(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
