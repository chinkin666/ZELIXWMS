<template>
  <OrderBottomBar
    :total-count="allRowsCount"
    :selected-count="selectedCount"
    :error-count="errorCount"
    :total-label="t('wms.shipmentOrder.registrationTarget', '登録対象')"
  >
    <template #left>
      <template v-if="bundleModeEnabled">
        <Button
          variant="default"
          size="sm"
          :disabled="selectedCount === 0 || selectedBundleGroupKeysCount === 0"
          @click="$emit('bundle-merge')"
        >
          {{ t('wms.shipmentOrder.bundle', '同梱する') }}
        </Button>
        <Button
          variant="warning"
          size="sm"
          :disabled="!hasUnbundleableRows"
          @click="$emit('unbundle')"
        >
          {{ t('wms.shipmentOrder.unbundle', '同梱を解除する') }}
        </Button>
      </template>
      <template v-else>
        <Button
          variant="default"
          size="sm"
          :disabled="selectedCount === 0"
          @click="$emit('ship-plan-date')"
        >
          {{ t('wms.shipmentOrder.bulkShipDate', '出荷予定日一括設定') }}
        </Button>
        <Button
          variant="default"
          size="sm"
          :disabled="selectedCount === 0"
          @click="$emit('sender-bulk')"
        >
          {{ t('wms.shipmentOrder.bulkSender', 'ご依頼主一括設定') }}
        </Button>
        <Button
          variant="default"
          size="sm"
          :disabled="selectedCount === 0 || !hasCarriers"
          @click="$emit('carrier-bulk')"
        >
          {{ t('wms.shipmentOrder.bulkCarrier', '配送業者一括設定') }}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          :disabled="allRowsCount === 0"
          @click="$emit('clear-all')"
        >
          {{ t('wms.shipmentOrder.clearData', 'データクリア') }}
        </Button>
      </template>
    </template>
    <template #center>
      <div class="bottom-bar__meta">
        {{ t('wms.shipmentOrder.registrationTarget', '登録対象') }}：<strong>{{ allRowsCount }}</strong>{{ t('wms.common.items', '件') }}
        <span v-if="errorCount > 0" class="bottom-bar__errors">
          （{{ t('wms.shipmentOrder.errors', '誤り') }}：<strong>{{ errorCount }}</strong>{{ t('wms.common.items', '件') }}）
        </span>
        <span v-if="unregisteredSkuRowCount > 0" class="bottom-bar__unregistered">
          （{{ t('wms.shipmentOrder.unregisteredSku', '商品SKU未登録') }}：<strong>{{ unregisteredSkuRowCount }}</strong>{{ t('wms.common.items', '件') }}）
        </span>
      </div>
    </template>
    <template #alert>
      <div v-if="backendErrorCount > 0" class="bottom-bar__alert">
        <span>{{ t('wms.shipmentOrder.serverErrorMessage', 'サーバー側でエラーが発生しました。エラー行のみ表示に切り替えています。') }}</span>
        <Button class="bottom-bar__alert-close" @click="$emit('clear-backend-errors')">&times;</Button>
      </div>
    </template>
    <template #right>
      <template v-if="displayFilter === 'pending_confirm'">
        <Button
          variant="default"
          :disabled="allRowsCount === 0 || isSubmitting"
          @click="$emit('submit')"
        >
          {{ isSubmitting ? t('wms.shipmentOrder.confirming', '確認中...') : t('wms.shipmentOrder.confirmShipment', '出荷確認する') }}
        </Button>
        <Button
          v-if="backendErrorCount > 0"
          variant="destructive"
          @click="$emit('show-error-detail')"
        >
          {{ t('wms.shipmentOrder.errorDetail', 'エラー詳細') }}
        </Button>
      </template>
      <template v-else-if="displayFilter === 'processing'">
        <Button
          variant="destructive"
          :disabled="selectedCount === 0"
          @click="$emit('delete-pending')"
        >
          {{ t('wms.common.delete', '削除') }}
        </Button>
        <Button
          variant="default"
          :disabled="selectedCount === 0 || isConfirming"
          @click="$emit('confirm-print-ready')"
        >
          {{ isConfirming ? t('wms.shipmentOrder.confirmingOrder', '確定中...') : t('wms.shipmentOrder.confirmShipInstruction', '出荷指示確定') }}
        </Button>
        <Button
          variant="secondary"
          :disabled="isLoadingPendingWaybill"
          @click="$emit('reload-pending')"
        >
          {{ isLoadingPendingWaybill ? t('wms.shipmentOrder.loading', '読込中...') : t('wms.shipmentOrder.reload', '再読込') }}
        </Button>
      </template>
      <template v-else-if="displayFilter === 'pending_waybill'">
        <Button
          variant="secondary"
          :disabled="isLoadingPendingWaybill"
          @click="$emit('reload-pending')"
        >
          {{ isLoadingPendingWaybill ? t('wms.shipmentOrder.loading', '読込中...') : t('wms.shipmentOrder.reload', '再読込') }}
        </Button>
      </template>
    </template>
  </OrderBottomBar>
</template>

<script setup lang="ts">
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

defineProps<{
  allRowsCount: number
  selectedCount: number
  errorCount: number
  unregisteredSkuRowCount: number
  backendErrorCount: number
  bundleModeEnabled: boolean
  selectedBundleGroupKeysCount: number
  hasUnbundleableRows: boolean
  hasCarriers: boolean
  displayFilter: string
  isSubmitting: boolean
  isConfirming: boolean
  isLoadingPendingWaybill: boolean
}>()

defineEmits<{
  (e: 'bundle-merge'): void
  (e: 'unbundle'): void
  (e: 'ship-plan-date'): void
  (e: 'sender-bulk'): void
  (e: 'carrier-bulk'): void
  (e: 'clear-all'): void
  (e: 'clear-backend-errors'): void
  (e: 'submit'): void
  (e: 'show-error-detail'): void
  (e: 'delete-pending'): void
  (e: 'confirm-print-ready'): void
  (e: 'reload-pending'): void
}>()
</script>

<style scoped>
.bottom-bar__meta { font-size: var(--o-font-size-small, 13px); color: var(--o-gray-700, #495057); }
.bottom-bar__errors { color: var(--o-danger, #dc3545); }
.bottom-bar__unregistered { color: var(--o-warning, #ffac00); }
.bottom-bar__alert {
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f56c6c;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.bottom-bar__alert-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #f56c6c; }
</style>
