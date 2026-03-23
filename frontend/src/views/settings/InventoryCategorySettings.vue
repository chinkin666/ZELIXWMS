<template>
  <div class="inventory-category-settings">
    <PageHeader title="在庫区分一覧" :show-search="false">
      <template #actions>
        <Button variant="secondary" @click="handleSeedDefaults">デフォルト作成</Button>
        <Button variant="default" @click="openCreate">在庫区分を追加</Button>
      </template>
    </PageHeader>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="categories"
        row-key="_id"
        :search-columns="searchColumns"
        @search="handleSearchEvent"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[10, 20, 50, 100]"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog :open="dialogVisible" @update:open="dialogVisible = $event">
      <DialogContent>
        <DialogHeader><DialogTitle>{{ isEditing ? '在庫区分を編集' : '在庫区分を追加' }}</DialogTitle></DialogHeader>
      <div class="form-group">
        <label>コード <span class="text-destructive text-xs">*</span></label>
        <Input v-model="formData.code" type="text" placeholder="例: normal, returned" :disabled="isEditing && editingCategory?.isDefault" />
      </div>
      <div class="form-group">
        <label>名称 <span class="text-destructive text-xs">*</span></label>
        <Input v-model="formData.name" type="text" placeholder="例: 通常、返品" />
      </div>
      <div class="form-group">
        <label>説明</label>
        <Input v-model="formData.description" type="text" placeholder="在庫区分の説明" />
      </div>
      <div class="form-group">
        <label>色ラベル</label>
        <div class="color-input-row">
          <Input
            v-model="formData.colorLabel"
            type="color"
            class="form-color"
          />
          <Input v-model="formData.colorLabel" type="text" placeholder="#67c23a" />
          <span
            v-if="formData.colorLabel"
            class="color-badge color-preview"
            :style="{ backgroundColor: formData.colorLabel }"
          >プレビュー</span>
        </div>
      </div>
      <div class="form-group">
        <label>表示順</label>
        <Input v-model.number="formData.sortOrder" type="number" min="0" />
      </div>
      <div class="form-group">
        <label>
          <Checkbox :checked="formData.isActive" @update:checked="val => formData.isActive = val" />
          有効
        </label>
      </div>
    </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchInventoryCategories,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory,
  seedInventoryCategories,
} from '@/api/inventoryCategory'
import type { InventoryCategory, InventoryCategoryFormData } from '@/api/inventoryCategory'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

const { show: showToast } = useToast()
const { t } = useI18n()

const categories = ref<InventoryCategory[]>([])
const isLoading = ref(false)
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingCategory = ref<InventoryCategory | null>(null)
const globalSearchText = ref('')

const initialFormData = (): InventoryCategoryFormData & { isActive: boolean } => ({
  code: '',
  name: '',
  description: '',
  colorLabel: '#67c23a',
  sortOrder: 0,
  isActive: true,
})

const formData = reactive(initialFormData())

const resetForm = () => {
  const defaults = initialFormData()
  formData.code = defaults.code
  formData.name = defaults.name
  formData.description = defaults.description
  formData.colorLabel = defaults.colorLabel
  formData.sortOrder = defaults.sortOrder
  formData.isActive = defaults.isActive
}

// ---------------------------------------------------------------------------
// Search & Table columns
// ---------------------------------------------------------------------------
const baseColumns: TableColumn[] = [
  {
    key: 'code',
    dataKey: 'code',
    title: 'コード',
    width: 120,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    dataKey: 'name',
    title: '名称',
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'description',
    dataKey: 'description',
    title: '説明',
    width: 200,
    fieldType: 'string',
  },
  {
    key: 'colorLabel',
    dataKey: 'colorLabel',
    title: '色ラベル',
    width: 120,
    fieldType: 'string',
  },
  {
    key: 'isDefault',
    dataKey: 'isDefault',
    title: 'デフォルト',
    width: 100,
    fieldType: 'boolean',
  },
  {
    key: 'isActive',
    dataKey: 'isActive',
    title: '状態',
    width: 80,
    fieldType: 'boolean',
    searchable: true,
    searchType: 'boolean',
  },
  {
    key: 'sortOrder',
    dataKey: 'sortOrder',
    title: '表示順',
    width: 80,
    fieldType: 'number',
  },
]

const searchColumns: TableColumn[] = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'code') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: InventoryCategory }) =>
          h('code', { class: 'code-cell' }, rowData.code),
      }
    }
    if (col.key === 'description') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: InventoryCategory }) => rowData.description || '-',
      }
    }
    if (col.key === 'colorLabel') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: InventoryCategory }) =>
          rowData.colorLabel
            ? h('span', { class: 'color-badge', style: { backgroundColor: rowData.colorLabel } }, rowData.colorLabel)
            : '-',
      }
    }
    if (col.key === 'isDefault') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: InventoryCategory }) =>
          rowData.isDefault
            ? h('span', { class: 'o-badge o-badge-primary' }, 'デフォルト')
            : '',
      }
    }
    if (col.key === 'isActive') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: InventoryCategory }) =>
          h(
            'span',
            { class: rowData.isActive ? 'o-badge o-badge-success' : 'o-badge o-badge-info' },
            rowData.isActive ? '有効' : '無効',
          ),
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 140,
    cellRenderer: ({ rowData }: { rowData: InventoryCategory }) =>
      h('div', { class: 'action-cell' }, [
        h(Button, { variant: 'default', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(
          Button,
          {
            variant: 'destructive',
            size: 'sm',
            disabled: rowData.isDefault,
            title: rowData.isDefault ? 'デフォルト在庫区分は削除できません' : '',
            onClick: () => confirmDelete(rowData),
          },
          () => '削除',
        ),
      ]),
  },
]

// ---------------------------------------------------------------------------
// Search handler
// ---------------------------------------------------------------------------
const handleSearchEvent = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
  } else {
    globalSearchText.value = ''
  }
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
const loadCategories = async () => {
  isLoading.value = true
  try {
    const result = await fetchInventoryCategories()
    categories.value = result.data
  } catch (e: any) {
    showToast(e.message || '在庫区分の取得に失敗しました', 'danger')
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  isEditing.value = false
  editingCategory.value = null
  resetForm()
  dialogVisible.value = true
}

const openEdit = (cat: InventoryCategory) => {
  isEditing.value = true
  editingCategory.value = cat
  formData.code = cat.code
  formData.name = cat.name
  formData.description = cat.description || ''
  formData.colorLabel = cat.colorLabel || '#67c23a'
  formData.sortOrder = cat.sortOrder
  formData.isActive = cat.isActive
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formData.code.trim() || !formData.name.trim()) {
    showToast('コードと名称は必須です', 'danger')
    return
  }

  try {
    const payload: InventoryCategoryFormData = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      colorLabel: formData.colorLabel || undefined,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
    }

    if (isEditing.value && editingCategory.value) {
      await updateInventoryCategory(editingCategory.value._id, payload)
      showToast('在庫区分を更新しました', 'success')
    } else {
      await createInventoryCategory(payload)
      showToast('在庫区分を作成しました', 'success')
    }
    dialogVisible.value = false
    await loadCategories()
  } catch (e: any) {
    showToast(e.message || '保存に失敗しました', 'danger')
  }
}

const confirmDelete = async (cat: InventoryCategory) => {
  if (cat.isDefault) return
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await deleteInventoryCategory(cat._id)
    showToast('在庫区分を削除しました', 'success')
    await loadCategories()
  } catch (e: any) {
    showToast(e.message || '削除に失敗しました', 'danger')
  }
}

const handleSeedDefaults = async () => {
  try {
    const result = await seedInventoryCategories()
    const createdCount = result.results.filter((r) => r.status === 'created').length
    if (createdCount > 0) {
      showToast(`デフォルト在庫区分を${createdCount}件作成しました`, 'success')
    } else {
      showToast('デフォルト在庫区分は既に存在します', 'info')
    }
    await loadCategories()
  } catch (e: any) {
    showToast(e.message || 'デフォルト作成に失敗しました', 'danger')
  }
}

onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.inventory-category-settings {
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

.code-cell {
  font-family: monospace;
  font-size: 13px;
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 3px;
}

.color-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;
  font-weight: 500;
}

.o-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.o-badge-primary {
  background: var(--o-brand-primary, #714b67);
  color: #fff;
}

.o-badge-success {
  background: #f0f9eb;
  color: #67c23a;
}

.o-badge-info {
  background: #f4f4f5;
  color: #909399;
}

/* Form styles */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--o-gray-700, #303133);
}

.required {
  color: #f56c6c;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--o-brand-primary, #714b67);
}

.form-input:disabled {
  background: #f5f7fa;
  cursor: not-allowed;
}

.form-color {
  width: 40px;
  height: 36px;
  padding: 2px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input-row .form-input {
  flex: 1;
}

.color-preview {
  flex-shrink: 0;
}
</style>
