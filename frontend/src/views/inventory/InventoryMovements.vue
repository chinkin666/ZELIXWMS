<template>
  <div class="inventory-movements">
    <PageHeader :title="t('wms.inventory.movementHistory', '入出庫履歴')" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="exportCsv">{{ t('wms.inventory.csvExport', 'CSV出力') }}</Button>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>
    <div v-else-if="!isLoading && rows.length === 0" class="empty-state">{{ t('wms.inventory.noMovements', '在庫移動データがありません') }}</div>
    <template v-else>
      <div class="table-section">
        <DataTable
          :columns="tableColumns"
          :data="rows"
          row-key="_id"
          pagination-enabled
          pagination-mode="server"
          :page-size="pageSize"
          :page-sizes="[25, 50, 100]"
          :total="total"
          :current-page="currentPage"
          :global-search-text="globalSearchText"
          :search-columns="searchColumns"
          @search="handleSearch"
          @page-change="onPageChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DataTable } from '@/components/data-table'
import { fetchMovements } from '@/api/inventory'
import type { StockMove } from '@/types/inventory'
import type { TableColumn, Operator } from '@/types/table'
import { computed, h, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
const toast = useToast()
const { t } = useI18n()
const isLoading = ref(false)
const rows = ref<StockMove[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const globalSearchText = ref('')
const filterMoveType = ref('')
const filterState = ref('')

const moveTypeLabel = (val: string) => {
  const map: Record<string, string> = {
    inbound: t('wms.inventory.moveTypeInbound', '入庫'),
    outbound: t('wms.inventory.moveTypeOutbound', '出庫'),
    transfer: t('wms.inventory.moveTypeTransfer', '移動'),
    adjustment: t('wms.inventory.moveTypeAdjustment', '調整'),
    return: t('wms.inventory.moveTypeReturn', '返品'),
  }
  return map[val] || val
}

const stateLabel = (s: string) => {
  const map: Record<string, string> = {
    draft: t('wms.inventory.stateDraft', '下書き'),
    confirmed: t('wms.inventory.stateConfirmed', '確認済'),
    done: t('wms.inventory.stateDone', '完了'),
    cancelled: t('wms.inventory.stateCancelled', '取消'),
  }
  return map[s] || s
}

const stateClass = (s: string) => {
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    confirmed: 'bg-blue-100 text-blue-800',
    done: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return map[s] || ''
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const searchColumns = computed<TableColumn[]>(() => [
  { key: 'moveNumber', dataKey: 'moveNumber', title: t('wms.inventory.moveNumber', '移動番号'), width: 160, fieldType: 'string', searchable: true, searchType: 'string' },
  {
    key: 'moveType', dataKey: 'moveType', title: t('wms.inventory.moveType', 'タイプ'), width: 80, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.moveTypeInbound', '入庫'), value: 'inbound' },
      { label: t('wms.inventory.moveTypeOutbound', '出庫'), value: 'outbound' },
      { label: t('wms.inventory.moveTypeTransfer', '移動'), value: 'transfer' },
      { label: t('wms.inventory.moveTypeAdjustment', '調整'), value: 'adjustment' },
      { label: t('wms.inventory.moveTypeReturn', '返品'), value: 'return' },
    ],
  },
  {
    key: 'state', dataKey: 'state', title: t('wms.inventory.status', '状態'), width: 80, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.stateDraft', '下書き'), value: 'draft' },
      { label: t('wms.inventory.stateConfirmed', '確認済'), value: 'confirmed' },
      { label: t('wms.inventory.stateDone', '完了'), value: 'done' },
      { label: t('wms.inventory.stateCancelled', '取消'), value: 'cancelled' },
    ],
  },
  { key: 'productSku', dataKey: 'productSku', title: 'SKU', width: 120, fieldType: 'string', searchable: true, searchType: 'string' },
])

const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'moveNumber', dataKey: 'moveNumber', title: t('wms.inventory.moveNumber', '移動番号'), width: 160, fieldType: 'string', searchable: true, searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => h('span', { class: 'move-number' }, rowData.moveNumber),
  },
  {
    key: 'moveType', dataKey: 'moveType', title: t('wms.inventory.moveType', 'タイプ'), width: 80, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.moveTypeInbound', '入庫'), value: 'inbound' },
      { label: t('wms.inventory.moveTypeOutbound', '出庫'), value: 'outbound' },
      { label: t('wms.inventory.moveTypeTransfer', '移動'), value: 'transfer' },
      { label: t('wms.inventory.moveTypeAdjustment', '調整'), value: 'adjustment' },
      { label: t('wms.inventory.moveTypeReturn', '返品'), value: 'return' },
    ],
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      h('span', { class: `move-type-badge move-type--${rowData.moveType}` }, moveTypeLabel(rowData.moveType)),
  },
  {
    key: 'state', dataKey: 'state', title: t('wms.inventory.status', '状態'), width: 80, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.stateDraft', '下書き'), value: 'draft' },
      { label: t('wms.inventory.stateConfirmed', '確認済'), value: 'confirmed' },
      { label: t('wms.inventory.stateDone', '完了'), value: 'done' },
      { label: t('wms.inventory.stateCancelled', '取消'), value: 'cancelled' },
    ],
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      h('span', { class: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stateClass(rowData.state)}` }, stateLabel(rowData.state)),
  },
  { key: 'productSku', dataKey: 'productSku', title: 'SKU', width: 120, fieldType: 'string', searchable: true, searchType: 'string' },
  { key: 'productName', dataKey: 'productName', title: t('wms.inventory.productName', '商品名'), width: 160, fieldType: 'string' },
  { key: 'quantity', dataKey: 'quantity', title: t('wms.inventory.quantity', '数量'), width: 80, fieldType: 'number' },
  {
    key: 'fromLocation', title: t('wms.inventory.fromLocation', '移動元'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      h('span', { class: 'location-badge' }, rowData.fromLocation?.code || '-'),
  },
  {
    key: 'toLocation', title: t('wms.inventory.toLocation', '移動先'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      h('span', { class: 'location-badge' }, rowData.toLocation?.code || '-'),
  },
  { key: 'referenceNumber', dataKey: 'referenceNumber', title: t('wms.inventory.reference', '関連'), width: 140, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      rowData.referenceNumber ? h('span', { class: 'text-muted' }, rowData.referenceNumber) : '-',
  },
  {
    key: 'executedAt', title: t('wms.inventory.executedAt', '実行日時'), width: 140, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: StockMove }) =>
      rowData.executedAt ? formatDateTime(rowData.executedAt) : rowData.createdAt ? formatDateTime(rowData.createdAt) : '-',
  },
  {
    key: 'memo', dataKey: 'memo', title: t('wms.inventory.memo', 'メモ'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockMove }) => rowData.memo || '-',
  },
])

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  filterMoveType.value = payload.moveType?.value || ''
  filterState.value = payload.state?.value || ''
  currentPage.value = 1
  loadData()
}

const onPageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadData()
}

const exportCsv = () => {
  const csvRows: string[] = [
    [
      t('wms.inventory.moveNumber', '移動番号'),
      t('wms.inventory.moveType', 'タイプ'),
      t('wms.inventory.status', '状態'),
      'SKU',
      t('wms.inventory.productName', '商品名'),
      t('wms.inventory.quantity', '数量'),
      t('wms.inventory.fromLocation', '移動元'),
      t('wms.inventory.toLocation', '移動先'),
      t('wms.inventory.referenceNumber', '関連番号'),
      t('wms.inventory.executedAt', '実行日時'),
      t('wms.inventory.memo', 'メモ'),
    ].join(','),
  ]
  for (const r of rows.value) {
    csvRows.push([
      `"${r.moveNumber}"`,
      moveTypeLabel(r.moveType),
      stateLabel(r.state),
      `"${r.productSku}"`,
      `"${r.productName || ''}"`,
      r.quantity,
      `"${r.fromLocation?.code || ''}"`,
      `"${r.toLocation?.code || ''}"`,
      `"${r.referenceNumber || ''}"`,
      r.executedAt ? formatDateTime(r.executedAt) : '',
      `"${r.memo || ''}"`,
    ].join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `movements_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchMovements({
      moveType: filterMoveType.value || undefined,
      state: filterState.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rows.value = res.items
    total.value = res.total
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inventory.dataFetchFailed', 'データの取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.inventory-movements {
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

.move-number {
  font-family: monospace;
  font-size: 12px;
  color: var(--o-brand-primary, #714b67);
  font-weight: 600;
}

.move-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.move-type--inbound { background: #e1f3d8; color: #67c23a; }
.move-type--outbound { background: #fef0f0; color: #f56c6c; }
.move-type--transfer { background: #d9ecff; color: #409eff; }
.move-type--adjustment { background: #fdf6ec; color: #e6a23c; }
.move-type--return { background: #f4f4f5; color: #909399; }


.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.text-muted { color: var(--o-gray-500, #909399); font-size: 12px; }
</style>
