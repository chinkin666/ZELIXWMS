<template>
  <div class="form-template-settings">
    <ControlPanel :title="t('wms.settings.formTemplateTitle', '帳票テンプレート')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">{{ t('wms.settings.addNew', '新規追加') }}</OButton>
      </template>
    </ControlPanel>

    <div class="table-section">
      <table class="o-list-table">
        <thead>
          <tr>
            <th style="min-width:200px">{{ t('wms.settings.templateName', 'テンプレート名') }}</th>
            <th style="min-width:180px">{{ t('wms.settings.templateType', '種類') }}</th>
            <th style="min-width:120px">{{ t('wms.settings.paperSize', '用紙') }}</th>
            <th style="min-width:100px;text-align:center">{{ t('wms.settings.isDefault') }}</th>
            <th style="width:100px;text-align:center">{{ t('wms.settings.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in templates" :key="row._id">
            <td>{{ row.name }}</td>
            <td>{{ getTypeLabel(row.targetType) }}</td>
            <td>{{ row.pageSize }} {{ row.pageOrientation === 'portrait' ? t('wms.settings.portrait', '縦') : t('wms.settings.landscape', '横') }}</td>
            <td style="text-align:center">
              <span v-if="row.isDefault" class="o-badge o-badge-success">{{ t('wms.settings.yes', 'はい') }}</span>
              <span v-else>-</span>
            </td>
            <td>
              <div class="action-cell">
                <OButton variant="primary" size="sm" @click="openEdit(row)">{{ t('wms.common.edit') }}</OButton>
                <OButton variant="secondary" size="sm" @click="duplicateFormTemplate(row)">{{ t('wms.settings.duplicate', '複製') }}</OButton>
                <OButton variant="danger" size="sm" @click="handleDelete(row)">{{ t('wms.common.delete') }}</OButton>
              </div>
            </td>
          </tr>
          <tr v-if="templates.length === 0">
            <td colspan="5" style="text-align:center;padding:40px;color:#909399">{{ t('wms.settings.noData', 'データがありません') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 作成ダイアログ -->
    <ODialog :open="createDialogVisible" :title="t('wms.settings.addFormTemplate', '帳票テンプレートを追加')" @close="createDialogVisible = false">
      <div class="o-form-group">
        <label class="form-label">{{ t('wms.settings.templateName', 'テンプレート名') }} <span class="required">*</span></label>
        <input class="o-input" v-model="createForm.name" :placeholder="t('wms.settings.templateNamePlaceholder', '例：ピッキングリスト')" />
      </div>
      <div class="o-form-group">
        <label class="form-label">{{ t('wms.settings.templateType', '種類') }} <span class="required">*</span></label>
        <select class="o-input" v-model="createForm.targetType">
          <option value="">{{ t('wms.settings.selectType', '種類を選択') }}</option>
          <option
            v-for="t in formTypeRegistry"
            :key="t.type"
            :value="t.type"
          >{{ t.label }}</option>
        </select>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="createDialogVisible = false">{{ t('wms.common.cancel') }}</OButton>
        <OButton variant="primary" :disabled="saving" @click="handleCreate">{{ t('wms.common.create') }}</OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import type { FormTemplate } from '@/types/formTemplate'
import { fetchFormTemplates, fetchFormTemplate, createFormTemplate, deleteFormTemplate } from '@/api/formTemplate'
import { formTypeRegistry, createDefaultColumns } from '@/utils/form-export/formFieldRegistry'
import { createDefaultFormTemplate } from '@/utils/form-export/pdfGenerator'

const router = useRouter()
const { t } = useI18n()
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
    showToast(e?.message || t('wms.settings.formTemplateFetchFailed', '帳票テンプレートの取得に失敗しました'), 'danger')
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
    showToast(t('wms.settings.templateNameRequired', 'テンプレート名を入力してください'), 'warning')
    return
  }
  if (!createForm.value.targetType) {
    showToast(t('wms.settings.typeRequired', '種類を選択してください'), 'warning')
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

    showToast(t('wms.settings.templateCreated', 'テンプレートを作成しました'), 'success')
    createDialogVisible.value = false

    // 編集画面へ遷移
    router.push(`/settings/form-templates/${created._id}`)
  } catch (e: any) {
    showToast(e?.message || t('wms.settings.createFailed', '作成に失敗しました'), 'danger')
  } finally {
    saving.value = false
  }
}

async function duplicateFormTemplate(row: FormTemplate) {
  try {
    const detail = await fetchFormTemplate(row._id)
    const { _id, tenantId: _tenantId, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = detail
    await createFormTemplate({ ...rest, name: `${row.name}_copy`, isDefault: false } as any)
    showToast(t('wms.settings.duplicated', '複製しました'), 'success')
    await loadTemplates()
  } catch (e: any) {
    showToast(e?.message || t('wms.settings.duplicateFailed', '複製に失敗しました'), 'danger')
  }
}

async function handleDelete(row: FormTemplate) {
  if (!confirm(t('wms.settings.confirmDelete', `「${row.name}」を削除しますか？`))) return

  try {
    await deleteFormTemplate(row._id)
    showToast(t('wms.settings.deleted', '削除しました'), 'success')
    await loadTemplates()
  } catch (e: any) {
    showToast(e?.message || t('wms.settings.deleteFailed', '削除に失敗しました'), 'danger')
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
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}




.table-section {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* .o-list-table base styles are defined globally in style.css */


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
.form-label { display: block; font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-700, #303133); margin-bottom: 0.25rem; }
.required { color: #f56c6c; }

/* 操作列スタイル - 縦並び / 操作列样式 - 垂直排列 */
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
