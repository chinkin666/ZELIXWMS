<template>
  <el-dialog
    v-model="visible"
    title="送り状種類変更"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="dialog-content">
      <!-- 订单信息 -->
      <div class="order-info">
        <p>選択中の注文: <strong>{{ orderCount }}</strong>件</p>
        <p v-if="hasExistingTrackingIds && hasBuiltInCarrier" class="warning-text">
          一部の注文は既にB2 Cloudに登録されています。変更を適用するとB2 Cloudから削除され、新しい送り状種類で再登録されます。
        </p>
        <p v-if="hasManualCarrier" class="error-text">
          手動連携の注文が含まれています。運送会社のシステムから手動で注文を削除してください。
        </p>
      </div>

      <!-- 送り状種類选择 -->
      <div class="invoice-type-section">
        <el-form-item label="新しい送り状種類" required>
          <el-select
            v-model="selectedInvoiceType"
            placeholder="選択してください"
            style="width: 100%"
          >
            <el-option
              v-for="option in invoiceTypeOptions"
              :key="option.value"
              :label="`${option.value}: ${option.label}`"
              :value="option.value"
              :disabled="!isOptionAvailable(option.value)"
            />
          </el-select>
        </el-form-item>
        <p v-if="coolTypeWarning" class="error-text">
          {{ coolTypeWarning }}
        </p>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleCancel">キャンセル</el-button>
      <el-button
        type="primary"
        :loading="loading"
        :disabled="!selectedInvoiceType"
        @click="handleConfirm"
      >
        変更して再提交
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OrderDocument } from '@/types/order'
import { isBuiltInCarrierId } from '@/utils/carrier'

const invoiceTypeOptions = [
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
  const option = invoiceTypeOptions.find((o) => o.value === selectedInvoiceType.value)
  return `選択した送り状種類「${option?.label}」はクール便に対応していません。クール便の注文が含まれているため選択できません。`
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
</style>
