<template>
  <div class="warehouse-settings">
    <PageHeader title="倉庫一覧" :show-search="false">
      <template #actions>
        <Button variant="secondary" @click="handleExportCsv">CSV出力</Button>
        <Button variant="default" @click="openCreate">新規追加</Button>
      </template>
    </PageHeader>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="warehouses"
        row-key="_id"
        :search-columns="searchColumns"
        @search="handleSearch"
        pagination-enabled
        pagination-mode="server"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        :current-page="currentPage"
        @page-change="handlePageChangeEvent"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? '倉庫を編集' : '倉庫を追加' }}</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-field">
          <label>倉庫コード <span class="text-destructive text-xs">*</span></label>
          <Input v-model="form.code" type="text" />
        </div>
        <div class="form-field">
          <label>倉庫名 <span class="text-destructive text-xs">*</span></label>
          <Input v-model="form.name" type="text" />
        </div>
        <div class="form-field">
          <label>倉庫名2</label>
          <Input v-model="form.name2" type="text" />
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
          <label>営業時間</label>
          <Input v-model="form.operatingHours" type="text" />
        </div>
        <div class="form-field">
          <label>保管キャパシティ</label>
          <Input v-model.number="form.capacity" type="number" />
        </div>
        <div class="form-field">
          <label>表示順</label>
          <Input v-model.number="form.sortOrder" type="number" />
        </div>
        <div class="form-field form-field--full">
          <label>対応温度帯</label>
          <div style="display: flex; gap: 16px;">
            <label><input type="checkbox" value="0" v-model="form.coolTypes" /> 常温</label>
            <label><input type="checkbox" value="1" v-model="form.coolTypes" /> 冷蔵</label>
            <label><input type="checkbox" value="2" v-model="form.coolTypes" /> 冷凍</label>
          </div>
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
import { computed, h, onMounted, ref } from 'vue'
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
import {
  fetchWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  exportWarehouses,
  type Warehouse,
} from '@/api/warehouse'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
const { show: showToast } = useToast()
const { t } = useI18n()

const coolTypeLabels: Record<string, string> = {
  '0': '常温',
  '1': '冷蔵',
  '2': '冷凍',
}

const formatCoolTypes = (types?: string[]): string => {
  if (!types || types.length === 0) return '-'
  return types.map((t) => coolTypeLabels[t] || t).join(', ')
}

// State
const warehouses = ref<Warehouse[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const globalSearchText = ref('')
const currentSearchText = ref('')
const showActiveOnly = ref(true)

// Dialog
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => !!editingId.value)

const emptyForm = () => ({
  code: '',
  name: '',
  name2: '',
  postalCode: '',
  prefecture: '',
  city: '',
  address: '',
  address2: '',
  phone: '',
  coolTypes: [] as string[],
  capacity: 0,
  operatingHours: '',
  sortOrder: 0,
  memo: '',
})

const form = ref(emptyForm())

// ---------------------------------------------------------------------------
// Search & Table columns
// ---------------------------------------------------------------------------
const baseColumns: TableColumn[] = [
  {
    key: 'code',
    dataKey: 'code',
    title: '倉庫コード',
    width: 130,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '倉庫名',
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
    key: 'fullAddress',
    dataKey: 'fullAddress',
    title: '住所',
    width: 250,
    fieldType: 'string',
  },
  {
    key: 'operatingHours',
    dataKey: 'operatingHours',
    title: '営業時間',
    width: 120,
    fieldType: 'string',
  },
  {
    key: 'memo',
    dataKey: 'memo',
    title: 'メモ',
    width: 150,
    fieldType: 'string',
  },
  {
    key: 'phone',
    dataKey: 'phone',
    title: '電話番号',
    width: 140,
    fieldType: 'string',
  },
  {
    key: 'coolTypes',
    dataKey: 'coolTypes',
    title: '対応温度帯',
    width: 180,
    fieldType: 'string',
  },
  {
    key: 'capacity',
    dataKey: 'capacity',
    title: 'キャパシティ',
    width: 120,
    fieldType: 'number',
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
        cellRenderer: ({ rowData }: { rowData: Warehouse }) =>
          h(
            'span',
            { class: rowData.isActive ? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' : 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800' },
            rowData.isActive ? '有効' : '無効',
          ),
      }
    }
    if (col.key === 'coolTypes') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Warehouse }) => formatCoolTypes(rowData.coolTypes),
      }
    }
    if (col.key === 'fullAddress') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Warehouse }) =>
          [rowData.prefecture, rowData.city, rowData.address].filter(Boolean).join('') || '-',
      }
    }
    if (col.key === 'memo') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Warehouse }) =>
          (rowData.memo?.length ?? 0) > 30 ? rowData.memo!.substring(0, 30) + '...' : rowData.memo ?? '-',
      }
    }
    if (col.key === 'phone' || col.key === 'capacity' || col.key === 'postalCode' || col.key === 'operatingHours') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Warehouse }) => (rowData as any)[col.dataKey || col.key] ?? '-',
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 140,
    cellRenderer: ({ rowData }: { rowData: Warehouse }) =>
      h('div', { class: 'action-cell' }, [
        h(Button, { variant: 'default', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(Button, { variant: 'destructive', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

// ---------------------------------------------------------------------------
// Search handler
// ---------------------------------------------------------------------------
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  const parts: string[] = []
  if (payload.code?.value) parts.push(String(payload.code.value).trim())
  if (payload.name?.value) parts.push(String(payload.name.value).trim())

  if (typeof payload.isActive?.value === 'boolean') {
    showActiveOnly.value = payload.isActive.value
  } else {
    showActiveOnly.value = true
  }

  currentSearchText.value = parts.join(' ')
  currentPage.value = 1
  loadList()
}

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchWarehouses({
      search: currentSearchText.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
      isActive: showActiveOnly.value ? 'true' : undefined,
    })
    warehouses.value = result.data
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

const openEdit = (w: Warehouse) => {
  editingId.value = w._id
  form.value = {
    code: w.code,
    name: w.name,
    name2: w.name2 || '',
    postalCode: w.postalCode || '',
    prefecture: w.prefecture || '',
    city: w.city || '',
    address: w.address || '',
    address2: w.address2 || '',
    phone: w.phone || '',
    coolTypes: w.coolTypes ? [...w.coolTypes] : [],
    capacity: w.capacity ?? 0,
    operatingHours: w.operatingHours || '',
    sortOrder: w.sortOrder ?? 0,
    memo: w.memo || '',
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.code.trim()) {
    showToast('倉庫コードは必須です', 'danger')
    return
  }
  if (!form.value.name.trim()) {
    showToast('倉庫名は必須です', 'danger')
    return
  }

  try {
    if (editingId.value) {
      await updateWarehouse(editingId.value, { ...form.value })
      showToast('更新しました', 'success')
    } else {
      await createWarehouse({ ...form.value })
      showToast('作成しました', 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  }
}

const confirmDelete = async (w: Warehouse) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  deleteWarehouse(w._id)
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
    const data = await exportWarehouses()
    const headers = ['倉庫コード', '倉庫名', '倉庫名2', '郵便番号', '都道府県', '市区町村', '住所', '住所2', '電話番号', '対応温度帯', '保管キャパシティ', '営業時間', '表示順', '備考']
    const csvFields: (keyof Warehouse)[] = ['code', 'name', 'name2', 'postalCode', 'prefecture', 'city', 'address', 'address2', 'phone', 'coolTypes', 'capacity', 'operatingHours', 'sortOrder', 'memo']

    const rows = data.map((w) =>
      csvFields.map((f) => {
        const raw = w[f]
        const val = Array.isArray(raw) ? raw.map((t) => coolTypeLabels[t] || t).join('/') : String(raw ?? '')
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
    a.download = `倉庫一覧_${new Date().toISOString().slice(0, 10)}.csv`
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
.warehouse-settings {
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
