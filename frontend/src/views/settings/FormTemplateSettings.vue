<template>
  <div class="form-template-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">帳票テンプレート</h1>
        <p class="page-subtitle">ピッキングリスト・出荷明細リストなどの帳票テンプレートを管理します</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新規追加</el-button>
    </div>

    <div class="table-section">
      <el-table :data="templates" style="width: 100%" :height="520" border>
        <el-table-column prop="name" label="テンプレート名" min-width="200" />
        <el-table-column prop="targetType" label="種類" min-width="180">
          <template #default="{ row }">
            {{ getTypeLabel(row.targetType) }}
          </template>
        </el-table-column>
        <el-table-column prop="pageSize" label="用紙" min-width="120">
          <template #default="{ row }">
            {{ row.pageSize }} {{ row.pageOrientation === 'portrait' ? '縦' : '横' }}
          </template>
        </el-table-column>
        <el-table-column prop="isDefault" label="デフォルト" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isDefault" type="success" size="small">はい</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-cell">
              <el-button type="primary" size="small" plain @click="openEdit(row)">編集</el-button>
              <el-button type="info" size="small" plain @click="duplicateFormTemplate(row)">複製</el-button>
              <el-button type="danger" size="small" plain @click="handleDelete(row)">削除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 作成ダイアログ -->
    <el-dialog v-model="createDialogVisible" title="帳票テンプレートを追加" width="500px">
      <el-form :model="createForm" label-width="140px" label-position="left">
        <el-form-item label="テンプレート名" required>
          <el-input v-model="createForm.name" placeholder="例：ピッキングリスト" />
        </el-form-item>
        <el-form-item label="種類" required>
          <el-select v-model="createForm.targetType" placeholder="種類を選択" style="width: 100%">
            <el-option
              v-for="t in formTypeRegistry"
              :key="t.type"
              :label="t.label"
              :value="t.type"
            >
              <div>
                <div>{{ t.label }}</div>
                <div style="font-size: 11px; color: #909399;">{{ t.description }}</div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">キャンセル</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">作成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormTemplate } from '@/types/formTemplate'
import { fetchFormTemplates, fetchFormTemplate, createFormTemplate, deleteFormTemplate } from '@/api/formTemplate'
import { formTypeRegistry, createDefaultColumns } from '@/utils/form-export/formFieldRegistry'
import { createDefaultFormTemplate } from '@/utils/form-export/pdfGenerator'

const router = useRouter()
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
    ElMessage.error(e?.message || '帳票テンプレートの取得に失敗しました')
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
    ElMessage.warning('テンプレート名を入力してください')
    return
  }
  if (!createForm.value.targetType) {
    ElMessage.warning('種類を選択してください')
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

    ElMessage.success('テンプレートを作成しました')
    createDialogVisible.value = false

    // 編集画面へ遷移
    router.push(`/settings/form-templates/${created._id}`)
  } catch (e: any) {
    ElMessage.error(e?.message || '作成に失敗しました')
  } finally {
    saving.value = false
  }
}

async function duplicateFormTemplate(row: FormTemplate) {
  try {
    const detail = await fetchFormTemplate(row._id)
    const { _id, tenantId, createdAt, updatedAt, ...rest } = detail
    await createFormTemplate({ ...rest, name: `${row.name}_copy`, isDefault: false } as any)
    ElMessage.success('複製しました')
    await loadTemplates()
  } catch (e: any) {
    ElMessage.error(e?.message || '複製に失敗しました')
  }
}

async function handleDelete(row: FormTemplate) {
  const confirmed = await ElMessageBox.confirm(
    `「${row.name}」を削除しますか？`,
    '削除確認',
    {
      confirmButtonText: '削除',
      cancelButtonText: 'キャンセル',
      type: 'warning',
    },
  ).catch(() => false)

  if (!confirmed) return

  try {
    await deleteFormTemplate(row._id)
    ElMessage.success('削除しました')
    await loadTemplates()
  } catch (e: any) {
    ElMessage.error(e?.message || '削除に失敗しました')
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

:deep(.action-cell .el-button--danger.is-plain) {
  border-color: var(--el-color-danger);
}
</style>
