<template>
  <div class="inventory-stock">
    <ControlPanel :title="t('wms.inventory.stockList', '在庫一覧')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <label class="switch-label">
            {{ t('wms.inventory.showZero', '在庫0を表示') }}
            <label class="o-toggle">
              <input type="checkbox" v-model="showZero" />
              <span class="o-toggle-slider"></span>
            </label>
          </label>
          <OButton variant="secondary" size="sm" @click="viewMode = viewMode === 'summary' ? 'detail' : 'summary'">
            {{ viewMode === 'summary' ? t('wms.inventory.detailView', '詳細表示') : t('wms.inventory.summaryView', '集計表示') }}
          </OButton>
          <OButton variant="secondary" size="sm" @click="exportCsv">{{ t('wms.inventory.csvExport', 'CSV出力') }}</OButton>
          <OButton variant="secondary" size="sm" @click="showImportPanel = !showImportPanel">{{ t('wms.inventory.csvImport', 'CSV取込') }}</OButton>
          <OButton variant="primary" size="sm" @click="openTransferDialog">{{ t('wms.inventory.stockTransfer', '在庫移動') }}</OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- CSV Import Panel -->
    <div v-if="showImportPanel" class="import-panel">
      <div class="import-panel-header">
        <strong>{{ t('wms.inventory.bulkCsvImport', '在庫一括CSV取込') }}</strong>
        <span class="import-hint">{{ t('wms.inventory.csvFormat', 'CSVフォーマット: ロケーション,品番,数量,ロット,メモ') }}</span>
      </div>
      <div class="import-panel-body">
        <input ref="fileInputRef" type="file" accept=".csv,.txt" @change="handleFileSelect" />
        <div v-if="importPreview.length > 0" class="import-preview">
          <p>{{ t('wms.inventory.adjustmentDataDetected', '{count}件の調整データを検出').replace('{count}', String(importPreview.length)) }}</p>
          <Table
            :columns="importTableColumns"
            :data="importPreview.slice(0, 10)"
            :height="300"
            row-key="productSku"
            pagination-enabled
            pagination-mode="client"
            :page-size="10"
          />
          <div v-if="importPreview.length > 10" style="text-align:center;color:#909399;font-size:12px;margin-top:4px;">
            ... {{ t('wms.inventory.moreItems', '他{count}件').replace('{count}', String(importPreview.length - 10)) }}
          </div>
          <div style="margin-top:8px;display:flex;gap:6px;">
            <OButton variant="primary" size="sm" :disabled="importing" @click="executeImport">
              {{ importing ? t('wms.inventory.importing', '取込中...') : t('wms.inventory.executeImport', '取込実行') }}
            </OButton>
            <OButton variant="secondary" size="sm" @click="clearImport">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
          </div>
        </div>
      </div>
    </div>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="inventoryStockSearch"
      @search="handleSearch"
    />

    <!-- 集計表示 -->
    <div v-if="viewMode === 'summary'" class="table-section">
      <Table
        :columns="summaryTableColumns"
        :data="summaryRows"
        :height="520"
        row-key="productId"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[20, 50, 100]"
        :global-search-text="globalSearchText"
      />
    </div>

    <!-- 詳細表示 -->
    <div v-else class="table-section">
      <Table
        :columns="detailTableColumns"
        :data="detailRows"
        :height="520"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[20, 50, 100]"
        :global-search-text="globalSearchText"
      />
    </div>

    <!-- Transfer Dialog -->
    <StockTransferDialog
      :open="transferDialogVisible"
      :products="allProducts"
      :locations="allLocations"
      @close="transferDialogVisible = false"
      @transferred="loadData()"
    />
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import StockTransferDialog from '@/components/inventory/StockTransferDialog.vue'
import { fetchStock, fetchStockSummary, bulkAdjustStock } from '@/api/inventory'
import { fetchProducts } from '@/api/product'
import { fetchLocations } from '@/api/location'
import { resolveImageUrl } from '@/utils/imageUrl'
import type { StockQuant, StockSummary, Location } from '@/types/inventory'
import type { Product } from '@/types/product'
import type { TableColumn, Operator } from '@/types/table'

const toast = useToast()
const { t } = useI18n()
const isLoading = ref(false)
const showZero = ref(false)
const viewMode = ref<'summary' | 'detail'>('summary')
const globalSearchText = ref('')

const summaryRows = ref<StockSummary[]>([])
const detailRows = ref<StockQuant[]>([])

// Master data for transfer dialog
const allProducts = ref<Product[]>([])
const allLocations = ref<Location[]>([])
const transferDialogVisible = ref(false)

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ja-JP')
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// --- Search columns ---
const baseSummaryColumns: TableColumn[] = [
  { key: 'productSku', dataKey: 'productSku', title: 'SKU', width: 140, fieldType: 'string', searchable: true, searchType: 'string' },
  { key: 'productName', title: '商品名', width: 200, fieldType: 'string', searchable: true, searchType: 'string' },
]

const searchColumns: TableColumn[] = baseSummaryColumns.filter((c) => c.searchable)

// --- Import table columns ---
const importTableColumns: TableColumn[] = [
  { key: 'locationCode', dataKey: 'locationCode', title: 'ロケーション', width: 140, fieldType: 'string' },
  { key: 'productSku', dataKey: 'productSku', title: '品番', width: 140, fieldType: 'string' },
  {
    key: 'quantity', dataKey: 'quantity', title: '数量', width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: any }) =>
      h('span', { class: rowData.quantity > 0 ? 'text-success' : 'text-danger' },
        `${rowData.quantity > 0 ? '+' : ''}${rowData.quantity}`),
  },
  { key: 'lotNumber', dataKey: 'lotNumber', title: 'ロット', width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: any }) => rowData.lotNumber || '-' },
  { key: 'memo', dataKey: 'memo', title: 'メモ', width: 140, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: any }) => rowData.memo || '-' },
]

// --- Summary table columns ---
const summaryTableColumns: TableColumn[] = [
  {
    key: 'image', title: '画像', width: 60, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) => {
      if (rowData.product?.imageUrl) {
        return h('img', {
          src: resolveImageUrl(rowData.product.imageUrl),
          alt: '',
          style: 'width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #ebeef5;',
          onError: (e: Event) => { (e.target as HTMLImageElement).style.display = 'none' },
        })
      }
      return h('span', { class: 'product-thumb product-thumb--empty' }, '-')
    },
  },
  { key: 'productSku', dataKey: 'productSku', title: 'SKU', width: 140, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) => h('span', { class: 'sku-link' }, rowData.productSku) },
  { key: 'productName', title: '商品名', width: 200, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) => rowData.product?.name || '-' },
  {
    key: 'coolType', title: '温度帯', width: 100, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) => {
      if (rowData.product?.coolType === '1') return h('span', { style: 'color:#409eff;' }, '冷凍')
      if (rowData.product?.coolType === '2') return h('span', { style: 'color:#67c23a;' }, '冷蔵')
      return '常温'
    },
  },
  { key: 'totalQuantity', dataKey: 'totalQuantity', title: '実在庫', width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) => rowData.totalQuantity },
  { key: 'totalReserved', dataKey: 'totalReserved', title: '引当済', width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) => rowData.totalReserved },
  {
    key: 'totalAvailable', dataKey: 'totalAvailable', title: '有効在庫', width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) =>
      h('span', { class: rowData.totalAvailable < 0 ? 'text-danger' : '' }, String(rowData.totalAvailable)),
  },
  { key: 'safetyStock', title: '安全在庫', width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) => rowData.product?.safetyStock || '-' },
  { key: 'locationCount', dataKey: 'locationCount', title: '保管場所', width: 80, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) => `${rowData.locationCount}箇所` },
  {
    key: 'status', title: '状態', width: 80, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockSummary }) => {
      if (rowData.isBelowSafety) return h('span', { class: 'o-status-tag o-status-tag--danger' }, '在庫不足')
      return h('span', { class: 'o-status-tag o-status-tag--confirmed' }, '正常')
    },
  },
]

// --- Detail table columns ---
const detailTableColumns: TableColumn[] = [
  { key: 'productSku', dataKey: 'productSku', title: 'SKU', width: 140, fieldType: 'string' },
  { key: 'productName', title: '商品名', width: 180, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockQuant }) => rowData.product?.name || '-' },
  {
    key: 'location', title: 'ロケーション', width: 180, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockQuant }) => {
      const children = [h('span', { class: 'location-badge' }, rowData.location?.code || '-')]
      if (rowData.location?.name) children.push(h('span', { class: 'text-muted' }, ` ${rowData.location.name}`))
      return h('span', null, children)
    },
  },
  { key: 'lotNumber', title: 'ロット', width: 140, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StockQuant }) => rowData.lot?.lotNumber || '-' },
  { key: 'expiryDate', title: '賞味期限', width: 120, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: StockQuant }) => rowData.lot?.expiryDate ? formatDate(rowData.lot.expiryDate) : '-' },
  { key: 'quantity', dataKey: 'quantity', title: '実在庫', width: 100, fieldType: 'number' },
  { key: 'reservedQuantity', dataKey: 'reservedQuantity', title: '引当済', width: 100, fieldType: 'number' },
  {
    key: 'availableQuantity', dataKey: 'availableQuantity', title: '有効在庫', width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StockQuant }) =>
      h('span', { class: rowData.availableQuantity < 0 ? 'text-danger' : '' }, String(rowData.availableQuantity)),
  },
  { key: 'lastMovedAt', dataKey: 'lastMovedAt', title: '最終移動', width: 140, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: StockQuant }) => rowData.lastMovedAt ? formatDateTime(rowData.lastMovedAt) : '-' },
]

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }
  loadData()
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const handleSearchDebounced = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => loadData(), 300)
}

// --- Transfer ---
async function openTransferDialog() {
  if (allProducts.value.length === 0 || allLocations.value.length === 0) {
    try {
      const [prods, locs] = await Promise.all([
        fetchProducts(),
        fetchLocations({ isActive: true }),
      ])
      allProducts.value = prods
      allLocations.value = locs
    } catch {
      toast.showError('マスタデータの取得に失敗しました')
      return
    }
  }
  transferDialogVisible.value = true
}

// --- CSV Export ---
function exportCsv() {
  if (viewMode.value === 'summary') {
    exportSummaryCsv()
  } else {
    exportDetailCsv()
  }
}

function exportSummaryCsv() {
  const rows: string[] = ['SKU,商品名,温度帯,実在庫,引当済,有効在庫,安全在庫,保管場所数']
  for (const r of summaryRows.value) {
    const cool = r.product?.coolType === '1' ? '冷凍' : r.product?.coolType === '2' ? '冷蔵' : '常温'
    rows.push([
      `"${r.productSku}"`,
      `"${r.product?.name || ''}"`,
      cool,
      r.totalQuantity,
      r.totalReserved,
      r.totalAvailable,
      r.product?.safetyStock ?? '',
      r.locationCount,
    ].join(','))
  }
  downloadCsv(rows, 'inventory_summary')
}

function exportDetailCsv() {
  const rows: string[] = ['SKU,商品名,ロケーション,ロット,賞味期限,実在庫,引当済,有効在庫,最終移動']
  for (const r of detailRows.value) {
    rows.push([
      `"${r.productSku}"`,
      `"${r.product?.name || ''}"`,
      `"${r.location?.code || ''}"`,
      `"${r.lot?.lotNumber || ''}"`,
      r.lot?.expiryDate ? formatDate(r.lot.expiryDate) : '',
      r.quantity,
      r.reservedQuantity,
      r.availableQuantity,
      r.lastMovedAt ? formatDateTime(r.lastMovedAt) : '',
    ].join(','))
  }
  downloadCsv(rows, 'inventory_detail')
}

function downloadCsv(rows: string[], prefix: string) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${prefix}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// --- CSV Import ---
const showImportPanel = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const importPreview = ref<Array<{ locationCode: string; productSku: string; quantity: number; lotNumber: string; memo: string }>>([])
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
      if (parts.length < 3) continue
      // Skip header
      const first = (parts[0] ?? '').toLowerCase()
      if (first === 'ロケーション' || first === 'location' || first === 'locationcode') continue
      const qty = Number(parts[2])
      if (isNaN(qty) || qty === 0) continue
      parsed.push({
        locationCode: parts[0] ?? '',
        productSku: parts[1] ?? '',
        quantity: qty,
        lotNumber: parts[3] || '',
        memo: parts[4] || '',
      })
    }
    importPreview.value = parsed
  }
  reader.readAsText(file, 'UTF-8')
}

async function executeImport() {
  if (importPreview.value.length === 0) return
  importing.value = true
  try {
    const result = await bulkAdjustStock(importPreview.value)
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

// --- Data loading ---
const loadData = async () => {
  isLoading.value = true
  try {
    if (viewMode.value === 'summary') {
      summaryRows.value = await fetchStockSummary({ search: globalSearchText.value || undefined })
    } else {
      detailRows.value = await fetchStock({
        productSku: globalSearchText.value || undefined,
        showZero: showZero.value,
      })
    }
  } catch (e: any) {
    toast.showError(e?.message || 'データの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.inventory-stock {
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

.product-thumb {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--o-border-color, #ebeef5);
}

.product-thumb--empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--o-gray-100, #f5f7fa);
  color: var(--o-gray-400, #c0c4cc);
  font-size: 12px;
}

.sku-link {
  color: var(--o-brand-primary, #714b67);
  font-weight: 600;
}

.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

.text-muted { color: var(--o-gray-500, #909399); font-size: 12px; }
.text-danger { color: #f56c6c; font-weight: 600; }
.text-success { color: #67c23a; font-weight: 600; }

.o-status-tag--danger {
  background: #fef0f0;
  color: #f56c6c;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  white-space: nowrap;
}

.o-toggle { position:relative; display:inline-flex; align-items:center; cursor:pointer; }
.o-toggle input { position:absolute; opacity:0; width:0; height:0; }
.o-toggle-slider { width:40px; height:20px; background:var(--o-toggle-off, #ccc); border-radius:10px; transition:0.2s; position:relative; }
.o-toggle-slider::after { content:''; position:absolute; width:16px; height:16px; border-radius:50%; background:#fff; top:2px; left:2px; transition:0.2s; }
.o-toggle input:checked + .o-toggle-slider { background:var(--o-brand-primary, #0052A3); }
.o-toggle input:checked + .o-toggle-slider::after { left:22px; }

/* Import Panel */
.import-panel {
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  background: var(--o-view-background, #fff);
  overflow: hidden;
}
.import-panel-header {
  padding: 10px 14px;
  background: var(--o-gray-100, #f5f7fa);
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.import-hint { color: var(--o-gray-500, #909399); font-size: 12px; }
.import-panel-body { padding: 14px; }
.import-preview { margin-top: 10px; font-size: 13px; }
</style>
