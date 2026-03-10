<template>
  <el-dialog
    :model-value="modelValue"
    title="B2 Cloud 検証エラー"
    width="700px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-alert
      type="error"
      title="B2 Cloud APIへの検証リクエストでエラーが発生しました"
      show-icon
      :closable="false"
    />
    <div v-if="parsedDetails.length > 0" class="api-error-details">
      <h4>エラー詳細</h4>
      <el-table :data="parsedDetails" size="small" max-height="400">
        <el-table-column label="行番号" width="80">
          <template #default="{ row }">
            {{ row.rowIndex !== null ? `#${row.rowIndex + 1}` : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="field" label="フィールド" width="200" />
        <el-table-column label="エラー内容">
          <template #default="{ row }">
            <div class="error-message">{{ row.message }}</div>
            <div v-if="row.input" class="error-input">入力値: {{ row.input }}</div>
            <div v-if="row.maxLength" class="error-hint">最大文字数: {{ row.maxLength }}</div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <div v-else class="api-error-raw">
      <h4>エラーメッセージ</h4>
      <pre>{{ errorMessage }}</pre>
    </div>
    <template #footer>
      <el-button type="primary" @click="$emit('update:modelValue', false)">閉じる</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface ApiErrorDetail {
  rowIndex: number | null
  field: string
  message: string
  input?: string
  maxLength?: number
}

const props = defineProps<{
  modelValue: boolean
  errorMessage: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

/**
 * Parse B2 Cloud API error response
 * Format: {"detail":[{"type":"string_too_long","loc":["body",0,"フィールド名"],"msg":"...","input":"...","ctx":{"max_length":32}}]}
 */
const parsedDetails = computed<ApiErrorDetail[]>(() => {
  const errorMessage = props.errorMessage
  if (!errorMessage) return []

  try {
    // Try to extract JSON from the error message
    const jsonMatch = errorMessage.match(/\{.*\}/s)
    if (!jsonMatch) return []

    const errorData = JSON.parse(jsonMatch[0])
    if (!errorData?.detail || !Array.isArray(errorData.detail)) return []

    const details: ApiErrorDetail[] = []
    for (const err of errorData.detail) {
      // loc format: ["body", rowIndex, "fieldName"] or ["body", "fieldName"]
      const loc = err.loc || []
      let rowIndex: number | null = null
      let field = ''

      if (loc.length >= 3 && typeof loc[1] === 'number') {
        rowIndex = loc[1]
        field = String(loc[2] || '')
      } else if (loc.length >= 2) {
        field = String(loc[loc.length - 1] || '')
      }

      // Handle input value - could be string or other types
      let inputStr: string | undefined
      if (err.input !== undefined && err.input !== null) {
        const rawStr = typeof err.input === 'string' ? err.input : JSON.stringify(err.input)
        // Truncate very long inputs for display
        inputStr = rawStr.length > 100 ? rawStr.substring(0, 100) + '...' : rawStr
      }

      details.push({
        rowIndex,
        field,
        message: err.msg || err.message || err.type || 'Unknown error',
        input: inputStr,
        maxLength: err.ctx?.max_length,
      })
    }

    return details
  } catch {
    // JSON parse failed, return empty array
    return []
  }
})
</script>

<script lang="ts">
export default {
  name: 'YamatoB2ApiErrorDialog',
}
</script>

<style scoped>
.api-error-details {
  margin-top: 16px;
}

.api-error-details h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #303133;
}

.api-error-raw {
  margin-top: 16px;
}

.api-error-raw h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #303133;
}

.api-error-raw pre {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 300px;
  overflow-y: auto;
}

.error-message {
  color: #f56c6c;
  font-weight: 500;
}

.error-input {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  word-break: break-all;
}

.error-hint {
  margin-top: 2px;
  font-size: 12px;
  color: #e6a23c;
}
</style>
