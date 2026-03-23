<template>
  <div class="supplier-settings">
    <PageHeader title="仕入先一覧" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openCreate"><span>+</span> 新規追加</Button>
        <Button variant="default" @click="showCsvImport = true">CSV取込</Button>
        <Button variant="secondary" @click="handleCsvExport">CSV出力</Button>
      </template>
    </PageHeader>

    <!-- CSV Import Panel -->
    <div v-if="showCsvImport" class="import-panel">
      <div class="import-header">
        <h4>CSV取込</h4>
        <Button class="import-close-btn" @click="closeCsvImport">&times;</Button>
      </div>

      <div v-if="!csvPreviewData.length" class="import-upload">
        <p>CSVファイルを選択してください。</p>
        <p class="import-hint">列順: 仕入先コード, 仕入先名, 仕入先名2, 郵便番号, 住所1, 住所2, 住所3, 電話番号, メモ</p>
        <input ref="csvFileInput" type="file" accept=".csv" @change="handleCsvFileSelect" />
      </div>

      <div v-else class="import-preview">
        <p>{{ csvPreviewData.length }}件のデータを確認してください。</p>
        <div class="rounded-md border overflow-auto" style="max-height: 300px; overflow-y: auto">
          <table>
            <thead>
              <tr>
                <th>仕入先コード</th>
                <th>仕入先名</th>
                <th>仕入先名2</th>
                <th>郵便番号</th>
                <th>住所1</th>
                <th>電話番号</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in csvPreviewData.slice(0, 10)" :key="idx">
                <td>{{ row.supplierCode }}</td>
                <td>{{ row.name }}</td>
                <td>{{ row.name2 || '-' }}</td>
                <td>{{ row.postalCode || '-' }}</td>
                <td>{{ row.address1 || '-' }}</td>
                <td>{{ row.phone || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="csvPreviewData.length > 10" class="import-more-hint">
          ...他 {{ csvPreviewData.length - 10 }}件
        </div>
        <div class="import-actions">
          <Button variant="secondary" @click="resetCsvImport">やり直す</Button>
          <Button variant="default" :disabled="importing" @click="handleCsvImportConfirm">
            {{ importing ? '取込中...' : '取込実行' }}
          </Button>
        </div>
      </div>
    </div>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="list"
        row-key="_id"
        :search-columns="searchColumns"
        @search="handleSearch"
        pagination-enabled
        pagination-mode="server"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        :current-page="currentPage"
        @page-change="handlePageChangeEvent"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog :open="dialogVisible" @update:open="dialogVisible = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? '仕入先を編集' : '仕入先を追加' }}</DialogTitle></DialogHeader>
      
        <form class="supplier-form" @submit.prevent="handleSubmit">
          <div class="form-row">
            <label>仕入先コード <span class="text-destructive text-xs">*</span></label>
            <Input v-model="form.supplierCode" required :disabled="isEditing" />
          </div>
          <div class="form-row">
            <label>仕入先名 <span class="text-destructive text-xs">*</span></label>
            <Input v-model="form.name" required />
          </div>
          <div class="form-row">
            <label>仕入先名2</label>
            <Input v-model="form.name2" />
          </div>
          <div class="form-row">
            <label>郵便番号</label>
            <PostalCodeInput v-model="form.postalCode" @resolved="onPostalResolved" />
          </div>
          <div class="form-row">
            <label>住所1</label>
            <Input v-model="form.address1" placeholder="都道府県 市区町村" />
          </div>
          <div class="form-row">
            <label>住所2</label>
            <Input v-model="form.address2" />
          </div>
          <div class="form-row">
            <label>住所3</label>
            <Input v-model="form.address3" />
          </div>
          <div class="form-row">
            <label>電話番号</label>
            <Input v-model="form.phone" />
          </div>
          <div class="form-row">
            <label>メモ</label>
            <textarea v-model="form.memo" rows="3" />
          </div>
          <div class="form-actions">
            <Button variant="secondary" type="button" @click="closeDialog">キャンセル</Button>
            <Button variant="default" type="submit" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </Button>
          </div>
        </form>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PostalCodeInput from '@/components/form/PostalCodeInput.vue'
import type { PostalResult } from '@/utils/postalCode'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  bulkImportSuppliers,
  exportSuppliers,
} from '@/api/supplier'
import type { SupplierData } from '@/api/supplier'
import { computed, h, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
const { show: showToast } = useToast()
const { t } = useI18n()

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const list = ref<SupplierData[]>([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const globalSearchText = ref('')

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = () => ({
  supplierCode: '',
  name: '',
  name2: '',
  postalCode: '',
  address1: '',
  address2: '',
  address3: '',
  phone: '',
  memo: '',
})

const form = ref(emptyForm())

// CSV Import
const showCsvImport = ref(false)
const csvFileInput = ref<HTMLInputElement | null>(null)
const csvPreviewData = ref<Array<Partial<SupplierData>>>([])

// ---------------------------------------------------------------------------
// Search & Table columns
// ---------------------------------------------------------------------------
const baseColumns: TableColumn[] = [
  {
    key: 'supplierCode',
    dataKey: 'supplierCode',
    title: '仕入先コード',
    width: 120,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '仕入先名',
    width: 200,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'contactName',
    dataKey: 'contactName',
    title: '担当者名',
    width: 120,
    fieldType: 'string',
  },
  {
    key: 'contactEmail',
    dataKey: 'contactEmail',
    title: 'メール',
    width: 180,
    fieldType: 'string',
  },
  {
    key: 'postalCode',
    dataKey: 'postalCode',
    title: '郵便番号',
    width: 120,
    fieldType: 'string',
  },
  {
    key: 'address1',
    dataKey: 'address1',
    title: '住所1',
    width: 200,
    fieldType: 'string',
  },
  {
    key: 'phone',
    dataKey: 'phone',
    title: '電話番号',
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'isActive',
    dataKey: 'isActive',
    title: '有効',
    width: 80,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'isActive') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: SupplierData }) =>
          h(
            'span',
            { class: rowData.isActive ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--cancelled' },
            rowData.isActive ? '有効' : '無効',
          ),
      }
    }
    if (col.key === 'postalCode' || col.key === 'address1' || col.key === 'phone' || col.key === 'contactName' || col.key === 'contactEmail') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: SupplierData }) => (rowData as any)[col.dataKey || col.key] ?? '-',
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 160,
    cellRenderer: ({ rowData }: { rowData: SupplierData }) =>
      h('div', { class: 'action-cell' }, [
        h(Button, { variant: 'default', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(Button, { variant: 'destructive', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
const isEditing = computed(() => editingId.value !== null)

// ---------------------------------------------------------------------------
// Search handler
// ---------------------------------------------------------------------------
const currentSearchText = ref('')

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  // Build server-side search from field-level filters
  const parts: string[] = []
  if (payload.supplierCode?.value) parts.push(String(payload.supplierCode.value).trim())
  if (payload.name?.value) parts.push(String(payload.name.value).trim())
  if (payload.phone?.value) parts.push(String(payload.phone.value).trim())

  currentSearchText.value = parts.join(' ')
  currentPage.value = 1
  loadList()
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchSuppliers({
      search: currentSearchText.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    list.value = result.data
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
const handlePageChangeEvent = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadList()
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------
// 仕入先は address1=都道府県+市区町村、address2=町名番地、address3=建物
// 仕入先は address1=都道府県+市区町村、address2=町名番地、address3=建物
function onPostalResolved(result: PostalResult) {
  form.value.address1 = `${result.prefecture}${result.city}`
  const current = (form.value.address2 || '').trim()
  if (result.street) {
    if (!current) form.value.address2 = result.street
    else if (!current.startsWith(result.street)) form.value.address2 = result.street + current
  }
}

const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogVisible.value = true
}

const openEdit = (item: SupplierData) => {
  editingId.value = item._id
  form.value = {
    supplierCode: item.supplierCode,
    name: item.name,
    name2: item.name2 || '',
    postalCode: item.postalCode || '',
    address1: item.address1 || '',
    address2: item.address2 || '',
    address3: item.address3 || '',
    phone: item.phone || '',
    memo: item.memo || '',
  }
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
  editingId.value = null
  form.value = emptyForm()
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const payload = {
      supplierCode: form.value.supplierCode.trim(),
      name: form.value.name.trim(),
      name2: form.value.name2.trim() || undefined,
      postalCode: form.value.postalCode.trim() || undefined,
      address1: form.value.address1.trim() || undefined,
      address2: form.value.address2.trim() || undefined,
      address3: form.value.address3.trim() || undefined,
      phone: form.value.phone.trim() || undefined,
      memo: form.value.memo.trim() || undefined,
    }

    if (editingId.value) {
      await updateSupplier(editingId.value, payload)
      showToast('更新しました', 'success')
    } else {
      await createSupplier(payload)
      showToast('作成しました', 'success')
    }
    closeDialog()
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
const confirmDelete = async (item: SupplierData) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await deleteSupplier(item._id)
    showToast('無効にしました', 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '削除に失敗しました', 'danger')
  }
}

// ---------------------------------------------------------------------------
// CSV Import
// ---------------------------------------------------------------------------
const closeCsvImport = () => {
  showCsvImport.value = false
  resetCsvImport()
}

const resetCsvImport = () => {
  csvPreviewData.value = []
  if (csvFileInput.value) {
    csvFileInput.value.value = ''
  }
}

const handleCsvFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (!text) return
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length === 0) return

    // Detect if first line is header
    const firstLine = lines[0]
    const hasHeader = (firstLine ?? '').includes('仕入先コード') || (firstLine ?? '').toLowerCase().includes('suppliercode')
    const dataLines = hasHeader ? lines.slice(1) : lines

    const parsed: Array<Partial<SupplierData>> = dataLines.map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
      return {
        supplierCode: cols[0] || '',
        name: cols[1] || '',
        name2: cols[2] || '',
        postalCode: cols[3] || '',
        address1: cols[4] || '',
        address2: cols[5] || '',
        address3: cols[6] || '',
        phone: cols[7] || '',
        memo: cols[8] || '',
      }
    }).filter((row) => row.supplierCode && row.name)

    csvPreviewData.value = parsed
  }
  reader.readAsText(file, 'UTF-8')
}

const handleCsvImportConfirm = async () => {
  if (csvPreviewData.value.length === 0) return
  importing.value = true
  try {
    const result = await bulkImportSuppliers(csvPreviewData.value)
    showToast(result.message, result.failCount > 0 ? 'warning' : 'success')
    if (result.failCount > 0 && result.errors.length > 0) {
      const errorMessages = result.errors.slice(0, 5).map((e) => `行${e.row}: ${e.message}`).join('\n')
      showToast(`エラー詳細: ${errorMessages}`, 'danger')
    }
    closeCsvImport()
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '取込に失敗しました', 'danger')
  } finally {
    importing.value = false
  }
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------
const handleCsvExport = async () => {
  try {
    const suppliers = await exportSuppliers()
    const BOM = '\uFEFF'
    const header = '仕入先コード,仕入先名,仕入先名2,郵便番号,住所1,住所2,住所3,電話番号,メモ'
    const rows = suppliers.map((s) =>
      [
        s.supplierCode,
        s.name,
        s.name2 || '',
        s.postalCode || '',
        s.address1 || '',
        s.address2 || '',
        s.address3 || '',
        s.phone || '',
        s.memo || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    )
    const csv = BOM + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `suppliers_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSVをダウンロードしました', 'success')
  } catch (error: any) {
    showToast(error?.message || 'エクスポートに失敗しました', 'danger')
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>

<style scoped>
.supplier-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Import panel */
.import-panel {
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  padding: 16px;
  background: var(--o-gray-100, #f8f9fa);
}

.import-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.import-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.import-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--o-gray-500, #909399);
  line-height: 1;
}

.import-close-btn:hover {
  color: var(--o-gray-800, #303133);
}

.import-upload {
  padding: 20px 0;
}

.import-hint {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-bottom: 12px;
}

.import-preview p {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
}

.import-more-hint {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin-bottom: 8px;
}

.import-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

/* Form */
.supplier-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
}

.required {
  color: #f56c6c;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
