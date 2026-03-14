<template>
  <div class="editor-right">
    <div class="preview-header">
      <div class="preview-controls">
        <span class="preview-label">{{ t('wms.formEditor.previewRowCount', 'プレビュー行数:') }}</span>
        <input type="number" :value="previewRowCount" min="1" max="100" class="o-input" style="width: 100px" @input="$emit('update:previewRowCount', parseInt(($event.target as HTMLInputElement).value))" />
      </div>
    </div>
    <div class="preview-container">
      <div v-if="previewError" class="preview-error">
        <span class="error-icon" style="font-size: 48px">&#x26A0;</span>
        <p>{{ t('wms.formEditor.previewError', 'プレビューエラー') }}</p>
        <pre class="error-message">{{ previewError }}</pre>
      </div>
      <iframe
        v-else-if="previewUrl"
        :src="previewUrl"
        class="preview-iframe"
        frameborder="0"
      />
      <div v-else class="preview-placeholder">
        <p>{{ t('wms.formEditor.previewGenerating', 'プレビューを生成中...') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
defineProps<{
  previewRowCount: number
  previewUrl: string | null
  previewError: string | null
}>()

defineEmits<{
  'update:previewRowCount': [value: number]
}>()
</script>

<style scoped>
.editor-right { flex: 0 0 50%; min-width: 0; display: flex; flex-direction: column; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; }
.preview-header { padding: 12px 16px; border-bottom: 1px solid #dcdfe6; background: #f5f7fa; }
.preview-controls { display: flex; align-items: center; gap: 8px; }
.preview-label { font-size: 14px; color: #606266; }
.preview-container { flex: 1; min-height: 0; position: relative; overflow: hidden; }
.preview-iframe { width: 100%; height: 100%; border: none; }
.preview-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: #909399; font-size: 14px; }
.preview-error { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; color: #f56c6c; }
.preview-error p { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
.preview-error .error-message { max-width: 100%; padding: 12px; background: #fef0f0; border: 1px solid #fbc4c4; border-radius: 4px; font-size: 12px; color: #c45656; white-space: pre-wrap; word-break: break-all; overflow: auto; max-height: 200px; }
.o-input { padding: 6px 10px; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px; font-size: 13px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
.o-input:focus { border-color: var(--o-primary, #714B67); }
</style>
