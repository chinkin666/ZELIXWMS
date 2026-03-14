<template>
  <div class="custom-field-settings">
    <ControlPanel title="カスタムフィールド管理" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">新規追加</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="customFieldSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="definitions"
        :height="520"
        row-key="_id"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :global-search-text="globalSearchText"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogOpen" :title="isEditing ? 'フィールド定義を編集' : 'フィールド定義を追加'" size="lg" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">エンティティ <span class="required-badge">必須</span></label>
          <select v-model="form.entityType" class="o-input" :disabled="isEditing">
            <option value="" disabled>選択してください</option>
            <option v-for="et in entityTypes" :key="et.value" :value="et.value">{{ et.label }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">フィールドキー <span class="required-badge">必須</span></label>
          <input v-model="form.fieldKey" type="text" class="o-input" placeholder="例: priority" :disabled="isEditing" />
          <span class="form-hint">英数字と _ のみ（先頭は英字または_）</span>
        </div>
        <div class="form-field">
          <label class="form-label">ラベル（中文） <span class="required-badge">必須</span></label>
          <input v-model="form.label" type="text" class="o-input" placeholder="例: 优先级" />
        </div>
        <div class="form-field">
          <label class="form-label">ラベル（日本語）</label>
          <input v-model="form.labelJa" type="text" class="o-input" placeholder="例: 優先度" />
        </div>
        <div class="form-field">
          <label class="form-label">フィールドタイプ <span class="required-badge">必須</span></label>
          <select v-model="form.fieldType" class="o-input">
            <option value="text">text（テキスト）</option>
            <option value="number">number（数値）</option>
            <option value="boolean">boolean（真偽値）</option>
            <option value="date">date（日付）</option>
            <option value="select">select（選択肢）</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">デフォルト値</label>
          <input v-model="form.defaultValue" type="text" class="o-input" placeholder="省略可" />
        </div>
        <div v-if="form.fieldType === 'select'" class="form-field form-field--full">
          <label class="form-label">選択肢（カンマ区切り） <span class="required-badge">必須</span></label>
          <input v-model="optionsStr" type="text" class="o-input" placeholder="例: 高,中,低" />
        </div>
        <div class="form-field">
          <label class="form-label">表示順序</label>
          <input v-model.number="form.sortOrder" type="number" class="o-input" min="0" />
        </div>
        <div class="form-field" style="display: flex; align-items: center; gap: 8px; padding-top: 24px">
          <input v-model="form.required" type="checkbox" id="cf-required" />
          <label for="cf-required">必須フィールド</label>
        </div>
        <div class="form-field" style="display: flex; align-items: center; gap: 8px; padding-top: 24px">
          <input v-model="form.enabled" type="checkbox" id="cf-enabled" />
          <label for="cf-enabled">有効</label>
        </div>
      </div>
    </ODialog>

    <!-- Delete Confirm -->
    <ODialog v-model="deleteDialogOpen" title="削除確認" size="sm" @confirm="handleDelete">
      <p>「{{ deleteTarget?.label }}」を削除しますか？この操作は元に戻せません。</p>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import {
  fetchCustomFieldDefinitions,
  createCustomFieldDefinition,
  updateCustomFieldDefinition,
  deleteCustomFieldDefinition,
  type CustomFieldDefinition,
} from '@/api/customField'

const toast = useToast()
const { t } = useI18n()

const entityTypes = [
  { value: 'order', label: '注文（出荷指示）' },
  { value: 'product', label: '商品' },
  { value: 'inboundOrder', label: '入庫' },
  { value: 'returnOrder', label: '返品' },
]

const loading = ref(false)
const definitions = ref<CustomFieldDefinition[]>([])
const globalSearchText = ref('')

const dialogOpen = ref(false)
const isEditing = ref(false)
const editingId = ref('')
const form = ref(emptyForm())
const optionsStr = ref('')

const deleteDialogOpen = ref(false)
const deleteTarget = ref<CustomFieldDefinition | null>(null)

function emptyForm() {
  return {
    entityType: '' as string,
    fieldKey: '',
    label: '',
    labelJa: '',
    fieldType: 'text' as string,
    required: false,
    defaultValue: '',
    sortOrder: 0,
    enabled: true,
  }
}

function entityLabel(type: string) {
  return entityTypes.find((t) => t.value === type)?.label ?? type
}

const baseColumns: TableColumn[] = [
  {
    key: 'enabled',
    dataKey: 'enabled',
    title: '状態',
    width: 80,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'entityType',
    dataKey: 'entityType',
    title: 'エンティティ',
    width: 160,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: entityTypes.map((et) => ({ label: et.label, value: et.value })),
  },
  {
    key: 'fieldKey',
    dataKey: 'fieldKey',
    title: 'フィールドキー',
    width: 160,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'label',
    dataKey: 'label',
    title: 'ラベル',
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'fieldType',
    dataKey: 'fieldType',
    title: 'タイプ',
    width: 100,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: 'text', value: 'text' },
      { label: 'number', value: 'number' },
      { label: 'boolean', value: 'boolean' },
      { label: 'date', value: 'date' },
      { label: 'select', value: 'select' },
    ],
  },
  {
    key: 'required',
    dataKey: 'required',
    title: '必須',
    width: 80,
    fieldType: 'boolean',
  },
  {
    key: 'sortOrder',
    dataKey: 'sortOrder',
    title: '順序',
    width: 80,
    fieldType: 'number',
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'enabled') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: CustomFieldDefinition }) =>
          h(
            'span',
            { class: rowData.enabled ? 'o-badge o-badge-success' : 'o-badge o-badge-info' },
            rowData.enabled ? 'ON' : 'OFF',
          ),
      }
    }
    if (col.key === 'entityType') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: CustomFieldDefinition }) => entityLabel(rowData.entityType),
      }
    }
    if (col.key === 'fieldKey') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: CustomFieldDefinition }) =>
          h('code', { class: 'event-code' }, rowData.fieldKey),
      }
    }
    if (col.key === 'label') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: CustomFieldDefinition }) =>
          `${rowData.label}${rowData.labelJa ? ` / ${rowData.labelJa}` : ''}`,
      }
    }
    if (col.key === 'required') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: CustomFieldDefinition }) => (rowData.required ? '\u2713' : ''),
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 180,
    cellRenderer: ({ rowData }: { rowData: CustomFieldDefinition }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(OButton, { variant: 'icon-danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

const currentFilterEntityType = ref('')

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }

  if (payload.entityType?.value) {
    currentFilterEntityType.value = String(payload.entityType.value)
  } else {
    currentFilterEntityType.value = ''
  }

  loadList()
}

async function loadList() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (currentFilterEntityType.value) params.entityType = currentFilterEntityType.value
    const res = await fetchCustomFieldDefinitions(params)
    definitions.value = res.data
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  isEditing.value = false
  editingId.value = ''
  form.value = emptyForm()
  optionsStr.value = ''
  dialogOpen.value = true
}

function openEdit(d: CustomFieldDefinition) {
  isEditing.value = true
  editingId.value = d._id
  form.value = {
    entityType: d.entityType,
    fieldKey: d.fieldKey,
    label: d.label,
    labelJa: d.labelJa || '',
    fieldType: d.fieldType,
    required: d.required,
    defaultValue: d.defaultValue != null ? String(d.defaultValue) : '',
    sortOrder: d.sortOrder,
    enabled: d.enabled,
  }
  optionsStr.value = d.options?.join(',') || ''
  dialogOpen.value = true
}

async function handleSave() {
  try {
    const data: Record<string, unknown> = { ...form.value }
    if (form.value.fieldType === 'select') {
      data.options = optionsStr.value.split(',').map((s) => s.trim()).filter(Boolean)
    }
    // defaultValue 类型转换 / デフォルト値の型変換
    if (data.defaultValue === '') {
      delete data.defaultValue
    } else if (form.value.fieldType === 'number') {
      data.defaultValue = Number(data.defaultValue)
    } else if (form.value.fieldType === 'boolean') {
      data.defaultValue = data.defaultValue === 'true'
    }

    if (isEditing.value) {
      await updateCustomFieldDefinition(editingId.value, data)
      toast.success('フィールド定義を更新しました')
    } else {
      await createCustomFieldDefinition(data)
      toast.success('フィールド定義を作成しました')
    }
    dialogOpen.value = false
    await loadList()
  } catch (e) {
    toast.error((e as Error).message)
  }
}

function confirmDelete(d: CustomFieldDefinition) {
  deleteTarget.value = d
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteCustomFieldDefinition(deleteTarget.value._id)
    toast.success('フィールド定義を削除しました')
    deleteDialogOpen.value = false
    await loadList()
  } catch (e) {
    toast.error((e as Error).message)
  }
}

onMounted(loadList)
</script>

<style scoped>
.custom-field-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-field--full {
  grid-column: 1 / -1;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.form-hint {
  font-size: 11px;
  color: #9ca3af;
}
.required {
  color: #ef4444;
}
.event-code {
  font-size: 12px;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
}
:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
