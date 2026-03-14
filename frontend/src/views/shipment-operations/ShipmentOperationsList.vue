<template>
  <div class="shipment-operations-list">
    <ControlPanel :title="t('wms.shipment.listTitle', '出荷一覧')" :show-search="false" />

    <OrderSearchFormWrapper
      class="search-section"
      :columns="searchColumns"
      :initial-values="searchInitialValues"
      storage-key="shipment_operations_list"
      @search="handleSearch"
      @save="handleSave"
    />

    <div class="between-controls">
      <label class="switch-label">{{ t('wms.shipment.showPrintedOnly', '印刷済みのみ表示') }}
        <label class="o-toggle">
          <input type="checkbox" v-model="showPrintedOnly">
          <span class="o-toggle-slider"></span>
        </label>
      </label>
    </div>

    <!-- Plain table (same style as shipment-orders/create) -->
    <div class="o-table-wrapper">
      <div v-if="tableSelectedKeys.length > 0" class="o-list-toolbar o-toolbar-active">
        <span class="o-selected-count">{{ tableSelectedKeys.length }}{{ t('wms.shipment.selectedSuffix', '件選択中') }}</span>
      </div>
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th o-table-th--checkbox" style="width:40px;">
              <input
                type="checkbox"
                :checked="isAllCurrentPageSelected"
                :indeterminate="isSomeCurrentPageSelected && !isAllCurrentPageSelected"
                @change="toggleSelectAll"
              />
            </th>
            <th class="o-table-th" style="width:90px;">{{ t('wms.shipment.status', '状態') }}</th>
            <th class="o-table-th o-table-th--sortable" style="width:220px;" @click="handleSortClick('orderNumber')">
              {{ t('wms.shipment.orderNumber', '出荷管理番号') }}
              <span v-if="sortBy === 'orderNumber'" class="o-sort-icon">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="o-table-th" style="width:200px;">{{ t('wms.shipment.deliveryInfo', '配送情報') }}</th>
            <th class="o-table-th" style="width:180px;">{{ t('wms.shipment.deliveryPreference', '配送指定') }}</th>
            <th class="o-table-th" style="width:200px;">{{ t('wms.shipment.recipient', 'お届け先') }}</th>
            <th class="o-table-th" style="width:200px;">{{ t('wms.shipment.products', '商品') }}</th>
            <th class="o-table-th" style="width:170px;">{{ t('wms.shipment.history', '履歴') }}</th>
            <th class="o-table-th" style="width:140px;">{{ t('wms.common.actions', '操作') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoadingOrders">
            <td colspan="9" class="o-table-empty">{{ t('wms.common.loading', '読み込み中...') }}</td>
          </tr>
          <tr v-else-if="paginatedRows.length === 0">
            <td colspan="9" class="o-table-empty">{{ t('wms.common.noData', 'データがありません') }}</td>
          </tr>
          <tr
            v-for="row in paginatedRows"
            :key="row._id"
            class="o-table-row"
            :class="{ 'o-table-row--selected': tableSelectedKeys.includes(row._id) }"
          >
            <td class="o-table-td o-table-td--checkbox">
              <input
                type="checkbox"
                :checked="tableSelectedKeys.includes(row._id)"
                @change="toggleRowSelection(row)"
              />
            </td>
            <td class="o-table-td o-table-td--status">
              <div class="status-cell">
                <span v-if="row.status?.confirm?.isConfirmed" class="o-status-tag o-status-tag--confirmed">{{ t('wms.shipment.confirmed', '確定済') }}</span>
                <span v-if="row.status?.carrierReceipt?.isReceived" class="o-status-tag o-status-tag--issued">{{ t('wms.shipment.invoiceIssued', '送り状発行済') }}</span>
                <span v-if="row.status?.printed?.isPrinted" class="o-status-tag o-status-tag--printed">{{ t('wms.shipment.printed', '印刷済') }}</span>
                <span v-if="row.status?.inspected?.isInspected" class="o-status-tag o-status-tag--confirmed">{{ t('wms.shipment.inspected', '検品済') }}</span>
              </div>
            </td>
            <!-- 出荷管理番号 -->
            <td class="o-table-td o-table-td--mgmt">
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.orderNo', '出荷管理No') }}</span>
                  <a href="#" class="mgmt-cell__link mgmt-cell__value" @click.prevent="handleView(row)">{{ row.orderNumber || '-' }}</a>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.customerOrderNo', '注文番号') }}</span>
                  <span class="mgmt-cell__value">{{ row.customerManagementNumber || '-' }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.trackingNumber', '送り状番号') }}</span>
                  <span class="mgmt-cell__value">{{ row.trackingId || '-' }}</span>
                </div>
              </div>
            </td>
            <!-- 配送情報 -->
            <td class="o-table-td o-table-td--mgmt">
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.carrier', '配送会社') }}</span>
                  <span class="mgmt-cell__value">{{ getCarrierLabel(row) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.deliveryService', '配送サービス') }}</span>
                  <span class="mgmt-cell__value">{{ getInvoiceTypeLabel(row) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.temperatureZone', '温度帯') }}</span>
                  <span class="mgmt-cell__value" :style="{ color: getCoolTypeInfo(row).color }">{{ getCoolTypeInfo(row).label }}</span>
                </div>
              </div>
            </td>
            <!-- 配送指定 -->
            <td class="o-table-td o-table-td--mgmt">
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.shipPlanDate', '出荷予定日') }}</span>
                  <span class="mgmt-cell__value">{{ row.shipPlanDate || '-' }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.deliveryDate', 'お届け日') }}</span>
                  <span class="mgmt-cell__value">{{ row.deliveryDatePreference || t('wms.shipment.earliest', '最短') }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.timeSlot', '時間帯指定') }}</span>
                  <span class="mgmt-cell__value">{{ getTimeSlotLabel(row) }}</span>
                </div>
              </div>
            </td>
            <!-- お届け先 -->
            <td class="o-table-td">
              <div class="recipient-cell">
                <div>〒{{ fmtPostal(row.recipient?.postalCode) }}</div>
                <div>{{ [row.recipient?.prefecture, row.recipient?.city, row.recipient?.street, row.recipient?.building].filter(Boolean).join(' ') || '-' }}</div>
                <div>{{ row.recipient?.phone || '-' }}</div>
                <div class="recipient-cell__name">{{ row.recipient?.name || '-' }} {{ row.honorific || '様' }}</div>
              </div>
            </td>
            <!-- 商品 -->
            <td class="o-table-td">
              <div class="product-list">
                <div v-for="(p, pi) in (row.products || [])" :key="pi" class="product-item">
                  <div class="product-item__info">
                    <span class="product-item__name">{{ p.productName || '-' }}</span>
                    <span class="product-item__meta">SKU: {{ p.inputSku || p.productSku || '-' }} / {{ t('wms.shipment.quantity', '個数') }}: {{ p.quantity ?? 0 }}</span>
                  </div>
                </div>
                <span v-if="!row.products?.length" class="o-cell">-</span>
              </div>
            </td>
            <!-- 履歴 -->
            <td class="o-table-td o-table-td--mgmt">
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.confirmedAt', '確定日時') }}</span>
                  <span class="mgmt-cell__value">{{ fmtDateTime(row.status?.confirm?.confirmedAt) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.invoiceIssuedAt', '送り状発行') }}</span>
                  <span class="mgmt-cell__value">{{ fmtDateTime(row.status?.carrierReceipt?.receivedAt) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.printedAt', '印刷日時') }}</span>
                  <span class="mgmt-cell__value">{{ fmtDateTime(row.status?.printed?.printedAt) }}</span>
                </div>
              </div>
            </td>
            <!-- 操作 -->
            <td class="o-table-td o-table-td--actions">
              <OButton variant="primary" size="sm" @click="handleView(row)">{{ t('wms.shipment.details', '詳細') }}</OButton>
              <OButton variant="secondary" size="sm" :disabled="isUnconfirming" style="border-color:#e6a23c;color:#e6a23c;" @click="handleUnconfirm(row)">{{ t('wms.shipment.unconfirm', '確認取消') }}</OButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ displayRows.length }} {{ t('wms.common.items', '件') }}</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="500">500</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="currentPage--">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++">&rsaquo;</OButton>
      </div>
    </div>

    <!-- Bottom bar -->
    <OrderBottomBar
      :total-count="displayRows.length"
      :selected-count="tableSelectedKeys.length"
      :total-label="t('wms.shipment.displayCount', '表示件数')"
    >
      <template #right>
        <OButton
          variant="secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleCustomExportClick"
        >
          {{ t('wms.shipment.exportCsv', '出荷明細リスト出力(csv)') }}
        </OButton>
        <OButton
          variant="secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleFormExportClick"
        >
          {{ t('wms.shipment.exportPdf', '出荷明細リスト出力(pdf)') }}
        </OButton>
        <OButton
          variant="primary"
          :disabled="tableSelectedKeys.length === 0 || isMarkingShipped"
          @click="handleMarkShipped"
        >
          {{ isMarkingShipped ? t('wms.common.processing', '処理中...') : t('wms.shipment.markShipped', '出荷完了') }}
        </OButton>
      </template>
    </OrderBottomBar>

    <OrderViewDialog
      v-model="viewDialogVisible"
      :order="selectedOrder"
      :carriers="carriers"
      :title="t('wms.shipment.orderDetail', '出荷予定明細')"
      mode="view"
    />

    <CustomExportDialog
      v-model="customExportDialogVisible"
      :orders="selectedOrdersForCustomExport"
    />

    <FormExportDialog
      v-model="formExportDialogVisible"
      target-type="shipment-detail-list"
      :selected-orders="selectedOrdersForFormExport"
      :carriers="carriers"
      :products="products"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import OrderSearchFormWrapper from '@/components/search/OrderSearchFormWrapper.vue'
import OrderViewDialog from '@/components/shipment-orders/OrderViewDialog.vue'
import CustomExportDialog from '@/components/export/CustomExportDialog.vue'
import FormExportDialog from '@/components/form-export/FormExportDialog.vue'
import type { Operator } from '@/types/table'
import { getOrderFieldDefinitions } from '@/types/order'
import { fetchShipmentOrder, fetchShipmentOrdersPage, updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import type { OrderDocument } from '@/types/order'
import { yamatoB2Unconfirm, isCarrierDeleteError } from '@/api/carrierAutomation'
import { useOrderCellHelpers } from '@/composables/useOrderCellHelpers'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

type SortOrder = 'asc' | 'desc' | null
type OrderRow = Record<string, any>

const { t } = useI18n()
const toast = useToast()
const rows = ref<OrderRow[]>([])
const tableSelectedKeys = ref<Array<string | number>>([])
const isLoadingOrders = ref(false)

const pageSize = ref(25)
const currentPage = ref(1)
const sortBy = ref<string | null>('orderNumber')
const sortOrder = ref<SortOrder>('asc')
const isMarkingShipped = ref(false)
const isUnconfirming = ref(false)
const showPrintedOnly = ref(true)

// Custom export dialog state
const customExportDialogVisible = ref(false)
const selectedOrdersForCustomExport = ref<any[]>([])

// Form export dialog state (PDF)
const formExportDialogVisible = ref(false)
const selectedOrdersForFormExport = ref<OrderDocument[]>([])

// Carrier & products
const carriers = ref<Carrier[]>([])
const products = ref<Product[]>([])

// Cell helpers (shared with create page)
const { carrierOptions, allFieldDefinitions, getCarrierLabel, getInvoiceTypeLabel, getTimeSlotLabel, getCoolTypeInfo, fmtDateTime, fmtPostal } = useOrderCellHelpers(carriers)

const searchInitialValues = computed(() => ({}))
const searchColumns = computed(() =>
  allFieldDefinitions.value.filter((col) => col.searchType !== undefined),
)

const currentSearchPayload = ref<Record<string, { operator: Operator; value: any }> | null>(null)
const globalSearchText = ref<string>('')

const effectiveSearchPayload = computed(() => {
  const base = currentSearchPayload.value || searchInitialValues.value
  const q: Record<string, { operator: Operator; value: any }> = { ...(base || {}) }
  q['status.confirm.isConfirmed'] = { operator: 'is', value: true }
  q['status.carrierReceipt.isReceived'] = { operator: 'is', value: true }
  q['status.shipped.isShipped'] = { operator: 'isNot', value: true }
  if (showPrintedOnly.value) {
    q['status.printed.isPrinted'] = { operator: 'is', value: true }
  }
  return q
})

const displayRows = computed(() => [...rows.value])

// --- Pagination ---
const totalPages = computed(() => Math.max(1, Math.ceil(displayRows.value.length / pageSize.value)))
const paginatedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return displayRows.value.slice(start, start + pageSize.value)
})

watch(pageSize, () => { currentPage.value = 1 })
watch(displayRows, () => { if (currentPage.value > totalPages.value) currentPage.value = totalPages.value })

// --- Selection ---
const isAllCurrentPageSelected = computed(() =>
  paginatedRows.value.length > 0 && paginatedRows.value.every(r => tableSelectedKeys.value.includes(r._id)),
)
const isSomeCurrentPageSelected = computed(() =>
  paginatedRows.value.some(r => tableSelectedKeys.value.includes(r._id)),
)

const toggleSelectAll = () => {
  if (isAllCurrentPageSelected.value) {
    const pageIds = new Set(paginatedRows.value.map(r => r._id))
    tableSelectedKeys.value = tableSelectedKeys.value.filter(k => !pageIds.has(k))
  } else {
    const existing = new Set(tableSelectedKeys.value)
    for (const r of paginatedRows.value) {
      existing.add(r._id)
    }
    tableSelectedKeys.value = [...existing]
  }
}

const toggleRowSelection = (row: any) => {
  const id = row._id
  if (tableSelectedKeys.value.includes(id)) {
    tableSelectedKeys.value = tableSelectedKeys.value.filter(k => k !== id)
  } else {
    tableSelectedKeys.value = [...tableSelectedKeys.value, id]
  }
}

// --- View ---
const viewDialogVisible = ref(false)
const selectedOrder = ref<any>(null)

const handleView = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return
    selectedOrder.value = await fetchShipmentOrder(String(id))
    viewDialogVisible.value = true
  } catch (e: any) {
    toast.showError(e?.message || t('wms.shipment.fetchDetailError', '詳細の取得に失敗しました'))
  }
}

const handleUnconfirm = async (row: any, skipCarrierDelete = false) => {
  try {
    const id = row?._id
    if (!id) return

    let reason: string

    if (skipCarrierDelete && row._unconfirmReason) {
      reason = row._unconfirmReason
    } else {
      const inputReason = prompt(
        `注文番号: ${row.orderNumber || id}\n確認を取り消し、未確認状態に戻します。\nB2 Cloud連携を使用している場合、B2 Cloudからも削除されます。\n\n取消理由を入力してください（内部データとして記録されます）`
      )

      if (inputReason === null) return
      if (!inputReason.trim()) {
        toast.showWarning(t('wms.shipment.enterReasonRequired', '理由を入力してください'))
        return
      }
      reason = inputReason.trim()
      row._unconfirmReason = reason
    }

    isUnconfirming.value = true
    try {
      const result = await yamatoB2Unconfirm([String(id)], reason, { skipCarrierDelete })
      if (result.success) {
        let message = t('wms.shipment.unconfirmSuccess', '確認を取り消しました')
        if (result.carrierDeleteSkipped) {
          message += '（B2 Cloud削除スキップ）'
        } else if (result.b2DeleteResult) {
          if (result.b2DeleteResult.success) {
            message += `（B2 Cloudから${result.b2DeleteResult.deleted}件削除）`
          } else {
            message += `（B2 Cloud削除失敗: ${result.b2DeleteResult.error}）`
          }
        }
        toast.showSuccess(message)
      }
      await loadOrders()
    } catch (e: any) {
      if (isCarrierDeleteError(e)) {
        isUnconfirming.value = false
        if (confirm(`B2 Cloudからの履歴削除に失敗しました。\n\nエラー: ${e.error}\n\nB2 Cloud削除をスキップして、ローカルのみ更新しますか？`)) {
          await handleUnconfirm(row, true)
          return
        }
        return
      }
      throw e
    } finally {
      isUnconfirming.value = false
    }
  } catch (e: any) {
    if (e === 'cancel') return
    toast.showError(e?.message || t('wms.shipment.unconfirmError', '確認取消に失敗しました'))
    isUnconfirming.value = false
  }
}

// --- Export ---
const handleCustomExportClick = () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  selectedOrdersForCustomExport.value = displayRows.value.filter((r: any) => keySet.has(String(r?._id)))
  customExportDialogVisible.value = true
}

const handleFormExportClick = () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  selectedOrdersForFormExport.value = displayRows.value.filter((r: any) => keySet.has(String(r?._id))) as OrderDocument[]
  formExportDialogVisible.value = true
}

// --- Mark Shipped ---
const handleMarkShipped = async () => {
  if (tableSelectedKeys.value.length === 0) {
    toast.showWarning(t('wms.shipment.selectShippedRows', '出荷完了行を選択してください'))
    return
  }

  const selectedRows = displayRows.value.filter((row: any) => tableSelectedKeys.value.includes(row._id))
  const orderNumbers = selectedRows.map((row: any) => row.orderNumber || row._id).filter(Boolean).slice(0, 5)
  const moreText = selectedRows.length > 5 ? `他${selectedRows.length - 5}件` : ''

  if (!confirm(`選択した${tableSelectedKeys.value.length}件の出荷を完了にしますか？\n${orderNumbers.join(', ')}${moreText ? `\n${moreText}` : ''}`)) return

  isMarkingShipped.value = true
  const ids = tableSelectedKeys.value.map((key) => String(key)).filter(Boolean)

  try {
    const result = await updateShipmentOrderStatusBulk(ids, 'mark-shipped')
    if (result?.modifiedCount !== undefined) {
      toast.showSuccess(result.modifiedCount > 0
        ? `${result.modifiedCount}件の出荷を完了にしました`
        : '更新されたレコードがありません。既に出荷完了になっている可能性があります。')
    } else {
      toast.showSuccess(`${ids.length}件の出荷を完了にしました`)
    }
    tableSelectedKeys.value = []
    await loadOrders()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.shipment.markShippedError', '出荷完了の更新に失敗しました'))
  } finally {
    isMarkingShipped.value = false
  }
}

// --- Search ---
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  const nextPayload: Record<string, { operator: Operator; value: any }> = { ...(payload || {}) }
  const keyword = (nextPayload as any)?.__global?.value
  globalSearchText.value = keyword ? String(keyword) : ''
  delete (nextPayload as any).__global
  currentSearchPayload.value = nextPayload
  void loadOrders()
}

const handleSave = (_payload: Record<string, { operator: Operator; value: any }>) => {
  toast.showSuccess(t('wms.shipment.searchSaved', '検索条件を保存しました'))
}

// --- Sort ---
const handleSortClick = (field: string) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
  void loadOrders()
}

// --- Data loading ---
const loadCarriers = async () => {
  try {
    carriers.value = await fetchCarriers()
  } catch (e: any) {
    toast.showError(t('wms.shipment.fetchCarrierError', '配送業者マスタの取得に失敗しました'))
  }
}

let loadOrdersVersion = 0

const loadOrders = async () => {
  const version = ++loadOrdersVersion
  isLoadingOrders.value = true

  try {
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    const limit = 1000
    const all: OrderRow[] = []
    let page = 1
    let total = Infinity

    const q = effectiveSearchPayload.value || undefined
    const currentSortBy = sortBy.value
    const currentSortOrder = sortOrder.value

    while (all.length < total) {
      const res = await fetchShipmentOrdersPage<OrderRow>({
        page,
        limit,
        q,
        sortBy: currentSortBy,
        sortOrder: currentSortOrder,
        tzOffsetMinutes,
      })
      if (version !== loadOrdersVersion) return

      const items = Array.isArray(res?.items) ? res.items : []
      const resTotal = typeof res?.total === 'number' ? res.total : undefined
      if (typeof resTotal === 'number') total = resTotal

      if (!items.length) break
      all.push(...items)

      if (items.length < limit) break
      page += 1
    }

    rows.value = all
  } catch (e: any) {
    if (version !== loadOrdersVersion) return
    toast.showError(e?.message || t('wms.shipment.fetchOrdersError', '出荷予定の取得に失敗しました'))
  } finally {
    if (version === loadOrdersVersion) {
      isLoadingOrders.value = false
    }
  }
}

watch(
  () => showPrintedOnly.value,
  () => { void loadOrders() },
)

onMounted(async () => {
  await loadCarriers()
  await loadOrders()
  try {
    products.value = await fetchProducts()
  } catch (e) {
    console.error('Failed to load products:', e)
  }
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.shipment-operations-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.between-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: -6px;
  padding-bottom: 6px;
}

.switch-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  white-space: nowrap;
}

.o-toggle { position:relative; display:inline-flex; align-items:center; cursor:pointer; }
.o-toggle input { position:absolute; opacity:0; width:0; height:0; }
.o-toggle-slider { width:40px; height:20px; background:var(--o-toggle-off, #ccc); border-radius:10px; transition:0.2s; position:relative; }
.o-toggle-slider::after { content:''; position:absolute; width:16px; height:16px; border-radius:50%; background:#fff; top:2px; left:2px; transition:0.2s; }
.o-toggle input:checked + .o-toggle-slider { background:var(--o-brand-primary, #714B67); }
.o-toggle input:checked + .o-toggle-slider::after { left:22px; }
</style>
