<template>
  <ODialog
    :open="modelValue"
    :title="isEditing ? '出荷グループを編集' : '出荷グループを追加'"
    size="sm"
    @close="$emit('update:modelValue', false)"
  >
    <!-- 编辑时显示 ID / 編集時にID表示 -->
    <div v-if="isEditing && initialData" class="group-id-display">
      <span class="group-id-label">グループID</span>
      <span class="group-id-value">{{ initialData.orderGroupId }}</span>
    </div>

    <div class="osc-form">
      <div class="osc-form-group">
        <label class="osc-label">グループ名 <span class="required-badge">必須</span></label>
        <input class="o-input" v-model="formData.name" placeholder="例: VIP、通常、冷凍品" />
        <div v-if="nameError" class="field-error">{{ nameError }}</div>
      </div>

      <div class="osc-form-group">
        <label class="osc-label">説明</label>
        <textarea class="o-input" v-model="formData.description" rows="2" placeholder="グループの用途を入力（任意）"></textarea>
      </div>

      <div class="osc-form-group">
        <label class="osc-label">有効</label>
        <div style="display:flex;align-items:center;gap:10px">
          <label class="o-toggle">
            <input type="checkbox" v-model="formData.enabled" />
            <span class="o-toggle-slider"></span>
          </label>
          <span class="toggle-hint">{{ formData.enabled ? '有効 — このグループに注文を割当可能' : '無効 — 新規割当不可（既存は維持）' }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <OButton variant="secondary" @click="$emit('update:modelValue', false)">キャンセル</OButton>
      <OButton variant="primary" @click="handleSubmit">{{ isEditing ? '更新' : '作成' }}</OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import type { OrderGroup } from '@/types/orderGroup'

const props = defineProps<{
  modelValue: boolean
  isEditing: boolean
  initialData?: OrderGroup | null
}>()

const emits = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: { name: string; description?: string; enabled: boolean }): void
}>()

const formData = reactive({ name: '', description: '', enabled: true })
const nameError = ref('')

const handleSubmit = () => {
  nameError.value = ''
  if (!formData.name.trim()) {
    nameError.value = 'グループ名は必須です'
    return
  }
  emits('submit', {
    name: formData.name.trim(),
    description: formData.description?.trim() || undefined,
    enabled: formData.enabled,
  })
}

watch(() => props.modelValue, (visible) => {
  if (visible) {
    nameError.value = ''
    if (props.isEditing && props.initialData) {
      formData.name = props.initialData.name
      formData.description = props.initialData.description || ''
      formData.enabled = props.initialData.enabled
    } else {
      formData.name = ''
      formData.description = ''
      formData.enabled = true
    }
  }
}, { immediate: true })
</script>

<style scoped>
.group-id-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: var(--o-gray-100, #f5f7fa);
  font-size: 12px;
}
.group-id-label { color: var(--o-gray-500); font-weight: 500; }
.group-id-value { font-family: monospace; color: var(--o-gray-700); }

.osc-form { display: flex; flex-direction: column; gap: 14px; }
.osc-form-group { display: flex; flex-direction: column; gap: 4px; }
.osc-label {
  font-size: 13px; font-weight: 500;
  color: var(--o-gray-700, #4a433d);
  display: flex; align-items: center; gap: 4px;
}
.required-badge {
  display: inline-block; background: #dc3545; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 1;
  padding: 2px 5px; border-radius: 3px; white-space: nowrap;
}
.field-error { color: var(--o-danger, #dc3545); font-size: 12px; }
.toggle-hint { font-size: 12px; color: var(--o-gray-500); }

.o-toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
.o-toggle input { position: absolute; opacity: 0; width: 0; height: 0; }
.o-toggle-slider { width: 40px; height: 20px; background: var(--o-toggle-off, #c0c4cc); border-radius: 10px; transition: 0.2s; position: relative; }
.o-toggle-slider::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: #fff; top: 2px; left: 2px; transition: 0.2s; }
.o-toggle input:checked + .o-toggle-slider { background: var(--o-brand-primary, #0052A3); }
.o-toggle input:checked + .o-toggle-slider::after { left: 22px; }
</style>
