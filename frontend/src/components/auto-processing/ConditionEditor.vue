<template>
  <div class="condition-editor">
    <div v-for="(cond, index) in modelValue" :key="index" class="condition-row">
      <div class="condition-type">
        <select
          class="o-input"
          :value="cond.type"
          @change="updateCondition(index, { ...cond, type: ($event.target as HTMLSelectElement).value as ConditionType })"
          style="width: 160px"
        >
          <option value="" disabled>条件タイプ</option>
          <option value="orderField">注文フィールド</option>
          <option value="orderStatus">注文ステータス</option>
          <option value="orderGroup">検品グループ</option>
          <option value="carrierRawRow">配送業者データ</option>
        </select>
      </div>

      <!-- orderField type -->
      <template v-if="cond.type === 'orderField'">
        <select
          class="o-input"
          :value="cond.fieldKey"
          @change="handleFieldKeyChange(index, cond, ($event.target as HTMLSelectElement).value)"
          style="width: 180px"
        >
          <option value="" disabled>フィールド</option>
          <optgroup
            v-for="cat in fieldCategories"
            :key="cat.key"
            :label="cat.label"
          >
            <option
              v-for="field in cat.fields"
              :key="field.dataKey || field.key"
              :value="field.dataKey || field.key"
            >
              {{ field.title }}
            </option>
          </optgroup>
        </select>

        <!-- normal field: operator + value -->
        <template v-if="cond.fieldKey">
          <select
            class="o-input"
            :value="cond.operator"
            @change="updateCondition(index, { ...cond, operator: ($event.target as HTMLSelectElement).value as OrderFieldOperator })"
            style="width: 130px"
          >
            <option value="" disabled>条件</option>
            <option
              v-for="op in getOperatorsForField(cond.fieldKey)"
              :key="op.value"
              :value="op.value"
            >
              {{ op.label }}
            </option>
          </select>

          <template v-if="!isNoValueOperator(cond.operator)">
            <!-- select field -->
            <select
              v-if="getFieldSearchType(cond.fieldKey) === 'select'"
              class="o-input"
              :value="cond.value as string"
              @change="updateCondition(index, { ...cond, value: ($event.target as HTMLSelectElement).value })"
              style="width: 180px"
            >
              <option value="" disabled>値</option>
              <option
                v-for="opt in getFieldSearchOptions(cond.fieldKey)"
                :key="String(opt.value)"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <!-- boolean field -->
            <select
              v-else-if="getFieldSearchType(cond.fieldKey) === 'boolean'"
              class="o-input"
              :value="cond.value as string"
              @change="updateCondition(index, { ...cond, value: ($event.target as HTMLSelectElement).value === 'true' })"
              style="width: 120px"
            >
              <option value="" disabled>値</option>
              <option :value="true">はい</option>
              <option :value="false">いいえ</option>
            </select>
            <!-- number field -->
            <input
              v-else-if="getFieldSearchType(cond.fieldKey) === 'number'"
              type="number"
              class="o-input"
              :value="cond.value as number"
              @input="updateCondition(index, { ...cond, value: Number(($event.target as HTMLInputElement).value) })"
              placeholder="値"
              style="width: 150px"
            />
            <!-- string / default -->
            <input
              v-else
              class="o-input"
              :value="cond.value as string"
              @input="updateCondition(index, { ...cond, value: ($event.target as HTMLInputElement).value })"
              placeholder="値"
              style="width: 200px"
            />
          </template>
        </template>
      </template>

      <!-- orderStatus type -->
      <template v-if="cond.type === 'orderStatus'">
        <select
          class="o-input"
          :value="cond.fieldKey"
          @change="handleFieldKeyChange(index, cond, ($event.target as HTMLSelectElement).value)"
          style="width: 160px"
        >
          <option value="" disabled>ステータス</option>
          <option
            v-for="sf in statusBooleanFields"
            :key="sf.key"
            :value="sf.key"
          >
            {{ sf.title }}
          </option>
        </select>
        <template v-if="cond.fieldKey">
          <select
            class="o-input"
            :value="cond.operator"
            @change="updateCondition(index, { ...cond, operator: ($event.target as HTMLSelectElement).value as OrderFieldOperator })"
            style="width: 130px"
          >
            <option value="" disabled>条件</option>
            <option value="is">一致</option>
            <option value="isNot">不一致</option>
          </select>
          <select
            v-if="!isNoValueOperator(cond.operator)"
            class="o-input"
            :value="cond.value as string"
            @change="updateCondition(index, { ...cond, value: ($event.target as HTMLSelectElement).value === 'true' })"
            style="width: 120px"
          >
            <option value="" disabled>値</option>
            <option :value="true">はい</option>
            <option :value="false">いいえ</option>
          </select>
        </template>
      </template>

      <!-- orderGroup type -->
      <template v-if="cond.type === 'orderGroup'">
        <select
          class="o-input"
          multiple
          :value="cond.orderGroupIds || []"
          @change="updateCondition(index, { ...cond, fieldKey: 'orderGroupId', orderGroupIds: Array.from(($event.target as HTMLSelectElement).selectedOptions, o => o.value) })"
          style="width: 300px"
        >
          <option
            v-for="g in orderGroups"
            :key="g.orderGroupId"
            :value="g.orderGroupId"
          >
            {{ g.name }}
          </option>
        </select>
      </template>

      <!-- carrierRawRow type -->
      <template v-if="cond.type === 'carrierRawRow'">
        <input
          class="o-input"
          :value="cond.carrierColumnName"
          @input="updateCondition(index, { ...cond, carrierColumnName: ($event.target as HTMLInputElement).value })"
          placeholder="列名"
          style="width: 160px"
        />
        <select
          class="o-input"
          :value="cond.carrierOperator"
          @change="updateCondition(index, { ...cond, carrierOperator: ($event.target as HTMLSelectElement).value as RawRowOperator })"
          style="width: 120px"
        >
          <option value="" disabled>条件</option>
          <option
            v-for="(label, key) in RAW_ROW_OPERATOR_LABELS"
            :key="key"
            :value="key"
          >
            {{ label }}
          </option>
        </select>
        <input
          v-if="!isNoValueRawRowOperator(cond.carrierOperator)"
          class="o-input"
          :value="cond.carrierValue as string"
          @input="updateCondition(index, { ...cond, carrierValue: ($event.target as HTMLInputElement).value })"
          placeholder="値"
          style="width: 180px"
        />
      </template>

      <button
        class="o-btn o-btn-danger o-btn-sm"
        @click="removeCondition(index)"
        title="削除"
      >
        ✕
      </button>
    </div>

    <button class="o-btn o-btn-secondary o-btn-sm" @click="addCondition">
      + 条件を追加
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { AutoProcessingCondition, ConditionType, RawRowOperator, OrderFieldOperator } from '@/types/autoProcessingRule'
import { RAW_ROW_OPERATOR_LABELS } from '@/types/autoProcessingRule'
import { fetchOrderGroups } from '@/api/orderGroup'
import { fetchCarriers } from '@/api/carrier'
import type { OrderGroup } from '@/types/orderGroup'
import type { Carrier } from '@/types/carrier'
import type { TableColumn, SearchOption } from '@/types/table'
import { getOrderFieldDefinitions } from '@/types/order'

const props = defineProps<{
  modelValue: AutoProcessingCondition[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AutoProcessingCondition[]): void
}>()

const orderGroups = ref<OrderGroup[]>([])
const carriers = ref<Carrier[]>([])

// Field definitions for orderField conditions
const fieldDefs = computed(() => {
  const carrierOptions = carriers.value.map((c) => ({ label: c.name, value: c._id }))
  return getOrderFieldDefinitions({ carrierOptions })
})

// Status boolean fields (hardcoded, key = actual nested path)
const statusBooleanFields: TableColumn[] = [
  { key: 'status.confirm.isConfirmed', title: '確認済み', width: 0, searchType: 'boolean' },
  { key: 'status.carrierReceipt.isReceived', title: '取込済み', width: 0, searchType: 'boolean' },
  { key: 'status.printed.isPrinted', title: '印刷済み', width: 0, searchType: 'boolean' },
  { key: 'status.inspected.isInspected', title: '検品済み', width: 0, searchType: 'boolean' },
  { key: 'status.shipped.isShipped', title: '出荷済み', width: 0, searchType: 'boolean' },
  { key: 'status.ecExported.isExported', title: 'EC連携済み', width: 0, searchType: 'boolean' },
]

// Searchable fields grouped by category
const fieldCategories = computed(() => {
  const categories: Record<string, { key: string; label: string; fields: TableColumn[] }> = {}
  const catLabels: Record<string, string> = {
    shipping: '出荷情報',
    product: '商品',
    recipient: '送付先情報',
    sender: 'ご依頼主情報',
    orderer: '注文者情報',
    other: 'その他',
  }

  for (const col of fieldDefs.value) {
    if (!col.searchType && !col.fieldType) continue
    // Skip orderGroupId - it's handled separately
    if (col.key === 'orderGroupId') continue
    const cat = (col as any).category || 'other'
    if (!categories[cat]) {
      categories[cat] = { key: cat, label: catLabels[cat] || cat, fields: [] }
    }
    categories[cat].fields.push(col)
  }
  return Object.values(categories)
})

const findFieldDef = (fieldKey: string): TableColumn | undefined => {
  // Check status boolean fields first
  const statusField = statusBooleanFields.find((f) => f.key === fieldKey)
  if (statusField) return statusField
  // Then check field definitions by dataKey or key
  return fieldDefs.value.find((f) => (f.dataKey || f.key) === fieldKey || f.key === fieldKey)
}

const getFieldSearchType = (fieldKey: string) => {
  const def = findFieldDef(fieldKey)
  return def?.searchType || 'string'
}

const getFieldSearchOptions = (fieldKey: string): SearchOption[] => {
  const def = findFieldDef(fieldKey)
  return def?.searchOptions || []
}

type OpOption = { label: string; value: string }

const stringOperators: OpOption[] = [
  { label: '一致', value: 'is' },
  { label: '不一致', value: 'isNot' },
  { label: '含む', value: 'contains' },
  { label: '含まない', value: 'notContains' },
  { label: '値あり', value: 'hasAnyValue' },
  { label: '空', value: 'isEmpty' },
]

const numberOperators: OpOption[] = [
  { label: '等しい', value: 'equals' },
  { label: '等しくない', value: 'notEquals' },
  { label: '超える', value: 'greaterThan' },
  { label: '以上', value: 'greaterThanOrEqual' },
  { label: '未満', value: 'lessThan' },
  { label: '以下', value: 'lessThanOrEqual' },
  { label: '値あり', value: 'hasAnyValue' },
]

const dateOperators: OpOption[] = [
  { label: '一致', value: 'is' },
  { label: '以前', value: 'before' },
  { label: '以降', value: 'after' },
  { label: '値あり', value: 'hasAnyValue' },
  { label: '空', value: 'isEmpty' },
]

const selectOperators: OpOption[] = [
  { label: '一致', value: 'is' },
  { label: '不一致', value: 'isNot' },
  { label: '値あり', value: 'hasAnyValue' },
]

const booleanOperators: OpOption[] = [
  { label: '一致', value: 'is' },
  { label: '不一致', value: 'isNot' },
]

const getOperatorsForField = (fieldKey: string): OpOption[] => {
  const searchType = getFieldSearchType(fieldKey)
  switch (searchType) {
    case 'number': return numberOperators
    case 'date':
    case 'daterange': return dateOperators
    case 'select': return selectOperators
    case 'boolean': return booleanOperators
    default: return stringOperators
  }
}

const isNoValueOperator = (op?: OrderFieldOperator | string): boolean => {
  return op === 'hasAnyValue' || op === 'isEmpty'
}

const isNoValueRawRowOperator = (op?: RawRowOperator | string): boolean => {
  return op === 'hasAnyValue' || op === 'isEmpty'
}

const updateCondition = (index: number, cond: AutoProcessingCondition) => {
  const updated = [...props.modelValue]
  updated[index] = cond
  emit('update:modelValue', updated)
}

const handleFieldKeyChange = (index: number, cond: AutoProcessingCondition, newFieldKey: string) => {
  // Reset value when field changes
  const updated: AutoProcessingCondition = {
    type: 'orderField',
    fieldKey: newFieldKey,
    operator: undefined,
    value: undefined,
    orderGroupIds: newFieldKey === 'orderGroupId' ? [] : undefined,
  }
  updateCondition(index, updated)
}

const addCondition = () => {
  emit('update:modelValue', [
    ...props.modelValue,
    { type: 'orderField' as ConditionType },
  ])
}

const removeCondition = (index: number) => {
  const updated = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
}

onMounted(async () => {
  const [groups, cars] = await Promise.all([
    fetchOrderGroups().catch(() => []),
    fetchCarriers().catch(() => []),
  ])
  orderGroups.value = groups
  carriers.value = cars
})
</script>

<style scoped>
.condition-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
