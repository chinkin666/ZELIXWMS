/**
 * webhookController 单元测试 / webhookController ユニットテスト
 *
 * Webhook CRUD + テスト送信 + トグル + SSRF防護 + ログクエリ
 * Webhook CRUD + 测试发送 + 切换 + SSRF防护 + 日志查询
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// 模拟 Webhook / Webhook をモック
vi.mock('@/models/webhook', () => ({
  Webhook: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}))

// 模拟 WebhookLog / WebhookLog をモック
vi.mock('@/models/webhookLog', () => ({
  WebhookLog: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}))

// 模拟 extensionManager / extensionManager をモック
const mockTest = vi.fn()
vi.mock('@/core/extensions', () => ({
  extensionManager: {
    getWebhookDispatcher: vi.fn(() => ({
      test: mockTest,
    })),
  },
}))

vi.mock('@/core/extensions/types', () => ({
  HOOK_EVENTS: {
    ORDER_CREATED: 'order.created',
    ORDER_UPDATED: 'order.updated',
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { Webhook } from '@/models/webhook'
import { WebhookLog } from '@/models/webhookLog'
import {
  listWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  toggleWebhook,
  getWebhookLogs,
} from '../webhookController'

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

describe('webhookController / Webhook コントローラー', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- listWebhooks ---

  describe('listWebhooks / 一覧取得 / 列表获取', () => {
    it('Webhook 一覧を返す / 返回 Webhook 列表', async () => {
      const webhooks = [{ _id: 'w1', name: 'hook1' }]
      const mockSort = vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(webhooks) })
      ;(Webhook.find as any).mockReturnValue({ sort: mockSort })

      const req = mockReq()
      const res = mockRes()
      await listWebhooks(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: webhooks,
        availableEvents: ['order.created', 'order.updated'],
      })
    })
  })

  // --- getWebhook ---

  describe('getWebhook / 単一取得 / 单个获取', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(Webhook.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await getWebhook(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('Webhook を返す / 返回 Webhook', async () => {
      const webhook = { _id: 'w1', name: 'hook1' }
      ;(Webhook.findById as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(webhook) })

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await getWebhook(req, res)
      expect(res.json).toHaveBeenCalledWith(webhook)
    })
  })

  // --- createWebhook ---

  describe('createWebhook / 作成 / 创建', () => {
    it('必須フィールド不足で 400 / 缺少必填字段返回 400', async () => {
      const req = mockReq({ body: { event: 'order.created' } })
      const res = mockRes()
      await createWebhook(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('無効なイベント名で 400 / 无效事件名返回 400', async () => {
      const req = mockReq({
        body: { event: 'bad.event', name: 'h', url: 'https://example.com/hook' },
      })
      const res = mockRes()
      await createWebhook(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('無効な URL で 400 / 无效 URL 返回 400', async () => {
      const req = mockReq({
        body: { event: 'order.created', name: 'h', url: 'not-a-url' },
      })
      const res = mockRes()
      await createWebhook(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('SSRF: localhost をブロック / SSRF: 阻止 localhost', async () => {
      const req = mockReq({
        body: { event: 'order.created', name: 'h', url: 'http://localhost:3000/hook' },
      })
      const res = mockRes()
      await createWebhook(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Internal/private') }),
      )
    })

    it('SSRF: プライベート IP をブロック / SSRF: 阻止私有 IP', async () => {
      const req = mockReq({
        body: { event: 'order.created', name: 'h', url: 'http://192.168.1.1/hook' },
      })
      const res = mockRes()
      await createWebhook(req, res)
      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('正常作成 201 / 正常创建返回 201', async () => {
      const created = { _id: 'w1', name: 'h', toObject: () => ({ _id: 'w1', name: 'h' }) }
      ;(Webhook.create as any).mockResolvedValue(created)

      const req = mockReq({
        body: { event: 'order.created', name: 'h', url: 'https://example.com/hook' },
      })
      const res = mockRes()
      await createWebhook(req, res)
      expect(res.status).toHaveBeenCalledWith(201)
    })
  })

  // --- deleteWebhook ---

  describe('deleteWebhook / 削除 / 删除', () => {
    it('見つからない場合 404 / 找不到返回 404', async () => {
      ;(Webhook.findByIdAndDelete as any).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) })

      const req = mockReq({ params: { id: 'none' } })
      const res = mockRes()
      await deleteWebhook(req, res)
      expect(res.status).toHaveBeenCalledWith(404)
    })

    it('正常削除 / 正常删除', async () => {
      ;(Webhook.findByIdAndDelete as any).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: 'w1' }),
      })

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await deleteWebhook(req, res)
      expect(res.json).toHaveBeenCalledWith({ message: 'Webhook deleted / Webhook を削除しました' })
    })
  })

  // --- toggleWebhook ---

  describe('toggleWebhook / トグル / 切换', () => {
    it('enabled を反転 / 反转 enabled 状态', async () => {
      const webhook = { _id: 'w1', enabled: true, save: vi.fn() }
      ;(Webhook.findById as any).mockResolvedValue(webhook)

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await toggleWebhook(req, res)

      expect(webhook.enabled).toBe(false)
      expect(webhook.save).toHaveBeenCalled()
    })
  })

  // --- testWebhook ---

  describe('testWebhook / テスト送信 / 测试发送', () => {
    it('テスト結果を返す / 返回测试结果', async () => {
      mockTest.mockResolvedValue({ success: true })

      const req = mockReq({ params: { id: 'w1' } })
      const res = mockRes()
      await testWebhook(req, res)
      expect(res.json).toHaveBeenCalledWith({ success: true })
    })
  })

  // --- getWebhookLogs ---

  describe('getWebhookLogs / ログクエリ / 日志查询', () => {
    it('ページネーション付きログを返す / 返回分页日志', async () => {
      const logs = [{ _id: 'l1' }]
      const mockChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(logs),
      }
      ;(WebhookLog.find as any).mockReturnValue(mockChain)
      ;(WebhookLog.countDocuments as any).mockResolvedValue(1)

      const req = mockReq({ params: { id: 'w1' }, query: { page: '1', limit: '50' } })
      const res = mockRes()
      await getWebhookLogs(req, res)

      expect(res.json).toHaveBeenCalledWith({
        data: logs,
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      })
    })
  })
})
