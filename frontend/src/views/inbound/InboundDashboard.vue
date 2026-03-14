<template>
  <div class="inbound-dashboard">
    <ControlPanel :title="t('wms.inbound.dashboard', '入庫ダッシュボード')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="loadData">{{ t('wms.common.refresh', '更新') }}</OButton>
          <OButton variant="primary" size="sm" @click="$router.push('/inbound/create')">{{ t('wms.common.create', '新規作成') }}</OButton>
        </div>
      </template>
    </ControlPanel>

    <div v-if="isLoading" class="loading-state">{{ t('wms.common.loading', '読み込み中...') }}</div>

    <template v-else>
      <!-- ステータス集計カード -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="summary-number">{{ statusCounts.draft }}</div>
          <div class="summary-label">{{ t('wms.inbound.statusDraft', '下書き') }}</div>
        </div>
        <div class="summary-card summary-card--primary">
          <div class="summary-number">{{ statusCounts.confirmed }}</div>
          <div class="summary-label">{{ t('wms.inbound.statusConfirmedWaiting', '確認済（検品待ち）') }}</div>
        </div>
        <div class="summary-card summary-card--warning">
          <div class="summary-number">{{ statusCounts.receiving }}</div>
          <div class="summary-label">{{ t('wms.inbound.statusReceiving', '検品中') }}</div>
        </div>
        <div class="summary-card summary-card--info">
          <div class="summary-number">{{ statusCounts.received }}</div>
          <div class="summary-label">{{ t('wms.inbound.statusReceivedWaiting', '検品済（棚入れ待ち）') }}</div>
        </div>
        <div class="summary-card summary-card--success">
          <div class="summary-number">{{ statusCounts.done }}</div>
          <div class="summary-label">{{ t('wms.inbound.statusDone', '完了') }}</div>
        </div>
      </div>

      <!-- 本日予定到着 -->
      <div class="section">
        <h2 class="section-title">{{ t('wms.inbound.todaySchedule', '本日の入庫予定') }}</h2>
        <div v-if="todayOrders.length === 0" class="empty-state">{{ t('wms.inbound.noTodaySchedule', '本日の入庫予定はありません') }}</div>
        <div v-else class="today-grid">
          <div v-for="row in todayOrders" :key="row._id" class="o-card today-card" @click="goToOrder(row)">
            <div class="today-header">
              <span class="order-number">{{ row.orderNumber }}</span>
              <span class="o-status-tag" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            </div>
            <div class="today-info">
              <span v-if="row.supplier?.name">{{ row.supplier.name }}</span>
              <span>{{ row.lines.length }} {{ t('wms.inbound.lines', '行') }}</span>
              <span>{{ totalExpected(row) }} {{ t('wms.inbound.pieces', '個') }}</span>
            </div>
            <div class="today-progress">
              <div class="progress-bar">
                <div class="progress-bar__fill" :style="{ width: orderProgress(row) + '%' }"></div>
              </div>
              <span class="progress-text">{{ totalReceived(row) }} / {{ totalExpected(row) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 処理待ち（confirmed + receiving） -->
      <div class="section">
        <h2 class="section-title">{{ t('wms.inbound.pending', '処理待ち') }}</h2>
        <div v-if="pendingOrders.length === 0" class="empty-state">{{ t('wms.inbound.noPending', '処理待ちの入庫指示はありません') }}</div>
        <div class="o-table-wrapper" v-else>
          <table class="o-table">
            <thead>
              <tr>
                <th class="o-table-th">{{ t('wms.inbound.orderNumber', '入庫指示番号') }}</th>
                <th class="o-table-th">{{ t('wms.inbound.status', '状態') }}</th>
                <th class="o-table-th">{{ t('wms.inbound.supplier', '仕入先') }}</th>
                <th class="o-table-th o-table-th--right">{{ t('wms.inbound.lineCount', '行数') }}</th>
                <th class="o-table-th o-table-th--right">{{ t('wms.inbound.progress', '進捗') }}</th>
                <th class="o-table-th">{{ t('wms.inbound.expectedDate', '入庫予定日') }}</th>
                <th class="o-table-th" style="width:120px;">{{ t('wms.common.actions', '操作') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pendingOrders" :key="row._id" class="o-table-row">
                <td class="o-table-td"><span class="order-number">{{ row.orderNumber }}</span></td>
                <td class="o-table-td"><span class="o-status-tag" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span></td>
                <td class="o-table-td">{{ row.supplier?.name || '-' }}</td>
                <td class="o-table-td o-table-td--right">{{ row.lines.length }}</td>
                <td class="o-table-td o-table-td--right">{{ totalReceived(row) }} / {{ totalExpected(row) }}</td>
                <td class="o-table-td">{{ row.expectedDate ? formatDate(row.expectedDate) : '-' }}</td>
                <td class="o-table-td">
                  <OButton variant="primary" size="sm" @click="goToOrder(row)">{{ t('wms.inbound.handle', '対応') }}</OButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 期限切れ（overdue） -->
      <div v-if="overdueOrders.length > 0" class="section">
        <h2 class="section-title section-title--danger">{{ t('wms.inbound.overdue', '期限超過') }}</h2>
        <div class="o-table-wrapper">
          <table class="o-table">
            <thead>
              <tr>
                <th class="o-table-th">{{ t('wms.inbound.orderNumber', '入庫指示番号') }}</th>
                <th class="o-table-th">{{ t('wms.inbound.status', '状態') }}</th>
                <th class="o-table-th">{{ t('wms.inbound.supplier', '仕入先') }}</th>
                <th class="o-table-th">{{ t('wms.inbound.expectedDate', '入庫予定日') }}</th>
                <th class="o-table-th">{{ t('wms.inbound.daysOverdue', '経過日数') }}</th>
                <th class="o-table-th" style="width:120px;">{{ t('wms.common.actions', '操作') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in overdueOrders" :key="row._id" class="o-table-row">
                <td class="o-table-td"><span class="order-number">{{ row.orderNumber }}</span></td>
                <td class="o-table-td"><span class="o-status-tag" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span></td>
                <td class="o-table-td">{{ row.supplier?.name || '-' }}</td>
                <td class="o-table-td text-danger">{{ formatDate(row.expectedDate!) }}</td>
                <td class="o-table-td text-danger">{{ daysOverdue(row.expectedDate!) }}{{ t('wms.inbound.days', '日') }}</td>
                <td class="o-table-td">
                  <OButton variant="primary" size="sm" @click="goToOrder(row)">{{ t('wms.inbound.handle', '対応') }}</OButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchInboundOrders } from '@/api/inboundOrder'
import type { InboundOrder } from '@/types/inventory'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const isLoading = ref(false)
const allOrders = ref<InboundOrder[]>([])

const statusCounts = computed(() => {
  const counts = { draft: 0, confirmed: 0, receiving: 0, received: 0, done: 0, cancelled: 0 }
  for (const o of allOrders.value) {
    if (o.status in counts) counts[o.status as keyof typeof counts]++
  }
  return counts
})

const today = new Date().toISOString().slice(0, 10)

const todayOrders = computed(() =>
  allOrders.value.filter(o =>
    o.expectedDate && o.expectedDate.slice(0, 10) === today && o.status !== 'done' && o.status !== 'cancelled',
  ),
)

const pendingOrders = computed(() =>
  allOrders.value.filter(o =>
    ['confirmed', 'receiving', 'received'].includes(o.status),
  ).slice(0, 20),
)

const overdueOrders = computed(() =>
  allOrders.value.filter(o =>
    o.expectedDate && o.expectedDate.slice(0, 10) < today &&
    !['done', 'cancelled'].includes(o.status),
  ),
)

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    draft: t('wms.inbound.statusDraft', '下書き'),
    confirmed: t('wms.inbound.statusConfirmed', '確認済'),
    receiving: t('wms.inbound.statusReceiving', '入庫中'),
    received: t('wms.inbound.statusReceived', '検品済'),
    done: t('wms.inbound.statusDone', '完了'),
    cancelled: t('wms.common.cancel', 'キャンセル'),
  }
  return map[s] || s
}

const statusClass = (s: string) => {
  const map: Record<string, string> = {
    draft: 'o-status-tag--draft', confirmed: 'o-status-tag--issued', receiving: 'o-status-tag--printed',
    received: 'o-status-tag--issued', done: 'o-status-tag--confirmed', cancelled: 'o-status-tag--cancelled',
  }
  return map[s] || ''
}

const totalExpected = (row: InboundOrder) => row.lines.reduce((s, l) => s + l.expectedQuantity, 0)
const totalReceived = (row: InboundOrder) => row.lines.reduce((s, l) => s + l.receivedQuantity, 0)
const orderProgress = (row: InboundOrder) => {
  const exp = totalExpected(row)
  return exp > 0 ? Math.round((totalReceived(row) / exp) * 100) : 0
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')

const daysOverdue = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  return Math.max(1, Math.floor(diff / 86400000))
}

const goToOrder = (row: InboundOrder) => {
  if (row.status === 'received') {
    router.push(`/inbound/putaway/${row._id}`)
  } else if (row.status === 'confirmed' || row.status === 'receiving') {
    router.push(`/inbound/receive/${row._id}`)
  } else {
    router.push('/inbound/orders')
  }
}

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchInboundOrders({ limit: 500 })
    allOrders.value = res.items
  } catch (e: any) {
    toast.showError(e?.message || t('wms.common.fetchError', 'データの取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inbound-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--o-gray-500, #909399);
  font-size: 14px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 1rem;
  text-align: center;
}

.summary-card--primary { border-left: 4px solid var(--o-brand-primary, #D97756); }
.summary-card--warning { border-left: 4px solid var(--o-warning); }
.summary-card--info { border-left: 4px solid var(--o-info); }
.summary-card--success { border-left: 4px solid var(--o-success); }

.summary-number {
  font-size: 28px;
  font-weight: 700;
  color: var(--o-gray-800, #1f2937);
}

.summary-label {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-top: 4px;
}

.section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--o-border-color, #e4e7ed);
}

.section-title--danger {
  border-bottom-color: var(--o-danger);
  color: var(--o-danger);
}

.today-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 1rem;
}

.today-card {
  cursor: pointer;
  transition: all 0.2s;
}

.today-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.today-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.order-number {
  font-family: monospace;
  font-weight: 600;
  color: var(--o-brand-primary, #D97756);
}

.today-info {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin-bottom: 10px;
}

.today-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--o-gray-200, #e4e7ed);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: var(--o-success);
  border-radius: 3px;
  transition: width 0.3s;
}

.progress-text {
  font-size: 12px;
  color: var(--o-gray-600, #606266);
  white-space: nowrap;
}

.text-danger { color: var(--o-danger); font-weight: 600; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

.o-status-tag--draft { background: var(--o-gray-100); color: var(--o-gray-500); }
.o-status-tag--cancelled { background: var(--o-danger-bg); color: var(--o-danger); }
</style>
