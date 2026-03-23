<template>
  <div class="shipment-list">
    <PageHeader :title="t('wms.shipment.listTitle', '出荷作業一覧')" :show-search="false" />

    <CarrierSelector
      v-model="selectedCarrierId"
      :enabled="true"
      @change="handleCarrierChange"
      @carriers-loaded="handleCarriersLoaded"
    />

      ref="searchFormRef"
      class="search-section"
      :columns="searchColumns"
      :initial-values="searchInitialValues"
      storage-key="shipment_list"
      @search="handleSearch"
      @save="handleSave"
    />

    <div class="between-controls">
      <label class="switch-label">{{ t('wms.shipment.showInspected', '検品済み表示') }}
        <label class="o-toggle">
          <input type="checkbox" v-model="showInspected">
          <span class="o-toggle-slider"></span>
        </label>
      </label>
      <label class="switch-label">{{ t('wms.shipment.showPrinted', '印刷済み表示') }}
        <label class="o-toggle">
          <input type="checkbox" v-model="showPrinted">
          <span class="o-toggle-slider"></span>
        </label>
      </label>
    </div>

    <OrderGroupSelector
      ref="orderGroupSelectorRef"
      v-model="selectedOrderGroupId"
      @change="handleOrderGroupChange"
      @groups-loaded="handleOrderGroupsLoaded"
    />

    <!-- Plain table (same style as shipment-orders/create) -->
    <div class="rounded-md border overflow-auto table-attached">
      <div v-if="tableSelectedKeys.length > 0" class="o-list-toolbar o-toolbar-active">
        <span class="o-selected-count">{{ t('wms.shipment.selectedCount', '{count}件選択中').replace('{count}', String(tableSelectedKeys.length)) }}</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead style="width:40px;">
              <Checkbox
                :checked="isAllCurrentPageSelected ? true : (isSomeCurrentPageSelected ? 'indeterminate' : false)"
                @update:checked="toggleSelectAll"
              />
            </TableHead>
            <TableHead style="width:90px;">{{ t('wms.shipment.status', '状態') }}</TableHead>
            <TableHead style="width:220px;" @click="handleSortClick('orderNumber')">
              {{ t('wms.shipment.orderNumber', '出荷管理番号') }}
              <span v-if="sortBy === 'orderNumber'" class="o-sort-icon">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
            </TableHead>
            <TableHead style="width:200px;">{{ t('wms.shipment.deliveryInfo', '配送情報') }}</TableHead>
            <TableHead style="width:180px;">{{ t('wms.shipment.deliveryPreference', '配送指定') }}</TableHead>
            <TableHead style="width:200px;">{{ t('wms.shipment.recipient', 'お届け先') }}</TableHead>
            <TableHead style="width:250px;">{{ t('wms.shipment.products', '商品') }}</TableHead>
            <TableHead style="width:170px;">{{ t('wms.shipment.history', '履歴') }}</TableHead>
            <TableHead style="width:220px;">{{ t('wms.common.actions', '操作') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoadingOrders">
            <TableCell colspan="9">
              <div class="space-y-3 p-4">
                <Skeleton class="h-4 w-[250px] mx-auto" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="paginatedRows.length === 0">
            <TableCell colspan="9" class="text-center py-8 text-muted-foreground">{{ t('wms.common.noData', 'データがありません') }}</TableCell>
          </TableRow>
          <TableRow
            v-for="row in paginatedRows"
            :key="row._id"
            :class="{ 'bg-accent': tableSelectedKeys.includes(String(row._id)) }"
          >
            <TableCell>
              <Checkbox
                :checked="tableSelectedKeys.includes(String(row._id))"
                @update:checked="() => toggleRowSelection(row)"
              />
            </TableCell>
            <TableCell>
              <div class="status-cell">
                <span v-if="row.statusConfirmed" class="o-status-tag o-status-tag--confirmed">{{ t('wms.shipment.confirmed', '確定済') }}</span>
                <span v-if="row.statusCarrierReceived" class="o-status-tag o-status-tag--issued">{{ t('wms.shipment.invoiceIssued', '送り状発行済') }}</span>
                <span v-if="row.statusPrinted" class="o-status-tag o-status-tag--printed">{{ t('wms.shipment.printed', '印刷済') }}</span>
                <span v-if="row.statusInspected" class="o-status-tag o-status-tag--confirmed">{{ t('wms.shipment.inspected', '検品済') }}</span>
              </div>
            </TableCell>
            <!-- 出荷管理番号 -->
            <TableCell>
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
                  <span class="mgmt-cell__label">{{ t('wms.shipment.trackingNo', '送り状番号') }}</span>
                  <span class="mgmt-cell__value">{{ row.trackingId || '-' }}</span>
                </div>
              </div>
            </TableCell>
            <!-- 配送情報 -->
            <TableCell>
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.carrier', '配送会社') }}</span>
                  <span class="mgmt-cell__value">{{ getCarrierLabel(row) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.invoiceType', '配送サービス') }}</span>
                  <span class="mgmt-cell__value">{{ getInvoiceTypeLabel(row) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.coolType', '温度帯') }}</span>
                  <span class="mgmt-cell__value" :style="{ color: getCoolTypeInfo(row).color }">{{ getCoolTypeInfo(row).label }}</span>
                </div>
              </div>
            </TableCell>
            <!-- 配送指定 -->
            <TableCell>
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
            </TableCell>
            <!-- お届け先 -->
            <TableCell>
              <div class="recipient-cell">
                <div>〒{{ fmtPostal(row.recipient?.postalCode) }}</div>
                <div>{{ [row.recipient?.prefecture, row.recipient?.city, row.recipient?.street, row.recipient?.building].filter(Boolean).join(' ') || '-' }}</div>
                <div>{{ row.recipient?.phone || '-' }}</div>
                <div class="recipient-cell__name">{{ row.recipient?.name || '-' }} {{ row.honorific || '様' }}</div>
              </div>
            </TableCell>
            <!-- 商品 -->
            <TableCell>
              <div class="product-list">
                <div v-for="(p, pi) in (row.products || [])" :key="pi" class="product-item">
                  <img :src="resolveImageUrl(p.imageUrl)" class="product-item__img" alt="" @error="(e: Event) => { (e.target as HTMLImageElement).src = noImageSrc }" />
                  <div class="product-item__info">
                    <span class="product-item__name">{{ p.productName || '-' }}</span>
                    <span class="product-item__meta">SKU: {{ p.inputSku || p.productSku || '-' }} / 個数: {{ p.quantity ?? 0 }}</span>
                  </div>
                </div>
                <span v-if="!row.products?.length" class="o-cell">-</span>
              </div>
            </TableCell>
            <!-- 履歴 -->
            <TableCell>
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.confirmedAt', '確定日時') }}</span>
                  <span class="mgmt-cell__value">{{ fmtDateTime(row.statusConfirmedAt) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.invoiceIssuedAt', '送り状発行') }}</span>
                  <span class="mgmt-cell__value">{{ fmtDateTime(row.statusCarrierReceivedAt) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">{{ t('wms.shipment.printedAt', '印刷日時') }}</span>
                  <span class="mgmt-cell__value">{{ fmtDateTime(row.statusPrintedAt) }}</span>
                </div>
              </div>
            </TableCell>
            <!-- 操作 -->
            <TableCell class="text-right">
              <div style="display:inline-flex;gap:4px;flex-wrap:wrap;">
                <Button variant="default" size="sm" @click="handleView(row)">{{ t('wms.shipment.detail', '詳細') }}</Button>
                <Button variant="warning" size="sm" :disabled="isUnconfirming" @click="openUnconfirmDialog(row)">{{ t('wms.shipment.unconfirm', '確認取消') }}</Button>
                <Button variant="secondary" size="sm" :disabled="isChangingInvoiceType" @click="openChangeInvoiceTypeDialog(row)">{{ t('wms.shipment.changeType', '種類変更') }}</Button>
                <Button variant="default" size="sm" :disabled="!canSplitOrder(row) || isSplittingOrder" @click="openSplitOrderDialog(row)">{{ t('wms.shipment.split', '分割') }}</Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ totalRows }} {{ t('wms.common.items', '件') }}</span>
      <div class="o-table-pagination__controls">
        <Select :model-value="String(pageSize)" @update:model-value="(v: string) => { pageSize = Number(v) }">
          <SelectTrigger class="h-8 text-sm" style="width:80px;"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="500">500</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" size="sm" :disabled="currentPage <= 1" @click="currentPage--; loadOrders(false)">&lsaquo;</Button>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <Button variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="currentPage++; loadOrders(false)">&rsaquo;</Button>
      </div>
    </div>

    <!-- Bottom bar -->
    <OrderBottomBar
      :total-count="totalRows"
      :selected-count="tableSelectedKeys.length"
      :total-label="t('wms.shipment.displayCount', '表示件数')"
    >
      <template #left>
        <Button
          variant="default"
          size="sm"
          :disabled="tableSelectedKeys.length === 0 || isReserving"
          @click="handleReserveStock"
        >
          {{ isReserving ? t('wms.shipment.reserving', '引当中...') : t('wms.shipment.reserveStock', '出荷引当') }}
        </Button>
        <Button
          variant="warning"
          size="sm"
          :disabled="tableSelectedKeys.length === 0 || isUnconfirming"
          @click="openBatchUnconfirmDialog"
        >
          {{ isUnconfirming ? t('wms.common.processing', '処理中...') : t('wms.shipment.batchUnconfirm', '一括確認取消') }}
        </Button>
      </template>
      <template #right>
        <Button
          variant="secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handlePickingListClick"
        >
          {{ t('wms.shipment.pickingListExport', 'ピッキングリスト出力') }}
        </Button>
        <Button
          variant="secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleCustomExportClick"
        >
          {{ t('wms.shipment.shipmentDetailCsv', '出荷明細リスト出力(csv)') }}
        </Button>
        <Button
          variant="secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleShipmentDetailListClick"
        >
          {{ t('wms.shipment.shipmentDetailPdf', '出荷明細リスト出力(pdf)') }}
        </Button>
        <Button
          variant="default"
          :disabled="tableSelectedKeys.length === 0"
          @click="handlePrintClick"
        >
          {{ t('wms.shipment.printInvoice', '送り状印刷') }}
        </Button>
        <Button
          variant="default"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleOneByOneStart"
        >
          {{ t('wms.shipment.oneByOneStart', '1-1検品開始') }}
        </Button>
        <Button
          variant="warning"
          size="sm"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleNByOneStart"
        >
          {{ t('wms.shipment.nByOneStart', 'N-1検品開始') }}
        </Button>
        <Button
          variant="secondary"
          @click="schemaAnalysisDrawerVisible = true"
        >
          {{ t('wms.shipment.dataAnalysis', 'データ分析') }}
        </Button>
      </template>
    </OrderBottomBar>

    <OrderViewDialog
      v-model="viewDialogVisible"
      :order="selectedOrder"
      :carriers="carriers"
      :title="t('wms.shipment.orderDetail', '出荷予定明細')"
      mode="view"
    />

    <BatchPrintPanel
      v-model="printPreviewVisible"
      :orders="previewOrders"
      :templates="printTemplatesCache"
      @printed="handlePrintCompleted"
    />

    <FormExportDialog
      v-model="formExportDialogVisible"
      :target-type="formExportTargetType"
      :selected-orders="selectedOrdersForExport"
      :carriers="carriers"
      :products="products"
    />

    <UnconfirmReasonDialog
      v-model="unconfirmDialogVisible"
      :order-number="unconfirmOrderNumber"
      :show-b2-warning="true"
      :show-manual-carrier-warning="unconfirmShowManualCarrierWarning"
      :loading="isUnconfirming"
      @confirm="handleUnconfirmConfirm"
    />

    <ChangeInvoiceTypeDialog
      v-model="changeInvoiceTypeDialogVisible"
      :orders="changeInvoiceTypeOrders"
      :loading="isChangingInvoiceType"
      @confirm="handleChangeInvoiceTypeConfirm"
    />

    <SplitOrderDialog
      v-model="splitOrderDialogVisible"
      :order="splitOrderTarget"
      :loading="isSplittingOrder"
      @confirm="handleSplitOrderConfirm"
    />

    <!-- Schema Analysis Drawer -->
    <SchemaAnalysisDrawer
      :visible="schemaAnalysisDrawerVisible"
      :orders="displayRows as OrderDocument[]"
      :carriers="carriers"
      @update:visible="schemaAnalysisDrawerVisible = $event"
      @filter="handleSchemaFilter"
    />

    <CustomExportDialog
      v-model="customExportDialogVisible"
      :orders="selectedOrdersForCustomExport"
    />

  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useI18n } from '@/composables/useI18n'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import CarrierSelector from '@/components/search/CarrierSelector.vue'
import OrderGroupSelector from '@/components/search/OrderGroupSelector.vue'
import { UNCATEGORIZED_VALUE } from '@/types/orderGroup'
import type { OrderGroup } from '@/types/orderGroup'
import OrderViewDialog from '@/components/shipment-orders/OrderViewDialog.vue'
import BatchPrintPanel from '@/components/print/BatchPrintPanel.vue'
import FormExportDialog from '@/components/form-export/FormExportDialog.vue'
import UnconfirmReasonDialog from '@/components/dialogs/UnconfirmReasonDialog.vue'
import ChangeInvoiceTypeDialog from '@/components/dialogs/ChangeInvoiceTypeDialog.vue'
import SplitOrderDialog from '@/components/dialogs/SplitOrderDialog.vue'
import CustomExportDialog from '@/components/export/CustomExportDialog.vue'
import SchemaAnalysisDrawer from './shipment-list/SchemaAnalysisDrawer.vue'
import { useOrderUnconfirm } from './shipment-list/useOrderUnconfirm'
import type { Operator } from '@/types/table'
import { getOrderFieldDefinitions } from '@/types/order'
import { useOrderCellHelpers } from '@/composables/useOrderCellHelpers'
import { resolveImageUrl } from '@/utils/imageUrl'
import noImageSrc from '@/assets/images/no_image.png'
import { computed, onMounted, ref, watch } from 'vue'
import { Badge } from '@/components/ui/badge'
import { reserveOrdersStock } from '@/api/inventory'
import { fetchShipmentOrder, fetchShipmentOrdersPage, fetchShipmentOrdersByIds } from '@/api/shipmentOrders'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import type { PrintTemplate } from '@/types/printTemplate'
import { fetchPrintTemplates } from '@/api/printTemplates'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
const router = useRouter()
const { show: showToast } = useToast()
const { t } = useI18n()
const { confirm } = useConfirmDialog()


type SortOrder = 'asc' | 'desc' | null
type OrderRow = Record<string, any>

const rows = ref<OrderRow[]>([])
const tableSelectedKeys = ref<string[]>([])
const isLoadingOrders = ref(false)

// 出荷引当
const isReserving = ref(false)

const handleReserveStock = async () => {
  if (tableSelectedKeys.value.length === 0) return
  if (!(await confirm('この操作を実行しますか？'))) return
  isReserving.value = true
  try {
    const result = await reserveOrdersStock(tableSelectedKeys.value)

    // 結果メッセージ構築
    const lines: string[] = [result.message]

    // 各注文の詳細
    for (const r of result.results) {
      if (r.reservationCount > 0) {
        lines.push(`  ✓ ${r.orderNumber}: ${r.reservationCount}件引当`)
      }
      for (const err of r.errors) {
        lines.push(`  ⚠ ${r.orderNumber}: ${err}`)
      }
    }

    showToast(lines.join('\n'), 'success')
    tableSelectedKeys.value = []
  } catch (e: any) {
    showToast(e?.message || '在庫引当に失敗しました', 'danger')
  } finally {
    isReserving.value = false
  }
}

// Forward reference for loadOrders (defined later)
let _loadOrders: () => Promise<void> = async () => {}

// Unconfirm / Change invoice type / Split order (composable)
const {
  isUnconfirming,
  unconfirmDialogVisible,
  unconfirmOrderNumber,
  unconfirmShowManualCarrierWarning,
  openUnconfirmDialog,
  openBatchUnconfirmDialog,
  isBatchUnconfirm,
  handleUnconfirmConfirm: _handleUnconfirmConfirm,
  changeInvoiceTypeDialogVisible,
  changeInvoiceTypeOrders,
  isChangingInvoiceType,
  openChangeInvoiceTypeDialog,
  handleChangeInvoiceTypeConfirm,
  splitOrderDialogVisible,
  splitOrderTarget,
  isSplittingOrder,
  openSplitOrderDialog,
  handleSplitOrderConfirm,
  canSplitOrder,
} = useOrderUnconfirm(
  () => rows.value,
  () => tableSelectedKeys.value,
  () => _loadOrders(),
)

// Wrap unconfirm handler to clear selection after batch unconfirm
const handleUnconfirmConfirm = async (reason: string, skipCarrierDelete = false) => {
  await _handleUnconfirmConfirm(reason, skipCarrierDelete)
  if (isBatchUnconfirm.value) {
    tableSelectedKeys.value = []
  }
}

// Cell helpers
const carriers = ref<Carrier[]>([])
const {
  getCarrierLabel,
  getInvoiceTypeLabel,
  getTimeSlotLabel,
  getCoolTypeInfo,
  fmtDateTime,
  fmtPostal,
} = useOrderCellHelpers(carriers)

// データ分析 Drawer
const schemaAnalysisDrawerVisible = ref(false)

// カスタム出力ダイアログ
const customExportDialogVisible = ref(false)
const selectedOrdersForCustomExport = ref<OrderDocument[]>([])

// Search form ref for external filter addition
const searchFormRef = ref<{ addFilter: (fieldKey: string, value: any) => boolean } | null>(null)

const currentPage = ref(1)
const pageSize = ref(25)
const totalRows = ref(0)
const sortBy = ref<string | null>('orderNumber')
const sortOrder = ref<SortOrder>('asc')

// Carrier selector
const selectedCarrierId = ref<string>('')
// Order group selector
const selectedOrderGroupId = ref<string>('')
const orderGroups = ref<OrderGroup[]>([])
const orderGroupSelectorRef = ref<{ reloadCounts: () => Promise<void> } | null>(null)
// Products
const products = ref<Product[]>([])
const showInspected = ref(true)
const showPrinted = ref(true)

const handleCarrierChange = (carrierId: string) => {
  selectedCarrierId.value = carrierId
}

const handleCarriersLoaded = (loadedCarriers: Carrier[]) => {
  carriers.value = loadedCarriers
  void loadOrders()
}

const handleOrderGroupChange = (orderGroupId: string) => {
  selectedOrderGroupId.value = orderGroupId
}

const handleOrderGroupsLoaded = (groups: OrderGroup[]) => {
  orderGroups.value = groups
}

const searchInitialValues = computed(() => {
  return {}
})

const carrierOptions = computed(() => {
  return (carriers.value || []).map((c) => ({ label: c.name, value: c._id }))
})

const allFieldDefinitions = computed(() =>
  getOrderFieldDefinitions({ carrierOptions: carrierOptions.value }),
)

const searchColumns = computed(() => {
  return allFieldDefinitions.value.filter(
    (col) => col.searchType !== undefined && col.key !== 'carrierId',
  )
})

const currentSearchPayload = ref<Record<string, { operator: Operator; value: any }> | null>(null)
const globalSearchText = ref<string>('')

const effectiveSearchPayload = computed(() => {
  const base = currentSearchPayload.value || searchInitialValues.value
  const q: Record<string, { operator: Operator; value: any }> = { ...(base || {}) }
  if (selectedCarrierId.value) {
    q.carrierId = { operator: 'is', value: selectedCarrierId.value }
  }
  if (selectedOrderGroupId.value) {
    if (selectedOrderGroupId.value === UNCATEGORIZED_VALUE) {
      q.orderGroupId = { operator: 'isEmpty', value: null }
    } else {
      q.orderGroupId = { operator: 'is', value: selectedOrderGroupId.value }
    }
  }
  q['statusConfirmed'] = { operator: 'is', value: true }
  q['statusCarrierReceived'] = { operator: 'is', value: true }
  q['statusShipped'] = { operator: 'isNot', value: true }
  if (!showInspected.value) {
    q['statusInspected'] = { operator: 'isNot', value: true }
  }
  if (!showPrinted.value) {
    q['statusPrinted'] = { operator: 'isNot', value: true }
  }
  return q
})

const displayRows = computed(() => [...rows.value])

const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)))

// サーバーサイドページネーション: rows は既に現在ページのデータのみ / 服务端分页: rows已经只有当前页数据
const paginatedRows = computed(() => displayRows.value)

const isAllCurrentPageSelected = computed(() => {
  if (paginatedRows.value.length === 0) return false
  return paginatedRows.value.every((r) => tableSelectedKeys.value.includes(String(r._id)))
})

const isSomeCurrentPageSelected = computed(() => {
  return paginatedRows.value.some((r) => tableSelectedKeys.value.includes(String(r._id)))
})

const toggleSelectAll = () => {
  const pageIds = paginatedRows.value.map((r) => String(r._id))
  if (isAllCurrentPageSelected.value) {
    tableSelectedKeys.value = tableSelectedKeys.value.filter((k) => !pageIds.includes(k))
  } else {
    const existing = new Set(tableSelectedKeys.value)
    for (const id of pageIds) existing.add(id)
    tableSelectedKeys.value = [...existing]
  }
}

const toggleRowSelection = (row: any) => {
  const id = String(row._id)
  const idx = tableSelectedKeys.value.indexOf(id)
  if (idx >= 0) {
    tableSelectedKeys.value = tableSelectedKeys.value.filter((k) => k !== id)
  } else {
    tableSelectedKeys.value = [...tableSelectedKeys.value, id]
  }
}

const handleSortClick = (field: string) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
  void loadOrders()
}

const viewDialogVisible = ref(false)
const selectedOrder = ref<any>(null)
const printPreviewVisible = ref(false)
const previewOrders = ref<OrderDocument[]>([])
const formExportDialogVisible = ref(false)
const formExportTargetType = ref<'shipment-list-picking' | 'shipment-detail-list'>('shipment-list-picking')

const selectedOrdersForExport = computed(() => {
  const keySet = new Set(tableSelectedKeys.value)
  return rows.value.filter((r: any) => keySet.has(String(r?._id))) as OrderDocument[]
})

// Print templates cache
const printTemplatesCache = ref<PrintTemplate[]>([])

const loadPrintTemplates = async () => {
  try {
    const templates = await fetchPrintTemplates()
    printTemplatesCache.value = templates
    localStorage.setItem('allPrintTemplatesCache', JSON.stringify(templates))
  } catch {
    // 印刷テンプレート読み込み失敗は無視（キャッシュを使用）/ 加载印刷模板失败时忽略（使用缓存）
    try {
      const cached = localStorage.getItem('allPrintTemplatesCache')
      if (cached) printTemplatesCache.value = JSON.parse(cached)
    } catch { /* ignore */ }
  }
}


const handleView = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return
    selectedOrder.value = await fetchShipmentOrder(String(id))
    viewDialogVisible.value = true
  } catch (e: any) {
    showToast(e?.message || '詳細の取得に失敗しました', 'danger')
  }
}

const handlePickingListClick = () => {
  if (tableSelectedKeys.value.length === 0) return
  formExportTargetType.value = 'shipment-list-picking'
  formExportDialogVisible.value = true
}

const handleShipmentDetailListClick = () => {
  if (tableSelectedKeys.value.length === 0) return
  formExportTargetType.value = 'shipment-detail-list'
  formExportDialogVisible.value = true
}

const handleCustomExportClick = async () => {
  if (tableSelectedKeys.value.length === 0) return
  const orderIds = tableSelectedKeys.value.map((k) => String(k))
  try {
    const orders = await fetchShipmentOrdersByIds(orderIds)
    selectedOrdersForCustomExport.value = orders
    customExportDialogVisible.value = true
  } catch (e: any) {
    // カスタムエクスポート用注文取得失敗 / Failed to fetch orders for custom export
    showToast('注文データの取得に失敗しました', 'danger')
  }
}

const handlePrintClick = async () => {
  if (tableSelectedKeys.value.length === 0) return
  await openPrintPreview()
}

const handleOneByOneStart = () => {
  if (tableSelectedKeys.value.length === 0) return
  const orderIds = tableSelectedKeys.value.map((k) => String(k))
  localStorage.setItem('oneByOneSelectedOrderIds', JSON.stringify(orderIds))
  localStorage.removeItem('oneByOneProcessedOrderIds')
  router.push('/shipment/operations/one-by-one/inspection')
}

const handleNByOneStart = () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value)
  const selectedOrders = rows.value.filter((r: any) => keySet.has(String(r?._id)))

  const invalidOrders = selectedOrders.filter((o: any) => {
    const totalQty = o._productsMeta?.totalQuantity
      ?? (Array.isArray(o.products)
        ? o.products.reduce((s: number, p: any) => s + (p.quantity || 1), 0)
        : 0)
    return totalQty !== 1
  })

  if (invalidOrders.length > 0) {
    const names = invalidOrders.slice(0, 5).map((o: any) => o.orderNumber || String(o._id))
    showToast(
      `商品数が1でない注文があります: ${names.join(', ')}${invalidOrders.length > 5 ? ` 他${invalidOrders.length - 5}件` : ''}`,
      'warning',
    )
    return
  }

  const orderIds = tableSelectedKeys.value.map((k) => String(k))
  localStorage.setItem('nByOneSelectedOrderIds', JSON.stringify(orderIds))
  localStorage.removeItem('nByOneProcessedOrderIds')
  router.push('/shipment/operations/n-by-one/inspection')
}

const openPrintPreview = async () => {
  const keySet = new Set(tableSelectedKeys.value)
  const selectedRows = rows.value.filter((r: any) => keySet.has(String(r?._id)))
  if (!selectedRows.length) return

  if (printTemplatesCache.value.length === 0) {
    await loadPrintTemplates()
  }

  if (printTemplatesCache.value.length === 0) {
    try {
      const storedTemplates = localStorage.getItem('allPrintTemplatesCache')
      if (storedTemplates) {
        printTemplatesCache.value = JSON.parse(storedTemplates) as PrintTemplate[]
      }
    } catch (e) {
      // テンプレートlocalStorage読み込み失敗 / Failed to load templates from localStorage
    }
  }

  if (printTemplatesCache.value.length === 0) {
    showToast('印刷テンプレートが読み込まれていません', 'danger')
    return
  }

  const orderIds = selectedRows
    .map((row) => String((row as any)?._id))
    .filter((id) => id && id !== 'undefined')

  if (orderIds.length === 0) {
    showToast('印刷可能な注文がありません', 'warning')
    return
  }

  let orders: OrderDocument[] = []
  try {
    orders = await fetchShipmentOrdersByIds<OrderDocument>(orderIds, { includeRawData: true })
  } catch (e: any) {
    // 印刷用注文取得失敗 / Failed to fetch orders for print
    showToast(`注文データの取得に失敗しました: ${e?.message || String(e)}`, 'danger')
    return
  }

  orders = orders.filter((order) => {
    return order && order._id && order.carrierId && order.invoiceType
  })

  if (orders.length === 0) {
    showToast('印刷可能な注文がありません', 'warning')
    return
  }

  previewOrders.value = orders
  printPreviewVisible.value = true
}

const handlePrintCompleted = async () => {
  await loadOrders()
  tableSelectedKeys.value = []
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  const nextPayload: Record<string, { operator: Operator; value: any }> = { ...(payload || {}) }
  const keyword = (nextPayload as any)?.__global?.value
  globalSearchText.value = keyword ? String(keyword) : ''
  delete (nextPayload as any).__global
  currentSearchPayload.value = nextPayload
  void loadOrders()
}

const handleSave = (_payload: Record<string, { operator: Operator; value: any }>) => {
  showToast('検索条件を保存しました（ダミー）', 'info')
}

const handleSchemaFilter = (fieldPath: string, value: any) => {
  const success = searchFormRef.value?.addFilter(fieldPath, value)
  schemaAnalysisDrawerVisible.value = false

  if (success) {
    showToast('フィルタを追加しました', 'success')
  } else {
    const payload = currentSearchPayload.value || {}
    payload[fieldPath] = { operator: 'is', value }
    currentSearchPayload.value = { ...payload }
    void loadOrders()
    showToast('フィルタを追加しました（検索フォーム外）', 'success')
  }
}

const loadOrders = async (resetPage = true) => {
  if (isLoadingOrders.value) return
  isLoadingOrders.value = true

  try {
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    const q = effectiveSearchPayload.value || undefined

    if (resetPage) currentPage.value = 1

    // サーバーサイドページネーション: 現在ページのみ取得 / 服务端分页: 只获取当前页
    const res = await fetchShipmentOrdersPage<OrderRow>({
      page: currentPage.value,
      limit: pageSize.value,
      q,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      tzOffsetMinutes,
    })

    rows.value = Array.isArray(res?.items) ? res.items : []
    totalRows.value = typeof res?.total === 'number' ? res.total : rows.value.length
    orderGroupSelectorRef.value?.reloadCounts()
  } catch (e: any) {
    showToast(e?.message || '出荷予定の取得に失敗しました', 'danger')
  } finally {
    isLoadingOrders.value = false
  }
}

_loadOrders = loadOrders

watch(
  () => selectedCarrierId.value,
  () => {
    void loadOrders()
  },
)

watch(
  () => selectedOrderGroupId.value,
  () => {
    void loadOrders()
  },
)

watch(
  [showInspected, showPrinted],
  () => {
    void loadOrders()
  },
)

// ページサイズ変更時に再取得 / 页大小变更时重新获取
watch(pageSize, () => {
  void loadOrders()
})

onMounted(async () => {
  await Promise.all([
    loadPrintTemplates(),
    (async () => {
      try {
        products.value = await fetchProducts()
      } catch (e) {
        // 商品読み込み失敗 / Failed to load products
      }
    })(),
  ])
})
</script>

<style scoped>
@import '@/styles/order-table.css';

.shipment-list {
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
  color: var(--o-gray-600);
  cursor: pointer;
  white-space: nowrap;
}

/* OrderGroupSelector tabs 紧贴 table */
.table-attached {
  margin-top: 0 !important;
}

.o-toggle { position:relative; display:inline-flex; align-items:center; cursor:pointer; }
.o-toggle input { position:absolute; opacity:0; width:0; height:0; }
.o-toggle-slider { width:40px; height:20px; background:var(--o-toggle-off, #ccc); border-radius:10px; transition:0.2s; position:relative; }
.o-toggle-slider::after { content:''; position:absolute; width:16px; height:16px; border-radius:50%; background:#fff; top:2px; left:2px; transition:0.2s; }
.o-toggle input:checked + .o-toggle-slider { background:var(--o-brand-primary, #0052A3); }
.o-toggle input:checked + .o-toggle-slider::after { left:22px; }
</style>
