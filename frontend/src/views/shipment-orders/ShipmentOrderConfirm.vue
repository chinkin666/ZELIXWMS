<template>
  <div class="shipment-order-list">
    <div class="page-header">
      <h1 class="page-title">出荷指示確定</h1>
    </div>

    <OrderSearchFormWrapper
      class="search-section"
      :columns="searchColumns"
      :initial-values="searchInitialValues"
      storage-key="shipment_order_list"
      @search="handleSearch"
      @save="handleSave"
    />

    <Table
      ref="tableRef"
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
      sort-mode="client"
      sort-by="orderNumber"
      sort-order="asc"
      :batch-delete-enabled="batchDeleteEnabled"
      :products="products"
      page-key="shipment-orders-confirm"
      :row-class-name="getRowClassName"
      v-model:selected-keys="tableSelectedKeys"
      @selection-change="handleTableSelectionChange"
      @batch-delete="handleBatchDelete"
    />

    <!-- Bottom bar -->
    <OrderBottomBar
      :total-count="displayRows.length"
      :selected-count="tableSelectedKeys.length"
      total-label="表示件数"
    >
      <template #left>
        <OButton
          v-if="batchDeleteEnabled"
          variant="danger"
          size="sm"
          :disabled="tableSelectedKeys.length === 0"
          @click="tableRef?.triggerBatchDelete()"
        >
          一括削除 ({{ tableSelectedKeys.length }})
        </OButton>
      </template>
      <template #right>
        <OButton
          variant="secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleCustomExportClick"
        >
          出荷明細リスト出力(csv)
        </OButton>
        <OButton
          variant="secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleFormExportClick"
        >
          出荷明細リスト出力(pdf)
        </OButton>
        <OButton
          variant="primary"
          :disabled="tableSelectedKeys.length === 0 || isConfirming || b2Validating"
          @click="handleConfirmPrintReady"
        >
          {{ b2Validating ? 'B2 Cloud 検証中...' : '出荷指示確定' }}
        </OButton>
      </template>
    </OrderBottomBar>

    <OrderViewDialog
      v-model="viewDialogVisible"
      :order="selectedOrder"
      :carriers="carriers"
      title="出荷予定明細"
      mode="view"
      @updated="handleOrderUpdated"
    />

    <OrderViewDialog
      v-model="editDialogVisible"
      :order="selectedOrder"
      :carriers="carriers"
      title="出荷予定を編集"
      mode="edit"
      @updated="handleOrderUpdated"
    />

    <!-- B2 Cloud validate dialog -->
    <YamatoB2ValidateResultDialog
      v-model="b2ValidateDialogVisible"
      :result="b2ValidateResult"
      confirm-button-text="確認する"
      @cancel="handleB2ValidateDialogCancel"
      @confirm="handleB2ValidateDialogConfirm"
    />

    <!-- B2 Cloud API error dialog -->
    <YamatoB2ApiErrorDialog
      v-model="b2ApiErrorDialogVisible"
      :error-message="b2ApiErrorMessage"
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
import OrderViewDialog from '@/components/shipment-orders/OrderViewDialog.vue'
import CustomExportDialog from '@/components/export/CustomExportDialog.vue'
import FormExportDialog from '@/components/form-export/FormExportDialog.vue'
import type { HeaderGroupingConfig } from '@/components/table/tableHeaderGroup'
import type { Operator } from '@/types/table'
import { getOrderFieldDefinitions } from '@/types/order'
import { buildOrderHeaderGroupingConfig } from '@/utils/orderHeaderGrouping'
import { deleteShipmentOrder, deleteShipmentOrdersBulk, fetchShipmentOrder, fetchShipmentOrders, updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import { filterDataBySearch } from '@/utils/search'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import type { OrderDocument } from '@/types/order'
import { yamatoB2Validate } from '@/api/carrierAutomation'
import type { YamatoB2ValidateResult } from '@/types/carrierAutomation'
import YamatoB2ValidateResultDialog from '@/components/carrier-automation/YamatoB2ValidateResultDialog.vue'
import YamatoB2ApiErrorDialog from '@/components/carrier-automation/YamatoB2ApiErrorDialog.vue'
import { validateCell } from '@/utils/orderValidation'
import OButton from '@/components/odoo/OButton.vue'
type OrderRow = Record<string, any>

const tableRef = ref<InstanceType<typeof Table> | null>(null)
const allRows = ref<OrderRow[]>([]) // 所有数据
const rows = ref<OrderRow[]>([]) // 显示的数据（用于Table组件）
const tableSelectedKeys = ref<Array<string | number>>([])

// 批量删除功能开关（可通过配置或环境变量控制）
const batchDeleteEnabled = ref(true)

// Custom export dialog state
const customExportDialogVisible = ref(false)
const selectedOrdersForCustomExport = ref<any[]>([])

// Form export dialog state (PDF)
const formExportDialogVisible = ref(false)
const selectedOrdersForFormExport = ref<OrderDocument[]>([])

const pageSize = ref(10)
const isConfirming = ref(false)

// B2 Cloud validation state
const b2Validating = ref(false)
const b2ValidateDialogVisible = ref(false)
const b2ValidateResult = ref<YamatoB2ValidateResult | null>(null)
const b2PendingConfirmIds = ref<string[]>([])
const b2ApiErrorDialogVisible = ref(false)
const b2ApiErrorMessage = ref('')

const searchInitialValues = computed(() => ({}))

const carriers = ref<Carrier[]>([])
const carrierOptions = computed(() => {
  return (carriers.value || [])
    .filter((c) => c && c.enabled !== false)
    .map((c) => ({ label: c.name, value: c._id }))
})
// Products for OrderTable
const products = ref<Product[]>([])

const allFieldDefinitions = computed(() =>
  getOrderFieldDefinitions({ carrierOptions: carrierOptions.value }),
)

const baseColumns = computed(() => {
  const systemFieldKeys = ['tenantId']
  return allFieldDefinitions.value.filter((col) => col.tableVisible !== false && !systemFieldKeys.includes(col.key))
})

const searchColumns = computed(() => {
  return allFieldDefinitions.value.filter((col) => col.searchType !== undefined)
})

// validateCell is now imported from @/utils/orderValidation

// 行是否有内部记录（用于黄色背景高亮）
const hasInternalRecord = (row: any): boolean => {
  const records = row?.internalRecord
  return Array.isArray(records) && records.length > 0
}

// 获取行类名（用于行级别样式）
const getRowClassName = (row: any): string => {
  if (hasInternalRecord(row)) {
    return 'has-internal-record-row'
  }
  return ''
}

const currentSearchPayload = ref<Record<string, { operator: Operator; value: any }> | null>(null)
const globalSearchText = ref<string>('')

// 计算前端数据的 _productsMeta（用于搜索）
const calculateProductsMetaForRow = (row: any) => {
  const products = Array.isArray(row?.products) ? row.products : []
  const skus = [...new Set(products.map((p: any) => p?.sku).filter(Boolean))]
  const names = [...new Set(products.map((p: any) => p?.name).filter((name: any): name is string => Boolean(name && typeof name === 'string' && name.trim())))]
  const totalQuantity = products.reduce((sum: number, p: any) => sum + (p?.quantity || 0), 0)

  return {
    skus,
    names,
    skuCount: skus.length,
    totalQuantity,
  }
}

const enrichRowWithProductsMeta = (row: any) => {
  const meta: any = row?._productsMeta
  const needsRecalc = !meta || !Array.isArray(meta.skus) || !Array.isArray(meta.names)
  if (!needsRecalc) return row
  return { ...row, _productsMeta: calculateProductsMetaForRow(row) }
}

// 搜索后的行数据
const searchedRows = computed(() => {
  // backfill _productsMeta for client-side search (some old docs may not have names)
  let filtered = allRows.value.map(enrichRowWithProductsMeta)

  // 默认只显示 confirm.isConfirmed 为 false 或未设置的条目
  filtered = filtered.filter((row: any) => {
    const isConfirmed = row.status?.confirm?.isConfirmed
    return isConfirmed !== true
  })

  if (currentSearchPayload.value && Object.keys(currentSearchPayload.value).length > 0) {
    // use searchColumns (includes productSku/productName fields) instead of baseColumns
    filtered = filterDataBySearch(filtered, searchColumns.value, currentSearchPayload.value)
  }
  return filtered
})

// 最终显示的行数据（搜索过滤后的数据）
const displayRows = computed(() => {
  return [...searchedRows.value]
})

const viewDialogVisible = ref(false)
const editDialogVisible = ref(false)
const selectedOrder = ref<any>(null)

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

const handleEdit = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return
    selectedOrder.value = await fetchShipmentOrder(String(id))
    editDialogVisible.value = true
  } catch (e: any) {
    alert(e?.message || '詳細の取得に失敗しました')
  }
}

const handleDelete = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return

    if (!confirm(`注文番号: ${row.orderNumber || id}\nこの出荷予定を削除しますか？`)) return

    await deleteShipmentOrder(String(id))
    alert('出荷予定を削除しました')
    // 重新加载列表
    await loadOrders()
  } catch (e: any) {
    if (e === 'cancel') return
    alert(e?.message || '削除に失敗しました')
  }
}

const handleOrderUpdated = async () => {
  // 重新加载列表
  await loadOrders()
}

const handleTableSelectionChange = (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  tableSelectedKeys.value = payload.selectedKeys
}

const handleCustomExportClick = () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  selectedOrdersForCustomExport.value = displayRows.value.filter((r: any) =>
    keySet.has(String(r?._id)),
  )
  customExportDialogVisible.value = true
}

const handleFormExportClick = () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  selectedOrdersForFormExport.value = displayRows.value.filter((r: any) =>
    keySet.has(String(r?._id)),
  ) as OrderDocument[]
  formExportDialogVisible.value = true
}

const handleBatchDelete = async (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  const { selectedKeys, selectedRows } = payload

  if (selectedKeys.length === 0) {
    alert('削除する行を選択してください')
    return
  }

  try {
    const orderNumbers = selectedRows
      .map((row: any) => row.orderNumber || row._id)
      .filter(Boolean)
      .slice(0, 5)
    const orderNumbersText = orderNumbers.length > 0 ? orderNumbers.join(', ') : ''
    const moreText = selectedRows.length > 5 ? `他${selectedRows.length - 5}件` : ''

    if (!confirm(`選択した${selectedKeys.length}件の出荷予定を削除しますか？\n${orderNumbersText}${moreText ? `\n${moreText}` : ''}`)) return

    const ids = selectedKeys.map((key) => String(key))

    // 使用批量 API（1个请求代替N个请求）
    const result = await deleteShipmentOrdersBulk(ids)
    const successCount = result?.deletedCount ?? 0

    if (successCount > 0) {
      alert(`${successCount}件の出荷予定を削除しました`)
    }
    if (successCount < ids.length) {
      const failCount = ids.length - successCount
      alert(`${failCount}件の削除に失敗しました`)
    }

    // 清空选择并重新加载列表
    tableSelectedKeys.value = []
    await loadOrders()
  } catch (e: any) {
    if (e === 'cancel') return
    alert(e?.message || '一括削除に失敗しました')
  }
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  const nextPayload: Record<string, { operator: Operator; value: any }> = { ...(payload || {}) }
  const keyword = (nextPayload as any)?.__global?.value
  globalSearchText.value = keyword ? String(keyword) : ''
  delete (nextPayload as any).__global
  currentSearchPayload.value = nextPayload
  // 搜索过滤由 displayRows computed 自动处理，无需重新加载
}

const handleSave = (_payload: Record<string, { operator: Operator; value: any }>) => {
  alert('検索条件を保存しました（ダミー）')
}

/**
 * Check if a carrier is Yamato B2
 */
const isYamatoB2Carrier = (carrierId: string): boolean => {
  const carrier = carriers.value.find((c) => c._id === carrierId)
  return carrier?.automationType === 'yamato-b2'
}

/**
 * Show B2 Cloud API error dialog
 */
const showB2ApiError = (errorMessage: string) => {
  b2ApiErrorMessage.value = errorMessage
  b2ApiErrorDialogVisible.value = true
}

const handleB2ValidateDialogCancel = () => {
  b2ValidateDialogVisible.value = false
  b2ValidateResult.value = null
  b2PendingConfirmIds.value = []
}

const handleB2ValidateDialogConfirm = async () => {
  b2ValidateDialogVisible.value = false

  // Proceed with confirmation
  await doConfirmOrders(b2PendingConfirmIds.value)
  b2PendingConfirmIds.value = []
}

/**
 * Actually confirm the orders (called after validation passes or for non-B2 orders)
 */
const doConfirmOrders = async (ids: string[]) => {
  if (ids.length === 0) return

  isConfirming.value = true
  try {
    await updateShipmentOrderStatusBulk(ids, 'mark-print-ready')
    alert(`${ids.length}件の出荷指示確定しました`)

    tableSelectedKeys.value = []
    await loadOrders()
  } catch (e: any) {
    alert(e?.message || '出荷データの確認に失敗しました')
  } finally {
    isConfirming.value = false
  }
}

const handleConfirmPrintReady = async () => {
  if (tableSelectedKeys.value.length === 0) {
    alert('確認する行を選択してください')
    return
  }

  try {
    const selectedRows = displayRows.value.filter((row: any) =>
      tableSelectedKeys.value.includes(row._id)
    )

    const orderNumbers = selectedRows
      .map((row: any) => row.orderNumber || row._id)
      .filter(Boolean)
      .slice(0, 5)
    const orderNumbersText = orderNumbers.length > 0 ? orderNumbers.join(', ') : ''
    const moreText = selectedRows.length > 5 ? `他${selectedRows.length - 5}件` : ''

    if (!confirm(`選択した${tableSelectedKeys.value.length}件の出荷指示確定しますか？\n${orderNumbersText}${moreText ? `\n${moreText}` : ''}`)) return

    const ids = tableSelectedKeys.value.map((key) => String(key)).filter(Boolean)

    if (ids.length === 0) {
      alert('有効なIDがありません')
      return
    }

    // Check if any selected orders are Yamato B2
    const b2OrderIds = selectedRows
      .filter((row: any) => isYamatoB2Carrier(row.carrierId))
      .map((row: any) => String(row._id))

    if (b2OrderIds.length > 0) {
      // Validate B2 orders first
      b2Validating.value = true
      try {
        const validateResult = await yamatoB2Validate(b2OrderIds)
        b2ValidateResult.value = validateResult
        b2PendingConfirmIds.value = ids
        b2Validating.value = false

        // Show validation dialog
        b2ValidateDialogVisible.value = true
      } catch (e: any) {
        b2Validating.value = false
        const errorMsg = e?.message || 'B2 Cloudへの検証に失敗しました'
        showB2ApiError(errorMsg)
      }
    } else {
      // No B2 orders, proceed directly
      await doConfirmOrders(ids)
    }
  } catch (e: any) {
    if (e === 'cancel') return
    alert(e?.message || '出荷データの確認に失敗しました')
  }
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
              class: 'o-btn o-btn-secondary o-btn-sm',
              style: 'border-color:#67c23a;color:#67c23a;',
              onClick: () => handleEdit(rowData),
            },
            '編集',
          ),
          h(
            'button',
            {
              class: 'o-btn o-btn-danger o-btn-sm',
              onClick: () => handleDelete(rowData),
            },
            '削除',
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

const tableProps = computed(() => {
  return {
    cellProps: ({ rowData, column }: { rowData: any; column: any }) => {
      const props: any = {}
      const columnConfig = baseColumns.value.find((col) => col.key === column.key || col.dataKey === column.key)
      if (columnConfig) {
        const hasError = !validateCell(rowData, columnConfig)
        if (hasError) {
          props.class = 'error-cell'
          props.style = { backgroundColor: '#ffebee' }
        }
      }
      return props
    },
  }
})

const loadCarriers = async () => {
  try {
    carriers.value = await fetchCarriers({ enabled: true })
  } catch (e) {
    console.error(e)
    alert('配送業者マスタの取得に失敗しました')
  }
}

const loadOrders = async () => {
  try {
    // 获取所有数据，不传递 page 参数，后端会返回所有数据
    const data = await fetchShipmentOrders()
    allRows.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    alert(e?.message || '出荷予定の取得に失敗しました')
  }
}

// 监听 displayRows 变化，同步到 rows（Table 组件使用）
watch(displayRows, (newRows) => {
  rows.value = newRows
}, { immediate: true })

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

<style scoped>
.shipment-order-list {
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
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bottom-bar__meta {
  color: #303133;
  font-size: 13px;
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

/* 有内部记录的行，黄色背景 */
:deep(.has-internal-record-row) {
  background-color: #fff9c4 !important;
}
:deep(.has-internal-record-row td) {
  background-color: #fff9c4 !important;
}
:deep(.has-internal-record-row:hover td) {
  background-color: #fff59d !important;
}
</style>
