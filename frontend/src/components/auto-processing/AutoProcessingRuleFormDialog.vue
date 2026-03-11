<template>
  <ODialog
    :open="modelValue"
    :title="isEditing ? 'ルールを編集' : 'ルールを追加'"
    @close="emit('update:modelValue', false)"
    width="900px"
  >
    <form class="rule-form" @submit.prevent="handleSubmit">
      <!-- 基本設定 -->
      <div class="form-section">
        <h3 class="section-title">基本設定</h3>
        <div class="form-grid">
          <div class="o-form-group">
            <label class="o-form-label">名前 *</label>
            <input class="o-input" v-model="form.name" placeholder="ルール名を入力" />
          </div>
          <div class="o-form-group">
            <label class="o-form-label">有効</label>
            <label class="o-toggle">
              <input type="checkbox" v-model="form.enabled" />
              <span class="o-toggle-slider"></span>
            </label>
          </div>
        </div>
        <div class="form-grid">
          <div class="o-form-group">
            <label class="o-form-label">実行モード</label>
            <div class="radio-group">
              <label><input type="radio" v-model="form.triggerMode" value="auto" /> 自動で実行する</label>
              <label><input type="radio" v-model="form.triggerMode" value="manual" /> 手動で実行する</label>
            </div>
          </div>
          <div class="o-form-group">
            <label class="o-form-label">再実行</label>
            <div class="radio-group">
              <label><input type="radio" v-model="form.allowRerun" :value="false" /> 再実行しない</label>
              <label><input type="radio" v-model="form.allowRerun" :value="true" /> 再実行できる</label>
            </div>
          </div>
        </div>
        <div class="o-form-group">
          <label class="o-form-label">メモ</label>
          <textarea class="o-input" v-model="form.memo" rows="2" placeholder="メモ（任意）"></textarea>
        </div>
      </div>

      <!-- 触発タイミング -->
      <div class="form-section">
        <h3 class="section-title">触発タイミング</h3>
        <div class="checkbox-group">
          <label
            v-for="ev in TRIGGER_EVENTS"
            :key="ev"
            class="o-checkbox"
          >
            <input
              type="checkbox"
              :value="ev"
              v-model="form.triggerEvents"
            />
            <span>{{ TRIGGER_EVENT_LABELS[ev] }}</span>
          </label>
        </div>
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
    </form>

    <template #footer>
      <button class="o-btn o-btn-secondary" @click="emit('update:modelValue', false)">キャンセル</button>
      <button class="o-btn o-btn-primary" @click="handleSubmit" :disabled="!form.name?.trim()">
        {{ isEditing ? '更新' : '作成' }}
      </button>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
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

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.o-toggle { position:relative; display:inline-flex; align-items:center; cursor:pointer; }
.o-toggle input { position:absolute; opacity:0; width:0; height:0; }
.o-toggle-slider { width:40px; height:20px; background:var(--o-toggle-off, #ccc); border-radius:10px; transition:0.2s; position:relative; }
.o-toggle-slider::after { content:''; position:absolute; width:16px; height:16px; border-radius:50%; background:#fff; top:2px; left:2px; transition:0.2s; }
.o-toggle input:checked + .o-toggle-slider { background:var(--o-brand-primary, #714b67); }
.o-toggle input:checked + .o-toggle-slider::after { left:22px; }

.o-form-group { margin-bottom:1rem; }
.o-form-label { display:block; font-size:var(--o-font-size-small, 13px); font-weight:500; color:var(--o-gray-700, #374151); margin-bottom:0.25rem; }

.o-checkbox { display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:14px; }
</style>
