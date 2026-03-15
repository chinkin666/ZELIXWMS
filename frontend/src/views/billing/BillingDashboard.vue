<template>
  <div class="billing-dashboard">
    <ControlPanel title="請求ダッシュボード" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="loadData">更新</OButton>
      </template>
    </ControlPanel>

    <div v-if="isLoading" class="loading-state">読み込み中...</div>

    <template v-else-if="kpi">
      <!-- KPIカード / KPIカード -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-value">{{ kpi.monthlyShipmentCount.toLocaleString() }}</div>
          <div class="kpi-label">当月出荷件数</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">&yen;{{ kpi.monthlyShippingFee.toLocaleString() }}</div>
          <div class="kpi-label">当月配送料金</div>
        </div>
        <div class="kpi-card kpi-card--warning">
          <div class="kpi-value">&yen;{{ kpi.unbilledAmount.toLocaleString() }}</div>
          <div class="kpi-label">未請求額</div>
        </div>
        <div class="kpi-card kpi-card--danger">
          <div class="kpi-value">&yen;{{ kpi.unpaidAmount.toLocaleString() }}</div>
          <div class="kpi-label">未入金額</div>
        </div>
      </div>

      <!-- 最近の請求レコード / 最近の請求レコード -->
      <div class="section">
        <h2 class="section-title">最近の請求データ</h2>
        <div v-if="kpi.recentRecords.length === 0" class="empty-state">請求データがありません</div>
        <div class="o-table-wrapper" v-else>
          <table class="o-table">
            <thead>
              <tr>
                <th class="o-table-th">期間</th>
                <th class="o-table-th">荷主</th>
                <th class="o-table-th">配送業者</th>
                <th class="o-table-th o-table-th--right">出荷件数</th>
                <th class="o-table-th o-table-th--right">合計</th>
                <th class="o-table-th">ステータス</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in kpi.recentRecords" :key="row._id" class="o-table-row">
                <td class="o-table-td">{{ row.period }}</td>
                <td class="o-table-td">{{ row.clientName }}</td>
                <td class="o-table-td">{{ row.carrierName }}</td>
                <td class="o-table-td o-table-td--right">{{ row.shipmentCount.toLocaleString() }}</td>
                <td class="o-table-td o-table-td--right">&yen;{{ row.totalAmount.toLocaleString() }}</td>
                <td class="o-table-td">
                  <span class="o-status-tag" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
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
import { onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchBillingDashboard } from '@/api/billing'
import type { BillingDashboardKpi, BillingStatus } from '@/api/billing'

const toast = useToast()
const isLoading = ref(false)
const kpi = ref<BillingDashboardKpi | null>(null)

// ── ステータス表示 / ステータス表示 ──
const statusLabel = (s: BillingStatus): string => {
  const map: Record<BillingStatus, string> = {
    draft: '下書き',
    confirmed: '確定',
    invoiced: '請求済',
    paid: '入金済',
  }
  return map[s] || s
}

const statusClass = (s: BillingStatus): string => {
  const map: Record<BillingStatus, string> = {
    draft: 'o-status-tag--draft',
    confirmed: 'o-status-tag--confirmed',
    invoiced: 'o-status-tag--issued',
    paid: 'o-status-tag--printed',
  }
  return map[s] || ''
}

// ── データ取得 / データ取得 ──
const loadData = async () => {
  isLoading.value = true
  try {
    kpi.value = await fetchBillingDashboard()
  } catch (e: any) {
    toast.showError(e?.message || 'データの取得に失敗しました')
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
.billing-dashboard {
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

/* KPIカード / KPIカード */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.kpi-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.kpi-card--warning { border-left: 4px solid var(--o-warning, #e6a23c); }
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

/* セクション / セクション */
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

/* テーブル補助 / テーブル補助 */
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

.o-status-tag--draft { background: var(--o-gray-100, #f5f7fa); color: var(--o-gray-500, #909399); }
</style>
