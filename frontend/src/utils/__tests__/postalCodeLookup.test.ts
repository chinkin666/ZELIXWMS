/**
 * postalCodeLookup ユニットテスト / 邮编查询工具函数单元测试
 *
 * lookupPostalCode の検証
 * 验证 lookupPostalCode
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { lookupPostalCode } from '../postalCodeLookup'

describe('lookupPostalCode / 郵便番号検索', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('7桁の郵便番号で住所を取得する / 用7位邮编获取地址', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ address1: '東京都', address2: '渋谷区', address3: '神宮前' }],
        }),
      ),
    )

    const result = await lookupPostalCode('1500001')
    expect(result).toEqual({
      prefecture: '東京都',
      city: '渋谷区',
      street: '神宮前',
    })
    // fetch URLに正しい郵便番号が含まれる / fetch URL 包含正确的邮编
    const callUrl = vi.mocked(globalThis.fetch).mock.calls[0]?.[0] as string
    expect(callUrl).toContain('zipcode=1500001')
  })

  it('ハイフン付き郵便番号の数字を抽出する / 提取带连字符邮编的数字', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ address1: '大阪府', address2: '大阪市', address3: '北区' }],
        }),
      ),
    )

    const result = await lookupPostalCode('530-0001')
    expect(result).not.toBeNull()
    const callUrl = vi.mocked(globalThis.fetch).mock.calls[0]?.[0] as string
    expect(callUrl).toContain('zipcode=5300001')
  })

  it('7桁でない場合はnullを返す / 不是7位时返回 null', async () => {
    const result = await lookupPostalCode('1234')
    expect(result).toBeNull()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it('結果なしの場合はnullを返す / 无结果时返回 null', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ results: null })),
    )

    const result = await lookupPostalCode('0000000')
    expect(result).toBeNull()
  })

  it('APIエラーの場合はnullを返す / API错误时返回 null', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'))

    const result = await lookupPostalCode('1500001')
    expect(result).toBeNull()
  })
})
