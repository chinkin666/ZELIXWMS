/**
 * shipmentOrders API ユニットテスト / 出荷指示 API 单元测试
 *
 * 出荷予定 CRUD API の検証
 * 验证出荷预定 CRUD API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/base', () => ({
  getApiBaseUrl: () => 'http://localhost:3000/api',
}))

const mockApiFetch = vi.fn()
vi.mock('@/api/http', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}))

import {
  ShipmentOrderBulkApiError,
  createShipmentOrdersBulk,
  fetchShipmentOrders,
  fetchShipmentOrder,
  deleteShipmentOrder,
  deleteShipmentOrdersBulk,
} from '../shipmentOrders'

describe('ShipmentOrderBulkApiError / 一括APIエラー', () => {
  it('status と errors を正しく設定する / 正确设置 status 和 errors', () => {
    const err = new ShipmentOrderBulkApiError('fail', { status: 400, errors: [{ message: 'bad' }] })
    expect(err.name).toBe('ShipmentOrderBulkApiError')
    expect(err.status).toBe(400)
    expect(err.errors).toHaveLength(1)
    expect(err).toBeInstanceOf(Error)
  })
})

describe('fetchShipmentOrders / 出荷予定一覧取得', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('正常レスポンス（配列）を返す / 返回正常响应（数组）', async () => {
    const mockData = [{ _id: '1', orderNumber: 'ORD-001' }]
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })
    const result = await fetchShipmentOrders()
    expect(result).toEqual(mockData)
  })

  it('正常レスポンス（ページ形式）を返す / 返回正常响应（分页格式）', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [{ _id: '1' }], total: 1 }),
    })
    const result = await fetchShipmentOrders()
    expect(result).toEqual([{ _id: '1' }])
  })

  it('エラーレスポンスでスローする / 错误响应时抛出', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      statusText: 'Server Error',
      json: () => Promise.resolve({}),
    })
    await expect(fetchShipmentOrders()).rejects.toThrow()
  })
})

describe('fetchShipmentOrder / 出荷予定取得', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('正常レスポンスを返す / 返回正常响应', async () => {
    const mockOrder = { _id: '123', orderNumber: 'ORD-123' }
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOrder),
    })
    const result = await fetchShipmentOrder('123')
    expect(result).toEqual(mockOrder)
  })
})

describe('createShipmentOrdersBulk / 一括作成', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('成功時に結果を返す / 成功时返回结果', async () => {
    const responseData = { message: 'ok', data: { total: 1, successCount: 1, failureCount: 0, successes: [], failures: [] } }
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseData),
    })
    const result = await createShipmentOrdersBulk({ items: [{ clientId: 'c1', order: {} }] })
    expect(result.message).toBe('ok')
  })

  it('失敗時にShipmentOrderBulkApiErrorをスローする / 失败时抛出 ShipmentOrderBulkApiError', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: () => Promise.resolve({ message: 'Validation failed', errors: [{ message: 'bad field' }] }),
    })
    await expect(createShipmentOrdersBulk({ items: [] })).rejects.toThrow(ShipmentOrderBulkApiError)
  })
})

describe('deleteShipmentOrdersBulk / 一括削除', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('空のIDリストでは即座に結果を返す / 空 ID 列表立即返回结果', async () => {
    const result = await deleteShipmentOrdersBulk([])
    expect(result).toEqual({ deletedCount: 0, requestedCount: 0 })
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
