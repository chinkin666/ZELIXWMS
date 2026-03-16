import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginPage.vue'),
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        { path: '', name: 'home', component: () => import('@/views/DashboardPage.vue') },
        { path: 'clients', name: 'clients', component: () => import('@/views/clients/ClientListPage.vue') },
        { path: 'clients/:id/pricing', name: 'client-pricing', component: () => import('@/views/pricing/PricingPage.vue') },
        { path: 'clients/:id/sub-clients', name: 'client-sub-clients', component: () => import('@/views/clients/SubClientPage.vue') },
      ],
    },
  ],
})

router.beforeEach((to, _from, next) => {
  let token = localStorage.getItem('admin_token')

  // 開発環境で未認証 → 自動ログイン / 开发环境自动登录
  if (!token && import.meta.env.DEV) {
    token = 'dev-token'
    localStorage.setItem('admin_token', token)
  }

  if (to.path !== '/login' && !token) {
    next('/login')
    return
  }
  if (to.path === '/login' && token) {
    next('/')
    return
  }
  next()
})

export default router
