<template>
  <div class="feature-flag-settings">
    <PageHeader title="フィーチャーフラグ管理" :show-search="false">
      <template #actions>
        <Button variant="default" @click="openCreate">新規追加</Button>
      </template>
    </PageHeader>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="flags"
        row-key="_id"
        :search-columns="searchColumns"
        @search="handleSearch"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog :open="dialogOpen" @update:open="dialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? 'フラグを編集' : 'フラグを追加' }}</DialogTitle></DialogHeader>
      <div class="form-grid">
        <div class="form-field">
          <label>キー <span class="text-destructive text-xs">*</span></label>
          <Input v-model="form.key" type="text" placeholder="例: extensions.scripts" :disabled="isEditing" />
          <span class="form-hint">英数字、ドット、アンダースコア（先頭は英字）</span>
        </div>
        <div class="form-field">
          <label>名称 <span class="text-destructive text-xs">*</span></label>
          <Input v-model="form.name" type="text" placeholder="例: スクリプト自動化" />
        </div>
        <div class="form-field form-field--full">
          <label>説明</label>
          <Input v-model="form.description" type="text" placeholder="省略可" />
        </div>
        <div class="form-field">
          <label>グループ</label>
          <Input v-model="form.group" type="text" placeholder="例: extensions" />
        </div>
        <div class="form-field" style="display: flex; align-items: center; gap: 8px; padding-top: 24px">
          <Checkbox :checked="form.defaultEnabled" @update:checked="val => form.defaultEnabled = val" />
          <label for="ff-enabled">デフォルト有効</label>
        </div>
      </div>
    </DialogContent>
    </Dialog>

    <!-- Delete Confirm -->
    <Dialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>削除確認</DialogTitle></DialogHeader>
      <p>「{{ deleteTarget?.name }}」を削除しますか？この操作は元に戻せません。</p>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  fetchFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  toggleFeatureFlag,
  type FeatureFlag,
} from '@/api/featureFlag'

const toast = useToast()
const { t } = useI18n()

const loading = ref(false)
const flags = ref<FeatureFlag[]>([])
const globalSearchText = ref('')

const dialogOpen = ref(false)
const isEditing = ref(false)
const editingId = ref('')
const form = ref(emptyForm())

const deleteDialogOpen = ref(false)
const deleteTarget = ref<FeatureFlag | null>(null)

function emptyForm() {
  return {
    key: '',
    name: '',
    description: '',
    group: '',
    defaultEnabled: false,
  }
}

const baseColumns: TableColumn[] = [
  {
    key: 'defaultEnabled',
    dataKey: 'defaultEnabled',
    title: '状態',
    width: 80,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'key',
    dataKey: 'key',
    title: 'キー',
    width: 200,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '名称',
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'description',
    dataKey: 'description',
    title: '説明',
    width: 240,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'group',
    dataKey: 'group',
    title: 'グループ',
    width: 120,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'tenantOverrides',
    dataKey: 'tenantOverrides',
    title: 'オーバーライド',
    width: 120,
    fieldType: 'number',
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'defaultEnabled') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: FeatureFlag }) =>
          h(
            'span',
            {
              class: rowData.defaultEnabled ? 'o-badge o-badge-success' : 'o-badge o-badge-info',
              style: 'cursor: pointer',
              onClick: () => handleToggle(rowData),
            },
            rowData.defaultEnabled ? 'ON' : 'OFF',
          ),
      }
    }
    if (col.key === 'key') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: FeatureFlag }) =>
          h('code', { class: 'event-code' }, rowData.key),
      }
    }
    if (col.key === 'description') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: FeatureFlag }) => rowData.description || '-',
      }
    }
    if (col.key === 'group') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: FeatureFlag }) => rowData.group || '-',
      }
    }
    if (col.key === 'tenantOverrides') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: FeatureFlag }) => rowData.tenantOverrides.length,
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 180,
    cellRenderer: ({ rowData }: { rowData: FeatureFlag }) =>
      h('div', { class: 'action-cell' }, [
        h(Button, { variant: 'default', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(Button, { variant: 'destructive', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }
}

async function loadList() {
  loading.value = true
  try {
    const res = await fetchFeatureFlags()
    flags.value = res.data
  } catch (e) {
    toast.showError((e as Error).message)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  isEditing.value = false
  editingId.value = ''
  form.value = emptyForm()
  dialogOpen.value = true
}

function openEdit(f: FeatureFlag) {
  isEditing.value = true
  editingId.value = f._id
  form.value = {
    key: f.key,
    name: f.name,
    description: f.description || '',
    group: f.group || '',
    defaultEnabled: f.defaultEnabled,
  }
  dialogOpen.value = true
}

async function handleSave() {
  try {
    if (isEditing.value) {
      await updateFeatureFlag(editingId.value, form.value)
      toast.showSuccess('フラグを更新しました')
    } else {
      await createFeatureFlag(form.value)
      toast.showSuccess('フラグを作成しました')
    }
    dialogOpen.value = false
    await loadList()
  } catch (e) {
    toast.showError((e as Error).message)
  }
}

async function handleToggle(f: FeatureFlag) {
  try {
    const result = await toggleFeatureFlag(f._id)
    f.defaultEnabled = result.defaultEnabled
    toast.showSuccess(`${f.key} を ${result.defaultEnabled ? 'ON' : 'OFF'} に切り替えました`)
  } catch (e) {
    toast.showError((e as Error).message)
  }
}

function confirmDelete(f: FeatureFlag) {
  deleteTarget.value = f
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteFeatureFlag(deleteTarget.value._id)
    toast.showSuccess('フラグを削除しました')
    deleteDialogOpen.value = false
    await loadList()
  } catch (e) {
    toast.showError((e as Error).message)
  }
}

onMounted(loadList)
</script>

<style scoped>
.feature-flag-settings {
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
