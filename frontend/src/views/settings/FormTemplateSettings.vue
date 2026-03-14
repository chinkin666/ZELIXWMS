<template>
  <div class="form-template-settings">
    <ControlPanel :title="t('wms.settings.formTemplateTitle', '帳票テンプレート')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">{{ t('wms.settings.addNew', '新規追加') }}</OButton>
      </template>
    </ControlPanel>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="templates"
        :height="560"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[10, 20, 50]"
      />
    </div>

    <!-- 作成ダイアログ / 新建对话框 -->
    <ODialog :open="createDialogVisible" :title="t('wms.settings.addFormTemplate', '帳票テンプレートを追加')" @close="createDialogVisible = false">
      <div class="o-form-group">
        <label class="form-label">{{ t('wms.settings.templateName', 'テンプレート名') }} <span class="required-badge">必須</span></label>
        <input class="o-input" v-model="createForm.name" :placeholder="t('wms.settings.templateNamePlaceholder', '例：ピッキングリスト')" />
      </div>
      <div class="o-form-group">
        <label class="form-label">{{ t('wms.settings.templateType', '種類') }} <span class="required-badge">必須</span></label>
        <select class="o-input" v-model="createForm.targetType">
          <option value="">{{ t('wms.settings.selectType', '種類を選択') }}</option>
          <option
            v-for="ft in formTypeRegistry"
            :key="ft.type"
            :value="ft.type"
          >{{ ft.label }}</option>
        </select>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="createDialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
        <OButton variant="primary" :disabled="saving" @click="handleCreate">{{ t('wms.common.create', '新規作成') }}</OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
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
  const found = formTypeRegistry.find((ft) => ft.type === type)
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

    // 編集画面へ遷移 / 跳转到编辑页面
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

// テーブルカラム定義 / 表格列定义
const tableColumns = computed((): TableColumn[] => [
  {
    key: 'name',
    dataKey: 'name',
    title: t('wms.settings.templateName', 'テンプレート名'),
    width: 280,
    fieldType: 'string',
  },
  {
    key: 'targetType',
    dataKey: 'targetType',
    title: t('wms.settings.templateType', '種類'),
    width: 180,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: FormTemplate }) => getTypeLabel(rowData.targetType),
  },
  {
    key: 'pageSize',
    dataKey: 'pageSize',
    title: t('wms.settings.paperSize', '用紙'),
    width: 120,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: FormTemplate }) =>
      `${rowData.pageSize} ${rowData.pageOrientation === 'portrait' ? t('wms.settings.portrait', '縦') : t('wms.settings.landscape', '横')}`,
  },
  {
    key: 'columns',
    title: t('wms.settings.columnCount', '列数'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: FormTemplate }) =>
      String(rowData.columns?.length ?? 0),
  },
  {
    key: 'isDefault',
    dataKey: 'isDefault',
    title: t('wms.settings.isDefault', 'デフォルト'),
    width: 100,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: FormTemplate }) =>
      rowData.isDefault
        ? h('span', { class: 'o-badge o-badge-success' }, t('wms.settings.yes', 'はい'))
        : '-',
  },
  {
    key: 'actions',
    title: t('wms.settings.actions', '操作'),
    width: 300,
    cellRenderer: ({ rowData }: { rowData: FormTemplate }) =>
      h('div', { style: 'display:flex;gap:6px;' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => t('wms.common.edit', '編集')),
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => duplicateFormTemplate(rowData) }, () => t('wms.settings.duplicate', '複製')),
        h(OButton, { variant: 'danger', size: 'sm', onClick: () => handleDelete(rowData) }, () => t('wms.common.delete', '削除')),
      ]),
  },
])

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
.required-badge { display:inline-block;background:#dc3545;color:#fff;font-size:10px;font-weight:700;line-height:1;padding:2px 5px;border-radius:3px;white-space:nowrap;vertical-align:middle;margin-left:4px; }
</style>
