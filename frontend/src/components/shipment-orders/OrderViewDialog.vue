<template>
  <!-- 编辑模式：使用 FormDialog -->
  <FormDialog
    v-if="mode === 'edit'"
    v-model="visible"
    :title="editTitle"
    :columns="formColumns"
    :initial-data="orderData"
    allow-invalid-submit
    @submit="handleFormSubmit"
  />

  <!-- 查看模式：使用原有的 Dialog -->
  <el-dialog
    v-else
    v-model="visible"
    :title="title"
    width="860px"
    :close-on-click-modal="false"
  >
    <el-scrollbar height="560px">
      <div class="content">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item
            v-for="item in summaryItems"
            :key="item.key"
            :label="item.label"
          >
            <span class="value">{{ item.value }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">ステータス</el-divider>
        <div class="status-area">
          <template v-for="s in statusBadges" :key="s.key">
            <span class="status-detail-item">{{ s.label }}: {{ s.detail }}</span>
          </template>
        </div>

        <template v-if="internalRecords.length > 0">
          <el-divider content-position="left">内部データ</el-divider>
          <div class="internal-record-area">
            <el-table :data="internalRecords" border size="small" max-height="180">
              <el-table-column prop="timestamp" label="日時" width="180">
                <template #default="{ row }">
                  {{ fmtDateTime(row.timestamp) }}
                </template>
              </el-table-column>
              <el-table-column prop="user" label="発起者" width="120" />
              <el-table-column prop="content" label="内容" min-width="300">
                <template #default="{ row }">
                  <span class="internal-record-content">{{ row.content }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>

        <el-divider content-position="left">商品</el-divider>
        <el-table :data="productsTable" border size="small" max-height="280">
          <el-table-column label="画像" width="70" align="center">
            <template #default="{ row }">
              <img
                :src="resolveImageUrl(row.imageUrl)"
                style="width: 40px; height: 40px; object-fit: contain"
                @error="(e: Event) => { (e.target as HTMLImageElement).src = noImageSrc }"
              />
            </template>
          </el-table-column>
          <el-table-column prop="sku" label="SKU" min-width="160" />
          <el-table-column prop="name" label="商品名" min-width="260" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column label="バーコード" min-width="160">
            <template #default="{ row }">
              <span v-if="row.barcode && row.barcode.length > 0">{{ row.barcode.join(', ') }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>

        <el-divider content-position="left">元データ（取込時の行）</el-divider>
        <div v-if="rawRows.length === 0" class="empty">
          元データはありません。
        </div>
        <div v-else>
          <el-tabs type="border-card">
            <el-tab-pane
              v-for="(row, idx) in rawRows"
              :key="idx"
              :label="`Row ${Number(idx) + 1}`"
            >
              <el-table :data="toKeyValueRows(row)" border size="small" max-height="300">
                <el-table-column prop="key" label="キー" min-width="220" />
                <el-table-column prop="value" label="値" min-width="420">
                  <template #default="{ row: r }">
                    <span class="mono">{{ r.value }}</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </el-scrollbar>

    <template #footer>
      <div class="footer">
        <el-button @click="visible = false">閉じる</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElButton, ElDialog, ElDivider, ElScrollbar, ElDescriptions, ElDescriptionsItem, ElTable, ElTableColumn, ElTabs, ElTabPane, ElMessage } from 'element-plus'
import FormDialog from '@/components/form/FormDialog.vue'
import { getOrderFieldDefinitions } from '@/types/order'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import { updateShipmentOrder } from '@/api/shipmentOrders'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import { fetchProducts } from '@/api/product'
import { getNestedValue, setNestedValue } from '@/utils/nestedObject'
import { createProductMap, resolveProductBySku } from '@/utils/productMapUtils'
import type { Product } from '@/types/product'
import noImageSrc from '@/assets/images/no_image.png'
import { getApiBaseUrl } from '@/api/base'

const ORDER_VIEW_API_BASE = getApiBaseUrl().replace(/\/api$/, '')

const resolveImageUrl = (url?: string): string => {
  if (!url) return noImageSrc
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${ORDER_VIEW_API_BASE}${url}`
}

const props = defineProps<{
  modelValue: boolean
  order: (OrderDocument & { _id?: string }) | null
  carriers?: Carrier[]
  title?: string
  mode?: 'view' | 'edit'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'updated': [order: OrderDocument]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const title = computed(() => props.title || '出荷予定明細')
const editTitle = computed(() => props.title || '出荷予定を編集')
const mode = computed(() => props.mode || 'view')

const carrierOptions = computed(() => {
  return (props.carriers || [])
    .filter((c) => c && c.enabled !== false)
    .map((c) => ({ label: `${c.name} (${c.code})`, value: c._id }))
})

// 商品マスタ（fallback用）
const productMap = ref<Map<string, Product>>(new Map())

// 获取可编辑的字段定义（只有 formEditable: true 的字段）
const formColumns = computed(() => {
  const allFields = getOrderFieldDefinitions({
    carrierOptions: carrierOptions.value,
  })
  return allFields.filter((col) => col.formEditable !== false && col.dataKey !== undefined)
})

const loadProducts = async () => {
  try {
    const products = await fetchProducts()
    productMap.value = createProductMap(products)
  } catch (e: any) {
    console.error('商品マスタの取得に失敗しました', e)
  }
}

onMounted(() => {
  loadProducts()
})

// 将订单数据转换为表单数据格式
// 日期时间字段：从 ISO 8601（可能带 Z）转换为 YYYY-MM-DDTHH:mm:ss.SSS（不带 Z，不进行时区转换）
const orderData = computed(() => {
  const o: any = props.order || {}
  const result: Record<string, any> = { ...o }

  // 处理日期时间字段：转换为 FormDialog 期望的格式（YYYY-MM-DDTHH:mm:ss.SSS）
  for (const col of formColumns.value) {
    if (col.fieldType === 'date') {
      const key = col.dataKey || col.key
      if (!key) continue

      const value = result[key]
      if (value && typeof value === 'string') {
        // 如果已经是 YYYY-MM-DDTHH:mm:ss.SSS 格式（不带 Z），直接使用
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(value)) {
          // 已经是正确格式，直接使用
          result[key] = value
        } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          // 是 ISO 格式但可能带 Z 或没有毫秒，转换为标准格式
          // 去掉 Z（如果有），确保有毫秒部分
          let normalized = value.replace(/Z$/, '')
          if (!normalized.includes('.')) {
            // 没有毫秒，添加 .000
            normalized = normalized.replace(/T(\d{2}:\d{2}:\d{2})(.*)$/, 'T$1.000')
          } else if (!/\.\d{3}$/.test(normalized)) {
            // 有毫秒但格式不对，修正为 .000
            normalized = normalized.replace(/\.\d+$/, '.000')
          }
          result[key] = normalized
        } else {
          // 其他格式，尝试解析（不进行时区转换，直接使用 UTC 时间）
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            // 使用 UTC 时间组件构建字符串（不进行时区转换）
            const year = date.getUTCFullYear()
            const month = String(date.getUTCMonth() + 1).padStart(2, '0')
            const day = String(date.getUTCDate()).padStart(2, '0')
            const hours = String(date.getUTCHours()).padStart(2, '0')
            const minutes = String(date.getUTCMinutes()).padStart(2, '0')
            const seconds = String(date.getUTCSeconds()).padStart(2, '0')
            const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0')
            result[key] = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
          }
        }
      }
    }
  }

  return result
})

// 处理表单提交
const handleFormSubmit = async (data: Record<string, any>) => {
  if (!props.order?._id) {
    ElMessage.error('注文が見つかりません')
    return
  }

  try {
    // 只发送要修改的字段到后端（不包含 _id，_id 由 URL 参数提供）
    // 后端会进行数据类型验证
    const updateData: Record<string, any> = {}
    for (const col of formColumns.value) {
      const key = col.dataKey || col.key
      if (!key) continue

      // 使用 getNestedValue 获取嵌套字段的值（如 recipient.name）
      const value = getNestedValue(data, key)

      // 跳过 undefined 和 null
      if (value === undefined || value === null) continue

      // 处理空字符串：对于可选字段，空字符串转换为 undefined
      if (typeof value === 'string' && value.trim() === '') {
        // 对于必填字段，保留空字符串（让后端验证）
        // 对于可选字段，跳过
        if (col.required) {
          setNestedValue(updateData, key, value)
        }
        continue
      }

      // 处理数组：空数组转换为 undefined（对于可选字段）
      if (Array.isArray(value) && value.length === 0 && !col.required) {
        continue
      }

      // 处理日期时间字段：FormDialog 返回 YYYY-MM-DDTHH:mm:ss.SSS 格式（不带 Z）
      // 转换为 ISO 8601 UTC 格式（添加 Z），不进行时区转换
      if (col.fieldType === 'date' && value) {
        if (typeof value === 'string') {
          // FormDialog 返回的是 YYYY-MM-DDTHH:mm:ss.SSS（不带 Z，表示 UTC 时间）
          // 添加 Z 转换为 ISO 8601 UTC 格式
          if (value.endsWith('Z')) {
            // 已经有 Z，直接使用
            setNestedValue(updateData, key, value)
          } else {
            // 添加 Z 表示 UTC 时间（不进行时区转换）
            setNestedValue(updateData, key, value + 'Z')
          }
        } else {
          setNestedValue(updateData, key, value)
        }
        continue
      }

      // 处理日期（仅日期）：确保格式为 YYYY/MM/DD
      if (col.fieldType === 'dateOnly' && value) {
        if (typeof value === 'string') {
          // 如果已经是 YYYY/MM/DD 或 YYYY-MM-DD 格式，直接使用
          if (/^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(value)) {
            setNestedValue(updateData, key, value.replace(/-/g, '/'))
          } else {
            // 尝试从其他格式转换
            const date = new Date(value)
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              setNestedValue(updateData, key, `${year}/${month}/${day}`)
            } else {
              setNestedValue(updateData, key, value)
            }
          }
        } else {
          setNestedValue(updateData, key, value)
        }
        continue
      }

      // 其他字段直接使用
      setNestedValue(updateData, key, value)
    }

    const result = await updateShipmentOrder(props.order._id, updateData)
    ElMessage.success('出荷予定を更新しました')
    emit('updated', result.data?.order || props.order)
    visible.value = false
  } catch (error: any) {
    // 显示更详细的错误信息
    const errorMessage = error?.message || '出荷予定の更新に失敗しました'
    const errorDetails = error?.errors ? `\n詳細: ${JSON.stringify(error.errors, null, 2)}` : ''
    ElMessage.error(errorMessage + errorDetails)
    console.error('Update error:', error)
  }
}

const fmtDateTime = (v: any) => {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('ja-JP')
}

const carrierName = computed(() => {
  const id = (props.order as any)?.carrierId
  if (!id) return '-'
  const hit = (props.carriers || []).find((c) => c._id === id)
  return hit ? `${hit.name} (${hit.code})` : String(id)
})

const summaryItems = computed(() => {
  const o: any = props.order || {}
  const fmt = (v: any) => (v ? fmtDateTime(v) : '-')
  return [
    { key: 'orderNumber', label: '出荷管理No', value: o.orderNumber || '-' },
    { key: 'sourceOrderAt', label: '注文日時', value: fmt(o.sourceOrderAt) },
    { key: 'carrierId', label: '配送会社', value: carrierName.value },
    { key: 'shipPlanDate', label: '出荷予定日', value: o.shipPlanDate || '-' },
    { key: 'invoiceType', label: '送り状種類', value: o.invoiceType || '-' },
    { key: 'coolType', label: 'クール区分', value: o.coolType ?? '-' },
    { key: 'deliveryTimeSlot', label: 'お届け時間帯', value: o.deliveryTimeSlot ?? '-' },
    { key: 'deliveryDatePreference', label: 'お届け日指定', value: o.deliveryDatePreference ? normalizeDateOnly(o.deliveryDatePreference) : '-' },
    { key: 'recipientName', label: '送付先名', value: o.recipient?.name || '-' },
    { key: 'recipientPhone', label: '送付先電話番号', value: o.recipient?.phone || '-' },
    { key: 'recipientPostalCode', label: '送付先郵便番号', value: o.recipient?.postalCode || '-' },
    { key: 'recipientAddress', label: '送付先住所', value: [o.recipient?.prefecture, o.recipient?.city, o.recipient?.street].filter(Boolean).join(' ') || '-' },
    { key: 'senderName', label: 'ご依頼主名', value: o.sender?.name || '-' },
    { key: 'senderPhone', label: 'ご依頼主電話番号', value: o.sender?.phone || '-' },
    { key: 'senderPostalCode', label: 'ご依頼主郵便番号', value: o.sender?.postalCode || '-' },
    { key: 'senderAddress', label: 'ご依頼主住所', value: [o.sender?.prefecture, o.sender?.city, o.sender?.street].filter(Boolean).join(' ') || '-' },
    { key: 'ordererName', label: '注文者名', value: o.orderer?.name || '-' },
    { key: 'ordererPhone', label: '注文者電話番号', value: o.orderer?.phone || '-' },
    { key: 'ordererPostalCode', label: '注文者郵便番号', value: o.orderer?.postalCode || '-' },
    { key: 'ordererAddress', label: '注文者住所', value: [o.orderer?.prefecture, o.orderer?.city, o.orderer?.street].filter(Boolean).join(' ') || '-' },
  ]
})

type StatusBadge = { key: string; label: string; active: boolean; detail?: string }

const statusBadges = computed<StatusBadge[]>(() => {
  const o: any = props.order || {}

  // NOTE: 将来 status が増えても、ここに1行追加するだけで UI は追随できる構造にしておく。
  const defs: Array<{
    key: string
    label: string
    getAt?: (order: any) => any
  }> = [
    {
      key: 'carrierReceipt',
      label: '取り込み日時',
      getAt: (order) => order?.status?.carrierReceipt?.receivedAt,
    },
    {
      key: 'printed',
      label: '印刷日時',
      getAt: (order) => order?.status?.printed?.printedAt,
    },
  ]

  return defs.map((d) => {
    const at = d.getAt ? d.getAt(o) : undefined
    return {
      key: d.key,
      label: d.label,
      active: Boolean(at),
      detail: at ? fmtDateTime(at) : '-',
    }
  })
})

const productsTable = computed(() => {
  const o: any = props.order || {}
  const items = Array.isArray(o.products) ? o.products : []
  const pMap = productMap.value
  return items.map((p: any) => {
    const sku = p?.productSku || p?.inputSku || ''
    // fallback: 商品マスタから検索
    const resolved = sku && pMap.size > 0 ? resolveProductBySku(sku, pMap) : null
    const masterProduct = resolved?.product ?? null
    return {
      sku,
      name: p?.productName || masterProduct?.name || '',
      quantity: p?.quantity ?? '',
      imageUrl: p?.imageUrl || masterProduct?.imageUrl || '',
      barcode: p?.barcode || masterProduct?.barcode || [],
    }
  })
})

const internalRecords = computed(() => {
  const o: any = props.order || {}
  const records = Array.isArray(o.internalRecord) ? o.internalRecord : []
  // 按时间倒序排列（最新的在前）
  return [...records].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeB - timeA
  })
})

const rawRows = computed(() => {
  const o: any = props.order || {}
  return Array.isArray(o.sourceRawRows) ? o.sourceRawRows : []
})

const toKeyValueRows = (row: Record<string, any>) => {
  const keys = Object.keys(row || {}).sort((a, b) => a.localeCompare(b))
  return keys.map((k) => ({
    key: k,
    value: formatValue(row[k]),
  }))
}

const formatValue = (v: any): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
</script>

<style scoped>
.content {
  padding: 6px 2px 18px;
}

.status-area {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  padding: 2px 0 10px;
}

.status-detail {
  color: #909399;
  font-size: 12px;
  padding-left: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-detail-item {
  white-space: nowrap;
}

.footer {
  display: flex;
  justify-content: flex-end;
}

.empty {
  color: #909399;
  font-size: 13px;
  padding: 6px 2px;
}

.value {
  white-space: pre-wrap;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.internal-record-area {
  margin-bottom: 12px;
}

.internal-record-content {
  white-space: pre-wrap;
  word-break: break-word;
}

</style>




