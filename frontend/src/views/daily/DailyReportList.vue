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

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="dailyReportListSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="rows"
        :height="520"
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
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
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
  if (!confirm(t('wms.daily.closeConfirm', `${row.date} の日次を締めますか？`))) return
  try { await closeDailyReport(row.date); toast.showSuccess(t('wms.daily.dayClosed', '日次を締めました')); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

const handleLock = async (row: DailyReport) => {
  if (!confirm(t('wms.daily.lockDayConfirm', `${row.date} の日次をロックしますか？ロック後は更新できません。`))) return
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
</style>
