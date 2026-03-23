/**
 * useApiCache ユニットテスト / API缓存 composable 单元测试
 *
 * cachedFetch, invalidateCache の検証
 * 验证 cachedFetch, invalidateCache
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cachedFetch, invalidateCache, useApiCache } from '../useApiCache'

describe('cachedFetch / キャッシュ付きフェッチ', () => {
  beforeEach(() => {
    invalidateCache()
  })

  it('初回フェッチでデータを返しキャッシュする / 首次获取返回数据并缓存', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] })
    const result = await cachedFetch('test-key', fetcher)
    expect(result).toEqual({ items: [1, 2, 3] })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('TTL内の2回目はキャッシュを返す / TTL内第二次返回缓存', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1] })
    await cachedFetch('cache-hit', fetcher, 10000)
    const result = await cachedFetch('cache-hit', fetcher, 10000)
    expect(result).toEqual({ items: [1] })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('フェッチ失敗時にエラーをスローする / 获取失败时抛出错误', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network error'))
    await expect(cachedFetch('error-key', fetcher)).rejects.toThrow('Network error')
  })

  it('同一キーの同時リクエストをデデュプリケートする / 去重同一键的并发请求', async () => {
    let resolvePromise: (v: any) => void
    const fetcher = vi.fn().mockImplementation(
      () => new Promise(resolve => { resolvePromise = resolve }),
    )

    const p1 = cachedFetch('dedup-key', fetcher)
    const p2 = cachedFetch('dedup-key', fetcher)

    resolvePromise!({ data: 'ok' })

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toEqual({ data: 'ok' })
    expect(r2).toEqual({ data: 'ok' })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})

describe('invalidateCache / キャッシュ無効化', () => {
  beforeEach(() => {
    invalidateCache()
  })

  it('パターンなしで全キャッシュをクリアする / 无 pattern 时清除全部缓存', async () => {
    const fetcher = vi.fn().mockResolvedValue('data')
    await cachedFetch('a', fetcher)
    await cachedFetch('b', fetcher)
    invalidateCache()

    await cachedFetch('a', fetcher)
    // 再取得が必要なのでfetcherが再呼び出しされる / 需要重新获取所以 fetcher 被再次调用
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('パターンに一致するキーのみクリアする / 只清除匹配 pattern 的键', async () => {
    const fetcherA = vi.fn().mockResolvedValue('dataA')
    const fetcherB = vi.fn().mockResolvedValue('dataB')
    await cachedFetch('stock-list', fetcherA)
    await cachedFetch('order-list', fetcherB)

    invalidateCache('stock')

    await cachedFetch('stock-list', fetcherA)
    await cachedFetch('order-list', fetcherB)
    // stock-list は再取得 / stock-list 重新获取
    expect(fetcherA).toHaveBeenCalledTimes(2)
    // order-list はキャッシュヒット / order-list 缓存命中
    expect(fetcherB).toHaveBeenCalledTimes(1)
  })
})

describe('useApiCache composable', () => {
  it('isLoading の状態を管理する / 管理 isLoading 状态', async () => {
    invalidateCache()
    const { fetch: cacheFetch, isLoading } = useApiCache()
    expect(isLoading.value).toBe(false)

    const fetcher = vi.fn().mockResolvedValue('result')
    await cacheFetch('loading-test', fetcher)
    expect(isLoading.value).toBe(false) // fetch完了後はfalse / fetch 完成后为 false
  })
})
