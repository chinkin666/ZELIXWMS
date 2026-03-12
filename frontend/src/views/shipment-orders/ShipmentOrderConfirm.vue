<template>
  <div class="shipment-order-list">
    <ControlPanel title="出荷指示確定" :show-search="false" />

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
      :order-map="b2ValidateOrderMap"
      confirm-button-text="出荷指示を確定"
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
import type { Operator } from '@/types/table'
import type { OrderDocument } from '@/types/order'
import {
  deleteShipmentOrder,
  deleteShipmentOrdersBulk,
  fetchShipmentOrder,
  fetchShipmentOrders,
  updateShipmentOrderStatusBulk,
} from '@/api/shipmentOrders'
import { filterDataBySearch } from '@/utils/search'
import { yamatoB2Validate } from '@/api/carrierAutomation'
import type { YamatoB2ValidateResult } from '@/types/carrierAutomation'
import YamatoB2ValidateResultDialog from '@/components/carrier-automation/YamatoB2ValidateResultDialog.vue'
import YamatoB2ApiErrorDialog from '@/components/carrier-automation/YamatoB2ApiErrorDialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { useToast } from '@/composables/useToast'
import { useShipmentOrderBase } from './composables/useShipmentOrderBase'

const { showSuccess, showError, showWarning } = useToast()

const {
  carriers,
  products,
  loadCarriers,
  loadProducts,
  baseColumns,
  searchColumns,
  headerGroupingConfig,
  headerClass,
  globalSearchText,
  currentSearchPayload,
  updateSearchState,
  handleSave,
  tableProps,
} = useShipmentOrderBase({ enableCellValidation: true })

type OrderRow = Record<string, any>

const tableRef = ref<InstanceType<typeof Table> | null>(null)
const allRows = ref<OrderRow[]>([])
const rows = ref<OrderRow[]>([])
const tableSelectedKeys = ref<Array<string | number>>([])

const batchDeleteEnabled = ref(true)

const customExportDialogVisible = ref(false)
const selectedOrdersForCustomExport = ref<any[]>([])

const formExportDialogVisible = ref(false)
const selectedOrdersForFormExport = ref<OrderDocument[]>([])

const pageSize = ref(10)
const isConfirming = ref(false)

const b2Validating = ref(false)
const b2ValidateDialogVisible = ref(false)
const b2ValidateResult = ref<YamatoB2ValidateResult | null>(null)
const b2PendingConfirmIds = ref<string[]>([])
const b2PendingB2OrderIds = ref<string[]>([])
const b2ValidateOrderMap = ref<Map<number, string>>(new Map())
const b2ApiErrorDialogVisible = ref(false)
const b2ApiErrorMessage = ref('')

const searchInitialValues = computed(() => ({}))

const hasInternalRecord = (row: any): boolean => {
  const records = row?.internalRecord
  return Array.isArray(records) && records.length > 0
}

const getRowClassName = (row: any): string =>
  hasInternalRecord(row) ? 'has-internal-record-row' : ''

const calculateProductsMetaForRow = (row: any) => {
  const prods = Array.isArray(row?.products) ? row.products : []
  const skus = [...new Set(prods.map((p: any) => p?.sku).filter(Boolean))]
  const names = [...new Set(prods.map((p: any) => p?.name).filter((n: any): n is string => Boolean(n && typeof n === 'string' && n.trim())))]
  const totalQuantity = prods.reduce((sum: number, p: any) => sum + (p?.quantity || 0), 0)
  return { skus, names, skuCount: skus.length, totalQuantity }
}

const enrichRowWithProductsMeta = (row: any) => {
  const meta: any = row?._productsMeta
  const needsRecalc = !meta || !Array.isArray(meta.skus) || !Array.isArray(meta.names)
  if (!needsRecalc) return row
  return { ...row, _productsMeta: calculateProductsMetaForRow(row) }
}

const searchedRows = computed(() => {
  let filtered = allRows.value.map(enrichRowWithProductsMeta)
  filtered = filtered.filter((row: any) => row.status?.confirm?.isConfirmed !== true)
  if (currentSearchPayload.value && Object.keys(currentSearchPayload.value).length > 0) {
    filtered = filterDataBySearch(filtered, searchColumns.value, currentSearchPayload.value)
  }
  return filtered
})

const displayRows = computed(() => [...searchedRows.value])

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
    showError(e?.message || '詳細の取得に失敗しました')
  }
}

const handleEdit = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return
    selectedOrder.value = await fetchShipmentOrder(String(id))
    editDialogVisible.value = true
  } catch (e: any) {
    showError(e?.message || '詳細の取得に失敗しました')
  }
}

const handleDelete = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return
    if (!confirm(`注文番号: ${row.orderNumber || id}\nこの出荷予定を削除しますか？`)) return
    await deleteShipmentOrder(String(id))
    showSuccess('出荷予定を削除しました')
    await loadOrders()
  } catch (e: any) {
    if (e === 'cancel') return
    showError(e?.message || '削除に失敗しました')
  }
}

const handleOrderUpdated = async () => {
  await loadOrders()
}

const handleTableSelectionChange = (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  tableSelectedKeys.value = payload.selectedKeys
}

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

const handleBatchDelete = async (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  const { selectedKeys, selectedRows } = payload
  if (selectedKeys.length === 0) {
    showWarning('削除する行を選択してください')
    return
  }

  const orderNumbers = selectedRows
    .map((row: any) => row.orderNumber || row._id)
    .filter(Boolean)
    .slice(0, 5)
  const orderNumbersText = orderNumbers.join(', ')
  const moreText = selectedRows.length > 5 ? `他${selectedRows.length - 5}件` : ''

  if (!confirm(`選択した${selectedKeys.length}件の出荷予定を削除しますか？\n${orderNumbersText}${moreText ? `\n${moreText}` : ''}`)) return

  try {
    const ids = selectedKeys.map((key) => String(key))
    const result = await deleteShipmentOrdersBulk(ids)
    const successCount = result?.deletedCount ?? 0
    if (successCount > 0) showSuccess(`${successCount}件の出荷予定を削除しました`)
    if (successCount < ids.length) showWarning(`${ids.length - successCount}件の削除に失敗しました`)
    tableSelectedKeys.value = []
    await loadOrders()
  } catch (e: any) {
    if (e === 'cancel') return
    showError(e?.message || '一括削除に失敗しました')
  }
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  updateSearchState(payload)
}

const isYamatoB2Carrier = (carrierId: string): boolean => {
  const carrier = carriers.value.find((c) => c._id === carrierId)
  return carrier?.automationType === 'yamato-b2'
}

const showB2ApiError = (errorMessage: string) => {
  b2ApiErrorMessage.value = errorMessage
  b2ApiErrorDialogVisible.value = true
}

const handleB2ValidateDialogCancel = () => {
  b2ValidateDialogVisible.value = false
  b2ValidateResult.value = null
  b2PendingConfirmIds.value = []
  b2PendingB2OrderIds.value = []
}

const handleB2ValidateDialogConfirm = async () => {
  b2ValidateDialogVisible.value = false

  const invalidB2Ids = new Set<string>()
  if (b2ValidateResult.value) {
    for (const item of b2ValidateResult.value.results) {
      const orderId = b2PendingB2OrderIds.value[item.index]
      if (orderId && !item.valid) invalidB2Ids.add(orderId)
    }
  }

  const confirmIds = b2PendingConfirmIds.value.filter((id) => !invalidB2Ids.has(id))
  await doConfirmOrders(confirmIds)

  b2PendingConfirmIds.value = []
  b2PendingB2OrderIds.value = []
  b2ValidateResult.value = null
}

const doConfirmOrders = async (ids: string[]) => {
  if (ids.length === 0) return
  isConfirming.value = true
  try {
    await updateShipmentOrderStatusBulk(ids, 'mark-print-ready')
    showSuccess(`${ids.length}件の出荷指示確定しました`)
    tableSelectedKeys.value = []
    await loadOrders()
  } catch (e: any) {
    showError(e?.message || '出荷データの確認に失敗しました')
  } finally {
    isConfirming.value = false
  }
}

const handleConfirmPrintReady = async () => {
  if (tableSelectedKeys.value.length === 0) {
    showWarning('確認する行を選択してください')
    return
  }
  try {
    const selectedRows = displayRows.value.filter((row: any) =>
      tableSelectedKeys.value.includes(row._id),
    )
    const orderNumbers = selectedRows
      .map((row: any) => row.orderNumber || row._id)
      .filter(Boolean)
      .slice(0, 5)
    const orderNumbersText = orderNumbers.join(', ')
    const moreText = selectedRows.length > 5 ? `他${selectedRows.length - 5}件` : ''

    if (!confirm(`選択した${tableSelectedKeys.value.length}件の出荷指示確定しますか？\n${orderNumbersText}${moreText ? `\n${moreText}` : ''}`)) return

    const ids = tableSelectedKeys.value.map((key) => String(key)).filter(Boolean)
    if (ids.length === 0) {
      showWarning('有効なIDがありません')
      return
    }

    const b2Rows = selectedRows.filter((row: any) => isYamatoB2Carrier(row.carrierId))
    const b2OrderIds = b2Rows.map((row: any) => String(row._id))

    if (b2OrderIds.length > 0) {
      b2Validating.value = true
      const orderMap = new Map<number, string>()
      b2Rows.forEach((row: any, i: number) => {
        orderMap.set(i, row.orderNumber || row.customerManagementNumber || '-')
      })
      b2ValidateOrderMap.value = orderMap
      try {
        const validateResult = await yamatoB2Validate(b2OrderIds)
        b2ValidateResult.value = validateResult
        b2PendingConfirmIds.value = ids
        b2PendingB2OrderIds.value = b2OrderIds
        b2Validating.value = false
        b2ValidateDialogVisible.value = true
      } catch (e: any) {
        b2Validating.value = false
        showB2ApiError(e?.message || 'B2 Cloudへの検証に失敗しました')
      }
    } else {
      await doConfirmOrders(ids)
    }
  } catch (e: any) {
    if (e === 'cancel') return
    showError(e?.message || '出荷データの確認に失敗しました')
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
          h('button', { class: 'o-btn o-btn-primary o-btn-sm', onClick: () => handleView(rowData) }, '詳細'),
          h('button', { class: 'o-btn o-btn-secondary o-btn-sm', style: 'border-color:#67c23a;color:#67c23a;', onClick: () => handleEdit(rowData) }, '編集'),
          h('button', { class: 'o-btn o-btn-danger o-btn-sm', onClick: () => handleDelete(rowData) }, '削除'),
        ],
      ),
  }
  return [...baseColumns.value, actionColumn]
})

const loadOrders = async () => {
  try {
    const data = await fetchShipmentOrders()
    allRows.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    showError(e?.message || '出荷予定の取得に失敗しました')
  }
}

watch(displayRows, (newRows) => {
  rows.value = newRows
}, { immediate: true })

onMounted(async () => {
  await loadCarriers()
  await loadOrders()
  await loadProducts()
})
</script>

<style scoped>
.shipment-order-list {
  display: flex;
  flex-direction: column;
}

.search-section {
  margin-bottom: 20px;
}

::v-deep(.error-cell) {
  background-color: #ffebee !important;
}

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
