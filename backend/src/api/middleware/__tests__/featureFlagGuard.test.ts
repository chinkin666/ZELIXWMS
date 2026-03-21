/**
 * featureFlagGuard ミドルウェアテスト / 功能开关守卫中间件测试
 *
 * フラグ有効時の通過、無効時の403、エラー時のフォールスルーを検証。
 * 验证标志启用时通过、禁用时返回403、错误时放行。
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

// ─── モジュールモック宣言（hoisted） / 模块 Mock 声明（hoisted） ───
const mockIsEnabled = vi.fn()

vi.mock('@/core/extensions', () => ({
  extensionManager: {
    getFeatureFlagService: () => ({
      isEnabled: mockIsEnabled,
    }),
  },
}))

import { requireFeatureFlag } from '../featureFlagGuard'

// ─── ヘルパー / 辅助工具 ───

function createMockReq(tenantId?: string): Request {
  const req: any = { headers: {} }
  if (tenantId) req.tenantId = tenantId
  return req as Request
}

function createMockRes(): Response {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as Response
}

describe('requireFeatureFlag', () => {
  let next: NextFunction

  beforeEach(() => {
    vi.clearAllMocks()
    next = vi.fn()
  })

  // フラグ有効時は次へ進む / 标志启用时继续
  it('should call next when feature flag is enabled', async () => {
    mockIsEnabled.mockResolvedValue(true)
    const middleware = requireFeatureFlag('test-flag')

    await middleware(createMockReq(), createMockRes(), next)

    expect(mockIsEnabled).toHaveBeenCalledWith('test-flag', undefined)
    expect(next).toHaveBeenCalledOnce()
  })

  // フラグ無効時は 403 を返す / 标志禁用时返回 403
  it('should return 403 when feature flag is disabled', async () => {
    mockIsEnabled.mockResolvedValue(false)
    const middleware = requireFeatureFlag('disabled-flag')
    const res = createMockRes()

    await middleware(createMockReq(), res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ featureFlag: 'disabled-flag' }),
    )
    expect(next).not.toHaveBeenCalled()
  })

  // カスタムメッセージを使用 / 使用自定义消息
  it('should use custom message when provided', async () => {
    mockIsEnabled.mockResolvedValue(false)
    const middleware = requireFeatureFlag('beta', 'Beta is not available')
    const res = createMockRes()

    await middleware(createMockReq(), res, next)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Beta is not available' }),
    )
  })

  // テナント ID を渡す / 传递租户 ID
  it('should pass tenantId to isEnabled', async () => {
    mockIsEnabled.mockResolvedValue(true)
    const middleware = requireFeatureFlag('tenant-flag')

    await middleware(createMockReq('tenant-abc'), createMockRes(), next)

    expect(mockIsEnabled).toHaveBeenCalledWith('tenant-flag', 'tenant-abc')
  })

  // サービスエラー時は通過させる / 服务错误时放行
  it('should call next when feature flag service throws', async () => {
    mockIsEnabled.mockRejectedValue(new Error('Service unavailable'))
    const middleware = requireFeatureFlag('some-flag')

    await middleware(createMockReq(), createMockRes(), next)

    // エラー時は核心機能をブロックしない / 错误时不阻塞核心功能
    expect(next).toHaveBeenCalledOnce()
  })

  // デフォルトメッセージを使用 / 使用默认消息
  it('should use default message when no custom message', async () => {
    mockIsEnabled.mockResolvedValue(false)
    const middleware = requireFeatureFlag('my-flag')
    const res = createMockRes()

    await middleware(createMockReq(), res, next)

    const jsonArg = (res.json as any).mock.calls[0][0]
    expect(jsonArg.error).toContain('my-flag')
  })
})
