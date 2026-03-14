<template>
  <div class="client-settings">
    <ControlPanel title="顧客一覧（3PL荷主）" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="handleExportCsv">CSV出力</OButton>
        <OButton variant="primary" @click="openCreate">新規追加</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="clientSettingsSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="clients"
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
    <ODialog v-model="dialogOpen" :title="isEditing ? '顧客を編集' : '顧客を追加'" size="lg" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">顧客コード <span class="required">*</span></label>
          <input v-model="form.clientCode" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">顧客名 <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">顧客名2</label>
          <input v-model="form.name2" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">担当者名</label>
          <input v-model="form.contactName" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">郵便番号</label>
          <input v-model="form.postalCode" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">都道府県</label>
          <input v-model="form.prefecture" type="text" class="o-input" />
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
        <div class="form-field">
          <label class="form-label">契約プラン</label>
          <select v-model="form.plan" class="o-input">
            <option value="free">フリー</option>
            <option value="standard">スタンダード</option>
            <option value="pro">プロ</option>
            <option value="enterprise">エンタープライズ</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">課金有効</label>
          <label style="display:flex;align-items:center;gap:6px;">
            <input type="checkbox" v-model="form.billingEnabled" />
            課金を有効にする
          </label>
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
import { ref, computed, h, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
  exportClients,
  type Client,
} from '@/api/client'

const { show: showToast } = useToast()
const { t } = useI18n()

const planLabelMap: Record<string, string> = {
  free: 'フリー',
  standard: 'スタンダード',
  pro: 'プロ',
  enterprise: 'エンタープライズ',
}

const planLabel = (plan?: string) => {
  if (!plan) return '-'
  return planLabelMap[plan] || plan
}

// State
const clients = ref<Client[]>([])
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
  clientCode: '',
  name: '',
  name2: '',
  contactName: '',
  postalCode: '',
  prefecture: '',
  city: '',
  address: '',
  address2: '',
  phone: '',
  email: '',
  plan: 'free' as const,
  billingEnabled: false,
  memo: '',
})

const form = ref(emptyForm())

// Search / Table columns
const baseColumns: TableColumn[] = [
  {
    key: 'clientCode',
    dataKey: 'clientCode',
    title: '顧客コード',
    width: 130,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '顧客名',
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
    key: 'phone',
    dataKey: 'phone',
    title: '電話番号',
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'plan',
    dataKey: 'plan',
    title: '契約プラン',
    width: 120,
    fieldType: 'string',
  },
  {
    key: 'billingEnabled',
    dataKey: 'billingEnabled',
    title: '課金',
    width: 80,
    fieldType: 'boolean',
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
    if (col.key === 'isActive' || col.key === 'billingEnabled') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Client }) => {
          const val = (rowData as any)[col.dataKey || col.key]
          return h(
            'span',
            { class: val ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--cancelled' },
            val ? '有効' : '無効',
          )
        },
      }
    }
    if (col.key === 'plan') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Client }) => planLabel(rowData.plan),
      }
    }
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: Client }) => (rowData as any)[col.dataKey || col.key] || '-',
    }
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 140,
    cellRenderer: ({ rowData }: { rowData: Client }) =>
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
    const result = await fetchClients({
      search: currentSearchText.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
      isActive: showActiveOnly.value === true ? 'true' : showActiveOnly.value === false ? 'false' : undefined,
    })
    clients.value = result.data
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
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogOpen.value = true
}

const openEdit = (c: Client) => {
  editingId.value = c._id
  form.value = {
    clientCode: c.clientCode,
    name: c.name,
    name2: c.name2 || '',
    contactName: c.contactName || '',
    postalCode: c.postalCode || '',
    prefecture: c.prefecture || '',
    city: c.city || '',
    address: c.address || '',
    address2: c.address2 || '',
    phone: c.phone || '',
    email: c.email || '',
    plan: (c.plan || 'free') as 'free' | 'standard' | 'pro' | 'enterprise',
    billingEnabled: c.billingEnabled || false,
    memo: c.memo || '',
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.clientCode.trim()) {
    showToast('顧客コードは必須です', 'danger')
    return
  }
  if (!form.value.name.trim()) {
    showToast('顧客名は必須です', 'danger')
    return
  }

  try {
    if (editingId.value) {
      await updateClient(editingId.value, { ...form.value })
      showToast('更新しました', 'success')
    } else {
      await createClient({ ...form.value })
      showToast('作成しました', 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  }
}

const confirmDelete = (c: Client) => {
  if (!confirm(`「${c.name}」(${c.clientCode}) を削除しますか？`)) return
  deleteClient(c._id)
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
    const data = await exportClients()
    const headers = ['顧客コード', '顧客名', '顧客名2', '担当者名', '郵便番号', '都道府県', '市区町村', '住所', '住所2', '電話番号', 'メールアドレス', '契約プラン', '課金有効', '備考']
    const csvFields: (keyof Client)[] = ['clientCode', 'name', 'name2', 'contactName', 'postalCode', 'prefecture', 'city', 'address', 'address2', 'phone', 'email', 'plan', 'billingEnabled', 'memo']

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
    a.download = `顧客一覧_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSVをエクスポートしました', 'success')
  } catch (error: any) {
    showToast(error?.message || 'エクスポートに失敗しました', 'danger')
  }
}

onMounted(() => {
  loadList()
})
</script>

<style>
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>

<style scoped>
.client-settings {
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
