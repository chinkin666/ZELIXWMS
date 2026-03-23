<template>
  <div class="operation-log-view">
    <PageHeader :title="t('wms.settings.operationLog', 'WMS操作ログ')" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="exportCsv">{{ t('wms.settings.exportCsv', 'CSV出力') }}</Button>
      </template>
    </PageHeader>

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
import { fetchOperationLogs, exportOperationLogs } from '@/api/operationLog'
import type { OperationLogItem } from '@/api/operationLog'
import type { TableColumn, Operator } from '@/types/table'

const { t } = useI18n()
const toast = useToast()
const isLoading = ref(false)
const rows = ref<OperationLogItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const globalSearchText = ref('')

const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterCategory = ref('')
const filterAction = ref('')
const filterSearch = ref('')

const actionOptions = computed<ReadonlyArray<{ readonly value: string; readonly label: string }>>(() => [
  { value: 'inbound_receive', label: t('wms.settings.actionInboundReceive', '入庫検品') },
  { value: 'inbound_putaway', label: t('wms.settings.actionInboundPutaway', '棚入れ') },
  { value: 'outbound_pick', label: t('wms.settings.actionOutboundPick', 'ピッキング') },
  { value: 'outbound_inspect', label: t('wms.settings.actionOutboundInspect', '出荷検品') },
  { value: 'outbound_ship', label: t('wms.settings.actionOutboundShip', '出荷完了') },
  { value: 'transfer', label: t('wms.settings.actionTransfer', '在庫移動') },
  { value: 'adjustment', label: t('wms.settings.actionAdjustment', '在庫調整') },
  { value: 'stocktaking', label: t('wms.settings.actionStocktaking', '棚卸') },
  { value: 'return_receive', label: t('wms.settings.actionReturnReceive', '返品入荷') },
  { value: 'return_inspect', label: t('wms.settings.actionReturnInspect', '返品検品') },
  { value: 'lot_update', label: t('wms.settings.actionLotUpdate', 'ロット更新') },
  { value: 'product_update', label: t('wms.settings.actionProductUpdate', '商品更新') },
  { value: 'location_update', label: t('wms.settings.actionLocationUpdate', 'ロケーション更新') },
  { value: 'order_create', label: t('wms.settings.actionOrderCreate', '指示作成') },
  { value: 'order_update', label: t('wms.settings.actionOrderUpdate', '指示更新') },
  { value: 'order_cancel', label: t('wms.settings.actionOrderCancel', '指示取消') },
])

const categoryLabel = (c: string) => {
  const map: Record<string, string> = {
    inbound: t('wms.settings.categoryInbound', '入庫'),
    outbound: t('wms.settings.categoryOutbound', '出庫'),
    inventory: t('wms.settings.categoryInventory', '在庫'),
    master: t('wms.settings.categoryMaster', 'マスタ'),
    return: t('wms.settings.categoryReturn', '返品'),
  }
  return map[c] || c
}

const actionLabel = (a: string) => {
  const found = actionOptions.value.find(o => o.value === a)
  return found ? found.label : a
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

const baseColumns = computed<TableColumn[]>(() => [
  { key: 'createdAt', dataKey: 'createdAt', title: t('wms.settings.dateTime', '日時'), width: 150, fieldType: 'date' },
  {
    key: 'category', dataKey: 'category', title: t('wms.settings.category', 'カテゴリ'), width: 80, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: [
      { label: t('wms.settings.categoryInbound', '入庫'), value: 'inbound' },
      { label: t('wms.settings.categoryOutbound', '出庫'), value: 'outbound' },
      { label: t('wms.settings.categoryInventory', '在庫'), value: 'inventory' },
      { label: t('wms.settings.categoryMaster', 'マスタ'), value: 'master' },
      { label: t('wms.settings.categoryReturn', '返品'), value: 'return' },
    ],
  },
  {
    key: 'action', dataKey: 'action', title: t('wms.settings.action', 'アクション'), width: 130, fieldType: 'string',
    searchable: true, searchType: 'select',
    searchOptions: actionOptions.value.map(o => ({ label: o.label, value: o.value })),
  },
  { key: 'productSku', dataKey: 'productSku', title: 'SKU', width: 100, fieldType: 'string', searchable: true, searchType: 'string' },
  { key: 'productName', dataKey: 'productName', title: t('wms.settings.productName', '商品名'), width: 150, fieldType: 'string' },
  { key: 'quantity', dataKey: 'quantity', title: t('wms.settings.quantity', '数量'), width: 70, fieldType: 'number' },
  { key: 'locationCode', dataKey: 'locationCode', title: t('wms.settings.location', 'ロケーション'), width: 110, fieldType: 'string' },
  { key: 'referenceNumber', dataKey: 'referenceNumber', title: t('wms.settings.referenceNumber', '参照番号'), width: 130, fieldType: 'string', searchable: true, searchType: 'string' },
  { key: 'userName', dataKey: 'userName', title: t('wms.settings.user', 'ユーザー'), width: 90, fieldType: 'string' },
  { key: 'description', dataKey: 'description', title: t('wms.settings.description', '説明'), width: 200, fieldType: 'string' },
])

const searchColumns = computed<TableColumn[]>(() => baseColumns.value.filter((c) => c.searchable))

const tableColumns = computed<TableColumn[]>(() => baseColumns.value.map((col) => {
  if (col.key === 'createdAt') {
    return { ...col, cellRenderer: ({ rowData }: { rowData: OperationLogItem }) => formatDateTime(rowData.createdAt) }
  }
  if (col.key === 'category') {
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: OperationLogItem }) =>
        h('span', { class: `category-badge category--${rowData.category}` }, categoryLabel(rowData.category)),
    }
  }
  if (col.key === 'action') {
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: OperationLogItem }) =>
        h('span', { class: 'action-label' }, actionLabel(rowData.action)),
    }
  }
  if (col.key === 'productSku') {
    return { ...col, cellRenderer: ({ rowData }: { rowData: OperationLogItem }) => rowData.productSku || '-' }
  }
  if (col.key === 'productName') {
    return { ...col, cellRenderer: ({ rowData }: { rowData: OperationLogItem }) => rowData.productName || '-' }
  }
  if (col.key === 'quantity') {
    return { ...col, cellRenderer: ({ rowData }: { rowData: OperationLogItem }) => rowData.quantity != null ? rowData.quantity : '-' }
  }
  if (col.key === 'locationCode') {
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: OperationLogItem }) =>
        rowData.locationCode ? h('span', { class: 'location-badge' }, rowData.locationCode) : '-',
    }
  }
  if (col.key === 'referenceNumber') {
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: OperationLogItem }) =>
        rowData.referenceNumber ? h('span', { class: 'ref-number' }, rowData.referenceNumber) : '-',
    }
  }
  if (col.key === 'userName') {
    return { ...col, cellRenderer: ({ rowData }: { rowData: OperationLogItem }) => rowData.userName || '-' }
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

  filterCategory.value = payload.category?.value || ''
  filterAction.value = payload.action?.value || ''
  currentPage.value = 1
  loadData()
}

const buildParams = () => ({
  dateFrom: filterDateFrom.value || undefined,
  dateTo: filterDateTo.value || undefined,
  action: filterAction.value || undefined,
  category: filterCategory.value || undefined,
  search: filterSearch.value || undefined,
  page: currentPage.value,
  limit: pageSize.value,
})

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchOperationLogs(buildParams())
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
    const data = await exportOperationLogs({
      dateFrom: filterDateFrom.value || undefined,
      dateTo: filterDateTo.value || undefined,
      action: filterAction.value || undefined,
      category: filterCategory.value || undefined,
      search: filterSearch.value || undefined,
    })

    const csvRows: string[] = [`${t('wms.settings.dateTime', '日時')},${t('wms.settings.category', 'カテゴリ')},${t('wms.settings.action', 'アクション')},SKU,${t('wms.settings.productName', '商品名')},${t('wms.settings.quantity', '数量')},${t('wms.settings.location', 'ロケーション')},${t('wms.settings.referenceNumber', '参照番号')},${t('wms.settings.user', 'ユーザー')},${t('wms.settings.description', '説明')}`]
    for (const r of data) {
      csvRows.push([
        `"${formatDateTime(r.createdAt)}"`,
        `"${categoryLabel(r.category)}"`,
        `"${actionLabel(r.action)}"`,
        `"${r.productSku || ''}"`,
        `"${r.productName || ''}"`,
        r.quantity != null ? r.quantity : '',
        `"${r.locationCode || ''}"`,
        `"${r.referenceNumber || ''}"`,
        `"${r.userName || ''}"`,
        `"${(r.description || '').replace(/"/g, '""')}"`,
      ].join(','))
    }

    const bom = '\uFEFF'
    const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `operation_logs_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('wms.settings.exportFailed', 'エクスポートに失敗しました')
    toast.showError(message)
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.operation-log-view {
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

.category-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
}

.category--inbound { background: #e1f3d8; color: #67c23a; }
.category--outbound { background: #fef0f0; color: #f56c6c; }
.category--inventory { background: #d9ecff; color: #409eff; }
.category--master { background: #fdf6ec; color: #e6a23c; }
.category--return { background: #f4f4f5; color: #909399; }

.action-label {
  font-size: 12px;
  color: var(--o-gray-700, #303133);
}

.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.ref-number {
  font-family: monospace;
  font-size: 12px;
  color: var(--o-brand-primary, #714b67);
  font-weight: 600;
}
</style>
