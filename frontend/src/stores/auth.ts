/**
 * 認証コンポーザブル / 认证组合式函数
 *
 * useWmsUserStore の薄いラッパー。ルーターガードや Login ページなど
 * Pinia ストアを直接使いにくい箇所からアクセスするための簡易 API。
 *
 * 对 useWmsUserStore 的轻量封装，为路由守卫和登录页等场景提供简洁的访问接口。
 */
import { computed } from 'vue'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'

export interface AuthUser {
  readonly id: string
  readonly email: string
  readonly displayName: string
  readonly role: string
  readonly warehouseIds?: string[]
  readonly clientId?: string
}

export function useAuth() {
  const store = useWmsUserStore()

  const isAuthenticated = computed(() => store.isAuthenticated)
  const currentUser = computed(() => store.currentUser)
  const isAdmin = computed(() => store.isAdmin)
  const token = computed(() => store.token)

  function setAuth(newToken: string, newUser: AuthUser) {
    // ストアの状態を直接更新 / 直接更新 store 状态
    store.$patch({
      token: newToken,
      isAuthenticated: true,
      currentUser: {
        id: newUser.id,
        username: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role as 'admin' | 'operator' | 'viewer' | 'super_admin' | 'client',
        warehouseIds: newUser.warehouseIds ?? [],
        clientIds: newUser.clientId ? [newUser.clientId] : [],
        permissions: [],
        settings: {},
        createdAt: new Date().toISOString(),
      },
    })
    localStorage.setItem('wms_token', newToken)
    localStorage.setItem('wms_current_user', JSON.stringify(store.currentUser))
  }

  function clearAuth() {
    store.logout()
  }

  function getAuthHeaders(): Record<string, string> {
    return store.token ? { Authorization: `Bearer ${store.token}` } : {}
  }

  return {
    token,
    user: currentUser,
    isAuthenticated,
    isAdmin,
    setAuth,
    clearAuth,
    getAuthHeaders,
  }
}
