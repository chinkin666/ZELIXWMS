<template>
  <div class="condition-editor">
    <div v-for="(cond, index) in modelValue" :key="index" class="condition-row">
      <div class="condition-type">
        <el-select
          :model-value="cond.type"
          @update:model-value="updateCondition(index, { ...cond, type: $event as ConditionType })"
          placeholder="条件タイプ"
          style="width: 160px"
        >
          <el-option label="注文フィールド" value="orderField" />
          <el-option label="注文ステータス" value="orderStatus" />
          <el-option label="検品グループ" value="orderGroup" />
          <el-option label="配送会社データ" value="carrierRawRow" />
        </el-select>
      </div>

      <!-- orderField type -->
      <template v-if="cond.type === 'orderField'">
        <el-select
          :model-value="cond.fieldKey"
          @update:model-value="handleFieldKeyChange(index, cond, $event)"
          placeholder="フィールド"
          filterable
          style="width: 180px"
        >
          <el-option-group
            v-for="cat in fieldCategories"
            :key="cat.key"
            :label="cat.label"
          >
            <el-option
              v-for="field in cat.fields"
              :key="field.dataKey || field.key"
              :label="field.title"
              :value="field.dataKey || field.key"
            />
          </el-option-group>
        </el-select>

        <!-- normal field: operator + value -->
        <template v-if="cond.fieldKey">
          <el-select
            :model-value="cond.operator"
            @update:model-value="updateCondition(index, { ...cond, operator: $event })"
            placeholder="条件"
            style="width: 130px"
          >
            <el-option
              v-for="op in getOperatorsForField(cond.fieldKey)"
              :key="op.value"
              :label="op.label"
              :value="op.value"
            />
          </el-select>

          <template v-if="!isNoValueOperator(cond.operator)">
            <!-- select field -->
            <el-select
              v-if="getFieldSearchType(cond.fieldKey) === 'select'"
              :model-value="cond.value as string"
              @update:model-value="updateCondition(index, { ...cond, value: $event })"
              placeholder="値"
              style="width: 180px"
            >
              <el-option
                v-for="opt in getFieldSearchOptions(cond.fieldKey)"
                :key="String(opt.value)"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>
            <!-- boolean field -->
            <el-select
              v-else-if="getFieldSearchType(cond.fieldKey) === 'boolean'"
              :model-value="cond.value as string"
              @update:model-value="updateCondition(index, { ...cond, value: $event })"
              placeholder="値"
              style="width: 120px"
            >
              <el-option label="はい" :value="true" />
              <el-option label="いいえ" :value="false" />
            </el-select>
            <!-- number field -->
            <el-input-number
              v-else-if="getFieldSearchType(cond.fieldKey) === 'number'"
              :model-value="cond.value as number"
              @update:model-value="updateCondition(index, { ...cond, value: $event })"
              placeholder="値"
              style="width: 150px"
              controls-position="right"
            />
            <!-- string / default -->
            <el-input
              v-else
              :model-value="cond.value as string"
              @update:model-value="updateCondition(index, { ...cond, value: $event })"
              placeholder="値"
              style="width: 200px"
            />
          </template>
        </template>
      </template>

      <!-- orderStatus type -->
      <template v-if="cond.type === 'orderStatus'">
        <el-select
          :model-value="cond.fieldKey"
          @update:model-value="handleFieldKeyChange(index, cond, $event)"
          placeholder="ステータス"
          style="width: 160px"
        >
          <el-option
            v-for="sf in statusBooleanFields"
            :key="sf.key"
            :label="sf.title"
            :value="sf.key"
          />
        </el-select>
        <template v-if="cond.fieldKey">
          <el-select
            :model-value="cond.operator"
            @update:model-value="updateCondition(index, { ...cond, operator: $event })"
            placeholder="条件"
            style="width: 130px"
          >
            <el-option label="一致" value="is" />
            <el-option label="不一致" value="isNot" />
          </el-select>
          <el-select
            v-if="!isNoValueOperator(cond.operator)"
            :model-value="cond.value as string"
            @update:model-value="updateCondition(index, { ...cond, value: $event })"
            placeholder="値"
            style="width: 120px"
          >
            <el-option label="はい" :value="true" />
            <el-option label="いいえ" :value="false" />
          </el-select>
        </template>
      </template>

      <!-- orderGroup type -->
      <template v-if="cond.type === 'orderGroup'">
        <el-select
          :model-value="cond.orderGroupIds || []"
          @update:model-value="updateCondition(index, { ...cond, fieldKey: 'orderGroupId', orderGroupIds: $event })"
          multiple
          placeholder="グループを選択"
          style="width: 300px"
        >
          <el-option
            v-for="g in orderGroups"
            :key="g.orderGroupId"
            :label="g.name"
            :value="g.orderGroupId"
          />
        </el-select>
      </template>

      <!-- carrierRawRow type -->
      <template v-if="cond.type === 'carrierRawRow'">
        <el-input
          :model-value="cond.carrierColumnName"
          @update:model-value="updateCondition(index, { ...cond, carrierColumnName: $event })"
          placeholder="列名"
          style="width: 160px"
        />
        <el-select
          :model-value="cond.carrierOperator"
          @update:model-value="updateCondition(index, { ...cond, carrierOperator: $event })"
          placeholder="条件"
          style="width: 120px"
        >
          <el-option
            v-for="(label, key) in RAW_ROW_OPERATOR_LABELS"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
        <el-input
          v-if="!isNoValueRawRowOperator(cond.carrierOperator)"
          :model-value="cond.carrierValue as string"
          @update:model-value="updateCondition(index, { ...cond, carrierValue: $event })"
          placeholder="値"
          style="width: 180px"
        />
      </template>

      <el-button
        type="danger"
        :icon="Delete"
        circle
        size="small"
        @click="removeCondition(index)"
      />
    </div>

    <el-button :icon="Plus" @click="addCondition" size="small">
      条件を追加
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
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
