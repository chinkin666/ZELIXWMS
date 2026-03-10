<template>
  <el-dialog
    :model-value="modelValue"
    title="B2 Cloud フォーマット検証結果"
    width="700px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="result">
      <el-alert
        v-if="result.all_valid"
        type="success"
        title="すべてのデータが検証に成功しました"
        :description="`${result.valid_count}件のB2 Cloudデータが有効です。`"
        show-icon
        :closable="false"
      />
      <el-alert
        v-else
        type="warning"
        title="検証エラーがあります"
        :description="`${result.invalid_count}件のデータにエラーがあります。エラーを修正してから再度お試しください。`"
        show-icon
        :closable="false"
      />

      <el-descriptions :column="3" border class="validate-summary">
        <el-descriptions-item label="検証件数">{{ result.total }}</el-descriptions-item>
        <el-descriptions-item label="成功">
          <el-tag type="success">{{ result.valid_count }} 件</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="エラー">
          <el-tag v-if="result.invalid_count > 0" type="danger">{{ result.invalid_count }} 件</el-tag>
          <el-tag v-else type="info">0 件</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="result.results.some(r => !r.valid)" class="validate-errors">
        <h4>エラー詳細</h4>
        <el-table :data="result.results.filter(r => !r.valid)" size="small" max-height="300">
          <el-table-column prop="index" label="#" width="60">
            <template #default="{ row }">{{ row.index + 1 }}</template>
          </el-table-column>
          <el-table-column label="エラー内容">
            <template #default="{ row }">
              <ul class="error-list">
                <li v-for="(err, i) in row.errors" :key="i">{{ err }}</li>
              </ul>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('cancel')">キャンセル</el-button>
      <el-button
        type="primary"
        :disabled="!result?.all_valid"
        @click="$emit('confirm')"
      >
        {{ confirmButtonText }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
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
