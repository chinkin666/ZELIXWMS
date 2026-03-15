import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export interface PortalUser {
  id: string
  email: string
  displayName: string
  clientId: string
  clientName: string
  subClientId?: string
  role: 'client_admin' | 'client_subclient_user'
  language: 'zh' | 'ja' | 'en'
}

export const usePortalAuthStore = defineStore('portalAuth', () => {
  const token = ref(localStorage.getItem('portal_token') || '')
  const user = ref<PortalUser | null>(
    (() => {
      try {
        const saved = localStorage.getItem('portal_user')
        return saved ? JSON.parse(saved) : null
      } catch {
        return null
      }
    })(),
  )

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isClientAdmin = computed(() => user.value?.role === 'client_admin')

  function setAuth(newToken: string, newUser: PortalUser) {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('portal_token', newToken)
    localStorage.setItem('portal_user', JSON.stringify(newUser))

    // 言語同期 / 语言同步
    if (newUser.language) {
      localStorage.setItem('portal_lang', newUser.language)
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('portal_token')
    localStorage.removeItem('portal_user')
  }

  return { token, user, isAuthenticated, isClientAdmin, setAuth, logout }
})
