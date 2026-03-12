<template>
  <div class="order-schema-analysis">
    <div class="analysis-header">
      <h3 class="analysis-title">スキーマ分析</h3>
      <div class="analysis-meta">
        <span class="o-badge o-badge-info">{{ orders.length }} 件</span>
      </div>
    </div>

    <div v-if="orders.length === 0" class="no-data">
      <div class="empty-state">分析対象のデータがありません</div>
    </div>

    <div v-else class="fields-list">
      <FieldAnalysisCard
        v-for="field in analysisResults"
        :key="field.fieldName"
        :data="field"
        @filter="handleFilter"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FieldAnalysisCard from './FieldAnalysisCard.vue'
import type { FieldAnalysisData } from './FieldAnalysisCard.vue'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'

const props = defineProps<{
  orders: OrderDocument[]
  carriers?: Carrier[]
}>()

const emit = defineEmits<{
  (e: 'filter', fieldPath: string, value: any): void
}>()

const handleFilter = (fieldPath: string, value: any) => {
  emit('filter', fieldPath, value)
}

// Value mappings
const coolTypeLabels: Record<string, string> = {
  '0': '通常',
  '1': 'クール冷凍',
  '2': 'クール冷蔵',
}

const invoiceTypeLabels: Record<string, string> = {
  '0': '発払い',
  '1': 'EAZY',
  '2': 'コレクト',
  '3': 'クロネコゆうメール',
  '4': 'タイム',
  '5': '着払い',
  '6': '発払い複数口',
  '7': 'クロネコゆうパケット',
  '8': '宅急便コンパクト',
  '9': 'コンパクトコレクト',
  'A': 'ネコポス',
}

const carrierMap = computed(() => {
  const map = new Map<string, string>()
  if (props.carriers) {
    for (const carrier of props.carriers) {
      if (carrier._id) {
        map.set(carrier._id, carrier.name)
      }
    }
  }
  return map
})

/**
 * Fields to analyze with their display names and paths
 */
type FieldDef = {
  path: string
  displayName: string
  isDate?: boolean
  valueTransform?: 'carrier' | 'invoiceType' | 'coolType' | 'boolean'
}

const fieldsToAnalyze: FieldDef[] = [
  // Basic order info
  { path: 'orderNumber', displayName: '出荷管理No' },
  { path: 'customerManagementNumber', displayName: 'お客様管理番号' },
  { path: 'carrierId', displayName: '配送業者', valueTransform: 'carrier' },
  { path: 'trackingId', displayName: '伝票番号' },
  { path: 'invoiceType', displayName: '送り状種類', valueTransform: 'invoiceType' },
  { path: 'coolType', displayName: 'クール区分', valueTransform: 'coolType' },
  { path: 'shipPlanDate', displayName: '出荷予定日', isDate: true },
  { path: 'deliveryDatePreference', displayName: 'お届け日指定', isDate: true },
  { path: 'deliveryTimeSlot', displayName: 'お届け時間帯' },
  { path: 'honorific', displayName: '敬称' },
  { path: 'handlingTags', displayName: '荷扱い' },
  { path: 'sourceOrderAt', displayName: '注文日時', isDate: true },

  // Recipient
  { path: 'recipient.postalCode', displayName: 'お届け先郵便番号' },
  { path: 'recipient.prefecture', displayName: 'お届け先都道府県' },
  { path: 'recipient.city', displayName: 'お届け先郡市区' },
  { path: 'recipient.street', displayName: 'お届け先町・番地' },
  { path: 'recipient.building', displayName: 'お届け先アパートマンション名' },
  { path: 'recipient.name', displayName: 'お届け先名' },
  { path: 'recipient.phone', displayName: 'お届け先電話番号' },

  // Sender
  { path: 'sender.postalCode', displayName: 'ご依頼主郵便番号' },
  { path: 'sender.prefecture', displayName: 'ご依頼主都道府県' },
  { path: 'sender.city', displayName: 'ご依頼主郡市区' },
  { path: 'sender.street', displayName: 'ご依頼主町・番地' },
  { path: 'sender.building', displayName: 'ご依頼主アパートマンション名' },
  { path: 'sender.name', displayName: 'ご依頼主名' },
  { path: 'sender.phone', displayName: 'ご依頼主電話番号' },

  // Orderer
  { path: 'orderer.postalCode', displayName: '注文者郵便番号' },
  { path: 'orderer.prefecture', displayName: '注文者都道府県' },
  { path: 'orderer.city', displayName: '注文者郡市区' },
  { path: 'orderer.street', displayName: '注文者町・番地' },
  { path: 'orderer.building', displayName: '注文者アパートマンション名' },
  { path: 'orderer.name', displayName: '注文者名' },
  { path: 'orderer.phone', displayName: '注文者電話番号' },

  // Products meta
  { path: '_productsMeta.skuCount', displayName: 'SKU種類数' },
  { path: '_productsMeta.totalQuantity', displayName: '商品総数量' },
  { path: '_productsMeta.totalPrice', displayName: '合計金額' },

  // Status
  { path: 'status.confirm.isConfirmed', displayName: '確認済み', valueTransform: 'boolean' },
  { path: 'status.printed.isPrinted', displayName: '印刷済み', valueTransform: 'boolean' },
  { path: 'status.shipped.isShipped', displayName: '出荷済み', valueTransform: 'boolean' },
  { path: 'status.carrierReceipt.isReceived', displayName: '取込済み', valueTransform: 'boolean' },
  { path: 'status.ecExported.isExported', displayName: 'EC連携済み', valueTransform: 'boolean' },

  // Carrier data
  { path: 'carrierData.yamato.sortingCode', displayName: '仕分けコード' },
  { path: 'carrierData.yamato.hatsuBaseNo1', displayName: '発店コード1' },
  { path: 'carrierData.yamato.hatsuBaseNo2', displayName: '発店コード2' },

  // Timestamps
  { path: 'createdAt', displayName: '作成日時', isDate: true },
  { path: 'updatedAt', displayName: '更新日時', isDate: true },
  { path: 'status.confirm.confirmedAt', displayName: '確認日時', isDate: true },
  { path: 'status.printed.printedAt', displayName: '印刷日時', isDate: true },
  { path: 'status.shipped.shippedAt', displayName: '出荷日時', isDate: true },
  { path: 'status.carrierReceipt.receivedAt', displayName: '取込日時', isDate: true },
]

/**
 * Get nested value from object by path
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}

/**
 * Check if value is empty
 */
function isEmpty(value: any): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

/**
 * Parse date string to Date object
 */
function parseDate(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const date = new Date(value)
    if (!isNaN(date.getTime())) return date
  }
  return null
}

/**
 * Format date to YYYY/MM/DD for grouping
 */
function formatDateForGrouping(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

/**
 * Transform value based on field type
 */
function transformValue(
  value: any,
  transform?: FieldDef['valueTransform']
): any {
  if (isEmpty(value)) return value

  switch (transform) {
    case 'carrier':
      return carrierMap.value.get(String(value)) || value
    case 'invoiceType':
      return invoiceTypeLabels[String(value)] || value
    case 'coolType':
      return coolTypeLabels[String(value)] || value
    case 'boolean':
      return value === true ? 'はい' : value === false ? 'いいえ' : value
    default:
      return value
  }
}

/**
 * Convert value to string for counting
 */
function valueToString(value: any, isDate: boolean): string {
  if (isEmpty(value)) return '__empty__'

  // Handle date fields - group by date
  if (isDate) {
    const date = parseDate(value)
    if (date) {
      return formatDateForGrouping(date)
    }
    // If not a valid date, treat as string
    return String(value)
  }

  if (typeof value === 'boolean') return value ? 'はい' : 'いいえ'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    if (value.length === 0) return '__empty__'
    return value.join(', ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Sort date keys chronologically
 */
function sortDateKeys(valueCounts: Map<string, number>): Map<string, number> {
  const entries = Array.from(valueCounts.entries())
  entries.sort((a, b) => {
    // Parse YYYY/MM/DD format
    const dateA = new Date(a[0].replace(/\//g, '-'))
    const dateB = new Date(b[0].replace(/\//g, '-'))
    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
      return dateA.getTime() - dateB.getTime()
    }
    return a[0].localeCompare(b[0])
  })
  return new Map(entries)
}

/**
 * Analyze a single field across all orders
 */
function analyzeField(
  orders: OrderDocument[],
  field: FieldDef
): FieldAnalysisData {
  const totalCount = orders.length
  let filledCount = 0
  let emptyCount = 0
  const valueCounts = new Map<string, number>()
  // Maps display value back to raw value for filtering
  const rawValueMap = new Map<string, any>()

  for (const order of orders) {
    const rawValue = getNestedValue(order, field.path)
    const isEmptyValue = isEmpty(rawValue)

    if (isEmptyValue) {
      emptyCount++
    } else {
      filledCount++
    }

    // Transform value for display (e.g., ID -> name)
    const transformedValue = transformValue(rawValue, field.valueTransform)
    const strValue = valueToString(transformedValue, field.isDate || false)

    if (strValue !== '__empty__') {
      valueCounts.set(strValue, (valueCounts.get(strValue) || 0) + 1)
      // Store the mapping from display value to raw value
      if (!rawValueMap.has(strValue)) {
        rawValueMap.set(strValue, rawValue)
      }
    }
  }

  // Sort date fields chronologically
  const sortedValueCounts = field.isDate ? sortDateKeys(valueCounts) : valueCounts

  return {
    fieldName: field.displayName,
    fieldPath: field.path,
    totalCount,
    filledCount,
    emptyCount,
    valueCounts: sortedValueCounts,
    rawValueMap,
  }
}

const analysisResults = computed<FieldAnalysisData[]>(() => {
  if (props.orders.length === 0) return []

  return fieldsToAnalyze.map((field) => analyzeField(props.orders, field))
})
</script>

<style scoped>
.order-schema-analysis {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}
.analysis-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.analysis-meta {
  display: flex;
  gap: 8px;
}
.no-data {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-state {
  color: #909399;
  font-size: 14px;
}
.fields-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
