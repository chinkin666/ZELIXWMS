/**
 * queueController 单元测试 / queueController ユニットテスト
 *
 * 队列监控 API（状态获取 + 清理）
 * キュー監視 API（ステータス取得 + クリーンアップ）
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'

// ─── モジュールモック宣言（hoisted） / 模块mock声明 ─────────────────

vi.mock('@/core/queue', () => ({
  queueManager: {
    isReady: vi.fn(),
    getStats: vi.fn(),
    cleanQueue: vi.fn(),
  },
  QUEUE_NAMES: {
    ORDER_PROCESSING: 'order-processing',
    NOTIFICATION: 'notification',
    REPORT: 'report',
  },
}))

import { queueManager } from '@/core/queue'
import { getQueueStats, cleanQueue } from '@/api/controllers/queueController'

const mockQueueManager = vi.mocked(queueManager)

// ─── テストユーティリティ / 测试工具函数 ───────────────────────────

const mockReq = (overrides = {}) =>
  ({ query: {}, params: {}, body: {}, headers: {}, user: { id: 'u1', tenantId: 'T1' }, ...overrides }) as any

const mockRes = () => {
  const res: any = { json: vi.fn(), status: vi.fn() }
  res.status.mockReturnValue(res)
  return res
}

// ─── テスト / 测试 ─────────────────────────────────────────────────

describe('queueController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // キューステータス / 队列状态
  describe('getQueueStats', () => {
    it('Redis 未接続の場合 available=false を返す / Redis未连接时返回available=false', async () => {
      mockQueueManager.isReady.mockReturnValue(false)
      const res = mockRes()
      await getQueueStats(mockReq(), res)

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        available: false,
        queues: [],
      }))
    })

    it('Redis 接続時にキュー統計を返す / Redis连接时返回队列统计', async () => {
      mockQueueManager.isReady.mockReturnValue(true)
      const stats = [
        { name: 'order-processing', waiting: 5, active: 2, completed: 100 },
        { name: 'notification', waiting: 0, active: 0, completed: 50 },
      ]
      mockQueueManager.getStats.mockResolvedValue(stats)

      const res = mockRes()
      await getQueueStats(mockReq(), res)

      expect(res.json).toHaveBeenCalledWith({ available: true, queues: stats })
    })

    it('エラー時 500 を返す / 错误时返回500', async () => {
      mockQueueManager.isReady.mockReturnValue(true)
      mockQueueManager.getStats.mockRejectedValue(new Error('Redis error'))

      const res = mockRes()
      await getQueueStats(mockReq(), res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'Redis error' })
    })
  })

  // キュークリーンアップ / 队列清理
  describe('cleanQueue', () => {
    it('無効なキュー名で 400 / 无效队列名返回400', async () => {
      const res = mockRes()
      await cleanQueue(mockReq({ params: { name: 'invalid-queue' } }), res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Invalid queue name'),
      }))
    })

    it('Redis 未接続で 503 / Redis未连接返回503', async () => {
      mockQueueManager.isReady.mockReturnValue(false)
      const res = mockRes()
      await cleanQueue(mockReq({ params: { name: 'order-processing' } }), res)

      expect(res.status).toHaveBeenCalledWith(503)
    })

    it('正常クリーンアップ / 正常清理', async () => {
      mockQueueManager.isReady.mockReturnValue(true)
      const result = { cleaned: 10 }
      mockQueueManager.cleanQueue.mockResolvedValue(result)

      const res = mockRes()
      await cleanQueue(
        mockReq({ params: { name: 'order-processing' }, query: {} }),
        res,
      )

      expect(mockQueueManager.cleanQueue).toHaveBeenCalledWith('order-processing', 60000)
      expect(res.json).toHaveBeenCalledWith(result)
    })

    it('grace パラメータを使用 / 使用grace参数', async () => {
      mockQueueManager.isReady.mockReturnValue(true)
      mockQueueManager.cleanQueue.mockResolvedValue({ cleaned: 5 })

      const res = mockRes()
      await cleanQueue(
        mockReq({ params: { name: 'notification' }, query: { grace: '30000' } }),
        res,
      )

      expect(mockQueueManager.cleanQueue).toHaveBeenCalledWith('notification', 30000)
    })

    it('クリーンアップエラー時 500 / 清理错误时返回500', async () => {
      mockQueueManager.isReady.mockReturnValue(true)
      mockQueueManager.cleanQueue.mockRejectedValue(new Error('clean failed'))

      const res = mockRes()
      await cleanQueue(
        mockReq({ params: { name: 'order-processing' }, query: {} }),
        res,
      )

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })
})
