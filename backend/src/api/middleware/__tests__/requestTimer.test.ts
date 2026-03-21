/**
 * requestTimer ミドルウェアテスト / 请求计时中间件测试
 *
 * レスポンスタイムの計測、finish イベントでのログ出力、遅延リクエスト警告を検証。
 * 验证响应时间计测、finish 事件的日志输出、慢请求警告。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// ─── モジュールモック宣言（hoisted） / 模块 Mock 声明（hoisted） ───
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { requestTimer } from '../requestTimer'
import { logger } from '@/lib/logger'

// ─── ヘルパー / 辅助工具 ───

function createMockReq(): Request {
  return {
    method: 'GET',
    originalUrl: '/api/v1/test',
    url: '/api/v1/test',
  } as unknown as Request
}

function createMockRes(): Response & { _finishCallbacks: (() => void)[] } {
  const callbacks: (() => void)[] = []
  return {
    statusCode: 200,
    headersSent: false,
    setHeader: vi.fn(),
    on: vi.fn((event: string, cb: () => void) => {
      if (event === 'finish') callbacks.push(cb)
    }),
    _finishCallbacks: callbacks,
  } as unknown as Response & { _finishCallbacks: (() => void)[] }
}

describe('requestTimer', () => {
  let next: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    next = vi.fn()
  })

  // next を呼ぶ / 调用 next
  it('should call next immediately', () => {
    const req = createMockReq()
    const res = createMockRes()

    requestTimer(req, res, next)

    expect(next).toHaveBeenCalledOnce()
  })

  // finish イベントをリッスン / 监听 finish 事件
  it('should register a finish event listener', () => {
    const req = createMockReq()
    const res = createMockRes()

    requestTimer(req, res, next)

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function))
  })

  // 通常リクエストは debug ログ / 正常请求输出 debug 日志
  it('should log debug for normal requests', () => {
    const req = createMockReq()
    const res = createMockRes()

    requestTimer(req, res, next)
    // finish イベントをトリガー / 触发 finish 事件
    res._finishCallbacks.forEach((cb) => cb())

    expect(logger.debug).toHaveBeenCalledOnce()
    const callArgs = (logger.debug as any).mock.calls[0][0]
    expect(callArgs).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: '/api/v1/test',
        statusCode: 200,
      }),
    )
  })

  // ヘッダー未送信時は X-Response-Time を設定 / 头部未发送时设置 X-Response-Time
  it('should set X-Response-Time header when not yet sent', () => {
    const req = createMockReq()
    const res = createMockRes()

    requestTimer(req, res, next)
    res._finishCallbacks.forEach((cb) => cb())

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Response-Time',
      expect.stringMatching(/^\d+ms$/),
    )
  })

  // ヘッダー送信済みの場合は setHeader しない / 头部已发送时不调用 setHeader
  it('should not set header when headersSent is true', () => {
    const req = createMockReq()
    const res = createMockRes()
    ;(res as any).headersSent = true

    requestTimer(req, res, next)
    res._finishCallbacks.forEach((cb) => cb())

    expect(res.setHeader).not.toHaveBeenCalled()
  })

  // 遅延リクエストは warn ログ / 慢请求输出 warn 日志
  it('should log warn for slow requests (>=1000ms)', () => {
    const req = createMockReq()
    const res = createMockRes()

    // hrtime.bigint のモックで遅延をシミュレート / 模拟 hrtime.bigint 实现延迟
    let callCount = 0
    vi.spyOn(process.hrtime, 'bigint').mockImplementation(() => {
      callCount++
      // 1回目（開始）= 0, 2回目（終了）= 1500ms 相当
      // 第1次（开始）= 0, 第2次（结束）= 相当于 1500ms
      return callCount === 1 ? BigInt(0) : BigInt(1_500_000_000)
    })

    requestTimer(req, res, next)
    res._finishCallbacks.forEach((cb) => cb())

    expect(logger.warn).toHaveBeenCalledOnce()
    const warnMsg = (logger.warn as any).mock.calls[0][1]
    expect(warnMsg).toContain('Slow request')

    // 復元 / 恢复
    vi.restoreAllMocks()
  })
})
