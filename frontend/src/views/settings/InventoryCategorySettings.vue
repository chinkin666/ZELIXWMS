<template>
  <div class="inventory-category-settings">
    <ControlPanel title="在庫区分一覧" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="handleSeedDefaults">デフォルト作成</OButton>
        <OButton variant="primary" @click="openCreate">在庫区分を追加</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="inventoryCategorySearch"
      @search="handleSearchEvent"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="categories"
        :height="520"
        row-key="_id"
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[10, 20, 50, 100]"
        :global-search-text="globalSearchText"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog
      v-model="dialogVisible"
      :title="isEditing ? '在庫区分を編集' : '在庫区分を追加'"
      size="md"
      @confirm="handleSubmit"
      @close="dialogVisible = false"
    >
      <div class="form-group">
        <label class="form-label">コード <span class="required-badge">必須</span></label>
        <input
          v-model="formData.code"
          type="text"
          class="form-input"
          placeholder="例: normal, returned"
          :disabled="isEditing && editingCategory?.isDefault"
        />
      </div>
      <div class="form-group">
        <label class="form-label">名称 <span class="required-badge">必須</span></label>
        <input
          v-model="formData.name"
          type="text"
          class="form-input"
          placeholder="例: 通常、返品"
        />
      </div>
      <div class="form-group">
        <label class="form-label">説明</label>
        <input
          v-model="formData.description"
          type="text"
          class="form-input"
          placeholder="在庫区分の説明"
        />
      </div>
      <div class="form-group">
        <label class="form-label">色ラベル</label>
        <div class="color-input-row">
          <input
            v-model="formData.colorLabel"
            type="color"
            class="form-color"
          />
          <input
            v-model="formData.colorLabel"
            type="text"
            class="form-input"
            placeholder="#67c23a"
          />
          <span
            v-if="formData.colorLabel"
            class="color-badge color-preview"
            :style="{ backgroundColor: formData.colorLabel }"
          >プレビュー</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">表示順</label>
        <input
          v-model.number="formData.sortOrder"
          type="number"
          class="form-input"
          min="0"
        />
      </div>
      <div class="form-group">
        <label class="form-label">
          <input
            v-model="formData.isActive"
            type="checkbox"
          />
          有効
        </label>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchInventoryCategories,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory,
  seedInventoryCategories,
} from '@/api/inventoryCategory'
import type { InventoryCategory, InventoryCategoryFormData } from '@/api/inventoryCategory'

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
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(
          OButton,
          {
            variant: 'danger',
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
  if (!confirm(`在庫区分「${cat.name}」を削除しますか？`)) return
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
