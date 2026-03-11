<template>
  <div class="auto-processing-settings">
    <ControlPanel title="自動処理設定" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">ルールを追加</OButton>
      </template>
    </ControlPanel>

    <div class="rules-list">
      <div v-if="isLoading" class="loading-state">読み込み中...</div>

      <div v-else-if="rules.length === 0" class="empty-state">
        <p>自動処理ルールがありません</p>
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
              <span style="font-size:18px;color:#c0c4cc">&#x2630;</span>
            </div>

            <div class="rule-info">
              <div class="rule-header">
                <span class="rule-name">{{ rule.name }}</span>
                <span
                  class="o-badge"
                  :class="rule.enabled ? 'o-badge-success' : 'o-badge-info'"
                >
                  {{ rule.enabled ? '有効' : '無効' }}
                </span>
                <span
                  class="o-badge"
                  :class="rule.triggerMode === 'auto' ? 'o-badge-primary' : 'o-badge-warning'"
                >
                  {{ rule.triggerMode === 'auto' ? '自動' : '手動' }}
                </span>
                <span
                  v-if="rule.allowRerun"
                  class="o-badge o-badge-info"
                >
                  再実行可
                </span>
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
              <label class="o-toggle">
                <input
                  type="checkbox"
                  :checked="rule.enabled"
                  @change="handleEnableChange(rule, ($event.target as HTMLInputElement).checked)"
                />
                <span class="o-toggle-slider"></span>
              </label>
              <OButton variant="primary" size="sm" @click="openEdit(rule)">編集</OButton>
              <OButton
                variant="success"
                size="sm"
                @click="handleManualRun(rule)"
                :disabled="runningRuleId === rule._id"
              >
                {{ runningRuleId === rule._id ? '実行中...' : '手動で実行する' }}
              </OButton>
              <OButton variant="secondary" size="sm" @click="duplicateRule(rule)">複製</OButton>
              <OButton variant="danger" size="sm" @click="confirmDelete(rule)">削除</OButton>
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
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
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

const { show: showToast } = useToast()

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
    showToast(e.message || 'ルールの取得に失敗しました', 'danger')
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
      showToast('ルールを更新しました', 'success')
    } else {
      await createAutoProcessingRule(data)
      showToast('ルールを作成しました', 'success')
    }
    dialogVisible.value = false
    await loadRules()
  } catch (e: any) {
    showToast(e.message || '保存に失敗しました', 'danger')
  }
}

const handleEnableChange = async (rule: AutoProcessingRule, enabled: boolean) => {
  try {
    await updateAutoProcessingRule(rule._id, { enabled })
    rule.enabled = enabled
    showToast(enabled ? 'ルールを有効にしました' : 'ルールを無効にしました', 'success')
  } catch (e: any) {
    showToast(e.message || '更新に失敗しました', 'danger')
  }
}

const confirmDelete = async (rule: AutoProcessingRule) => {
  if (!confirm(`ルール「${rule.name}」を削除しますか？`)) return
  try {
    await deleteAutoProcessingRule(rule._id)
    showToast('ルールを削除しました', 'success')
    await loadRules()
  } catch (e: any) {
    showToast(e.message || '削除に失敗しました', 'danger')
  }
}

const handleManualRun = async (rule: AutoProcessingRule) => {
  if (!confirm(`ルール「${rule.name}」を手動で実行しますか？条件に合致するすべての注文に対して動作が実行されます。`)) return
  try {
    runningRuleId.value = rule._id
    const result = await runAutoProcessingRule(rule._id)
    showToast(
      `実行完了: ${result.data.matched}件一致 / ${result.data.executed}件実行` +
      (result.data.errors > 0 ? ` / ${result.data.errors}件エラー` : ''),
      'success',
    )
  } catch (e: any) {
    showToast(e.message || '手動実行に失敗しました', 'danger')
  } finally {
    runningRuleId.value = null
  }
}

const duplicateRule = async (rule: AutoProcessingRule) => {
  try {
    const { _id, createdAt: _createdAt, updatedAt: _updatedAt, priority: _priority, ...rest } = rule
    await createAutoProcessingRule({
      ...rest,
      name: `${rule.name}_copy`,
      enabled: false,
    })
    showToast('ルールを複製しました', 'success')
    await loadRules()
  } catch (e: any) {
    showToast(e.message || 'ルールの複製に失敗しました', 'danger')
  }
}

const onDragEnd = async () => {
  try {
    const orderedIds = rules.value.map((r) => r._id)
    await reorderAutoProcessingRules(orderedIds)
  } catch (e: any) {
    showToast(e.message || '優先順位の更新に失敗しました', 'danger')
    await loadRules()
  }
}

onMounted(() => {
  loadRules()
})
</script>

<style scoped>
.auto-processing-settings {
  padding: 0 20px 20px;
}
:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
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
.o-btn-sm { padding: 4px 10px; font-size: 13px; }
.o-btn-outline-primary { background: transparent; color: var(--o-brand-primary, #714b67); border-color: var(--o-brand-primary, #714b67); }
.o-btn-outline-secondary { background: transparent; color: var(--o-gray-600, #909399); border-color: var(--o-gray-600, #909399); }
.o-btn-outline-success { background: transparent; color: #67c23a; border-color: #67c23a; }
.o-btn-outline-danger { background: transparent; color: #f56c6c; border-color: #f56c6c; }

.o-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
.o-badge-success { background: #f0f9eb; color: #67c23a; }
.o-badge-info { background: #f4f4f5; color: #909399; }
.o-badge-primary { background: #ecf5ff; color: #409eff; }
.o-badge-warning { background: #fdf6ec; color: #e6a23c; }

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #714b67); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-state,
.empty-state {
  padding: 60px 0;
  text-align: center;
  color: var(--o-gray-500, #909399);
}

.rule-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border: 1px solid var(--o-border-color, #e4e7ed);
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
  padding: 4px;
  flex-shrink: 0;
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
  color: var(--o-gray-700, #303133);
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
  color: var(--o-gray-500, #909399);
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
</style>
