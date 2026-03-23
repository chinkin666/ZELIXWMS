/**
 * auth API ユニットテスト / 认证 API 单元测试
 *
 * login, fetchCurrentUser の検証
 * 验证 login, fetchCurrentUser
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/api/base', () => ({
  getApiBaseUrl: () => 'http://localhost:3000/api',
}))

import { login, fetchCurrentUser } from '../auth'

describe('login / ログイン', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('正常にログインしてトークンとユーザーを返す / 正常登录返回 token 和用户', async () => {
    const mockResponse = {
      token: 'jwt-token-123',
      user: { _id: 'u1', email: 'test@example.com', displayName: 'Test', role: 'admin' },
    }
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    )

    const result = await login('test@example.com', 'password123')
    expect(result.token).toBe('jwt-token-123')
    expect(result.user.email).toBe('test@example.com')

    // POST メソッドで呼ばれる / 使用 POST 方法调用
    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(callArgs[0]).toContain('/auth/login')
    expect(callArgs[1]?.method).toBe('POST')
  })

  it('ログイン失敗でエラーをスローする / 登录失败时抛出错误', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: '認証情報が無効です' }), { status: 401 }),
    )

    await expect(login('bad@example.com', 'wrong')).rejects.toThrow('認証情報が無効です')
  })

  it('tenantIdをリクエストボディに含める / 请求体中包含 tenantId', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify({ token: 't', user: {} }), { status: 200 }),
    )

    await login('test@example.com', 'pass', 'tenant-1')
    const body = JSON.parse(vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string)
    expect(body.tenantId).toBe('tenant-1')
  })
})

describe('fetchCurrentUser / 現在ユーザー取得', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('トークン付きでユーザー情報を取得する / 使用 token 获取用户信息', async () => {
    const mockUser = { _id: 'u1', email: 'test@example.com', displayName: 'Test', role: 'admin' }
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockUser), { status: 200 }),
    )

    const result = await fetchCurrentUser('jwt-token')
    expect(result.email).toBe('test@example.com')

    const callHeaders = vi.mocked(globalThis.fetch).mock.calls[0][1]?.headers as Record<string, string>
    expect(callHeaders.Authorization).toBe('Bearer jwt-token')
  })

  it('認証エラー時にスローする / 认证错误时抛出', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response('', { status: 401 }),
    )

    await expect(fetchCurrentUser('invalid-token')).rejects.toThrow('認証エラー')
  })
})
