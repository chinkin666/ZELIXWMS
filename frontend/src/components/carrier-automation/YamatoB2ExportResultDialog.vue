<template>
  <el-dialog
    :model-value="modelValue"
    title="B2 Cloud 送信結果"
    width="600px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="result">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="送信件数">{{ result.total }}</el-descriptions-item>
        <el-descriptions-item label="成功">
          <el-tag type="success">{{ result.success_count }} 件</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="失敗">
          <el-tag v-if="result.error_count > 0" type="danger">{{ result.error_count }} 件</el-tag>
          <el-tag v-else type="info">0 件</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="result.results && result.results.length > 0" class="result-details">
        <h4>詳細</h4>
        <el-table :data="result.results" size="small" max-height="300">
          <el-table-column prop="order_index" label="#" width="60" />
          <el-table-column prop="success" label="結果" width="100">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                {{ row.success ? '成功' : '失敗' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="error" label="エラー" />
        </el-table>
      </div>

      <!-- Print results summary -->
      <div v-if="result.printResults && result.printResults.length > 0" class="result-details">
        <h4>発行結果</h4>
        <el-table :data="result.printResults" size="small" max-height="200">
          <el-table-column prop="print_type" label="伝票タイプ" width="120">
            <template #default="{ row }">
              {{ getPrintTypeName(row.print_type) }}
            </template>
          </el-table-column>
          <el-table-column prop="success" label="発行" width="80">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                {{ row.success ? '成功' : '失敗' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="件数" width="80">
            <template #default="{ row }">
              {{ row.tracking_numbers?.length || 0 }} 件
            </template>
          </el-table-column>
          <el-table-column prop="error" label="エラー" />
        </el-table>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">閉じる</el-button>
      <el-button type="primary" @click="$emit('confirm')">OK（一覧を更新）</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import type { YamatoB2ExportResult } from '@/types/carrierAutomation'

defineProps<{
  modelValue: boolean
  result: YamatoB2ExportResult | null
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
}>()

/**
 * Get print type display name
 */
const getPrintTypeName = (printType: string): string => {
  const names: Record<string, string> = {
    '0': '発払い',
    '2': 'コレクト',
    '3': 'クロネコゆうメール',
    '4': 'タイム',
    '5': '着払い',
    '7': 'クロネコゆうパケット',
    '8': '宅急便コンパクト',
    '9': 'コンパクトコレクト',
    'A': 'ネコポス',
  }
  return names[printType] || printType
}
</script>

<script lang="ts">
export default {
  name: 'YamatoB2ExportResultDialog',
}
</script>

<style scoped>
.result-details {
  margin-top: 20px;
}

.result-details h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #303133;
}
</style>
