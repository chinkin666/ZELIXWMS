<template>
  <ODialog :open="visibleProxy" title="入力エラー" @close="visibleProxy = false" width="860px">
    <div class="summary">
      <div class="alert-error">
        取込を実行できません。以下のエラーを修正してください。
      </div>
    </div>

    <div style="max-height:420px; overflow:auto">
      <table class="o-list-table">
        <thead>
          <tr>
            <th style="width:90px">行</th>
            <th style="width:180px">SKU</th>
            <th style="width:160px">フィールド</th>
            <th>メッセージ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in errors" :key="idx">
            <td>{{ (row.rowIndex ?? 0) + 1 }}</td>
            <td>{{ row.sku }}</td>
            <td>{{ row.field }}</td>
            <td>{{ row.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <button class="o-btn o-btn-primary" @click="visibleProxy = false">閉じる</button>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'

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
.summary { margin-bottom: 12px; }
.alert-error { padding: 12px 16px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px; color: #991b1b; font-weight: 500; }
</style>
