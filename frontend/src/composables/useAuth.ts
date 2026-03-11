import { computed } from 'vue'
import { useWmsUserStore } from '../stores/wms/useWmsUserStore'

export function useAuth() {
  const userStore = useWmsUserStore()

  const isAuthenticated = computed(() => userStore.isAuthenticated)
  const user = computed(() => userStore.currentUser)

  async function login(email: string, password: string) {
    return userStore.login(email, password)
  }

  function logout() {
    userStore.logout()
  }

  function checkAuth(): boolean {
    const token = localStorage.getItem('wms_token')
    if (token && !userStore.isAuthenticated) {
      userStore.loadFromStorage()
    }
    return userStore.isAuthenticated
  }

  return {
    isAuthenticated,
    user,
    login,
    logout,
    checkAuth,
  }
}
