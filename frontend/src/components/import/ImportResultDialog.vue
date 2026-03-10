<template>
  <el-dialog v-model="visibleProxy" width="860px" :title="dialogTitle" destroy-on-close>
    <!-- 結果摘要 -->
    <div class="summary">
      <el-alert
        :type="hasErrors ? 'error' : 'success'"
        :closable="false"
        :title="summaryTitle"
        show-icon
      />

      <!-- 統計数字（エラーがない場合） -->
      <div v-if="!hasErrors" class="stats">
        <el-tag v-if="result.insertedCount > 0" type="success" size="large">
          登録: {{ result.insertedCount }}件
        </el-tag>
        <el-tag v-if="result.updatedCount > 0" type="warning" size="large">
          更新: {{ result.updatedCount }}件
        </el-tag>
        <el-tag v-if="result.skippedCount > 0" type="info" size="large">
          スキップ: {{ result.skippedCount }}件
        </el-tag>
      </div>
    </div>

    <!-- エラーテーブル（エラーがある場合） -->
    <el-table v-if="hasErrors" :data="result.errors" height="360" border size="small">
      <el-table-column label="行" width="90">
        <template #default="{ row }">{{ (row.rowIndex ?? 0) + 1 }}</template>
      </el-table-column>
      <el-table-column prop="sku" label="SKU" width="180" />
      <el-table-column prop="field" label="フィールド" width="160" />
      <el-table-column prop="message" label="メッセージ" min-width="360" />
    </el-table>

    <!-- スキップされたSKU一覧（skipモードの場合） -->
    <div v-else-if="result.skippedSkus && result.skippedSkus.length > 0" class="skipped-section">
      <h4>スキップされたSKU:</h4>
      <div class="skipped-tags">
        <el-tag
          v-for="sku in result.skippedSkus.slice(0, 20)"
          :key="sku"
          size="small"
          type="info"
        >
          {{ sku }}
        </el-tag>
        <el-text v-if="result.skippedSkus.length > 20" type="info" size="small">
          ...他 {{ result.skippedSkus.length - 20 }}件
        </el-text>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" @click="visibleProxy = false">閉じる</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElDialog, ElAlert, ElTag, ElText, ElTable, ElTableColumn, ElButton } from 'element-plus'

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
