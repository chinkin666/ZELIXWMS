<template>
  <div class="client-settings">
    <PageHeader title="顧客一覧（3PL荷主）" :show-search="false">
      <template #actions>
        <Button variant="secondary" @click="handleExportCsv">CSV出力</Button>
        <Button variant="default" @click="openCreate">新規追加</Button>
      </template>
    </PageHeader>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="clients"
        row-key="_id"
        :search-columns="searchColumns"
        @search="handleSearch"
        pagination-enabled
        pagination-mode="server"
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @page-change="handlePageChange"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? '顧客を編集' : '顧客を追加' }}</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-field">
          <label>顧客コード <span class="text-destructive text-xs">*</span></label>
          <Input v-model="form.clientCode" type="text" />
        </div>
        <div class="form-field">
          <label>顧客名 <span class="text-destructive text-xs">*</span></label>
          <Input v-model="form.name" type="text" />
        </div>
        <div class="form-field">
          <label>顧客名2</label>
          <Input v-model="form.name2" type="text" />
        </div>
        <div class="form-field">
          <label>担当者名</label>
          <Input v-model="form.contactName" type="text" />
        </div>
        <div class="form-field">
          <label>郵便番号</label>
          <PostalCodeInput v-model="form.postalCode" @resolved="onPostalResolved" />
        </div>
        <div class="form-field">
          <label>都道府県</label>
          <Select v-model="form.prefecture">
        <SelectTrigger class="w-full">
          <SelectValue placeholder="選択してください" />
        </SelectTrigger>
        <SelectContent>
        <SelectItem v-for="p in PREFECTURES" :key="p" :value="p">{{ p }}</SelectItem>
        </SelectContent>
      </Select>
        </div>
        <div class="form-field">
          <label>市区町村</label>
          <Input v-model="form.city" type="text" />
        </div>
        <div class="form-field form-field--full">
          <label>住所</label>
          <Input v-model="form.address" type="text" />
        </div>
        <div class="form-field form-field--full">
          <label>住所2</label>
          <Input v-model="form.address2" type="text" />
        </div>
        <div class="form-field">
          <label>電話番号</label>
          <Input v-model="form.phone" type="text" />
        </div>
        <div class="form-field">
          <label>メールアドレス</label>
          <Input v-model="form.email" type="text" />
        </div>
        <div class="form-field">
          <label>契約プラン</label>
          <Select v-model="form.plan">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        <SelectItem value="free">フリー</SelectItem>
        <SelectItem value="standard">スタンダード</SelectItem>
        <SelectItem value="pro">プロ</SelectItem>
        <SelectItem value="enterprise">エンタープライズ</SelectItem>
        </SelectContent>
      </Select>
        </div>
        <div class="form-field">
          <label>課金有効</label>
          <label style="display:flex;align-items:center;gap:6px;">
            <Checkbox :checked="form.billingEnabled" @update:checked="val => form.billingEnabled = val" />
            課金を有効にする
          </label>
        </div>
        <div class="form-field form-field--full">
          <label>備考</label>
          <textarea v-model="form.memo" class="form-textarea" rows="3" />
        </div>
      </div>
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
import { ref, computed, h, onMounted } from 'vue'
import { Badge } from '@/components/ui/badge'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
  exportClients,
  type Client,
} from '@/api/client'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
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
  plan: 'free' as 'free' | 'standard' | 'pro' | 'enterprise',
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
    key: 'email',
    dataKey: 'email',
    title: 'メール',
    width: 180,
    fieldType: 'string',
  },
  {
    key: 'postalCode',
    dataKey: 'postalCode',
    title: '郵便番号',
    width: 110,
    fieldType: 'string',
  },
  {
    key: 'fullAddress',
    dataKey: 'fullAddress',
    title: '住所',
    width: 250,
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
            { class: val ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' : 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800' },
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
    if (col.key === 'fullAddress') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Client }) =>
          [rowData.prefecture, rowData.city, rowData.address].filter(Boolean).join('') || '-',
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
        h(Button, { variant: 'default', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(Button, { variant: 'destructive', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
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

const confirmDelete = async (c: Client) => {
  if (!(await confirm('この操作を実行しますか？'))) return
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
