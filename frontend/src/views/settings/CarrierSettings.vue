<template>
  <div class="carrier-settings">
    <ControlPanel :title="t('wms.settings.carrierSettingsTitle', '配送業者設定')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">{{ t('wms.settings.addNew', '新規追加') }}</OButton>
      </template>
    </ControlPanel>

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
    <ODialog :open="templateDialogVisible" :title="`${t('wms.settings.printTemplateSettings', '印刷テンプレート設定')} - ${templateEditingCarrier?.name || ''}`" @close="templateDialogVisible = false">
      <table class="o-list-table">
        <thead>
          <tr>
            <th style="width:220px">{{ t('wms.settings.waybillType') }}</th>
            <th>{{ t('wms.settings.printTemplate') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in templateMappingList" :key="row.invoiceType">
            <td>{{ row.invoiceType }}: {{ row.name }}</td>
            <td>
              <select class="o-input" v-model="row.printTemplateId" style="width:100%">
                <option value="">{{ t('wms.settings.pleaseSelect', '選択してください') }}</option>
                <option
                  v-for="tpl in printTemplates"
                  :key="tpl.id"
                  :value="tpl.id"
                >{{ tpl.name }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
      <template #footer>
        <OButton variant="secondary" @click="templateDialogVisible = false">{{ t('wms.common.cancel') }}</OButton>
        <OButton variant="primary" :disabled="templateSaving" @click="saveTemplateSettings">{{ t('wms.common.save') }}</OButton>
      </template>
    </ODialog>

    <ODialog
      :open="dialogVisible"
      :title="isEditing ? t('wms.settings.editCarrier') : t('wms.settings.addCarrier')"
      size="xl"
      @close="dialogVisible = false"
    >
      <div class="carrier-form">
        <div class="form-row">
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.carrierCode') }} <span class="required">*</span></label>
            <input class="o-input" v-model="editForm.code" placeholder="例: yamato_b2" :disabled="isEditing" />
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.carrierName') }} <span class="required">*</span></label>
            <input class="o-input" v-model="editForm.name" :placeholder="t('wms.settings.carrierName')" />
          </div>
        </div>
        <div class="form-row">
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.enabled', '有効') }}</label>
            <label class="o-toggle">
              <input type="checkbox" v-model="editForm.enabled" />
              <span class="o-toggle-slider"></span>
            </label>
          </div>
          <div class="o-form-group">
            <label class="form-label">{{ t('wms.settings.trackingColumn') }}</label>
            <input class="o-input" v-model="editForm.trackingIdColumnName" :placeholder="t('wms.settings.trackingColumnPlaceholder', '回执/実績ファイルの列名（例: 伝票番号）')" />
          </div>
        </div>
        <div class="o-form-group">
          <label class="form-label">{{ t('wms.settings.description') }}</label>
          <textarea class="o-input" v-model="editForm.description" rows="2" :placeholder="t('wms.settings.supplementary')"></textarea>
        </div>

        <div class="format-header">
          <div>
            <h4>{{ t('wms.settings.formatDefinition', 'フォーマット定義（列）') }}</h4>
            <p class="subtext">{{ t('wms.settings.formatDefinitionHint', '列名・型・最大文字数・必須・ユーザー入力可否を編集できます') }}</p>
          </div>
          <div class="format-actions">
            <OButton variant="secondary" size="sm" @click="addColumn">{{ t('wms.settings.addColumn', '列を追加') }}</OButton>
            <OButton variant="secondary" size="sm" @click="resetColumnsFromEditing">{{ t('wms.settings.reset', 'リセット') }}</OButton>
          </div>
        </div>

        <div class="format-table-wrapper">
          <table class="o-list-table format-table">
            <thead>
              <tr>
                <th style="min-width:150px">{{ t('wms.settings.columnName', '列名') }}</th>
                <th style="min-width:220px">{{ t('wms.settings.columnDescription', '列説明') }}</th>
                <th style="width:120px">{{ t('wms.settings.columnType', '型') }}</th>
                <th style="width:110px">{{ t('wms.settings.maxWidth', '最大文字数') }}</th>
                <th style="width:90px;text-align:center">{{ t('wms.settings.required', '必須') }}</th>
                <th style="width:120px;text-align:center">{{ t('wms.settings.userUploadable', 'ユーザー入力') }}</th>
                <th style="width:90px">{{ t('wms.settings.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, $index) in editForm.formatDefinition.columns" :key="row.__key">
                <td><input class="o-input" v-model="row.name" :placeholder="t('wms.settings.columnName', '列名')" /></td>
                <td><input class="o-input" v-model="row.description" :placeholder="t('wms.settings.columnDescriptionPlaceholder', '説明・型・長さなど')" /></td>
                <td>
                  <select class="o-input" v-model="row.type">
                    <option value="string">{{ t('wms.settings.typeString', '文字列') }}</option>
                    <option value="number">{{ t('wms.settings.typeNumber', '数値') }}</option>
                    <option value="date">{{ t('wms.settings.typeDate', '日付') }}</option>
                    <option value="boolean">{{ t('wms.settings.typeBoolean', '真偽値') }}</option>
                  </select>
                </td>
                <td><input class="o-input" v-model.number="row.maxWidth" type="number" min="1" :placeholder="t('wms.settings.halfWidthChars', '半角幅')" /></td>
                <td style="text-align:center">
                  <input type="checkbox" v-model="row.required" />
                </td>
                <td style="text-align:center">
                  <input type="checkbox" v-model="row.userUploadable" />
                </td>
                <td>
                  <OButton
                    variant="danger"
                    size="sm"
                    @click="removeColumn($index)"
                    :disabled="editForm.formatDefinition.columns.length <= 1"
                  >{{ t('wms.common.delete') }}</OButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <template #footer>
        <OButton variant="secondary" @click="dialogVisible = false">{{ t('wms.common.cancel') }}</OButton>
        <OButton variant="primary" :disabled="saving" @click="handleSave">
          {{ isEditing ? t('wms.settings.update', '更新') : t('wms.common.create') }}
        </OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import { createCarrier, deleteCarrier, fetchCarriers, updateCarrier } from '@/api/carrier'
import { fetchPrintTemplates } from '@/api/printTemplates'
import type { Carrier, CarrierFilters, CarrierColumnConfig, CarrierService } from '@/types/carrier'
import type { PrintTemplate } from '@/types/printTemplate'

const { t } = useI18n()
const { show: showToast } = useToast()

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
    title: t('wms.settings.carrierCode'),
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: t('wms.settings.carrierName'),
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'trackingIdColumnName',
    dataKey: 'trackingIdColumnName',
    title: t('wms.settings.trackingColumn'),
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'enabled',
    dataKey: 'enabled',
    title: t('wms.settings.enabled', '有効'),
    width: 100,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'formatColumns',
    title: t('wms.settings.columnCount', '列数'),
    width: 80,
    fieldType: 'number',
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: t('wms.settings.createdAt', '作成日時'),
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
          h('span', { class: rowData.enabled ? 'o-badge o-badge-success' : 'o-badge o-badge-info' },
            rowData.enabled ? 'ON' : 'OFF'),
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
    title: t('wms.settings.actions'),
    width: 220,
    cellRenderer: ({ rowData }: { rowData: Carrier }) => {
      if (rowData.isBuiltIn) {
        return h('div', { class: 'action-cell' }, [
          h('span', { style: { color: '#909399', fontSize: '12px' } }, t('wms.settings.builtIn', '(内蔵)')),
          h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => t('wms.common.edit')),
        ])
      }
      return h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => t('wms.common.edit')),
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => duplicateCarrier(rowData) }, () => t('wms.settings.duplicate', '複製')),
        h(OButton, { variant: 'success', size: 'sm', onClick: () => openTemplateSettings(rowData) }, () => t('wms.settings.templateSettings', 'テンプレート設定')),
        h(OButton, { variant: 'danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => t('wms.common.delete')),
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
    list.value = await fetchCarriers(currentFilters.value)
  } catch (error: any) {
    showToast(error?.message || t('wms.settings.fetchFailed', '取得に失敗しました'), 'danger')
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
    showToast(t('wms.settings.carrierCodeNameRequired', '配送業者コード・配送業者名は必須です'), 'warning')
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
      showToast(t('wms.settings.updated', '更新しました'), 'success')
    } else {
      await createCarrier(payload)
      showToast(t('wms.settings.created', '作成しました'), 'success')
    }
    dialogVisible.value = false
    resetEditForm()
    await loadList()
  } catch (error: any) {
    showToast(error?.response?.data?.message || error?.message || t('wms.settings.saveFailed', '保存に失敗しました'), 'danger')
  } finally {
    saving.value = false
  }
}

const duplicateCarrier = async (row: Carrier) => {
  try {
    const { _id, createdAt: _createdAt, updatedAt: _updatedAt, isBuiltIn: _isBuiltIn, automationType: _automationType, ...rest } = row
    await createCarrier({ ...rest, code: `${row.code}_copy`, name: `${row.name}_copy` } as any)
    showToast(t('wms.settings.duplicated', '複製しました'), 'success')
    await loadList()
  } catch (e: any) {
    showToast(e?.response?.data?.message || e?.message || t('wms.settings.duplicateFailed', '複製に失敗しました'), 'danger')
  }
}

const confirmDelete = (row: Carrier) => {
  if (!confirm(t('wms.settings.confirmDelete', `「${row.name}」を削除しますか？`))) return
  deleteCarrier(row._id)
    .then(async () => {
      showToast(t('wms.settings.deleted', '削除しました'), 'success')
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

  if (printTemplates.value.length === 0) {
    try {
      printTemplates.value = await fetchPrintTemplates()
    } catch (_e: any) {
      showToast(t('wms.settings.printTemplateFetchFailed', '印刷テンプレートの取得に失敗しました'), 'danger')
      return
    }
  }

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

    const idx = list.value.findIndex((c) => c._id === templateEditingCarrier.value!._id)
    if (idx >= 0 && list.value[idx]) {
      list.value[idx].services = services
    }

    showToast(t('wms.settings.saved', '保存しました'), 'success')
    templateDialogVisible.value = false
  } catch (e: any) {
    showToast(e?.response?.data?.message || e?.message || t('wms.settings.saveFailed', '保存に失敗しました'), 'danger')
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


.o-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.o-badge-success { background: #f0f9eb; color: #67c23a; }
.o-badge-info { background: #f4f4f5; color: #909399; }

.o-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 14px);
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  box-sizing: border-box;
}

textarea.o-input {
  resize: vertical;
}

.o-form-group { margin-bottom: 1rem; }
.form-label { display: block; font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-700, #303133); margin-bottom: 0.25rem; }
.required { color: #f56c6c; }

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #714b67); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

/* .o-list-table base styles are defined globally in style.css */

/* 操作列スタイル - 縦並び / 操作列样式 - 垂直排列 */
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

.carrier-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-row .o-form-group {
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

.format-table-wrapper {
  max-height: 320px;
  overflow: auto;
  margin-top: 8px;
}

.subtext {
  margin: 4px 0 0;
  font-size: 12px;
  color: #666;
}
</style>
