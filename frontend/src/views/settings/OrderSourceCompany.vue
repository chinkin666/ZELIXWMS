<template>
  <div class="order-source-company">
    <ControlPanel title="ご依頼主設定" :show-search="false">
      <template #actions>
        <OButton variant="success" @click="showImportDialog = true">取り込みファイルを選択</OButton>
        <OButton variant="primary" @click="openCreate">新規追加</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="orderSourceCompanySearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="list"
        :height="520"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="10"
        :page-sizes="[10, 20, 50]"
        :global-search-text="globalSearchText"
      />
    </div>

    <FormDialog
      v-model="dialogVisible"
      :title="isEditing ? 'ご依頼主を編集' : 'ご依頼主を追加'"
      :columns="formColumns"
      :initial-data="editingRow || {}"
      width="520px"
      @submit="handleDialogSubmit"
    />

    <ImportDialog v-model="showImportDialog" :config-type="'order-source-company'" :passthrough="true" @import="handleImportCompanies" />
    <InputErrorDialog v-model="importErrorDialogVisible" :errors="importErrors" />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import FormDialog from '@/components/form/FormDialog.vue'
import ImportDialog from '@/components/import/ImportDialog.vue'
import InputErrorDialog, { type InputRowError } from '@/components/input/InputErrorDialog.vue'
import type { TableColumn, Operator } from '@/types/table'
import {
  createOrderSourceCompany,
  deleteOrderSourceCompany,
  fetchOrderSourceCompanies,
  importOrderSourceCompaniesBulk,
  updateOrderSourceCompany,
  validateOrderSourceCompanyImport,
} from '@/api/orderSourceCompany'
import type { OrderSourceCompany, OrderSourceCompanyFilters } from '@/types/orderSourceCompany'

const { show: showToast } = useToast()

const list = ref<OrderSourceCompany[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingRow = ref<OrderSourceCompany | null>(null)
const showImportDialog = ref(false)
const importing = ref(false)
const importErrorDialogVisible = ref(false)
const importErrors = ref<InputRowError[]>([])
const globalSearchText = ref('')

const baseColumns: TableColumn[] = [
  {
    key: 'senderName',
    dataKey: 'senderName',
    title: '名',
    width: 180,
    fieldType: 'string',
    required: true,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'senderPostalCode',
    dataKey: 'senderPostalCode',
    title: '郵便番号',
    width: 140,
    fieldType: 'string',
    required: true,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'senderAddressPrefecture',
    dataKey: 'senderAddressPrefecture',
    title: '都道府県',
    width: 120,
    fieldType: 'string',
    required: false,
    searchable: false,
  },
  {
    key: 'senderAddressCity',
    dataKey: 'senderAddressCity',
    title: '郡市区',
    width: 160,
    fieldType: 'string',
    required: false,
    searchable: false,
  },
  {
    key: 'senderAddressStreet',
    dataKey: 'senderAddressStreet',
    title: 'それ以降の住所',
    width: 220,
    fieldType: 'string',
    required: false,
    searchable: false,
  },
  {
    key: 'senderPhone',
    dataKey: 'senderPhone',
    title: '電話',
    width: 160,
    fieldType: 'string',
    required: true,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'hatsuBaseNo1',
    dataKey: 'hatsuBaseNo1',
    title: '発店コード1',
    width: 140,
    fieldType: 'string',
    required: false,
    searchable: false,
  },
  {
    key: 'hatsuBaseNo2',
    dataKey: 'hatsuBaseNo2',
    title: '発店コード2',
    width: 140,
    fieldType: 'string',
    required: false,
    searchable: false,
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: '作成日時',
    width: 180,
    fieldType: 'date',
    formEditable: false,
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'createdAt') {
      return { ...col, cellRenderer: ({ rowData }: { rowData: OrderSourceCompany }) => formatDate(rowData.createdAt) }
    }
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: OrderSourceCompany }) => (rowData as any)[col.dataKey || col.key] || '-',
    }
  }),
  {
    key: 'actions',
    title: '操作',
    width: 200,
    cellRenderer: ({ rowData }: { rowData: OrderSourceCompany }) =>
      h('div', { class: 'action-cell' }, [
        h(
          'button',
          {
            class: 'o-btn o-btn-sm o-btn-outline-primary',
            onClick: () => openEdit(rowData),
          },
          '編集',
        ),
        h(
          'button',
          {
            class: 'o-btn o-btn-sm o-btn-outline-secondary',
            onClick: () => duplicateOrderSourceCompany(rowData),
          },
          '複製',
        ),
        h(
          'button',
          {
            class: 'o-btn o-btn-sm o-btn-outline-danger',
            onClick: () => confirmDelete(rowData),
          },
          '削除',
        ),
      ]),
  },
]

const formColumns = baseColumns.filter((col) => col.formEditable !== false)

const currentFilters = ref<OrderSourceCompanyFilters>({})

const isEditing = computed(() => !!editingRow.value?._id)

const resetForm = () => {
  editingRow.value = null
}

const openCreate = () => {
  resetForm()
  dialogVisible.value = true
}

const openEdit = (row: OrderSourceCompany) => {
  editingRow.value = row
  dialogVisible.value = true
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  const nextFilters: OrderSourceCompanyFilters = {}
  const pickString = (val: any) =>
    typeof val === 'string' && val.trim() ? val.trim() : undefined

  if (payload.senderName?.value) nextFilters.senderName = pickString(payload.senderName.value)
  if (payload.senderPostalCode?.value) nextFilters.senderPostalCode = pickString(payload.senderPostalCode.value)
  if (payload.senderPhone?.value) nextFilters.senderPhone = pickString(payload.senderPhone.value)

  currentFilters.value = nextFilters
  loadList()
}

const loadList = async () => {
  loading.value = true
  try {
    list.value = await fetchOrderSourceCompanies(currentFilters.value)
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

const handleDialogSubmit = async (payload: Record<string, any>) => {
  saving.value = true
  try {
    const cleanPayload = {
      senderName: (payload.senderName || '').trim(),
      senderPostalCode: (payload.senderPostalCode || '').trim(),
      senderAddressPrefecture: (payload.senderAddressPrefecture || '').trim(),
      senderAddressCity: (payload.senderAddressCity || '').trim(),
      senderAddressStreet: (payload.senderAddressStreet || '').trim(),
      senderPhone: (payload.senderPhone || '').trim(),
      hatsuBaseNo1: (payload.hatsuBaseNo1 || '').trim(),
      hatsuBaseNo2: (payload.hatsuBaseNo2 || '').trim(),
    }

    if (editingRow.value?._id) {
      await updateOrderSourceCompany(editingRow.value._id, cleanPayload)
      showToast('更新しました', 'success')
    } else {
      await createOrderSourceCompany(cleanPayload)
      showToast('作成しました', 'success')
    }
    dialogVisible.value = false
    resetForm()
    await loadList()
  } catch (error: any) {
    showToast(error?.response?.data?.message || error?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

const duplicateOrderSourceCompany = async (row: OrderSourceCompany) => {
  try {
    const { _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = row
    await createOrderSourceCompany({ ...rest, senderName: `${row.senderName}_copy` } as any)
    showToast('複製しました', 'success')
    await loadList()
  } catch (e: any) {
    showToast(e?.message || '複製に失敗しました', 'danger')
  }
}

const confirmDelete = (row: OrderSourceCompany) => {
  if (!confirm(`「${row.senderName}」を削除しますか？`)) return
  deleteOrderSourceCompany(row._id)
    .then(async () => {
      showToast('削除しました', 'success')
      await loadList()
    })
    .catch(() => {})
}

const handleImportCompanies = async (rows: any[]) => {
  if (!rows || !Array.isArray(rows)) return
  importing.value = true
  importErrors.value = []
  importErrorDialogVisible.value = false
  try {
    await validateOrderSourceCompanyImport(rows)
    const result = await importOrderSourceCompaniesBulk(rows)
    showToast(`${result.insertedCount}件登録しました`, 'success')
    await loadList()
    showImportDialog.value = false
  } catch (err: any) {
    const errors = (err?.errors || []) as InputRowError[]
    if (Array.isArray(errors) && errors.length > 0) {
      importErrors.value = errors
      importErrorDialogVisible.value = true
    } else {
      showToast(err?.message || '取り込みに失敗しました', 'danger')
    }
  } finally {
    importing.value = false
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

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.order-source-company {
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

.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 14px);
  cursor: pointer;
  background: var(--o-view-background, #fff);
  color: var(--o-gray-700, #303133);
  transition: 0.2s;
  white-space: nowrap;
}

.o-btn-primary {
  background: var(--o-brand-primary, #714b67);
  color: #fff;
  border-color: var(--o-brand-primary, #714b67);
}

.o-btn-success {
  background: #67c23a;
  color: #fff;
  border-color: #67c23a;
}

.o-btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}

.o-btn-outline-primary {
  background: transparent;
  color: var(--o-brand-primary, #714b67);
  border-color: var(--o-brand-primary, #714b67);
}

.o-btn-outline-secondary {
  background: transparent;
  color: var(--o-gray-600, #909399);
  border-color: var(--o-gray-600, #909399);
}

.o-btn-outline-danger {
  background: transparent;
  color: #f56c6c;
  border-color: #f56c6c;
}

/* 操作列样式 - 垂直排列 */
:deep(.action-cell) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 4px;
}

:deep(.action-cell .o-btn) {
  margin: 0;
  min-width: 54px;
}
</style>
