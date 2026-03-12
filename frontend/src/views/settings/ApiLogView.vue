<template>
  <div class="api-log-view">
    <ControlPanel title="API連携ログ" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <OButton variant="secondary" size="sm" @click="showFilters = !showFilters">
            {{ showFilters ? 'フィルター非表示' : 'フィルター表示' }}
          </OButton>
          <OButton variant="secondary" size="sm" @click="exportCsv">CSV出力</OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- Stats Cards -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalCalls.toLocaleString() }}</div>
        <div class="stat-label">総リクエスト数</div>
      </div>
      <div class="stat-card stat-card--success">
        <div class="stat-value">{{ stats.successRate }}%</div>
        <div class="stat-label">成功率</div>
      </div>
      <div class="stat-card stat-card--info">
        <div class="stat-value">{{ formatDuration(stats.avgDurationMs) }}</div>
        <div class="stat-label">平均処理時間</div>
      </div>
      <div class="stat-card stat-card--error">
        <div class="stat-value">{{ stats.errorTotal.toLocaleString() }}</div>
        <div class="stat-label">エラー数</div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div v-if="showFilters" class="filter-bar">
      <div class="filter-row">
        <div class="filter-item">
          <label class="filter-label">API</label>
          <select class="o-input o-input-sm" v-model="filterApiName">
            <option value="">全て</option>
            <option v-for="name in apiNameOptions" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
        <div class="filter-item">
          <label class="filter-label">ステータス</label>
          <select class="o-input o-input-sm" v-model="filterStatus">
            <option value="">全て</option>
            <option value="pending">待機中</option>
            <option value="running">実行中</option>
            <option value="success">成功</option>
            <option value="error">エラー</option>
            <option value="timeout">タイムアウト</option>
          </select>
        </div>
        <div class="filter-item">
          <label class="filter-label">開始日</label>
          <input type="date" class="o-input o-input-sm" v-model="filterDateFrom" />
        </div>
        <div class="filter-item">
          <label class="filter-label">終了日</label>
          <input type="date" class="o-input o-input-sm" v-model="filterDateTo" />
        </div>
        <div class="filter-item">
          <label class="filter-label">検索 (メッセージ/参照番号)</label>
          <input
            type="text"
            class="o-input o-input-sm"
            v-model="filterSearch"
            placeholder="キーワード..."
            @keydown.enter="doSearch"
          />
        </div>
        <div class="filter-item filter-actions">
          <OButton variant="primary" size="sm" @click="doSearch">検索</OButton>
          <OButton variant="secondary" size="sm" @click="resetFilters">リセット</OButton>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:150px;">日時</th>
            <th class="o-table-th" style="width:110px;">API</th>
            <th class="o-table-th" style="width:90px;">アクション</th>
            <th class="o-table-th" style="width:90px;">ステータス</th>
            <th class="o-table-th o-table-th--right" style="width:60px;">処理数</th>
            <th class="o-table-th o-table-th--right" style="width:60px;">成功数</th>
            <th class="o-table-th o-table-th--right" style="width:60px;">エラー数</th>
            <th class="o-table-th" style="width:80px;">処理時間</th>
            <th class="o-table-th" style="width:120px;">参照番号</th>
            <th class="o-table-th">メッセージ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="10" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="10" class="o-table-empty">データがありません</td>
          </tr>
          <tr v-for="row in rows" :key="row._id" class="o-table-row">
            <td class="o-table-td">{{ formatDateTime(row.createdAt) }}</td>
            <td class="o-table-td">
              <span class="api-name-badge">{{ row.apiName }}</span>
            </td>
            <td class="o-table-td">{{ row.action }}</td>
            <td class="o-table-td">
              <span class="status-badge" :class="'status--' + row.status">{{ statusLabel(row.status) }}</span>
            </td>
            <td class="o-table-td o-table-td--right">{{ row.processedCount }}</td>
            <td class="o-table-td o-table-td--right">{{ row.successCount }}</td>
            <td class="o-table-td o-table-td--right">{{ row.errorCount }}</td>
            <td class="o-table-td">{{ row.durationMs != null ? formatDuration(row.durationMs) : '-' }}</td>
            <td class="o-table-td">
              <span v-if="row.referenceNumber" class="ref-number">{{ row.referenceNumber }}</span>
              <span v-else>-</span>
            </td>
            <td class="o-table-td">{{ row.message || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} 件中 {{ rows.length }} 件表示</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;" @change="onPageSizeChange">
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">&rsaquo;</OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchApiLogs, fetchApiStats, exportApiLogs } from '@/api/apiLog'
import type { ApiLogItem, ApiLogStats } from '@/api/apiLog'

const toast = useToast()
const isLoading = ref(false)
const rows = ref<ApiLogItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const showFilters = ref(false)

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

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const apiNameOptions = computed(() => {
  return stats.value.byApiName.map(item => item._id)
})

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: '待機中',
    running: '実行中',
    success: '成功',
    error: 'エラー',
    timeout: 'タイムアウト',
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
    const message = e instanceof Error ? e.message : 'データの取得に失敗しました'
    toast.showError(message)
  } finally {
    isLoading.value = false
  }
}

const doSearch = () => {
  currentPage.value = 1
  loadData()
  loadStats()
}

const resetFilters = () => {
  filterApiName.value = ''
  filterStatus.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterSearch.value = ''
  currentPage.value = 1
  loadData()
  loadStats()
}

const onPageSizeChange = () => {
  currentPage.value = 1
  loadData()
}

const goPage = (p: number) => {
  currentPage.value = p
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

    const csvRows: string[] = ['日時,API,アクション,ステータス,処理数,成功数,エラー数,処理時間(ms),参照番号,メッセージ']
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
    const message = e instanceof Error ? e.message : 'エクスポートに失敗しました'
    toast.showError(message)
  }
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.api-log-view {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
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

.filter-bar {
  background: var(--o-gray-50, #fafafa);
  border: 1px solid var(--o-gray-200, #e4e7ed);
  border-radius: 4px;
  padding: 12px 16px;
  margin-bottom: 12px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 12px;
  color: var(--o-gray-600, #606266);
  font-weight: 500;
}

.filter-actions {
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: flex-end;
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

.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
</style>
