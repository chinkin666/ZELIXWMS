<template>
  <div class="print-template-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">印刷テンプレート</h1>
        <p class="page-subtitle">送り状印刷で利用するテンプレート（Canvas）を管理します</p>
      </div>
      <OButton variant="primary" @click="openCreate">新規追加</OButton>
    </div>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="templates"
        :height="520"
        row-key="id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="10"
        :page-sizes="[10, 20, 50]"
      />
    </div>

    <ODialog :open="dialogVisible" :title="isEditing ? 'テンプレート編集' : 'テンプレート追加'" @close="dialogVisible = false">
      <div class="form-row">
        <div class="o-form-group">
          <label class="o-form-label">テンプレート名 <span class="required">*</span></label>
          <input class="o-input" v-model="editForm.name" placeholder="例: ヤマトB2（メール便）" />
        </div>
        <div class="o-form-group">
          <label class="o-form-label">ピクセル解像度(mm)</label>
          <input class="o-input" v-model.number="editForm.canvas.pxPerMm" type="number" min="1" step="0.5" />
        </div>
      </div>

      <div class="form-row">
        <div class="o-form-group">
          <label class="o-form-label">幅(mm) <span class="required">*</span></label>
          <input class="o-input" v-model.number="editForm.canvas.widthMm" type="number" min="1" step="1" />
        </div>
        <div class="o-form-group">
          <label class="o-form-label">高さ(mm) <span class="required">*</span></label>
          <input class="o-input" v-model.number="editForm.canvas.heightMm" type="number" min="1" step="1" />
        </div>
      </div>

      <div class="o-form-group">
        <label class="o-form-label">プログラムコード <span class="required">*</span></label>
        <textarea
          class="o-input"
          v-model="elementsJson"
          rows="10"
          placeholder='例: [{"id":"t1","type":"text",...}]'
        ></textarea>
        <div class="hint">
          プログラムコードでも直接編集ができます。可視編集は一覧の「レイアウト編集」から開けます。
        </div>
      </div>

      <template #footer>
        <OButton variant="secondary" @click="dialogVisible = false">キャンセル</OButton>
        <OButton variant="primary" :disabled="saving" @click="handleSave">{{ isEditing ? '更新' : '作成' }}</OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import type { PrintTemplate } from '@/types/printTemplate'
import { useRouter } from 'vue-router'
import { fetchPrintTemplates, fetchPrintTemplate, createPrintTemplate, updatePrintTemplate, deletePrintTemplate } from '@/api/printTemplates'
import { createEmptyPrintTemplate } from '@/utils/print/templateStorage'

const router = useRouter()
const { show: showToast } = useToast()
const templates = ref<PrintTemplate[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const editForm = ref<PrintTemplate>(createEmptyPrintTemplate())
const elementsJson = ref<string>('[]')

const isEditing = computed(() => Boolean(editingId.value))

function reload() {
  fetchPrintTemplates()
    .then((list) => {
      templates.value = Array.isArray(list) ? list : []
    })
    .catch(() => {
      templates.value = []
    })
}

function openCreate() {
  editingId.value = null
  editForm.value = createEmptyPrintTemplate()
  elementsJson.value = JSON.stringify(editForm.value.elements ?? [], null, 2)
  dialogVisible.value = true
}

function openEdit(row: PrintTemplate) {
  editingId.value = row.id
  editForm.value = JSON.parse(JSON.stringify(row)) as PrintTemplate
  elementsJson.value = JSON.stringify(editForm.value.elements ?? [], null, 2)
  dialogVisible.value = true
}

function openVisualEditor(row: PrintTemplate) {
  router.push(`/settings/print-templates/${encodeURIComponent(row.id)}`)
}

async function duplicatePrintTemplate(row: PrintTemplate) {
  try {
    const detail = await fetchPrintTemplate(row.id)
    const { id: _id, meta: _meta, ...rest } = detail
    await createPrintTemplate({ ...rest, name: `${row.name}_copy` } as any)
    showToast('複製しました', 'success')
    reload()
  } catch (e: any) {
    showToast(e?.message || '複製に失敗しました', 'danger')
  }
}

async function removeTemplate(row: PrintTemplate) {
  if (!confirm(`削除しますか？: ${row.name}`)) return

  await deletePrintTemplate(row.id)
  templates.value = templates.value.filter((t) => t.id !== row.id)
  showToast('削除しました', 'success')
}

async function handleSave() {
  saving.value = true
  try {
    const parsed = JSON.parse(elementsJson.value || '[]')
    if (!Array.isArray(parsed)) throw new Error('elements JSON must be an array')

    const next: PrintTemplate = {
      ...editForm.value,
      elements: parsed,
    }

    const isUpdate = templates.value.some((t) => t.id === next.id)
    if (isUpdate) {
      const saved = await updatePrintTemplate(next.id, next as any)
      next.id = saved.id
    } else {
      const created = await createPrintTemplate({
        ...(next as any),
        id: undefined,
      })
      next.id = created.id
    }

    const list = [...templates.value]
    const idx = list.findIndex((t) => t.id === next.id)
    if (idx >= 0) list[idx] = next
    else list.unshift(next)

    templates.value = list
    dialogVisible.value = false
    showToast(isEditing.value ? '更新しました' : '作成しました', 'success')
  } catch (e: any) {
    showToast(e?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

const tableColumns = computed((): TableColumn[] => {
  return [
    { key: 'name', dataKey: 'name', title: 'テンプレート名', width: 300, fieldType: 'string' },
    {
      key: 'size',
      dataKey: 'canvas',
      title: 'サイズ(mm)',
      width: 160,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: PrintTemplate }) =>
        `${rowData.canvas?.widthMm ?? '-'}x${rowData.canvas?.heightMm ?? '-'}`,
    },
    {
      key: 'actions',
      dataKey: 'actions',
      title: '操作',
      width: 180,
      fixed: 'right',
      align: 'center',
      cellRenderer: ({ rowData }: { rowData: PrintTemplate }) =>
        h('div', { class: 'action-cell' }, [
          h(OButton, { variant: 'success', size: 'sm', onClick: () => openVisualEditor(rowData) }, () => 'レイアウト編集'),
          h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => 'コード編集'),
          h(OButton, { variant: 'secondary', size: 'sm', onClick: () => duplicatePrintTemplate(rowData) }, () => '複製'),
          h(OButton, { variant: 'danger', size: 'sm', onClick: () => removeTemplate(rowData) }, () => '削除'),
        ]),
    },
  ]
})

onMounted(() => reload())
</script>

<style scoped>
.print-template-settings {
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 12px;
}
.page-title {
  margin: 0;
  font-size: 20px;
}
.page-subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 12px;
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
.o-btn-outline-success { background: transparent; color: #67c23a; border-color: #67c23a; }
.o-btn-outline-danger { background: transparent; color: #f56c6c; border-color: #f56c6c; }

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
textarea.o-input { resize: vertical; font-family: monospace; }

.o-form-group { margin-bottom: 1rem; }
.o-form-label { display: block; font-size: var(--o-font-size-small, 13px); font-weight: 500; color: var(--o-gray-700, #303133); margin-bottom: 0.25rem; }
.required { color: #f56c6c; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.hint {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
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

:deep(.action-cell .o-btn) {
  margin: 0;
  min-width: 54px;
}
</style>
