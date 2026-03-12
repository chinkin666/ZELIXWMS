<template>
  <div class="inventory-category-settings">
    <ControlPanel title="在庫区分一覧" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="handleSeedDefaults">デフォルト作成</OButton>
        <OButton variant="primary" @click="openCreate">在庫区分を追加</OButton>
      </template>
    </ControlPanel>

    <div class="category-content">
      <div v-if="isLoading" class="loading-state">読み込み中...</div>

      <div v-else-if="categories.length === 0" class="empty-state">
        <p>在庫区分がありません</p>
        <p class="empty-hint">「デフォルト作成」ボタンで通常・返品・不良を追加できます</p>
      </div>

      <table v-else class="o-table">
        <thead>
          <tr>
            <th>コード</th>
            <th>名称</th>
            <th>説明</th>
            <th>色ラベル</th>
            <th>デフォルト</th>
            <th>状態</th>
            <th>表示順</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cat in categories" :key="cat._id">
            <td><code class="code-cell">{{ cat.code }}</code></td>
            <td>{{ cat.name }}</td>
            <td class="description-cell">{{ cat.description || '-' }}</td>
            <td>
              <span
                v-if="cat.colorLabel"
                class="color-badge"
                :style="{ backgroundColor: cat.colorLabel }"
              >{{ cat.colorLabel }}</span>
              <span v-else>-</span>
            </td>
            <td>
              <span v-if="cat.isDefault" class="o-badge o-badge-primary">デフォルト</span>
            </td>
            <td>
              <span
                class="o-badge"
                :class="cat.isActive ? 'o-badge-success' : 'o-badge-info'"
              >{{ cat.isActive ? '有効' : '無効' }}</span>
            </td>
            <td>{{ cat.sortOrder }}</td>
            <td class="actions-cell">
              <OButton variant="primary" size="sm" @click="openEdit(cat)">編集</OButton>
              <OButton
                variant="danger"
                size="sm"
                :disabled="cat.isDefault"
                :title="cat.isDefault ? 'デフォルト在庫区分は削除できません' : ''"
                @click="confirmDelete(cat)"
              >削除</OButton>
            </td>
          </tr>
        </tbody>
      </table>
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
        <label class="form-label">コード <span class="required">*</span></label>
        <input
          v-model="formData.code"
          type="text"
          class="form-input"
          placeholder="例: normal, returned"
          :disabled="isEditing && editingCategory?.isDefault"
        />
      </div>
      <div class="form-group">
        <label class="form-label">名称 <span class="required">*</span></label>
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
import { ref, reactive, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchInventoryCategories,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory,
  seedInventoryCategories,
} from '@/api/inventoryCategory'
import type { InventoryCategory, InventoryCategoryFormData } from '@/api/inventoryCategory'

const { show: showToast } = useToast()

const categories = ref<InventoryCategory[]>([])
const isLoading = ref(false)
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingCategory = ref<InventoryCategory | null>(null)

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
@import '@/styles/order-table.css';

.inventory-category-settings {
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.category-content {
  margin-top: 8px;
}

.loading-state,
.empty-state {
  padding: 60px 0;
  text-align: center;
  color: var(--o-gray-500, #909399);
}

.empty-hint {
  font-size: 13px;
  margin-top: 8px;
  color: #c0c4cc;
}

.o-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 4px;
}

.o-table th,
.o-table td {
  padding: 10px 14px;
  text-align: left;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  font-size: 14px;
}

.o-table th {
  background: #f5f7fa;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  white-space: nowrap;
}

.o-table tbody tr:hover {
  background: #f9f9fb;
}

.code-cell {
  font-family: monospace;
  font-size: 13px;
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 3px;
}

.description-cell {
  color: var(--o-gray-500, #909399);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.actions-cell {
  white-space: nowrap;
  display: flex;
  gap: 6px;
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
