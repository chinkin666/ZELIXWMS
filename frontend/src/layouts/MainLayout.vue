<template>
  <div class="main-layout">
    <!-- 顶部导航栏 -->
    <header class="topbar">
      <!-- 上半部分：Logo + 菜单 -->
      <div class="topbar-main">
        <div class="topbar-left">
          <!-- Logo -->
          <div class="logo-section" @click="goToHome">
            <img src="@/assets/images/logo.png" alt="Logo" class="logo-img" />
            <span class="logo-text">SMS</span>
          </div>
          <!-- 菜单 -->
          <TopbarMenu />
        </div>
        <div class="topbar-right">
          <!-- 右侧按钮预留位置 -->
        </div>
      </div>
      <!-- 下半部分：面包屑 + 子页面入口 -->
      <div class="topbar-sub">
        <div class="breadcrumb-section">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item
              v-for="(item, index) in breadcrumbItems"
              :key="index"
              :to="item.path"
            >
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="sub-pages-section">
          <router-link
            v-for="subPage in currentSubPages"
            :key="subPage.path"
            :to="subPage.path"
            class="sub-page-link"
            :class="{ active: isCurrentPath(subPage.path) }"
          >
            {{ subPage.title }}
          </router-link>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import TopbarMenu from '@/components/TopbarMenu.vue'

const router = useRouter()
const route = useRoute()

const goToHome = () => {
  router.push('/home')
}

// 当前路由的子页面
const currentSubPages = computed(() => {
  const subPages: Array<{ path: string; title: string }> = []

  // 根据当前路由路径获取对应的子页面列表
  const pathPrefix = '/' + route.path.split('/')[1]

  const subPagesMap: Record<string, Array<{ path: string; title: string }>> = {
    '/shipment-orders': [
      { path: '/shipment-orders/create', title: '出荷指示作成' },
      { path: '/shipment-orders/confirm', title: '出荷指示確定' },
    ],
    '/waybill-management': [
      { path: '/waybill-management/export', title: '配送会社データ出力' },
      { path: '/waybill-management/import', title: '配送会社データ取込' },
    ],
    '/shipment-operations': [
      { path: '/shipment-operations/tasks', title: '出荷作業一覧' },
      { path: '/shipment-operations/list', title: '出荷一覧' },
      { path: '/shipment-operations/ec-export', title: 'EC連携' },
    ],
    '/settings': [
      { path: '/settings/basic', title: '基本設定' },
      { path: '/settings/orderSourceCompany', title: 'ご依頼主設定' },
      { path: '/settings/products', title: '商品設定' },
      { path: '/settings/carrier', title: '配送会社設定' },
      { path: '/settings/carrier-automation', title: '配送会社自動化設定' },
      { path: '/settings/ec-company', title: 'ECモール設定' },
      { path: '/settings/mapping-patterns', title: 'ファイルレイアウト' },
      { path: '/settings/print-templates', title: '印刷テンプレート' },
      { path: '/settings/form-templates', title: '帳票テンプレート' },
      { path: '/settings/printer', title: 'プリンター設定' },
    ],
  }

  return subPagesMap[pathPrefix] || subPages
})

const isCurrentPath = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

// 生成面包屑导航
const breadcrumbItems = computed(() => {
  const items: Array<{ title: string; path?: string }> = []

  // 添加首页（如果不在首页）
  if (route.path !== '/home') {
    items.push({ title: 'ホーム', path: '/home' })
  }

  // 遍历匹配的路由
  const matched = route.matched.filter((record) => {
    // 排除根路由和没有 title 的路由
    return record.path !== '/' && record.meta && record.meta.title
  })

  // 检查当前路由是否有父路由定义（通过 meta.parentRoute）
  const currentRoute = route.matched[route.matched.length - 1]
  const parentRouteName = currentRoute?.meta?.parentRoute as string | undefined
  if (parentRouteName) {
    // 查找父路由
    try {
      const parentRoute = router.resolve({ name: parentRouteName })
      const parentTitle = parentRoute.meta?.title as string
      if (parentTitle && parentRoute.path) {
        // 添加父路由到面包屑（在当前位置之前）
        items.push({
          title: parentTitle,
          path: parentRoute.path,
        })
      }
    } catch (e) {
      // 如果路由不存在，忽略错误
      console.warn('Parent route not found:', parentRouteName)
    }
  }

  matched.forEach((record, index) => {
    const title = record.meta?.title as string
    if (title) {
      // 如果是最后一个，不添加链接（当前页面不可点击）
      const isLast = index === matched.length - 1

      // 检查路由是否有 name（有 name 说明有实际页面组件，可以点击）
      // 如果没有 name，说明只是父路由，没有实际页面，不可点击
      const hasComponent = !!record.name

      // 如果已经有父路由了（通过 parentRoute），跳过添加对应的父路由项，避免重复
      const skipParent = parentRouteName && record.name === parentRouteName
      if (skipParent) {
        return
      }

      const path = isLast || !hasComponent ? undefined : record.path

      // 避免重复添加相同的面包屑项
      if (!items.some(item => item.title === title && item.path === path)) {
        items.push({
          title,
          path: path as string | undefined,
        })
      }
    }
  })

  // 如果只有首页，且当前不在首页，则添加当前页面
  if (items.length === 1 && route.path !== '/home') {
    const currentTitle = route.meta?.title as string || 'ページ'
    items.push({ title: currentTitle })
  }

  // 如果没有任何项，添加首页
  if (items.length === 0) {
    items.push({ title: 'ホーム' })
  }

  return items
})
</script>

<style scoped>
.main-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  flex-shrink: 0;
}

.topbar-main {
  height: 55px;
  background-color: #102040;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px 0 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  height: 100%;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  height: 100%;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logo-section:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.logo-img {
  height: 20px;
  width: auto;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 1px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-sub {
  height: 30px;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.breadcrumb-section {
  display: flex;
  align-items: center;
}

.breadcrumb-section :deep(.el-breadcrumb) {
  font-size: 12px;
}

.breadcrumb-section :deep(.el-breadcrumb__item) {
  font-size: 12px;
}

.breadcrumb-section :deep(.el-breadcrumb__inner) {
  font-size: 12px;
}

.sub-pages-section {
  display: flex;
  align-items: center;
  gap: 0;
}

.sub-page-link {
  font-size: 12px;
  color: #606266;
  text-decoration: none;
  padding: 0 12px;
  height: 30px;
  line-height: 30px;
  transition: color 0.2s, background-color 0.2s;
  border-left: 1px solid #e4e7ed;
}

.sub-page-link:first-child {
  border-left: none;
}

.sub-page-link:hover {
  color: #102040;
  background-color: #f5f7fa;
}

.sub-page-link.active {
  color: #102040;
  font-weight: 500;
  background-color: #e8f4ff;
}

.main-content {
  flex: 1;
  background-color: #ffffff;
  padding: 10px;
  overflow-y: auto;
}

/* 统一控制页面元素间距为 10px */
.main-content :deep(.page-header) {
  margin-bottom: 10px;
}

.main-content :deep(.search-section) {
  margin-bottom: 10px;
  margin-top: 10px;
}

/* 如果 page-header 后面直接是 search-section，覆盖 margin-top */
.main-content :deep(.page-header + .search-section) {
  margin-top: 0;
}

/* 如果 search-section 后面还是 search-section，确保间距为 10px */
.main-content :deep(.search-section + .search-section) {
  margin-top: 0;
}

/* 统一控制 printed-filter 的间距 */
.main-content :deep(.printed-filter) {
  margin-bottom: 10px;
}

/* 如果 printed-filter 后面是 search-section，确保间距为 10px */
.main-content :deep(.printed-filter + .search-section) {
  margin-top: 0;
}

/* 统一控制 carrier-selector-wrapper 的间距 */
.main-content :deep(.carrier-selector-wrapper) {
  margin-bottom: 0;
}

/* 如果 carrier-selector-wrapper 后面是 search-section，确保间距为 10px */
.main-content :deep(.carrier-selector-wrapper + .search-section) {
  margin-top: 10px;
}

/* 响应式布局：宽度小于1000px */
@media (max-width: 999px) {
  .logo-section {
    display: none;
  }

  .breadcrumb-section {
    display: none;
  }

  .topbar-sub {
    justify-content: flex-start;
  }
}

/* 让使用 OrderBottomBar 的页面容器填满主内容区域，使 sticky 定位生效 */
.main-content :deep(.shipment-results),
.main-content :deep(.shipment-order-create),
.main-content :deep(.waybill-export),
.main-content :deep(.shipment-list),
.main-content :deep(.shipment-operations-list),
.main-content :deep(.shipment-order-list) {
  min-height: 100%;
}
</style>
