/**
 * inventory API ユニットテスト / 库存 API 单元测试
 *
 * 在庫 API の検証
 * 验证库存 API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/base', () => ({
  getApiBaseUrl: () => 'http://localhost:3000/api',
}))

const mockApiFetch = vi.fn()
vi.mock('@/api/http', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}))

import { fetchStock, adjustStock, fetchMovements, fetchLowStockAlerts, fetchInventoryOverview } from '../inventory'

describe('fetchStock / 在庫取得', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('在庫一覧を返す / 返回库存列表', async () => {
    const mockData = [{ productId: 'p1', quantity: 100 }]
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })
    const result = await fetchStock()
    expect(result).toEqual(mockData)
  })

  it('フィルタパラメータをURLに含める / URL 中包含筛选参数', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
    await fetchStock({ productSku: 'SKU-001', showZero: true })
    const callUrl = mockApiFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('productSku=SKU-001')
    expect(callUrl).toContain('showZero=true')
  })

  it('エラー時にスローする / 错误时抛出', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'Failed' }),
    })
    await expect(fetchStock()).rejects.toThrow('Failed')
  })
})

describe('adjustStock / 在庫調整', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('在庫調整リクエストを送信する / 发送库存调整请求', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'ok', moveNumber: 'MV-001' }),
    })
    const result = await adjustStock({
      productId: 'p1',
      locationId: 'loc1',
      adjustQuantity: 10,
    })
    expect(result.moveNumber).toBe('MV-001')
    const options = mockApiFetch.mock.calls[0][1]
    expect(options.method).toBe('POST')
  })
})

describe('fetchMovements / 在庫移動取得', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('移動一覧を返す / 返回移动列表', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0, page: 1, limit: 20 }),
    })
    const result = await fetchMovements({ page: 1, limit: 20 })
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})

describe('fetchLowStockAlerts / 在庫不足アラート取得', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('アラート一覧を返す / 返回警报列表', async () => {
    const alerts = [{ productId: 'p1', currentStock: 5, minStock: 10 }]
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(alerts),
    })
    const result = await fetchLowStockAlerts()
    expect(result).toEqual(alerts)
  })
})

describe('fetchInventoryOverview / 在庫概況取得', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('概況データを返す（デフォルト値付き）/ 返回概况数据（带默认值）', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ productCount: 50, totalQuantity: 1000 }),
    })
    const result = await fetchInventoryOverview()
    expect(result.productCount).toBe(50)
    expect(result.totalQuantity).toBe(1000)
    // デフォルト値が適用される / 应用默认值
    expect(result.lowStockCount).toBe(0)
    expect(result.expiringDetails).toEqual([])
  })
})
