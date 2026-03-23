<template>
  <div class="api-log-view">
    <PageHeader :title="t('wms.settings.apiLog', 'API連携ログ')" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="exportCsv">{{ t('wms.settings.exportCsv', 'CSV出力') }}</Button>
      </template>
    </PageHeader>

    <!-- Stats Cards -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalCalls.toLocaleString() }}</div>
        <div class="stat-label">{{ t('wms.settings.totalRequests', '総リクエスト数') }}</div>
      </div>
      <div class="stat-card stat-card--success">
        <div class="stat-value">{{ stats.successRate }}%</div>
        <div class="stat-label">{{ t('wms.settings.successRate', '成功率') }}</div>
      </div>
      <div class="stat-card stat-card--info">
        <div class="stat-value">{{ formatDuration(stats.avgDurationMs) }}</div>
        <div class="stat-label">{{ t('wms.settings.avgProcessingTime', '平均処理時間') }}</div>
      </div>
      <div class="stat-card stat-card--error">
        <div class="stat-value">{{ stats.errorTotal.toLocaleString() }}</div>
        <div class="stat-label">{{ t('wms.settings.errorCount', 'エラー数') }}</div>
      </div>
    </div>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="rows"
        row-key="_id"
        :search-columns="searchColumns"
        @search="handleSearch"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="server"
        :page-size="pageSize"
        :page-sizes="[25, 50, 100]"
        :total="total"
        :current-page="currentPage"
        @page-change="onPageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DataTable } from '@/components/data-table'
import { fetchApiLogs, fetchApiStats, exportApiLogs } from '@/api/apiLog'
import type { ApiLogItem, ApiLogStats } from '@/api/apiLog'
import type { TableColumn, Operator } from '@/types/table'

const { t } = useI18n()
const toast = useToast()
const isLoading = ref(false)
const rows = ref<ApiLogItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const globalSearchText = ref('')

const filterApiName = ref('')
const filterStatus = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterSearch = ref('')

const stats = ref<ApiLogStats>({
  totalCalls: 0,
  successRate: 0,
  avgDurationMs: 0,
  errorTotal: 0,
  byStatus: {},
  byApiName: [],
})

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: t('wms.settings.statusPending', '待機中'),
    running: t('wms.settings.statusRunning', '実行中'),
    success: t('wms.settings.statusSuccess', '成功'),
    error: t('wms.settings.statusError', 'エラー'),
    timeout: t('wms.settings.statusTimeout', 'タイムアウト'),
  }
  return map[s] || s
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const baseColumns = computed<TableColumn[]>(() => [
  { key: 'createdAt', dataKey: 'createdAt', title: t('wms.settings.dateTime', '日時'), width: 150, fieldType: 'date' },
  {
    key: 'apiName', dataKey: 'apiName', title: 'API', width: 110, fieldType: 'string',
    searchable: true, searchType: 'string',
  },
  { key: 'action', dataKey: 'action', title: t('wms.settings.action', 'アクション'), width: 90, fieldType: 'string' },
  {
    key: 'status', dataKey: 'status', title: t('wms.settings.status', 'ステータス'), width: 90, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: [
      { label: t('wms.settings.statusPending', '待機中'), value: 'pending' },
      { label: t('wms.settings.statusRunning', '実行中'), value: 'running' },
      { label: t('wms.settings.statusSuccess', '成功'), value: 'success' },
      { label: t('wms.settings.statusError', 'エラー'), value: 'error' },
      { label: t('wms.settings.statusTimeout', 'タイムアウト'), value: 'timeout' },
    ],
  },
  { key: 'processedCount', dataKey: 'processedCount', title: t('wms.settings.processedCount', '処理数'), width: 60, fieldType: 'number' },
  { key: 'successCount', dataKey: 'successCount', title: t('wms.settings.successCount', '成功数'), width: 60, fieldType: 'number' },
  { key: 'errorCount', dataKey: 'errorCount', title: t('wms.settings.errorCount', 'エラー数'), width: 60, fieldType: 'number' },
  { key: 'durationMs', dataKey: 'durationMs', title: t('wms.settings.processingTime', '処理時間'), width: 80, fieldType: 'number' },
  { key: 'referenceNumber', dataKey: 'referenceNumber', title: t('wms.settings.referenceNumber', '参照番号'), width: 120, fieldType: 'string', searchable: true, searchType: 'string' },
  { key: 'message', dataKey: 'message', title: t('wms.settings.message', 'メッセージ'), width: 200, fieldType: 'string' },
])

const searchColumns = computed<TableColumn[]>(() => baseColumns.value.filter((c) => c.searchable))

const tableColumns = computed<TableColumn[]>(() => baseColumns.value.map((col) => {
  if (col.key === 'createdAt') {
    return { ...col, cellRenderer: ({ rowData }: { rowData: ApiLogItem }) => formatDateTime(rowData.createdAt) }
  }
  if (col.key === 'apiName') {
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: ApiLogItem }) =>
        h('span', { class: 'api-name-badge' }, rowData.apiName),
    }
  }
  if (col.key === 'status') {
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: ApiLogItem }) =>
        h('span', { class: `status-badge status--${rowData.status}` }, statusLabel(rowData.status)),
    }
  }
  if (col.key === 'durationMs') {
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: ApiLogItem }) =>
        rowData.durationMs != null ? formatDuration(rowData.durationMs) : '-',
    }
  }
  if (col.key === 'referenceNumber') {
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: ApiLogItem }) =>
        rowData.referenceNumber ? h('span', { class: 'ref-number' }, rowData.referenceNumber) : '-',
    }
  }
  if (col.key === 'message') {
    return { ...col, cellRenderer: ({ rowData }: { rowData: ApiLogItem }) => rowData.message || '-' }
  }
  return col
}))

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  filterApiName.value = payload.apiName?.value || ''
  filterStatus.value = payload.status?.value || ''
  currentPage.value = 1
  loadData()
  loadStats()
}

const buildParams = () => ({
  apiName: filterApiName.value || undefined,
  status: filterStatus.value || undefined,
  dateFrom: filterDateFrom.value || undefined,
  dateTo: filterDateTo.value || undefined,
  search: filterSearch.value || undefined,
  page: currentPage.value,
  limit: pageSize.value,
})

const loadStats = async () => {
  try {
    const result = await fetchApiStats({
      dateFrom: filterDateFrom.value || undefined,
      dateTo: filterDateTo.value || undefined,
    })
    stats.value = result
  } catch {
    // Stats load failure is non-critical
  }
}

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchApiLogs(buildParams())
    rows.value = res.data
    total.value = res.total
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('wms.settings.fetchFailed', 'データの取得に失敗しました')
    toast.showError(message)
  } finally {
    isLoading.value = false
  }
}

const onPageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadData()
}

const exportCsv = async () => {
  try {
    const data = await exportApiLogs({
      apiName: filterApiName.value || undefined,
      status: filterStatus.value || undefined,
      dateFrom: filterDateFrom.value || undefined,
      dateTo: filterDateTo.value || undefined,
      search: filterSearch.value || undefined,
    })

    const csvRows: string[] = [`${t('wms.settings.dateTime', '日時')},API,${t('wms.settings.action', 'アクション')},${t('wms.settings.status', 'ステータス')},${t('wms.settings.processedCount', '処理数')},${t('wms.settings.successCount', '成功数')},${t('wms.settings.errorCount', 'エラー数')},${t('wms.settings.processingTime', '処理時間')}(ms),${t('wms.settings.referenceNumber', '参照番号')},${t('wms.settings.message', 'メッセージ')}`]
    for (const r of data) {
      csvRows.push([
        `"${formatDateTime(r.createdAt)}"`,
        `"${r.apiName}"`,
        `"${r.action}"`,
        `"${statusLabel(r.status)}"`,
        r.processedCount,
        r.successCount,
        r.errorCount,
        r.durationMs != null ? r.durationMs : '',
        `"${r.referenceNumber || ''}"`,
        `"${(r.message || '').replace(/"/g, '""')}"`,
      ].join(','))
    }

    const bom = '\uFEFF'
    const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `api_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('wms.settings.exportFailed', 'エクスポートに失敗しました')
    toast.showError(message)
  }
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<style scoped>
.api-log-view {
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

.stats-row {
  display: flex;
  gap: 12px;
}

.stat-card {
  flex: 1;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-gray-200, #e4e7ed);
  border-radius: 6px;
  padding: 16px;
  text-align: center;
}

.stat-card--success { border-left: 3px solid #67c23a; }
.stat-card--info { border-left: 3px solid #409eff; }
.stat-card--error { border-left: 3px solid #f56c6c; }

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--o-gray-900, #303133);
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-top: 4px;
}

.api-name-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.status--success { background: #e1f3d8; color: #67c23a; }
.status--error { background: #fef0f0; color: #f56c6c; }
.status--running { background: #d9ecff; color: #409eff; }
.status--pending { background: #f4f4f5; color: #909399; }
.status--timeout { background: #fdf6ec; color: #e6a23c; }

.ref-number {
  font-family: monospace;
  font-size: 12px;
  color: var(--o-brand-primary, #714b67);
  font-weight: 600;
}
</style>
