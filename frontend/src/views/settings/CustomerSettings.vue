<template>
  <div class="customer-settings">
    <ControlPanel title="得意先一覧" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="handleExportCsv">CSV出力</OButton>
        <OButton variant="success" @click="showImportPanel = !showImportPanel">CSV取込</OButton>
        <OButton variant="primary" @click="openCreate">新規追加</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="customerSettingsSearch"
      @search="handleSearch"
    />

    <!-- CSV Import Panel -->
    <div v-if="showImportPanel" class="import-panel">
      <div class="import-header">
        <h4>CSV取込</h4>
        <button class="import-close-btn" @click="closeImportPanel">&times;</button>
      </div>
      <div v-if="!importPreviewData.length" class="import-upload">
        <input ref="fileInputRef" type="file" accept=".csv,.tsv,.txt" @change="handleFileSelect" />
        <p class="import-hint">
          CSV形式: 得意先コード,名称,名称2,郵便番号,都道府県,市区町村,住所,住所2,電話,メール,備考
        </p>
      </div>
      <div v-else class="import-preview">
        <p>{{ importPreviewData.length }}件のデータをプレビュー中</p>
        <div class="o-table-wrapper" style="max-height: 300px; overflow-y: auto">
          <table class="o-table">
            <thead>
              <tr>
                <th class="o-table-th">得意先コード</th>
                <th class="o-table-th">名称</th>
                <th class="o-table-th">郵便番号</th>
                <th class="o-table-th">都道府県</th>
                <th class="o-table-th">電話</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in importPreviewData" :key="idx" class="o-table-row">
                <td class="o-table-td">{{ row.customerCode }}</td>
                <td class="o-table-td">{{ row.name }}</td>
                <td class="o-table-td">{{ row.postalCode }}</td>
                <td class="o-table-td">{{ row.prefecture }}</td>
                <td class="o-table-td">{{ row.phone }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="import-actions">
          <OButton variant="secondary" @click="cancelImport">キャンセル</OButton>
          <OButton variant="primary" :disabled="importing" @click="confirmImport">
            {{ importing ? '取込中...' : '取込実行' }}
          </OButton>
        </div>
      </div>
    </div>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="customers"
        :height="520"
        row-key="_id"
        pagination-enabled
        pagination-mode="server"
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :global-search-text="globalSearchText"
        @page-change="handlePageChange"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogOpen" :title="isEditing ? '得意先を編集' : '得意先を追加'" size="lg" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">得意先コード <span class="required-badge">必須</span></label>
          <input v-model="form.customerCode" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">名称 <span class="required-badge">必須</span></label>
          <input v-model="form.name" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">名称2</label>
          <input v-model="form.name2" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">郵便番号</label>
          <PostalCodeInput v-model="form.postalCode" @resolved="onPostalResolved" />
        </div>
        <div class="form-field">
          <label class="form-label">都道府県</label>
          <select class="o-input" v-model="form.prefecture">
            <option value="">選択してください</option>
            <option v-for="p in PREFECTURES" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">市区町村</label>
          <input v-model="form.city" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">住所</label>
          <input v-model="form.address" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">住所2</label>
          <input v-model="form.address2" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">電話番号</label>
          <input v-model="form.phone" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">メールアドレス</label>
          <input v-model="form.email" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">備考</label>
          <textarea v-model="form.memo" class="o-input form-textarea" rows="3" />
        </div>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import PostalCodeInput from '@/components/form/PostalCodeInput.vue'
import type { PostalResult } from '@/utils/postalCode'

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県',
  '岐阜県','静岡県','愛知県','三重県',
  '滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県',
  '鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県',
  '福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県',
] as const
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkImportCustomers,
  exportCustomers,
  type Customer,
} from '@/api/customer'

const { show: showToast } = useToast()
const { t } = useI18n()

// State
const customers = ref<Customer[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const globalSearchText = ref('')
const showActiveOnly = ref<boolean | undefined>(undefined)

// Dialog
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => !!editingId.value)

const emptyForm = () => ({
  customerCode: '',
  name: '',
  name2: '',
  postalCode: '',
  prefecture: '',
  city: '',
  address: '',
  address2: '',
  phone: '',
  email: '',
  memo: '',
})

const form = ref(emptyForm())

// Import
const showImportPanel = ref(false)
const importPreviewData = ref<Record<string, string>[]>([])
const importing = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// Search / Table columns
const baseColumns: TableColumn[] = [
  {
    key: 'customerCode',
    dataKey: 'customerCode',
    title: '得意先コード',
    width: 130,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '名称',
    width: 200,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'postalCode',
    dataKey: 'postalCode',
    title: '郵便番号',
    width: 110,
    fieldType: 'string',
  },
  {
    key: 'phone',
    dataKey: 'phone',
    title: '電話',
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'email',
    dataKey: 'email',
    title: 'メール',
    width: 200,
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
        cellRenderer: ({ rowData }: { rowData: Customer }) =>
          h(
            'span',
            { class: rowData.isActive ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--cancelled' },
            rowData.isActive ? '有効' : '無効',
          ),
      }
    }
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: Customer }) => (rowData as any)[col.dataKey || col.key] || '-',
    }
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 140,
    cellRenderer: ({ rowData }: { rowData: Customer }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(OButton, { variant: 'icon-danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

// Current search filters for server-side requests
const currentSearchText = ref('')

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchCustomers({
      search: currentSearchText.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
      isActive: showActiveOnly.value === true ? 'true' : showActiveOnly.value === false ? 'false' : undefined,
    })
    customers.value = result.data
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    currentSearchText.value = String(payload.__global.value).trim()
  } else {
    globalSearchText.value = ''
    currentSearchText.value = ''
  }

  // Extract field-specific filters
  if (typeof payload.isActive?.value === 'boolean') {
    showActiveOnly.value = payload.isActive.value
  } else {
    showActiveOnly.value = undefined
  }

  currentPage.value = 1
  loadList()
}

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadList()
}

// CRUD
function onPostalResolved(result: PostalResult) {
  form.value.prefecture = result.prefecture
  form.value.city = result.city
  const current = (form.value.address || '').trim()
  if (result.street) {
    if (!current) form.value.address = result.street
    else if (!current.startsWith(result.street)) form.value.address = result.street + current
  }
}

const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogOpen.value = true
}

const openEdit = (c: Customer) => {
  editingId.value = c._id
  form.value = {
    customerCode: c.customerCode,
    name: c.name,
    name2: c.name2 || '',
    postalCode: c.postalCode || '',
    prefecture: c.prefecture || '',
    city: c.city || '',
    address: c.address || '',
    address2: c.address2 || '',
    phone: c.phone || '',
    email: c.email || '',
    memo: c.memo || '',
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.customerCode.trim()) {
    showToast('得意先コードは必須です', 'danger')
    return
  }
  if (!form.value.name.trim()) {
    showToast('名称は必須です', 'danger')
    return
  }

  try {
    if (editingId.value) {
      await updateCustomer(editingId.value, { ...form.value })
      showToast('更新しました', 'success')
    } else {
      await createCustomer({ ...form.value })
      showToast('作成しました', 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  }
}

const confirmDelete = (c: Customer) => {
  if (!confirm(`「${c.name}」(${c.customerCode}) を削除しますか？`)) return
  deleteCustomer(c._id)
    .then(async () => {
      showToast('削除しました', 'success')
      await loadList()
    })
    .catch((err: any) => {
      showToast(err?.message || '削除に失敗しました', 'danger')
    })
}

// CSV Export
const handleExportCsv = async () => {
  try {
    const data = await exportCustomers()
    const headers = ['得意先コード', '名称', '名称2', '郵便番号', '都道府県', '市区町村', '住所', '住所2', '電話', 'メール', '備考']
    const csvFields: (keyof Customer)[] = ['customerCode', 'name', 'name2', 'postalCode', 'prefecture', 'city', 'address', 'address2', 'phone', 'email', 'memo']

    const rows = data.map((c) =>
      csvFields.map((f) => {
        const val = String(c[f] ?? '')
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val
      }).join(','),
    )

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `得意先一覧_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSVをエクスポートしました', 'success')
  } catch (error: any) {
    showToast(error?.message || 'エクスポートに失敗しました', 'danger')
  }
}

// CSV Import
const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target?.result as string
    if (!text) return
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim())
    if (lines.length < 2) {
      showToast('CSVファイルにデータがありません', 'danger')
      return
    }

    // Skip header line, parse data rows
    const parsed = lines.slice(1).map((line) => {
      const cols = parseCsvLine(line)
      return {
        customerCode: cols[0] || '',
        name: cols[1] || '',
        name2: cols[2] || '',
        postalCode: cols[3] || '',
        prefecture: cols[4] || '',
        city: cols[5] || '',
        address: cols[6] || '',
        address2: cols[7] || '',
        phone: cols[8] || '',
        email: cols[9] || '',
        memo: cols[10] || '',
      }
    })

    importPreviewData.value = parsed
  }
  reader.readAsText(file, 'UTF-8')
}

const parseCsvLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
  }
  result.push(current.trim())
  return result
}

const cancelImport = () => {
  importPreviewData.value = []
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

const closeImportPanel = () => {
  showImportPanel.value = false
  cancelImport()
}

const confirmImport = async () => {
  if (importPreviewData.value.length === 0) return
  importing.value = true
  try {
    const result = await bulkImportCustomers(importPreviewData.value)
    showToast(`${result.successCount}件取り込みました${result.failCount > 0 ? ` (${result.failCount}件失敗)` : ''}`, result.failCount > 0 ? 'warning' : 'success')
    if (result.failCount > 0 && result.errors.length > 0) {
      // インポートエラーはトーストで通知済み / Import errors shown via toast
    }
    cancelImport()
    showImportPanel.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '取り込みに失敗しました', 'danger')
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>

<style scoped>
.customer-settings {
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
  gap: 8px;
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
}

.import-close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--o-gray-500, #adb5bd);
}

.import-close-btn:hover {
  color: var(--o-gray-900, #212529);
}

.import-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--o-gray-500, #909399);
}

.import-preview p {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
}

.import-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.form-field--full {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--o-gray-700, #303133);
}

.required {
  color: #dc2626;
}

.form-textarea {
  resize: vertical;
}
</style>
