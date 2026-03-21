/**
 * HTTP クライアント ユニットテスト / HTTP 客户端单元测试
 *
 * HttpError クラスおよび HttpClient の各メソッド (get, post, put, patch, delete) を検証する。
 * 验证 HttpError 类以及 HttpClient 的各方法 (get, post, put, patch, delete)。
 *
 * - 401 自動ログアウト / 401 自动登出
 * - 429 レート制限エラー / 429 速率限制错误
 * - 503 サービス利用不可 / 503 服务不可用
 * - 500 エラーボディ解析 / 500 错误体解析
 * - 204 No Content / 204 无内容响应
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { HttpError } from '../http'

// ─── Pinia セットアップ / Pinia 设置 ─────────────────────────────────────────
// HttpClient は内部で useWmsUserStore() を呼ぶため Pinia が必要
// HttpClient 内部调用 useWmsUserStore()，需要 Pinia 环境

beforeEach(() => {
  setActivePinia(createPinia())
})

// ─── HttpError テスト / HttpError 测试 ───────────────────────────────────────

describe('HttpError', () => {
  it('status, statusText, body を正しく設定する / 正确设置 status, statusText, body', () => {
    const err = new HttpError('Not Found', 404, 'Not Found', { id: '123' })
    expect(err.message).toBe('Not Found')
    expect(err.status).toBe(404)
    expect(err.statusText).toBe('Not Found')
    expect(err.body).toEqual({ id: '123' })
  })

  it('name が "HttpError" に設定される / name 设置为 "HttpError"', () => {
    const err = new HttpError('fail', 500, 'Internal Server Error')
    expect(err.name).toBe('HttpError')
  })

  it('Error のインスタンスである / 是 Error 的实例', () => {
    const err = new HttpError('fail', 500, 'Internal Server Error')
    expect(err).toBeInstanceOf(Error)
  })

  it('body は省略可能 / body 是可选的', () => {
    const err = new HttpError('Unauthorized', 401, 'Unauthorized')
    expect(err.body).toBeUndefined()
  })
})

// ─── HttpClient テスト / HttpClient 测试 ─────────────────────────────────────

describe('HttpClient (via http proxy)', () => {
  const originalFetch = globalThis.fetch
  const originalLocation = window.location

  beforeEach(() => {
    globalThis.fetch = vi.fn()
    localStorage.clear()

    // window.location をモック / mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard', href: '/dashboard' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  /**
   * 動的インポートでシングルトン proxy をリセットする
   * 动态导入以重置单例 proxy
   */
  async function getHttp() {
    // http はシングルトン proxy なので直接インポートできる
    // http 是单例 proxy，可以直接导入
    const mod = await import('../http')
    return mod.http
  }

  // ── GET 成功 / GET 成功 ─────────────────────────────────────────────────

  it('get() — 200 JSON レスポンスを返す / 返回 200 JSON 响应', async () => {
    const mockData = { items: [1, 2, 3] }
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const http = await getHttp()
    const result = await http.get('/test')

    expect(result).toEqual(mockData)
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)

    // fetch の引数を検証 / 验证 fetch 的参数
    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(callArgs[0]).toContain('/test')
    expect(callArgs[1]?.method).toBe('GET')
  })

  // ── GET クエリパラメータ / GET 查询参数 ──────────────────────────────────

  it('get() — クエリパラメータを付与する / 附加查询参数', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    )

    const http = await getHttp()
    await http.get('/products', { page: '1', limit: '10' })

    const callUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string
    expect(callUrl).toContain('page=1')
    expect(callUrl).toContain('limit=10')
  })

  // ── GET 空値パラメータをスキップ / GET 跳过空值参数 ──────────────────────

  it('get() — 空のクエリパラメータをスキップする / 跳过空的查询参数', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    )

    const http = await getHttp()
    await http.get('/products', { page: '1', search: '', status: '' })

    const callUrl = vi.mocked(globalThis.fetch).mock.calls[0][0] as string
    expect(callUrl).toContain('page=1')
    expect(callUrl).not.toContain('search=')
    expect(callUrl).not.toContain('status=')
  })

  // ── POST 成功 / POST 成功 ───────────────────────────────────────────────

  it('post() — JSON ボディを送信し応答を返す / 发送 JSON body 并返回响应', async () => {
    const responseData = { id: 'new-123', name: 'Product A' }
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(responseData), { status: 201 }),
    )

    const http = await getHttp()
    const result = await http.post('/products', { name: 'Product A' })

    expect(result).toEqual(responseData)

    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(callArgs[1]?.method).toBe('POST')
    expect(callArgs[1]?.body).toBe(JSON.stringify({ name: 'Product A' }))
  })

  // ── PUT 成功 / PUT 成功 ─────────────────────────────────────────────────

  it('put() — PUT メソッドで送信する / 使用 PUT 方法发送', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ updated: true }), { status: 200 }),
    )

    const http = await getHttp()
    await http.put('/products/123', { name: 'Updated' })

    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(callArgs[1]?.method).toBe('PUT')
  })

  // ── PATCH 成功 / PATCH 成功 ─────────────────────────────────────────────

  it('patch() — PATCH メソッドで送信する / 使用 PATCH 方法发送', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ patched: true }), { status: 200 }),
    )

    const http = await getHttp()
    await http.patch('/products/123', { status: 'active' })

    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(callArgs[1]?.method).toBe('PATCH')
  })

  // ── DELETE 成功 / DELETE 成功 ───────────────────────────────────────────

  it('delete() — DELETE メソッドで送信する / 使用 DELETE 方法发送', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(null, { status: 204 }),
    )

    const http = await getHttp()
    const result = await http.delete('/products/123')

    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(callArgs[1]?.method).toBe('DELETE')
    // 204 は undefined を返す / 204 返回 undefined
    expect(result).toBeUndefined()
  })

  // ── 401 自動ログアウト / 401 自动登出 ──────────────────────────────────

  it('401 レスポンスで localStorage をクリアしリダイレクトする / 401 响应清除 localStorage 并重定向', async () => {
    localStorage.setItem('wms_token', 'old-token')
    localStorage.setItem('wms_current_user', '{"id":"u1"}')

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Token expired' }), {
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    const http = await getHttp()

    await expect(http.get('/protected')).rejects.toThrow(HttpError)

    // localStorage がクリアされている / localStorage 已被清除
    expect(localStorage.getItem('wms_token')).toBeNull()
    expect(localStorage.getItem('wms_current_user')).toBeNull()

    // ログインページにリダイレクトされる / 重定向到登录页
    expect(window.location.href).toBe('/login')
  })

  it('401 — ログインページにいる場合はリダイレクトしない / 已在登录页时不重定向', async () => {
    Object.defineProperty(window, 'location', {
      value: { pathname: '/login', href: '/login' },
      writable: true,
      configurable: true,
    })

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: 'Invalid' }), {
        status: 401,
        statusText: 'Unauthorized',
      }),
    )

    const http = await getHttp()
    await expect(http.get('/auth/check')).rejects.toThrow(HttpError)

    // href は変更されない / href 不变
    expect(window.location.href).toBe('/login')
  })

  // ── 429 レート制限 / 429 速率限制 ──────────────────────────────────────

  it('429 レスポンスで HttpError をスローする / 429 响应抛出 HttpError', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response('', { status: 429, statusText: 'Too Many Requests' }),
    )

    const http = await getHttp()

    try {
      await http.get('/api/data')
      // ここに到達しないはず / 不应到达此处
      expect(true).toBe(false)
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError)
      const httpErr = err as HttpError
      expect(httpErr.status).toBe(429)
      expect(httpErr.message).toContain('リクエストが多すぎます')
    }
  })

  // ── 503 サービス利用不可 / 503 服务不可用 ──────────────────────────────

  it('503 レスポンスで HttpError をスローする / 503 响应抛出 HttpError', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response('', { status: 503, statusText: 'Service Unavailable' }),
    )

    const http = await getHttp()

    try {
      await http.get('/api/data')
      expect(true).toBe(false)
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError)
      const httpErr = err as HttpError
      expect(httpErr.status).toBe(503)
      expect(httpErr.message).toContain('サーバーが一時的に利用できません')
    }
  })

  // ── 500 エラーボディ解析 / 500 错误体解析 ──────────────────────────────

  it('500 レスポンスのエラーメッセージを body から取得する / 从 body 获取 500 响应的错误消息', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ message: 'Database connection failed' }),
        { status: 500, statusText: 'Internal Server Error' },
      ),
    )

    const http = await getHttp()

    try {
      await http.post('/products', { name: 'Bad' })
      expect(true).toBe(false)
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError)
      const httpErr = err as HttpError
      expect(httpErr.status).toBe(500)
      expect(httpErr.message).toBe('Database connection failed')
      expect(httpErr.body).toEqual({ message: 'Database connection failed' })
    }
  })

  it('500 — body が JSON でない場合は statusText を使う / body 非 JSON 时使用 statusText', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response('plain text error', {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    )

    const http = await getHttp()

    try {
      await http.get('/broken')
      expect(true).toBe(false)
    } catch (err) {
      const httpErr = err as HttpError
      expect(httpErr.status).toBe(500)
      // JSON パース失敗時は statusText を使う / JSON 解析失败时使用 statusText
      expect(httpErr.message).toBe('Internal Server Error')
    }
  })

  // ── 204 No Content / 204 无内容 ───────────────────────────────────────

  it('204 No Content は undefined を返す / 204 无内容返回 undefined', async () => {
    // jsdom では status 204 の Response を直接生成できないため、
    // Response.ok=true + 空 body でシミュレートする
    // jsdom 不支持直接创建 status 204 的 Response，用 ok=true + 空 body 模拟
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response('', { status: 200 }),
    )

    const http = await getHttp()
    const result = await http.delete('/items/456')
    // 空 body は undefined を返す / 空 body 返回 undefined
    expect(result).toBeUndefined()
  })

  // ── 認証ヘッダー付与 / 附加认证头 ────────────────────────────────────

  it('store にトークンがある場合 Authorization ヘッダーを付与する / store 有 token 时附加 Authorization 头', async () => {
    // Pinia store にトークンをセット / 在 Pinia store 中设置 token
    const { useWmsUserStore } = await import('@/stores/wms/useWmsUserStore')
    const store = useWmsUserStore()
    store.token = 'test-jwt-token'

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    const http = await getHttp()
    await http.get('/protected')

    const callHeaders = vi.mocked(globalThis.fetch).mock.calls[0][1]?.headers as Record<string, string>
    expect(callHeaders['Authorization']).toBe('Bearer test-jwt-token')
  })

  // ── X-Warehouse-Id ヘッダー / X-Warehouse-Id 头 ──────────────────────

  it('localStorage に倉庫IDがある場合 X-Warehouse-Id ヘッダーを付与する / localStorage 有仓库ID时附加 X-Warehouse-Id 头', async () => {
    localStorage.setItem('wms_selected_warehouse', 'wh-001')

    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    )

    const http = await getHttp()
    await http.get('/inventory')

    const callHeaders = vi.mocked(globalThis.fetch).mock.calls[0][1]?.headers as Record<string, string>
    expect(callHeaders['X-Warehouse-Id']).toBe('wh-001')
  })
})
