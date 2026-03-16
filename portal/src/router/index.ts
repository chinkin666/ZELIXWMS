import { createRouter, createWebHistory } from 'vue-router'
import { usePortalAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/modules/auth/pages/LoginPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/PortalLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/modules/auth/pages/DashboardPage.vue'),
        },
        {
          path: 'products',
          name: 'products',
          component: () => import('@/modules/products/pages/ProductListPage.vue'),
        },
        {
          path: 'inbound',
          name: 'inbound-list',
          component: () => import('@/modules/inbound/pages/InboundListPage.vue'),
        },
        {
          path: 'inbound/new',
          name: 'inbound-create',
          component: () => import('@/modules/inbound/pages/InboundCreatePage.vue'),
        },
        {
          path: 'inbound/:id',
          name: 'inbound-detail',
          component: () => import('@/modules/inbound/pages/InboundDetailPage.vue'),
        },
        {
          path: 'outbound',
          name: 'outbound',
          component: () => import('@/modules/outbound/pages/OutboundRequestPage.vue'),
        },
        {
          path: 'billing',
          name: 'billing',
          component: () => import('@/modules/billing/pages/BillingOverviewPage.vue'),
        },
        {
          path: 'sub-clients',
          name: 'sub-clients',
          component: () => import('@/modules/settings/pages/SubClientShopPage.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/modules/auth/pages/NotFoundPage.vue'),
      meta: { public: true },
    },
  ],
})

// 認証ガード / 认证守卫
router.beforeEach((to, _from, next) => {
  const store = usePortalAuthStore()

  if (to.meta.public) {
    // 已登录访问登录页 → 跳首页 / 認証済みでログインページ → ホームへ
    if (to.path === '/login' && store.isAuthenticated) {
      next('/')
      return
    }
    next()
    return
  }

  // 開発環境で未認証 → 自動ログイン / 开发环境未认证 → 自动登录
  if (!store.isAuthenticated && import.meta.env.DEV) {
    store.setAuth('dev-token', {
      id: 'dev-portal-user',
      email: 'dev-client@zelix.local',
      displayName: 'Dev Client',
      clientId: '',
      clientName: 'Dev Client Co.',
      role: 'client_admin',
      language: 'zh',
    })
  }

  if (!store.isAuthenticated) {
    next('/login')
    return
  }

  next()
})

export default router
