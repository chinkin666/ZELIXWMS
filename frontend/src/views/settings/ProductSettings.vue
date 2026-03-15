<template>
  <div class="product-settings">
    <ControlPanel :title="t('wms.product.title', '商品設定')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate"><span class="o-icon">+</span> {{ t('wms.product.addProduct', '商品を追加') }}</OButton>
        <OButton variant="success" @click="showImportDialog = true"><span class="o-icon">&#8593;</span> {{ t('wms.product.selectImportFile', '取り込みファイルを選択') }}</OButton>
        <OButton variant="secondary" @click="showExportPanel = !showExportPanel">{{ t('wms.product.csvSettings', 'CSV設定') }}</OButton>
        <OButton variant="secondary" @click="exportCsv">{{ t('wms.product.csvExport', 'CSV出力') }}</OButton>
      </template>
    </ControlPanel>

    <!-- CSV導出設定パネル -->
    <div v-if="showExportPanel" class="o-card export-panel">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 class="panel-title">{{ t('wms.product.csvExportSettings', '商品データCSV出力設定') }}</h3>
        <div style="display:flex;gap:6px;">
          <select v-model="selectedExportPreset" class="o-input o-input-sm" style="width:160px;" @change="loadExportPreset">
            <option value="">{{ t('wms.product.defaultAllItems', 'デフォルト（全項目）') }}</option>
            <option v-for="p in exportPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
          </select>
          <OButton variant="secondary" size="sm" @click="saveExportPreset">{{ t('wms.common.save', '保存') }}</OButton>
          <OButton v-if="selectedExportPreset" variant="secondary" size="sm" style="border-color:#f56c6c;color:#f56c6c;" @click="deleteExportPreset">{{ t('wms.common.delete', '削除') }}</OButton>
        </div>
      </div>
      <div class="export-col-grid">
        <label
          v-for="col in allExportColumns"
          :key="col.key"
          class="export-col-item"
          :class="{ 'export-col-item--active': exportColumnKeys.includes(col.key) }"
        >
          <input type="checkbox" :value="col.key" v-model="exportColumnKeys" style="margin-right:4px;" />
          {{ col.label }}
        </label>
      </div>
      <div style="margin-top:8px;display:flex;gap:6px;">
        <OButton variant="secondary" size="sm" @click="exportColumnKeys = allExportColumns.map(c => c.key)">{{ t('wms.product.selectAll', '全選択') }}</OButton>
        <OButton variant="secondary" size="sm" @click="exportColumnKeys = []">{{ t('wms.product.deselectAll', '全解除') }}</OButton>
      </div>
    </div>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="productSearch"
      @search="handleSearch"
    />

    <!-- 在庫クイックフィルター / 库存快速过滤器 -->
    <div class="stock-filter-bar">
      <span class="stock-filter-label">{{ t('wms.product.stockFilter', '在庫:') }}</span>
      <button
        class="stock-filter-btn"
        :class="{ 'stock-filter-btn--active': stockFilter === '' }"
        @click="stockFilter = ''"
      >{{ t('wms.product.stockAll', '全て') }}</button>
      <button
        class="stock-filter-btn stock-filter-btn--in"
        :class="{ 'stock-filter-btn--active': stockFilter === 'inStock' }"
        @click="stockFilter = 'inStock'"
      >{{ t('wms.product.stockInStock', '在庫あり') }}</button>
      <button
        class="stock-filter-btn stock-filter-btn--out"
        :class="{ 'stock-filter-btn--active': stockFilter === 'noStock' }"
        @click="stockFilter = 'noStock'"
      >{{ t('wms.product.stockNoStock', '在庫なし') }}</button>
    </div>

    <div v-if="selectedKeys.length > 0" class="o-list-toolbar o-toolbar-active">
      <span class="o-selected-count">{{ selectedKeys.length }}{{ t('wms.product.itemsSelected', '件選択中') }}</span>
      <OButton variant="secondary" size="sm" style="border-color:#f56c6c;color:#f56c6c;" :disabled="isBulkDeleting" @click="handleBulkDelete">
        {{ isBulkDeleting ? t('wms.product.deleting', '削除中...') : t('wms.product.bulkDelete', '一括削除') }}
      </OButton>
      <OButton variant="secondary" size="sm" :disabled="isBulkBarcode" @click="handleBulkBarcodeGenerate">
        {{ isBulkBarcode ? t('wms.product.generating', '生成中...') : t('wms.product.bulkBarcodeGenerate', 'バーコード一括生成') }}
      </OButton>
      <OButton variant="secondary" size="sm" @click="handleBulkLabelPrint">
        {{ t('wms.product.bulkLabelPrint', '一括ラベル印刷') }}
      </OButton>
      <OButton variant="secondary" size="sm" @click="selectedKeys = []">{{ t('wms.product.deselectItems', '選択解除') }}</OButton>
    </div>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="filteredList"
        row-key="_id"
        pagination-enabled
        pagination-mode="client"
        :page-size="25"
        :page-sizes="[10, 25, 50, 100]"
        :global-search-text="globalSearchText"
        row-selection-enabled
        v-model:selected-keys="selectedKeys"
      />
    </div>

    <ProductFormDialog
      v-model="dialogVisible"
      ref="productFormDialogRef"
      :title="isEditing ? t('wms.product.editProduct', '商品を編集') : t('wms.product.addProduct', '商品を追加')"
      :is-editing="isEditing"
      :initial-data="editingRow || { mailCalcEnabled: false }"
      :edit-dialog-sub-skus="editDialogSubSkus"
      :edit-dialog-sub-sku-validation-errors="editDialogSubSkuValidationErrors"
      @submit="handleDialogSubmitWithSubSkus"
      @add-sub-sku="addEditDialogSubSku"
      @remove-sub-sku="removeEditDialogSubSku"
      @validate-sub-sku="(index: number) => validateEditDialogSubSkuInput(index)"
    />

    <!-- Sub-SKU Management Dialog -->
    <SubSkuDialog
      :open="subSkuDialogVisible"
      :editing-product="subSkuEditingProduct"
      :sub-skus="tempSubSkus"
      :validation-errors="subSkuValidationErrors"
      :saving="savingSubSkus"
      @update:open="subSkuDialogVisible = $event"
      @add="addSubSku"
      @remove="removeSubSku"
      @validate="(index) => validateSubSkuInput(index)"
      @save="saveSubSkus"
    />

    <ImportDialog
      v-model="showImportDialog"
      :config-type="'product'"
      :passthrough="true"
      show-duplicate-strategy
      @import="handleImportProducts"
    />

    <ImportResultDialog v-model="importResultDialogVisible" :result="importResult" />

    <LabelPrintDialog
      v-model="labelPrintDialogVisible"
      :product="labelPrintProduct"
      :products="labelPrintProducts"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import ProductFormDialog from './product-settings/ProductFormDialog.vue'
import ImportDialog from '@/components/import/ImportDialog.vue'
import type { TableColumn, Operator } from '@/types/table'
import { bulkUpdateProducts, checkSkuAvailability, createProduct, deleteProduct, fetchProducts, importProductsWithStrategy, updateProduct, type ImportStrategy } from '@/api/product'
import { fetchStockSummary } from '@/api/inventory'
import type { StockSummary } from '@/types/inventory'
import type { Product, ProductFilters, UpsertProductDto, SubSku } from '@/types/product'
import ImportResultDialog, { type ImportResultData } from '@/components/import/ImportResultDialog.vue'
import SubSkuDialog from './product-settings/SubSkuDialog.vue'
import LabelPrintDialog from './product-settings/LabelPrintDialog.vue'
import { useSkuValidation } from './product-settings/useSkuValidation'
import { useProductColumns } from './product-settings/useProductColumns'

const toast = useToast()
const { t } = useI18n()

// --- CSV Export ---
const EXPORT_STORAGE_KEY = 'zelix_product_export_presets'

interface ExportColumn {
  key: string
  label: string
  getValue: (r: Product) => string | number
}

interface ExportPreset {
  name: string
  columns: string[]
}

const allExportColumns: ExportColumn[] = [
  { key: 'sku', label: t('wms.product.skuCode', 'SKU管理番号'), getValue: r => r.sku },
  { key: 'name', label: t('wms.product.printName', '印刷用商品名'), getValue: r => r.name },
  { key: 'nameFull', label: t('wms.product.productName', '商品名'), getValue: r => r.nameFull || '' },
  { key: 'barcode', label: t('wms.product.inspectionCode', '検品コード'), getValue: r => (r.barcode || []).join(' / ') },
  { key: 'category', label: t('wms.product.category', 'カテゴリー'), getValue: r => { const m: Record<string, string> = { '0': t('wms.product.catProduct', '商品'), '1': t('wms.product.catConsumable', '消耗品'), '2': t('wms.product.catWork', '作業'), '3': t('wms.product.catBonus', 'おまけ'), '4': t('wms.product.catMaterial', '部材') }; return m[r.category || '0'] || t('wms.product.catProduct', '商品') } },
  { key: 'coolType', label: t('wms.product.coolType', 'クール区分'), getValue: r => { const m: Record<string, string> = { '0': t('wms.product.coolNormal', '通常'), '1': t('wms.product.coolFrozen', 'クール冷凍'), '2': t('wms.product.coolChilled', 'クール冷蔵') }; return m[r.coolType || ''] || '' } },
  { key: 'mailCalcEnabled', label: t('wms.product.mailCalc', 'メール便計算'), getValue: r => r.mailCalcEnabled ? t('wms.product.enabled', 'する') : t('wms.product.disabled', 'しない') },
  { key: 'mailCalcMaxQuantity', label: t('wms.product.mailCalcMax', 'メール便最大数量'), getValue: r => r.mailCalcMaxQuantity ?? '' },
  { key: 'price', label: t('wms.product.price', '商品金額'), getValue: r => r.price ?? '' },
  { key: 'handlingTypes', label: t('wms.product.handlingTypes', '荷扱い'), getValue: r => (r.handlingTypes || []).join(' / ') },
  { key: 'memo', label: t('wms.product.memo', 'メモ'), getValue: r => r.memo || '' },
  { key: 'subSkus', label: t('wms.product.subSkus', '子SKU'), getValue: r => (r.subSkus || []).map(s => s.subSku).join(' / ') },
  { key: 'stockQuantity', label: t('wms.product.stockQuantity', '在庫数'), getValue: r => stockMap.value.get(r._id) ?? 0 },
  { key: 'customField1', label: t('wms.product.customField1', '独自1'), getValue: r => r.customField1 || '' },
  { key: 'customField2', label: t('wms.product.customField2', '独自2'), getValue: r => r.customField2 || '' },
  { key: 'customField3', label: t('wms.product.customField3', '独自3'), getValue: r => r.customField3 || '' },
  { key: 'customField4', label: t('wms.product.customField4', '独自4'), getValue: r => r.customField4 || '' },
  { key: 'width', label: t('wms.product.width', '幅(mm)'), getValue: r => r.width ?? '' },
  { key: 'depth', label: t('wms.product.depth', '奥行(mm)'), getValue: r => r.depth ?? '' },
  { key: 'height', label: t('wms.product.height', '高さ(mm)'), getValue: r => r.height ?? '' },
  { key: 'weight', label: t('wms.product.weight', '重量(g)'), getValue: r => r.weight ?? '' },
  { key: 'nameEn', label: t('wms.product.nameEn', '英語商品名'), getValue: r => r.nameEn || '' },
  { key: 'countryOfOrigin', label: t('wms.product.countryOfOrigin', '原産国'), getValue: r => r.countryOfOrigin || '' },
  { key: 'allocationRule', label: t('wms.product.allocationRule', '引当規則'), getValue: r => r.allocationRule || 'FIFO' },
  { key: 'serialTrackingEnabled', label: t('wms.product.serialTracking', 'シリアルNo管理'), getValue: r => r.serialTrackingEnabled ? t('wms.product.enabled', 'する') : t('wms.product.disabled', 'しない') },
  { key: 'inboundExpiryDays', label: t('wms.product.inboundExpiryDays', '入庫期限日数'), getValue: r => r.inboundExpiryDays ?? '' },
  { key: 'imageUrl', label: t('wms.product.imageUrl', '画像URL'), getValue: r => r.imageUrl || '' },
  { key: 'createdAt', label: t('wms.product.createdAt', '作成日時'), getValue: r => r.createdAt ? new Date(r.createdAt).toLocaleString('ja-JP') : '' },
  { key: 'updatedAt', label: t('wms.product.updatedAt', '更新日時'), getValue: r => r.updatedAt ? new Date(r.updatedAt).toLocaleString('ja-JP') : '' },
]

const showExportPanel = ref(false)
const exportColumnKeys = ref<string[]>(allExportColumns.map(c => c.key))
const exportPresets = ref<ExportPreset[]>([])
const selectedExportPreset = ref('')

const loadExportPresets = () => {
  try {
    const raw = localStorage.getItem(EXPORT_STORAGE_KEY)
    exportPresets.value = raw ? JSON.parse(raw) : []
  } catch { exportPresets.value = [] }
}
const persistExportPresets = () => {
  localStorage.setItem(EXPORT_STORAGE_KEY, JSON.stringify(exportPresets.value))
}
const loadExportPreset = () => {
  if (!selectedExportPreset.value) {
    exportColumnKeys.value = allExportColumns.map(c => c.key)
    return
  }
  const p = exportPresets.value.find(x => x.name === selectedExportPreset.value)
  if (p) exportColumnKeys.value = [...p.columns]
}
const saveExportPreset = () => {
  const name = prompt(t('wms.product.enterPresetName', 'プリセット名を入力してください:'))
  if (!name) return
  const preset: ExportPreset = { name, columns: [...exportColumnKeys.value] }
  const idx = exportPresets.value.findIndex(x => x.name === name)
  if (idx >= 0) {
    exportPresets.value = exportPresets.value.map((p, i) => i === idx ? preset : p)
  } else {
    exportPresets.value = [...exportPresets.value, preset]
  }
  persistExportPresets()
  selectedExportPreset.value = name
  toast.showSuccess(t('wms.product.presetSaved', `プリセット「${name}」を保存しました`))
}
const deleteExportPreset = () => {
  if (!selectedExportPreset.value) return
  if (!confirm(t('wms.product.confirmDeletePreset', `プリセット「${selectedExportPreset.value}」を削除しますか？`))) return
  exportPresets.value = exportPresets.value.filter(p => p.name !== selectedExportPreset.value)
  persistExportPresets()
  selectedExportPreset.value = ''
  exportColumnKeys.value = allExportColumns.map(c => c.key)
}
const exportCsv = () => {
  const data = filteredList.value
  if (data.length === 0) { toast.showError(t('wms.product.noDataToExport', 'エクスポートするデータがありません')); return }
  const activeCols = allExportColumns.filter(c => exportColumnKeys.value.includes(c.key))
  if (activeCols.length === 0) { toast.showError(t('wms.product.selectAtLeastOneColumn', '出力する列を1つ以上選択してください')); return }
  const headers = activeCols.map(c => c.label)
  const csvRows = data.map(r => activeCols.map(c => c.getValue(r)))
  const bom = '\uFEFF'
  const csv = bom + [headers.join(','), ...csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `商品マスター_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.showSuccess(t('wms.product.exportedCount', `${data.length}件をエクスポートしました`))
}

// --- Bulk delete ---
const isBulkDeleting = ref(false)
const handleBulkDelete = async () => {
  if (selectedKeys.value.length === 0) return
  if (!confirm(t('wms.product.confirmBulkDelete', `${selectedKeys.value.length}件の商品を削除しますか？この操作は取り消せません。`))) return
  isBulkDeleting.value = true
  let successCount = 0
  let failCount = 0
  for (const id of selectedKeys.value) {
    try {
      await deleteProduct(id)
      successCount++
    } catch {
      failCount++
    }
  }
  isBulkDeleting.value = false
  selectedKeys.value = []
  if (successCount > 0) toast.showSuccess(t('wms.product.deletedCount', `${successCount}件を削除しました`))
  if (failCount > 0) toast.showError(t('wms.product.deleteFailedCount', `${failCount}件の削除に失敗しました`))
  await loadList()
}

// --- Category ---
const CATEGORY_OPTIONS = [
  { label: t('wms.product.catProduct', '商品'), value: '0' },
  { label: t('wms.product.catConsumable', '消耗品'), value: '1' },
  { label: t('wms.product.catWork', '作業'), value: '2' },
  { label: t('wms.product.catBonus', 'おまけ'), value: '3' },
  { label: t('wms.product.catMaterial', '部材'), value: '4' },
]
const getCategoryLabel = (val?: string) => {
  const found = CATEGORY_OPTIONS.find(o => o.value === val)
  return found?.label || '商品'
}

// --- Barcode bulk generate ---
const isBulkBarcode = ref(false)
const handleBulkBarcodeGenerate = async () => {
  const targets = list.value.filter(r => selectedKeys.value.includes(r._id) && (!r.barcode || r.barcode.length === 0))
  if (targets.length === 0) {
    toast.showError(t('wms.product.noBarcodeTargets', '選択された商品にバーコード未設定の商品がありません'))
    return
  }
  if (!confirm(t('wms.product.confirmBulkBarcode', `${targets.length}件の商品にバーコードを自動生成しますか？\n（SKUコードをバーコードとして設定します）`))) return
  isBulkBarcode.value = true
  let successCount = 0
  let failCount = 0
  for (const p of targets) {
    try {
      await updateProduct(p._id, { barcode: [p.sku] })
      successCount++
    } catch {
      failCount++
    }
  }
  isBulkBarcode.value = false
  if (successCount > 0) toast.showSuccess(t('wms.product.barcodeSetCount', `${successCount}件にバーコードを設定しました`))
  if (failCount > 0) toast.showError(t('wms.product.barcodeSetFailed', `${failCount}件の設定に失敗しました`))
  await loadList()
}

const COOL_TYPE_OPTIONS = [
  { label: t('wms.product.coolNormal', '通常'), value: '0' },
  { label: t('wms.product.coolFrozen', 'クール冷凍'), value: '1' },
  { label: t('wms.product.coolChilled', 'クール冷蔵'), value: '2' },
]

const COOL_TYPE_COLORS: Record<string, string> = {
  '0': '#666',
  '1': '#1d4ed8',
  '2': '#0e7490',
}

const getCoolTypeLabel = (val?: string) => {
  const found = COOL_TYPE_OPTIONS.find((o) => o.value === val)
  return found?.label || '-'
}

const getCoolTypeColor = (val?: string) => COOL_TYPE_COLORS[val || ''] || '#666'

const formatBarcode = (bc: any) => {
  if (!Array.isArray(bc) || bc.length === 0) return '-'
  return bc.join(', ')
}

const list = ref<Product[]>([])
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const importResultDialogVisible = ref(false)
const importResult = ref<ImportResultData>({
  insertedCount: 0,
  updatedCount: 0,
  skippedCount: 0,
  skippedSkus: [],
  errors: [],
})
const dialogVisible = ref(false)
const showImportDialog = ref(false)
const editingRow = ref<Product | null>(null)
const globalSearchText = ref('')
const selectedKeys = ref<string[]>([])

// 在庫数マップ（productId → totalQuantity） / 库存数量映射
const stockMap = ref<Map<string, number>>(new Map())
// 在庫フィルター / 库存过滤器: '' = 全て, 'inStock' = 在庫あり, 'noStock' = 在庫なし
const stockFilter = ref<'' | 'inStock' | 'noStock'>('')
// (Pagination & sorting handled by Table component)

// Sub-SKU management (separate dialog)
const subSkuDialogVisible = ref(false)
const subSkuEditingProduct = ref<Product | null>(null)
const tempSubSkus = ref<SubSku[]>([])
const savingSubSkus = ref(false)

// Product form dialog ref
const productFormDialogRef = ref<InstanceType<typeof ProductFormDialog> | null>(null)

// ラベル印刷ダイアログ / 标签打印对话框
const labelPrintDialogVisible = ref(false)
const labelPrintProduct = ref<Product | null>(null)
const labelPrintProducts = ref<Product[]>([])

const openLabelPrint = (product: Product) => {
  labelPrintProduct.value = product
  labelPrintProducts.value = []
  labelPrintDialogVisible.value = true
}

/**
 * 一括ラベル印刷：選択された商品をまとめてラベル印刷ダイアログに渡す
 * 批量标签打印：将选中的商品传递给标签打印对话框
 */
const handleBulkLabelPrint = () => {
  if (selectedKeys.value.length === 0) return
  const selected = list.value.filter((r) => selectedKeys.value.includes(r._id))
  if (selected.length === 0) return
  labelPrintProduct.value = null
  labelPrintProducts.value = selected
  labelPrintDialogVisible.value = true
}

// Sub-SKU management (edit dialog inline)
const editDialogSubSkus = ref<SubSku[]>([])

// SKU validation (composable)
const {
  subSkuValidationErrors,
  editDialogSubSkuValidationErrors,
  validateDialogSubSku,
  validateEditDialogSubSku,
  validateMainSkuInput,
  resetDialogErrors,
  resetEditDialogErrors,
} = useSkuValidation()

const baseColumns: TableColumn[] = [
  {
    key: 'imageUrl',
    dataKey: 'imageUrl',
    title: t('wms.product.image', '画像'),
    width: 125,
    fieldType: 'string',
    searchable: false,
    formEditable: false,
    bulkEditDisabled: true,
  },
  {
    key: 'sku',
    dataKey: 'sku',
    title: t('wms.product.skuCode', 'SKU管理番号'),
    width: 160,
    fieldType: 'string',
    required: true,
    searchable: true,
    searchType: 'string',
    bulkEditDisabled: true,
  },
  {
    key: 'name',
    dataKey: 'name',
    title: t('wms.product.printName', '印刷用商品名'),
    width: 200,
    fieldType: 'string',
    required: true,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'nameFull',
    dataKey: 'nameFull',
    title: t('wms.product.productName', '商品名'),
    width: 220,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'barcode',
    dataKey: 'barcode',
    title: t('wms.product.inspectionCodeBarcode', '検品コード (バーコード)'),
    width: 220,
    fieldType: 'array',
    searchable: false,
    bulkEditDisabled: true,
  },
  {
    key: 'coolType',
    dataKey: 'coolType',
    title: t('wms.product.coolType', 'クール区分'),
    width: 140,
    fieldType: 'string',
    searchOptions: COOL_TYPE_OPTIONS,
    searchable: true,
    searchType: 'select',
  },
  {
    key: 'mailCalcEnabled',
    dataKey: 'mailCalcEnabled',
    title: t('wms.product.mailCalc', 'メール便計算'),
    width: 120,
    fieldType: 'boolean',
    required: true,
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'mailCalcMaxQuantity',
    dataKey: 'mailCalcMaxQuantity',
    title: t('wms.product.mailCalcMax', 'メール便最大数量'),
    width: 140,
    fieldType: 'number',
    required: false,
    searchable: false,
    min: 1,
    disabledWhen: (formData: Record<string, any>) => !formData.mailCalcEnabled,
    requiredWhen: (formData: Record<string, any>) => formData.mailCalcEnabled === true,
  },
  {
    key: 'price',
    dataKey: 'price',
    title: t('wms.product.price', '商品金額'),
    width: 120,
    fieldType: 'number',
    searchable: false,
  },
  {
    key: 'handlingTypes',
    dataKey: 'handlingTypes',
    title: t('wms.product.handlingTypes', '荷扱い'),
    width: 160,
    fieldType: 'array',
    searchable: false,
    bulkEditDisabled: true,
  },
  {
    key: 'memo',
    dataKey: 'memo',
    title: t('wms.product.memo', 'メモ'),
    width: 200,
    fieldType: 'string',
    searchable: false,
  },
  {
    key: 'subSkusCount',
    dataKey: 'subSkus',
    title: t('wms.product.subSkus', '子SKU'),
    width: 200,
    fieldType: 'string',
    searchable: false,
    formEditable: false,
    bulkEditDisabled: true,
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: t('wms.product.createdAt', '作成日時'),
    width: 180,
    fieldType: 'date',
    formEditable: false,
    bulkEditDisabled: true,
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

// テーブル列定義は useProductColumns に分離（後述で初期化）
// 表格列定义已分离到 useProductColumns（后方初始化）

// Filtered + sorted list
const filteredList = computed(() => {
  let rows = [...list.value]
  // Global search text filtering
  if (globalSearchText.value) {
    const q = globalSearchText.value.toLowerCase()
    rows = rows.filter((r) => {
      const searchable = [r.sku, r.name, r.nameFull, ...(r.barcode || [])].filter(Boolean).join(' ').toLowerCase()
      return searchable.includes(q)
    })
  }
  // 在庫フィルター / 库存过滤器
  if (stockFilter.value === 'inStock') {
    rows = rows.filter((r) => (stockMap.value.get(r._id) ?? 0) > 0)
  } else if (stockFilter.value === 'noStock') {
    rows = rows.filter((r) => (stockMap.value.get(r._id) ?? 0) <= 0)
  }
  return rows
})

const currentFilters = ref<ProductFilters>({})

const isEditing = computed(() => !!editingRow.value?._id)

const resetForm = () => {
  editingRow.value = null
}

const openCreate = () => {
  resetForm()
  editDialogSubSkus.value = []
  resetEditDialogErrors()
  resetDialogErrors()
  dialogVisible.value = true
}

const openEdit = (row: Product) => {
  editingRow.value = row
  editDialogSubSkus.value = (row.subSkus || []).map((s) => ({ ...s }))
  resetEditDialogErrors()
  resetDialogErrors()
  dialogVisible.value = true
}

const duplicateProduct = (row: Product) => {
  editingRow.value = {
    ...row,
    _id: '',
    sku: '',
    subSkus: [],
  } as Product
  editDialogSubSkus.value = []
  resetEditDialogErrors()
  resetDialogErrors()
  dialogVisible.value = true
}

// Sub-SKU management functions
const openSubSkuDialog = (row: Product) => {
  subSkuEditingProduct.value = row
  tempSubSkus.value = (row.subSkus || []).map((s) => ({ ...s }))
  resetDialogErrors()
  subSkuDialogVisible.value = true
}

const addSubSku = () => {
  tempSubSkus.value.push({
    subSku: '',
    price: undefined,
    description: '',
    isActive: true,
  })
}

const removeSubSku = (index: number) => {
  tempSubSkus.value.splice(index, 1)
}

const validateSubSkuInput = async (index: number) => {
  await validateDialogSubSku(
    index,
    tempSubSkus.value,
    subSkuEditingProduct.value?.sku,
    subSkuEditingProduct.value?._id,
  )
}

// Edit dialog inline sub-SKU functions
const addEditDialogSubSku = () => {
  editDialogSubSkus.value.push({
    subSku: '',
    price: undefined,
    description: '',
    isActive: true,
  })
}

const removeEditDialogSubSku = (index: number) => {
  editDialogSubSkus.value.splice(index, 1)
}

const validateEditDialogSubSkuInput = async (index: number) => {
  await validateEditDialogSubSku(
    index,
    editDialogSubSkus.value,
    editingRow.value?.sku,
    editingRow.value?._id,
  )
}

const saveSubSkus = async () => {
  if (!subSkuEditingProduct.value) return

  if (Object.keys(subSkuValidationErrors.value).length > 0) {
    toast.showWarning(t('wms.product.validationErrors', '入力エラーがあります。修正してください。'))
    return
  }

  const validSubSkus = tempSubSkus.value.filter((s) => s.subSku && s.subSku.trim())

  const codes = validSubSkus.map((s) => s.subSku.trim())
  const uniqueCodes = new Set(codes)
  if (uniqueCodes.size !== codes.length) {
    toast.showWarning(t('wms.product.duplicateSubSku', '子SKUコードが重複しています'))
    return
  }

  if (codes.includes(subSkuEditingProduct.value.sku)) {
    toast.showWarning(t('wms.product.subSkuSameAsParent', '子SKUコードは親SKUと同じにできません'))
    return
  }

  if (codes.length > 0) {
    const excludeId = subSkuEditingProduct.value._id
    const results = await checkSkuAvailability(codes, excludeId)
    const conflictErrors: string[] = []
    for (const code of codes) {
      if (results[code] && !results[code].available) {
        const conflict = results[code]
        if (conflict.conflictType === 'mainSku') {
          conflictErrors.push(t('wms.product.subSkuConflictMain', `子SKU「${code}」は既存商品のSKU「${conflict.conflictProductSku}」と重複しています`))
        } else {
          conflictErrors.push(t('wms.product.subSkuConflictSub', `子SKU「${code}」は商品「${conflict.conflictProductSku}」の子SKUと重複しています`))
        }
      }
    }
    if (conflictErrors.length > 0) {
      toast.showWarning(conflictErrors[0] ?? '')
      return
    }
  }

  savingSubSkus.value = true
  try {
    await updateProduct(subSkuEditingProduct.value._id, {
      subSkus: validSubSkus.map((s) => ({
        subSku: s.subSku.trim(),
        price: s.price,
        description: s.description?.trim() || undefined,
        isActive: s.isActive !== false,
      })),
    })
    toast.showSuccess(t('wms.product.subSkuSaved', '子SKUを保存しました'))
    subSkuDialogVisible.value = false
    await loadList()
  } catch (error: any) {
    toast.showError(error?.response?.data?.message || error?.message || t('wms.product.saveFailed', '保存に失敗しました'))
  } finally {
    savingSubSkus.value = false
  }
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  const nextFilters: ProductFilters = {}
  const pickString = (val: any) => (typeof val === 'string' && val.trim() ? val.trim() : undefined)
  const pickBoolean = (val: any): boolean | undefined => {
    if (val === true || val === 'true') return true
    if (val === false || val === 'false') return false
    return undefined
  }

  if (payload.sku?.value) nextFilters.sku = pickString(payload.sku.value)
  if (payload.name?.value) nextFilters.name = pickString(payload.name.value)
  if (payload.nameFull?.value) nextFilters.nameFull = pickString(payload.nameFull.value)
  if (payload.coolType?.value) nextFilters.coolType = payload.coolType.value as ProductFilters['coolType']
  if (payload.mailCalcEnabled?.value !== undefined) {
    nextFilters.mailCalcEnabled = pickBoolean(payload.mailCalcEnabled.value)
  }

  currentFilters.value = nextFilters
  loadList()
}

const loadList = async () => {
  loading.value = true
  try {
    list.value = await fetchProducts(currentFilters.value)
    // 在庫数を非同期で取得 / 非同步获取库存数量
    loadStockData()
  } catch (error: any) {
    toast.showError(error?.message || t('wms.product.fetchFailed', '取得に失敗しました'))
  } finally {
    loading.value = false
  }
}

/**
 * 在庫サマリーを取得して stockMap を更新する
 * 获取库存汇总并更新 stockMap
 */
const loadStockData = async () => {
  try {
    const summaries: StockSummary[] = await fetchStockSummary()
    const newMap = new Map<string, number>()
    for (const s of summaries) {
      newMap.set(s.productId, s.totalQuantity)
    }
    stockMap.value = newMap
  } catch {
    // 在庫取得失敗は致命的ではない、無視する / 库存获取失败非致命，忽略
  }
}

const normalizeBarcodeInput = (val: any): string[] => {
  if (val === undefined || val === null) return []
  if (Array.isArray(val)) {
    return val
      .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
      .filter((v) => v.length > 0)
  }
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return []
    return s
      .split(/\n+/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
  }
  return [String(val).trim()].filter((x) => x.length > 0)
}

const normalizeArrayInput = (val: any): string[] => {
  if (val === undefined || val === null) return []
  if (Array.isArray(val)) {
    return val
      .map((v) => (v === undefined || v === null ? '' : String(v).trim()))
      .filter((v) => v.length > 0)
  }
  if (typeof val === 'string') {
    const s = val.trim()
    if (!s) return []
    return s
      .split(/\n+/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
  }
  return [String(val).trim()].filter((x) => x.length > 0)
}

const handleDialogSubmitWithSubSkus = async (payload: Record<string, any>, imageUrl: string) => {
  if (Object.keys(editDialogSubSkuValidationErrors.value).length > 0) {
    toast.showWarning(t('wms.product.subSkuValidationErrors', '子SKUに入力エラーがあります。修正してください。'))
    return
  }

  saving.value = true
  if (productFormDialogRef.value) productFormDialogRef.value.submitting = true
  try {
    const normalizeMailCalcEnabled = (val: any): boolean => {
      if (val === true || val === 'true' || val === '1' || val === 'する') return true
      return false
    }

    const normalizeMailCalcMaxQuantity = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined
      const n = typeof val === 'number' ? val : Number(String(val).trim())
      if (!Number.isFinite(n)) return undefined
      const i = Math.trunc(n)
      return i > 0 ? i : undefined
    }

    const normalizeOptionalNumber = (val: any): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined
      const n = typeof val === 'number' ? val : Number(String(val).trim())
      return Number.isFinite(n) ? n : undefined
    }

    const validSubSkus = editDialogSubSkus.value.filter((s) => s.subSku && s.subSku.trim())
    const subSkuCodes = validSubSkus.map((s) => s.subSku.trim())
    const uniqueSubSkuCodes = new Set(subSkuCodes)
    if (uniqueSubSkuCodes.size !== subSkuCodes.length) {
      toast.showWarning(t('wms.product.duplicateSubSku', '子SKUコードが重複しています'))
      saving.value = false
      return
    }
    const parentSku = (payload.sku || '').trim()
    if (subSkuCodes.includes(parentSku)) {
      toast.showWarning(t('wms.product.subSkuSameAsParent', '子SKUコードは親SKUと同じにできません'))
      saving.value = false
      return
    }

    const mainSkuError = await validateMainSkuInput(parentSku, editingRow.value?._id)
    if (mainSkuError) {
      toast.showWarning(mainSkuError)
      saving.value = false
      return
    }

    if (subSkuCodes.length > 0) {
      const excludeId = editingRow.value?._id
      const results = await checkSkuAvailability(subSkuCodes, excludeId)
      const conflictErrors: string[] = []
      for (const code of subSkuCodes) {
        if (results[code] && !results[code].available) {
          const conflict = results[code]
          if (conflict.conflictType === 'mainSku') {
            conflictErrors.push(t('wms.product.subSkuConflictMain', `子SKU「${code}」は既存商品のSKU「${conflict.conflictProductSku}」と重複しています`))
          } else {
            conflictErrors.push(t('wms.product.subSkuConflictSub', `子SKU「${code}」は商品「${conflict.conflictProductSku}」の子SKUと重複しています`))
          }
        }
      }
      if (conflictErrors.length > 0) {
        toast.showWarning(conflictErrors[0] ?? '')
        saving.value = false
        return
      }
    }

    const mailCalcEnabledValue = normalizeMailCalcEnabled(payload.mailCalcEnabled)
    const mailCalcMaxQuantityValue = mailCalcEnabledValue
      ? normalizeMailCalcMaxQuantity(payload.mailCalcMaxQuantity)
      : undefined

    const cleanPayload: Record<string, any> = {
      sku: parentSku,
      name: (payload.name || '').trim(),
      nameFull: payload.nameFull ? String(payload.nameFull).trim() : undefined,
      barcode: normalizeBarcodeInput(payload.barcode),
      coolType: payload.coolType || undefined,
      mailCalcEnabled: mailCalcEnabledValue,
      mailCalcMaxQuantity: mailCalcMaxQuantityValue,
      memo: payload.memo ? String(payload.memo).trim() : undefined,
      price: normalizeOptionalNumber(payload.price),
      handlingTypes: normalizeArrayInput(payload.handlingTypes),
      imageUrl: imageUrl || undefined,
      inventoryEnabled: payload.inventoryEnabled === true || payload.inventoryEnabled === 'true',
      category: payload.category || undefined,
      customField1: payload.customField1 ? String(payload.customField1).trim() : undefined,
      customField2: payload.customField2 ? String(payload.customField2).trim() : undefined,
      customField3: payload.customField3 ? String(payload.customField3).trim() : undefined,
      customField4: payload.customField4 ? String(payload.customField4).trim() : undefined,
      width: normalizeOptionalNumber(payload.width),
      depth: normalizeOptionalNumber(payload.depth),
      height: normalizeOptionalNumber(payload.height),
      weight: normalizeOptionalNumber(payload.weight),
      nameEn: payload.nameEn ? String(payload.nameEn).trim() : undefined,
      countryOfOrigin: payload.countryOfOrigin ? String(payload.countryOfOrigin).trim() : undefined,
      allocationRule: payload.allocationRule || 'FIFO',
      serialTrackingEnabled: payload.serialTrackingEnabled === true || payload.serialTrackingEnabled === 'true',
      inboundExpiryDays: normalizeOptionalNumber(payload.inboundExpiryDays),
      subSkus: validSubSkus.map((s) => ({
        subSku: s.subSku.trim(),
        price: s.price,
        description: s.description?.trim() || undefined,
        isActive: s.isActive !== false,
      })),
    }

    if (editingRow.value?._id) {
      await updateProduct(editingRow.value._id, cleanPayload)
      toast.showSuccess(t('wms.product.updated', '更新しました'))
    } else {
      await createProduct(cleanPayload as UpsertProductDto)
      toast.showSuccess(t('wms.product.created', '作成しました'))
    }
    dialogVisible.value = false
    resetForm()
    await loadList()
  } catch (error: any) {
    toast.showError(error?.response?.data?.message || error?.message || t('wms.product.saveFailed', '保存に失敗しました'))
  } finally {
    saving.value = false
    if (productFormDialogRef.value) productFormDialogRef.value.submitting = false
  }
}

const handleImportProducts = async (rows: any[], strategy: ImportStrategy = 'error') => {
  if (!rows || !Array.isArray(rows)) return
  importing.value = true
  importResult.value = {
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    skippedSkus: [],
    errors: [],
  }
  importResultDialogVisible.value = false

  try {
    const result = await importProductsWithStrategy(rows, strategy)

    importResult.value = {
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      skippedSkus: result.skippedSkus || [],
      errors: [],
    }

    const messages: string[] = []
    if (result.insertedCount > 0) messages.push(t('wms.product.importInserted', `${result.insertedCount}件登録`))
    if (result.updatedCount > 0) messages.push(t('wms.product.importUpdated', `${result.updatedCount}件更新`))
    if (result.skippedCount > 0) messages.push(t('wms.product.importSkipped', `${result.skippedCount}件スキップ`))

    if (messages.length > 0) {
      toast.showSuccess(messages.join('、') + t('wms.product.importDone', 'しました'))
    }

    if (result.skippedCount > 0 || result.updatedCount > 0) {
      importResultDialogVisible.value = true
    }

    await loadList()
    showImportDialog.value = false
  } catch (err: any) {
    const errors = err?.errors || []
    if (Array.isArray(errors) && errors.length > 0) {
      importResult.value = {
        insertedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        skippedSkus: [],
        errors,
      }
      importResultDialogVisible.value = true
    } else {
      toast.showError(err?.message || t('wms.product.importFailed', '取り込みに失敗しました'))
    }
  } finally {
    importing.value = false
  }
}

const confirmDelete = (row: Product) => {
  if (confirm(t('wms.product.confirmDelete', `「${row.name}」を削除しますか？`))) {
    deleteProduct(row._id)
      .then(async () => {
        toast.showSuccess(t('wms.product.deleted', '削除しました'))
        await loadList()
      })
      .catch(() => {})
  }
}

const formatDate = (iso: string) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// テーブル列定義（全ての依存関数が定義された後に初期化）
// 表格列定义（在所有依赖函数定义之后初始化）
const { tableColumns } = useProductColumns({
  stockMap,
  handlers: { openEdit, openSubSkuDialog, openLabelPrint, duplicateProduct, confirmDelete },
  helpers: { t, formatBarcode, getCategoryLabel, getCoolTypeLabel, getCoolTypeColor, formatDate },
})

onMounted(() => {
  loadExportPresets()
  loadList()
})
</script>

<style scoped>
.product-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.search-section {
  margin-bottom: 12px;
}

.table-section {
  width: 100%;
}

.product-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  object-position: center;
  border-radius: 4px;
  border: 1px solid var(--o-border-color, #e0e0e0);
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.export-panel {
  background: var(--o-gray-50, #fafafa);
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0;
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

.category-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
}
.cat-0 { background: #e8f5e9; color: #2e7d32; }
.cat-1 { background: #fff3e0; color: #e65100; }
.cat-2 { background: #e3f2fd; color: #1565c0; }
.cat-3 { background: #fce4ec; color: #c62828; }
.cat-4 { background: #f3e5f5; color: #6a1b9a; }

/* 在庫クイックフィルター / 库存快速过滤器 */
.stock-filter-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.stock-filter-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
  margin-right: 4px;
}
.stock-filter-btn {
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: 4px;
  background: var(--o-view-background, #fff);
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  transition: all 0.15s;
}
.stock-filter-btn:hover {
  border-color: var(--o-primary, #714b67);
  color: var(--o-primary, #714b67);
}
.stock-filter-btn--active {
  background: var(--o-primary, #714b67);
  border-color: var(--o-primary, #714b67);
  color: #fff;
}
.stock-filter-btn--active:hover {
  color: #fff;
}
</style>
