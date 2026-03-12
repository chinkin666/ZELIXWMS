<template>
  <div class="inventory-stock">
    <ControlPanel title="在庫一覧" :show-search="false">
      <template #center>
        <input
          v-model="searchText"
          type="text"
          class="o-input"
          placeholder="SKU・商品名で検索..."
          style="width: 280px;"
          @input="handleSearchDebounced"
        />
      </template>
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <label class="switch-label">
            在庫0を表示
            <label class="o-toggle">
              <input type="checkbox" v-model="showZero" />
              <span class="o-toggle-slider"></span>
            </label>
          </label>
          <OButton variant="secondary" size="sm" @click="viewMode = viewMode === 'summary' ? 'detail' : 'summary'">
            {{ viewMode === 'summary' ? '詳細表示' : '集計表示' }}
          </OButton>
          <OButton variant="secondary" size="sm" @click="exportCsv">CSV出力</OButton>
          <OButton variant="secondary" size="sm" @click="showImportPanel = !showImportPanel">CSV取込</OButton>
          <OButton variant="primary" size="sm" @click="openTransferDialog">在庫移動</OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- CSV Import Panel -->
    <div v-if="showImportPanel" class="import-panel">
      <div class="import-panel-header">
        <strong>在庫一括CSV取込</strong>
        <span class="import-hint">CSVフォーマット: ロケーション,品番,数量,ロット,メモ</span>
      </div>
      <div class="import-panel-body">
        <input ref="fileInputRef" type="file" accept=".csv,.txt" @change="handleFileSelect" />
        <div v-if="importPreview.length > 0" class="import-preview">
          <p>{{ importPreview.length }}件の調整データを検出</p>
          <table class="o-table" style="margin-top:8px;">
            <thead>
              <tr>
                <th class="o-table-th">ロケーション</th>
                <th class="o-table-th">品番</th>
                <th class="o-table-th">数量</th>
                <th class="o-table-th">ロット</th>
                <th class="o-table-th">メモ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in importPreview.slice(0, 10)" :key="i" class="o-table-row">
                <td class="o-table-td">{{ row.locationCode }}</td>
                <td class="o-table-td">{{ row.productSku }}</td>
                <td class="o-table-td" :class="{ 'text-success': row.quantity > 0, 'text-danger': row.quantity < 0 }">
                  {{ row.quantity > 0 ? '+' : '' }}{{ row.quantity }}
                </td>
                <td class="o-table-td">{{ row.lotNumber || '-' }}</td>
                <td class="o-table-td">{{ row.memo || '-' }}</td>
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

    <!-- 集計表示 -->
    <div v-if="viewMode === 'summary'" class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:60px;">画像</th>
            <th class="o-table-th" style="width:140px;">SKU</th>
            <th class="o-table-th" style="width:200px;">商品名</th>
            <th class="o-table-th" style="width:100px;">温度帯</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">実在庫</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">引当済</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">有効在庫</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">安全在庫</th>
            <th class="o-table-th" style="width:80px;">保管場所</th>
            <th class="o-table-th" style="width:80px;">状態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="10" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="summaryRows.length === 0">
            <td colspan="10" class="o-table-empty">在庫データがありません</td>
          </tr>
          <tr v-for="row in summaryRows" :key="row.productId" class="o-table-row">
            <td class="o-table-td">
              <img
                v-if="row.product?.imageUrl"
                :src="resolveImageUrl(row.product.imageUrl)"
                class="product-thumb"
                alt=""
                @error="(e: Event) => { (e.target as HTMLImageElement).style.display = 'none' }"
              />
              <span v-else class="product-thumb product-thumb--empty">-</span>
            </td>
            <td class="o-table-td"><span class="sku-link">{{ row.productSku }}</span></td>
            <td class="o-table-td">{{ row.product?.name || '-' }}</td>
            <td class="o-table-td">
              <span v-if="row.product?.coolType === '1'" style="color:#409eff;">冷凍</span>
              <span v-else-if="row.product?.coolType === '2'" style="color:#67c23a;">冷蔵</span>
              <span v-else>常温</span>
            </td>
            <td class="o-table-td o-table-td--right">{{ row.totalQuantity }}</td>
            <td class="o-table-td o-table-td--right">{{ row.totalReserved }}</td>
            <td class="o-table-td o-table-td--right" :class="{ 'text-danger': row.totalAvailable < 0 }">
              {{ row.totalAvailable }}
            </td>
            <td class="o-table-td o-table-td--right">{{ row.product?.safetyStock || '-' }}</td>
            <td class="o-table-td o-table-td--right">{{ row.locationCount }}箇所</td>
            <td class="o-table-td">
              <span v-if="row.isBelowSafety" class="o-status-tag o-status-tag--danger">在庫不足</span>
              <span v-else class="o-status-tag o-status-tag--confirmed">正常</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 詳細表示 -->
    <div v-else class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:140px;">SKU</th>
            <th class="o-table-th" style="width:180px;">商品名</th>
            <th class="o-table-th" style="width:180px;">ロケーション</th>
            <th class="o-table-th" style="width:140px;">ロット</th>
            <th class="o-table-th" style="width:120px;">賞味期限</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">実在庫</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">引当済</th>
            <th class="o-table-th o-table-th--right" style="width:100px;">有効在庫</th>
            <th class="o-table-th" style="width:140px;">最終移動</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="9" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="detailRows.length === 0">
            <td colspan="9" class="o-table-empty">在庫データがありません</td>
          </tr>
          <tr v-for="row in detailRows" :key="row._id" class="o-table-row">
            <td class="o-table-td">{{ row.productSku }}</td>
            <td class="o-table-td">{{ row.product?.name || '-' }}</td>
            <td class="o-table-td">
              <span class="location-badge">{{ row.location?.code || '-' }}</span>
              <span v-if="row.location?.name" class="text-muted"> {{ row.location.name }}</span>
            </td>
            <td class="o-table-td">{{ row.lot?.lotNumber || '-' }}</td>
            <td class="o-table-td">{{ row.lot?.expiryDate ? formatDate(row.lot.expiryDate) : '-' }}</td>
            <td class="o-table-td o-table-td--right">{{ row.quantity }}</td>
            <td class="o-table-td o-table-td--right">{{ row.reservedQuantity }}</td>
            <td class="o-table-td o-table-td--right" :class="{ 'text-danger': row.availableQuantity < 0 }">
              {{ row.availableQuantity }}
            </td>
            <td class="o-table-td">{{ row.lastMovedAt ? formatDateTime(row.lastMovedAt) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Bottom bar -->
    <OrderBottomBar
      :total-count="viewMode === 'summary' ? summaryRows.length : detailRows.length"
      :selected-count="0"
      total-label="件数"
    />

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
import { onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import StockTransferDialog from '@/components/inventory/StockTransferDialog.vue'
import { fetchStock, fetchStockSummary, bulkAdjustStock } from '@/api/inventory'
import { fetchProducts } from '@/api/product'
import { fetchLocations } from '@/api/location'
import { getApiBaseUrl } from '@/api/base'
import type { StockQuant, StockSummary, Location } from '@/types/inventory'
import type { Product } from '@/types/product'

const toast = useToast()
const isLoading = ref(false)
const searchText = ref('')
const showZero = ref(false)
const viewMode = ref<'summary' | 'detail'>('summary')

const summaryRows = ref<StockSummary[]>([])
const detailRows = ref<StockQuant[]>([])

// Master data for transfer dialog
const allProducts = ref<Product[]>([])
const allLocations = ref<Location[]>([])
const transferDialogVisible = ref(false)

const API_BASE_URL = getApiBaseUrl()

const resolveImageUrl = (url?: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ja-JP')
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
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
      summaryRows.value = await fetchStockSummary({ search: searchText.value || undefined })
    } else {
      detailRows.value = await fetchStock({
        productSku: searchText.value || undefined,
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

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inventory-stock {
  display: flex;
  flex-direction: column;
  padding: 1rem;
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

.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

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
.o-toggle input:checked + .o-toggle-slider { background:var(--o-brand-primary, #714B67); }
.o-toggle input:checked + .o-toggle-slider::after { left:22px; }

/* Import Panel */
.import-panel {
  margin-top: 8px;
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
