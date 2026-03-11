<template>
  <ODialog
    :open="modelValue"
    :title="isEditing ? '検品グループを編集' : '検品グループを追加'"
    @close="$emit('update:modelValue', false)"
    width="500px"
  >
    <div class="o-form-group">
      <label class="o-form-label">グループ名 <span class="required">*</span></label>
      <input
        class="o-input"
        v-model="formData.name"
        placeholder="グループ名を入力"
        style="width: 100%"
      />
      <div v-if="nameError" class="field-error">{{ nameError }}</div>
    </div>

    <div class="o-form-group">
      <label class="o-form-label">説明</label>
      <textarea
        class="o-input"
        v-model="formData.description"
        rows="2"
        placeholder="グループの説明（任意）"
        style="width: 100%"
      ></textarea>
    </div>

    <div class="o-form-group">
      <label class="o-form-label">有効</label>
      <label class="o-toggle">
        <input type="checkbox" v-model="formData.enabled" />
        <span class="o-toggle-slider"></span>
      </label>
    </div>

    <template #footer>
      <OButton variant="secondary" @click="$emit('update:modelValue', false)">キャンセル</OButton>
      <OButton variant="primary" @click="handleSubmit">保存</OButton>
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
  (e: 'submit', data: {
    name: string
    description?: string
    enabled: boolean
  }): void
}>()

const formData = reactive({
  name: '',
  description: '',
  enabled: true,
})

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

// Reset form when dialog opens
watch(
  () => props.modelValue,
  (visible) => {
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
  },
  { immediate: true }
)
</script>

<style scoped>
.o-form-group { margin-bottom:1rem; }
.o-form-label { display:block; font-size:13px; font-weight:500; color:#374151; margin-bottom:0.25rem; }
.required { color: #dc2626; }
.field-error { color: #dc2626; font-size: 12px; margin-top: 4px; }
.o-toggle { position:relative; display:inline-block; width:40px; height:20px; cursor:pointer; }
.o-toggle input { opacity:0; width:0; height:0; }
.o-toggle-slider { position:absolute; inset:0; background:#ccc; border-radius:20px; transition:background .2s; }
.o-toggle-slider::before { content:''; position:absolute; left:2px; top:2px; width:16px; height:16px; background:#fff; border-radius:50%; transition:transform .2s; }
.o-toggle input:checked + .o-toggle-slider { background:#714b67; }
.o-toggle input:checked + .o-toggle-slider::before { transform:translateX(20px); }
</style>
