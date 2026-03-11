<template>
  <div class="shipment-order-history">
    <div class="page-header">
      <h1 class="page-title">出荷実績一覧</h1>
    </div>

    <OrderSearchFormWrapper
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
      :height="560"
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
      title="出荷実績を確定"
      mode="view"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import { useToast } from '@/composables/useToast'
import Table from '@/components/table/OrderTable.vue'
import OrderSearchFormWrapper from '@/components/search/OrderSearchFormWrapper.vue'
import OrderViewDialog from '@/components/shipment-orders/OrderViewDialog.vue'
import type { HeaderGroupingConfig } from '@/components/table/tableHeaderGroup'
import type { Operator } from '@/types/table'
import { getOrderFieldDefinitions } from '@/types/order'
import { buildOrderHeaderGroupingConfig } from '@/utils/orderHeaderGrouping'
import { fetchShipmentOrder, fetchShipmentOrdersPage } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
const { showError, showSuccess, showWarning } = useToast()

type SortOrder = 'asc' | 'desc' | null

type OrderRow = Record<string, any>

const displayRows = ref<OrderRow[]>([]) // 显示的数据（用于Table组件）

const pageSize = ref(10)
const currentPage = ref(1)
const totalItems = ref(0)
const sortBy = ref<string | null>('orderNumber') // 默认按出荷管理No排序
const sortOrder = ref<SortOrder>('asc') // 默认升序

const searchInitialValues = computed(() => {
  // 默认过滤：今日的出荷予定日
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  return {
    shipPlanDate: { operator: 'is', value: today },
  }
})

const carriers = ref<Carrier[]>([])
const carrierOptions = computed(() => {
  return (carriers.value || [])
    .filter((c) => c && c.enabled !== false)
    .map((c) => ({ label: c.name, value: c._id }))
})

// Products for OrderTable
const products = ref<Product[]>([])

const allFieldDefinitions = computed(() =>
  getOrderFieldDefinitions({ carrierOptions: carrierOptions.value }).map((col) =>
    col.key === 'trackingId' ? { ...col, tableVisible: true } : col,
  ),
)

const baseColumns = computed(() => {
  const systemFieldKeys = ['tenantId']
  const cols = allFieldDefinitions.value.filter((col) => col.tableVisible !== false && !systemFieldKeys.includes(col.key))
  
  return cols
})

const searchColumns = computed(() => {
  return allFieldDefinitions.value.filter((col) => col.searchType !== undefined)
})

const currentSearchPayload = ref<Record<string, { operator: Operator; value: any }> | null>(null)
const globalSearchText = ref<string>('')

const viewDialogVisible = ref(false)
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



const handlePageChange = (payload: { page: number; pageSize: number; mode: string }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadOrders()
}

const handleSortChange = (payload: { sortBy: string | null; sortOrder: SortOrder; mode: string }) => {
  sortBy.value = payload.sortBy
  sortOrder.value = payload.sortOrder
  currentPage.value = 1 // 排序时重置到第一页
  loadOrders()
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  const nextPayload: Record<string, { operator: Operator; value: any }> = { ...(payload || {}) }
  const keyword = (nextPayload as any)?.__global?.value
  globalSearchText.value = keyword ? String(keyword) : ''
  delete (nextPayload as any).__global
  currentSearchPayload.value = nextPayload
  currentPage.value = 1 // 搜索时重置到第一页
  loadOrders()
}

const handleSave = (_payload: Record<string, { operator: Operator; value: any }>) => {
  showSuccess('検索条件を保存しました（ダミー）')
}

const tableColumns = computed(() => {
  const actionColumn = {
    key: 'actions',
    dataKey: 'actions',
    title: '操作',
    width: 100,
    fixed: 'right' as const,
    align: 'center' as const,
    cellRenderer: ({ rowData }: { rowData: any }) =>
      h(OButton, { variant: 'primary', size: 'sm', onClick: () => handleView(rowData) }, () => '詳細'),
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

const headerClass = () => ''

const tableProps = computed(() => ({}))

const loadCarriers = async () => {
  try {
    carriers.value = await fetchCarriers({ enabled: true })
  } catch (e) {
    console.error(e)
    showWarning('配送業者マスタの取得に失敗しました')
  }
}

const loadOrders = async () => {
  try {
    // 构建查询条件：添加隐藏过滤，只显示已打印且出荷完了的订单
    const q: Record<string, { operator: Operator; value: any }> = {
      ...(currentSearchPayload.value || {}),
      // 隐藏过滤：只显示已打印的订单
      'status.printed.isPrinted': { operator: 'is', value: true },
      // 隐藏过滤：只显示出荷完了的订单
      'status.shipped.isShipped': { operator: 'is', value: true },
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
    showError(e?.message || '出荷実績の取得に失敗しました')
  }
}

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
.shipment-order-history {
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

::deep(.error-cell) {
  background-color: #ffebee !important;
}
</style>

