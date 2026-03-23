/**
 * auth store ユニットテスト / 认证 store 单元测试
 *
 * useAuth composable の検証
 * 验证 useAuth composable
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

// useWmsUserStore をモック / mock useWmsUserStore
const mockStore = {
  isAuthenticated: false,
  currentUser: null as any,
  isAdmin: false,
  token: '',
  $patch: vi.fn(),
  logout: vi.fn(),
}

vi.mock('@/stores/wms/useWmsUserStore', () => ({
  useWmsUserStore: () => mockStore,
}))

import { useAuth } from '../auth'

describe('useAuth / 認証コンポーザブル', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockStore.isAuthenticated = false
    mockStore.currentUser = null
    mockStore.token = ''
    mockStore.isAdmin = false
    localStorage.clear()
  })

  it('初期状態では未認証 / 初始状态未认证', () => {
    const { isAuthenticated } = useAuth()
    expect(isAuthenticated.value).toBe(false)
  })

  it('setAuth でストアを更新し localStorage に保存する / setAuth 更新 store 并保存到 localStorage', () => {
    const { setAuth } = useAuth()
    setAuth('new-token', {
      id: 'u1',
      email: 'user@example.com',
      displayName: 'ユーザー',
      role: 'admin',
    })

    expect(mockStore.$patch).toHaveBeenCalled()
    expect(localStorage.getItem('wms_token')).toBe('new-token')
  })

  it('clearAuth でログアウトする / clearAuth 执行登出', () => {
    const { clearAuth } = useAuth()
    clearAuth()
    expect(mockStore.logout).toHaveBeenCalled()
  })

  it('getAuthHeaders がトークン付きのヘッダーを返す / getAuthHeaders 返回带 token 的头', () => {
    mockStore.token = 'my-jwt'
    const { getAuthHeaders } = useAuth()
    expect(getAuthHeaders()).toEqual({ Authorization: 'Bearer my-jwt' })
  })

  it('トークンなしの場合は空のヘッダーを返す / 无 token 时返回空头', () => {
    mockStore.token = ''
    const { getAuthHeaders } = useAuth()
    expect(getAuthHeaders()).toEqual({})
  })
})
