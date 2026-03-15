/**
 * 统一 HTTP 客户端 / 統一 HTTP クライアント
 *
 * Centralized HTTP client with:
 * - Auto-attach Authorization header from useWmsUserStore
 * - Unified error handling / 統一エラーハンドリング
 * - Support for JSON, Blob (download), FormData (upload)
 */

import { getApiBaseUrl } from '@/api/base'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'

// ─── Error Type / エラー型 ──────────────────────────────────────────────────

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

// ─── HTTP Client / HTTP クライアント ────────────────────────────────────────

class HttpClient {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * 認証ヘッダーを自動付与 / Auto-attach auth token from store
   */
  private getHeaders(contentType?: string): HeadersInit {
    const headers: Record<string, string> = {}

    if (contentType) {
      headers['Content-Type'] = contentType
    }

    // トークンをストアから取得 / Retrieve token from the Pinia store
    try {
      const store = useWmsUserStore()
      if (store.token) {
        headers['Authorization'] = `Bearer ${store.token}`
      }
    } catch {
      // Store may not be available outside of Vue app context — skip auth header
    }

    return headers
  }

  /**
   * 統一レスポンス処理 / Unified response handling
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // 401 = トークン期限切れまたは無効 → 自動ログアウト
    // 401 = 令牌过期或无效 → 自动登出
    if (response.status === 401) {
      localStorage.removeItem('wms_auth_token')
      localStorage.removeItem('wms_auth_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    if (response.ok) {
      // 204 No Content など body がないケース
      const text = await response.text()
      if (!text) return undefined as T
      return JSON.parse(text) as T
    }

    // エラーレスポンスのパース / Parse error response body
    let body: unknown
    let message: string = response.statusText
    try {
      body = await response.json()
      if (body && typeof body === 'object' && 'message' in body) {
        message = (body as { message: string }).message
      }
    } catch {
      // JSON パース失敗時は statusText をそのまま使用
    }

    throw new HttpError(message, response.status, response.statusText, body)
  }

  /**
   * クエリパラメータ付き URL を構築 / Build URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, value)
        }
      }
    }
    return url.toString()
  }

  // ─── Public Methods / パブリックメソッド ─────────────────────────────────

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const response = await fetch(this.buildUrl(path, params), {
      method: 'GET',
      headers: this.getHeaders(),
    })
    return this.handleResponse<T>(response)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(this.buildUrl(path), {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(this.buildUrl(path), {
      method: 'PUT',
      headers: this.getHeaders('application/json'),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(this.buildUrl(path), {
      method: 'PATCH',
      headers: this.getHeaders('application/json'),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(this.buildUrl(path), {
      method: 'DELETE',
      headers: this.getHeaders(),
    })
    return this.handleResponse<T>(response)
  }

  /**
   * ファイルダウンロード用 (Blob レスポンス) / For file downloads (Blob response)
   */
  async download(path: string, body?: unknown): Promise<Blob> {
    const options: RequestInit = {
      method: body !== undefined ? 'POST' : 'GET',
      headers: this.getHeaders(body !== undefined ? 'application/json' : undefined),
    }
    if (body !== undefined) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(this.buildUrl(path), options)
    if (!response.ok) {
      // エラー時は JSON として解析を試みる
      let message = response.statusText
      try {
        const errorBody = await response.json()
        if (errorBody?.message) message = errorBody.message
      } catch {
        // ignore
      }
      throw new HttpError(message, response.status, response.statusText)
    }
    return response.blob()
  }

  /**
   * ファイルアップロード用 (FormData) / For file uploads (FormData)
   * Content-Type は自動設定 (multipart/form-data boundary)
   */
  async upload<T>(path: string, formData: FormData): Promise<T> {
    // FormData の場合 Content-Type を手動設定しない（ブラウザが boundary を付与）
    const headers = this.getHeaders() as Record<string, string>

    const response = await fetch(this.buildUrl(path), {
      method: 'POST',
      headers,
      body: formData,
    })
    return this.handleResponse<T>(response)
  }
}

// ─── Singleton Export / シングルトンエクスポート ─────────────────────────────

export const http = new HttpClient(getApiBaseUrl())

// ─── apiFetch: fetch() のドロップイン置換 / fetch() 的直接替代 ──────────────
// 既存の API ファイルで fetch() → apiFetch() に差し替えるだけで JWT 認証が付く
// 在现有 API 文件中将 fetch() 替换为 apiFetch() 即可自动附加 JWT 认证

export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  }

  // Content-Type がなければ JSON デフォルト / 如果没有 Content-Type 则默认为 JSON
  if (!headers['Content-Type'] && init?.body && typeof init.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }

  // トークンをストアから取得 / 从 Store 获取令牌
  try {
    const store = useWmsUserStore()
    if (store.token) {
      headers['Authorization'] = `Bearer ${store.token}`
    }
  } catch {
    // Store が利用できない場合は認証ヘッダーをスキップ
    // Store 不可用时跳过认证头
  }

  const response = await fetch(url, { ...init, headers })

  // 401 = トークン期限切れまたは無効 → 自動ログアウト
  // 401 = 令牌过期或无效 → 自动登出
  if (response.status === 401) {
    localStorage.removeItem('wms_auth_token')
    localStorage.removeItem('wms_auth_user')
    // ログインページにいない場合はリダイレクト / 如果不在登录页则重定向
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login'
    }
  }

  return response
}
