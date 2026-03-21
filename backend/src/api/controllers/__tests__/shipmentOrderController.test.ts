/**
 * shipmentOrderController 统合テスト / Shipment Order Controller Integration Tests
 *
 * HTTPリクエストがコントローラーからサービス層へ正しく流れるかを検証する。
 * Verifies that HTTP requests flow correctly from controller to service layer.
 *
 * モック方針 / Mock strategy:
 * - shipmentOrderService 全体をモック（DB・外部依存を排除）
 *   Mock entire shipmentOrderService (eliminate DB and external dependencies)
 * - autoProcessingEngine をモック
 *   Mock autoProcessingEngine
 * - req/res を軽量オブジェクトで代替
 *   Replace req/res with lightweight objects
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） ───────────────────────────
// Module mock declarations (hoisted)

vi.mock('@/services/shipmentOrderService', () => ({
  createOrders: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  deleteOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
  updateOrderStatusBulk: vi.fn(),
  bulkUpdateOrders: vi.fn(),
  searchOrders: vi.fn(),
  getOrderById: vi.fn(),
  getOrdersByIds: vi.fn(),
  filterPayloadSchema: {
    safeParse: vi.fn(() => ({ success: true, data: {} })),
  },
}))

vi.mock('@/services/autoProcessingEngine', () => ({
  processOrderEventBulk: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/models/shipmentOrder', () => ({
  ShipmentOrder: {
    find: vi.fn(),
    bulkWrite: vi.fn(),
  },
}))

vi.mock('@/models/carrier', () => ({
  Carrier: {
    collection: { find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }) },
  },
}))

vi.mock('@/data/builtInCarriers', () => ({
  isBuiltInCarrierId: vi.fn(() => false),
  getBuiltInCarrier: vi.fn(() => undefined),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

import * as shipmentOrderService from '@/services/shipmentOrderService'
import {
  listOrders,
  getOrder,
  createManualOrdersBulk,
  updateOrder,
  deleteOrder,
  deleteOrdersBulk,
  handleStatus,
  handleStatusBulk,
  bulkUpdateOrders,
  getOrdersByIds,
} from '@/api/controllers/shipmentOrderController'
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

// ─── listOrders / searchOrders ────────────────────────────────

describe('listOrders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ページネーションなしで全件リストを返す / returns full list without pagination', async () => {
    // Arrange: mode=list で配列を返す / return array in list mode
    const fakeOrders = [{ _id: 'o1', orderNumber: 'ORD-001' }]
    vi.mocked(shipmentOrderService.searchOrders).mockResolvedValue({
      mode: 'list',
      items: fakeOrders,
    } as any)

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listOrders(req, res)

    // Assert: mode=list のとき配列直接レスポンス / direct array response in list mode
    expect(res.json).toHaveBeenCalledWith(fakeOrders)
  })

  it('page パラメータがあるとき paginated モードで返す / returns paginated response when page param exists', async () => {
    // Arrange: mode=paginated でオブジェクトを返す / return object in paginated mode
    const fakeResult = {
      mode: 'paginated',
      items: [{ _id: 'o1' }],
      total: 50,
      page: 2,
      limit: 10,
    }
    vi.mocked(shipmentOrderService.searchOrders).mockResolvedValue(fakeResult as any)

    const req = mockReq({ query: { page: '2', limit: '10' } })
    const res = mockRes()

    // Act
    await listOrders(req, res)

    // Assert: paginated 形式のレスポンス / paginated format response
    expect(res.json).toHaveBeenCalledWith({
      items: fakeResult.items,
      total: 50,
      page: 2,
      limit: 10,
    })
  })

  it('q パラメータが不正な JSON の場合 400 を返す / returns 400 for invalid q JSON', async () => {
    // Arrange: 不正な JSON 文字列 / invalid JSON string
    const req = mockReq({ query: { q: '{not valid json' } })
    const res = mockRes()

    // Act
    await listOrders(req, res)

    // Assert: JSON パースエラーは 400 / JSON parse error is 400
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid filter JSON' })
    expect(shipmentOrderService.searchOrders).not.toHaveBeenCalled()
  })

  it('limit は最大 200 にクランプされる / clamps limit to max 200', async () => {
    // Arrange: コントローラーの上限は 200（メモリ保護） / Controller cap is 200 (memory protection)
    vi.mocked(shipmentOrderService.searchOrders).mockResolvedValue({
      mode: 'paginated',
      items: [],
      total: 0,
      page: 1,
      limit: 200,
    } as any)

    const req = mockReq({ query: { page: '1', limit: '99999' } })
    const res = mockRes()

    // Act
    await listOrders(req, res)

    // Assert: limit は 200 以下に制限される / limit capped at 200
    expect(shipmentOrderService.searchOrders).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 200 }),
    )
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.searchOrders).mockRejectedValue(new Error('DB error'))

    const req = mockReq({ query: {} })
    const res = mockRes()

    // Act
    await listOrders(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
  })
})

// ─── getOrder ─────────────────────────────────────────────────

describe('getOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('id パラメータをサービスに渡し、注文を返す / passes id param to service and returns order', async () => {
    // Arrange
    const fakeOrder = { _id: 'order-1', orderNumber: 'ORD-001' }
    vi.mocked(shipmentOrderService.getOrderById).mockResolvedValue(fakeOrder as any)

    const req = mockReq({ params: { id: 'order-1' } })
    const res = mockRes()

    // Act
    await getOrder(req, res)

    // Assert
    expect(shipmentOrderService.getOrderById).toHaveBeenCalledWith('order-1')
    expect(res.json).toHaveBeenCalledWith(fakeOrder)
  })

  it('NotFoundError の場合 404 を返す / returns 404 for NotFoundError', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.getOrderById).mockRejectedValue(
      new NotFoundError('注文が見つかりません'),
    )

    const req = mockReq({ params: { id: 'nonexistent' } })
    const res = mockRes()

    // Act
    await getOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '注文が見つかりません' }),
    )
  })
})

// ─── createManualOrdersBulk ───────────────────────────────────

describe('createManualOrdersBulk', () => {
  beforeEach(() => vi.clearAllMocks())

  it('全件成功のとき 201 を返す / returns 201 when all orders created successfully', async () => {
    // Arrange: 全件成功 / all success
    const fakeResult = { successCount: 2, failureCount: 0, orders: [] }
    vi.mocked(shipmentOrderService.createOrders).mockResolvedValue(fakeResult as any)

    const req = mockReq({ body: [{ orderNumber: 'ORD-A' }, { orderNumber: 'ORD-B' }] })
    const res = mockRes()

    // Act
    await createManualOrdersBulk(req, res)

    // Assert: 全件成功は 201 / all success returns 201
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: fakeResult }),
    )
  })

  it('一部失敗のとき 207 を返す / returns 207 when some orders fail', async () => {
    // Arrange: 部分成功 / partial success
    const fakeResult = { successCount: 1, failureCount: 1, orders: [] }
    vi.mocked(shipmentOrderService.createOrders).mockResolvedValue(fakeResult as any)

    const req = mockReq({ body: [] })
    const res = mockRes()

    // Act
    await createManualOrdersBulk(req, res)

    // Assert: 部分成功は 207 Multi-Status / partial success returns 207
    expect(res.status).toHaveBeenCalledWith(207)
  })

  it('全件失敗のとき 500 を返す / returns 500 when all orders fail', async () => {
    // Arrange: 全件失敗 / all failure
    const fakeResult = { successCount: 0, failureCount: 3, orders: [] }
    vi.mocked(shipmentOrderService.createOrders).mockResolvedValue(fakeResult as any)

    const req = mockReq({ body: [] })
    const res = mockRes()

    // Act
    await createManualOrdersBulk(req, res)

    // Assert: 全件失敗は 500 / all failure returns 500
    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('ValidationError の場合 400 を返す / returns 400 for ValidationError', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.createOrders).mockRejectedValue(
      new ValidationError('注文番号は必須', { field: 'orderNumber' }),
    )

    const req = mockReq({ body: [{}] })
    const res = mockRes()

    // Act
    await createManualOrdersBulk(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '注文番号は必須' }),
    )
  })
})

// ─── updateOrder ──────────────────────────────────────────────

describe('updateOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('id とボディをサービスに渡し、更新結果を返す / passes id and body to service, returns update result', async () => {
    // Arrange
    const fakeUpdated = { _id: 'order-1', orderNumber: 'ORD-001', status: { picking: { isDone: true } } }
    vi.mocked(shipmentOrderService.updateOrder).mockResolvedValue(fakeUpdated as any)

    const req = mockReq({
      params: { id: 'order-1' },
      body: { memo: '更新メモ' },
    })
    const res = mockRes()

    // Act
    await updateOrder(req, res)

    // Assert
    expect(shipmentOrderService.updateOrder).toHaveBeenCalledWith('order-1', { memo: '更新メモ' })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: fakeUpdated }),
    )
  })

  it('NotFoundError の場合 404 を返す / returns 404 for NotFoundError', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.updateOrder).mockRejectedValue(
      new NotFoundError('注文が見つかりません'),
    )

    const req = mockReq({ params: { id: 'bad-id' }, body: {} })
    const res = mockRes()

    // Act
    await updateOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('ValidationError の場合 400 を返す / returns 400 for ValidationError', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.updateOrder).mockRejectedValue(
      new ValidationError('フィールドが不正'),
    )

    const req = mockReq({ params: { id: 'order-1' }, body: { invalidField: true } })
    const res = mockRes()

    // Act
    await updateOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'フィールドが不正' }),
    )
  })
})

// ─── deleteOrder ──────────────────────────────────────────────

describe('deleteOrder', () => {
  beforeEach(() => vi.clearAllMocks())

  it('id をサービスに渡し、削除結果を返す / passes id to service and returns result', async () => {
    // Arrange
    const fakeResult = { deletedCount: 1 }
    vi.mocked(shipmentOrderService.deleteOrder).mockResolvedValue(fakeResult as any)

    const req = mockReq({ params: { id: 'order-1' } })
    const res = mockRes()

    // Act
    await deleteOrder(req, res)

    // Assert
    expect(shipmentOrderService.deleteOrder).toHaveBeenCalledWith('order-1')
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: fakeResult }),
    )
  })

  it('NotFoundError の場合 404 を返す / returns 404 for NotFoundError', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.deleteOrder).mockRejectedValue(
      new NotFoundError('削除対象が見つかりません'),
    )

    const req = mockReq({ params: { id: 'ghost-id' } })
    const res = mockRes()

    // Act
    await deleteOrder(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '削除対象が見つかりません' }),
    )
  })
})

// ─── deleteOrdersBulk ─────────────────────────────────────────

describe('deleteOrdersBulk', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ids 配列をサービスに渡し、削除結果を返す / passes ids array to service and returns result', async () => {
    // Arrange
    const ids = ['id-1', 'id-2', 'id-3']
    const fakeResult = { deletedCount: 3 }
    vi.mocked(shipmentOrderService.deleteOrders).mockResolvedValue(fakeResult as any)

    const req = mockReq({ body: { ids } })
    const res = mockRes()

    // Act
    await deleteOrdersBulk(req, res)

    // Assert
    expect(shipmentOrderService.deleteOrders).toHaveBeenCalledWith(ids)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ deletedCount: 3 }),
    )
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.deleteOrders).mockRejectedValue(new Error('bulk delete failed'))

    const req = mockReq({ body: { ids: [] } })
    const res = mockRes()

    // Act
    await deleteOrdersBulk(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'bulk delete failed' }),
    )
  })
})

// ─── handleStatus (single order) ─────────────────────────────

describe('handleStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('action と statusType をサービスに渡す / passes action and statusType to service', async () => {
    // Arrange
    const fakeUpdated = { _id: 'o1', status: {} }
    vi.mocked(shipmentOrderService.updateOrderStatus).mockResolvedValue(fakeUpdated as any)

    const req = mockReq({
      params: { id: 'o1' },
      body: { action: 'complete', statusType: 'picking' },
    })
    const res = mockRes()

    // Act
    await handleStatus(req, res)

    // Assert
    expect(shipmentOrderService.updateOrderStatus).toHaveBeenCalledWith('o1', {
      action: 'complete',
      statusType: 'picking',
    })
    expect(res.json).toHaveBeenCalledWith(fakeUpdated)
  })

  it('AppError の場合、そのステータスコードを返す / returns AppError statusCode for AppError', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.updateOrderStatus).mockRejectedValue(
      new AppError('状態遷移エラー', 409, 'CONFLICT'),
    )

    const req = mockReq({ params: { id: 'o1' }, body: { action: 'cancel' } })
    const res = mockRes()

    // Act
    await handleStatus(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '状態遷移エラー' }),
    )
  })
})

// ─── handleStatusBulk ─────────────────────────────────────────

describe('handleStatusBulk', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ids, action, statusType を一括ステータス更新サービスに渡す / passes ids, action, statusType to bulk status service', async () => {
    // Arrange
    const ids = ['o1', 'o2']
    const fakeResult = { successCount: 2, failureCount: 0, errors: [] }
    vi.mocked(shipmentOrderService.updateOrderStatusBulk).mockResolvedValue(fakeResult as any)

    const req = mockReq({
      body: { ids, action: 'complete', statusType: 'packing' },
    })
    const res = mockRes()

    // Act
    await handleStatusBulk(req, res)

    // Assert
    expect(shipmentOrderService.updateOrderStatusBulk).toHaveBeenCalledWith(ids, {
      action: 'complete',
      statusType: 'packing',
    })
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bulk status operation completed', ...fakeResult }),
    )
  })

  it('ValidationError の場合 400 を返す / returns 400 for ValidationError', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.updateOrderStatusBulk).mockRejectedValue(
      new ValidationError('アクションが不正'),
    )

    const req = mockReq({ body: { ids: [], action: 'invalid' } })
    const res = mockRes()

    // Act
    await handleStatusBulk(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('空の ids でも正常に動作する / works correctly with empty ids', async () => {
    // Arrange: サービスは空配列でも動作する / service works with empty array
    vi.mocked(shipmentOrderService.updateOrderStatusBulk).mockResolvedValue({
      successCount: 0,
      failureCount: 0,
    } as any)

    const req = mockReq({ body: { ids: [], action: 'complete', statusType: 'shipping' } })
    const res = mockRes()

    // Act
    await handleStatusBulk(req, res)

    // Assert: サービスは呼ばれ、結果は正常に返る / service called, result returned normally
    expect(shipmentOrderService.updateOrderStatusBulk).toHaveBeenCalledWith([], expect.any(Object))
    expect(res.json).toHaveBeenCalled()
  })
})

// ─── bulkUpdateOrders ─────────────────────────────────────────

describe('bulkUpdateOrders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ids と updates をサービスに渡す / passes ids and updates to service', async () => {
    // Arrange
    const ids = ['o1', 'o2']
    const updates = { memo: '一括更新' }
    const fakeResult = { modifiedCount: 2 }
    vi.mocked(shipmentOrderService.bulkUpdateOrders).mockResolvedValue(fakeResult as any)

    const req = mockReq({ body: { ids, updates } })
    const res = mockRes()

    // Act
    await bulkUpdateOrders(req, res)

    // Assert
    expect(shipmentOrderService.bulkUpdateOrders).toHaveBeenCalledWith(ids, updates)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bulk update completed', ...fakeResult }),
    )
  })

  it('AppError の場合、適切なステータスを返す / returns proper status for AppError', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.bulkUpdateOrders).mockRejectedValue(
      new ValidationError('更新フィールドが不正'),
    )

    const req = mockReq({ body: { ids: ['o1'], updates: { badField: true } } })
    const res = mockRes()

    // Act
    await bulkUpdateOrders(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: '更新フィールドが不正' }),
    )
  })
})

// ─── getOrdersByIds ───────────────────────────────────────────

describe('getOrdersByIds', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ids と includeRawData をサービスに渡す / passes ids and includeRawData to service', async () => {
    // Arrange
    const ids = ['o1', 'o2']
    const fakeOrders = [{ _id: 'o1' }, { _id: 'o2' }]
    vi.mocked(shipmentOrderService.getOrdersByIds).mockResolvedValue(fakeOrders as any)

    const req = mockReq({ body: { ids, includeRawData: true } })
    const res = mockRes()

    // Act
    await getOrdersByIds(req, res)

    // Assert
    expect(shipmentOrderService.getOrdersByIds).toHaveBeenCalledWith(ids, true)
    expect(res.json).toHaveBeenCalledWith(fakeOrders)
  })

  it('ids が空配列のときエラーを返す / 空数组返回错误', async () => {
    // getOrdersByIds は空配列で ValidationError を投げる / 空数组抛出ValidationError
    vi.mocked(shipmentOrderService.getOrdersByIds).mockRejectedValue(
      new (await import('@/lib/errors')).ValidationError('Invalid request: ids array is required'),
    )

    const req = mockReq({ body: { ids: [], includeRawData: false } })
    const res = mockRes()

    await getOrdersByIds(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('サービスエラー時に 500 を返す / returns 500 on service error', async () => {
    // Arrange
    vi.mocked(shipmentOrderService.getOrdersByIds).mockRejectedValue(new Error('query failed'))

    const req = mockReq({ body: { ids: ['o1'] } })
    const res = mockRes()

    // Act
    await getOrdersByIds(req, res)

    // Assert
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'query failed' }),
    )
  })
})
