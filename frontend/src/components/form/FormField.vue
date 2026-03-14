<template>
  <!-- Select with options -->
  <select
    v-if="column.searchOptions && column.searchOptions.length > 0"
    class="o-input"
    :key="`${dataKey}-${column.dependsOn ? getNestedValue(formData, column.dependsOn) : ''}`"
    :value="currentValue"
    :disabled="isDisabled"
    @change="(e: Event) => emit('update', dataKey, (e.target as HTMLSelectElement).value)"
  >
    <option value="">{{ `${column.title}を選択` }}</option>
    <option
      v-for="option in filteredOptions"
      :key="String(option.value)"
      :value="option.value"
    >{{ option.label }}</option>
  </select>

  <!-- Boolean -->
  <select
    v-else-if="column.fieldType === 'boolean'"
    class="o-input"
    :value="String(currentValue)"
    @change="(e: Event) => emit('update', dataKey, (e.target as HTMLSelectElement).value === 'true')"
  >
    <option value="">{{ `${column.title}を選択` }}</option>
    <option value="true">はい</option>
    <option value="false">いいえ</option>
  </select>

  <!-- Number -->
  <input
    v-else-if="column.fieldType === 'number'"
    class="o-input"
    type="number"
    :value="currentValue"
    :min="column.min"
    :max="column.max"
    :step="column.precision ? Math.pow(10, -column.precision) : 1"
    :disabled="isDisabled"
    :placeholder="isDisabled ? '-' : `${column.title}を入力`"
    @input="(e: Event) => { const v = (e.target as HTMLInputElement).value; emit('update', dataKey, v === '' ? undefined : Number(v)) }"
  />

  <!-- Date (datetime) -->
  <input
    v-else-if="column.fieldType === 'date'"
    class="o-input"
    type="datetime-local"
    :value="toDatetimeLocal(currentValue)"
    @input="(e: Event) => emit('update', dataKey, fromDatetimeLocal((e.target as HTMLInputElement).value))"
  />

  <!-- お届け日指定: select + conditional date picker -->
  <div v-else-if="column.fieldType === 'dateOnly' && isDeliveryDate" class="delivery-date-field">
    <select
      class="o-input delivery-date-select"
      :value="deliveryDateMode"
      @change="onDeliveryModeChange"
    >
      <option value="最短日">最短日</option>
      <option value="希望日指定">希望日指定</option>
    </select>
    <ODatePicker
      v-if="deliveryDateMode === '希望日指定'"
      class="delivery-date-input"
      :model-value="toDateInput(currentValue)"
      :min="minDeliveryDateStr"
      @update:model-value="(v: string) => emit('update', dataKey, fromDateInput(v))"
    />
  </div>

  <!-- Date (date only) -->
  <ODatePicker
    v-else-if="column.fieldType === 'dateOnly'"
    :model-value="toDateInput(currentValue)"
    :min="isShipPlanDate ? todayStr : undefined"
    @update:model-value="(v: string) => emit('update', dataKey, fromDateInput(v))"
  />

  <!-- String array (handlingTags, barcode, etc.) -->
  <div v-else-if="column.fieldType === 'array' && isStringArray" class="array-field">
    <div v-for="(item, index) in arrayValue" :key="index" class="array-item">
      <input
        class="o-input"
        :value="item"
        @input="(e: Event) => updateArrayItem(index, (e.target as HTMLInputElement).value)"
        :placeholder="`${column.title}を入力`"
        style="flex:1;margin-right:6px;"
      />
      <OButton variant="icon-danger" @click="removeArrayItem(index)" title="削除">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </OButton>
    </div>
    <button class="o-add-tag-btn" @click="addArrayItem">+ 追加</button>
  </div>

  <!-- Default text -->
  <input
    v-else
    class="o-input"
    :value="currentValue"
    :maxlength="column.maxLength"
    :disabled="isDisabled"
    :placeholder="isDisabled ? (column.placeholder || '-') : `${column.title}を入力`"
    @input="onTextInput"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import type { TableColumn } from '@/types/table'
import { getNestedValue } from '@/utils/nestedObject'
import { useEnabledInvoiceTypes } from '@/composables/useEnabledInvoiceTypes'
import { getMinDeliveryDate } from '@/utils/yamatoDeliveryDays'
import ODatePicker from '@/components/odoo/ODatePicker.vue'

const props = defineProps<{
  column: TableColumn
  formData: Record<string, any>
  isDisabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update', key: string, value: any): void
}>()

const dataKey = computed(() => (props.column.dataKey || props.column.key) as string)
const currentValue = computed(() => getNestedValue(props.formData, dataKey.value))

// 佐川急便用 送り状種類 / 佐川急便用送り状種類
const SAGAWA_INVOICE_OPTIONS = [
  { label: '元払い', value: '0' },
  { label: '着払い', value: '1' },
  { label: 'e-コレクト（代引き）', value: '2' },
]

// 佐川急便用 お届け時間帯 / 佐川急便用配達時間帯
const SAGAWA_TIME_SLOT_OPTIONS = [
  { label: '指定なし', value: '' },
  { label: '午前中', value: '午前中' },
  { label: '12:00-14:00', value: '12-14' },
  { label: '14:00-16:00', value: '14-16' },
  { label: '16:00-18:00', value: '16-18' },
  { label: '18:00-20:00', value: '18-20' },
  { label: '18:00-21:00', value: '18-21' },
  { label: '19:00-21:00', value: '19-21' },
  { label: '20:00-21:00', value: '20-21' },
]

function isSagawa(): boolean {
  const carrierId = String(getNestedValue(props.formData, 'carrierId') || '')
  return carrierId === '__builtin_sagawa__' || carrierId.includes('sagawa')
}

const { filterEnabledOptions } = useEnabledInvoiceTypes()

// 依存フィールドに基づいてオプションをフィルタリング / 依赖字段过滤选项
const filteredOptions = computed(() => {
  const col = props.column
  if (col.dependsOn === 'carrierId' && isSagawa()) {
    if (dataKey.value === 'invoiceType') return SAGAWA_INVOICE_OPTIONS
    if (dataKey.value === 'deliveryTimeSlot') return SAGAWA_TIME_SLOT_OPTIONS
  }
  const options = col.searchOptions || []
  // ヤマト B2: 無効化された送り状種類をフィルタリング / ヤマト B2: 无效化的送り状種類を过滤
  if (dataKey.value === 'invoiceType' && !isSagawa()) {
    return filterEnabledOptions(options)
  }
  return options
})

/** Default text input handler — strips characters not matching column.pattern */
const onTextInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  let value = input.value
  if (props.column.pattern) {
    const re = new RegExp(props.column.pattern)
    if (!re.test(value)) {
      // Strip disallowed chars by extracting char class from pattern
      const charClassMatch = props.column.pattern.match(/\[([^\]]+)\]/)
      if (charClassMatch) {
        const allowedChar = new RegExp(`[${charClassMatch[1]}]`)
        value = value.split('').filter((ch: string) => allowedChar.test(ch)).join('')
      }
      input.value = value
    }
  }
  emit('update', dataKey.value, value)
}
const isShipPlanDate = computed(() => dataKey.value === 'shipPlanDate')
const isDeliveryDate = computed(() => dataKey.value === 'deliveryDatePreference')
const isSaitanbi = computed(() => currentValue.value === '最短日')
const todayStr = new Date().toISOString().slice(0, 10)

const deliveryDateMode = ref(
  isSaitanbi.value || !currentValue.value ? '最短日' : '希望日指定'
)

// Sync mode when external value changes (e.g. form init)
watch(currentValue, (val) => {
  if (val === '最短日') {
    deliveryDateMode.value = '最短日'
  } else if (val && val !== '') {
    deliveryDateMode.value = '希望日指定'
  }
})

const onDeliveryModeChange = (e: Event) => {
  const mode = (e.target as HTMLSelectElement).value
  deliveryDateMode.value = mode
  if (mode === '最短日') {
    emit('update', dataKey.value, '最短日')
  } else {
    // 希望日指定: clear value, wait for date picker input
    emit('update', dataKey.value, '')
  }
}

const tomorrowStr = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

// ヤマト配達日数制限: 出荷予定日 + 地域間日数 = 最短お届け日
const minDeliveryDateStr = computed(() => {
  if (!isDeliveryDate.value) return undefined
  const shipPlanDate = getNestedValue(props.formData, 'shipPlanDate')
  const senderPref = getNestedValue(props.formData, 'sender.prefecture')
  const recipientPref = getNestedValue(props.formData, 'recipient.prefecture')
  const calculated = getMinDeliveryDate(shipPlanDate, senderPref, recipientPref)
  return calculated || tomorrowStr.value
})

const isStringArray = computed(() => {
  const key = dataKey.value
  return ['handlingTags', 'barcode', 'handlingTypes'].includes(key)
})

const arrayValue = computed(() => {
  const val = currentValue.value
  return Array.isArray(val) ? val : []
})

const updateArrayItem = (index: number, value: string) => {
  const arr = [...arrayValue.value]
  arr[index] = value
  emit('update', dataKey.value, arr)
}

const removeArrayItem = (index: number) => {
  const arr = [...arrayValue.value]
  arr.splice(index, 1)
  emit('update', dataKey.value, arr)
}

const addArrayItem = () => {
  emit('update', dataKey.value, [...arrayValue.value, ''])
}

// Date helpers
const toDatetimeLocal = (val: any): string => {
  if (!val) return ''
  if (typeof val === 'string') {
    const m = val.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
    if (m?.[1]) return m[1]
  }
  return ''
}

const fromDatetimeLocal = (val: string): string => {
  if (!val) return ''
  return `${val}:00.000`
}

const toDateInput = (val: any): string => {
  if (!val) return ''
  if (typeof val === 'string') {
    // Non-date values like "最短日" should return empty
    if (!/\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(val)) return ''
    return val.replace(/\//g, '-').substring(0, 10)
  }
  return ''
}

const fromDateInput = (val: string): string => {
  if (!val) return ''
  return val.replace(/-/g, '/')
}
</script>

<style scoped>
.array-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.array-item {
  display: flex;
  align-items: center;
}

.o-btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--o-gray-500, #6c757d);
  padding: 4px;
}
.o-btn-icon--danger:hover { color: #dc3545; }

.o-add-tag-btn {
  background: none;
  border: none;
  color: var(--o-brand-primary, #714B67);
  font-size: 12px;
  cursor: pointer;
  padding: 2px 0;
  text-align: left;
}
.o-add-tag-btn:hover { text-decoration: underline; }

.delivery-date-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.delivery-date-select {
  width: 110px !important;
  min-width: 110px;
  flex-shrink: 0;
  font-size: 12px;
  padding: 0.25rem 0.3rem;
}
.delivery-date-input {
  flex: 1;
  min-width: 0;
  font-size: 10px;
  padding: 0.15rem 0.25rem;
}
</style>
