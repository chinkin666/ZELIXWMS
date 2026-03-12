<template>
  <ODialog
    :open="modelValue"
    title="B2 Cloud 検証結果"
    @close="$emit('update:modelValue', false)"
    size="lg"
  >
    <div v-if="result">
      <div v-if="result.all_valid" class="alert-success">
        <strong>すべてのデータが正常です</strong>
        <div>対象 {{ result.valid_count }}件：エラーなし</div>
      </div>
      <div v-else-if="result.valid_count > 0" class="alert-warning">
        <strong>{{ result.invalid_count }}件のデータにエラーがあります</strong>
        <div>正常な {{ result.valid_count }}件のみ確定できます。エラーの{{ result.invalid_count }}件は処理中に残ります。</div>
      </div>
      <div v-else class="alert-error">
        <strong>すべてのデータにエラーがあります</strong>
        <div>エラー内容を確認し、修正後に再度検証してください。</div>
      </div>

      <div class="descriptions-grid validate-summary">
        <div class="desc-item"><span class="desc-label">対象件数</span><span>{{ result.total }}</span></div>
        <div class="desc-item"><span class="desc-label">正常</span><span class="o-badge o-badge-success">{{ result.valid_count }}件</span></div>
        <div class="desc-item"><span class="desc-label">エラー</span>
          <span v-if="result.invalid_count > 0" class="o-badge o-badge-danger">{{ result.invalid_count }}件</span>
          <span v-else class="o-badge o-badge-info">0件</span>
        </div>
      </div>

      <div v-if="result.results.some(r => !r.valid)" class="validate-errors">
        <h4>エラー詳細</h4>
        <div class="error-table-wrapper">
          <table class="error-table">
            <thead>
              <tr>
                <th class="error-table-th" style="width:200px">出荷管理番号</th>
                <th class="error-table-th">エラー内容</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in result.results.filter(r => !r.valid)" :key="row.index" class="error-table-row">
                <td class="error-table-td order-number-cell">{{ orderMap?.get(row.index) || `#${row.index + 1}` }}</td>
                <td class="error-table-td">
                  <div v-for="(err, i) in row.errors" :key="i" class="error-msg">{{ parseB2Error(err) }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <OButton variant="secondary" @click="$emit('cancel')">キャンセル</OButton>
        <OButton
          variant="primary"
          :disabled="!result || result.valid_count === 0"
          @click="$emit('confirm')"
        >
          {{ confirmButtonText }}{{ result && !result.all_valid && result.valid_count > 0 ? `（${result.valid_count}件）` : '' }}
        </OButton>
      </div>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import type { YamatoB2ValidateResult } from '@/types/carrierAutomation'

withDefaults(defineProps<{
  modelValue: boolean
  result: YamatoB2ValidateResult | null
  orderMap?: Map<number, string>
  confirmButtonText?: string
}>(), {
  confirmButtonText: '出荷指示を確定',
})

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'cancel'): void
  (e: 'confirm'): void
}>()

const parseB2Error = (err: string): string => {
  const descMatch = err.match(/['"]error_description['"]\s*:\s*['"](.+?)['"]/)
  if (descMatch) return descMatch[1]
  try {
    const parsed = JSON.parse(err)
    if (parsed?.error_description) return parsed.error_description
    if (parsed?.error_message) return parsed.error_message
  } catch { /* not JSON */ }
  return err
}
</script>

<script lang="ts">
export default {
  name: 'YamatoB2ValidateResultDialog',
}
</script>

<style scoped>
.alert-success {
  padding: 12px 16px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  border-radius: 6px;
  color: #166534;
}

.alert-warning {
  padding: 12px 16px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
  color: #854d0e;
}

.alert-error {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #991b1b;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.descriptions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.desc-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.desc-label {
  font-size: 12px;
  color: #909399;
}

.validate-summary {
  margin-top: 16px;
}

.validate-errors {
  margin-top: 20px;
}

.validate-errors h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.error-table-wrapper {
  border: 1px solid var(--o-border-color, #d6d6d6);
  border-radius: var(--o-border-radius, 4px);
  overflow: auto;
  max-height: 360px;
}

.error-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: fixed;
}

.error-table-th {
  position: sticky;
  top: 0;
  background: var(--o-gray-100, #f8f9fa);
  color: var(--o-gray-700, #495057);
  font-weight: 600;
  font-size: 12px;
  text-align: left;
  padding: 8px 10px;
  border-bottom: 2px solid var(--o-border-color, #d6d6d6);
  border-left: 1px solid var(--o-border-color, #d6d6d6);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.error-table-th:first-child {
  border-left: none;
}

.error-table-td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--o-border-color, #f0f0f0);
  border-left: 1px solid var(--o-border-color, #f0f0f0);
  vertical-align: top;
  font-size: 13px;
}

.error-table-td:first-child {
  border-left: none;
}

.error-table-row:hover {
  background: var(--o-list-hover, #edf2ff);
}

.order-number-cell {
  font-weight: 500;
  color: #303133;
}

.error-msg {
  color: #dc2626;
  line-height: 1.5;
  padding: 1px 0;
}
</style>
