/**
 * inventoryController 统合テスト / Inventory Controller Integration Tests
 *
 * HTTPリクエストがコントローラーからサービス層へ正しく流れるかを検証する。
 * Verifies that HTTP requests flow correctly from controller to service layer.
 *
 * モック方針 / Mock strategy:
 * - inventoryService 全体をモック（外部依存を排除）
 *   Mock entire inventoryService (eliminate external dependencies)
 * - Location モデルをモック（DB不要）
 *   Mock Location model (no DB required)
 * - req/res を軽量オブジェクトで代替
 *   Replace req/res with lightweight objects
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ───────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/services/inventoryService')
vi.mock('@/models/location', () => ({
  Location: {
    find: vi.fn(),
  },
}))
vi.mock('@/api/helpers/tenantHelper', () => ({
  getWarehouseFilter: vi.fn(() => []),
}))
vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    find: vi.fn(),
  },
}))
vi.mock('@/services/stockService', () => ({
  reserveStockForOrder: vi.fn(),
}))

import * as inventoryService from '@/services/inventoryService'
import { Location } from '@/models/location'
import { getWarehouseFilter } from '@/api/helpers/tenantHelper'
import {
  listStock,
  adjustStock,
  transferStock,
  bulkAdjustStock,
  listLowStockAlerts,
  rebuildInventory,
  listMovements,
  getProductStock,
  cleanupZeroStock,
  releaseExpiredReservations,
} from '@/api/controllers/inventoryController'
import { AppError, ValidationError, NotFoundError } from '@/lib/errors'

// ─── テストユーティリティ / Test utilities ────────────────────

/**
 * モックリクエスト生成 / Mock request factory
 * 最小限の Request オブジェクト / Minimal Request object
 */
const mockReq = (overrides: Record<string, any> = {}) =>
  ({
    query: {},
    params: {},
    body: {},
    headers: {},
    user: undefined,
    ...overrides,
  }) as any

/**
 * モックレスポンス生成 / Mock response factory
 * json() と status() をスパイとして持つオブジェクト
 * Object with json() and status() as spies
 */
const mockRes = () => {
  const res: any = {
    json: vi.fn(),
    status: vi.fn(),
  }
  // status().json() チェーンを可能にする / Enable status().json() chaining
  res.status.mockReturnValue(res)
  return res
}

// ─── listStock ────────────────────────────────────────────────

describe('listStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('フィルタなしで listStock を呼び出し、結果を返す / calls listStock without filters and returns result', async () => {
    // Arrange
    const fakeQuants = [{ productId: 'p1', quantity: 10 }]
    vi.mocked(inventoryService.listStock).mockResolvedValue(fakeQuants as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listStock(req, res)

    // Assert: サービスが正しい引数で呼ばれたか / service called with correct args
    // コントローラーは常に page と limit を渡す / Controller always passes page and limit
    expect(inventoryService.listStock).toHaveBeenCalledWith({
      productId: undefined,
      productSku: undefined,
      locationId: undefined,
      showZero: false,
      locationIds: undefined,
      page: 1,
      limit: 50,
    })
    // Assert: レスポンスにデータが含まれるか / response contains data
    expect(res.json).toHaveBeenCalledWith(fakeQuants)
  })

  it('クエリパラメータをサービスに渡す / passes query parameters to service', async () => {
    // Arrange
    vi.mocked(inventoryService.listStock).mockResolvedValue([] as any)
    vi.mocked(getWarehouseFilter).mockReturnValue([])

    const req = mockReq({
      query: {
        productId: 'prod-123',
        productSku: ' SKU-001 ',
        locationId: 'loc-abc',
        showZero: 'true',
      },
    })
    const res = mockRes()

    // Act
    await listStock(req, res)

    // Assert: 文字列トリムが適用されているか / string trimming applied
    // コントローラーは page と limit も渡す / Controller also passes page and limit
    expect(inventoryService.listStock).toHaveBeenCalledWith({
      productId: 'prod-123',
      productSku: 'SKU-001',
      locationId: 'loc-abc',
      showZero: true,
      locationIds: undefined,
      page: 1,
      limit: 50,
    })
  })

  it('倉庫フィルタが設定されている場合、Locationクエリを実行する / queries Location when warehouse filter is set', async () => {
    // Arrange
    vi.mocked(getWarehouseFilter).mockReturnValue(['wh-1'])
    const fakeLocs = [{ _id: { toString: () => 'loc-1' } }, { _id: { toString: () => 'loc-2' } }]
    vi.mocked(Location.find).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeLocs) }),
    } as any)
    vi.mocked(inventoryService.listStock).mockResolvedValue([] as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listStock(req, res)

    // Assert: ロケーションIDが渡されるか / locationIds passed to service
    expect(inventoryService.listStock).toHaveBeenCalledWith(
      expect.objectContaining({ locationIds: ['loc-1', 'loc-2'] }),
    )
  })

  it('サービスが AppError をスローした場合、正しいステータスコードを返す / returns correct status code when service throws AppError', async () => {
    // Arrange
    vi.mocked(getWarehouseFilter).mockReturnValue([])
    const error = new AppError('在庫エラー', 422, 'INVENTORY_ERROR')
    vi.mocked(inventoryService.listStock).mockRejectedValue(error)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listStock(req, res)

    // Assert: AppError のステータスコードが使われる / AppError statusCode is used
    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '在庫エラー', code: 'INVENTORY_ERROR' }),
    )
  })

  it('予期しないエラーの場合 500 を返す / returns 500 for unexpected errors', async () => {
    // Arrange
    vi.mocked(getWarehouseFilter).mockReturnValue([])
    vi.mocked(inventoryService.listStock).mockRejectedValue(new Error('DB crashed'))

    const req = mockReq()
    const res = mockRes()

    // Act
    await listStock(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'DB crashed' }),
    )
  })
})

// ─── adjustStock ──────────────────────────────────────────────

describe('adjustStock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ボディパラメータをサービスに渡し、結果を返す / passes body parameters to service and returns result', async () => {
    // Arrange
    const payload = {
      productId: 'p1',
      locationId: 'l1',
      lotId: 'lot1',
      adjustQuantity: 5,
      memo: 'test adjustment',
    }
    const fakeResult = { message: '調整完了', moveNumber: 'MV-001' }
    vi.mocked(inventoryService.adjustStock).mockResolvedValue(fakeResult as any)

    const req = mockReq({ body: payload })
    const res = mockRes()

    // Act
    await adjustStock(req, res)

    // Assert: サービスに正しい引数が渡される / correct args passed to service
    expect(inventoryService.adjustStock).toHaveBeenCalledWith(payload)
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('ValidationError の場合 400 を返す / returns 400 for ValidationError', async () => {
    // Arrange
    vi.mocked(inventoryService.adjustStock).mockRejectedValue(
      new ValidationError('数量が不正', { field: 'adjustQuantity' }),
    )

    const req = mockReq({ body: { productId: 'p1', locationId: 'l1', adjustQuantity: -999 } })
    const res = mockRes()

    // Act
    await adjustStock(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '数量が不正', code: 'VALIDATION_ERROR' }),
    )
  })

  it('NotFoundError の場合 404 を返す / returns 404 for NotFoundError', async () => {
    // Arrange
    vi.mocked(inventoryService.adjustStock).mockRejectedValue(
      new NotFoundError('商品が見つかりません'),
    )

    const req = mockReq({ body: { productId: 'nonexistent', locationId: 'l1', adjustQuantity: 1 } })
    const res = mockRes()

    // Act
    await adjustStock(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '商品が見つかりません' }),
    )
  })
})

// ─── transferStock ────────────────────────────────────────────

describe('transferStock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('在庫移動パラメータをサービスに渡す / passes transfer parameters to service', async () => {
    // Arrange
    const payload = {
      productId: 'p1',
      fromLocationId: 'loc-from',
      toLocationId: 'loc-to',
      quantity: 3,
      lotId: 'lot-1',
      memo: '移動メモ',
    }
    const fakeResult = { message: '移動完了', moveNumber: 'MV-002' }
    vi.mocked(inventoryService.transferStock).mockResolvedValue(fakeResult as any)

    const req = mockReq({ body: payload })
    const res = mockRes()

    // Act
    await transferStock(req, res)

    // Assert
    expect(inventoryService.transferStock).toHaveBeenCalledWith(payload)
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange: バリデーションを通過する有効なボディを渡す / Pass valid body to pass controller validation
    vi.mocked(inventoryService.transferStock).mockRejectedValue(new Error('move failed'))

    const req = mockReq({
      body: {
        productId: 'p1',
        fromLocationId: 'loc-from',
        toLocationId: 'loc-to',
        quantity: 1,
      },
    })
    const res = mockRes()

    // Act
    await transferStock(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'move failed' }),
    )
  })
})

// ─── bulkAdjustStock ──────────────────────────────────────────

describe('bulkAdjustStock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adjustments 配列をサービスに渡す / passes adjustments array to service', async () => {
    // Arrange: コントローラーが検証する productId, locationId, adjustQuantity を使用する
    // Use productId, locationId, adjustQuantity which the controller validates
    const adjustments = [
      { productId: 'prod-A', locationId: 'loc-A01', adjustQuantity: 10 },
      { productId: 'prod-B', locationId: 'loc-B01', adjustQuantity: 5 },
    ]
    const fakeResult = { message: '一括調整完了', successCount: 2, failCount: 0, errors: [] }
    vi.mocked(inventoryService.bulkAdjustStock).mockResolvedValue(fakeResult as any)

    const req = mockReq({ body: { adjustments } })
    const res = mockRes()

    // Act
    await bulkAdjustStock(req, res)

    // Assert: サービスに配列がそのまま渡される / array passed as-is to service
    expect(inventoryService.bulkAdjustStock).toHaveBeenCalledWith(adjustments)
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('一部失敗がある結果もそのまま返す / returns result with partial failures', async () => {
    // Arrange: バリデーションを通過する有効な配列を渡す / Pass valid array to pass controller validation
    const fakeResult = {
      message: '一括調整完了（エラーあり）',
      successCount: 1,
      failCount: 1,
      errors: ['SKU-X が見つかりません'],
    }
    vi.mocked(inventoryService.bulkAdjustStock).mockResolvedValue(fakeResult as any)

    const req = mockReq({ body: { adjustments: [{ productId: 'prod-X', locationId: 'loc-X', adjustQuantity: 1 }] } })
    const res = mockRes()

    // Act
    await bulkAdjustStock(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('サービスが AppError をスローした場合、適切なステータスを返す / returns proper status for AppError', async () => {
    // Arrange
    vi.mocked(inventoryService.bulkAdjustStock).mockRejectedValue(
      new ValidationError('入力データが不正'),
    )

    const req = mockReq({ body: { adjustments: null } })
    const res = mockRes()

    // Act
    await bulkAdjustStock(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

// ─── listLowStockAlerts ───────────────────────────────────────

describe('listLowStockAlerts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('サービスを引数なしで呼び出し、アラートリストを返す / calls service with no args and returns alerts', async () => {
    // Arrange
    const fakeAlerts = [{ productSku: 'SKU-1', currentStock: 2, safetyStock: 10 }]
    vi.mocked(inventoryService.listLowStockAlerts).mockResolvedValue(fakeAlerts as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await listLowStockAlerts(req, res)

    // Assert
    expect(inventoryService.listLowStockAlerts).toHaveBeenCalledOnce()
    expect(res.json).toHaveBeenCalledWith(fakeAlerts)
  })

  it('空のアラートリストも正常に返す / returns empty alert list normally', async () => {
    // Arrange
    vi.mocked(inventoryService.listLowStockAlerts).mockResolvedValue([])

    const req = mockReq()
    const res = mockRes()

    // Act
    await listLowStockAlerts(req, res)

    // Assert
    expect(res.json).toHaveBeenCalledWith([])
    expect(res.status).not.toHaveBeenCalled()
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(inventoryService.listLowStockAlerts).mockRejectedValue(new Error('query failed'))

    const req = mockReq()
    const res = mockRes()

    // Act
    await listLowStockAlerts(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── rebuildInventory ─────────────────────────────────────────

describe('rebuildInventory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('?fix=true のとき rebuildInventory(true) を呼ぶ / calls rebuildInventory(true) when ?fix=true', async () => {
    // Arrange
    const fakeResult = { fixed: 3, discrepancies: [] }
    vi.mocked(inventoryService.rebuildInventory).mockResolvedValue(fakeResult as any)

    const req = mockReq({ query: { fix: 'true' } })
    const res = mockRes()

    // Act
    await rebuildInventory(req, res)

    // Assert: fix フラグが true で渡される / fix flag passed as true
    expect(inventoryService.rebuildInventory).toHaveBeenCalledWith(true)
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('?fix=false のとき rebuildInventory(false) を呼ぶ / calls rebuildInventory(false) when ?fix=false', async () => {
    // Arrange
    vi.mocked(inventoryService.rebuildInventory).mockResolvedValue({ fixed: 0, discrepancies: [] } as any)

    const req = mockReq({ query: { fix: 'false' } })
    const res = mockRes()

    // Act
    await rebuildInventory(req, res)

    // Assert: デフォルトは report-only / default is report-only
    expect(inventoryService.rebuildInventory).toHaveBeenCalledWith(false)
  })

  it('?fix パラメータなしのとき false を渡す / passes false when ?fix param is absent', async () => {
    // Arrange
    vi.mocked(inventoryService.rebuildInventory).mockResolvedValue({} as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await rebuildInventory(req, res)

    // Assert: fix が指定されていない場合は false / false when fix not specified
    expect(inventoryService.rebuildInventory).toHaveBeenCalledWith(false)
  })

  it('エラー時に 500 を返す / returns 500 on error', async () => {
    // Arrange
    vi.mocked(inventoryService.rebuildInventory).mockRejectedValue(new Error('rebuild failed'))

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await rebuildInventory(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'rebuild failed' }),
    )
  })
})

// ─── listMovements ────────────────────────────────────────────

describe('listMovements', () => {
  beforeEach(() => vi.clearAllMocks())

  it('クエリパラメータをフィルタとページネーションに変換して渡す / converts query params to filters and pagination', async () => {
    // Arrange
    const fakeResult = { items: [], total: 0, page: 1, limit: 20 }
    vi.mocked(inventoryService.listMovements).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      query: { productId: 'p1', moveType: 'in', state: 'done', page: '2', limit: '20' },
    })
    const res = mockRes()

    // Act
    await listMovements(req, res)

    // Assert: フィルタとページネーションが正しく変換される / filters and pagination correctly converted
    expect(inventoryService.listMovements).toHaveBeenCalledWith(
      { productId: 'p1', moveType: 'in', state: 'done' },
      { page: 2, limit: 20 },
    )
    expect(res.json).toHaveBeenCalledWith(fakeResult)
  })

  it('無効なページ番号は undefined として扱う / treats invalid page number as undefined', async () => {
    // Arrange
    vi.mocked(inventoryService.listMovements).mockResolvedValue({ items: [] } as any)

    const req = mockReq({ query: { page: 'invalid', limit: 'abc' } })
    const res = mockRes()

    // Act
    await listMovements(req, res)

    // Assert: Number('invalid') = NaN → || undefined = undefined
    expect(inventoryService.listMovements).toHaveBeenCalledWith(
      expect.any(Object),
      { page: undefined, limit: undefined },
    )
  })
})

// ─── getProductStock ──────────────────────────────────────────

describe('getProductStock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('productId パラメータをサービスに渡す / passes productId param to service', async () => {
    // Arrange
    const fakeQuants = [{ productId: 'p1', locationId: 'l1', quantity: 10 }]
    vi.mocked(inventoryService.getProductStock).mockResolvedValue(fakeQuants as any)

    const req = mockReq({ params: { productId: 'p1' } })
    const res = mockRes()

    // Act
    await getProductStock(req, res)

    // Assert
    expect(inventoryService.getProductStock).toHaveBeenCalledWith('p1')
    expect(res.json).toHaveBeenCalledWith(fakeQuants)
  })

  it('NotFoundError の場合 404 を返す / returns 404 for NotFoundError', async () => {
    // Arrange
    vi.mocked(inventoryService.getProductStock).mockRejectedValue(
      new NotFoundError('商品が見つかりません'),
    )

    const req = mockReq({ params: { productId: 'unknown' } })
    const res = mockRes()

    // Act
    await getProductStock(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '商品が見つかりません' }),
    )
  })
})

// ─── cleanupZeroStock ─────────────────────────────────────────

describe('cleanupZeroStock', () => {
  beforeEach(() => vi.clearAllMocks())

  it('削除件数をレスポンスに含める / includes deleted count in response', async () => {
    // Arrange
    vi.mocked(inventoryService.cleanupZeroStock).mockResolvedValue({ deletedCount: 42 } as any)

    const req = mockReq()
    const res = mockRes()

    // Act
    await cleanupZeroStock(req, res)

    // Assert: メッセージに件数が含まれる / count included in message
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ deletedCount: 42 }),
    )
  })
})

// ─── releaseExpiredReservations ───────────────────────────────

describe('releaseExpiredReservations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('timeoutMinutes クエリをサービスに渡す / passes timeoutMinutes query to service', async () => {
    // Arrange
    vi.mocked(inventoryService.releaseExpiredReservations).mockResolvedValue({
      releasedCount: 5,
    } as any)

    const req = mockReq({ query: { timeoutMinutes: '60' } })
    const res = mockRes()

    // Act
    await releaseExpiredReservations(req, res)

    // Assert: 文字列 '60' が数値 60 に変換される / '60' string converted to 60 number
    expect(inventoryService.releaseExpiredReservations).toHaveBeenCalledWith(60)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ releasedCount: 5 }),
    )
  })

  it('timeoutMinutes 未指定の場合はデフォルト 30 を使う / uses default 30 when timeoutMinutes not specified', async () => {
    // Arrange
    vi.mocked(inventoryService.releaseExpiredReservations).mockResolvedValue({
      releasedCount: 0,
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await releaseExpiredReservations(req, res)

    // Assert: デフォルト値 30 が使われる / default value 30 is used
    expect(inventoryService.releaseExpiredReservations).toHaveBeenCalledWith(30)
  })
})
