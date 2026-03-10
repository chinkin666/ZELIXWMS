<template>
  <div class="print-template-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">印刷テンプレート</h1>
        <p class="page-subtitle">送り状印刷で利用するテンプレート（Canvas）を管理します</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新規追加</el-button>
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

    <el-dialog v-model="dialogVisible" :title="isEditing ? 'テンプレート編集' : 'テンプレート追加'" width="900px">
      <el-form :model="editForm" label-width="140px" label-position="left">
        <div class="form-row">
          <el-form-item label="テンプレート名" required>
            <el-input v-model="editForm.name" placeholder="例: ヤマトB2（メール便）" />
          </el-form-item>
          <el-form-item label="ピクセル解像度(mm)">
            <el-input v-model.number="editForm.canvas.pxPerMm" type="number" min="1" step="0.5" />
          </el-form-item>
        </div>

        <div class="form-row">
          <el-form-item label="幅(mm)" required>
            <el-input v-model.number="editForm.canvas.widthMm" type="number" min="1" step="1" />
          </el-form-item>
          <el-form-item label="高さ(mm)" required>
            <el-input v-model.number="editForm.canvas.heightMm" type="number" min="1" step="1" />
          </el-form-item>
        </div>

        <el-form-item label="プログラムコード" required>
          <el-input
            v-model="elementsJson"
            type="textarea"
            :rows="10"
            placeholder='例: [{"id":"t1","type":"text",...}]'
          />
          <div class="hint">
            プログラムコードでも直接編集ができます。可視編集は一覧の「レイアウト編集」から開けます。
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">キャンセル</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">{{ isEditing ? '更新' : '作成' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { ElButton, ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import type { PrintTemplate } from '@/types/printTemplate'
import { useRouter } from 'vue-router'
import { fetchPrintTemplates, fetchPrintTemplate, createPrintTemplate, updatePrintTemplate, deletePrintTemplate } from '@/api/printTemplates'
import { createEmptyPrintTemplate } from '@/utils/print/templateStorage'

const router = useRouter()
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
    const { id, meta, ...rest } = detail
    await createPrintTemplate({ ...rest, name: `${row.name}_copy` } as any)
    ElMessage.success('複製しました')
    reload()
  } catch (e: any) {
    ElMessage.error(e?.message || '複製に失敗しました')
  }
}

async function removeTemplate(row: PrintTemplate) {
  const ok = await ElMessageBox.confirm(`削除しますか？: ${row.name}`, '確認', {
    type: 'warning',
    confirmButtonText: '削除',
    cancelButtonText: 'キャンセル',
  }).catch(() => false)
  if (!ok) return

  await deletePrintTemplate(row.id)
  templates.value = templates.value.filter((t) => t.id !== row.id)
  ElMessage.success('削除しました')
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
    ElMessage.success(isEditing.value ? '更新しました' : '作成しました')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存に失敗しました')
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
        `${rowData.canvas?.widthMm ?? '-'}×${rowData.canvas?.heightMm ?? '-'}`,
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
          h(
            ElButton,
            { type: 'success', plain: true, size: 'small', onClick: () => openVisualEditor(rowData) },
            { default: () => 'レイアウト編集' },
          ),
          h(
            ElButton,
            { type: 'primary', plain: true, size: 'small', onClick: () => openEdit(rowData) },
            { default: () => 'コード編集' },
          ),
          h(
            ElButton,
            { type: 'info', plain: true, size: 'small', onClick: () => duplicatePrintTemplate(rowData) },
            { default: () => '複製' },
          ),
          h(
            ElButton,
            { type: 'danger', plain: true, size: 'small', onClick: () => removeTemplate(rowData) },
            { default: () => '削除' },
          ),
        ]),
    },
  ]
})

onMounted(() => reload())
</script>

<style scoped>
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

:deep(.action-cell .el-button) {
  margin: 0;
  min-width: 54px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border-width: 1px;
}

:deep(.action-cell .el-button--primary.is-plain) {
  border-color: var(--el-color-primary);
}

:deep(.action-cell .el-button--info.is-plain) {
  border-color: var(--el-color-info);
}

:deep(.action-cell .el-button--success.is-plain) {
  border-color: var(--el-color-success);
}

:deep(.action-cell .el-button--danger.is-plain) {
  border-color: var(--el-color-danger);
}
</style>


