<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :title="isEditing ? 'ルールを編集' : 'ルールを追加'"
    width="900px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <el-form :model="form" label-position="top" class="rule-form">
      <!-- 基本設定 -->
      <div class="form-section">
        <h3 class="section-title">基本設定</h3>
        <div class="form-grid">
          <el-form-item label="名前" required>
            <el-input v-model="form.name" placeholder="ルール名を入力" />
          </el-form-item>
          <el-form-item label="有効">
            <el-switch v-model="form.enabled" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="実行モード">
            <el-radio-group v-model="form.triggerMode">
              <el-radio value="auto">自動で実行する</el-radio>
              <el-radio value="manual">手動で実行する</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="再実行">
            <el-radio-group v-model="form.allowRerun">
              <el-radio :value="false">再実行しない</el-radio>
              <el-radio :value="true">再実行できる</el-radio>
            </el-radio-group>
          </el-form-item>
        </div>
        <el-form-item label="メモ">
          <el-input
            v-model="form.memo"
            type="textarea"
            :rows="2"
            placeholder="メモ（任意）"
          />
        </el-form-item>
      </div>

      <!-- 触発タイミング -->
      <div class="form-section">
        <h3 class="section-title">触発タイミング</h3>
        <el-checkbox-group v-model="form.triggerEvents">
          <el-checkbox
            v-for="ev in TRIGGER_EVENTS"
            :key="ev"
            :value="ev"
          >
            {{ TRIGGER_EVENT_LABELS[ev] }}
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <!-- 条件設定 -->
      <div class="form-section">
        <h3 class="section-title">条件設定</h3>
        <p class="section-hint">すべての条件を満たした場合にのみ動作が実行されます（AND条件）</p>
        <ConditionEditor v-model="form.conditions" />
      </div>

      <!-- 動作設定 -->
      <div class="form-section">
        <h3 class="section-title">動作設定</h3>
        <ActionEditor v-model="form.actions" />
      </div>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">キャンセル</el-button>
      <el-button type="primary" @click="handleSubmit" :disabled="!form.name?.trim()">
        {{ isEditing ? '更新' : '作成' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type {
  AutoProcessingRule,
  AutoProcessingRuleFormData,
  AutoProcessingCondition,
  AutoProcessingAction,
  TriggerEvent,
} from '@/types/autoProcessingRule'
import { TRIGGER_EVENTS, TRIGGER_EVENT_LABELS } from '@/types/autoProcessingRule'
import ConditionEditor from './ConditionEditor.vue'
import ActionEditor from './ActionEditor.vue'

const props = defineProps<{
  modelValue: boolean
  isEditing: boolean
  initialData: AutoProcessingRule | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: AutoProcessingRuleFormData): void
}>()

const createEmptyForm = (): AutoProcessingRuleFormData => ({
  name: '',
  enabled: true,
  triggerMode: 'auto',
  allowRerun: false,
  memo: '',
  triggerEvents: [],
  conditions: [],
  actions: [],
})

const form = ref<AutoProcessingRuleFormData>(createEmptyForm())

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      if (props.isEditing && props.initialData) {
        form.value = {
          name: props.initialData.name,
          enabled: props.initialData.enabled,
          triggerMode: props.initialData.triggerMode,
          allowRerun: props.initialData.allowRerun,
          memo: props.initialData.memo || '',
          triggerEvents: [...props.initialData.triggerEvents],
          conditions: props.initialData.conditions.map((c) => ({ ...c })),
          actions: props.initialData.actions.map((a) => ({ ...a })),
        }
      } else {
        form.value = createEmptyForm()
      }
    }
  },
)

const handleSubmit = () => {
  emit('submit', { ...form.value })
}
</script>

<style scoped>
.rule-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

.form-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
}

.section-hint {
  font-size: 13px;
  color: #909399;
  margin: 0 0 12px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}
</style>
