<template>
  <Dialog :open="visibleProxy" @update:open="visibleProxy = $event">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
      </DialogHeader>
    <!-- 結果摘要 -->
    <div class="summary">
      <div
        class="alert-banner"
        :class="hasErrors ? 'alert-error' : 'alert-success'"
      >
        <svg v-if="hasErrors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span>{{ summaryTitle }}</span>
      </div>

      <!-- 統計数字（エラーがない場合） -->
      <div v-if="!hasErrors" class="stats">
        <span v-if="result.insertedCount > 0" class="o-badge o-badge-success" style="font-size: 14px; padding: 6px 12px">
          登録: {{ result.insertedCount }}件
        </span>
        <span v-if="result.updatedCount > 0" class="o-badge o-badge-warning" style="font-size: 14px; padding: 6px 12px">
          更新: {{ result.updatedCount }}件
        </span>
        <span v-if="result.skippedCount > 0" class="o-badge o-badge-info" style="font-size: 14px; padding: 6px 12px">
          スキップ: {{ result.skippedCount }}件
        </span>
      </div>
    </div>

    <!-- エラーテーブル（エラーがある場合） -->
    <div v-if="hasErrors" style="max-height: 360px; overflow: auto; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px">
      <table class="o-list-table" style="font-size: 13px">
        <thead>
          <tr>
            <th style="width: 90px">行</th>
            <th style="width: 180px">SKU</th>
            <th style="width: 160px">フィールド</th>
            <th style="min-width: 360px">メッセージ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(err, idx) in result.errors" :key="idx">
            <td>{{ (err.rowIndex ?? 0) + 1 }}</td>
            <td>{{ err.sku }}</td>
            <td>{{ err.field }}</td>
            <td>{{ err.message }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- スキップされたSKU一覧（skipモードの場合） -->
    <div v-else-if="result.skippedSkus && result.skippedSkus.length > 0" class="skipped-section">
      <h4>スキップされたSKU:</h4>
      <div class="skipped-tags">
        <span
          v-for="sku in result.skippedSkus.slice(0, 20)"
          :key="sku"
          class="o-badge o-badge-info"
        >
          {{ sku }}
        </span>
        <span v-if="result.skippedSkus.length > 20" style="color: var(--o-gray-500, #6c757d); font-size: 13px">
          ...他 {{ result.skippedSkus.length - 20 }}件
        </span>
      </div>
    </div>

    <DialogFooter>
      <Button variant="default" @click="visibleProxy = false">閉じる</Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export type ImportRowError = {
  rowIndex: number
  sku?: string
  field?: string
  message: string
}

export type ImportResultData = {
  insertedCount: number
  updatedCount: number
  skippedCount: number
  skippedSkus: string[]
  errors?: ImportRowError[]
}

const props = defineProps<{
  modelValue: boolean
  result: ImportResultData
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const hasErrors = computed(() => {
  return props.result.errors && props.result.errors.length > 0
})

const dialogTitle = computed(() => {
  return hasErrors.value ? '取込エラー' : '取込結果'
})

const summaryTitle = computed(() => {
  if (hasErrors.value) {
    return '取込を実行できません。以下のエラーを修正してください。'
  }

  const parts: string[] = []
  if (props.result.insertedCount > 0) {
    parts.push(`${props.result.insertedCount}件登録`)
  }
  if (props.result.updatedCount > 0) {
    parts.push(`${props.result.updatedCount}件更新`)
  }
  if (props.result.skippedCount > 0) {
    parts.push(`${props.result.skippedCount}件スキップ`)
  }

  if (parts.length === 0) {
    return '取込が完了しました。'
  }
  return parts.join('、') + 'しました。'
})
</script>

<style scoped>
.summary {
  margin-bottom: 16px;
}

.alert-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.alert-error {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fde2e2;
}

.alert-success {
  background: #f0f9eb;
  color: #67c23a;
  border: 1px solid #e1f3d8;
}

.stats {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.skipped-section {
  margin-top: 16px;
}

.skipped-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.skipped-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
