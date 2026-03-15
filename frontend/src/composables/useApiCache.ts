/**
 * API リクエストキャッシュ composable / API请求缓存 composable
 *
 * 同一リクエストの重複実行を防ぎ、短期間のキャッシュを提供する
 * 防止同一请求重复执行，提供短期缓存
 *
 * @example
 * const { cachedFetch } = useApiCache()
 * const data = await cachedFetch('stock-list', () => fetchStock(), 30000) // 30秒缓存
 */
import { ref } from 'vue'

interface CacheEntry<T> {
  data: T
  timestamp: number
  promise?: Promise<T>
}

const cache = new Map<string, CacheEntry<any>>()

// 飛行中のリクエストを追跡 / 追踪进行中的请求
const inflight = new Map<string, Promise<any>>()

/**
 * キャッシュ付き API フェッチ / 带缓存的API获取
 *
 * @param key - キャッシュキー / 缓存键
 * @param fetcher - データ取得関数 / 数据获取函数
 * @param ttl - キャッシュ有効期間（ms）/ 缓存有效期（毫秒），默认 30000
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 30000,
): Promise<T> {
  // キャッシュヒット / 缓存命中
  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T
  }

  // 飛行中の同一リクエストがあれば待つ / 如果有进行中的相同请求则等待
  const existing = inflight.get(key)
  if (existing) {
    return existing as Promise<T>
  }

  // 新規リクエスト / 新请求
  const promise = fetcher().then(data => {
    cache.set(key, { data, timestamp: Date.now() })
    inflight.delete(key)
    return data
  }).catch(err => {
    inflight.delete(key)
    throw err
  })

  inflight.set(key, promise)
  return promise
}

/**
 * キャッシュを無効化 / 使缓存失效
 */
export function invalidateCache(keyPattern?: string): void {
  if (!keyPattern) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key)
    }
  }
}

/**
 * composable ラッパー / composable 包装
 */
export function useApiCache() {
  const isLoading = ref(false)

  async function fetch<T>(key: string, fetcher: () => Promise<T>, ttl = 30000): Promise<T> {
    isLoading.value = true
    try {
      return await cachedFetch(key, fetcher, ttl)
    } finally {
      isLoading.value = false
    }
  }

  return { fetch, invalidateCache, isLoading }
}
