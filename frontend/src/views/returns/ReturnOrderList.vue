<template>
  <div class="return-order-list">
    <ControlPanel :title="t('wms.returns.returnList', '返品一覧')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <OButton variant="secondary" size="sm" @click="exportCsv">{{ t('wms.returns.csvExport', 'CSV出力') }}</OButton>
          <OButton variant="secondary" size="sm" @click="showImportPanel = !showImportPanel">{{ t('wms.returns.csvImport', 'CSV取込') }}</OButton>
          <OButton variant="primary" size="sm" @click="$router.push('/returns/create')">{{ t('wms.common.create', '新規作成') }}</OButton>
        </div>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="returnOrderListSearch"
      @search="handleSearch"
    />

    <!-- CSV Import Panel -->
    <div v-if="showImportPanel" class="import-panel">
      <div class="import-panel-header">
        <strong>{{ t('wms.returns.csvImportTitle', '返品CSV取込') }}</strong>
        <span class="import-hint">{{ t('wms.returns.csvFormat', 'CSVフォーマット: 品番,数量,返品理由,顧客名,受付日,メモ') }}</span>
      </div>
      <div class="import-panel-body">
        <input ref="fileInputRef" type="file" accept=".csv,.txt" @change="handleFileSelect" />
        <div v-if="importPreview.length > 0" class="import-preview">
          <p>{{ importPreview.length }}{{ t('wms.returns.returnDataDetected', '件の返品データを検出') }}</p>
          <table class="o-table" style="margin-top:8px;">
            <thead>
              <tr>
                <th class="o-table-th">{{ t('wms.returns.productSku', '品番') }}</th>
                <th class="o-table-th">{{ t('wms.returns.quantity', '数量') }}</th>
                <th class="o-table-th">{{ t('wms.returns.returnReason', '返品理由') }}</th>
                <th class="o-table-th">{{ t('wms.returns.customerName', '顧客名') }}</th>
                <th class="o-table-th">{{ t('wms.returns.receivedDate', '受付日') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in importPreview.slice(0, 10)" :key="i" class="o-table-row">
                <td class="o-table-td">{{ row.productSku }}</td>
                <td class="o-table-td">{{ row.quantity }}</td>
                <td class="o-table-td">{{ reasonLabel(row.returnReason) }}</td>
                <td class="o-table-td">{{ row.customerName || '-' }}</td>
                <td class="o-table-td">{{ row.receivedDate || '-' }}</td>
              </tr>
              <tr v-if="importPreview.length > 10">
                <td colspan="5" class="o-table-td" style="text-align:center;color:#909399;">
                  ... {{ t('wms.returns.otherItems', '他') }}{{ importPreview.length - 10 }}{{ t('wms.common.items', '件') }}
                </td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:8px;display:flex;gap:6px;">
            <OButton variant="primary" size="sm" :disabled="importing" @click="executeImport">
              {{ importing ? t('wms.returns.importing', '取込中...') : t('wms.returns.executeImport', '取込実行') }}
            </OButton>
            <OButton variant="secondary" size="sm" @click="clearImport">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Bulk action bar -->
    <div v-if="selectedIds.size > 0" class="bulk-bar">
      <span>{{ selectedIds.size }}{{ t('wms.returns.selectedCount', '件選択中') }}</span>
      <OButton variant="primary" size="sm" :disabled="bulkProcessing" @click="bulkStartInspection">{{ t('wms.returns.bulkStartInspection', '一括検品開始') }}</OButton>
      <OButton variant="secondary" size="sm" style="border-color:#f56c6c;color:#f56c6c;" :disabled="bulkProcessing" @click="bulkCancel">{{ t('wms.returns.bulkCancel', '一括取消') }}</OButton>
    </div>

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
          :page-sizes="[25, 50, 100]"
          :global-search-text="globalSearchText"
          @page-change="handlePageChange"
        />
      </div>
    </OLoadingState>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
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
  fetchReturnOrders,
  startReturnInspection,
  completeReturnOrder,
  cancelReturnOrder,
  deleteReturnOrder,
  bulkCreateReturns,
} from '@/api/returnOrder'
import type { ReturnOrder } from '@/api/returnOrder'

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const isLoading = ref(false)
const rows = ref<ReturnOrder[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(25)
const globalSearchText = ref('')

// Current search filters
const currentFilterStatus = ref('')

const statusLabel = (s: string) => ({ draft: t('wms.returns.statusDraft', '下書き'), inspecting: t('wms.returns.statusInspecting', '検品中'), completed: t('wms.returns.statusCompleted', '完了'), cancelled: t('wms.returns.statusCancelled', 'キャンセル') }[s] || s)
const statusClass = (s: string) => ({
  draft: 'o-status-tag--draft', inspecting: 'o-status-tag--printed',
  completed: 'o-status-tag--confirmed', cancelled: 'o-status-tag--cancelled',
}[s] || '')
const reasonLabel = (r: string) => ({
  customer_request: t('wms.returns.reasonCustomerRequest', 'お客様都合'), defective: t('wms.returns.reasonDefective', '不良品'), wrong_item: t('wms.returns.reasonWrongItem', '誤配送'), damaged: t('wms.returns.reasonDamaged', '破損'), other: t('wms.returns.reasonOther', 'その他'),
}[r] || r)
const totalQty = (row: ReturnOrder) => row.lines.reduce((s, l) => s + l.quantity, 0)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ja-JP') : '-'
const formatDateTime = (d: string) => d ? new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

// --- Selection ---
const selectedIds = ref<Set<string>>(new Set())

function toggleRow(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) { next.delete(id) } else { next.add(id) }
  selectedIds.value = next
}

function toggleAll() {
  const allChecked = rows.value.length > 0 && rows.value.every(r => selectedIds.value.has(r._id))
  if (allChecked) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(rows.value.map(r => r._id))
  }
}

// Column definitions
const baseColumns: TableColumn[] = [
  {
    key: 'checkbox',
    title: '',
    width: 40,
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) =>
      h('input', {
        type: 'checkbox',
        checked: selectedIds.value.has(rowData._id),
        onChange: () => toggleRow(rowData._id),
      }),
    headerCellRenderer: () =>
      h('input', {
        type: 'checkbox',
        checked: rows.value.length > 0 && rows.value.every(r => selectedIds.value.has(r._id)),
        onChange: toggleAll,
      }),
  },
  {
    key: 'orderNumber',
    dataKey: 'orderNumber',
    title: t('wms.returns.returnNumber', '返品番号'),
    width: 170,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) =>
      h('span', { class: 'order-number clickable', onClick: () => router.push(`/returns/${rowData._id}`) }, rowData.orderNumber),
  },
  {
    key: 'status',
    dataKey: 'status',
    title: t('wms.returns.status', '状態'),
    width: 90,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.returns.statusDraft', '下書き'), value: 'draft' },
      { label: t('wms.returns.statusInspecting', '検品中'), value: 'inspecting' },
      { label: t('wms.returns.statusCompleted', '完了'), value: 'completed' },
      { label: t('wms.returns.statusCancelled', 'キャンセル'), value: 'cancelled' },
    ],
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) =>
      h('span', { class: `o-status-tag ${statusClass(rowData.status)}` }, statusLabel(rowData.status)),
  },
  {
    key: 'returnReason',
    dataKey: 'returnReason',
    title: t('wms.returns.returnReason', '返品理由'),
    width: 100,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) => reasonLabel(rowData.returnReason),
  },
  {
    key: 'customerName',
    dataKey: 'customerName',
    title: t('wms.returns.customerName', '顧客名'),
    width: 120,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) => rowData.customerName || '-',
  },
  {
    key: 'shipmentOrderNumber',
    dataKey: 'shipmentOrderNumber',
    title: t('wms.returns.originalShipmentNumber', '元出荷番号'),
    width: 170,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) =>
      h('span', { style: 'font-family:monospace;' }, rowData.shipmentOrderNumber || '-'),
  },
  {
    key: 'lineCount',
    title: t('wms.returns.lineCount', '行数'),
    width: 70,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.lines.length)),
  },
  {
    key: 'totalQty',
    title: t('wms.returns.totalQuantity', '総数量'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(totalQty(rowData))),
  },
  {
    key: 'receivedDate',
    dataKey: 'receivedDate',
    title: t('wms.returns.receivedDate', '受付日'),
    width: 100,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) => formatDate(rowData.receivedDate),
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: t('wms.returns.createdAt', '作成日時'),
    width: 100,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) => formatDateTime(rowData.createdAt),
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns,
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 250,
    cellRenderer: ({ rowData }: { rowData: ReturnOrder }) => {
      const buttons: any[] = []
      buttons.push(h(OButton, { size: 'sm', variant: 'secondary', onClick: () => router.push(`/returns/${rowData._id}`) }, () => t('wms.returns.details', '詳細')))
      if (rowData.status === 'draft') {
        buttons.push(h(OButton, { variant: 'primary', size: 'sm', onClick: () => handleStartInspection(rowData) }, () => t('wms.returns.startInspection', '検品開始')))
      }
      if (rowData.status === 'inspecting') {
        buttons.push(h(OButton, { variant: 'success', size: 'sm', onClick: () => handleComplete(rowData) }, () => t('wms.returns.complete', '完了')))
      }
      if (rowData.status !== 'completed' && rowData.status !== 'cancelled') {
        buttons.push(h(OButton, { variant: 'secondary', size: 'sm', style: 'border-color:#f56c6c;color:#f56c6c;', onClick: () => handleCancel(rowData) }, () => t('wms.returns.cancel', '取消')))
      }
      if (rowData.status === 'draft' || rowData.status === 'cancelled') {
        buttons.push(h(OButton, { variant: 'secondary', size: 'sm', style: 'border-color:#f56c6c;color:#f56c6c;', onClick: () => handleDelete(rowData) }, () => t('wms.common.delete', '削除')))
      }
      return h('div', { class: 'action-cell' }, buttons)
    },
  },
]

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

  currentPage.value = 1
  loadData()
}

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadData()
}

// --- Bulk Actions ---
const bulkProcessing = ref(false)

async function bulkStartInspection() {
  const targets = rows.value.filter(r => selectedIds.value.has(r._id) && r.status === 'draft')
  if (targets.length === 0) { toast.showWarning(t('wms.returns.noDraftSelected', '下書き状態の返品が選択されていません')); return }
  bulkProcessing.value = true
  try {
    let ok = 0; let fail = 0
    for (const r of targets) {
      try { await startReturnInspection(r._id); ok++ } catch { fail++ }
    }
    toast.showSuccess(`${t('wms.returns.startInspection', '検品開始')}: ${ok}${t('wms.returns.successCount', '件成功')}${fail > 0 ? `、${fail}${t('wms.returns.failCount', '件失敗')}` : ''}`)
    selectedIds.value = new Set()
    await loadData()
  } finally {
    bulkProcessing.value = false
  }
}

async function bulkCancel() {
  const targets = rows.value.filter(r => selectedIds.value.has(r._id) && r.status !== 'completed' && r.status !== 'cancelled')
  if (targets.length === 0) { toast.showWarning(t('wms.returns.noCancellableSelected', 'キャンセル可能な返品が選択されていません')); return }
  try {
    await ElMessageBox.confirm(
      `${targets.length}${t('wms.returns.confirmBulkCancel', '件の返品をキャンセルしますか？ / 件退货要取消吗？')}`,
      '確認 / 确认',
      { confirmButtonText: 'はい / 是', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  bulkProcessing.value = true
  try {
    let ok = 0; let fail = 0
    for (const r of targets) {
      try { await cancelReturnOrder(r._id); ok++ } catch { fail++ }
    }
    toast.showSuccess(`${t('wms.returns.cancel', 'キャンセル')}: ${ok}${t('wms.returns.successCount', '件成功')}${fail > 0 ? `、${fail}${t('wms.returns.failCount', '件失敗')}` : ''}`)
    selectedIds.value = new Set()
    await loadData()
  } finally {
    bulkProcessing.value = false
  }
}

// --- CSV Export ---
function dispositionLabel(d: string) {
  return ({ restock: t('wms.returns.dispositionRestock', '再入庫'), dispose: t('wms.returns.dispositionDispose', '廃棄'), repair: t('wms.returns.dispositionRepair', '修理'), pending: t('wms.returns.dispositionPending', '未処理') }[d] || d)
}

function exportCsv() {
  const csvRows: string[] = [
    [t('wms.returns.returnNumber', '返品番号'), t('wms.returns.status', '状態'), t('wms.returns.returnReason', '返品理由'), t('wms.returns.customerName', '顧客名'), t('wms.returns.originalShipmentNumber', '元出荷番号'), t('wms.returns.productSku', '品番'), t('wms.returns.productName', '品名'), t('wms.returns.quantity', '数量'), t('wms.returns.inspectedQuantity', '検品数'), t('wms.returns.disposition', '処分'), t('wms.returns.restockedQuantity', '再入庫数'), t('wms.returns.disposedQuantity', '廃棄数'), t('wms.returns.receivedDate', '受付日'), t('wms.returns.createdAt', '作成日'), t('wms.returns.memo', 'メモ')].join(','),
  ]
  for (const r of rows.value) {
    for (const l of r.lines) {
      csvRows.push([
        `"${r.orderNumber}"`,
        statusLabel(r.status),
        reasonLabel(r.returnReason),
        `"${r.customerName || ''}"`,
        `"${r.shipmentOrderNumber || ''}"`,
        `"${l.productSku}"`,
        `"${l.productName || ''}"`,
        l.quantity,
        l.inspectedQuantity,
        dispositionLabel(l.disposition),
        l.restockedQuantity,
        l.disposedQuantity,
        formatDate(r.receivedDate),
        formatDate(r.createdAt),
        `"${l.memo || ''}"`,
      ].join(','))
    }
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `returns_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// --- CSV Import ---
const showImportPanel = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importPreview = ref<Array<{ productSku: string; quantity: number; returnReason: string; customerName: string; receivedDate: string; memo: string }>>([])
const importing = ref(false)

function handleFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = (e.target?.result as string || '').replace(/^\uFEFF/, '')
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    const parsed: typeof importPreview.value = []
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
      if (parts.length < 2) continue
      const first = (parts[0] ?? '').toLowerCase()
      if (first === '品番' || first === 'sku' || first === 'productsku') continue
      const qty = Number(parts[1])
      if (isNaN(qty) || qty <= 0) continue
      const reasonRaw = (parts[2] || '').trim()
      const reason = resolveReasonCode(reasonRaw)
      parsed.push({
        productSku: parts[0] ?? '',
        quantity: qty,
        returnReason: reason,
        customerName: parts[3] || '',
        receivedDate: parts[4] || '',
        memo: parts[5] || '',
      })
    }
    importPreview.value = parsed
  }
  reader.readAsText(file, 'UTF-8')
}

function resolveReasonCode(raw: string): string {
  const map: Record<string, string> = {
    'お客様都合': 'customer_request', 'customer_request': 'customer_request',
    '不良品': 'defective', 'defective': 'defective',
    '誤配送': 'wrong_item', 'wrong_item': 'wrong_item',
    '破損': 'damaged', 'damaged': 'damaged',
    'その他': 'other', 'other': 'other',
  }
  return map[raw] || 'other'
}

async function executeImport() {
  if (importPreview.value.length === 0) return
  importing.value = true
  try {
    const result = await bulkCreateReturns(importPreview.value)
    toast.showSuccess(result.message)
    if (result.errors.length > 0) {
      toast.showWarning(`エラー: ${result.errors.slice(0, 3).join('; ')}${result.errors.length > 3 ? '...' : ''}`)
    }
    clearImport()
    await loadData()
  } catch (e: any) {
    toast.showError(e.message || t('wms.returns.importFailed', '取込に失敗しました'))
  } finally {
    importing.value = false
  }
}

function clearImport() {
  importPreview.value = []
  if (fileInputRef.value) fileInputRef.value.value = ''
  showImportPanel.value = false
}

// --- Data ---
const loadData = async () => {
  isLoading.value = true
  try {
    const res = await fetchReturnOrders({ status: currentFilterStatus.value || undefined, page: currentPage.value, limit: pageSize.value })
    rows.value = res.data
    total.value = res.total
    selectedIds.value = new Set()
  } catch (e: any) { toast.showError(e?.message || t('wms.returns.fetchFailed', '取得に失敗')) } finally { isLoading.value = false }
}

const handleStartInspection = async (row: ReturnOrder) => {
  try { await startReturnInspection(row._id); toast.showSuccess(t('wms.returns.inspectionStarted', '検品を開始しました')); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}
const handleComplete = async (row: ReturnOrder) => {
  try {
    const res = await completeReturnOrder(row._id)
    toast.showSuccess(`完了: 再入庫${res.restockedTotal}点 / 廃棄${res.disposedTotal}点`)
    if (res.errors.length) toast.showError(res.errors.join(', '))
    await loadData()
  } catch (e: any) { toast.showError(e?.message) }
}
const handleCancel = async (row: ReturnOrder) => {
  try {
    await ElMessageBox.confirm(
      t('wms.returns.confirmCancel', '返品をキャンセルしますか？ / 确定要取消退货吗？') + ` (${row.orderNumber})`,
      '確認 / 确认',
      { confirmButtonText: 'はい / 是', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try { await cancelReturnOrder(row._id); toast.showSuccess(t('wms.returns.cancelled', 'キャンセルしました')); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}
const handleDelete = async (row: ReturnOrder) => {
  try {
    await ElMessageBox.confirm(
      t('wms.returns.confirmDelete', '返品を削除しますか？ / 确定要删除退货吗？') + ` (${row.orderNumber})`,
      '確認 / 确认',
      { confirmButtonText: '削除 / 删除', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try { await deleteReturnOrder(row._id); toast.showSuccess(t('wms.returns.deleted', '削除しました')); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>

<style scoped>
.return-order-list {
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

:deep(.action-cell) {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* Import Panel */
.import-panel { border: 1px solid var(--o-border-color, #e4e7ed); border-radius: 8px; background: var(--o-view-background, #fff); overflow: hidden; }
.import-panel-header { padding: 10px 14px; background: var(--o-gray-100, #f5f7fa); border-bottom: 1px solid var(--o-border-color, #e4e7ed); display: flex; align-items: center; gap: 12px; font-size: 13px; }
.import-hint { color: var(--o-gray-500, #909399); font-size: 12px; }
.import-panel-body { padding: 14px; }
.import-preview { margin-top: 10px; font-size: 13px; }

/* Bulk bar */
.bulk-bar {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  background: var(--o-gray-100, #f0f2f5); border-radius: 6px;
  font-size: 13px; font-weight: 500;
}
</style>
