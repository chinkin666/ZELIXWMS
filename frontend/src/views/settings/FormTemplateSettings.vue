<template>
  <div class="form-template-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">帳票テンプレート</h1>
        <p class="page-subtitle">ピッキングリスト・出荷明細リストなどの帳票テンプレートを管理します</p>
      </div>
      <button class="o-btn o-btn-primary" @click="openCreate">新規追加</button>
    </div>

    <div class="table-section">
      <table class="o-list-table">
        <thead>
          <tr>
            <th style="min-width:200px">テンプレート名</th>
            <th style="min-width:180px">種類</th>
            <th style="min-width:120px">用紙</th>
            <th style="min-width:100px;text-align:center">デフォルト</th>
            <th style="width:100px;text-align:center">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in templates" :key="row._id">
            <td>{{ row.name }}</td>
            <td>{{ getTypeLabel(row.targetType) }}</td>
            <td>{{ row.pageSize }} {{ row.pageOrientation === 'portrait' ? '縦' : '横' }}</td>
            <td style="text-align:center">
              <span v-if="row.isDefault" class="o-badge o-badge-success">はい</span>
              <span v-else>-</span>
            </td>
            <td>
              <div class="action-cell">
                <button class="o-btn o-btn-sm o-btn-outline-primary" @click="openEdit(row)">編集</button>
                <button class="o-btn o-btn-sm o-btn-outline-secondary" @click="duplicateFormTemplate(row)">複製</button>
                <button class="o-btn o-btn-sm o-btn-outline-danger" @click="handleDelete(row)">削除</button>
              </div>
            </td>
          </tr>
          <tr v-if="templates.length === 0">
            <td colspan="5" style="text-align:center;padding:40px;color:#909399">データがありません</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 作成ダイアログ -->
    <ODialog :open="createDialogVisible" title="帳票テンプレートを追加" @close="createDialogVisible = false">
      <div class="o-form-group">
        <label class="o-form-label">テンプレート名 <span class="required">*</span></label>
        <input class="o-input" v-model="createForm.name" placeholder="例：ピッキングリスト" />
      </div>
      <div class="o-form-group">
        <label class="o-form-label">種類 <span class="required">*</span></label>
        <select class="o-input" v-model="createForm.targetType">
          <option value="">種類を選択</option>
          <option
            v-for="t in formTypeRegistry"
            :key="t.type"
            :value="t.type"
          >{{ t.label }}</option>
        </select>
      </div>
      <template #footer>
        <button class="o-btn o-btn-secondary" @click="createDialogVisible = false">キャンセル</button>
        <button class="o-btn o-btn-primary" :disabled="saving" @click="handleCreate">作成</button>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import ODialog from '@/components/odoo/ODialog.vue'
import type { FormTemplate } from '@/types/formTemplate'
import { fetchFormTemplates, fetchFormTemplate, createFormTemplate, deleteFormTemplate } from '@/api/formTemplate'
import { formTypeRegistry, createDefaultColumns } from '@/utils/form-export/formFieldRegistry'
import { createDefaultFormTemplate } from '@/utils/form-export/pdfGenerator'

const router = useRouter()
const { show: showToast } = useToast()
const templates = ref<FormTemplate[]>([])
const createDialogVisible = ref(false)
const saving = ref(false)

const createForm = ref({
  name: '',
  targetType: '',
})

function getTypeLabel(type: string): string {
  const found = formTypeRegistry.find((t) => t.type === type)
  return found?.label || type
}

async function loadTemplates() {
  try {
    templates.value = await fetchFormTemplates()
  } catch (e: any) {
    showToast(e?.message || '帳票テンプレートの取得に失敗しました', 'danger')
  }
}

function openCreate() {
  createForm.value = { name: '', targetType: '' }
  createDialogVisible.value = true
}

function openEdit(row: FormTemplate) {
  router.push(`/settings/form-templates/${row._id}`)
}

async function handleCreate() {
  if (!createForm.value.name.trim()) {
    showToast('テンプレート名を入力してください', 'warning')
    return
  }
  if (!createForm.value.targetType) {
    showToast('種類を選択してください', 'warning')
    return
  }

  saving.value = true
  try {
    const columns = createDefaultColumns(createForm.value.targetType)
    const defaultTemplate = createDefaultFormTemplate(
      createForm.value.targetType,
      createForm.value.name,
      columns,
    )

    const created = await createFormTemplate({
      ...defaultTemplate,
      name: createForm.value.name,
      targetType: createForm.value.targetType,
      columns,
    } as any)

    showToast('テンプレートを作成しました', 'success')
    createDialogVisible.value = false

    // 編集画面へ遷移
    router.push(`/settings/form-templates/${created._id}`)
  } catch (e: any) {
    showToast(e?.message || '作成に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

async function duplicateFormTemplate(row: FormTemplate) {
  try {
    const detail = await fetchFormTemplate(row._id)
    const { _id, tenantId, createdAt, updatedAt, ...rest } = detail
    await createFormTemplate({ ...rest, name: `${row.name}_copy`, isDefault: false } as any)
    showToast('複製しました', 'success')
    await loadTemplates()
  } catch (e: any) {
    showToast(e?.message || '複製に失敗しました', 'danger')
  }
}

async function handleDelete(row: FormTemplate) {
  if (!confirm(`「${row.name}」を削除しますか？`)) return

  try {
    await deleteFormTemplate(row._id)
    showToast('削除しました', 'success')
    await loadTemplates()
  } catch (e: any) {
    showToast(e?.message || '削除に失敗しました', 'danger')
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.form-template-settings {
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #2a3474;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 12px;
}

.table-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.o-list-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.o-list-table th, .o-list-table td {
  padding: 10px 12px;
  border: 1px solid var(--o-border-color, #ebeef5);
  text-align: left;
}
.o-list-table th {
  background: var(--o-list-header-bg, #f5f7fa);
  font-weight: 500;
  font-size: 13px;
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
.o-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.o-btn-primary { background: var(--o-brand-primary, #714b67); color: #fff; border-color: var(--o-brand-primary, #714b67); }
.o-btn-secondary { background: var(--o-view-background, #fff); color: var(--o-gray-700, #303133); }
.o-btn-sm { padding: 4px 10px; font-size: 13px; }
.o-btn-outline-primary { background: transparent; color: var(--o-brand-primary, #714b67); border-color: var(--o-brand-primary, #714b67); }
.o-btn-outline-secondary { background: transparent; color: var(--o-gray-600, #909399); border-color: var(--o-gray-600, #909399); }
.o-btn-outline-danger { background: transparent; color: #f56c6c; border-color: #f56c6c; }

.o-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.o-badge-success { background: #f0f9eb; color: #67c23a; }

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

.o-form-group { margin-bottom: 1rem; }
.o-form-label { display: block; font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-700, #303133); margin-bottom: 0.25rem; }
.required { color: #f56c6c; }

/* 操作列样式 - 垂直排列 */
.action-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 4px;
}

.action-cell .o-btn {
  margin: 0;
  min-width: 54px;
}
</style>
