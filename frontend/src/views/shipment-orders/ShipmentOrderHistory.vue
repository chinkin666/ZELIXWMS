<template>
  <div class="shipment-order-history">
    <PageHeader :title="t('wms.shipmentOrder.historyTitle', '出荷実績一覧')" :show-search="false" />

      class="search-section"
      :columns="searchColumns"
      :initial-values="searchInitialValues"
      storage-key="shipment_order_history"
      :show-global-search="false"
      @search="handleSearch"
      @save="handleSave"
    />

    <Table
      :columns="tableColumns"
      :data="displayRows"
      :global-search-text="globalSearchText"
      row-key="_id"
      highlight-columns-on-hover
      pagination-enabled
      pagination-mode="server"
      :page-size="pageSize"
      :page-sizes="[10, 20, 50, 100]"
      :total="totalItems"
      :current-page="currentPage"
      :header-grouping-enabled="true"
      :header-grouping-config="headerGroupingConfig"
      :header-height="[50, 50]"
      :header-class="headerClass"
      :table-props="tableProps"
      sort-enabled
      sort-mode="server"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :batch-delete-enabled="false"
      :products="products"
      :show-status-tags="true"
      page-key="shipment-orders-history"
      @page-change="handlePageChange"
      @sort-change="handleSortChange"
    />

    <OrderViewDialog
      v-model="viewDialogVisible"
      :order="selectedOrder"
      :carriers="carriers"
      :title="t('wms.shipmentOrder.confirmResults', '出荷実績を確定')"
      mode="view"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import Table from '@/components/table/OrderTable.vue'
import OrderViewDialog from '@/components/shipment-orders/OrderViewDialog.vue'
import type { Operator } from '@/types/table'
import { fetchShipmentOrder, fetchShipmentOrdersPage } from '@/api/shipmentOrders'
import { useShipmentOrderBase } from './composables/useShipmentOrderBase'

const { showError } = useToast()
const { t } = useI18n()

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
} = useShipmentOrderBase({
  enableCellValidation: false,
  fieldOverrides: (columns) =>
    columns.map((col) =>
      col.key === 'trackingId' ? { ...col, tableVisible: true } : col,
    ),
})

type SortOrder = 'asc' | 'desc' | null
type OrderRow = Record<string, any>

const displayRows = ref<OrderRow[]>([])
const pageSize = ref(10)
const currentPage = ref(1)
const totalItems = ref(0)
const sortBy = ref<string | null>('orderNumber')
const sortOrder = ref<SortOrder>('asc')

const searchInitialValues = computed(() => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  return { shipPlanDate: { operator: 'is', value: today } }
})

const viewDialogVisible = ref(false)
const selectedOrder = ref<any>(null)

const handleView = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return
    selectedOrder.value = await fetchShipmentOrder(String(id))
    viewDialogVisible.value = true
  } catch (e: any) {
    showError(e?.message || t('wms.shipmentOrder.fetchDetailError', '詳細の取得に失敗しました'))
  }
}

const handlePageChange = (payload: { page: number; pageSize: number; mode: string }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadOrders()
}

const handleSortChange = (payload: { sortBy: string | null; sortOrder: SortOrder; mode: string }) => {
  sortBy.value = payload.sortBy
  sortOrder.value = payload.sortOrder
  currentPage.value = 1
  loadOrders()
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  updateSearchState(payload)
  currentPage.value = 1
  loadOrders()
}

const tableColumns = computed(() => {
  const actionColumn = {
    key: 'actions',
    dataKey: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 100,
    fixed: 'right' as const,
    align: 'center' as const,
    cellRenderer: ({ rowData }: { rowData: any }) =>
      h(Button, { variant: 'default', size: 'sm', onClick: () => handleView(rowData) }, () => t('wms.shipmentOrder.detail', '詳細')),
  }
  return [...baseColumns.value, actionColumn]
})

const loadOrders = async () => {
  try {
    const q: Record<string, { operator: Operator; value: any }> = {
      ...(currentSearchPayload.value || {}),
      'statusPrinted': { operator: 'is', value: true },
      'statusShipped': { operator: 'is', value: true },
    }
    const result = await fetchShipmentOrdersPage({
      page: currentPage.value,
      limit: pageSize.value,
      q,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value || undefined,
    })
    displayRows.value = result.items
    totalItems.value = result.total
  } catch (e: any) {
    showError(e?.message || t('wms.shipmentOrder.fetchHistoryError', '出荷実績の取得に失敗しました'))
  }
}

onMounted(async () => {
  await loadCarriers()
  await loadOrders()
  await loadProducts()
})
</script>

<style scoped>
.shipment-order-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.search-section {
  margin-bottom: 20px;
}

:deep(.error-cell) {
  background-color: #ffebee !important;
}
</style>
