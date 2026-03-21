/**
 * auditLogger ミドルウェアテスト / 审计日志中间件测试
 *
 * POST/PUT/DELETE リクエストのログ記録、GET スキップ、機密フィールドのマスク処理を検証。
 * 验证 POST/PUT/DELETE 请求的日志记录、GET 跳过、敏感字段掩码处理。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// ─── モジュールモック宣言（hoisted） / 模块 Mock 声明（hoisted） ───
const mockInsertOne = vi.fn().mockResolvedValue({})

vi.mock('mongoose', () => ({
  default: {
    connection: {
      collection: vi.fn(() => ({
        insertOne: mockInsertOne,
      })),
    },
  },
}))

import { auditLogger } from '../auditLogger'

// ─── ヘルパー / 辅助工具 ───

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    originalUrl: '/api/v1/orders',
    url: '/api/v1/orders',
    body: {},
    headers: { 'x-tenant-id': 'tenant-1', 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  } as unknown as Request
}

function createMockRes(): Response & { _finishCallbacks: (() => void)[] } {
  const callbacks: (() => void)[] = []
  return {
    statusCode: 200,
    on: vi.fn((event: string, cb: () => void) => {
      if (event === 'finish') callbacks.push(cb)
    }),
    _finishCallbacks: callbacks,
  } as unknown as Response & { _finishCallbacks: (() => void)[] }
}

describe('auditLogger', () => {
  let next: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    next = vi.fn()
  })

  // GET リクエストはスキップ / GET 请求跳过
  it('should skip GET requests and call next', () => {
    const req = createMockReq({ method: 'GET' })
    const res = createMockRes()

    auditLogger(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.on).not.toHaveBeenCalled()
  })

  // HEAD リクエストもスキップ / HEAD 请求也跳过
  it('should skip HEAD requests', () => {
    const req = createMockReq({ method: 'HEAD' })
    const res = createMockRes()

    auditLogger(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.on).not.toHaveBeenCalled()
  })

  // OPTIONS リクエストもスキップ / OPTIONS 请求也跳过
  it('should skip OPTIONS requests', () => {
    const req = createMockReq({ method: 'OPTIONS' })
    const res = createMockRes()

    auditLogger(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.on).not.toHaveBeenCalled()
  })

  // POST リクエストを記録 / 记录 POST 请求
  it('should log POST requests on response finish', () => {
    const req = createMockReq({
      method: 'POST',
      body: { name: 'test' },
      user: { id: 'user-1', displayName: 'Test User' },
    } as any)
    const res = createMockRes()

    auditLogger(req, res, next)
    expect(next).toHaveBeenCalledOnce()

    // finish イベントをシミュレート / 模拟 finish 事件
    res._finishCallbacks.forEach((cb) => cb())

    expect(mockInsertOne).toHaveBeenCalledOnce()
    const logEntry = mockInsertOne.mock.calls[0][0]
    expect(logEntry.method).toBe('POST')
    expect(logEntry.path).toBe('/api/v1/orders')
    expect(logEntry.userId).toBe('user-1')
    expect(logEntry.userName).toBe('Test User')
    expect(logEntry.tenantId).toBe('tenant-1')
  })

  // DELETE リクエストも記録 / 也记录 DELETE 请求
  it('should log DELETE requests', () => {
    const req = createMockReq({ method: 'DELETE' })
    const res = createMockRes()

    auditLogger(req, res, next)
    res._finishCallbacks.forEach((cb) => cb())

    expect(mockInsertOne).toHaveBeenCalledOnce()
    expect(mockInsertOne.mock.calls[0][0].method).toBe('DELETE')
  })

  // 機密フィールドをマスク / 掩码敏感字段
  it('should sanitize sensitive fields in request body', () => {
    const req = createMockReq({
      method: 'PUT',
      body: { username: 'admin', password: 'secret123', apiToken: 'abc' },
    })
    const res = createMockRes()

    auditLogger(req, res, next)
    res._finishCallbacks.forEach((cb) => cb())

    const logEntry = mockInsertOne.mock.calls[0][0]
    expect(logEntry.requestBody.password).toBe('***')
    expect(logEntry.requestBody.apiToken).toBe('***')
    expect(logEntry.requestBody.username).toBe('admin')
  })

  // ユーザー未認証時は anonymous / 未认证用户为 anonymous
  it('should default to anonymous when no user is present', () => {
    const req = createMockReq({ method: 'POST' })
    const res = createMockRes()

    auditLogger(req, res, next)
    res._finishCallbacks.forEach((cb) => cb())

    const logEntry = mockInsertOne.mock.calls[0][0]
    expect(logEntry.userId).toBe('anonymous')
  })

  // DB エラーでもクラッシュしない / DB 错误不会崩溃
  it('should not throw when insertOne rejects', () => {
    mockInsertOne.mockRejectedValueOnce(new Error('DB error'))
    const req = createMockReq({ method: 'POST' })
    const res = createMockRes()

    auditLogger(req, res, next)

    // finish で insertOne が失敗しても例外が飛ばない / insertOne 失败也不抛出异常
    expect(() => {
      res._finishCallbacks.forEach((cb) => cb())
    }).not.toThrow()
  })
})
