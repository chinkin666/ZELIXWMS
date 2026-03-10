<template>
  <el-dialog v-model="visibleProxy" width="860px" title="入力エラー" destroy-on-close>
    <div class="summary">
      <el-alert
        type="error"
        :closable="false"
        title="取込を実行できません。以下のエラーを修正してください。"
        show-icon
      />
    </div>

    <el-table :data="errors" height="420" border size="small">
      <el-table-column label="行" width="90">
        <template #default="{ row }">
          {{ (row.rowIndex ?? 0) + 1 }}
        </template>
      </el-table-column>
      <el-table-column prop="sku" label="SKU" width="180" />
      <el-table-column prop="field" label="フィールド" width="160" />
      <el-table-column prop="message" label="メッセージ" min-width="360" />
    </el-table>

    <template #footer>
      <el-button type="primary" @click="visibleProxy = false">閉じる</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type InputRowError = {
  rowIndex: number
  sku?: string
  field?: string
  message: string
}

const props = defineProps<{
  modelValue: boolean
  errors: InputRowError[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
</script>

<style scoped>
.summary {
  margin-bottom: 12px;
}
</style>


