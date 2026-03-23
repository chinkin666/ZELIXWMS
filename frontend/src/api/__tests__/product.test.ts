/**
 * product API ユニットテスト / 商品 API 单元测试
 *
 * 商品 CRUD API の検証
 * 验证商品 CRUD API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/base', () => ({
  getApiBaseUrl: () => 'http://localhost:3000/api',
}))

const mockApiFetch = vi.fn()
vi.mock('@/api/http', () => ({
  apiFetch: (...args: any[]) => mockApiFetch(...args),
}))

import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../product'

describe('fetchProducts / 商品一覧取得', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('配列レスポンスを返す / 返回数组响应', async () => {
    const mockData = [{ sku: 'SKU-001', name: 'テスト商品' }]
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })
    const result = await fetchProducts()
    expect(result).toEqual(mockData)
  })

  it('フィルタ付きでクエリパラメータを送信する / 带筛选条件发送查询参数', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
    await fetchProducts({ sku: 'SKU-001', name: 'test' })
    const callUrl = mockApiFetch.mock.calls[0][0] as string
    expect(callUrl).toContain('sku=SKU-001')
    expect(callUrl).toContain('name=test')
  })

  it('エラーレスポンスでスローする / 错误响应时抛出', async () => {
    mockApiFetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
    })
    await expect(fetchProducts()).rejects.toThrow('商品の取得に失敗しました')
  })
})

describe('createProduct / 商品作成', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('正常に商品を作成する / 正常创建商品', async () => {
    const newProduct = { sku: 'NEW-001', name: '新商品' }
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ...newProduct, _id: 'p1' }),
    })
    const result = await createProduct(newProduct as any)
    expect(result._id).toBe('p1')
    // POST メソッドで呼ばれる / 使用 POST 方法调用
    const options = mockApiFetch.mock.calls[0][1]
    expect(options.method).toBe('POST')
  })
})

describe('updateProduct / 商品更新', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('正常に商品を更新する / 正常更新商品', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ _id: 'p1', name: '更新後' }),
    })
    const result = await updateProduct('p1', { name: '更新後' } as any)
    expect(result.name).toBe('更新後')
    const options = mockApiFetch.mock.calls[0][1]
    expect(options.method).toBe('PUT')
  })
})

describe('deleteProduct / 商品削除', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('正常に商品を削除する / 正常删除商品', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    await expect(deleteProduct('p1')).resolves.not.toThrow()
    const options = mockApiFetch.mock.calls[0][1]
    expect(options.method).toBe('DELETE')
  })
})
