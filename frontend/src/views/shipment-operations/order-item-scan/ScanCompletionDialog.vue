<template>
  <ODialog
    :open="open"
    title="スキャン完了"
    size="lg"
  >
    <div class="completion-message">
      <p>すべての商品のスキャンが完了しました。</p>
      <p>出荷管理No: {{ orderNumber }}</p>
    </div>

    <div class="print-preview-section">
      <div v-if="printRendering" class="rendering">レンダリング中...</div>
      <div v-else-if="printError" class="error">{{ printError }}</div>
      <div v-else-if="!printImageUrl" class="placeholder">印刷プレビューを生成中...</div>
      <div v-else class="preview">
        <img :src="printImageUrl" class="preview-img" />
      </div>
    </div>

    <template #footer>
      <OButton variant="secondary" @click="$emit('confirm-no-print')">確認（印刷なし）</OButton>
      <OButton
        variant="primary"
        :disabled="!printImageUrl || printRendering"
        @click="$emit('print')"
      >
        印刷
      </OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'

defineProps<{
  open: boolean
  orderNumber: string
  printRendering: boolean
  printError: string
  printImageUrl: string
}>()

defineEmits<{
  'confirm-no-print': []
  'print': []
}>()
</script>

<style scoped>
.completion-message {
  margin-bottom: 20px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.completion-message p {
  margin: 8px 0;
  font-size: 14px;
  color: #303133;
}

.print-preview-section {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  height: 520px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
}

.print-preview-section .preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.rendering,
.placeholder {
  color: #6b7280;
  padding: 12px;
  font-size: 14px;
}

.error {
  color: #b91c1c;
  padding: 12px;
  font-size: 14px;
  text-align: center;
}
</style>
