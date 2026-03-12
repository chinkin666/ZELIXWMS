<template>
  <div class="return-order-list">
    <ControlPanel title="返品一覧" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <select v-model="filterStatus" class="o-input o-input-sm" style="width:120px;" @change="currentPage = 1; loadData()">
            <option value="">全状態</option>
            <option value="draft">下書き</option>
            <option value="inspecting">検品中</option>
            <option value="completed">完了</option>
            <option value="cancelled">キャンセル</option>
          </select>
          <OButton variant="secondary" size="sm" @click="exportCsv">CSV出力</OButton>
          <OButton variant="secondary" size="sm" @click="showImportPanel = !showImportPanel">CSV取込</OButton>
          <OButton variant="primary" size="sm" @click="$router.push('/returns/create')">新規作成</OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- CSV Import Panel -->
    <div v-if="showImportPanel" class="import-panel">
      <div class="import-panel-header">
        <strong>返品CSV取込</strong>
        <span class="import-hint">CSVフォーマット: 品番,数量,返品理由,顧客名,受付日,メモ</span>
      </div>
      <div class="import-panel-body">
        <input ref="fileInputRef" type="file" accept=".csv,.txt" @change="handleFileSelect" />
        <div v-if="importPreview.length > 0" class="import-preview">
          <p>{{ importPreview.length }}件の返品データを検出</p>
          <table class="o-table" style="margin-top:8px;">
            <thead>
              <tr>
                <th class="o-table-th">品番</th>
                <th class="o-table-th">数量</th>
                <th class="o-table-th">返品理由</th>
                <th class="o-table-th">顧客名</th>
                <th class="o-table-th">受付日</th>
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
                  ... 他{{ importPreview.length - 10 }}件
                </td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:8px;display:flex;gap:6px;">
            <OButton variant="primary" size="sm" :disabled="importing" @click="executeImport">
              {{ importing ? '取込中...' : '取込実行' }}
            </OButton>
            <OButton variant="secondary" size="sm" @click="clearImport">キャンセル</OButton>
          </div>
        </div>
      </div>
    </div>

    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:40px;">
              <input type="checkbox" :checked="allChecked" @change="toggleAll" />
            </th>
            <th class="o-table-th" style="width:170px;">返品番号</th>
            <th class="o-table-th" style="width:90px;">状態</th>
            <th class="o-table-th" style="width:100px;">返品理由</th>
            <th class="o-table-th" style="width:120px;">顧客名</th>
            <th class="o-table-th" style="width:170px;">元出荷番号</th>
            <th class="o-table-th o-table-th--right" style="width:70px;">行数</th>
            <th class="o-table-th o-table-th--right" style="width:80px;">総数量</th>
            <th class="o-table-th" style="width:100px;">受付日</th>
            <th class="o-table-th" style="width:100px;">作成日時</th>
            <th class="o-table-th" style="width:250px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="11" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="11" class="o-table-empty">データがありません</td>
          </tr>
          <tr v-for="row in rows" :key="row._id" class="o-table-row">
            <td class="o-table-td">
              <input type="checkbox" :checked="selectedIds.has(row._id)" @change="toggleRow(row._id)" />
            </td>
            <td class="o-table-td">
              <span class="order-number clickable" @click="$router.push(`/returns/${row._id}`)">{{ row.orderNumber }}</span>
            </td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
            </td>
            <td class="o-table-td">{{ reasonLabel(row.returnReason) }}</td>
            <td class="o-table-td">{{ row.customerName || '-' }}</td>
            <td class="o-table-td" style="font-family:monospace;">{{ row.shipmentOrderNumber || '-' }}</td>
            <td class="o-table-td o-table-td--right">{{ row.lines.length }}</td>
            <td class="o-table-td o-table-td--right">{{ totalQty(row) }}</td>
            <td class="o-table-td">{{ formatDate(row.receivedDate) }}</td>
            <td class="o-table-td">{{ formatDateTime(row.createdAt) }}</td>
            <td class="o-table-td o-table-td--actions">
              <div style="display:inline-flex;gap:4px;flex-wrap:wrap;">
                <OButton size="sm" variant="secondary" @click="$router.push(`/returns/${row._id}`)">詳細</OButton>
                <OButton v-if="row.status === 'draft'" variant="primary" size="sm" @click="handleStartInspection(row)">検品開始</OButton>
                <OButton v-if="row.status === 'inspecting'" variant="success" size="sm" @click="handleComplete(row)">完了</OButton>
                <OButton
                  v-if="row.status !== 'completed' && row.status !== 'cancelled'"
                  variant="secondary" size="sm" style="border-color:#f56c6c;color:#f56c6c;"
                  @click="handleCancel(row)"
                >取消</OButton>
                <OButton
                  v-if="row.status === 'draft' || row.status === 'cancelled'"
                  variant="secondary" size="sm" style="border-color:#f56c6c;color:#f56c6c;"
                  @click="handleDelete(row)"
                >削除</OButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Bulk action bar -->
    <div v-if="selectedIds.size > 0" class="bulk-bar">
      <span>{{ selectedIds.size }}件選択中</span>
      <OButton variant="primary" size="sm" :disabled="bulkProcessing" @click="bulkStartInspection">一括検品開始</OButton>
      <OButton variant="secondary" size="sm" style="border-color:#f56c6c;color:#f56c6c;" :disabled="bulkProcessing" @click="bulkCancel">一括取消</OButton>
    </div>

    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} 件</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;" @change="currentPage = 1; loadData()">
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="currentPage--; loadData()">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++; loadData()">&rsaquo;</OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import {
  fetchReturnOrders,
  startReturnInspection,
  completeReturnOrder,
  cancelReturnOrder,
  deleteReturnOrder,
  bulkCreateReturns,
} from '@/api/returnOrder'
import type { ReturnOrder } from '@/api/returnOrder'

const toast = useToast()
const isLoading = ref(false)
const rows = ref<ReturnOrder[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(25)
const filterStatus = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const statusLabel = (s: string) => ({ draft: '下書き', inspecting: '検品中', completed: '完了', cancelled: 'キャンセル' }[s] || s)
const statusClass = (s: string) => ({
  draft: 'o-status-tag--draft', inspecting: 'o-status-tag--printed',
  completed: 'o-status-tag--confirmed', cancelled: 'o-status-tag--cancelled',
}[s] || '')
const reasonLabel = (r: string) => ({
  customer_request: 'お客様都合', defective: '不良品', wrong_item: '誤配送', damaged: '破損', other: 'その他',
}[r] || r)
const totalQty = (row: ReturnOrder) => row.lines.reduce((s, l) => s + l.quantity, 0)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ja-JP') : '-'
const formatDateTime = (d: string) => d ? new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

// --- Selection ---
const selectedIds = ref<Set<string>>(new Set())
const allChecked = computed(() => rows.value.length > 0 && rows.value.every(r => selectedIds.value.has(r._id)))

function toggleAll() {
  if (allChecked.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(rows.value.map(r => r._id))
  }
}
function toggleRow(id: string) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) { next.delete(id) } else { next.add(id) }
  selectedIds.value = next
}

// --- Bulk Actions ---
const bulkProcessing = ref(false)

async function bulkStartInspection() {
  const targets = rows.value.filter(r => selectedIds.value.has(r._id) && r.status === 'draft')
  if (targets.length === 0) { toast.showWarning('下書き状態の返品が選択されていません'); return }
  bulkProcessing.value = true
  let ok = 0; let fail = 0
  for (const r of targets) {
    try { await startReturnInspection(r._id); ok++ } catch { fail++ }
  }
  toast.showSuccess(`検品開始: ${ok}件成功${fail > 0 ? `、${fail}件失敗` : ''}`)
  selectedIds.value = new Set()
  bulkProcessing.value = false
  await loadData()
}

async function bulkCancel() {
  const targets = rows.value.filter(r => selectedIds.value.has(r._id) && r.status !== 'completed' && r.status !== 'cancelled')
  if (targets.length === 0) { toast.showWarning('キャンセル可能な返品が選択されていません'); return }
  if (!confirm(`${targets.length}件の返品をキャンセルしますか？`)) return
  bulkProcessing.value = true
  let ok = 0; let fail = 0
  for (const r of targets) {
    try { await cancelReturnOrder(r._id); ok++ } catch { fail++ }
  }
  toast.showSuccess(`キャンセル: ${ok}件成功${fail > 0 ? `、${fail}件失敗` : ''}`)
  selectedIds.value = new Set()
  bulkProcessing.value = false
  await loadData()
}

// --- CSV Export ---
function exportCsv() {
  const csvRows: string[] = ['返品番号,状態,返品理由,顧客名,元出荷番号,品番,品名,数量,検品数,処分,再入庫数,廃棄数,受付日,作成日,メモ']
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

function dispositionLabel(d: string) {
  return ({ restock: '再入庫', dispose: '廃棄', repair: '修理', pending: '未処理' }[d] || d)
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
      // Map reason text to code
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
    toast.showError(e.message || '取込に失敗しました')
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
    const res = await fetchReturnOrders({ status: filterStatus.value || undefined, page: currentPage.value, limit: pageSize.value })
    rows.value = res.data
    total.value = res.total
    selectedIds.value = new Set()
  } catch (e: any) { toast.showError(e?.message || '取得に失敗') } finally { isLoading.value = false }
}

const handleStartInspection = async (row: ReturnOrder) => {
  try { await startReturnInspection(row._id); toast.showSuccess('検品を開始しました'); await loadData() }
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
  if (!confirm(`返品 ${row.orderNumber} をキャンセルしますか？`)) return
  try { await cancelReturnOrder(row._id); toast.showSuccess('キャンセルしました'); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}
const handleDelete = async (row: ReturnOrder) => {
  if (!confirm(`返品 ${row.orderNumber} を削除しますか？`)) return
  try { await deleteReturnOrder(row._id); toast.showSuccess('削除しました'); await loadData() }
  catch (e: any) { toast.showError(e?.message) }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.return-order-list { display: flex; flex-direction: column; padding: 1rem; }
.order-number { font-family: monospace; font-weight: 600; color: var(--o-brand-primary, #714b67); }
.clickable { cursor: pointer; }
.clickable:hover { text-decoration: underline; }
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }

/* Import Panel */
.import-panel { margin-top: 8px; border: 1px solid var(--o-border-color, #e4e7ed); border-radius: 8px; background: var(--o-view-background, #fff); overflow: hidden; }
.import-panel-header { padding: 10px 14px; background: var(--o-gray-100, #f5f7fa); border-bottom: 1px solid var(--o-border-color, #e4e7ed); display: flex; align-items: center; gap: 12px; font-size: 13px; }
.import-hint { color: var(--o-gray-500, #909399); font-size: 12px; }
.import-panel-body { padding: 14px; }
.import-preview { margin-top: 10px; font-size: 13px; }

/* Bulk bar */
.bulk-bar {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  background: var(--o-gray-100, #f0f2f5); border-radius: 6px; margin-top: 8px;
  font-size: 13px; font-weight: 500;
}
</style>
