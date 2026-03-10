<template>
  <div class="auto-processing-settings">
    <div class="page-header">
      <div>
        <h1 class="page-title">自動処理設定</h1>
        <p class="page-subtitle">注文の状態変更時に自動的に実行されるルールを管理します。ドラッグで並び替えでき、上にあるルールが優先的に実行されます。</p>
      </div>
      <div class="page-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">ルールを追加</el-button>
      </div>
    </div>

    <div class="rules-list" v-loading="isLoading">
      <div v-if="rules.length === 0" class="empty-state">
        <el-empty description="自動処理ルールがありません" />
      </div>

      <draggable
        v-else
        v-model="rules"
        item-key="_id"
        handle=".drag-handle"
        ghost-class="drag-ghost"
        @end="onDragEnd"
      >
        <template #item="{ element: rule }">
          <div class="rule-card" :class="{ disabled: !rule.enabled }">
            <div class="drag-handle">
              <el-icon :size="18"><Rank /></el-icon>
            </div>

            <div class="rule-info">
              <div class="rule-header">
                <span class="rule-name">{{ rule.name }}</span>
                <el-tag
                  :type="rule.enabled ? 'success' : 'info'"
                  size="small"
                >
                  {{ rule.enabled ? '有効' : '無効' }}
                </el-tag>
                <el-tag
                  :type="rule.triggerMode === 'auto' ? '' : 'warning'"
                  size="small"
                >
                  {{ rule.triggerMode === 'auto' ? '自動' : '手動' }}
                </el-tag>
                <el-tag
                  v-if="rule.allowRerun"
                  type="info"
                  size="small"
                >
                  再実行可
                </el-tag>
              </div>
              <div class="rule-details">
                <span
                  v-for="ev in rule.triggerEvents"
                  :key="ev"
                  class="trigger-event-tag"
                >
                  {{ TRIGGER_EVENT_LABELS[ev as TriggerEvent] || ev }}
                </span>
                <span v-if="rule.triggerEvents.length === 0" class="no-events">
                  トリガーなし
                </span>
              </div>
              <div v-if="rule.memo" class="rule-memo">{{ rule.memo }}</div>
            </div>

            <div class="rule-actions">
              <el-switch
                :model-value="rule.enabled"
                @change="(val: boolean) => handleEnableChange(rule, val)"
              />
              <el-button type="primary" plain size="small" @click="openEdit(rule)">編集</el-button>
              <el-button
                type="success"
                plain
                size="small"
                @click="handleManualRun(rule)"
                :loading="runningRuleId === rule._id"
              >
                手動で実行する
              </el-button>
              <el-button type="info" plain size="small" @click="duplicateRule(rule)">複製</el-button>
              <el-button type="danger" plain size="small" @click="confirmDelete(rule)">削除</el-button>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <AutoProcessingRuleFormDialog
      v-model="dialogVisible"
      :is-editing="isEditing"
      :initial-data="editingRule"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus, Rank } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import draggable from 'vuedraggable'
import {
  fetchAutoProcessingRules,
  createAutoProcessingRule,
  updateAutoProcessingRule,
  deleteAutoProcessingRule,
  reorderAutoProcessingRules,
  runAutoProcessingRule,
} from '@/api/autoProcessingRule'
import type { AutoProcessingRule, AutoProcessingRuleFormData } from '@/types/autoProcessingRule'
import { TRIGGER_EVENT_LABELS, type TriggerEvent } from '@/types/autoProcessingRule'
import AutoProcessingRuleFormDialog from '@/components/auto-processing/AutoProcessingRuleFormDialog.vue'

const rules = ref<AutoProcessingRule[]>([])
const isLoading = ref(false)
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingRule = ref<AutoProcessingRule | null>(null)
const runningRuleId = ref<string | null>(null)

const loadRules = async () => {
  isLoading.value = true
  try {
    rules.value = await fetchAutoProcessingRules()
  } catch (e: any) {
    ElMessage.error(e.message || 'ルールの取得に失敗しました')
  } finally {
    isLoading.value = false
  }
}

const openCreate = () => {
  isEditing.value = false
  editingRule.value = null
  dialogVisible.value = true
}

const openEdit = (rule: AutoProcessingRule) => {
  isEditing.value = true
  editingRule.value = rule
  dialogVisible.value = true
}

const handleSubmit = async (data: AutoProcessingRuleFormData) => {
  try {
    if (isEditing.value && editingRule.value) {
      await updateAutoProcessingRule(editingRule.value._id, data)
      ElMessage.success('ルールを更新しました')
    } else {
      await createAutoProcessingRule(data)
      ElMessage.success('ルールを作成しました')
    }
    dialogVisible.value = false
    await loadRules()
  } catch (e: any) {
    ElMessage.error(e.message || '保存に失敗しました')
  }
}

const handleEnableChange = async (rule: AutoProcessingRule, enabled: boolean) => {
  try {
    await updateAutoProcessingRule(rule._id, { enabled })
    rule.enabled = enabled
    ElMessage.success(enabled ? 'ルールを有効にしました' : 'ルールを無効にしました')
  } catch (e: any) {
    ElMessage.error(e.message || '更新に失敗しました')
  }
}

const confirmDelete = async (rule: AutoProcessingRule) => {
  try {
    await ElMessageBox.confirm(
      `ルール「${rule.name}」を削除しますか？`,
      '削除の確認',
      {
        confirmButtonText: '削除',
        cancelButtonText: 'キャンセル',
        type: 'warning',
      },
    )
    await deleteAutoProcessingRule(rule._id)
    ElMessage.success('ルールを削除しました')
    await loadRules()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '削除に失敗しました')
    }
  }
}

const handleManualRun = async (rule: AutoProcessingRule) => {
  try {
    await ElMessageBox.confirm(
      `ルール「${rule.name}」を手動で実行しますか？条件に合致するすべての注文に対して動作が実行されます。`,
      '手動実行の確認',
      {
        confirmButtonText: '実行',
        cancelButtonText: 'キャンセル',
        type: 'warning',
      },
    )
    runningRuleId.value = rule._id
    const result = await runAutoProcessingRule(rule._id)
    ElMessage.success(
      `実行完了: ${result.data.matched}件一致 / ${result.data.executed}件実行` +
      (result.data.errors > 0 ? ` / ${result.data.errors}件エラー` : ''),
    )
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '手動実行に失敗しました')
    }
  } finally {
    runningRuleId.value = null
  }
}

const duplicateRule = async (rule: AutoProcessingRule) => {
  try {
    const { _id, createdAt, updatedAt, priority, ...rest } = rule
    await createAutoProcessingRule({
      ...rest,
      name: `${rule.name}_copy`,
      enabled: false,
    })
    ElMessage.success('ルールを複製しました')
    await loadRules()
  } catch (e: any) {
    ElMessage.error(e.message || 'ルールの複製に失敗しました')
  }
}

const onDragEnd = async () => {
  try {
    const orderedIds = rules.value.map((r) => r._id)
    await reorderAutoProcessingRules(orderedIds)
  } catch (e: any) {
    ElMessage.error(e.message || '優先順位の更新に失敗しました')
    await loadRules()
  }
}

onMounted(() => {
  loadRules()
})
</script>

<style scoped>
.auto-processing-settings {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.page-actions {
  display: flex;
  gap: 12px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  padding: 60px 0;
}

.rule-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: box-shadow 0.2s;
}

.rule-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.rule-card.disabled {
  opacity: 0.6;
  background: #f5f7fa;
}

.drag-handle {
  display: flex;
  align-items: center;
  cursor: grab;
  color: #c0c4cc;
  padding: 4px;
  flex-shrink: 0;
}

.drag-handle:hover {
  color: #909399;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-ghost {
  opacity: 0.4;
  background: #ecf5ff;
  border: 1px dashed #409eff;
}

.rule-info {
  flex: 1;
  min-width: 0;
}

.rule-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.rule-name {
  font-size: 15px;
  font-weight: 500;
  color: #303133;
}

.rule-details {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.trigger-event-tag {
  display: inline-block;
  font-size: 12px;
  color: #606266;
  background: #f0f2f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.no-events {
  font-size: 12px;
  color: #c0c4cc;
}

.rule-memo {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.rule-actions :deep(.el-button) {
  margin: 0;
  min-width: 54px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border-width: 1px;
}

.rule-actions :deep(.el-button--primary.is-plain) {
  border-color: var(--el-color-primary);
}

.rule-actions :deep(.el-button--info.is-plain) {
  border-color: var(--el-color-info);
}

.rule-actions :deep(.el-button--success.is-plain) {
  border-color: var(--el-color-success);
}

.rule-actions :deep(.el-button--danger.is-plain) {
  border-color: var(--el-color-danger);
}
</style>
