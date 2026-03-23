<template>
  <div class="stocktaking-list">
    <PageHeader :title="t('wms.stocktaking.listTitle', '棚卸一覧')" :show-search="false">
      <template #actions>
        <Button variant="default" size="sm" @click="$router.push('/stocktaking/create')">{{ t('wms.common.create', '新規作成') }}</Button>
      </template>
    </PageHeader>

    <div v-if="false"><!-- loading handled by DataTable --></div><template v-if="true">
      <div class="table-section">
        <DataTable
          :columns="tableColumns"
          :data="rows"
          row-key="_id"
          pagination-enabled
          pagination-mode="server"
          :total="total"
          :current-page="currentPage"
          :page-size="pageSize"
          :page-sizes="[25, 50, 100]"
          :global-search-text="globalSearchText"
          :search-columns="searchColumns"
          @search="handleSearch"
          @page-change="handlePageChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchStocktakingOrders,
  startStocktakingOrder,
  completeStocktakingOrder,
  adjustStocktakingOrder,
  cancelStocktakingOrder,
  deleteStocktakingOrder,
} from '@/api/stocktakingOrder'
import type { StocktakingOrder } from '@/api/stocktakingOrder'
import { computed, h, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const { confirm } = useConfirmDialog()
const isLoading = ref(false)
const rows = ref<StocktakingOrder[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(25)
const globalSearchText = ref('')

// Current search filters
const currentFilterStatus = ref('')
const currentFilterType = ref('')

const typeLabel = (tp: string) => ({ full: '全棚卸', cycle: '循環棚卸', spot: 'スポット' }[tp] || tp)
const statusLabel = (s: string) => ({ draft: '下書き', in_progress: '進行中', completed: '完了', adjusted: '調整済', cancelled: 'キャンセル' }[s] || s)
const statusClass = (s: string) => ({
  draft: 'bg-muted text-muted-foreground',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-blue-100 text-blue-800',
  adjusted: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}[s] || '')

const countedLines = (row: StocktakingOrder) => (row.lines ?? []).filter(l => l.status !== 'pending').length
const varianceLines = (row: StocktakingOrder) => (row.lines ?? []).filter(l => l.variance && l.variance !== 0).length

const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')
const formatDateTime = (d: string) => new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

// Column definitions
const baseColumns = computed<TableColumn[]>(() => [
  {
    key: 'orderNumber',
    dataKey: 'orderNumber',
    title: t('wms.stocktaking.orderNumber', '棚卸番号'),
    width: 170,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: StocktakingOrder }) =>
      h('span', { class: 'order-number clickable', onClick: () => router.push(`/stocktaking/${rowData._id}`) }, rowData.orderNumber),
  },
  {
    key: 'type',
    dataKey: 'type',
    title: t('wms.stocktaking.type', 'タイプ'),
    width: 90,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.stocktaking.typeFull', '全棚卸'), value: 'full' },
      { label: t('wms.stocktaking.typeCycle', '循環棚卸'), value: 'cycle' },
      { label: t('wms.stocktaking.typeSpot', 'スポット'), value: 'spot' },
    ],
    cellRenderer: ({ rowData }: { rowData: StocktakingOrder }) => typeLabel(rowData.type),
  },
  {
    key: 'status',
    dataKey: 'status',
    title: t('wms.stocktaking.status', '状態'),
    width: 90,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.stocktaking.statusDraft', '下書き'), value: 'draft' },
      { label: t('wms.stocktaking.statusInProgress', '進行中'), value: 'in_progress' },
      { label: t('wms.stocktaking.statusCompleted', '完了'), value: 'completed' },
      { label: t('wms.stocktaking.statusAdjusted', '調整済'), value: 'adjusted' },
      { label: t('wms.stocktaking.statusCancelled', 'キャンセル'), value: 'cancelled' },
    ],
    cellRenderer: ({ rowData }: { rowData: StocktakingOrder }) =>
      h('span', { class: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(rowData.status)}` }, statusLabel(rowData.status)),
  },
  {
    key: 'lineCount',
    title: t('wms.stocktaking.lineCount', '明細数'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StocktakingOrder }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.lines?.length ?? 0)),
  },
  {
    key: 'countedLines',
    title: t('wms.stocktaking.countedLines', 'カウント済'),
    width: 90,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StocktakingOrder }) =>
      h('span', { style: 'text-align:right;display:block;' }, `${countedLines(rowData)} / ${rowData.lines?.length ?? 0}`),
  },
  {
    key: 'varianceLines',
    title: t('wms.stocktaking.varianceLines', '差異あり'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StocktakingOrder }) => {
      const v = varianceLines(rowData)
      return h('span', { style: 'text-align:right;display:block;', class: v > 0 ? 'text-warning' : '' }, String(v))
    },
  },
  {
    key: 'scheduledDate',
    dataKey: 'scheduledDate',
    title: t('wms.stocktaking.scheduledDate', '予定日'),
    width: 110,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: StocktakingOrder }) =>
      rowData.scheduledDate ? formatDate(rowData.scheduledDate) : '-',
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: t('wms.stocktaking.createdAt', '作成日時'),
    width: 110,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: StocktakingOrder }) => formatDateTime(rowData.createdAt),
  },
])

const searchColumns = computed<TableColumn[]>(() => baseColumns.value.filter((c) => c.searchable))

const tableColumns = computed<TableColumn[]>(() => [
  ...baseColumns.value,
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 260,
    cellRenderer: ({ rowData }: { rowData: StocktakingOrder }) => {
      const buttons: any[] = []
      buttons.push(h(Button, { size: 'sm', variant: 'secondary', onClick: () => router.push(`/stocktaking/${rowData._id}`) }, () => t('wms.stocktaking.detail', '詳細')))
      if (rowData.status === 'draft') {
        buttons.push(h(Button, { variant: 'default', size: 'sm', onClick: () => handleStart(rowData) }, () => t('wms.stocktaking.start', '開始')))
      }
      if (rowData.status === 'in_progress') {
        buttons.push(h(Button, { variant: 'default', size: 'sm', onClick: () => handleComplete(rowData) }, () => t('wms.stocktaking.complete', '完了')))
      }
      if (rowData.status === 'completed') {
        buttons.push(h(Button, { variant: 'default', size: 'sm', onClick: () => handleAdjust(rowData) }, () => t('wms.stocktaking.adjust', '調整反映')))
      }
      if (rowData.status !== 'adjusted' && rowData.status !== 'cancelled') {
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', style: 'border-color:#f56c6c;color:#f56c6c;', onClick: () => handleCancel(rowData) }, () => t('wms.stocktaking.cancel', '取消')))
      }
      if (rowData.status === 'draft' || rowData.status === 'cancelled') {
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', style: 'border-color:#f56c6c;color:#f56c6c;', onClick: () => handleDelete(rowData) }, () => t('wms.common.delete', '削除')))
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

  if (payload.status?.value) {
    currentFilterStatus.value = String(payload.status.value)
  } else {
    currentFilterStatus.value = ''
  }

  if (payload.type?.value) {
    currentFilterType.value = String(payload.type.value)
  } else {
    currentFilterType.value = ''
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
    const res = await fetchStocktakingOrders({
      status: currentFilterStatus.value || undefined,
      type: currentFilterType.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rows.value = res?.data ?? []
    total.value = res?.total ?? 0
  } catch (e: any) {
    toast.showError(e?.message || 'データの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const handleStart = async (row: StocktakingOrder) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await startStocktakingOrder(row._id)
    toast.showSuccess('棚卸を開始しました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message || '開始に失敗しました') }
}

const handleComplete = async (row: StocktakingOrder) => {
  try {
    await completeStocktakingOrder(row._id)
    toast.showSuccess('棚卸を完了しました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message || '完了に失敗しました') }
}

const handleAdjust = async (row: StocktakingOrder) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    const res = await adjustStocktakingOrder(row._id)
    toast.showSuccess(`${res.adjustedCount}件の差異を調整しました`)
    if (res.errors.length > 0) {
      toast.showError(`エラー: ${res.errors.join(', ')}`)
    }
    await loadData()
  } catch (e: any) { toast.showError(e?.message || '調整に失敗しました') }
}

const handleCancel = async (row: StocktakingOrder) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await cancelStocktakingOrder(row._id)
    toast.showSuccess('棚卸をキャンセルしました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message || 'キャンセルに失敗しました') }
}

const handleDelete = async (row: StocktakingOrder) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await deleteStocktakingOrder(row._id)
    toast.showSuccess('棚卸を削除しました')
    await loadData()
  } catch (e: any) { toast.showError(e?.message || '削除に失敗しました') }
}

onMounted(() => loadData())
</script>

<style>
</style>

<style scoped>
.stocktaking-list {
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

:deep(.order-number) { font-family: monospace; font-weight: 600; color: var(--o-brand-primary, #714b67); }
:deep(.clickable) { cursor: pointer; }
:deep(.clickable:hover) { text-decoration: underline; }
:deep(.text-warning) { color: #e6a23c; font-weight: 600; }

:deep(.action-cell) {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}
</style>
