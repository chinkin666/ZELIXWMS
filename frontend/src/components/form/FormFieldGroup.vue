<!-- フォームフィールドグループ共通コンポーネント / 表单字段组共用组件 -->
<!-- 繰り返しのv-forフィールドレンダリングパターンを共通化 / 提取重复的v-for字段渲染模式 -->
<template>
  <template v-for="col in fields" :key="col.key">
    <div v-if="!isFieldVisible || isFieldVisible(col)" class="o-form-group">
      <label class="o-form-label">
        {{ col.title }}
        <span v-if="isFieldRequired && isFieldRequired(col)" class="required-badge">必須</span>
      </label>
      <div class="o-form-field">
        <FormField
          :column="withPlaceholder ? withPlaceholder(col) : col"
          :form-data="formData"
          :is-disabled="isFieldDisabled ? isFieldDisabled(col) : false"
          @update="(key: string, value: any) => emit('update', key, value)"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import FormField from './FormField.vue'
import type { TableColumn } from '@/types/table'

interface Props {
  fields: TableColumn[]
  formData: Record<string, any>
  isFieldRequired?: (col: TableColumn) => boolean
  isFieldDisabled?: (col: TableColumn) => boolean
  isFieldVisible?: (col: TableColumn) => boolean
  withPlaceholder?: (col: TableColumn) => TableColumn
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', key: string, value: any): void
}>()
</script>
