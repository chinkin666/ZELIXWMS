<template>
  <ODialog
    :open="modelValue"
    title="B2 Cloud フォーマット検証結果"
    @close="$emit('update:modelValue', false)"
    width="700px"
  >
    <div v-if="result">
      <div v-if="result.all_valid" class="alert-success">
        <strong>すべてのデータが検証に成功しました</strong>
        <div>{{ result.valid_count }}件のB2 Cloudデータが有効です。</div>
      </div>
      <div v-else class="alert-warning">
        <strong>検証エラーがあります</strong>
        <div>{{ result.invalid_count }}件のデータにエラーがあります。エラーを修正してから再度お試しください。</div>
      </div>

      <div class="descriptions-grid validate-summary">
        <div class="desc-item"><span class="desc-label">検証件数</span><span>{{ result.total }}</span></div>
        <div class="desc-item"><span class="desc-label">成功</span><span class="o-badge o-badge-success">{{ result.valid_count }} 件</span></div>
        <div class="desc-item"><span class="desc-label">エラー</span>
          <span v-if="result.invalid_count > 0" class="o-badge o-badge-danger">{{ result.invalid_count }} 件</span>
          <span v-else class="o-badge o-badge-info">0 件</span>
        </div>
      </div>

      <div v-if="result.results.some(r => !r.valid)" class="validate-errors">
        <h4>エラー詳細</h4>
        <table class="o-list-table">
          <thead>
            <tr>
              <th style="width:60px">#</th>
              <th>エラー内容</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in result.results.filter(r => !r.valid)" :key="row.index">
              <td>{{ row.index + 1 }}</td>
              <td>
                <ul class="error-list">
                  <li v-for="(err, i) in row.errors" :key="i">{{ err }}</li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <template #footer>
      <button class="o-btn o-btn-secondary" @click="$emit('cancel')">キャンセル</button>
      <button
        class="o-btn o-btn-primary"
        :disabled="!result?.all_valid"
        @click="$emit('confirm')"
      >
        {{ confirmButtonText }}
      </button>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import ODialog from '@/components/odoo/ODialog.vue'
import type { YamatoB2ValidateResult } from '@/types/carrierAutomation'

defineProps<{
  modelValue: boolean
  result: YamatoB2ValidateResult | null
  confirmButtonText?: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'cancel'): void
  (e: 'confirm'): void
}>()
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
  color: #303133;
}

.error-list {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.error-list li {
  margin: 4px 0;
  color: #f56c6c;
  font-size: 13px;
}
</style>
