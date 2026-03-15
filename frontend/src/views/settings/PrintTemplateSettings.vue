<template>
  <div class="print-template-settings">
    <ControlPanel title="印刷テンプレート設定" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">テンプレートを作成</OButton>
      </template>
    </ControlPanel>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="templates"
        row-key="id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[10, 20, 50]"
      />
    </div>

    <ODialog :open="dialogVisible" :title="isEditing ? 'テンプレート編集' : 'テンプレート作成'" size="lg" @close="dialogVisible = false">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">テンプレート名 <span class="required-badge">必須</span></label>
          <input class="o-input" v-model="editForm.name" placeholder="例: ヤマトB2（メール便）" />
        </div>
        <div class="form-group">
          <label class="form-label">解像度 (px/mm)</label>
          <input class="o-input" v-model.number="editForm.canvas.pxPerMm" type="number" min="1" step="0.5" />
        </div>
        <div class="form-group">
          <label class="form-label">幅 (mm) <span class="required-badge">必須</span></label>
          <input class="o-input" v-model.number="editForm.canvas.widthMm" type="number" min="1" step="1" />
        </div>
        <div class="form-group">
          <label class="form-label">高さ (mm) <span class="required-badge">必須</span></label>
          <input class="o-input" v-model.number="editForm.canvas.heightMm" type="number" min="1" step="1" />
        </div>
      </div>

      <div class="form-group" style="margin-top:12px">
        <label class="form-label">エレメント定義 (JSON) <span class="required-badge">必須</span></label>
        <textarea
          class="o-input code-textarea"
          v-model="elementsJson"
          rows="12"
          placeholder='例: [{"id":"t1","type":"text",...}]'
        ></textarea>
        <div class="field-hint">
          JSONで直接編集できます。ビジュアル編集は一覧の「レイアウト編集」から開けます。
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
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import type { PrintTemplate } from '@/types/printTemplate'
import { useRouter } from 'vue-router'
import { fetchPrintTemplates, fetchPrintTemplate, createPrintTemplate, updatePrintTemplate, deletePrintTemplate } from '@/api/printTemplates'
import { createEmptyPrintTemplate } from '@/utils/print/templateStorage'

const router = useRouter()
const { show: showToast } = useToast()
const { t } = useI18n()
const templates = ref<PrintTemplate[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const editForm = ref<PrintTemplate>(createEmptyPrintTemplate())
const elementsJson = ref<string>('[]')

const isEditing = computed(() => Boolean(editingId.value))

function reload() {
  fetchPrintTemplates()
    .then((list) => { templates.value = Array.isArray(list) ? list : [] })
    .catch(() => { templates.value = [] })
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
  if (!confirm(`「${row.name}」を削除しますか？`)) return
  await deletePrintTemplate(row.id)
  templates.value = templates.value.filter((t) => t.id !== row.id)
  showToast('削除しました', 'success')
}

async function handleSave() {
  saving.value = true
  try {
    const parsed = JSON.parse(elementsJson.value || '[]')
    if (!Array.isArray(parsed)) throw new Error('elements JSON must be an array')

    const next: PrintTemplate = { ...editForm.value, elements: parsed }

    const isUpdate = templates.value.some((t) => t.id === next.id)
    if (isUpdate) {
      const saved = await updatePrintTemplate(next.id, next as any)
      next.id = saved.id
    } else {
      const created = await createPrintTemplate({ ...(next as any), id: undefined })
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

const tableColumns = computed((): TableColumn[] => [
  { key: 'name', dataKey: 'name', title: 'テンプレート名', width: 280, fieldType: 'string' },
  {
    key: 'size',
    dataKey: 'canvas',
    title: 'サイズ (mm)',
    width: 120,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: PrintTemplate }) =>
      `${rowData.canvas?.widthMm ?? '-'} × ${rowData.canvas?.heightMm ?? '-'}`,
  },
  {
    key: 'elements',
    title: 'エレメント数',
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: PrintTemplate }) =>
      String(rowData.elements?.length ?? 0),
  },
  {
    key: 'actions',
    title: '操作',
    width: 360,
    cellRenderer: ({ rowData }: { rowData: PrintTemplate }) =>
      h('div', { style: 'display:flex;gap:6px;' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openVisualEditor(rowData) }, () => 'レイアウト編集'),
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => openEdit(rowData) }, () => 'JSON編集'),
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => duplicatePrintTemplate(rowData) }, () => '複製'),
        h(OButton, { variant: 'danger', size: 'sm', onClick: () => removeTemplate(rowData) }, () => '削除'),
      ]),
  },
])

onMounted(() => reload())
</script>

<style scoped>
.print-template-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.table-section { width: 100%; }

/* Form */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--o-gray-700); }
.required-badge {
  display: inline-block; background: #dc3545; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 1;
  padding: 2px 5px; border-radius: 3px; white-space: nowrap;
  vertical-align: middle; margin-left: 4px;
}
.field-hint { font-size: 11px; color: var(--o-gray-400); margin-top: 4px; }
.code-textarea { resize: vertical; font-family: var(--o-font-family-mono); font-size: 12px; line-height: 1.5; }

</style>
