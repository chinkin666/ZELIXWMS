/**
 * 認証 API クライアント / 认证 API 客户端
 *
 * ログイン・現在ユーザー取得などの認証関連エンドポイント。
 * 登录、获取当前用户等认证相关端点。
 */
import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()

// ─── 型定義 / 类型定义 ─────────────────────────────────────────────────────

export interface LoginRequest {
  readonly email: string
  readonly password: string
  readonly tenantId?: string
}

export interface LoginResponse {
  readonly token: string
  readonly user: {
    readonly _id: string
    readonly email: string
    readonly displayName: string
    readonly role: string
    readonly warehouseIds?: string[]
    readonly clientId?: string
  }
}

export interface MeResponse {
  readonly _id: string
  readonly email: string
  readonly displayName: string
  readonly role: string
  readonly warehouseIds?: string[]
  readonly clientId?: string
}

// ─── API 関数 / API 函数 ──────────────────────────────────────────────────

/**
 * ログイン / 登录
 */
export async function login(email: string, password: string, tenantId?: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId: tenantId || 'default' }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || 'ログインに失敗しました / 登录失败')
  }
  return res.json()
}

/**
 * 現在のユーザー情報取得 / 获取当前用户信息
 */
export async function fetchCurrentUser(token: string): Promise<MeResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error('認証エラー / 认证错误')
  }
  return res.json()
}
