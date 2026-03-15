<template>
  <div class="dashboard-page">
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

    <div v-if="loading && !data" class="skeleton-wrap">
      <div class="skeleton-grid">
        <div v-for="i in 4" :key="i" class="skeleton-card"><div class="skeleton-line lg" /><div class="skeleton-line sm" /></div>
      </div>
      <div class="skeleton-grid half">
        <div v-for="i in 3" :key="i" class="skeleton-card"><div class="skeleton-line lg" /><div class="skeleton-line sm" /></div>
      </div>
      <div class="skeleton-table"><div v-for="i in 5" :key="i" class="skeleton-row" /></div>
    </div>

    <div v-else-if="error" class="error-state o-card">
      <p>{{ t('wms.ui.fetchError', 'データの取得に失敗しました') }}: {{ error }}</p>
      <OButton variant="primary" @click="loadData">{{ t('wms.ui.retry', '再試行') }}</OButton>
    </div>

    <template v-else-if="data">
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
                <span :class="['status-badge', getStatusClass(order.status)]">
                  {{ getStatusText(order.status) }}
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
import OButton from '@/components/odoo/OButton.vue'
import { fetchDashboardOverview, fetchShipmentTrend, type DashboardOverview, type TrendItem } from '@/api/dashboard'

const { t } = useI18n()
const router = useRouter()
const data = ref<DashboardOverview | null>(null)
const trendData = ref<TrendItem[]>([])
const loading = ref(false)
const error = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null

const todayLabel = computed(() => {
  const d = new Date()
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`
})

// SVG 图标路径 / SVGアイコンパス
const icons = {
  // 出荷指示作成: 加号文档 / プラスドキュメント
  createShipment: 'M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM8 6.5a.5.5 0 0 0-1 0V8H5.5a.5.5 0 0 0 0 1H7v1.5a.5.5 0 0 0 1 0V9h1.5a.5.5 0 0 0 0-1H8V6.5z',
  // 出荷作業: トラック
  shipmentOps: 'M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-4 0h-.5A1.5 1.5 0 0 1-1 10.5v-7zM3 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  // 入庫管理: 箱に入る矢印
  inbound: 'M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5zM7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z',
  // 在庫一覧: グリッドボックス
  inventory: 'M2.5 0A2.5 2.5 0 0 0 0 2.5v11A2.5 2.5 0 0 0 2.5 16h11a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 13.5 0h-11zM1 2.5A1.5 1.5 0 0 1 2.5 1H7v5H1V2.5zM1 7h6v5H2.5A1.5 1.5 0 0 1 1 10.5V7zm7-6h5.5A1.5 1.5 0 0 1 15 2.5V6H8V1zm0 6h7v3.5a1.5 1.5 0 0 1-1.5 1.5H8V7z',
  // 棚卸管理: クリップボードチェック
  stocktaking: 'M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0zM4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1zM9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3z',
  // 返品管理: リターン矢印
  returns: 'M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8zm15 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-4.5-.5a.5.5 0 0 1 0 1H5.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L5.707 7.5H11.5z',
  // 日次管理: カレンダー
  daily: 'M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z',
  // 設定: ギア
  settings: 'M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0zM9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z',
}

const quickNavCards = computed(() => [
  { title: t('wms.ui.navCreateShipment', '出荷指示作成'), icon: icons.createShipment, path: '/shipment/orders/create' },
  { title: t('wms.ui.navShipmentOps', '出荷作業'), icon: icons.shipmentOps, path: '/shipment/operations/tasks' },
  { title: t('wms.ui.navInbound', '入庫管理'), icon: icons.inbound, path: '/inbound/dashboard' },
  { title: t('wms.ui.navInventory', '在庫一覧'), icon: icons.inventory, path: '/inventory/stock' },
  { title: t('wms.ui.navStocktaking', '棚卸管理'), icon: icons.stocktaking, path: '/stocktaking/list' },
  { title: t('wms.ui.navReturns', '返品管理'), icon: icons.returns, path: '/returns/list' },
  { title: t('wms.ui.navDaily', '日次管理'), icon: icons.daily, path: '/daily/list' },
  { title: t('wms.ui.navSettings', '設定'), icon: icons.settings, path: '/settings/basic' },
])

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [overview, trend] = await Promise.all([
      fetchDashboardOverview(),
      fetchShipmentTrend().catch(() => [] as TrendItem[]),
    ])
    data.value = overview
    trendData.value = trend
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

// 柱状图高度计算 / バーの高さ計算
function trendBarHeight(value: number): string {
  const max = Math.max(1, ...trendData.value.map(d => Math.max(d.created, d.shipped)))
  return `${Math.max(2, (value / max) * 100)}%`
}

function getStatusClass(status: Record<string, unknown>): string {
  const s = status as Record<string, Record<string, boolean>>
  if (s.shipped?.isShipped) return 'status-shipped'
  if (s.held?.isHeld) return 'status-held'
  if (s.confirm?.isConfirmed) return 'status-confirmed'
  return 'status-draft'
}

function getStatusText(status: Record<string, unknown>): string {
  const s = status as Record<string, Record<string, boolean>>
  if (s.shipped?.isShipped) return t('wms.ui.statusShipped', '出荷済')
  if (s.held?.isHeld) return t('wms.ui.statusHeld', '保留')
  if (s.confirm?.isConfirmed) return t('wms.ui.statusConfirmed', '確認済')
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
  return n.toLocaleString()
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

.dashboard-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: linear-gradient(135deg, #0052A3 0%, #B85D3A 100%);
  border-radius: 8px;
  margin-bottom: 28px;
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

/* 趋势图 / トレンドチャート */
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

/* 骨架屏 / スケルトンスクリーン */
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
  .dashboard-banner {
    flex-direction: column;
    gap: 12px;
    text-align: center;
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

/* 暗色模式 / ダークモード */
:global([data-theme="dark"]) .dashboard-banner {
  background: linear-gradient(135deg, #8B4A30 0%, #6B3A22 100%);
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
