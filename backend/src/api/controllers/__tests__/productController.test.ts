/**
 * productController 统合テスト / Product Controller Integration Tests
 *
 * Product モデル層を通じた商品操作の HTTP フローを検証する。
 * Verifies HTTP flow for product CRUD operations through the model layer.
 *
 * モック方針 / Mock strategy:
 * - Product, ShipmentOrder モデルをすべてモック（DB不要）
 *   Mock all models (Product, ShipmentOrder) to eliminate DB dependency
 * - createProductSchema / updateProductSchema もモック
 *   Mock Zod schemas for deterministic validation behavior
 * - logOperation は fire-and-forget のためモック
 *   Mock logOperation (fire-and-forget, not under test)
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ──────────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/models/product', () => ({
  Product: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    insertMany: vi.fn(),
    updateMany: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
  computeAllSku: vi.fn((sku: string) => [sku]),
}))

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    aggregate: vi.fn(),
  },
}))

vi.mock('@/schemas/productSchema', () => ({
  createProductSchema: {
    safeParse: vi.fn(),
  },
  updateProductSchema: {
    safeParse: vi.fn(),
  },
}))

vi.mock('@/config/env', () => ({
  loadEnv: vi.fn(() => ({ fileDir: '/tmp/test' })),
}))

vi.mock('@/services/operationLogger', () => ({
  logOperation: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
  },
  mkdirSync: vi.fn(),
}))

import { Product, computeAllSku } from '@/models/product'
import { ShipmentOrder } from '@/models/shipmentOrder'
import { createProductSchema, updateProductSchema } from '@/schemas/productSchema'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  batchGetProducts,
  resolveSku,
  getProductShipmentStats,
} from '@/api/controllers/productController'

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

// ─── listProducts ──────────────────────────────────────────────

describe('listProducts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('フィルタなしで全商品を返す / returns all products without filters', async () => {
    // Arrange
    const fakeProducts = [{ sku: 'SKU-001', name: 'テスト商品' }]
    vi.mocked(Product.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeProducts) }),
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listProducts(req, res)

    // Assert: 空フィルタでモデルが呼ばれる / model called with empty filter
    expect(Product.find).toHaveBeenCalledWith({})
    expect(res.json).toHaveBeenCalledWith(fakeProducts)
  })

  it('sku クエリで正規表現フィルタを構築する / builds regex filter from sku query', async () => {
    // Arrange
    vi.mocked(Product.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { sku: 'SKU-' } })
    const res = mockRes()

    // Act
    await listProducts(req, res)

    // Assert: sku フィルタが正規表現として渡される / sku filter passed as regex
    expect(Product.find).toHaveBeenCalledWith(
      expect.objectContaining({ sku: { $regex: 'SKU-', $options: 'i' } }),
    )
  })

  it('coolType フィルタが適用される / applies coolType filter for valid values', async () => {
    // Arrange
    vi.mocked(Product.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { coolType: '1' } })
    const res = mockRes()

    // Act
    await listProducts(req, res)

    // Assert
    expect(Product.find).toHaveBeenCalledWith(
      expect.objectContaining({ coolType: '1' }),
    )
  })

  it('無効な coolType は無視される / invalid coolType is ignored', async () => {
    // Arrange
    vi.mocked(Product.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as any)

    const req = mockReq({ query: { coolType: '9' } })
    const res = mockRes()

    // Act
    await listProducts(req, res)

    // Assert: coolType がフィルタに含まれない / coolType not in filter
    const callArg = (vi.mocked(Product.find).mock.calls[0] as any)?.[0] as Record<string, unknown>
    expect(callArg).not.toHaveProperty('coolType')
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(Product.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockRejectedValue(new Error('DB down')) }),
    } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listProducts(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to fetch products' }),
    )
  })
})

// ─── getProduct ────────────────────────────────────────────────

describe('getProduct', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存商品を ID で取得する / retrieves existing product by ID', async () => {
    // Arrange
    const fakeProduct = { _id: 'p1', sku: 'SKU-001' }
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeProduct),
    } as any)

    const req = mockReq({ params: { id: 'p1' } })
    const res = mockRes()

    // Act
    await getProduct(req, res)

    // Assert
    expect(Product.findById).toHaveBeenCalledWith('p1')
    expect(res.json).toHaveBeenCalledWith(fakeProduct)
  })

  it('存在しない商品の場合 404 を返す / returns 404 when product not found', async () => {
    // Arrange
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getProduct(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Product not found' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(Product.findById).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('connection error')),
    } as any)

    const req = mockReq({ params: { id: 'p1' } })
    const res = mockRes()

    // Act
    await getProduct(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── createProduct ─────────────────────────────────────────────

describe('createProduct', () => {
  beforeEach(() => vi.clearAllMocks())

  it('バリデーション成功時に商品を作成し 201 を返す / creates product and returns 201 on valid input', async () => {
    // Arrange
    const validData = { sku: 'SKU-NEW', name: '新商品', subSkus: [] }
    vi.mocked(createProductSchema.safeParse).mockReturnValue({ success: true, data: validData } as any)
    vi.mocked(computeAllSku).mockReturnValue(['SKU-NEW'])
    vi.mocked(Product.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any)
    const fakeCreated = { ...validData, _id: 'p-new', toObject: () => ({ ...validData, _id: 'p-new' }) }
    vi.mocked(Product.create).mockResolvedValue(fakeCreated as any)

    const req = mockReq({ body: validData })
    const res = mockRes()

    // Act
    await createProduct(req, res)

    // Assert: 201 で作成した商品を返す / returns created product with 201
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ sku: 'SKU-NEW' }))
  })

  it('Zod バリデーション失敗時に 400 を返す / returns 400 when Zod validation fails', async () => {
    // Arrange
    vi.mocked(createProductSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: { sku: ['Required'] } }) },
    } as any)

    const req = mockReq({ body: {} })
    const res = mockRes()

    // Act
    await createProduct(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed' }),
    )
  })

  it('SKU 重複時に 409 を返す / returns 409 when SKU already exists', async () => {
    // Arrange
    const validData = { sku: 'SKU-DUP', name: '重複商品', subSkus: [] }
    vi.mocked(createProductSchema.safeParse).mockReturnValue({ success: true, data: validData } as any)
    vi.mocked(computeAllSku).mockReturnValue(['SKU-DUP'])
    // 既存商品が存在する / existing product found
    vi.mocked(Product.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([{ sku: 'SKU-DUP', _allSku: ['SKU-DUP'] }]),
    } as any)

    const req = mockReq({ body: validData })
    const res = mockRes()

    // Act
    await createProduct(req, res)

    // Assert: SKU 重複は 409 / SKU conflict returns 409
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ duplicateField: 'sku' }),
    )
  })

  it('DB の 11000 エラー（重複キー）時に 409 を返す / returns 409 for DB duplicate key error (code 11000)', async () => {
    // Arrange
    const validData = { sku: 'SKU-X', name: '商品X', subSkus: [] }
    vi.mocked(createProductSchema.safeParse).mockReturnValue({ success: true, data: validData } as any)
    vi.mocked(computeAllSku).mockReturnValue(['SKU-X'])
    vi.mocked(Product.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any)
    const dbError = Object.assign(new Error('duplicate'), {
      code: 11000,
      keyPattern: { sku: 1 },
      keyValue: { sku: 'SKU-X' },
    })
    vi.mocked(Product.create).mockRejectedValue(dbError)

    const req = mockReq({ body: validData })
    const res = mockRes()

    // Act
    await createProduct(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(409)
  })
})

// ─── updateProduct ─────────────────────────────────────────────

describe('updateProduct', () => {
  beforeEach(() => vi.clearAllMocks())

  it('既存商品を正常に更新する / updates existing product successfully', async () => {
    // Arrange
    const updateData = { name: '更新後商品名' }
    vi.mocked(updateProductSchema.safeParse).mockReturnValue({ success: true, data: updateData } as any)
    vi.mocked(computeAllSku).mockReturnValue(['SKU-001'])
    // 重複なし / no conflicts
    vi.mocked(Product.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any)
    const fakeProduct = {
      _id: 'p1',
      sku: 'SKU-001',
      name: '旧商品名',
      subSkus: [],
      save: vi.fn().mockResolvedValue(undefined),
      toObject: () => ({ _id: 'p1', sku: 'SKU-001', name: '更新後商品名' }),
    }
    vi.mocked(Product.findById).mockReturnValue({
      lean: undefined,
    } as any)
    // findById を Promise で返すよう設定 / configure findById to return Promise directly
    vi.mocked(Product.findById).mockResolvedValue(fakeProduct as any)

    const req = mockReq({ params: { id: 'p1' }, body: updateData })
    const res = mockRes()

    // Act
    await updateProduct(req, res)

    // Assert
    expect(fakeProduct.save).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ sku: 'SKU-001' }))
  })

  it('バリデーション失敗時に 400 を返す / returns 400 when validation fails', async () => {
    // Arrange
    vi.mocked(updateProductSchema.safeParse).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: { name: ['Too short'] } }) },
    } as any)

    const req = mockReq({ params: { id: 'p1' }, body: { name: '' } })
    const res = mockRes()

    // Act
    await updateProduct(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed' }),
    )
  })

  it('商品が存在しない場合 404 を返す / returns 404 when product not found', async () => {
    // Arrange
    vi.mocked(updateProductSchema.safeParse).mockReturnValue({ success: true, data: {} } as any)
    vi.mocked(Product.findById).mockResolvedValue(null as any)

    const req = mockReq({ params: { id: 'nonexistent' }, body: {} })
    const res = mockRes()

    // Act
    await updateProduct(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Product not found' })
  })
})

// ─── deleteProduct ─────────────────────────────────────────────

describe('deleteProduct', () => {
  beforeEach(() => vi.clearAllMocks())

  it('商品を削除し確認メッセージを返す / deletes product and returns confirmation', async () => {
    // Arrange
    const fakeDeleted = { _id: 'p1', sku: 'SKU-001', name: '削除商品' }
    vi.mocked(Product.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeDeleted),
    } as any)

    const req = mockReq({ params: { id: 'p1' } })
    const res = mockRes()

    // Act
    await deleteProduct(req, res)

    // Assert: 削除確認レスポンス / deletion confirmation response
    expect(Product.findByIdAndDelete).toHaveBeenCalledWith('p1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Deleted' }),
    )
  })

  it('存在しない商品の削除で 404 を返す / returns 404 when deleting non-existent product', async () => {
    // Arrange
    vi.mocked(Product.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { id: 'ghost' } })
    const res = mockRes()

    // Act
    await deleteProduct(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Product not found' })
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(Product.findByIdAndDelete).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('delete failed')),
    } as any)

    const req = mockReq({ params: { id: 'p1' } })
    const res = mockRes()

    // Act
    await deleteProduct(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── batchGetProducts ──────────────────────────────────────────

describe('batchGetProducts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('複数 SKU で商品を一括取得する / batch-fetches products for multiple SKUs', async () => {
    // Arrange
    const fakeProducts = [{ sku: 'SKU-A' }, { sku: 'SKU-B' }]
    vi.mocked(Product.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeProducts),
    } as any)

    const req = mockReq({ body: { skus: ['SKU-A', 'SKU-B'] } })
    const res = mockRes()

    // Act
    await batchGetProducts(req, res)

    // Assert: _allSku インデックスで検索 / search by _allSku index
    expect(Product.find).toHaveBeenCalledWith({ _allSku: { $in: ['SKU-A', 'SKU-B'] } })
    expect(res.json).toHaveBeenCalledWith(fakeProducts)
  })

  it('skus 配列が空の場合 400 を返す / returns 400 when skus array is empty', async () => {
    // Arrange
    const req = mockReq({ body: { skus: [] } })
    const res = mockRes()

    // Act
    await batchGetProducts(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('skus が配列でない場合 400 を返す / returns 400 when skus is not an array', async () => {
    // Arrange
    const req = mockReq({ body: { skus: 'SKU-A' } })
    const res = mockRes()

    // Act
    await batchGetProducts(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('空白のみの SKU は除外される / blank-only SKUs are filtered out', async () => {
    // Arrange
    vi.mocked(Product.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any)

    const req = mockReq({ body: { skus: ['  ', ' SKU-A '] } })
    const res = mockRes()

    // Act
    await batchGetProducts(req, res)

    // Assert: 空白 SKU はトリムされ有効なものだけ渡る / blank SKU filtered, valid one trimmed
    expect(Product.find).toHaveBeenCalledWith({ _allSku: { $in: ['SKU-A'] } })
  })
})

// ─── resolveSku ────────────────────────────────────────────────

describe('resolveSku', () => {
  beforeEach(() => vi.clearAllMocks())

  it('メイン SKU に一致する場合 matchedSubSku=null で返す / returns matchedSubSku=null when matched by main SKU', async () => {
    // Arrange
    const fakeProduct = { sku: 'SKU-001', subSkus: [], _allSku: ['SKU-001'] }
    vi.mocked(Product.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeProduct),
    } as any)

    const req = mockReq({ params: { sku: 'SKU-001' } })
    const res = mockRes()

    // Act
    await resolveSku(req, res)

    // Assert: matchedSubSku は null / matchedSubSku is null
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'SKU-001', matchedSubSku: null }),
    )
  })

  it('サブ SKU に一致する場合 matchedSubSku を返す / returns matchedSubSku when matched by sub-SKU', async () => {
    // Arrange
    const fakeProduct = {
      sku: 'SKU-001',
      subSkus: [{ subSku: 'SUB-001' }],
      _allSku: ['SKU-001', 'SUB-001'],
    }
    vi.mocked(Product.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(fakeProduct),
    } as any)

    const req = mockReq({ params: { sku: 'SUB-001' } })
    const res = mockRes()

    // Act
    await resolveSku(req, res)

    // Assert: サブ SKU が matchedSubSku に入る / sub-SKU returned in matchedSubSku
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ matchedSubSku: { subSku: 'SUB-001' } }),
    )
  })

  it('商品が見つからない場合 404 を返す / returns 404 when SKU not found', async () => {
    // Arrange
    vi.mocked(Product.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    const req = mockReq({ params: { sku: 'GHOST-SKU' } })
    const res = mockRes()

    // Act
    await resolveSku(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('SKU パラメータが空の場合 400 を返す / returns 400 when SKU param is empty', async () => {
    // Arrange
    const req = mockReq({ params: { sku: '' } })
    const res = mockRes()

    // Act
    await resolveSku(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── getProductShipmentStats ───────────────────────────────────

describe('getProductShipmentStats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('集計結果を返す / returns aggregated shipment stats', async () => {
    // Arrange
    const fakeStats = [{ _id: 'SKU-A', totalQuantity: 100, orderCount: 5 }]
    vi.mocked(ShipmentOrder.aggregate).mockResolvedValue(fakeStats as any)

    const req = mockReq({ query: { dateFrom: '2026-01-01', dateTo: '2026-01-31' } })
    const res = mockRes()

    // Act
    await getProductShipmentStats(req, res)

    // Assert
    expect(ShipmentOrder.aggregate).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith(fakeStats)
  })

  it('日付フィルタなしでも動作する / works without date filters', async () => {
    // Arrange
    vi.mocked(ShipmentOrder.aggregate).mockResolvedValue([] as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await getProductShipmentStats(req, res)

    // Assert: エラーなしで空配列を返す / returns empty array without errors
    expect(res.json).toHaveBeenCalledWith([])
  })

  it('DB エラー時に 500 を返す / returns 500 on DB error', async () => {
    // Arrange
    vi.mocked(ShipmentOrder.aggregate).mockRejectedValue(new Error('aggregate failed'))

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await getProductShipmentStats(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})
