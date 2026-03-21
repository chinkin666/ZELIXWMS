/**
 * WebhookDispatcher テスト / Webhook 分发器测试
 *
 * イベント配信、エラーハンドリング、HMAC 署名、テスト送信を検証。
 * 验证事件分发、错误处理、HMAC 签名、测试发送。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import crypto from 'crypto'

// ─── モジュールモック宣言（hoisted） / 模块 Mock 声明（hoisted） ───

vi.mock('@/models/webhook', () => ({
  Webhook: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}))

vi.mock('@/models/webhookLog', () => ({
  WebhookLog: {
    create: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { WebhookDispatcher } from '../webhookDispatcher'
import { Webhook } from '@/models/webhook'
import { WebhookLog } from '@/models/webhookLog'

describe('WebhookDispatcher', () => {
  let dispatcher: WebhookDispatcher

  beforeEach(() => {
    vi.clearAllMocks()
    dispatcher = new WebhookDispatcher()
  })

  // Webhook が見つからない場合は何もしない / 没有 Webhook 时不做任何操作
  it('should do nothing when no webhooks match the event', async () => {
    vi.mocked(Webhook.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    } as any)

    await dispatcher.dispatch('order.created', { orderId: '123' })

    expect(WebhookLog.create).not.toHaveBeenCalled()
  })

  // Webhook クエリ失敗時はエラーをログ / Webhook 查询失败时记录错误
  it('should handle query errors gracefully', async () => {
    vi.mocked(Webhook.find).mockReturnValue({
      lean: vi.fn().mockRejectedValue(new Error('DB error')),
    } as any)

    // エラーでもクラッシュしない / 错误也不会崩溃
    await expect(
      dispatcher.dispatch('order.created', { orderId: '123' }),
    ).resolves.toBeUndefined()
  })

  // マッチした Webhook に fetch で POST する / 向匹配的 Webhook 发送 POST
  it('should deliver to matching webhooks via fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('OK'),
    })
    vi.stubGlobal('fetch', mockFetch)

    vi.mocked(Webhook.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: 'wh-1',
          url: 'https://example.com/hook',
          secret: 'test-secret',
          retry: 1,
          headers: {},
        },
      ]),
    } as any)

    await dispatcher.dispatch('order.created', { orderId: '123' })

    // fetch は非同期で呼ばれるので少し待つ / fetch 是异步调用，等待一下
    await vi.waitFor(() => {
      expect(mockFetch).toHaveBeenCalledOnce()
    })

    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://example.com/hook')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers['X-Webhook-Event']).toBe('order.created')

    // HMAC 署名を検証 / 验证 HMAC 签名
    const bodyStr = options.body
    const expectedSig = crypto.createHmac('sha256', 'test-secret').update(bodyStr).digest('hex')
    expect(options.headers['X-Webhook-Signature']).toBe(`sha256=${expectedSig}`)

    vi.unstubAllGlobals()
  })

  // テスト送信 — Webhook が見つからない場合はエラー
  // 测试发送 — Webhook 未找到时抛出错误
  it('should throw when testing a non-existent webhook', async () => {
    vi.mocked(Webhook.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any)

    await expect(dispatcher.test('invalid-id')).rejects.toThrow('not found')
  })

  // テスト送信 — 成功ケース / 测试发送 — 成功场景
  it('should return success result for test delivery', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('OK'),
    })
    vi.stubGlobal('fetch', mockFetch)

    vi.mocked(Webhook.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'wh-test',
        url: 'https://example.com/test',
        event: 'order.created',
        secret: 's3cret',
        retry: 1,
        headers: {},
      }),
    } as any)

    const result = await dispatcher.test('wh-test')

    expect(result.success).toBe(true)
    expect(result.statusCode).toBe(200)
    expect(result.duration).toBeGreaterThanOrEqual(0)

    vi.unstubAllGlobals()
  })

  // テスト送信 — ネットワークエラー / 测试发送 — 网络错误
  it('should return failure result on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))

    vi.mocked(Webhook.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'wh-fail',
        url: 'https://down.example.com/hook',
        event: 'order.shipped',
        secret: 'key',
        retry: 1,
        headers: {},
      }),
    } as any)

    const result = await dispatcher.test('wh-fail')

    expect(result.success).toBe(false)
    expect(result.error).toBe('ECONNREFUSED')

    vi.unstubAllGlobals()
  })

  // 配信ログの書き込み失敗でもクラッシュしない
  // 配送日志写入失败也不会崩溃
  it('should not crash when log write fails', async () => {
    vi.mocked(WebhookLog.create).mockRejectedValueOnce(new Error('log write failed'))

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('OK'),
    })
    vi.stubGlobal('fetch', mockFetch)

    vi.mocked(Webhook.find).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: 'wh-2',
          url: 'https://example.com/hook2',
          secret: 'sec',
          retry: 1,
          headers: {},
        },
      ]),
    } as any)

    // エラーでもクラッシュしない / 错误也不会崩溃
    await expect(
      dispatcher.dispatch('order.created', { orderId: '456' }),
    ).resolves.toBeUndefined()

    vi.unstubAllGlobals()
  })
})
