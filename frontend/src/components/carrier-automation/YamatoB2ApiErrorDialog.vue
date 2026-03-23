<template>
  <Dialog :open="modelValue" @update:open="$emit('update:modelValue', $event)">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>B2 Cloud エラー</DialogTitle>
      </DialogHeader>
    <div class="alert-error">
      B2 Cloud との通信中にエラーが発生しました
    </div>
    <div v-if="parsedDetails.length > 0" class="api-error-details">
      <h4>エラー詳細</h4>
      <table class="o-list-table">
        <thead>
          <tr>
            <th style="width:80px">行番号</th>
            <th style="width:200px">フィールド</th>
            <th>エラー内容</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in parsedDetails" :key="idx">
            <td>{{ row.rowIndex !== null ? `#${row.rowIndex + 1}` : '-' }}</td>
            <td>{{ row.field }}</td>
            <td>
              <div class="error-message">{{ row.message }}</div>
              <div v-if="row.input" class="error-input">入力値: {{ row.input }}</div>
              <div v-if="row.maxLength" class="error-hint">最大文字数: {{ row.maxLength }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="api-error-raw">
      <h4>エラーメッセージ</h4>
      <pre>{{ errorMessage }}</pre>
    </div>
    <DialogFooter>
      <Button variant="default" @click="$emit('update:modelValue', false)">閉じる</Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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

const parsedDetails = computed<ApiErrorDetail[]>(() => {
  const errorMessage = props.errorMessage
  if (!errorMessage) return []

  try {
    const jsonMatch = errorMessage.match(/\{.*\}/s)
    if (!jsonMatch) return []

    const errorData = JSON.parse(jsonMatch[0])
    if (!errorData?.detail || !Array.isArray(errorData.detail)) return []

    const details: ApiErrorDetail[] = []
    for (const err of errorData.detail) {
      const loc = err.loc || []
      let rowIndex: number | null = null
      let field = ''

      if (loc.length >= 3 && typeof loc[1] === 'number') {
        rowIndex = loc[1]
        field = String(loc[2] || '')
      } else if (loc.length >= 2) {
        field = String(loc[loc.length - 1] || '')
      }

      let inputStr: string | undefined
      if (err.input !== undefined && err.input !== null) {
        const rawStr = typeof err.input === 'string' ? err.input : JSON.stringify(err.input)
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
.alert-error {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #991b1b;
  font-weight: 500;
}

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
