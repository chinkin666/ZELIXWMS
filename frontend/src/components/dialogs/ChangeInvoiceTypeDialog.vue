<template>
  <Dialog :open="visible" @update:open="(val: boolean) => { if (!val) handleCancel() }">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>送り状種類変更</DialogTitle>
      </DialogHeader>
    <div class="dialog-content">
      <div class="order-info">
        <p>選択中の出荷指示: <strong>{{ orderCount }}</strong>件</p>
        <p v-if="hasExistingTrackingIds && hasBuiltInCarrier" class="warning-text">
          一部の出荷指示は既にB2 Cloudに登録されています。変更を適用するとB2 Cloudから削除され、新しい送り状種類で再登録されます。
        </p>
        <p v-if="hasManualCarrier" class="error-text">
          手動連携の出荷指示が含まれています。運送会社のシステムから手動で削除してください。
        </p>
      </div>

      <div class="invoice-type-section">
        <div class="o-form-group">
          <label class="o-form-label">新しい送り状種類 *</label>
          <select
           
            v-model="selectedInvoiceType"
            style="width: 100%"
          >
            <option value="" disabled>選択してください</option>
            <option
              v-for="option in invoiceTypeOptions"
              :key="option.value"
              :value="option.value"
              :disabled="!isOptionAvailable(option.value)"
            >
              {{ option.value }}: {{ option.label }}
            </option>
          </select>
        </div>
        <p v-if="coolTypeWarning" class="error-text">
          {{ coolTypeWarning }}
        </p>
      </div>
    </div>

    <DialogFooter>
      <Button variant="secondary" @click="handleCancel">キャンセル</Button>
      <Button
        variant="default"
        :disabled="!selectedInvoiceType || loading"
        @click="handleConfirm"
      >
        {{ loading ? '処理中...' : '変更して再提交' }}
      </Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { OrderDocument } from '@/types/order'
import { isBuiltInCarrierId } from '@/utils/carrier'
import { useEnabledInvoiceTypes } from '@/composables/useEnabledInvoiceTypes'

const allInvoiceTypeOptions = [
  { label: '発払い', value: '0' },
  { label: 'EAZY', value: '1' },
  { label: 'コレクト', value: '2' },
  { label: 'クロネコゆうメール（DM便）', value: '3' },
  { label: 'タイム', value: '4' },
  { label: '着払い', value: '5' },
  { label: '発払い複数口', value: '6' },
  { label: 'クロネコゆうパケット', value: '7' },
  { label: '宅急便コンパクト', value: '8' },
  { label: 'コンパクトコレクト', value: '9' },
  { label: 'ネコポス', value: 'A' },
]

const { filterEnabledOptions } = useEnabledInvoiceTypes()
// 無効化された送り状種類を除外 / 无效化的送り状種類を除外
const invoiceTypeOptions = computed(() => filterEnabledOptions(allInvoiceTypeOptions))

const coolSupportedInvoiceTypes = new Set(['0', '2', '5'])

const props = defineProps<{
  modelValue: boolean
  orders: OrderDocument[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', newInvoiceType: string): void
  (e: 'cancel'): void
}>()

const visible = ref(props.modelValue)
const selectedInvoiceType = ref<string>('')

const orderCount = computed(() => props.orders.length)

const hasExistingTrackingIds = computed(() => {
  return props.orders.some((o) => o.trackingId && o.trackingId.trim())
})

const hasBuiltInCarrier = computed(() => {
  return props.orders.some((o) => isBuiltInCarrierId(o.carrierId))
})

const hasManualCarrier = computed(() => {
  return props.orders.some((o) => !isBuiltInCarrierId(o.carrierId))
})

const hasCoolOrders = computed(() => {
  return props.orders.some((o) => o.coolType && o.coolType !== '0')
})

const coolTypeWarning = computed(() => {
  if (!hasCoolOrders.value) return null
  if (!selectedInvoiceType.value) return null
  if (coolSupportedInvoiceTypes.has(selectedInvoiceType.value)) return null
  const option = invoiceTypeOptions.value.find((o) => o.value === selectedInvoiceType.value)
  return `選択した送り状種類「${option?.label}」はクール便に対応していません。クール便の出荷指示が含まれているため選択できません。`
})

const isOptionAvailable = (value: string) => {
  if (!hasCoolOrders.value) return true
  return coolSupportedInvoiceTypes.has(value)
}

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) {
      selectedInvoiceType.value = ''
    }
  }
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const handleConfirm = () => {
  if (selectedInvoiceType.value) {
    emit('confirm', selectedInvoiceType.value)
  }
}

const handleCancel = () => {
  visible.value = false
  emit('cancel')
}
</script>

<style scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-info {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.order-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #606266;
}

.warning-text {
  color: #e6a23c !important;
  font-size: 13px !important;
}

.error-text {
  color: #f56c6c !important;
  font-size: 13px !important;
  font-weight: 500;
}

.invoice-type-section {
  margin-top: 8px;
}

.o-form-group { margin-bottom:1rem; }
.o-form-label { display:block; font-size:var(--o-font-size-small, 13px); font-weight:500; color:var(--o-gray-700, #374151); margin-bottom:0.25rem; }
</style>
