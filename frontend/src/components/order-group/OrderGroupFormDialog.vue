<template>
  <el-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :title="isEditing ? '検品グループを編集' : '検品グループを追加'"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      label-position="left"
    >
      <el-form-item label="グループ名" prop="name">
        <el-input v-model="formData.name" placeholder="グループ名を入力" />
      </el-form-item>

      <el-form-item label="説明">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="2"
          placeholder="グループの説明（任意）"
        />
      </el-form-item>

      <el-form-item label="有効">
        <el-switch v-model="formData.enabled" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">キャンセル</el-button>
      <el-button type="primary" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
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

const formRef = ref<FormInstance>()

const formData = reactive({
  name: '',
  description: '',
  enabled: true,
})

const formRules: FormRules = {
  name: [{ required: true, message: 'グループ名は必須です', trigger: 'blur' }],
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    emits('submit', {
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      enabled: formData.enabled,
    })
  } catch {
    // Validation failed
  }
}

// Reset form when dialog opens
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      if (props.isEditing && props.initialData) {
        formData.name = props.initialData.name
        formData.description = props.initialData.description || ''
        formData.enabled = props.initialData.enabled
      } else {
        formData.name = ''
        formData.description = ''
        formData.enabled = true
      }
      formRef.value?.clearValidate()
    }
  },
  { immediate: true }
)
</script>
