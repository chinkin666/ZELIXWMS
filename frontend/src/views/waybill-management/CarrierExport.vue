<template>
  <div class="waybill-export">
    <div class="page-header">
      <h1 class="page-title">配送業者データ出力</h1>
    </div>

    <CarrierSelector
      v-model="selectedCarrierId"
      @change="handleCarrierChange"
      @carriers-loaded="handleCarriersLoaded"
    />

    <OrderSearchFormWrapper
      class="search-section"
      :columns="searchColumns"
      :initial-values="searchInitialValues"
      storage-key="waybill_export"
      @search="handleSearch"
      @save="handleSave"
    />

    <div class="between-controls">
      <div class="between-controls__item">
        <span class="between-controls__label">取込済み表示：</span>
        <label class="o-toggle">
          <input type="checkbox" v-model="showCarrierReceiptReceivedRows">
          <span class="o-toggle-slider"></span>
        </label>
      </div>
    </div>

    <Table
      :columns="tableColumns"
      :data="displayRows"
      :global-search-text="globalSearchText"
      :height="560"
      row-key="_id"
      highlight-columns-on-hover
      row-selection-enabled
      pagination-enabled
      pagination-mode="client"
      :page-size="pageSize"
      :page-sizes="[10,25,50,100,500]"
      :header-grouping-enabled="true"
      :header-grouping-config="headerGroupingConfig"
      :header-height="[50, 50]"
      :header-class="headerClass"
      :table-props="tableProps"
      sort-enabled
      sort-mode="server"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :products="products"
      page-key="waybill-management-export"
      v-model:selected-keys="tableSelectedKeys"
      @selection-change="handleTableSelectionChange"
      @sort-change="handleSortChange"
    />

    <!-- Bottom bar -->
    <OrderBottomBar
      :total-count="displayRows.length"
      :selected-count="tableSelectedKeys.length"
      total-label="表示件数"
    >
      <template #left>
        <!-- Batch unconfirm button -->
        <button
          class="o-btn o-btn-sm"
          style="border-color:#e6a23c;color:#e6a23c;background:transparent;"
          :disabled="tableSelectedKeys.length === 0 || batchUnconfirming"
          @click="handleBatchUnconfirm"
        >
          {{ batchUnconfirming ? '処理中...' : '一括確認取消' }}
        </button>
      </template>
      <template #right>
        <button
          class="o-btn o-btn-secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleCustomExportClick"
        >
          出荷明細リスト出力(csv)
        </button>
        <button
          class="o-btn o-btn-secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleFormExportClick"
        >
          出荷明細リスト出力(pdf)
        </button>
        <!-- Automation export button (Yamato B2) -->
        <button
          class="o-btn o-btn-secondary"
          style="border-color:#67c23a;color:#67c23a;"
          :disabled="!canSendToB2Cloud || automationExporting"
          @click="handleAutomationExport"
        >
          {{ automationExporting ? '送信中...' : 'B2 Cloud に送信' }}
        </button>
        <!-- Normal export button -->
        <button
          class="o-btn o-btn-primary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleExportClick"
        >
          配送業者データ出力
        </button>
      </template>
    </OrderBottomBar>

    <!-- Automation result dialog -->
    <YamatoB2ExportResultDialog
      v-model="automationResultDialogVisible"
      :result="automationResult"
      @confirm="handleAutomationResultClose"
    />

    <!-- Automation API error dialog -->
    <YamatoB2ApiErrorDialog
      v-model="automationApiErrorDialogVisible"
      :error-message="automationApiErrorMessage"
    />

    <OrderViewDialog
      v-model="viewDialogVisible"
      :order="selectedOrder"
      :carriers="carriers"
      title="出荷予定明細"
    />

    <CarrierExportResultDialog
      v-model="exportDialogVisible"
      :carrier-label="exportCarrierLabel"
      :mapping-options="exportMappingOptions"
      v-model:selected-mapping-id="exportSelectedMappingId"
      :headers="exportHeaders"
      :rows="exportOutputRows"
      :file-name-base="exportFileNameBase"
    />

    <!-- Custom Export Dialog -->
    <CustomExportDialog
      v-model="customExportDialogVisible"
      :orders="selectedOrdersForCustomExport"
    />

    <!-- Form Export Dialog (PDF) -->
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
import { computed, h, onMounted, ref, watch } from 'vue'
import Table from '@/components/table/OrderTable.vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import OrderSearchFormWrapper from '@/components/search/OrderSearchFormWrapper.vue'
import CarrierSelector from '@/components/search/CarrierSelector.vue'
import OrderViewDialog from '@/components/shipment-orders/OrderViewDialog.vue'
import CarrierExportResultDialog from '@/components/waybill-management/CarrierExportResultDialog.vue'
import CustomExportDialog from '@/components/export/CustomExportDialog.vue'
import FormExportDialog from '@/components/form-export/FormExportDialog.vue'
import type { OrderDocument } from '@/types/order'
import type { HeaderGroupingConfig } from '@/components/table/tableHeaderGroup'
import type { Operator, TableColumn } from '@/types/table'
import { getOrderFieldDefinitions } from '@/types/order'
import { buildOrderHeaderGroupingConfig } from '@/utils/orderHeaderGrouping'
import { fetchShipmentOrder, fetchShipmentOrdersPage, updateShipmentOrderStatus, updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import type { Carrier } from '@/types/carrier'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import { getAllMappingConfigs, type MappingConfig } from '@/api/mappingConfig'
import { getNestedValue } from '@/utils/nestedObject'
import { formatOrderProductsText } from '@/utils/formatOrderProductsText'
import { applyTransformMappings } from '@/utils/transformRunner'
import { yamatoB2Export } from '@/api/carrierAutomation'
import type { YamatoB2ExportResult } from '@/types/carrierAutomation'
import YamatoB2ExportResultDialog from '@/components/carrier-automation/YamatoB2ExportResultDialog.vue'
import YamatoB2ApiErrorDialog from '@/components/carrier-automation/YamatoB2ApiErrorDialog.vue'

type SortOrder = 'asc' | 'desc' | null
type OrderRow = Record<string, any>

const rows = ref<OrderRow[]>([])
const tableSelectedKeys = ref<Array<string | number>>([])
const isLoadingOrders = ref(false)

const pageSize = ref(10)
const sortBy = ref<string | null>('orderNumber') // 默认按出荷管理No排序
const sortOrder = ref<SortOrder>('asc') // 默认升序

// Carrier selector (handled by CarrierSelector component)
const selectedCarrierId = ref<string>('')
const carriers = ref<Carrier[]>([])
// Products for OrderTable
const products = ref<Product[]>([])

const handleCarrierChange = (carrierId: string) => {
  selectedCarrierId.value = carrierId
}

const handleCarriersLoaded = (loadedCarriers: Carrier[]) => {
  carriers.value = loadedCarriers
  // CarrierSelector 不再自动选择，直接加载订单（无配送業者过滤时显示全部）
  void loadOrders()
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
const baseColumns = computed(() => {
  const systemFieldKeys = ['tenantId']
  // 在 waybill-export 页面显示ステータス字段
  const statusKeys = ['statusCarrierReceipt', 'statusPrintReady', 'statusPrinted']
  return allFieldDefinitions.value.filter((col) => {
    if (systemFieldKeys.includes(col.key)) return false
    // 如果字段设置了 tableVisible: false，但在 statusKeys 中，则显示
    if (statusKeys.includes(col.key)) return true
    // 否则遵循 tableVisible 设置
    return col.tableVisible !== false
  })
})
const searchColumns = computed(() => {
  // Carrier is controlled by the radio above (not by SearchForm)
  // CarrierReceipt is controlled by the switch below (not by SearchForm)
  return allFieldDefinitions.value.filter(
    (col) => col.searchType !== undefined && col.key !== 'carrierId' && col.key !== 'statusCarrierReceipt',
  )
})

const currentSearchPayload = ref<Record<string, { operator: Operator; value: any }> | null>(null)
const globalSearchText = ref<string>('')

// Toggle: show rows where carrier receipt is received (true)
// - false(default): only show isReceived === false
// - true: show both false/true (no filter)
const showCarrierReceiptReceivedRows = ref(false)

const effectiveSearchPayload = computed(() => {
  const base = currentSearchPayload.value || searchInitialValues.value
  const q: Record<string, { operator: Operator; value: any }> = { ...(base || {}) }
  // Carrier selector acts as a dedicated filter for this page
  if (selectedCarrierId.value) {
    q.carrierId = { operator: 'is', value: selectedCarrierId.value }
  }
  // Carrier receipt toggle acts as a dedicated filter for this page
  if (!showCarrierReceiptReceivedRows.value) {
    q['status.carrierReceipt.isReceived'] = { operator: 'is', value: false }
  }
  // 只显示 confirm.isConfirmed 为 true 的订单（只显示已确认的订单）
  q['status.confirm.isConfirmed'] = { operator: 'is', value: true }
  return q
})

const displayRows = computed(() => {
  return [...rows.value]
})

const viewDialogVisible = ref(false)
const selectedOrder = ref<any>(null)

// Export result dialog
const exportDialogVisible = ref(false)
const exportCarrierLabel = ref('')
const exportFileNameBase = ref('carrier-export')
const exportHeaders = ref<string[]>([])
const exportOutputRows = ref<Array<Record<string, any>>>([])
const exportMappingOptions = ref<Array<{ label: string; value: string }>>([])
const exportSelectedMappingId = ref<string>('')
const exportMappingConfigsById = ref<Map<string, MappingConfig>>(new Map())
const exportSourceOrders = ref<any[]>([])
const exportCarrier = ref<Carrier | null>(null)

// Batch unconfirm
const batchUnconfirming = ref(false)

// Custom export dialog state
const customExportDialogVisible = ref(false)
const selectedOrdersForCustomExport = ref<any[]>([])

// Form export dialog state (PDF)
const formExportDialogVisible = ref(false)
const selectedOrdersForFormExport = ref<OrderDocument[]>([])

// Automation export
const automationExporting = ref(false)
const automationResultDialogVisible = ref(false)
const automationResult = ref<YamatoB2ExportResult | null>(null)
const automationApiErrorDialogVisible = ref(false)
const automationApiErrorMessage = ref('')

// Check if ALL selected items have B2 Cloud built-in carriers
const canSendToB2Cloud = computed(() => {
  if (tableSelectedKeys.value.length === 0) return false
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  const selectedRows = rows.value.filter((r: any) => keySet.has(String(r?._id)))
  if (selectedRows.length === 0) return false

  // Check if all selected rows have carriers with automationType === 'yamato-b2'
  return selectedRows.every((row: any) => {
    const carrierId = String(row?.carrierId || '')
    if (!carrierId) return false
    const carrier = carriers.value.find((c) => c._id === carrierId)
    return carrier?.automationType === 'yamato-b2'
  })
})

/**
 * Show B2 Cloud API error dialog
 */
const showApiError = (errorMessage: string) => {
  automationApiErrorMessage.value = errorMessage
  automationApiErrorDialogVisible.value = true
}

const handleAutomationExport = async () => {
  try {
    if (!tableSelectedKeys.value.length) return

    const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
    const selectedRows = rows.value.filter((r: any) => keySet.has(String(r?._id)))
    if (!selectedRows.length) return

    const carrierIdSet = new Set(selectedRows.map((r: any) => String(r?.carrierId || '')))
    carrierIdSet.delete('')
    if (carrierIdSet.size !== 1) {
      alert('選択した行の配送業者が一致しません。配送業者ごとに出力してください。')
      return
    }

    const carrierId = Array.from(carrierIdSet)[0]!
    const carrier = carriers.value.find((c) => c._id === carrierId) || null
    if (!carrier || carrier.automationType !== 'yamato-b2') {
      alert('選択した配送業者はB2 Cloud自動連携に対応していません')
      return
    }

    const orderIds = selectedRows.map((r: any) => String(r._id))

    // Directly export (validation is done at confirm time)
    automationExporting.value = true
    const result = await yamatoB2Export(orderIds)
    automationResult.value = result
    automationResultDialogVisible.value = true

    if (result.success_count > 0) {
      alert(`${result.success_count}件の送信に成功しました`)
    }
    if (result.error_count > 0) {
      alert(`${result.error_count}件の送信に失敗しました`)
    }
  } catch (e: any) {
    const errorMsg = e?.message || 'B2 Cloudへの送信に失敗しました'
    showApiError(errorMsg)
  } finally {
    automationExporting.value = false
  }
}

const handleAutomationResultClose = async () => {
  automationResultDialogVisible.value = false
  automationResult.value = null
  tableSelectedKeys.value = []
  await loadOrders()
}

const handleView = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return
    selectedOrder.value = await fetchShipmentOrder(String(id))
    viewDialogVisible.value = true
  } catch (e: any) {
    alert(e?.message || '詳細の取得に失敗しました')
  }
}

const handleUnconfirm = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return

    await updateShipmentOrderStatus(String(id), 'unconfirm', 'confirm')

    alert('確認を取消しました')
    // 重新加载订单列表
    await loadOrders()
  } catch (e: any) {
    alert(e?.message || '確認の取消に失敗しました')
  }
}

const handleBatchUnconfirm = async () => {
  if (!tableSelectedKeys.value.length) return

  batchUnconfirming.value = true
  try {
    const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
    const selectedIds = rows.value
      .filter((r: any) => keySet.has(String(r?._id)))
      .map((r: any) => String(r._id))

    if (!selectedIds.length) return

    // 使用批量 API（1个请求代替N个请求）
    const result = await updateShipmentOrderStatusBulk(selectedIds, 'unconfirm', 'confirm')
    const successCount = result?.modifiedCount ?? selectedIds.length

    if (successCount > 0) {
      alert(`${successCount}件の確認を取消しました`)
    }

    tableSelectedKeys.value = []
    await loadOrders()
  } catch (e: any) {
    alert(e?.message || '一括確認取消に失敗しました')
  } finally {
    batchUnconfirming.value = false
  }
}

const handleTableSelectionChange = (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  tableSelectedKeys.value = payload.selectedKeys
}

const handleCustomExportClick = () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  selectedOrdersForCustomExport.value = rows.value.filter((r: any) =>
    keySet.has(String(r?._id)),
  )
  customExportDialogVisible.value = true
}

const handleFormExportClick = () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  selectedOrdersForFormExport.value = rows.value.filter((r: any) =>
    keySet.has(String(r?._id)),
  ) as OrderDocument[]
  formExportDialogVisible.value = true
}

const normalizeOrderValueForExport = (sourcePath: string, raw: any): any => {
  if (sourcePath === 'products') {
    if (Array.isArray(raw)) return formatOrderProductsText(raw)
    if (raw && typeof raw === 'object') return formatOrderProductsText([raw])
  }
  return raw
}

/**
 * transformRunner currently reads only direct keys (row[input.column]).
 * For export, we use nested order paths in mapping configs, so flatten them into a single-level row.
 */
const buildFlatRowForMappings = (order: any, mappings: MappingConfig['mappings']): Record<string, any> => {
  const flat: Record<string, any> = {}
  for (const m of mappings || []) {
    for (const input of (m as any)?.inputs || []) {
      if (input?.type !== 'column') continue
      const col = String(input.column || '')
      if (!col) continue
      if (col in flat) continue
      const raw = getNestedValue(order as any, col)
      flat[col] = normalizeOrderValueForExport(col, raw)
    }
  }
  return flat
}

const loadExportMappingConfigsForCarrier = async (carrierCode: string) => {
  const all = await getAllMappingConfigs('order-to-carrier')
  const filtered = (all || []).filter((c) => c?.configType === 'order-to-carrier' && c?.carrierCode === carrierCode)
  filtered.sort((a, b) => Number(!!b.isDefault) - Number(!!a.isDefault) || a.name.localeCompare(b.name))
  exportMappingConfigsById.value = new Map(filtered.map((c) => [c._id, c]))
  exportMappingOptions.value = filtered.map((c) => ({
    label: `${c.name}${c.isDefault ? ' (default)' : ''}`,
    value: c._id,
  }))
}

const rebuildExportRows = async () => {
  const carrier = exportCarrier.value
  if (!carrier) return
  const mappingId = exportSelectedMappingId.value
  const cfg = exportMappingConfigsById.value.get(String(mappingId || '')) || null
  if (!cfg) {
    exportOutputRows.value = []
    return
  }

  const headers = exportHeaders.value || []
  const out = await Promise.all(
    (exportSourceOrders.value || []).map(async (order: any) => {
      const flatRow = buildFlatRowForMappings(order, cfg.mappings || [])
      const mapped = await applyTransformMappings(cfg.mappings || [], flatRow, { meta: { row: flatRow } })
      const row: Record<string, any> = {}
      for (const h of headers) {
        row[h] = mapped?.[h] ?? ''
      }
      return row
    }),
  )

  exportOutputRows.value = out
}

const handleExportClick = async () => {
  try {
    if (!tableSelectedKeys.value.length) return

    const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
    const selectedRows = rows.value.filter((r: any) => keySet.has(String(r?._id)))
    if (!selectedRows.length) return

    const carrierIdSet = new Set(selectedRows.map((r: any) => String(r?.carrierId || '')))
    carrierIdSet.delete('')
    if (carrierIdSet.size !== 1) {
      alert('選択した行の配送業者が一致しません。配送業者ごとに出力してください。')
      return
    }

    const carrierId = Array.from(carrierIdSet)[0]!
    const carrier = carriers.value.find((c) => c._id === carrierId) || null
    if (!carrier) {
      alert('配送業者情報が見つかりません')
      return
    }

    const headers = (carrier.formatDefinition?.columns || []).map((c) => c.name).filter(Boolean)
    exportHeaders.value = headers
    exportCarrier.value = carrier
    exportSourceOrders.value = selectedRows

    await loadExportMappingConfigsForCarrier(String(carrier.code || ''))
    if (!exportMappingOptions.value.length) {
      alert('この配送業者に出力レイアウト（order-to-carrier）が未設定です（レイアウト設定で作成してください）。')
      return
    }

    // default = first available (sorted with default first)
    exportSelectedMappingId.value = exportMappingOptions.value[0]!.value

    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    exportCarrierLabel.value = `${carrier.name} (${carrier.code})`
    exportFileNameBase.value = `${carrier.code || 'carrier'}_${ymd}`
    await rebuildExportRows()
    exportDialogVisible.value = true
  } catch (e: any) {
    alert(e?.message || '配送業者データ出力に失敗しました')
  }
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
  alert('検索条件を保存しました（ダミー）')
}

const tableColumns = computed(() => {
  const actionColumn = {
    key: 'actions',
    dataKey: 'actions',
    title: '操作',
    width: 200,
    fixed: 'right' as const,
    align: 'center' as const,
    cellRenderer: ({ rowData }: { rowData: any }) =>
      h(
        'div',
        { style: 'display:inline-flex;gap:8px;' },
        [
          h(
            'button',
            {
              class: 'o-btn o-btn-primary o-btn-sm',
              onClick: () => handleView(rowData),
            },
            '詳細',
          ),
          h(
            'button',
            {
              class: 'o-btn o-btn-sm',
              style: 'border-color:#e6a23c;color:#e6a23c;background:transparent;',
              onClick: () => handleUnconfirm(rowData),
            },
            '確認取消',
          ),
        ],
      ),
  }

  const cols = [
    ...baseColumns.value,
    actionColumn,
  ]
  return cols
})

const headerGroupingConfig = computed<HeaderGroupingConfig>(() => {
  return buildOrderHeaderGroupingConfig(baseColumns.value as any)
})

const headerClass = (): string => ''

const tableProps = computed(() => ({}))


const loadOrders = async () => {
  // Prevent concurrent calls
  if (isLoadingOrders.value) return
  isLoadingOrders.value = true

  try {
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    // Fetch ALL items from backend by paging (server max limit is 1000)
    const limit = 1000
    const all: OrderRow[] = []
    let page = 1
    let total = Infinity

    // Capture query params at the start to ensure consistency across pages
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
      const items = Array.isArray(res?.items) ? res.items : []
      const t = typeof res?.total === 'number' ? res.total : undefined
      if (typeof t === 'number') total = t

      if (!items.length) break
      all.push(...items)

      if (items.length < limit) break
      page += 1
    }

    rows.value = all
  } catch (e: any) {
    alert(e?.message || '出荷予定の取得に失敗しました')
  } finally {
    isLoadingOrders.value = false
  }
}

const handleSortChange = (payload: { sortBy: string | null; sortOrder: SortOrder; mode: 'client' | 'server' }) => {
  if (payload.mode !== 'server') return
  sortBy.value = payload.sortBy
  sortOrder.value = payload.sortOrder
  void loadOrders()
}

watch(
  () => selectedCarrierId.value,
  () => {
    void loadOrders()
  },
)

watch(
  () => showCarrierReceiptReceivedRows.value,
  () => {
    void loadOrders()
  },
)

watch(
  () => exportSelectedMappingId.value,
  async () => {
    if (!exportDialogVisible.value) return
    try {
      await rebuildExportRows()
    } catch (e: any) {
      alert(e?.message || '出力レイアウトの適用に失敗しました')
    }
  },
)

onMounted(async () => {
  // 注意：loadOrders() 不在这里调用，由 handleCarriersLoaded() 触发
  try {
    products.value = await fetchProducts()
  } catch (e) {
    console.error('Failed to load products:', e)
  }
})
</script>

<style scoped>
.waybill-export {
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #2a3474;
}

.search-section {
  margin-bottom: 20px;
}

.between-controls {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin: 0 0 12px;
}

.between-controls__item {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.between-controls__label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.bottom-bar {
  position: sticky;
  bottom: 0;
  margin-top: 16px;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 10;
}

.bottom-bar__left {
  color: #303133;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.bottom-bar__meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.bottom-bar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

::v-deep(.error-cell) {
  background-color: #ffebee !important;
}

.o-toggle { position:relative; display:inline-flex; align-items:center; cursor:pointer; }
.o-toggle input { position:absolute; opacity:0; width:0; height:0; }
.o-toggle-slider { width:40px; height:20px; background:var(--o-toggle-off, #ccc); border-radius:10px; transition:0.2s; position:relative; }
.o-toggle-slider::after { content:''; position:absolute; width:16px; height:16px; border-radius:50%; background:#fff; top:2px; left:2px; transition:0.2s; }
.o-toggle input:checked + .o-toggle-slider { background:var(--o-brand-primary, #714B67); }
.o-toggle input:checked + .o-toggle-slider::after { left:22px; }
</style>
