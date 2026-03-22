<template>
  <div class="client-dashboard">
    <!-- ウェルカムバナー / 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="banner-left">
        <h1 class="banner-title">
          {{ clientName ? `${clientName} 様` : t('wms.clientPortal.welcome', 'ようこそ') }}
        </h1>
        <p class="banner-subtitle">{{ t('wms.clientPortal.subtitle', '荷主ポータル') }} - {{ todayLabel }}</p>
      </div>
      <div class="banner-right">
        <span class="last-update" v-if="dashboardData">
          {{ t('wms.ui.lastUpdate', '最終更新') }}: {{ formatTime(new Date().toISOString()) }}
        </span>
        <button class="refresh-btn" @click="loadDashboard" :disabled="loading">
          {{ loading ? t('wms.ui.loadingShort', '読込中...') : t('wms.ui.refresh', '更新') }}
        </button>
      </div>
    </div>

    <!-- スケルトン / 骨架屏 -->
    <div v-if="loading && !dashboardData" class="skeleton-wrap">
      <div class="skeleton-grid">
        <div v-for="i in 4" :key="i" class="skeleton-card">
          <div class="skeleton-line lg" />
          <div class="skeleton-line sm" />
        </div>
      </div>
      <div class="skeleton-table">
        <div v-for="i in 5" :key="i" class="skeleton-row" />
      </div>
    </div>

    <!-- エラー / 错误 -->
    <div v-else-if="error" class="error-state o-card">
      <p>{{ t('wms.ui.fetchError', 'データの取得に失敗しました') }}: {{ error }}</p>
      <button class="retry-btn" @click="loadDashboard">{{ t('wms.ui.retry', '再試行') }}</button>
    </div>

    <template v-else-if="dashboardData">
      <!-- KPI カード / KPI 卡片 -->
      <h2 class="section-title">{{ t('wms.clientPortal.kpiTitle', '出荷概要') }}</h2>
      <div class="kpi-grid">
        <div class="kpi-card o-card">
          <div class="kpi-icon-wrap kpi-icon--blue">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 0 8 1.5V3h1.5z" />
            </svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ formatNumber(dashboardData.stats.totalOrders) }}</div>
            <div class="kpi-label">{{ t('wms.clientPortal.totalOrders', '総出荷件数') }}</div>
          </div>
        </div>

        <div class="kpi-card o-card">
          <div class="kpi-icon-wrap kpi-icon--green">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z" />
            </svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ formatNumber(dashboardData.stats.shippedOrders) }}</div>
            <div class="kpi-label">{{ t('wms.clientPortal.shippedOrders', '出荷済') }}</div>
          </div>
        </div>

        <div class="kpi-card o-card">
          <div class="kpi-icon-wrap kpi-icon--orange">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.399l-.395.016-.089-.416 2.414-.528h.005z" />
            </svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ formatNumber(dashboardData.stats.pendingOrders) }}</div>
            <div class="kpi-label">{{ t('wms.clientPortal.pendingOrders', '保留中') }}</div>
          </div>
        </div>

        <div class="kpi-card o-card">
          <div class="kpi-icon-wrap kpi-icon--purple">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z" />
            </svg>
          </div>
          <div class="kpi-content">
            <div class="kpi-value">{{ formatCurrency(dashboardData.stats.totalShippingCost) }}</div>
            <div class="kpi-label">{{ t('wms.clientPortal.totalShippingCost', '配送料金合計') }}</div>
          </div>
        </div>
      </div>

      <!-- 最近の出荷 / 最近出荷 -->
      <h2 class="section-title">{{ t('wms.clientPortal.recentOrders', '最近の出荷') }}</h2>
      <div class="o-card table-card">
        <table class="o-table">
          <thead>
            <tr>
              <th>{{ t('wms.ui.orderNumber', '注文番号') }}</th>
              <th>{{ t('wms.clientPortal.quantity', '個数') }}</th>
              <th>{{ t('wms.clientPortal.shippingCost', '配送料') }}</th>
              <th>{{ t('wms.clientPortal.shippedAt', '出荷日') }}</th>
              <th>{{ t('wms.ui.shipPlanDate', '出荷予定日') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in dashboardData.recentOrders" :key="order._id">
              <td>{{ order.orderNumber || '-' }}</td>
              <td>{{ order._productsMeta?.totalQuantity ?? '-' }}</td>
              <td>{{ order.shippingCost != null ? formatCurrency(order.shippingCost) : '-' }}</td>
              <td>{{ order.statusShippedAt ? formatDate(order.statusShippedAt) : '-' }}</td>
              <td>{{ order.shipPlanDate || '-' }}</td>
            </tr>
            <tr v-if="dashboardData.recentOrders.length === 0">
              <td colspan="5" class="empty-row">{{ t('wms.ui.noData', 'データがありません') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 請求書 / 发票 -->
      <h2 class="section-title">{{ t('wms.clientPortal.recentInvoices', '最近の請求書') }}</h2>
      <div class="o-card table-card">
        <table class="o-table">
          <thead>
            <tr>
              <th>{{ t('wms.clientPortal.invoiceNumber', '請求書番号') }}</th>
              <th>{{ t('wms.clientPortal.period', '対象期間') }}</th>
              <th>{{ t('wms.clientPortal.issueDate', '発行日') }}</th>
              <th>{{ t('wms.clientPortal.dueDate', '支払期限') }}</th>
              <th>{{ t('wms.clientPortal.amount', '金額') }}</th>
              <th>{{ t('wms.ui.status', 'ステータス') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in dashboardData.invoices" :key="inv._id">
              <td>{{ inv.invoiceNumber }}</td>
              <td>{{ inv.period }}</td>
              <td>{{ formatDate(inv.issueDate) }}</td>
              <td>{{ formatDate(inv.dueDate) }}</td>
              <td>{{ formatCurrency(inv.totalAmount) }}</td>
              <td>
                <span :class="['status-badge', `status-${inv.status}`]">
                  {{ invoiceStatusLabel(inv.status) }}
                </span>
              </td>
            </tr>
            <tr v-if="dashboardData.invoices.length === 0">
              <td colspan="6" class="empty-row">{{ t('wms.ui.noData', 'データがありません') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- 追跡番号検索 / 追踪号查询 -->
      <h2 class="section-title">{{ t('wms.clientPortal.trackingSearch', '出荷追跡') }}</h2>
      <div class="o-card search-card">
        <div class="tracking-search-row">
          <input
            v-model="trackingQuery"
            type="text"
            class="o-input tracking-input"
            :placeholder="t('wms.clientPortal.trackingPlaceholder', '注文番号・追跡番号・管理番号で検索...')"
            @keydown.enter="handleTrackingSearch"
          />
          <button class="search-btn" @click="handleTrackingSearch" :disabled="trackingLoading">
            {{ trackingLoading ? '...' : t('wms.common.search', '検索') }}
          </button>
        </div>
        <div v-if="trackingResults.length > 0" class="tracking-results">
          <table class="o-table">
            <thead>
              <tr>
                <th>{{ t('wms.ui.orderNumber', '注文番号') }}</th>
                <th>{{ t('wms.clientPortal.trackingId', '追跡番号') }}</th>
                <th>{{ t('wms.clientPortal.recipient', '届け先') }}</th>
                <th>{{ t('wms.ui.status', 'ステータス') }}</th>
                <th>{{ t('wms.clientPortal.shippedAt', '出荷日') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in trackingResults" :key="r.orderNumber">
                <td>{{ r.orderNumber }}</td>
                <td class="mono">{{ r.trackingId || '-' }}</td>
                <td>{{ r.recipient }}</td>
                <td><span :class="['status-badge', r.status === '出荷済' ? 'status-shipped' : 'status-pending']">{{ r.status }}</span></td>
                <td>{{ r.shippedAt ? formatDate(r.shippedAt) : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="trackingSearched && !trackingLoading" class="empty-hint">
          {{ t('wms.clientPortal.noTrackingResults', '該当する出荷情報が見つかりませんでした') }}
        </div>
      </div>

      <!-- 在庫状況 / 库存状况 -->
      <h2 class="section-title">{{ t('wms.clientPortal.stockStatus', '在庫状況') }}</h2>
      <div class="o-card table-card">
        <div v-if="stockLoading" class="loading-hint">{{ t('wms.ui.loading', '読み込み中...') }}</div>
        <table v-else class="o-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>{{ t('wms.clientPortal.productName', '商品名') }}</th>
              <th class="text-right">{{ t('wms.clientPortal.totalStock', '在庫数') }}</th>
              <th class="text-right">{{ t('wms.clientPortal.reserved', '引当済') }}</th>
              <th class="text-right">{{ t('wms.clientPortal.available', '利用可能') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in stockItems" :key="item.productSku">
              <td class="mono">{{ item.productSku }}</td>
              <td>{{ item.productName }}</td>
              <td class="text-right">{{ formatNumber(item.quantity) }}</td>
              <td class="text-right">{{ formatNumber(item.reservedQuantity) }}</td>
              <td class="text-right" style="font-weight:600;color:#67c23a;">{{ formatNumber(item.availableQuantity) }}</td>
            </tr>
            <tr v-if="stockItems.length === 0">
              <td colspan="5" class="empty-row">{{ t('wms.ui.noData', 'データがありません') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { fetchClientDashboard, fetchClientStock, searchTracking, type ClientPortalDashboard, type ClientStockItem, type TrackingResult } from '@/api/clientPortal'

const { t } = useI18n()

const dashboardData = ref<ClientPortalDashboard | null>(null)
const loading = ref(false)
const error = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null

// 在庫照会 / 库存查询
const stockItems = ref<ClientStockItem[]>([])
const stockLoading = ref(false)

// 追跡検索 / 追踪搜索
const trackingQuery = ref('')
const trackingResults = ref<TrackingResult[]>([])
const trackingLoading = ref(false)
const trackingSearched = ref(false)

// 荷主名 / 货主名
const clientName = computed(() => dashboardData.value?.clientName ?? '')

// 今日の日付 / 今天的日期
const todayLabel = computed(() => {
  const d = new Date()
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${weekdays[d.getDay()]}）`
})

// 請求書ステータスラベル / 发票状态标签
function invoiceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: t('wms.clientPortal.invoiceDraft', '下書き'),
    issued: t('wms.clientPortal.invoiceIssued', '発行済'),
    sent: t('wms.clientPortal.invoiceSent', '送付済'),
    paid: t('wms.clientPortal.invoicePaid', '入金済'),
    overdue: t('wms.clientPortal.invoiceOverdue', '未入金'),
    cancelled: t('wms.clientPortal.invoiceCancelled', 'キャンセル'),
  }
  return map[status] ?? status
}

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const [dashboard, stock] = await Promise.all([
      fetchClientDashboard(),
      fetchClientStock().catch(() => []),
    ])
    dashboardData.value = dashboard
    stockItems.value = stock
  } catch (err) {
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

async function handleTrackingSearch() {
  const q = trackingQuery.value.trim()
  if (!q) return
  trackingLoading.value = true
  trackingSearched.value = true
  try {
    trackingResults.value = await searchTracking(q)
  } catch {
    trackingResults.value = []
  } finally {
    trackingLoading.value = false
  }
}

// フォーマッター / 格式化函数
function formatNumber(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString()
}

function formatCurrency(amount: number | null | undefined): string {
  return `¥${(amount ?? 0).toLocaleString()}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

onMounted(() => {
  loadDashboard()
  // 60秒ごとに自動更新 / 每60秒自动更新
  refreshTimer = setInterval(loadDashboard, 60000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.client-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* ウェルカムバナー / 欢迎横幅 */
.welcome-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 28px;
  background: linear-gradient(135deg, #0052A3 0%, #3D8B37 100%);
  border-radius: 8px;
  margin-bottom: 24px;
  color: white;
}

.banner-left {
  min-width: 0;
}

.banner-title {
  font-size: 26px;
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
  flex-shrink: 0;
}

.last-update {
  font-size: 13px;
  opacity: 0.85;
}

.refresh-btn {
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  background: transparent;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* セクションタイトル / 区域标题 */
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 24px 0 12px 0;
}

/* KPI カード / KPI 卡片 */
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

.kpi-icon--orange {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.kpi-icon--purple {
  background: rgba(113, 75, 103, 0.1);
  color: #714b67;
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

.kpi-label {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin-top: 4px;
}

/* テーブルカード / 表格卡片 */
.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.25rem;
}

.table-card {
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

.empty-row {
  text-align: center;
  color: var(--o-gray-400, #c0c4cc);
  padding: 24px 16px !important;
}

/* ステータスバッジ / 状态徽章 */
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-draft {
  background: #f4f4f5;
  color: #909399;
}

.status-issued {
  background: #ecf5ff;
  color: #409eff;
}

.status-sent {
  background: #fdf6ec;
  color: #e6a23c;
}

.status-paid {
  background: #f0f9eb;
  color: #67c23a;
}

.status-overdue {
  background: #fef0f0;
  color: #f56c6c;
}

.status-cancelled {
  background: #f4f4f5;
  color: #c0c4cc;
}

/* スケルトン / 骨架屏 */
.skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.skeleton-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.skeleton-line {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

.skeleton-line.lg {
  width: 60px;
  height: 28px;
}

.skeleton-line.sm {
  width: 80px;
  height: 14px;
}

.skeleton-table {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-row {
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

/* エラー / 错误 */
.error-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--o-gray-500, #909399);
}

.retry-btn {
  margin-top: 12px;
  padding: 8px 20px;
  border: 1px solid var(--o-brand-primary, #0052A3);
  border-radius: 6px;
  background: var(--o-brand-primary, #0052A3);
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.retry-btn:hover {
  opacity: 0.9;
}

/* レスポンシブ / 响应式 */
@media (max-width: 768px) {
  .welcome-banner {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .skeleton-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .o-table {
    font-size: 12px;
  }
}

/* ダークモード / 暗色模式 */
:global([data-theme="dark"]) .welcome-banner {
  background: linear-gradient(135deg, #1a3a5c 0%, #1a4a2a 100%);
}

:global([data-theme="dark"]) .skeleton-line,
:global([data-theme="dark"]) .skeleton-row {
  background: linear-gradient(90deg, #2a2622 25%, #3a3530 50%, #2a2622 75%);
  background-size: 200% 100%;
}

/* 追跡検索 / 追踪搜索 */
.search-card { padding: 16px; }
.tracking-search-row { display: flex; gap: 8px; margin-bottom: 12px; }
.tracking-input { flex: 1; font-size: 15px; padding: 10px 14px; border: 2px solid var(--o-border-color, #e4e7ed); border-radius: 6px; transition: border-color 0.15s; }
.tracking-input:focus { border-color: var(--o-brand-primary); outline: none; }
.search-btn { padding: 10px 20px; background: var(--o-brand-primary, #0052A3); color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
.search-btn:hover { opacity: 0.9; }
.search-btn:disabled { opacity: 0.5; }
.tracking-results { margin-top: 8px; }
.mono { font-family: monospace; font-weight: 600; }
.text-right { text-align: right; }
.empty-hint { text-align: center; padding: 16px; color: var(--o-gray-400); font-size: 13px; }
.loading-hint { text-align: center; padding: 24px; color: var(--o-gray-500); }

.status-shipped { background: #f0f9eb; color: #67c23a; }
.status-pending { background: #ecf5ff; color: #409eff; }

@media (max-width: 768px) {
  .tracking-search-row { flex-direction: column; }
  .tracking-input { font-size: 16px; }
}
</style>
