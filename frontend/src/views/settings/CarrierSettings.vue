<template>
  <div class="carrier-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">配送会社設定</h1>
        <p class="page-subtitle">配送会社基本情報とフォーマット定義を管理します</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新規追加</el-button>
    </div>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="carrierSettingsSearch"
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

    <!-- Template Settings Dialog -->
    <el-dialog v-model="templateDialogVisible" :title="`印刷テンプレート設定 - ${templateEditingCarrier?.name || ''}`" width="600px">
      <el-table :data="templateMappingList" border size="small" height="400">
        <el-table-column prop="invoiceType" label="送り状種類" width="220">
          <template #default="{ row }">
            <span>{{ row.invoiceType }}: {{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="印刷テンプレート">
          <template #default="{ row }">
            <el-select
              v-model="row.printTemplateId"
              placeholder="選択してください"
              clearable
              style="width: 100%"
            >
              <el-option
                v-for="tpl in printTemplates"
                :key="tpl.id"
                :label="tpl.name"
                :value="tpl.id"
              />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="templateDialogVisible = false">キャンセル</el-button>
        <el-button type="primary" :loading="templateSaving" @click="saveTemplateSettings">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '配送会社を編集' : '配送会社を追加'"
      width="900px"
      class="carrier-dialog"
    >
      <el-form :model="editForm" label-width="120px" label-position="left" class="carrier-form">
        <div class="form-row">
          <el-form-item label="配送会社コード" required>
            <el-input v-model="editForm.code" placeholder="例: yamato_b2" :disabled="isEditing" />
          </el-form-item>
          <el-form-item label="配送会社名" required>
            <el-input v-model="editForm.name" placeholder="配送会社名" />
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="有効">
            <el-switch v-model="editForm.enabled" />
          </el-form-item>
          <el-form-item label="伝票番号列名">
            <el-input
              v-model="editForm.trackingIdColumnName"
              placeholder="回执/実績ファイルの列名（例: 伝票番号）"
            />
          </el-form-item>
        </div>
        <el-form-item label="説明">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="2"
            placeholder="補足説明"
          />
        </el-form-item>

        <div class="format-header">
          <div>
            <h4>フォーマット定義（列）</h4>
            <p class="subtext">列名・型・最大文字数・必須・ユーザー入力可否を編集できます</p>
          </div>
          <div class="format-actions">
            <el-button size="small" :icon="Plus" @click="addColumn">列を追加</el-button>
            <el-button size="small" :icon="Refresh" @click="resetColumnsFromEditing">リセット</el-button>
          </div>
        </div>

        <el-table
          class="format-table"
          :data="editForm.formatDefinition.columns"
          height="320"
          border
          size="small"
          row-key="__key"
        >
          <el-table-column prop="name" label="列名" min-width="150">
            <template #default="{ row }">
              <el-input v-model="row.name" placeholder="列名" />
            </template>
          </el-table-column>
          <el-table-column prop="description" label="列説明" min-width="220">
            <template #default="{ row }">
              <el-input v-model="row.description" placeholder="説明・型・長さなど" />
            </template>
          </el-table-column>
          <el-table-column prop="type" label="型" width="120">
            <template #default="{ row }">
              <el-select v-model="row.type" placeholder="型を選択">
                <el-option label="string" value="string" />
                <el-option label="number" value="number" />
                <el-option label="date" value="date" />
                <el-option label="boolean" value="boolean" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column prop="maxWidth" label="最大文字数" width="110">
            <template #default="{ row }">
              <el-input
                v-model.number="row.maxWidth"
                type="number"
                min="1"
                placeholder="半角幅"
              />
            </template>
          </el-table-column>
          <el-table-column prop="required" label="必須" width="90" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.required" />
            </template>
          </el-table-column>
          <el-table-column prop="userUploadable" label="ユーザー入力" width="120" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.userUploadable" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" fixed="right">
            <template #default="{ $index }">
              <el-button
                type="danger"
                link
                size="small"
                @click="removeColumn($index)"
                :disabled="editForm.formatDefinition.columns.length <= 1"
              >
                削除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">キャンセル</el-button>
          <el-button type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? '更新' : '作成' }}
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { ElButton, ElMessage, ElMessageBox, ElSwitch } from 'element-plus'
import { Edit, Plus, Refresh } from '@element-plus/icons-vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import { createCarrier, deleteCarrier, fetchCarriers, updateCarrier } from '@/api/carrier'
import { fetchPrintTemplates } from '@/api/printTemplates'
import type { Carrier, CarrierFilters, CarrierColumnConfig, CarrierService } from '@/types/carrier'
import type { PrintTemplate } from '@/types/printTemplate'

/** 固定の送り状種類（11種） */
const INVOICE_TYPES = [
  { invoiceType: '0', name: '発払い' },
  { invoiceType: '1', name: 'EAZY' },
  { invoiceType: '2', name: 'コレクト' },
  { invoiceType: '3', name: 'クロネコゆうメール（DM便）' },
  { invoiceType: '4', name: 'タイム' },
  { invoiceType: '5', name: '着払い' },
  { invoiceType: '6', name: '発払い複数口' },
  { invoiceType: '7', name: 'クロネコゆうパケット' },
  { invoiceType: '8', name: '宅急便コンパクト' },
  { invoiceType: '9', name: 'コンパクトコレクト' },
  { invoiceType: 'A', name: 'ネコポス' },
] as const

type EditableColumn = CarrierColumnConfig & { __key?: string }
type EditableCarrier = Omit<Carrier, 'formatDefinition'> & { formatDefinition: { columns: EditableColumn[] } }

const list = ref<Carrier[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingRow = ref<Carrier | null>(null)
const editForm = ref<EditableCarrier>(getEmptyCarrier())
const originalColumns = ref<CarrierColumnConfig[]>([])
const globalSearchText = ref('')

// Template settings dialog state
const templateDialogVisible = ref(false)
const templateSaving = ref(false)
const templateEditingCarrier = ref<Carrier | null>(null)
const printTemplates = ref<PrintTemplate[]>([])
const templateMappingList = ref<Array<{ invoiceType: string; name: string; printTemplateId?: string }>>([])

const baseColumns: TableColumn[] = [
  {
    key: 'code',
    dataKey: 'code',
    title: '配送会社コード',
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '配送会社名',
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'trackingIdColumnName',
    dataKey: 'trackingIdColumnName',
    title: '伝票番号列名',
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'enabled',
    dataKey: 'enabled',
    title: '有効',
    width: 100,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'formatColumns',
    title: '列数',
    width: 80,
    fieldType: 'number',
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
      return { ...col, cellRenderer: ({ rowData }: { rowData: Carrier }) => formatDate(rowData.createdAt) }
    }
    if (col.key === 'enabled') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Carrier }) =>
          h(ElSwitch, { modelValue: rowData.enabled, disabled: true, inlinePrompt: true }),
      }
    }
    if (col.key === 'formatColumns') {
      return {
        ...col,
        dataKey: undefined,
        cellRenderer: ({ rowData }: { rowData: Carrier }) => rowData.formatDefinition?.columns?.length ?? 0,
      }
    }
    return {
      ...col,
      cellRenderer: ({ rowData }: { rowData: Carrier }) => (rowData as any)[col.dataKey || col.key] || '-',
    }
  }),
  {
    key: 'actions',
    title: '操作',
    width: 220,
    cellRenderer: ({ rowData }: { rowData: Carrier }) => {
      // 内置配送会社不可编辑/削除
      if (rowData.isBuiltIn) {
        return h('span', { style: { color: '#909399', fontSize: '12px' } }, '(内蔵)')
      }
      return h('div', { class: 'action-cell' }, [
        h(
          ElButton,
          {
            type: 'primary',
            plain: true,
            size: 'small',
            onClick: () => openEdit(rowData),
          },
          { default: () => '編集' },
        ),
        h(
          ElButton,
          {
            type: 'info',
            plain: true,
            size: 'small',
            onClick: () => duplicateCarrier(rowData),
          },
          { default: () => '複製' },
        ),
        h(
          ElButton,
          {
            type: 'success',
            plain: true,
            size: 'small',
            onClick: () => openTemplateSettings(rowData),
          },
          { default: () => 'テンプレート設定' },
        ),
        h(
          ElButton,
          {
            type: 'danger',
            plain: true,
            size: 'small',
            onClick: () => confirmDelete(rowData),
          },
          { default: () => '削除' },
        ),
      ])
    },
  },
]

const currentFilters = ref<CarrierFilters>({})
const isEditing = computed(() => !!editingRow.value?._id)

function getEmptyCarrier(): EditableCarrier {
  return {
    _id: '',
    code: '',
    name: '',
    description: '',
    enabled: true,
    trackingIdColumnName: '',
    formatDefinition: { columns: [createEmptyColumn()] },
  }
}

function createEmptyColumn(): EditableColumn {
  return {
    __key: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    name: '',
    description: '',
    type: 'string',
    maxWidth: undefined,
    required: false,
    userUploadable: true,
  }
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  // Extract global search text (client-side only, strip from payload)
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  const nextFilters: CarrierFilters = {}
  const pickString = (val: any) => (typeof val === 'string' && val.trim() ? val.trim() : undefined)

  if (payload.code?.value) nextFilters.code = pickString(payload.code.value)
  if (payload.name?.value) nextFilters.name = pickString(payload.name.value)
  if (typeof payload.enabled?.value === 'boolean') nextFilters.enabled = payload.enabled.value

  currentFilters.value = nextFilters
  loadList()
}

const loadList = async () => {
  loading.value = true
  try {
    // fetchCarriers 已经自动包含内置配送会社
    list.value = await fetchCarriers(currentFilters.value)
  } catch (error: any) {
    ElMessage.error(error?.message || '取得に失敗しました')
  } finally {
    loading.value = false
  }
}

const resetEditForm = () => {
  editForm.value = getEmptyCarrier()
  originalColumns.value = []
}

const openCreate = () => {
  editingRow.value = null
  resetEditForm()
  dialogVisible.value = true
}

const openEdit = (row: Carrier) => {
  editingRow.value = row
  const cloned = JSON.parse(JSON.stringify(row)) as Carrier
  const columns = (cloned.formatDefinition?.columns || []).map((c) => ({
    ...c,
    __key: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
  }))
  editForm.value = {
    ...cloned,
    trackingIdColumnName: cloned.trackingIdColumnName || '',
    formatDefinition: { columns },
  }
  originalColumns.value = columns.map((c) => ({ ...c }))
  dialogVisible.value = true
}

const addColumn = () => {
  editForm.value.formatDefinition.columns.push(createEmptyColumn())
}

const removeColumn = (index: number) => {
  editForm.value.formatDefinition.columns.splice(index, 1)
}

const resetColumnsFromEditing = () => {
  if (originalColumns.value.length > 0) {
    editForm.value.formatDefinition.columns = originalColumns.value.map((c) => ({
      ...c,
      __key: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    }))
  } else {
    editForm.value.formatDefinition.columns = [createEmptyColumn()]
  }
}

const handleSave = async () => {
  if (!editForm.value.code.trim() || !editForm.value.name.trim()) {
    ElMessage.warning('配送会社コード・配送会社名は必須です')
    return
  }

  const cleanColumns = editForm.value.formatDefinition.columns.map(({ __key, ...rest }) => ({
    ...rest,
    maxWidth: typeof rest.maxWidth === 'number' && !Number.isNaN(rest.maxWidth) ? rest.maxWidth : undefined,
    name: rest.name?.trim() || '',
    description: rest.description?.trim() || '',
  }))

  const payload = {
    code: editForm.value.code.trim(),
    name: editForm.value.name.trim(),
    description: editForm.value.description?.trim() || undefined,
    enabled: !!editForm.value.enabled,
    trackingIdColumnName: editForm.value.trackingIdColumnName?.trim() || undefined,
    formatDefinition: {
      columns: cleanColumns,
    },
  }

  saving.value = true
  try {
    if (isEditing.value && editingRow.value?._id) {
      await updateCarrier(editingRow.value._id, payload)
      ElMessage.success('更新しました')
    } else {
      await createCarrier(payload)
      ElMessage.success('作成しました')
    }
    dialogVisible.value = false
    resetEditForm()
    await loadList()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

const duplicateCarrier = async (row: Carrier) => {
  try {
    const { _id, createdAt, updatedAt, isBuiltIn, automationType, ...rest } = row
    await createCarrier({ ...rest, code: `${row.code}_copy`, name: `${row.name}_copy` } as any)
    ElMessage.success('複製しました')
    await loadList()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '複製に失敗しました')
  }
}

const confirmDelete = (row: Carrier) => {
  ElMessageBox.confirm(`「${row.name}」を削除しますか？`, '確認', {
    confirmButtonText: 'はい',
    cancelButtonText: 'いいえ',
    type: 'warning',
  })
    .then(async () => {
      await deleteCarrier(row._id)
      ElMessage.success('削除しました')
      await loadList()
    })
    .catch(() => {})
}

const formatDate = (iso?: string) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Template settings functions
const openTemplateSettings = async (row: Carrier) => {
  templateEditingCarrier.value = row

  // Load print templates if not already loaded
  if (printTemplates.value.length === 0) {
    try {
      printTemplates.value = await fetchPrintTemplates()
    } catch (e: any) {
      ElMessage.error('印刷テンプレートの取得に失敗しました')
      return
    }
  }

  // Build mapping list from INVOICE_TYPES and existing services
  const existingServices = row.services || []
  templateMappingList.value = INVOICE_TYPES.map((type) => {
    const existing = existingServices.find((s) => s.invoiceType === type.invoiceType)
    return {
      invoiceType: type.invoiceType,
      name: type.name,
      printTemplateId: existing?.printTemplateId,
    }
  })

  templateDialogVisible.value = true
}

const saveTemplateSettings = async () => {
  if (!templateEditingCarrier.value) return

  templateSaving.value = true
  try {
    // Build services array from mapping list (only include entries with printTemplateId)
    const services: CarrierService[] = templateMappingList.value
      .filter((item) => item.printTemplateId)
      .map((item) => ({
        invoiceType: item.invoiceType,
        printTemplateId: item.printTemplateId,
      }))

    await updateCarrier(templateEditingCarrier.value._id, {
      formatDefinition: templateEditingCarrier.value.formatDefinition,
      services,
    })

    // Update local list
    const idx = list.value.findIndex((c) => c._id === templateEditingCarrier.value!._id)
    if (idx >= 0 && list.value[idx]) {
      list.value[idx].services = services
    }

    ElMessage.success('保存しました')
    templateDialogVisible.value = false
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '保存に失敗しました')
  } finally {
    templateSaving.value = false
  }
}

onMounted(() => {
  loadList()
})
</script>

<style scoped>
.carrier-settings {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #666;
  font-size: 13px;
}

.table-section {
  width: 100%;
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

:deep(.action-cell .el-button) {
  margin: 0;
  min-width: 54px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border-width: 1px;
}

:deep(.action-cell .el-button--primary.is-plain) {
  border-color: var(--el-color-primary);
}

:deep(.action-cell .el-button--info.is-plain) {
  border-color: var(--el-color-info);
}

:deep(.action-cell .el-button--danger.is-plain) {
  border-color: var(--el-color-danger);
}

:deep(.action-cell .el-button--success.is-plain) {
  border-color: var(--el-color-success);
}

.carrier-dialog .carrier-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .el-form-item {
  flex: 1;
}

.format-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.format-actions {
  display: flex;
  gap: 8px;
}

.format-table {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.subtext {
  margin: 4px 0 0;
  font-size: 12px;
  color: #666;
}
</style>

