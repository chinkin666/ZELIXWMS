<template>
  <div class="bottom-bar">
    <div class="bottom-bar__left">
      <div class="bottom-bar__meta">
        {{ t('wms.inspection.orderNo', '出荷管理No') }}: <strong>{{ orderNumber }}</strong>
        <span class="meta-separator">|</span>
        {{ t('wms.inspection.pendingScan', 'スキャン待ち') }}: <strong>{{ pendingCount }}</strong>{{ t('wms.common.items', '件') }}
        <span class="meta-separator">|</span>
        {{ t('wms.inspection.scannedItems', 'スキャン済み') }}: <strong>{{ scannedCount }}</strong>{{ t('wms.common.items', '件') }}
      </div>
    </div>
    <div class="bottom-bar__right">
      <Button
        variant="warning"
        :disabled="isUnconfirming"
        @click="$emit('open-unconfirm')"
      >
        {{ isUnconfirming ? t('wms.common.processing', '処理中...') : t('wms.inspection.unconfirm', '確認取消') }}
      </Button>
      <Button
        variant="info"
        :disabled="isChangingInvoiceType"
        @click="$emit('open-change-invoice-type')"
      >
        {{ isChangingInvoiceType ? t('wms.common.processing', '処理中...') : t('wms.inspection.changeInvoiceType', '送り状種類変更') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'

const { t } = useI18n()

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
