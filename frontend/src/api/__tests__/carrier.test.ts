/**
 * carrier API ユニットテスト / 配送業者 API 单元测试
 *
 * 配送業者 CRUD API の検証
 * 验证配送业者 CRUD API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockHttp = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/api/http', () => ({
  http: mockHttp,
}))

import { fetchCarriers, createCarrier, updateCarrier, deleteCarrier } from '../carrier'

describe('fetchCarriers / 配送業者一覧取得', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('配列レスポンスを返す / 返回数组响应', async () => {
    const mockData = [{ _id: 'c1', code: 'YAMATO', name: 'ヤマト運輸' }]
    mockHttp.get.mockResolvedValue(mockData)
    const result = await fetchCarriers()
    expect(result).toEqual(mockData)
    expect(mockHttp.get).toHaveBeenCalledWith('/carriers', undefined)
  })

  it('フィルタ付きで呼び出す / 带筛选条件调用', async () => {
    mockHttp.get.mockResolvedValue([])
    await fetchCarriers({ code: 'YAMATO' })
    expect(mockHttp.get).toHaveBeenCalledWith('/carriers', { code: 'YAMATO' })
  })

  it('ラップされたレスポンスを処理する / 处理包装后的响应', async () => {
    mockHttp.get.mockResolvedValue({ items: [{ _id: 'c2' }] })
    const result = await fetchCarriers()
    expect(result).toEqual([{ _id: 'c2' }])
  })
})

describe('createCarrier / 配送業者作成', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('POST で配送業者を作成する / 使用 POST 创建配送业者', async () => {
    const payload = { code: 'NEW', name: '新規配送業者' }
    mockHttp.post.mockResolvedValue({ _id: 'c3', ...payload })
    const result = await createCarrier(payload as any)
    expect(result._id).toBe('c3')
    expect(mockHttp.post).toHaveBeenCalledWith('/carriers', payload)
  })
})

describe('updateCarrier / 配送業者更新', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('PUT で配送業者を更新する / 使用 PUT 更新配送业者', async () => {
    const payload = { code: 'UPD', name: '更新済み' }
    mockHttp.put.mockResolvedValue({ _id: 'c1', ...payload })
    const result = await updateCarrier('c1', payload as any)
    expect(result.name).toBe('更新済み')
    expect(mockHttp.put).toHaveBeenCalledWith('/carriers/c1', payload)
  })
})

describe('deleteCarrier / 配送業者削除', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('DELETE で配送業者を削除する / 使用 DELETE 删除配送业者', async () => {
    mockHttp.delete.mockResolvedValue(undefined)
    await deleteCarrier('c1')
    expect(mockHttp.delete).toHaveBeenCalledWith('/carriers/c1')
  })
})
