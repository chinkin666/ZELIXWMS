<template>
  <div class="return-dashboard">
    <ControlPanel :title="t('wms.returns.dashboard', '返品ダッシュボード')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="loadData">{{ t('wms.common.refresh', '更新') }}</OButton>
          <OButton variant="primary" size="sm" @click="$router.push('/returns/create')">{{ t('wms.common.create', '新規作成') }}</OButton>
        </div>
      </template>
    </ControlPanel>

    <div v-if="isLoading" class="loading-state">{{ t('wms.common.loading', '読み込み中...') }}</div>

    <template v-else-if="stats">
      <!-- ステータス別KPIカード / 按状态KPI卡片 -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">{{ totalReturns }}</div>
          <div class="kpi-label">{{ t('wms.returns.totalReturns', '返品合計') }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ stats.statusCounts.draft }}</div>
          <div class="kpi-label">{{ t('wms.returns.statusDraft', '下書き') }}</div>
        </div>
        <div class="kpi-card kpi-card--warning">
          <div class="kpi-value">{{ stats.statusCounts.inspecting }}</div>
          <div class="kpi-label">{{ t('wms.returns.statusInspecting', '検品中') }}</div>
        </div>
        <div class="kpi-card kpi-card--success">
          <div class="kpi-value">{{ stats.statusCounts.completed }}</div>
          <div class="kpi-label">{{ t('wms.returns.statusCompleted', '完了') }}</div>
        </div>
        <div class="kpi-card kpi-card--danger">
          <div class="kpi-value">{{ stats.statusCounts.cancelled }}</div>
          <div class="kpi-label">{{ t('wms.returns.statusCancelled', 'キャンセル') }}</div>
        </div>
      </div>

      <!-- 再入庫・廃棄集計 / 再入库・废弃汇总 -->
      <div class="kpi-grid kpi-grid--secondary">
        <div class="kpi-card">
          <div class="kpi-value">{{ stats.totalRestocked }}</div>
          <div class="kpi-label">{{ t('wms.returns.totalRestocked', '再入庫合計') }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ stats.totalDisposed }}</div>
          <div class="kpi-label">{{ t('wms.returns.totalDisposed', '廃棄合計') }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ restockRatio }}%</div>
          <div class="kpi-label">{{ t('wms.returns.restockRatio', '再入庫率') }}</div>
        </div>
      </div>

      <!-- 返品理由別内訳 / 按退货理由分类 -->
      <div class="section">
        <h2 class="section-title">{{ t('wms.returns.reasonBreakdown', '返品理由別内訳') }}</h2>
        <div class="reason-grid">
          <div v-for="(count, reason) in stats.reasonBreakdown" :key="reason" class="reason-card">
            <div class="reason-count">{{ count }}</div>
            <div class="reason-label">{{ reasonLabel(String(reason)) }}</div>
          </div>
        </div>
      </div>

      <!-- 最近の返品（10件） / 最近的退货（10件） -->
      <div class="section">
        <h2 class="section-title">{{ t('wms.returns.recentReturns', '最近の返品') }}</h2>
        <div v-if="stats.recentReturns.length === 0" class="empty-state">{{ t('wms.returns.noReturns', '返品データがありません') }}</div>
        <div class="o-table-wrapper" v-else>
          <table class="o-table">
            <thead>
              <tr>
                <th class="o-table-th">{{ t('wms.returns.orderNumber', '返品番号') }}</th>
                <th class="o-table-th">{{ t('wms.returns.status', '状態') }}</th>
                <th class="o-table-th">{{ t('wms.returns.reason', '理由') }}</th>
                <th class="o-table-th">{{ t('wms.returns.customer', '顧客') }}</th>
                <th class="o-table-th o-table-th--right">{{ t('wms.returns.lineCount', '行数') }}</th>
                <th class="o-table-th">{{ t('wms.returns.receivedDate', '受領日') }}</th>
                <th class="o-table-th" style="width:100px;">{{ t('wms.common.actions', '操作') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in stats.recentReturns" :key="row._id" class="o-table-row">
                <td class="o-table-td"><span class="order-number">{{ row.orderNumber }}</span></td>
                <td class="o-table-td"><span class="o-status-tag" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span></td>
                <td class="o-table-td">{{ reasonLabel(row.returnReason) }}</td>
                <td class="o-table-td">{{ row.customerName || '-' }}</td>
                <td class="o-table-td o-table-td--right">{{ row.lines.length }}</td>
                <td class="o-table-td">{{ formatDate(row.receivedDate) }}</td>
                <td class="o-table-td">
                  <OButton variant="primary" size="sm" @click="goToDetail(row)">{{ t('wms.common.detail', '詳細') }}</OButton>
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
import { fetchReturnDashboardStats, type ReturnDashboardStats, type ReturnOrder } from '@/api/returnOrder'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const isLoading = ref(false)
const stats = ref<ReturnDashboardStats | null>(null)

// 返品合計数 / 退货合计数
const totalReturns = computed(() => {
  if (!stats.value) return 0
  const c = stats.value.statusCounts
  return c.draft + c.inspecting + c.completed + c.cancelled
})

// 再入庫率 / 再入库率
const restockRatio = computed(() => {
  if (!stats.value) return 0
  const total = stats.value.totalRestocked + stats.value.totalDisposed
  if (total === 0) return 0
  return Math.round((stats.value.totalRestocked / total) * 100)
})

// ステータスラベル / 状态标签
const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    draft: t('wms.returns.statusDraft', '下書き'),
    inspecting: t('wms.returns.statusInspecting', '検品中'),
    completed: t('wms.returns.statusCompleted', '完了'),
    cancelled: t('wms.common.cancel', 'キャンセル'),
  }
  return map[s] || s
}

// ステータスCSSクラス / 状态CSS类
const statusClass = (s: string) => {
  const map: Record<string, string> = {
    draft: 'o-status-tag--draft',
    inspecting: 'o-status-tag--printed',
    completed: 'o-status-tag--confirmed',
    cancelled: 'o-status-tag--cancelled',
  }
  return map[s] || ''
}

// 返品理由ラベル / 退货理由标签
const reasonLabel = (r: string) => {
  const map: Record<string, string> = {
    customer_request: t('wms.returns.reasonCustomerRequest', 'お客様都合'),
    defective: t('wms.returns.reasonDefective', '不良品'),
    wrong_item: t('wms.returns.reasonWrongItem', '誤配送'),
    damaged: t('wms.returns.reasonDamaged', '破損'),
    other: t('wms.returns.reasonOther', 'その他'),
  }
  return map[r] || r
}

const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')

const goToDetail = (row: ReturnOrder) => {
  router.push(`/returns/${row._id}`)
}

const loadData = async () => {
  isLoading.value = true
  try {
    stats.value = await fetchReturnDashboardStats()
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
.return-dashboard {
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

/* KPI カード / KPI卡片 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.kpi-grid--secondary {
  margin-bottom: 0.5rem;
}

.kpi-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.kpi-card--warning { border-left: 4px solid var(--o-warning, #e6a23c); }
.kpi-card--success { border-left: 4px solid var(--o-success, #67c23a); }
.kpi-card--danger { border-left: 4px solid var(--o-danger, #f56c6c); }

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--o-gray-800, #1f2937);
}

.kpi-label {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-top: 4px;
}

/* セクション / 区块 */
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

/* 理由別カード / 按理由分类卡片 */
.reason-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.reason-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.reason-count {
  font-size: 22px;
  font-weight: 700;
  color: var(--o-gray-800, #1f2937);
}

.reason-label {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-top: 2px;
}

/* テーブル補助 / 表格辅助 */
.order-number {
  font-family: monospace;
  font-weight: 600;
  color: var(--o-brand-primary, #0052A3);
}

.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

.o-status-tag--draft { background: var(--o-gray-100); color: var(--o-gray-500); }
.o-status-tag--cancelled { background: var(--o-danger-bg); color: var(--o-danger); }
</style>
