<template>
  <div class="dashboard-page">
    <div class="dashboard-banner">
      <div class="banner-left">
        <h1 class="banner-title">{{ t('wms.ui.dashboardTitle', '運営ダッシュボード') }}</h1>
        <p class="banner-subtitle">{{ t('wms.ui.dashboardSubtitle', 'リアルタイム運営概要') }}</p>
      </div>
      <div class="banner-right">
        <span class="last-update" v-if="data">
          {{ t('wms.ui.lastUpdate', '最終更新') }}: {{ formatTime(data.generatedAt) }}
        </span>
        <OButton variant="secondary" size="sm" @click="loadData" :disabled="loading">
          {{ loading ? t('wms.ui.loadingShort', '読込中...') : t('wms.ui.refresh', '更新') }}
        </OButton>
      </div>
    </div>

    <div v-if="loading && !data" class="loading-state">
      {{ t('wms.ui.loadingData', 'データを読み込み中...') }}
    </div>

    <div v-else-if="error" class="error-state o-card">
      <p>{{ t('wms.ui.fetchError', 'データの取得に失敗しました') }}: {{ error }}</p>
      <OButton variant="primary" @click="loadData">{{ t('wms.ui.retry', '再試行') }}</OButton>
    </div>

    <template v-else-if="data">
      <div class="section-title-row">
        <h2 class="section-title">{{ t('wms.ui.shipmentStatus', '出荷状況') }}</h2>
      </div>
      <div class="metrics-grid">
        <div class="metric-card o-card" @click="navigateTo('/shipment-orders/create')">
          <div class="metric-value">{{ data.shipments.todayCreated }}</div>
          <div class="metric-label">{{ t('wms.ui.todayCreated', '本日作成') }}</div>
        </div>
        <div class="metric-card o-card" @click="navigateTo('/shipment-operations/tasks')">
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
        <div class="metric-card o-card" v-if="data.shipments.totalHeld > 0">
          <div class="metric-value highlight-red">{{ data.shipments.totalHeld }}</div>
          <div class="metric-label">{{ t('wms.ui.onHold', '保留中') }}</div>
        </div>
        <div class="metric-card o-card" v-if="data.overdueOrders > 0">
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
              @click="navigateTo('/shipment-orders/create')"
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
          <span class="nav-icon">{{ card.icon }}</span>
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
import { fetchDashboardOverview, type DashboardOverview } from '@/api/dashboard'

const { t } = useI18n()
const router = useRouter()
const data = ref<DashboardOverview | null>(null)
const loading = ref(false)
const error = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null

const quickNavCards = computed(() => [
  { title: t('wms.ui.navCreateShipment', '出荷指示作成'), icon: '+', path: '/shipment-orders/create' },
  { title: t('wms.ui.navShipmentOps', '出荷作業'), icon: '>', path: '/shipment-operations/tasks' },
  { title: t('wms.ui.navInbound', '入庫管理'), icon: 'v', path: '/inbound/dashboard' },
  { title: t('wms.ui.navInventory', '在庫一覧'), icon: '#', path: '/inventory/stock' },
  { title: t('wms.ui.navStocktaking', '棚卸管理'), icon: '=', path: '/stocktaking/list' },
  { title: t('wms.ui.navReturns', '返品管理'), icon: '<', path: '/returns/list' },
  { title: t('wms.ui.navDaily', '日次管理'), icon: 'D', path: '/daily/list' },
  { title: t('wms.ui.navSettings', '設定'), icon: '*', path: '/settings/basic' },
])

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchDashboardOverview()
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
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
}

.dashboard-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: linear-gradient(135deg, #D97756 0%, #B85D3A 100%);
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

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  font-size: 18px;
  font-weight: 700;
  color: var(--o-brand-primary, #714b67);
  width: 28px;
  height: 28px;
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

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--o-gray-500, #909399);
  font-size: 16px;
}

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
}
</style>
