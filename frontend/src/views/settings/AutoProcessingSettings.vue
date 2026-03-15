<template>
  <div class="auto-processing-settings">
    <ControlPanel :title="t('wms.settings.autoProcessing', '自動処理設定')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">自動処理の新規登録</OButton>
      </template>
    </ControlPanel>

    <div class="rules-list">
      <div v-if="isLoading" class="loading-state">{{ t('wms.settings.loading', '読み込み中...') }}</div>

      <div v-else-if="rules.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.2">
          <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
        </svg>
        <p>自動処理ルールがまだありません</p>
        <p class="empty-hint">注文取込時に自動でグループ分け・送り状種類設定などを行えます</p>
        <OButton variant="primary" @click="openCreate" style="margin-top:12px">最初のルールを作成</OButton>
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
                  {{ rule.enabled ? t('wms.settings.enabled', '有効') : t('wms.settings.disabled', '無効') }}
                </span>
                <span
                  class="o-badge"
                  :class="rule.triggerMode === 'auto' ? 'o-badge-primary' : 'o-badge-warning'"
                >
                  {{ rule.triggerMode === 'auto' ? t('wms.settings.auto', '自動') : t('wms.settings.manual', '手動') }}
                </span>
                <span
                  v-if="rule.allowRerun"
                  class="o-badge o-badge-info"
                >
                  {{ t('wms.settings.rerunnable', '再実行可') }}
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
                  {{ t('wms.settings.noTrigger', 'トリガーなし') }}
                </span>
              </div>
              <div v-if="rule.memo" class="rule-memo">{{ rule.memo }}</div>
            </div>

            <div class="rule-actions">
              <label class="o-toggle" :title="rule.enabled ? '無効にする' : '有効にする'">
                <input
                  type="checkbox"
                  :checked="rule.enabled"
                  @change="handleEnableChange(rule, ($event.target as HTMLInputElement).checked)"
                />
                <span class="o-toggle-slider"></span>
              </label>
              <OButton variant="secondary" size="sm" @click="openEdit(rule)">編集</OButton>
              <OButton
                variant="primary"
                size="sm"
                @click="handleManualRun(rule)"
                :disabled="runningRuleId === rule._id"
              >
                {{ runningRuleId === rule._id ? '実行中...' : '実行' }}
              </OButton>
              <OButton variant="secondary" size="sm" @click="duplicateRule(rule)">複製</OButton>
              <button class="delete-icon-btn" @click="confirmDelete(rule)" title="削除">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1H14a1 1 0 0 1 1 1v1z"/></svg>
              </button>
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
import { useI18n } from '@/composables/useI18n'
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
const { t } = useI18n()

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
    showToast(e.message || t('wms.settings.fetchRulesFailed', 'ルールの取得に失敗しました'), 'danger')
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
      showToast(t('wms.settings.ruleUpdated', 'ルールを更新しました'), 'success')
    } else {
      await createAutoProcessingRule(data)
      showToast(t('wms.settings.ruleCreated', 'ルールを作成しました'), 'success')
    }
    dialogVisible.value = false
    await loadRules()
  } catch (e: any) {
    showToast(e.message || t('wms.settings.saveFailed', '保存に失敗しました'), 'danger')
  }
}

const handleEnableChange = async (rule: AutoProcessingRule, enabled: boolean) => {
  try {
    await updateAutoProcessingRule(rule._id, { enabled })
    rule.enabled = enabled
    showToast(enabled ? t('wms.settings.ruleEnabled', 'ルールを有効にしました') : t('wms.settings.ruleDisabled', 'ルールを無効にしました'), 'success')
  } catch (e: any) {
    showToast(e.message || t('wms.settings.updateFailed', '更新に失敗しました'), 'danger')
  }
}

const confirmDelete = async (rule: AutoProcessingRule) => {
  if (!confirm(t('wms.settings.confirmDeleteRule', `ルール「${rule.name}」を削除しますか？`))) return
  try {
    await deleteAutoProcessingRule(rule._id)
    showToast(t('wms.settings.ruleDeleted', 'ルールを削除しました'), 'success')
    await loadRules()
  } catch (e: any) {
    showToast(e.message || t('wms.settings.deleteFailed', '削除に失敗しました'), 'danger')
  }
}

const handleManualRun = async (rule: AutoProcessingRule) => {
  if (!confirm(t('wms.settings.confirmManualRun', `ルール「${rule.name}」を手動で実行しますか？条件に合致するすべての注文に対して動作が実行されます。`))) return
  try {
    runningRuleId.value = rule._id
    const result = await runAutoProcessingRule(rule._id)
    showToast(
      t('wms.settings.runComplete', `実行完了: ${result.data.matched}件一致 / ${result.data.executed}件実行`) +
      (result.data.errors > 0 ? ` / ${result.data.errors}${t('wms.settings.errorsUnit', '件エラー')}` : ''),
      'success',
    )
  } catch (e: any) {
    showToast(e.message || t('wms.settings.manualRunFailed', '手動実行に失敗しました'), 'danger')
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
    showToast(t('wms.settings.ruleDuplicated', 'ルールを複製しました'), 'success')
    await loadRules()
  } catch (e: any) {
    showToast(e.message || t('wms.settings.duplicateFailed', 'ルールの複製に失敗しました'), 'danger')
  }
}

const onDragEnd = async () => {
  try {
    const orderedIds = rules.value.map((r) => r._id)
    await reorderAutoProcessingRules(orderedIds)
  } catch (e: any) {
    showToast(e.message || t('wms.settings.reorderFailed', '優先順位の更新に失敗しました'), 'danger')
    await loadRules()
  }
}

onMounted(() => {
  loadRules()
})
</script>

<style scoped>
.auto-processing-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}
:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #0052A3); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.loading-state {
  padding: 60px 0;
  text-align: center;
  color: var(--o-gray-500, #909399);
}
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 60px 20px; text-align: center; color: var(--o-gray-400);
}
.empty-state p { margin: 0; }
.empty-hint { font-size: 13px; }

.rule-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--o-view-background, #fff);
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
  background: var(--o-brand-lighter, #FAF0EA);
  border: 1px dashed var(--o-brand-primary, #0052A3);
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
  gap: 6px;
  flex-shrink: 0;
}

.delete-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border: none; background: none;
  color: var(--o-gray-400);
  cursor: pointer;
  transition: color 0.15s;
}
.delete-icon-btn:hover { color: var(--o-danger, #C0392B); }
</style>
