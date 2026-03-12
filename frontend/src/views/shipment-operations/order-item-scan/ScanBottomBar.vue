<template>
  <div class="bottom-bar">
    <div class="bottom-bar__left">
      <div class="bottom-bar__meta">
        出荷管理No: <strong>{{ orderNumber }}</strong>
        <span class="meta-separator">|</span>
        スキャン待ち: <strong>{{ pendingCount }}</strong>件
        <span class="meta-separator">|</span>
        スキャン済み: <strong>{{ scannedCount }}</strong>件
      </div>
    </div>
    <div class="bottom-bar__right">
      <OButton
        variant="warning"
        :disabled="isUnconfirming"
        @click="$emit('open-unconfirm')"
      >
        {{ isUnconfirming ? '処理中...' : '確認取消' }}
      </OButton>
      <OButton
        variant="info"
        :disabled="isChangingInvoiceType"
        @click="$emit('open-change-invoice-type')"
      >
        {{ isChangingInvoiceType ? '処理中...' : '送り状種類変更' }}
      </OButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import OButton from '@/components/odoo/OButton.vue'

defineProps<{
  orderNumber: string
  pendingCount: number
  scannedCount: number
  isUnconfirming: boolean
  isChangingInvoiceType: boolean
}>()

defineEmits<{
  'open-unconfirm': []
  'open-change-invoice-type': []
}>()
</script>

<style scoped>
.bottom-bar {
  position: sticky;
  bottom: 0;
  margin-top: 16px;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 10;
}

.bottom-bar__left {
  color: #303133;
  font-size: 13px;
}

.bottom-bar__meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-separator {
  margin: 0 8px;
  color: #c0c4cc;
}

.bottom-bar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
</style>
