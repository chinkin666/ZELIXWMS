<template>
  <div class="dashboard-page">
    <!-- ユーザー情報バー / 用户信息栏 -->
    <div class="user-info-bar" v-if="userStore.currentUser">
      <div class="user-info-left">
        <div class="user-avatar">{{ userInitial }}</div>
        <div class="user-details">
          <span class="user-name">{{ userStore.currentUser.displayName }}</span>
          <span class="user-role-badge" :class="'role-' + userStore.currentUser.role">
            {{ roleLabel }}
          </span>
        </div>
      </div>
      <div class="user-info-right">
        <span class="user-meta">{{ userStore.currentUser.username }}</span>
        <span class="user-meta-separator">|</span>
        <span class="user-meta">{{ t('wms.ui.warehouse', '倉庫') }}: {{ warehouseLabel }}</span>
      </div>
    </div>

    <!-- バナー / 横幅 -->
    <div class="dashboard-banner">
      <div class="banner-left">
        <h1 class="banner-title">{{ t('wms.ui.dashboardTitle', '運営ダッシュボード') }}</h1>
        <p class="banner-subtitle">{{ todayLabel }}</p>
      </div>
      <div class="banner-right">
        <span class="last-update" v-if="data">
          {{ t('wms.ui.lastUpdate', '最終更新') }}: {{ formatTime(data.generatedAt) }}
        </span>
        <span v-if="loading && data" class="refresh-spinner" />
        <OButton v-else variant="secondary" size="sm" @click="loadData" :disabled="loading">
          {{ loading ? t('wms.ui.loadingShort', '読込中...') : t('wms.ui.refresh', '更新') }}
        </OButton>
      </div>
    </div>

    <!-- クイックアクション / 快捷操作 -->
    <div class="quick-actions-row">
      <div
        v-for="action in quickActions"
        :key="action.path"
        class="quick-action-btn"
        @click="navigateTo(action.path)"
      >
        <span class="quick-action-icon">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path :d="action.icon" /></svg>
        </span>
        <span class="quick-action-label">{{ action.title }}</span>
      </div>
    </div>

    <!-- スケルトン / 骨架屏 -->
    <div v-if="loading && !data" class="skeleton-wrap">
      <div class="skeleton-grid">
        <div v-for="i in 4" :key="i" class="skeleton-card"><div class="skeleton-line lg" /><div class="skeleton-line sm" /></div>
      </div>
      <div class="skeleton-grid half">
        <div v-for="i in 3" :key="i" class="skeleton-card"><div class="skeleton-line lg" /><div class="skeleton-line sm" /></div>
      </div>
      <div class="skeleton-table"><div v-for="i in 5" :key="i" class="skeleton-row" /></div>
    </div>

    <!-- エラー / 错误 -->
    <div v-else-if="error" class="error-state o-card">
      <p>{{ t('wms.ui.fetchError', 'データの取得に失敗しました') }}: {{ error }}</p>
      <OButton variant="primary" @click="loadData">{{ t('wms.ui.retry', '再試行') }}</OButton>
    </div>

    <template v-else-if="data">
      <!-- KPIカード / KPI卡片 -->
      <h2 class="section-title">{{ t('wms.ui.todayKpi', '本日のKPI') }}</h2>
      <div class="kpi-grid">
        <div class="kpi-card o-card" @click="navigateTo('/shipment/operations/tasks')">
          <div class="kpi-icon-wrap kpi-icon--blue">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path :d="icons.shipmentOps" /></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ data.shipments.todayShipped }} <span class="kpi-of">/ {{ data.shipments.todayScheduled }}</span></div>
            <div class="kpi-label">{{ t('wms.ui.todayShipments', '今日の出荷件数') }}</div>
          </div>
        </div>
        <div class="kpi-card o-card" @click="navigateTo('/inbound/dashboard')">
          <div class="kpi-icon-wrap kpi-icon--green">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path :d="icons.inbound" /></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ data.inbound.todayReceived }}</div>
            <div class="kpi-label">{{ t('wms.ui.todayInbound', '入庫件数') }}</div>
          </div>
        </div>
        <div class="kpi-card o-card" @click="navigateTo('/inventory/stock')">
          <div class="kpi-icon-wrap kpi-icon--purple">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path :d="icons.inventory" /></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ formatNumber(data.inventory.totalSkus) }}</div>
            <div class="kpi-label">{{ t('wms.ui.skuCount', '在庫SKU数') }}</div>
          </div>
        </div>
        <div class="kpi-card o-card" @click="navigateTo('/billing')">
          <div class="kpi-icon-wrap kpi-icon--orange">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path :d="icons.billing" /></svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ billingKpi ? formatCurrency(billingKpi.unbilledAmount) : '-' }}</div>
            <div class="kpi-label">{{ t('wms.ui.unbilledAmount', '未請求額') }}</div>
          </div>
        </div>
      </div>

      <!-- 出荷進捗 / 出荷進捗 -->
      <div class="section-title-row">
        <h2 class="section-title">{{ t('wms.ui.shipmentStatus', '出荷状況') }}</h2>
        <span v-if="data.shipments.todayScheduled > 0" class="progress-label">
          {{ t('wms.ui.todayProgress', '本日達成率') }}:
          {{ Math.round((data.shipments.todayShipped / data.shipments.todayScheduled) * 100) }}%
        </span>
      </div>
      <div v-if="data.shipments.todayScheduled > 0" class="progress-bar-wrap">
        <div class="progress-bar" :style="{ width: Math.min(100, Math.round((data.shipments.todayShipped / data.shipments.todayScheduled) * 100)) + '%' }" />
      </div>
      <div class="metrics-grid">
        <div class="metric-card o-card" @click="navigateTo('/shipment/orders/create')">
          <div class="metric-value">{{ data.shipments.todayCreated }}</div>
          <div class="metric-label">{{ t('wms.ui.todayCreated', '本日作成') }}</div>
        </div>
        <div class="metric-card o-card" @click="navigateTo('/shipment/operations/tasks')">
          <div class="metric-value highlight-green">{{ data.shipments.todayShipped }}</div>
          <div class="metric-label">{{ t('wms.ui.todayShipped', '本日出荷済') }}</div>
        </div>
        <div class="metric-card o-card">
          <div class="metric-value highlight-blue">{{ data.shipments.todayScheduled }}</div>
          <div class="metric-label">{{ t('wms.ui.todayScheduled', '本日予定') }}</div>
        </div>
        <div class="metric-card o-card">
          <div class="metric-value highlight-orange">{{ data.shipments.totalPending }}</div>
          <div class="metric-label">{{ t('wms.ui.unshipped', '未出荷') }}</div>
        </div>
        <div class="metric-card o-card metric-card--warn" v-if="data.shipments.totalHeld > 0">
          <div class="metric-value highlight-red">{{ data.shipments.totalHeld }}</div>
          <div class="metric-label">{{ t('wms.ui.onHold', '保留中') }}</div>
        </div>
        <div class="metric-card o-card metric-card--danger" v-if="data.overdueOrders > 0" @click="navigateTo('/shipment/operations/tasks')">
          <div class="metric-value highlight-red">{{ data.overdueOrders }}</div>
          <div class="metric-label">{{ t('wms.ui.overdueShipments', '出荷遅延') }}</div>
        </div>
      </div>

      <!-- 入庫・返品 / 入库・退货 -->
      <div class="two-col-row">
        <div>
          <h2 class="section-title">{{ t('wms.ui.inboundStatus', '入庫状況') }}</h2>
          <div class="metrics-grid metrics-small">
            <div class="metric-card o-card" @click="navigateTo('/inbound/dashboard')">
              <div class="metric-value">{{ data.inbound.todayReceived }}</div>
              <div class="metric-label">{{ t('wms.ui.todayInbound', '本日入庫') }}</div>
            </div>
            <div class="metric-card o-card">
              <div class="metric-value highlight-blue">{{ data.inbound.active }}</div>
              <div class="metric-label">{{ t('wms.ui.processing', '処理中') }}</div>
            </div>
            <div class="metric-card o-card">
              <div class="metric-value highlight-orange">{{ data.inbound.pendingPutaway }}</div>
              <div class="metric-label">{{ t('wms.ui.pendingPutaway', '棚入れ待ち') }}</div>
            </div>
          </div>
        </div>
        <div>
          <h2 class="section-title">{{ t('wms.ui.returnStatus', '返品状況') }}</h2>
          <div class="metrics-grid metrics-small">
            <div class="metric-card o-card" @click="navigateTo('/returns/list')">
              <div class="metric-value highlight-orange">{{ data.returns.inspecting }}</div>
              <div class="metric-label">{{ t('wms.ui.inspecting', '検品中') }}</div>
            </div>
            <div class="metric-card o-card">
              <div class="metric-value highlight-green">{{ data.returns.completed }}</div>
              <div class="metric-label">{{ t('wms.ui.completed', '完了') }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 在庫概要 / 库存概要 -->
      <h2 class="section-title">{{ t('wms.ui.inventorySummary', '在庫概要') }}</h2>
      <div class="metrics-grid">
        <div class="metric-card o-card" @click="navigateTo('/inventory/stock')">
          <div class="metric-value">{{ data.inventory.totalSkus }}</div>
          <div class="metric-label">{{ t('wms.ui.skuCount', 'SKU 数') }}</div>
        </div>
        <div class="metric-card o-card">
          <div class="metric-value">{{ formatNumber(data.inventory.totalQuantity) }}</div>
          <div class="metric-label">{{ t('wms.ui.totalStock', '総在庫数') }}</div>
        </div>
        <div class="metric-card o-card">
          <div class="metric-value highlight-green">{{ formatNumber(data.inventory.availableQuantity) }}</div>
          <div class="metric-label">{{ t('wms.ui.available', '利用可能') }}</div>
        </div>
        <div class="metric-card o-card">
          <div class="metric-value highlight-orange">{{ formatNumber(data.inventory.reservedQuantity) }}</div>
          <div class="metric-label">{{ t('wms.ui.reserved', '引当済み') }}</div>
        </div>
      </div>

      <!-- 7日間トレンド / 7日趋势 -->
      <h2 class="section-title">{{ t('wms.ui.weeklyTrend', '7日間出荷トレンド') }}</h2>
      <div class="o-card trend-card" v-if="trendData.length > 0">
        <div class="trend-chart">
          <div v-for="item in trendData" :key="item.date" class="trend-col">
            <div class="trend-bars">
              <div class="trend-bar trend-bar--created" :style="{ height: trendBarHeight(item.created) }" :title="`作成: ${item.created}`" />
              <div class="trend-bar trend-bar--shipped" :style="{ height: trendBarHeight(item.shipped) }" :title="`出荷: ${item.shipped}`" />
            </div>
            <div class="trend-label">{{ item.date }}</div>
          </div>
        </div>
        <div class="trend-legend">
          <span class="trend-legend-item"><span class="trend-dot trend-dot--created" /> {{ t('wms.ui.created', '作成') }}</span>
          <span class="trend-legend-item"><span class="trend-dot trend-dot--shipped" /> {{ t('wms.ui.shipped', '出荷') }}</span>
        </div>
      </div>

      <!-- 最近の出荷指示 / 最近的出荷指示 -->
      <h2 class="section-title">{{ t('wms.ui.recentShipments', '最近の出荷指示') }}</h2>
      <div class="o-card recent-table-card">
        <table class="o-table">
          <thead>
            <tr>
              <th>{{ t('wms.ui.orderNumber', '注文番号') }}</th>
              <th>{{ t('wms.ui.status', 'ステータス') }}</th>
              <th>{{ t('wms.ui.itemCount', '商品数') }}</th>
              <th>{{ t('wms.ui.shipPlanDate', '出荷予定日') }}</th>
              <th>{{ t('wms.ui.createdDate', '作成日') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in data.recentShipments"
              :key="order._id"
              class="clickable-row"
              @click="navigateTo('/shipment/operations/tasks')"
            >
              <td>{{ order.orderNumber }}</td>
              <td>
                <span :class="['status-badge', getStatusClass(order)]">
                  {{ getStatusText(order) }}
                </span>
              </td>
              <td>{{ order._productsMeta?.totalQuantity || '-' }}</td>
              <td>{{ order.shipPlanDate || '-' }}</td>
              <td>{{ formatDate(order.createdAt) }}</td>
            </tr>
            <tr v-if="data.recentShipments.length === 0">
              <td colspan="5" class="empty-row">{{ t('wms.ui.noData', 'データがありません') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- クイックアクセス / 快速访问 -->
      <h2 class="section-title">{{ t('wms.ui.quickAccess', 'クイックアクセス') }}</h2>
      <div class="quick-nav-grid">
        <div
          v-for="card in quickNavCards"
          :key="card.path"
          class="o-card quick-nav-card"
          @click="navigateTo(card.path)"
        >
          <span class="nav-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path :d="card.icon" /></svg>
          </span>
          <span class="nav-label">{{ card.title }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useWmsUserStore } from '@/stores/wms/useWmsUserStore'
import OButton from '@/components/odoo/OButton.vue'
import { fetchDashboardOverview, fetchShipmentTrend, type DashboardOverview, type TrendItem } from '@/api/dashboard'
import { fetchBillingDashboard, type BillingDashboardKpi } from '@/api/billing'

const { t } = useI18n()
const router = useRouter()
const userStore = useWmsUserStore()
const data = ref<DashboardOverview | null>(null)
const trendData = ref<TrendItem[]>([])
const billingKpi = ref<BillingDashboardKpi | null>(null)
const loading = ref(false)
const error = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null

// ユーザー表示名の頭文字 / 用户显示名首字母
const userInitial = computed(() => {
  const name = userStore.currentUser?.displayName ?? ''
  return name.charAt(0).toUpperCase()
})

// ロール表示名 / 角色显示名
const roleLabel = computed(() => {
  const roleMap: Record<string, string> = {
    super_admin: t('wms.ui.roleSuperAdmin', 'スーパー管理者'),
    admin: t('wms.ui.roleAdmin', '管理者'),
    operator: t('wms.ui.roleOperator', 'オペレーター'),
    viewer: t('wms.ui.roleViewer', '閲覧者'),
  }
  return roleMap[userStore.currentUser?.role ?? ''] ?? userStore.currentUser?.role ?? ''
})

// 倉庫名表示 / 仓库名显示
const warehouseLabel = computed(() => {
  if (userStore.currentWarehouse) {
    return userStore.currentWarehouse.name
  }
  const count = userStore.currentUser?.warehouseIds?.length ?? 0
  return count > 0
    ? `${count} ${t('wms.ui.warehouseCount', '拠点')}`
    : t('wms.ui.noWarehouse', '未設定')
})

const todayLabel = computed(() => {
  const d = new Date()
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`
})

// SVG アイコンパス / SVG图标路径
const icons = {
  // 出荷指示作成: プラスドキュメント / 加号文档
  createShipment: 'M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM8 6.5a.5.5 0 0 0-1 0V8H5.5a.5.5 0 0 0 0 1H7v1.5a.5.5 0 0 0 1 0V9h1.5a.5.5 0 0 0 0-1H8V6.5z',
  // 出荷作業: トラック / 卡车
  shipmentOps: 'M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-4 0h-.5A1.5 1.5 0 0 1-1 10.5v-7zM3 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  // 入庫管理: 箱に入る矢印 / 入箱箭头
  inbound: 'M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5zM7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z',
  // 在庫一覧: グリッドボックス / 网格框
  inventory: 'M2.5 0A2.5 2.5 0 0 0 0 2.5v11A2.5 2.5 0 0 0 2.5 16h11a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 13.5 0h-11zM1 2.5A1.5 1.5 0 0 1 2.5 1H7v5H1V2.5zM1 7h6v5H2.5A1.5 1.5 0 0 1 1 10.5V7zm7-6h5.5A1.5 1.5 0 0 1 15 2.5V6H8V1zm0 6h7v3.5a1.5 1.5 0 0 1-1.5 1.5H8V7z',
  // 棚卸管理: クリップボードチェック / 剪贴板勾选
  stocktaking: 'M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0zM4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1zM9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z',
  // 返品管理: リターン矢印 / 返回箭头
  returns: 'M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-4.5-.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z',
  // 日次管理: カレンダー / 日历
  daily: 'M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z',
  // 設定: ギア / 齿轮
  settings: 'M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0zM9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z',
  // 請求: 通貨アイコン / 货币图标
  billing: 'M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z',
  // FBA: ボックスアイコン / 箱子图标
  fba: 'M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z',
}

// クイックアクションボタン / 快捷操作按钮
const quickActions = computed(() => [
  { title: t('wms.ui.navCreateShipment', '出荷指示作成'), icon: icons.createShipment, path: '/shipment/orders/create' },
  { title: t('wms.ui.navInboundCreate', '入庫指示作成'), icon: icons.inbound, path: '/inbound/dashboard' },
  { title: t('wms.ui.navInventory', '在庫一覧'), icon: icons.inventory, path: '/inventory/stock' },
  { title: t('wms.ui.navFbaCreate', 'FBAプラン作成'), icon: icons.fba, path: '/fba/plans/create' },
])

const quickNavCards = computed(() => [
  { title: t('wms.ui.navCreateShipment', '出荷指示作成'), icon: icons.createShipment, path: '/shipment/orders/create' },
  { title: t('wms.ui.navShipmentOps', '出荷作業'), icon: icons.shipmentOps, path: '/shipment/operations/tasks' },
  { title: t('wms.ui.navInbound', '入庫管理'), icon: icons.inbound, path: '/inbound/dashboard' },
  { title: t('wms.ui.navInventory', '在庫一覧'), icon: icons.inventory, path: '/inventory/stock' },
  { title: t('wms.ui.navStocktaking', '棚卸管理'), icon: icons.stocktaking, path: '/stocktaking/list' },
  { title: t('wms.ui.navReturns', '返品管理'), icon: icons.returns, path: '/returns/list' },
  { title: t('wms.ui.navDaily', '日次管理'), icon: icons.daily, path: '/daily/list' },
  { title: t('wms.ui.navFba', 'FBA管理'), icon: icons.fba, path: '/fba/plans' },
  { title: t('wms.ui.navSettings', '設定'), icon: icons.settings, path: '/settings/basic' },
])

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [overview, trend, billing] = await Promise.all([
      fetchDashboardOverview(),
      fetchShipmentTrend().catch(() => [] as TrendItem[]),
      fetchBillingDashboard().catch(() => null),
    ])
    data.value = overview
    trendData.value = trend
    billingKpi.value = billing
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

// 柱状图高度計算 / バーの高さ計算
function trendBarHeight(value: number): string {
  const max = Math.max(1, ...trendData.value.map(d => Math.max(d.created, d.shipped)))
  return `${Math.max(2, (value / max) * 100)}%`
}

function getStatusClass(order: Record<string, unknown>): string {
  if (order.statusShipped) return 'status-shipped'
  if (order.statusHeld) return 'status-held'
  if (order.statusConfirmed) return 'status-confirmed'
  return 'status-draft'
}

function getStatusText(order: Record<string, unknown>): string {
  if (order.statusShipped) return t('wms.ui.statusShipped', '出荷済')
  if (order.statusHeld) return t('wms.ui.statusHeld', '保留')
  if (order.statusConfirmed) return t('wms.ui.statusConfirmed', '確認済')
  return t('wms.ui.statusDraft', '下書き')
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

function formatNumber(n: number): string {
  return (n ?? 0).toLocaleString()
}

// 通貨フォーマット / 货币格式化
function formatCurrency(amount: number): string {
  return `¥${(amount ?? 0).toLocaleString()}`
}

function navigateTo(path: string) {
  router.push(path)
}

onMounted(() => {
  loadData()
  refreshTimer = setInterval(loadData, 60000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 20px 20px;
}

/* ユーザー情報バー / 用户信息栏 */
.user-info-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  margin-bottom: 16px;
}

.user-info-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0052A3, #0073E6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.user-role-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.role-super_admin {
  background: #fef0f0;
  color: #f56c6c;
}

.role-admin {
  background: #ecf5ff;
  color: #0052A3;
}

.role-operator {
  background: #f0f9eb;
  color: #67c23a;
}

.role-viewer {
  background: #f4f4f5;
  color: #909399;
}

.user-info-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--o-gray-500, #909399);
}

.user-meta-separator {
  color: var(--o-border-color, #e4e7ed);
}

/* バナー / 横幅 */
.dashboard-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: linear-gradient(135deg, #0052A3 0%, #B85D3A 100%);
  border-radius: 8px;
  margin-bottom: 20px;
  color: white;
}

.banner-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: white;
}

.banner-subtitle {
  font-size: 14px;
  margin: 0;
  opacity: 0.9;
  color: white;
}

.banner-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.last-update {
  font-size: 13px;
  opacity: 0.85;
}

.refresh-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* クイックアクションボタン / 快捷操作按钮 */
.quick-actions-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: var(--o-view-background, #fff);
  border: 2px solid var(--o-brand-primary, #0052A3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-btn:hover {
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 82, 163, 0.25);
}

.quick-action-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 82, 163, 0.08);
  border-radius: 8px;
  color: var(--o-brand-primary, #0052A3);
  flex-shrink: 0;
  transition: all 0.2s;
}

.quick-action-btn:hover .quick-action-icon {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.quick-action-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--o-brand-primary, #0052A3);
  transition: color 0.2s;
}

.quick-action-btn:hover .quick-action-label {
  color: #fff;
}

/* KPIカード / KPI卡片 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 8px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.kpi-icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-icon--blue {
  background: rgba(0, 82, 163, 0.1);
  color: #0052A3;
}

.kpi-icon--green {
  background: rgba(61, 139, 55, 0.1);
  color: #3D8B37;
}

.kpi-icon--purple {
  background: rgba(113, 75, 103, 0.1);
  color: #714b67;
}

.kpi-icon--orange {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.kpi-content {
  min-width: 0;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--o-gray-700, #303133);
  line-height: 1.2;
  white-space: nowrap;
}

.kpi-of {
  font-size: 16px;
  font-weight: 400;
  color: var(--o-gray-400, #c0c4cc);
}

.kpi-label {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin-top: 4px;
}

/* セクションタイトル / 区域标题 */
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
}

.progress-bar-wrap {
  width: 100%;
  height: 6px;
  background: var(--o-gray-200, #f0f0f0);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #0052A3, #67c23a);
  transition: width 0.6s ease;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 24px 0 12px 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 8px;
}

.metrics-small {
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.metric-card {
  text-align: center;
  padding: 20px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--o-gray-700, #303133);
  line-height: 1.2;
}

.metric-label {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin-top: 6px;
}

.highlight-green { color: #67c23a; }
.highlight-blue { color: #409eff; }
.highlight-orange { color: #e6a23c; }
.highlight-red { color: #f56c6c; }

.metric-card--warn {
  border-left: 3px solid #e6a23c;
  background: #fffbf0;
}

.metric-card--danger {
  border-left: 3px solid #f56c6c;
  background: #fef0f0;
}

.two-col-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.25rem;
}

/* トレンドチャート / 趋势图 */
.trend-card {
  padding: 16px 20px;
}
.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 120px;
  padding-bottom: 4px;
}
.trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.trend-bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  width: 100%;
  justify-content: center;
}
.trend-bar {
  width: 16px;
  min-height: 2px;
  transition: height 0.5s ease;
}
.trend-bar--created {
  background: var(--o-brand-primary, #0052A3);
  opacity: 0.6;
}
.trend-bar--shipped {
  background: var(--o-success, #3D8B37);
}
.trend-label {
  font-size: 11px;
  color: var(--o-gray-500, #909399);
  margin-top: 6px;
  white-space: nowrap;
}
.trend-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}
.trend-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.trend-dot {
  width: 10px;
  height: 10px;
  display: inline-block;
}
.trend-dot--created {
  background: var(--o-brand-primary, #0052A3);
  opacity: 0.6;
}
.trend-dot--shipped {
  background: var(--o-success, #3D8B37);
}

.recent-table-card {
  padding: 0;
  overflow: hidden;
  margin-bottom: 8px;
}

.o-table {
  width: 100%;
  border-collapse: collapse;
}

.o-table th {
  background: var(--o-gray-50, #f5f7fa);
  padding: 10px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.o-table td {
  padding: 10px 16px;
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  border-bottom: 1px solid var(--o-border-color-light, #ebeef5);
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background: var(--o-gray-50, #f5f7fa);
}

.empty-row {
  text-align: center;
  color: var(--o-gray-400, #c0c4cc);
  padding: 24px 16px !important;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-shipped { background: #f0f9eb; color: #67c23a; }
.status-confirmed { background: #ecf5ff; color: #409eff; }
.status-held { background: #fdf6ec; color: #e6a23c; }
.status-draft { background: #f4f4f5; color: #909399; }

.quick-nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.quick-nav-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-nav-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.nav-icon {
  color: var(--o-brand-primary, #714b67);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--o-gray-50, #f5f7fa);
  border-radius: 6px;
  flex-shrink: 0;
}

.nav-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
}

/* スケルトンスクリーン / 骨架屏 */
.skeleton-wrap { display: flex; flex-direction: column; gap: 20px; }
.skeleton-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.skeleton-grid.half { grid-template-columns: repeat(3, 1fr); }
.skeleton-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 20px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.skeleton-line {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
.skeleton-line.lg { width: 60px; height: 28px; }
.skeleton-line.sm { width: 80px; height: 14px; }
.skeleton-table {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 12px;
  display: flex; flex-direction: column; gap: 10px;
}
.skeleton-row {
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
@keyframes shimmer { to { background-position: -200% 0; } }

.error-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--o-gray-500, #909399);
}

@media (max-width: 768px) {
  .user-info-bar {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .dashboard-banner {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .quick-actions-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .two-col-row {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-nav-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .skeleton-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .skeleton-grid.half {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* ダークモード / 暗色模式 */
:global([data-theme="dark"]) .user-info-bar {
  background: var(--o-view-background, #1a1a1a);
}
:global([data-theme="dark"]) .dashboard-banner {
  background: linear-gradient(135deg, #8B4A30 0%, #6B3A22 100%);
}
:global([data-theme="dark"]) .quick-action-btn {
  border-color: rgba(0, 82, 163, 0.5);
}
:global([data-theme="dark"]) .metric-card--warn {
  background: rgba(230, 162, 60, 0.1);
}
:global([data-theme="dark"]) .metric-card--danger {
  background: rgba(245, 108, 108, 0.1);
}
:global([data-theme="dark"]) .skeleton-line,
:global([data-theme="dark"]) .skeleton-row {
  background: linear-gradient(90deg, #2a2622 25%, #3a3530 50%, #2a2622 75%);
  background-size: 200% 100%;
}
</style>
