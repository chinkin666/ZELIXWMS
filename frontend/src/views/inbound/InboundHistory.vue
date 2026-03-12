<template>
  <div class="inbound-history">
    <ControlPanel title="入庫履歴" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <OButton variant="secondary" size="sm" @click="showFilters = !showFilters">
            {{ showFilters ? '検索を隠す' : '絞り込み' }}
          </OButton>
          <OButton variant="secondary" size="sm" @click="showExportSettings = !showExportSettings">
            CSV設定
          </OButton>
          <OButton variant="secondary" size="sm" @click="exportCsv">CSV出力</OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- 検索パネル -->
    <div v-if="showFilters" class="o-card filter-card">
      <div class="filter-grid">
        <div class="filter-field">
          <label class="filter-label">完了日</label>
          <div style="display:flex;gap:4px;align-items:center;">
            <input v-model="filters.dateFrom" type="date" class="o-input o-input-sm" />
            <span>〜</span>
            <input v-model="filters.dateTo" type="date" class="o-input o-input-sm" />
          </div>
        </div>
        <div class="filter-field">
          <label class="filter-label">品番</label>
          <input v-model="filters.productSku" type="text" class="o-input o-input-sm" placeholder="部分一致..." />
        </div>
        <div class="filter-field">
          <label class="filter-label">商品名</label>
          <input v-model="filters.productName" type="text" class="o-input o-input-sm" placeholder="部分一致..." />
        </div>
        <div class="filter-field">
          <label class="filter-label">仕入先</label>
          <input v-model="filters.supplierName" type="text" class="o-input o-input-sm" placeholder="部分一致..." />
        </div>
        <div class="filter-field">
          <label class="filter-label">ロケーション</label>
          <input v-model="filters.locationCode" type="text" class="o-input o-input-sm" placeholder="部分一致..." />
        </div>
        <div class="filter-field">
          <label class="filter-label">在庫区分</label>
          <select v-model="filters.stockCategory" class="o-input o-input-sm">
            <option value="">全て</option>
            <option value="new">新品</option>
            <option value="damaged">仕損</option>
          </select>
        </div>
        <div class="filter-field">
          <label class="filter-label">注文番号</label>
          <input v-model="filters.orderReferenceNumber" type="text" class="o-input o-input-sm" placeholder="部分一致..." />
        </div>
        <div class="filter-field">
          <label class="filter-label">入荷予定数</label>
          <div style="display:flex;gap:4px;align-items:center;">
            <input v-model.number="filters.expectedQtyMin" type="number" min="0" class="o-input o-input-sm" style="width:70px;" placeholder="min" />
            <span>〜</span>
            <input v-model.number="filters.expectedQtyMax" type="number" min="0" class="o-input o-input-sm" style="width:70px;" placeholder="max" />
          </div>
        </div>
        <div class="filter-field">
          <label class="filter-label">入庫実績数</label>
          <div style="display:flex;gap:4px;align-items:center;">
            <input v-model.number="filters.receivedQtyMin" type="number" min="0" class="o-input o-input-sm" style="width:70px;" placeholder="min" />
            <span>〜</span>
            <input v-model.number="filters.receivedQtyMax" type="number" min="0" class="o-input o-input-sm" style="width:70px;" placeholder="max" />
          </div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:6px;">
        <OButton variant="primary" size="sm" @click="currentPage = 1; loadData()">検索</OButton>
        <OButton variant="secondary" size="sm" @click="resetFilters">リセット</OButton>
      </div>
    </div>

    <!-- CSV導出設定パネル -->
    <div v-if="showExportSettings" class="o-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 class="card-title" style="margin:0;">CSV導出設定</h3>
        <div style="display:flex;gap:6px;">
          <select v-model="selectedExportPreset" class="o-input o-input-sm" style="width:160px;" @change="loadExportPreset">
            <option value="">デフォルト</option>
            <option v-for="p in exportPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
          <OButton variant="secondary" size="sm" @click="saveExportPreset">保存</OButton>
          <OButton
            v-if="selectedExportPreset"
            variant="secondary" size="sm"
            style="border-color:#f56c6c;color:#f56c6c;"
            @click="deleteExportPreset"
          >削除</OButton>
        </div>
      </div>
      <div class="export-col-grid">
        <label
          v-for="col in allExportColumns"
          :key="col.key"
          class="export-col-item"
          :class="{ 'export-col-item--active': exportColumns.includes(col.key) }"
        >
          <input type="checkbox" :value="col.key" v-model="exportColumns" style="margin-right:4px;" />
          {{ col.label }}
        </label>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <OButton variant="secondary" size="sm" @click="selectAllExportCols">全選択</OButton>
        <OButton variant="secondary" size="sm" @click="exportColumns = []">全解除</OButton>
      </div>
    </div>

    <!-- 結果テーブル -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width:140px;">入庫指示番号</th>
            <th class="o-table-th" style="width:110px;">品番</th>
            <th class="o-table-th" style="width:150px;">商品名</th>
            <th class="o-table-th" style="width:90px;">ロケーション</th>
            <th class="o-table-th" style="width:60px;">区分</th>
            <th class="o-table-th o-table-th--right" style="width:70px;">予定数</th>
            <th class="o-table-th o-table-th--right" style="width:70px;">実績数</th>
            <th class="o-table-th" style="width:100px;">仕入先</th>
            <th class="o-table-th" style="width:100px;">注文番号</th>
            <th class="o-table-th" style="width:80px;">ロット</th>
            <th class="o-table-th" style="width:100px;">完了日時</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="11" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="11" class="o-table-empty">データがありません</td>
          </tr>
          <tr v-for="(row, idx) in rows" :key="idx" class="o-table-row">
            <td class="o-table-td"><span class="order-number">{{ row.orderNumber }}</span></td>
            <td class="o-table-td"><span class="sku-text">{{ row.productSku }}</span></td>
            <td class="o-table-td">{{ row.productName || '-' }}</td>
            <td class="o-table-td">
              <span v-if="row.putawayLocationCode" class="location-badge">{{ row.putawayLocationCode }}</span>
              <span v-else-if="row.locationCode" class="location-badge">{{ row.locationCode }}</span>
              <span v-else>-</span>
            </td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="row.stockCategory === 'damaged' ? 'o-status-tag--held' : 'o-status-tag--confirmed'">
                {{ row.stockCategory === 'damaged' ? '仕損' : '新品' }}
              </span>
            </td>
            <td class="o-table-td o-table-td--right">{{ row.expectedQuantity }}</td>
            <td class="o-table-td o-table-td--right">
              <strong>{{ row.receivedQuantity }}</strong>
            </td>
            <td class="o-table-td">{{ row.supplierName || '-' }}</td>
            <td class="o-table-td">{{ row.orderReferenceNumber || '-' }}</td>
            <td class="o-table-td">{{ row.lotNumber || '-' }}</td>
            <td class="o-table-td">{{ row.completedAt ? formatDateTime(row.completedAt) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} 件</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;" @change="currentPage = 1; loadData()">
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="200">200</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="currentPage--; loadData()">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++; loadData()">&rsaquo;</OButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { searchInboundHistory } from '@/api/inboundOrder'
import type { InboundHistoryLine } from '@/types/inventory'

const EXPORT_STORAGE_KEY = 'zelix_inbound_export_presets'

interface ExportColumn {
  key: string
  label: string
  getValue: (r: InboundHistoryLine) => string | number
}

interface ExportPreset {
  name: string
  columns: string[]
}

const allExportColumns: ExportColumn[] = [
  { key: 'orderNumber', label: '入庫指示番号', getValue: r => r.orderNumber },
  { key: 'productSku', label: '品番', getValue: r => r.productSku },
  { key: 'productName', label: '商品名', getValue: r => r.productName || '' },
  { key: 'locationCode', label: 'ロケーション', getValue: r => r.locationCode || '' },
  { key: 'putawayLocationCode', label: '棚入れ先', getValue: r => r.putawayLocationCode || '' },
  { key: 'stockCategory', label: '在庫区分', getValue: r => r.stockCategory === 'damaged' ? '仕損' : '新品' },
  { key: 'expectedQuantity', label: '入荷予定数', getValue: r => r.expectedQuantity },
  { key: 'receivedQuantity', label: '入庫実績数', getValue: r => r.receivedQuantity },
  { key: 'supplierName', label: '仕入先', getValue: r => r.supplierName || '' },
  { key: 'orderReferenceNumber', label: '注文番号', getValue: r => r.orderReferenceNumber || '' },
  { key: 'lotNumber', label: 'ロット', getValue: r => r.lotNumber || '' },
  { key: 'expiryDate', label: '賞味期限', getValue: r => r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('ja-JP') : '' },
  { key: 'completedAt', label: '完了日時', getValue: r => r.completedAt ? new Date(r.completedAt).toLocaleString('ja-JP') : '' },
  { key: 'expectedDate', label: '入庫予定日', getValue: r => r.expectedDate ? new Date(r.expectedDate).toLocaleDateString('ja-JP') : '' },
  { key: 'memo', label: 'メモ', getValue: r => r.memo || '' },
]

const defaultExportKeys = allExportColumns.map(c => c.key)

const toast = useToast()
const isLoading = ref(false)
const showFilters = ref(true)
const showExportSettings = ref(false)
const rows = ref<InboundHistoryLine[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const exportColumns = ref<string[]>([...defaultExportKeys])
const exportPresets = ref<ExportPreset[]>([])
const selectedExportPreset = ref('')

const now = new Date()
const filters = reactive({
  dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  dateTo: now.toISOString().slice(0, 10),
  productSku: '',
  productName: '',
  supplierName: '',
  locationCode: '',
  stockCategory: '',
  orderReferenceNumber: '',
  expectedQtyMin: undefined as number | undefined,
  expectedQtyMax: undefined as number | undefined,
  receivedQtyMin: undefined as number | undefined,
  receivedQtyMax: undefined as number | undefined,
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

const selectAllExportCols = () => {
  exportColumns.value = [...defaultExportKeys]
}

// --- Export preset management ---
const loadSavedExportPresets = () => {
  try {
    const raw = localStorage.getItem(EXPORT_STORAGE_KEY)
    exportPresets.value = raw ? JSON.parse(raw) : []
  } catch {
    exportPresets.value = []
  }
}

const persistExportPresets = () => {
  localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(exportPresets.value))
}

const loadExportPreset = () => {
  if (!selectedExportPreset.value) {
    exportColumns.value = [...defaultExportKeys]
    return
  }
  const preset = exportPresets.value.find(p => p.name === selectedExportPreset.value)
  if (preset) {
    exportColumns.value = [...preset.columns]
  }
}

const saveExportPreset = () => {
  const name = prompt('プリセット名を入力してください:')
  if (!name) return
  const existing = exportPresets.value.findIndex(p => p.name === name)
  const preset: ExportPreset = { name, columns: [...exportColumns.value] }
  if (existing >= 0) {
    exportPresets.value = exportPresets.value.map((p, i) => i === existing ? preset : p)
  } else {
    exportPresets.value = [...exportPresets.value, preset]
  }
  persistExportPresets()
  selectedExportPreset.value = name
  toast.showSuccess(`プリセット「${name}」を保存しました`)
}

const deleteExportPreset = () => {
  if (!selectedExportPreset.value) return
  if (!confirm(`プリセット「${selectedExportPreset.value}」を削除しますか？`)) return
  exportPresets.value = exportPresets.value.filter(p => p.name !== selectedExportPreset.value)
  persistExportPresets()
  selectedExportPreset.value = ''
  exportColumns.value = [...defaultExportKeys]
}

const resetFilters = () => {
  filters.dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  filters.dateTo = now.toISOString().slice(0, 10)
  filters.productSku = ''
  filters.productName = ''
  filters.supplierName = ''
  filters.locationCode = ''
  filters.stockCategory = ''
  filters.orderReferenceNumber = ''
  filters.expectedQtyMin = undefined
  filters.expectedQtyMax = undefined
  filters.receivedQtyMin = undefined
  filters.receivedQtyMax = undefined
  currentPage.value = 1
  loadData()
}

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await searchInboundHistory({
      ...filters,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rows.value = res.items
    total.value = res.total
  } catch (e: any) {
    toast.showError(e?.message || 'データの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const exportCsv = () => {
  if (rows.value.length === 0) {
    toast.showError('エクスポートするデータがありません')
    return
  }

  const activeCols = allExportColumns.filter(c => exportColumns.value.includes(c.key))
  if (activeCols.length === 0) {
    toast.showError('出力する列を1つ以上選択してください')
    return
  }

  const headers = activeCols.map(c => c.label)
  const csvRows = rows.value.map(r => activeCols.map(c => c.getValue(r)))

  const bom = '\uFEFF'
  const csv = bom + [headers.join(','), ...csvRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `入庫履歴_${filters.dateFrom}_${filters.dateTo}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadSavedExportPresets()
  loadData()
})
</script>

<style>
@import '@/styles/order-table.css';

.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
</style>

<style scoped>
.inbound-history {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0 0 12px 0;
}

.filter-card {
  background: var(--o-gray-50, #fafafa);
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
}

.export-col-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.export-col-item {
  display: flex;
  align-items: center;
  padding: 4px 10px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.export-col-item--active {
  background: #e8f5e9;
  border-color: #66bb6a;
  color: #2e7d32;
}

.order-number {
  font-family: monospace;
  font-weight: 600;
  color: var(--o-brand-primary, #D97756);
}

.sku-text {
  font-family: monospace;
  font-weight: 600;
}

.location-badge {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

</style>
