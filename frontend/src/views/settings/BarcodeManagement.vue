<template>
  <div class="barcode-mgmt">
    <PageHeader title="バーコード管理" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <Button variant="secondary" size="sm" @click="showImportPanel = !showImportPanel">
            CSV取込
          </Button>
          <Button variant="secondary" size="sm" @click="exportCsv">
            CSVエクスポート
          </Button>
        </div>
      </template>
    </PageHeader>

    <!-- CSV Import Panel -->
    <div v-if="showImportPanel" class="import-panel">
      <div class="import-panel-header">
        <strong>バーコードCSV取込</strong>
        <span class="import-hint">CSVフォーマット: SKU, バーコード (1行に1つのSKU-バーコードペア)</span>
      </div>
      <div class="import-panel-body">
        <input ref="fileInputRef" type="file" accept=".csv,.txt" @change="handleFileSelect" />
        <div v-if="importPreview.length > 0" class="import-preview">
          <p>{{ importPreview.length }}件のバーコードを検出</p>
          <table style="margin-top:8px;">
            <thead>
              <tr>
                <th>SKU</th>
                <th>バーコード</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in importPreview.slice(0, 10)" :key="i">
                <td>{{ row.sku }}</td>
                <td>{{ row.barcode }}</td>
              </tr>
              <tr v-if="importPreview.length > 10">
                <td colspan="2" style="text-align:center;color:#909399;">
                  ... 他{{ importPreview.length - 10 }}件
                </td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:8px;display:flex;gap:6px;">
            <Select v-model="importMode">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="append">追加 (既存に追加)</SelectItem>
        <SelectItem value="replace">置換 (既存を上書き)</SelectItem>
        </SelectContent>
      </Select>
            <Button variant="default" size="sm" :disabled="importing" @click="executeImport">
              {{ importing ? '取込中...' : '取込実行' }}
            </Button>
            <Button variant="secondary" size="sm" @click="clearImport">キャンセル</Button>
          </div>
        </div>
      </div>
    </div>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="products"
        row-key="_id"
        :search-columns="searchColumns"
        @search="handleSearch"
        pagination-enabled
        pagination-mode="client"
        :page-size="25"
        :page-sizes="[10, 25, 50, 100]"
      />
    </div>

    <!-- Add Barcode Dialog -->
    <Dialog :open="addDialogVisible" @update:open="addDialogVisible = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>バーコード追加</DialogTitle></DialogHeader>
      <div class="dialog-form">
        <div class="form-field">
          <label>商品: {{ addTarget?.sku }} - {{ addTarget?.name }}</label>
        </div>
        <div class="form-field">
          <label>バーコード</label>
          <Input v-model="newBarcode" type="text" placeholder="バーコードを入力" @keyup.enter="handleAddBarcode" />
        </div>
        <div v-if="addedBarcodes.length > 0" class="form-field">
          <label>追加待ち</label>
          <div class="barcode-list">
            <span v-for="(bc, idx) in addedBarcodes" :key="idx" class="barcode-tag">
              {{ bc }}
              <Button class="barcode-tag-remove" @click="removeAddedBarcode(idx)">&times;</Button>
            </span>
          </div>
        </div>
        <Button variant="secondary" size="sm" @click="handleAddBarcode" :disabled="!newBarcode.trim()">
          + リストに追加
        </Button>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="addDialogVisible = false">キャンセル</Button>
        <Button variant="default" :disabled="addedBarcodes.length === 0 || saving" @click="saveAddedBarcodes">
          {{ saving ? '保存中...' : '保存' }}
        </Button>
      </DialogFooter>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import { fetchProducts, updateProduct } from '@/api/product'
import type { Product } from '@/types/product'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

const toast = useToast()
const { t } = useI18n()

const products = ref<Product[]>([])
const isLoading = ref(false)
const searchText = ref('')
const globalSearchText = ref('')
const showImportPanel = ref(false)

// ---------------------------------------------------------------------------
// Table columns
// ---------------------------------------------------------------------------
const baseColumns: TableColumn[] = [
  {
    key: 'sku',
    dataKey: 'sku',
    title: 'SKU',
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '商品名',
    width: 200,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'barcode',
    dataKey: 'barcode',
    title: 'バーコード一覧',
    width: 400,
    fieldType: 'array',
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  {
    ...baseColumns[0]!,
    cellRenderer: ({ rowData }: { rowData: Product }) =>
      h('strong', {}, rowData.sku),
  },
  {
    ...baseColumns[1]!,
    cellRenderer: ({ rowData }: { rowData: Product }) => rowData.name || '-',
  },
  {
    ...baseColumns[2]!,
    cellRenderer: ({ rowData }: { rowData: Product }) => {
      const barcodes = rowData.barcode || []
      if (barcodes.length === 0) {
        return h('span', { class: 'no-barcode' }, '未登録')
      }
      return h('div', { class: 'barcode-list' },
        barcodes.map((bc, idx) =>
          h('span', { class: 'barcode-tag', key: idx }, [
            bc,
            h('button', {
              class: 'barcode-tag-remove',
              title: '削除',
              onClick: () => removeBarcode(rowData, idx),
              innerHTML: '&times;',
            }),
          ]),
        ),
      )
    },
  },
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 120,
    cellRenderer: ({ rowData }: { rowData: Product }) =>
      h(Button, { variant: 'default', size: 'sm', onClick: () => openAddDialog(rowData) }, () => '追加'),
  },
]

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
  } else {
    globalSearchText.value = ''
  }
}

// Search is reactive via computed filteredProducts — used for CSV export
const filteredProducts = computed(() => {
  if (!searchText.value.trim() && !globalSearchText.value) return products.value
  const q = (searchText.value.trim() || globalSearchText.value).toLowerCase()
  return products.value.filter(p =>
    p.sku.toLowerCase().includes(q) ||
    p.name.toLowerCase().includes(q) ||
    (p.nameFull || '').toLowerCase().includes(q) ||
    (p.barcode || []).some(bc => bc.toLowerCase().includes(q))
  )
})

// Add barcode dialog
const addDialogVisible = ref(false)
const addTarget = ref<Product | null>(null)
const newBarcode = ref('')
const addedBarcodes = ref<string[]>([])
const saving = ref(false)

function openAddDialog(product: Product) {
  addTarget.value = product
  newBarcode.value = ''
  addedBarcodes.value = []
  addDialogVisible.value = true
}

function handleAddBarcode() {
  const bc = newBarcode.value.trim()
  if (!bc) return
  if (addedBarcodes.value.includes(bc)) {
    toast.showWarning('既に追加済みです')
    return
  }
  const existing = addTarget.value?.barcode || []
  if (existing.includes(bc)) {
    toast.showWarning('このバーコードは既に登録されています')
    return
  }
  addedBarcodes.value = [...addedBarcodes.value, bc]
  newBarcode.value = ''
}

function removeAddedBarcode(idx: number) {
  addedBarcodes.value = addedBarcodes.value.filter((_, i) => i !== idx)
}

async function saveAddedBarcodes() {
  if (!addTarget.value || addedBarcodes.value.length === 0) return
  saving.value = true
  try {
    const existing = addTarget.value.barcode || []
    const merged = [...existing, ...addedBarcodes.value]
    await updateProduct(addTarget.value._id, { barcode: merged } as any)
    toast.showSuccess(`${addedBarcodes.value.length}件のバーコードを追加しました`)
    addDialogVisible.value = false
    await loadData()
  } catch (e: any) {
    toast.showError(e.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

async function removeBarcode(product: Product, index: number) {
  const bc = (product.barcode || [])[index]
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    const updated = [...(product.barcode || [])]
    updated.splice(index, 1)
    await updateProduct(product._id, { barcode: updated } as any)
    toast.showSuccess('バーコードを削除しました')
    await loadData()
  } catch (e: any) {
    toast.showError(e.message || '削除に失敗しました')
  }
}

// CSV Import
const fileInputRef = ref<HTMLInputElement | null>(null)
const importPreview = ref<Array<{ sku: string; barcode: string }>>([])
const importMode = ref<'append' | 'replace'>('append')
const importing = ref(false)

function handleFileSelect(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = (e.target?.result as string || '').replace(/^\uFEFF/, '')
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    const parsed: Array<{ sku: string; barcode: string }> = []
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''))
      if (parts.length >= 2 && parts[0] && parts[1]) {
        // Skip header
        if (parts[0].toLowerCase() === 'sku' || parts[0] === 'SKU管理番号') continue
        parsed.push({ sku: parts[0], barcode: parts[1] })
      }
    }
    importPreview.value = parsed
  }
  reader.readAsText(file, 'UTF-8')
}

async function executeImport() {
  if (importPreview.value.length === 0) return
  importing.value = true
  let successCount = 0
  let failCount = 0
  try {
    // Group by SKU
    const grouped = new Map<string, string[]>()
    for (const row of importPreview.value) {
      const existing = grouped.get(row.sku) || []
      grouped.set(row.sku, [...existing, row.barcode])
    }

    for (const [sku, barcodes] of grouped) {
      const product = products.value.find(p => p.sku === sku)
      if (!product) {
        failCount += barcodes.length
        continue
      }
      try {
        let newBarcodes: string[]
        if (importMode.value === 'replace') {
          newBarcodes = [...new Set(barcodes)]
        } else {
          const existing = product.barcode || []
          newBarcodes = [...new Set([...existing, ...barcodes])]
        }
        await updateProduct(product._id, { barcode: newBarcodes } as any)
        successCount += barcodes.length
      } catch {
        failCount += barcodes.length
      }
    }

    toast.showSuccess(`取込完了: 成功${successCount}件${failCount > 0 ? `、失敗${failCount}件` : ''}`)
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

// CSV Export
function exportCsv() {
  const rows: string[] = ['SKU管理番号,バーコード']
  for (const p of filteredProducts.value) {
    for (const bc of (p.barcode || [])) {
      rows.push(`"${p.sku}","${bc}"`)
    }
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `barcodes_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Load
async function loadData() {
  isLoading.value = true
  try {
    products.value = await fetchProducts()
  } catch (e: any) {
    toast.showError('商品の取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.barcode-mgmt {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.barcode-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.barcode-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: #ecf5ff;
  color: #409eff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.barcode-tag-remove {
  background: none;
  border: none;
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  opacity: 0.6;
}
.barcode-tag-remove:hover {
  opacity: 1;
  color: #f56c6c;
}

.no-barcode {
  color: var(--o-gray-400, #c0c4cc);
  font-size: 12px;
}

.import-panel {
  margin-top: 8px;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
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

.import-hint {
  color: var(--o-gray-500, #909399);
  font-size: 12px;
}

.import-panel-body {
  padding: 14px;
}

.import-preview {
  margin-top: 10px;
  font-size: 13px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
}

.{
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
</style>
