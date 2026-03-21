<template>
  <div class="daily-report-list">
    <ControlPanel :title="t('wms.daily.reportList', '日次レポート')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <input v-model="generateDate" type="date" class="o-input o-input-sm" style="width:150px;" />
          <OButton variant="primary" size="sm" :disabled="isGenerating" @click="handleGenerate">
            {{ isGenerating ? t('wms.daily.generating', '生成中...') : t('wms.daily.generateReport', 'レポート生成') }}
          </OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- KPI概況カード（最新レポート） / KPI概览卡片（最新报表） -->
    <div v-if="latestReport" class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value">{{ latestReport.summary.shipments.shippedOrders }} / {{ latestReport.summary.shipments.totalOrders }}</div>
        <div class="kpi-label">出荷</div>
        <div class="kpi-sub">完了率: {{ shipmentRate }}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">{{ latestReport.summary.inbound.receivedOrders }} / {{ latestReport.summary.inbound.totalOrders }}</div>
        <div class="kpi-label">入庫</div>
        <div class="kpi-sub">完了率: {{ inboundRate }}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">{{ latestReport.summary.returns.completedOrders }}</div>
        <div class="kpi-label">返品</div>
        <div class="kpi-sub">全 {{ latestReport.summary.returns.totalOrders }} 件</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">{{ latestReport.summary.inventory.totalSkus.toLocaleString() }}</div>
        <div class="kpi-label">在庫SKU</div>
        <div class="kpi-sub">総数: {{ latestReport.summary.inventory.totalQuantity.toLocaleString() }}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">{{ latestReport.summary.stocktaking.totalSessions }}</div>
        <div class="kpi-label">棚卸</div>
        <div class="kpi-sub">差異: {{ latestReport.summary.stocktaking.varianceCount }} 件</div>
      </div>
    </div>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="dailyReportListSearch"
      @search="handleSearch"
    />

    <OLoadingState :loading="isLoading" :empty="!isLoading && rows.length === 0">
      <div class="table-section">
        <Table
          :columns="tableColumns"
          :data="rows"
          row-key="_id"
          pagination-enabled
          pagination-mode="server"
          :total="total"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[30, 50, 100]"
          :global-search-text="globalSearchText"
          @page-change="handlePageChange"
        />
      </div>
    </OLoadingState>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref, computed } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import OLoadingState from '@/components/odoo/OLoadingState.vue'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchDailyReports,
  generateDailyReport,
  closeDailyReport,
  lockDailyReport,
} from '@/api/dailyReport'
import type { DailyReport } from '@/api/dailyReport'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const isLoading = ref(false)
const isGenerating = ref(false)
const rows = ref<DailyReport[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(30)
const globalSearchText = ref('')
const generateDate = ref(new Date().toISOString().slice(0, 10))

// 最新レポートのKPIデータ / 最新报表的KPI数据
const latestReport = computed(() => rows.value.length > 0 ? rows.value[0] : null)
const shipmentRate = computed(() => {
  const s = latestReport.value?.summary.shipments
  return s && s.totalOrders > 0 ? Math.round((s.shippedOrders / s.totalOrders) * 100) : 0
})
const inboundRate = computed(() => {
  const s = latestReport.value?.summary.inbound
  return s && s.totalOrders > 0 ? Math.round((s.receivedOrders / s.totalOrders) * 100) : 0
})

const dailyStatusLabel = (s: string) => ({
  open: t('wms.daily.statusOpen', '営業中'),
  closed: t('wms.daily.statusClosed', '締め済'),
  locked: t('wms.daily.statusLocked', 'ロック済'),
}[s] || s)

const dailyStatusClass = (s: string) => ({
  open: 'o-status-tag--printed',
  closed: 'o-status-tag--issued',
  locked: 'o-status-tag--confirmed',
}[s] || '')

const formatDateTime = (d: string) => new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

// Column definitions
const baseColumns = computed<TableColumn[]>(() => [
  {
    key: 'date',
    dataKey: 'date',
    title: t('wms.daily.date', '日付'),
    width: 120,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { class: 'date-link clickable', onClick: () => router.push(`/daily/${rowData.date}`) }, rowData.date),
  },
  {
    key: 'status',
    dataKey: 'status',
    title: t('wms.daily.state', '状態'),
    width: 80,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.daily.statusOpen', '営業中'), value: 'open' },
      { label: t('wms.daily.statusClosed', '締め済'), value: 'closed' },
      { label: t('wms.daily.statusLocked', 'ロック済'), value: 'locked' },
    ],
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { class: `o-status-tag ${dailyStatusClass(rowData.status)}` }, dailyStatusLabel(rowData.status)),
  },
  {
    key: 'shipments.totalOrders',
    title: t('wms.daily.shipmentOrders', '出荷指示'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.summary.shipments.totalOrders)),
  },
  {
    key: 'shipments.shippedOrders',
    title: t('wms.daily.shippedComplete', '出荷完了'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.summary.shipments.shippedOrders)),
  },
  {
    key: 'inbound.totalOrders',
    title: t('wms.daily.inboundOrders', '入庫指示'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.summary.inbound.totalOrders)),
  },
  {
    key: 'inbound.receivedOrders',
    title: t('wms.daily.inboundComplete', '入庫完了'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.summary.inbound.receivedOrders)),
  },
  {
    key: 'returns.totalOrders',
    title: t('wms.daily.returns', '返品'),
    width: 70,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.summary.returns.totalOrders)),
  },
  {
    key: 'inventory.totalSkus',
    title: t('wms.daily.inventorySkus', '在庫SKU'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.summary.inventory.totalSkus)),
  },
  {
    key: 'inventory.totalQuantity',
    title: t('wms.daily.inventoryTotal', '在庫総数'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { style: 'text-align:right;display:block;' }, rowData.summary.inventory.totalQuantity.toLocaleString()),
  },
  {
    key: 'stocktaking.totalSessions',
    title: t('wms.daily.stocktaking', '棚卸'),
    width: 70,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.summary.stocktaking.totalSessions)),
  },
  {
    key: 'closedAt',
    dataKey: 'closedAt',
    title: t('wms.daily.closedAt', '締め日時'),
    width: 110,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: DailyReport }) =>
      rowData.closedAt ? formatDateTime(rowData.closedAt) : '-',
  },
])

const searchColumns = computed<TableColumn[]>(() => baseColumns.value.filter((c) => c.searchable))

const tableColumns = computed<TableColumn[]>(() => [
  ...baseColumns.value,
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 180,
    cellRenderer: ({ rowData }: { rowData: DailyReport }) => {
      const buttons: any[] = []
      buttons.push(h(OButton, { size: 'sm', variant: 'secondary', onClick: () => router.push(`/daily/${rowData.date}`) }, () => t('wms.daily.detail', '詳細')))
      if (rowData.status === 'open') {
        buttons.push(h(OButton, { variant: 'primary', size: 'sm', onClick: () => handleClose(rowData) }, () => t('wms.daily.close', '締め')))
      }
      if (rowData.status === 'closed') {
        buttons.push(h(OButton, { variant: 'secondary', size: 'sm', onClick: () => handleLock(rowData) }, () => t('wms.daily.lock', 'ロック')))
      }
      if (rowData.status === 'open') {
        buttons.push(h(OButton, { variant: 'secondary', size: 'sm', onClick: () => handleRefresh(rowData) }, () => t('wms.daily.refresh', '更新')))
      }
      return h('div', { class: 'action-cell' }, buttons)
    },
  },
])

// Search handler
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
  } else {
    globalSearchText.value = ''
  }

  currentPage.value = 1
  loadData()
}

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadData()
}

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchDailyReports({ page: currentPage.value, limit: pageSize.value })
    rows.value = res.data
    total.value = res.total
  } catch (e: any) { toast.showError(e?.message || t('wms.daily.fetchFailed', '取得に失敗')) } finally { isLoading.value = false }
}

const handleGenerate = async () => {
  if (!generateDate.value) { toast.showError(t('wms.daily.selectDate', '日付を選択してください')); return }
  isGenerating.value = true
  try {
    await generateDailyReport(generateDate.value)
    toast.showSuccess(t('wms.daily.reportGenerated', `${generateDate.value} のレポートを生成しました`))
    await loadData()
  } catch (e: any) { toast.showError(e?.message) } finally { isGenerating.value = false }
}

const handleClose = async (row: DailyReport) => {
  try {
    await ElMessageBox.confirm(
      t('wms.daily.closeConfirm', `${row.date} の日次を締めますか？ / 确定要结算 ${row.date} 的日报吗？`),
      '確認 / 确认',
      { confirmButtonText: '締め / 结算', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try { await closeDailyReport(row.date); toast.showSuccess(t('wms.daily.dayClosed', '日次を締めました')); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

const handleLock = async (row: DailyReport) => {
  try {
    await ElMessageBox.confirm(
      t('wms.daily.lockDayConfirm', `${row.date} の日次をロックしますか？ロック後は更新できません。 / 确定要锁定 ${row.date} 的日报吗？锁定后无法更新。`),
      '確認 / 确认',
      { confirmButtonText: 'ロック / 锁定', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try { await lockDailyReport(row.date); toast.showSuccess(t('wms.daily.dayLocked', '日次をロックしました')); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

const handleRefresh = async (row: DailyReport) => {
  try { await generateDailyReport(row.date); toast.showSuccess(t('wms.daily.reportUpdated', 'レポートを更新しました')); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

onMounted(() => loadData())
</script>

<style scoped>
.daily-report-list {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

:deep(.date-link) { font-family: monospace; font-weight: 600; color: var(--o-brand-primary, #714b67); }
:deep(.clickable) { cursor: pointer; }
:deep(.clickable:hover) { text-decoration: underline; }

:deep(.action-cell) {
  display: inline-flex;
  gap: 4px;
}

/* KPI概況カード / KPI概览卡片 */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.kpi-card { background: #fff; border: 1px solid var(--o-border-color, #e4e7ed); border-radius: 8px; padding: 16px; text-align: center; }
.kpi-value { font-size: 28px; font-weight: 700; color: var(--o-gray-800, #303133); }
.kpi-label { font-size: 12px; color: var(--o-gray-500, #909399); margin-top: 2px; }
.kpi-sub { font-size: 11px; color: var(--o-gray-400, #c0c4cc); margin-top: 2px; }
</style>
