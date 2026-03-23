<template>
  <div class="inbound-history">
    <PageHeader :title="t('wms.inbound.history', '入庫履歴')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <Button variant="secondary" size="sm" @click="showExportSettings = !showExportSettings">
            {{ t('wms.inbound.csvSettings', 'CSV設定') }}
          </Button>
          <Button variant="secondary" size="sm" @click="exportCsv">{{ t('wms.inbound.csvExport', 'CSV出力') }}</Button>
        </div>
      </template>
    </PageHeader>

    <!-- 検索パネル -->
      :columns="searchColumns"
      :show-save="false"
      :initial-values="searchInitialValues"
      storage-key="inboundHistorySearch"
      @search="handleSearch"
    />

    <!-- CSV導出設定パネル -->
    <div v-if="showExportSettings" class="rounded-lg border bg-card p-4">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 class="card-title" style="margin:0;">{{ t('wms.inbound.csvExportSettings', 'CSV導出設定') }}</h3>
        <div style="display:flex;gap:6px;">
          <Select :model-value="selectedExportPreset || '__all__'" @update:model-value="(v: string) => { selectedExportPreset = v === '__all__' ? '' : v; loadExportPreset() }">
            <SelectTrigger class="h-8 text-sm" style="width:160px;"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{{ t('wms.common.default', 'デフォルト') }}</SelectItem>
              <SelectItem v-for="p in exportPresets" :key="p.name" :value="p.name">{{ p.name }}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" @click="saveExportPreset">{{ t('wms.common.save', '保存') }}</Button>
          <Button
            v-if="selectedExportPreset"
            variant="secondary" size="sm"
            style="border-color:var(--o-danger);color:var(--o-danger);"
            @click="deleteExportPreset"
          >{{ t('wms.common.delete', '削除') }}</Button>
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
        <Button variant="secondary" size="sm" @click="selectAllExportCols">{{ t('wms.inbound.selectAll', '全選択') }}</Button>
        <Button variant="secondary" size="sm" @click="exportColumns = []">{{ t('wms.inbound.deselectAll', '全解除') }}</Button>
      </div>
    </div>

    <!-- 結果テーブル -->
    <div class="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style="width:140px;">{{ t('wms.inbound.orderNumber', '入庫指示番号') }}</TableHead>
            <TableHead style="width:110px;">{{ t('wms.inbound.productSku', '品番') }}</TableHead>
            <TableHead style="width:150px;">{{ t('wms.product.productName', '商品名') }}</TableHead>
            <TableHead style="width:90px;">{{ t('wms.inbound.location', 'ロケーション') }}</TableHead>
            <TableHead style="width:60px;">{{ t('wms.inbound.stockCategory', '区分') }}</TableHead>
            <TableHead class="text-right" style="width:70px;">{{ t('wms.inbound.expectedQty', '予定数') }}</TableHead>
            <TableHead class="text-right" style="width:70px;">{{ t('wms.inbound.receivedQty', '実績数') }}</TableHead>
            <TableHead style="width:100px;">{{ t('wms.inbound.supplier', '仕入先') }}</TableHead>
            <TableHead style="width:100px;">{{ t('wms.inbound.orderReferenceNumber', '注文番号') }}</TableHead>
            <TableHead style="width:80px;">{{ t('wms.inbound.lot', 'ロット') }}</TableHead>
            <TableHead style="width:100px;">{{ t('wms.inbound.completedAt', '完了日時') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="11">
              <div class="space-y-3 p-4">
                <Skeleton class="h-4 w-[250px] mx-auto" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="rows.length === 0">
            <TableCell colspan="11" class="text-center py-8 text-muted-foreground">{{ t('wms.common.noData', 'データがありません') }}</TableCell>
          </TableRow>
          <TableRow v-for="(row, idx) in rows" :key="idx">
            <TableCell><span class="order-number">{{ row.orderNumber }}</span></TableCell>
            <TableCell><span class="sku-text">{{ row.productSku }}</span></TableCell>
            <TableCell>{{ row.productName || '-' }}</TableCell>
            <TableCell>
              <span v-if="row.putawayLocationCode" class="location-badge">{{ row.putawayLocationCode }}</span>
              <span v-else-if="row.locationCode" class="location-badge">{{ row.locationCode }}</span>
              <span v-else>-</span>
            </TableCell>
            <TableCell>
              <Badge variant="default">
                {{ row.stockCategory === 'damaged' ? t('wms.inbound.stockDamaged', '仕損') : t('wms.inbound.stockNew', '新品') }}
              </Badge>
            </TableCell>
            <TableCell class="text-right">{{ row.expectedQuantity }}</TableCell>
            <TableCell class="text-right">
              <strong>{{ row.receivedQuantity }}</strong>
            </TableCell>
            <TableCell>{{ row.supplierName || '-' }}</TableCell>
            <TableCell>{{ row.orderReferenceNumber || '-' }}</TableCell>
            <TableCell>{{ row.lotNumber || '-' }}</TableCell>
            <TableCell>{{ row.completedAt ? formatDateTime(row.completedAt) : '-' }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ total }} {{ t('wms.common.items', '件') }}</span>
      <div class="o-table-pagination__controls">
        <Select :model-value="String(pageSize)" @update:model-value="(v: string) => { pageSize = Number(v); currentPage = 1; loadData() }">
          <SelectTrigger class="h-8 text-sm" style="width:80px;"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="200">200</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" size="sm" :disabled="currentPage <= 1" @click="currentPage--; loadData()">&lsaquo;</Button>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <Button variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++; loadData()">&rsaquo;</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/shared/PageHeader.vue'
import { searchInboundHistory } from '@/api/inboundOrder'
import type { InboundHistoryLine } from '@/types/inventory'
import type { TableColumn, Operator } from '@/types/table'
import { computed, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
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

const toast = useToast()
const { t } = useI18n()
const { confirm } = useConfirmDialog()

const allExportColumns = computed<ExportColumn[]>(() => [
  { key: 'orderNumber', label: t('wms.inbound.orderNumber', '入庫指示番号'), getValue: r => r.orderNumber },
  { key: 'productSku', label: t('wms.inbound.productSku', '品番'), getValue: r => r.productSku },
  { key: 'productName', label: t('wms.product.productName', '商品名'), getValue: r => r.productName || '' },
  { key: 'locationCode', label: t('wms.inbound.location', 'ロケーション'), getValue: r => r.locationCode || '' },
  { key: 'putawayLocationCode', label: t('wms.inbound.putawayLocation', '棚入れ先'), getValue: r => r.putawayLocationCode || '' },
  { key: 'stockCategory', label: t('wms.inbound.stockCategory', '在庫区分'), getValue: r => r.stockCategory === 'damaged' ? t('wms.inbound.stockDamaged', '仕損') : t('wms.inbound.stockNew', '新品') },
  { key: 'expectedQuantity', label: t('wms.inbound.expectedQtyFull', '入荷予定数'), getValue: r => r.expectedQuantity },
  { key: 'receivedQuantity', label: t('wms.inbound.receivedQtyFull', '入庫実績数'), getValue: r => r.receivedQuantity },
  { key: 'supplierName', label: t('wms.inbound.supplier', '仕入先'), getValue: r => r.supplierName || '' },
  { key: 'orderReferenceNumber', label: t('wms.inbound.orderReferenceNumber', '注文番号'), getValue: r => r.orderReferenceNumber || '' },
  { key: 'lotNumber', label: t('wms.inbound.lot', 'ロット'), getValue: r => r.lotNumber || '' },
  { key: 'expiryDate', label: t('wms.inbound.expiryDate', '賞味期限'), getValue: r => r.expiryDate ? new Date(r.expiryDate).toLocaleDateString('ja-JP') : '' },
  { key: 'completedAt', label: t('wms.inbound.completedAt', '完了日時'), getValue: r => r.completedAt ? new Date(r.completedAt).toLocaleString('ja-JP') : '' },
  { key: 'expectedDate', label: t('wms.inbound.expectedDate', '入庫予定日'), getValue: r => r.expectedDate ? new Date(r.expectedDate).toLocaleDateString('ja-JP') : '' },
  { key: 'memo', label: t('wms.product.memo', 'メモ'), getValue: r => r.memo || '' },
])

const defaultExportKeys = ['orderNumber', 'productSku', 'productName', 'locationCode', 'putawayLocationCode', 'stockCategory', 'expectedQuantity', 'receivedQuantity', 'supplierName', 'orderReferenceNumber', 'lotNumber', 'expiryDate', 'completedAt', 'expectedDate', 'memo']
const isLoading = ref(false)
const showExportSettings = ref(false)
const rows = ref<InboundHistoryLine[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const exportColumns = ref<string[]>([...defaultExportKeys])
const exportPresets = ref<ExportPreset[]>([])
const selectedExportPreset = ref('')

const now = new Date()
const defaultDateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
const defaultDateTo = now.toISOString().slice(0, 10)

const searchColumns = computed<TableColumn[]>(() => ([
  {
    key: 'completedAt',
    title: t('wms.inbound.completedDate', '完了日'),
    searchable: true,
    searchType: 'daterange',
  },
  {
    key: 'productSku',
    title: t('wms.inbound.productSku', '品番'),
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'productName',
    title: t('wms.product.productName', '商品名'),
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'supplierName',
    title: t('wms.inbound.supplier', '仕入先'),
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'locationCode',
    title: t('wms.inbound.location', 'ロケーション'),
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'stockCategory',
    title: t('wms.inbound.stockCategory', '在庫区分'),
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.inbound.stockNew', '新品'), value: 'new' },
      { label: t('wms.inbound.stockDamaged', '仕損'), value: 'damaged' },
    ],
  },
  {
    key: 'orderReferenceNumber',
    title: t('wms.inbound.orderReferenceNumber', '注文番号'),
    searchable: true,
    searchType: 'string',
  },
] as TableColumn[]))

const searchInitialValues: Record<string, any> = {
  completedAt__from: defaultDateFrom,
  completedAt__to: defaultDateTo,
}

const filters = ref<Record<string, any>>({
  dateFrom: defaultDateFrom,
  dateTo: defaultDateTo,
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

const saveExportPreset = async () => {
  const name = window.prompt('入力してください')
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
  toast.showSuccess(t('wms.inbound.presetSaved', 'プリセットを保存しました'))
}

const deleteExportPreset = async () => {
  if (!selectedExportPreset.value) return
  if (!(await confirm('この操作を実行しますか？'))) return
  exportPresets.value = exportPresets.value.filter(p => p.name !== selectedExportPreset.value)
  persistExportPresets()
  selectedExportPreset.value = ''
  exportColumns.value = [...defaultExportKeys]
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  const nextFilters: Record<string, any> = {}

  // 完了日 (daterange)
  if (payload.completedAt) {
    const [from, to] = payload.completedAt.value as [string, string]
    if (from) nextFilters.dateFrom = from
    if (to) nextFilters.dateTo = to
  }

  // String fields (contains)
  const stringFields = ['productSku', 'productName', 'supplierName', 'locationCode', 'orderReferenceNumber']
  for (const key of stringFields) {
    if (payload[key]?.value) {
      nextFilters[key] = String(payload[key].value).trim()
    }
  }

  // Select field
  if (payload.stockCategory?.value) {
    nextFilters.stockCategory = payload.stockCategory.value
  }

  filters.value = nextFilters
  currentPage.value = 1
  loadData()
}

const loadData = async () => {
  isLoading.value = true
  try {
    const res = await searchInboundHistory({
      ...filters.value,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rows.value = res.items
    total.value = res.total
  } catch (e: any) {
    toast.showError(e?.message || t('wms.common.fetchError', 'データの取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

const exportCsv = () => {
  if (rows.value.length === 0) {
    toast.showError(t('wms.inbound.noExportData', 'エクスポートするデータがありません'))
    return
  }

  const activeCols = allExportColumns.value.filter(c => exportColumns.value.includes(c.key))
  if (activeCols.length === 0) {
    toast.showError(t('wms.inbound.selectAtLeastOneColumn', '出力する列を1つ以上選択してください'))
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
  a.download = `入庫履歴_${filters.value.dateFrom || ''}_${filters.value.dateTo || ''}.csv`
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
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
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
  background: var(--o-success-bg);
  border-color: var(--o-success);
  color: var(--o-success);
}

.order-number {
  font-family: monospace;
  font-weight: 600;
  color: var(--o-brand-primary, #0052A3);
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
