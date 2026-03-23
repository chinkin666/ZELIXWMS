<template>
  <div class="editor-right">
    <div class="preview-header">
      <div class="preview-controls">
        <span class="preview-label">{{ t('wms.formEditor.previewRowCount', 'プレビュー行数:') }}</span>
        <Input type="number" :model-value="previewRowCount" min="1" max="100" style="width: 100px" @update:model-value="$emit('update:previewRowCount', parseInt($event))" />
      </div>
    </div>
    <div class="preview-container">
      <!-- 加载中遮罩 / ローディングオーバーレイ -->
      <div v-if="previewing" class="preview-loading-overlay">
        <span class="preview-spinner"></span>
        <span>{{ t('wms.formEditor.previewGenerating', 'プレビュー生成中...') }}</span>
      </div>
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
        <p>{{ t('wms.formEditor.previewWaiting', '左側で列を設定するとプレビューが表示されます') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
defineProps<{
  previewRowCount: number
  previewUrl: string | null
  previewError: string | null
  previewing?: boolean
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
.preview-placeholder { display: flex; align-items: center; justify-content: center; height: 100%; color: #909399; font-size: 14px; text-align: center; padding: 20px; }
.preview-loading-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; background: rgba(255,255,255,0.85); z-index: 10; font-size: 13px; color: #606266; }
.preview-spinner { width: 24px; height: 24px; border: 3px solid #dcdfe6; border-top-color: #0052A3; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.preview-error { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; color: #f56c6c; }
.preview-error p { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
.preview-error .error-message { max-width: 100%; padding: 12px; background: #fef0f0; border: 1px solid #fbc4c4; border-radius: 4px; font-size: 12px; color: #c45656; white-space: pre-wrap; word-break: break-all; overflow: auto; max-height: 200px; }
.{ padding: 6px 10px; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px; font-size: 13px; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
.o-input:focus { border-color: var(--o-primary, #0052A3); }
</style>
