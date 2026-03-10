<template>
  <div class="shipment-results">
    <div class="page-header">
      <h1 class="page-title">出荷実績一覧</h1>
    </div>

    <OrderSearchFormWrapper
      class="search-section"
      :columns="searchColumns"
      :initial-values="searchInitialValues"
      storage-key="shipment_results"
      @search="handleSearch"
    />

    <div class="between-controls">
      <div class="between-controls__item">
        <span class="between-controls__label">連携済みを表示：</span>
        <el-switch v-model="showExportedRows" />
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
      pagination-mode="server"
      :page-size="pageSize"
      :page-sizes="[10,25,50,100,500]"
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
      :products="products"
      :show-status-tags="true"
      page-key="shipment-results"
      v-model:selected-keys="tableSelectedKeys"
      @selection-change="handleTableSelectionChange"
      @sort-change="handleSortChange"
      @page-change="handlePageChange"
    />

    <!-- Bottom bar -->
    <OrderBottomBar
      :total-count="totalItems"
      :selected-count="isSelectAll ? totalItems : tableSelectedKeys.length"
      total-label="総件数"
    >
      <template #right>
        <el-button
          :disabled="tableSelectedKeys.length === 0"
          @click="handleCustomExportClick"
        >
          出荷明細リスト出力(csv)
        </el-button>
        <el-button
          :disabled="tableSelectedKeys.length === 0"
          @click="handleFormExportClick"
        >
          出荷明細リスト出力(pdf)
        </el-button>
      </template>
    </OrderBottomBar>

    <OrderViewDialog
      v-model="viewDialogVisible"
      :order="selectedOrder"
      :carriers="carriers"
      title="出荷詳細"
      mode="view"
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
import { ElButton, ElMessage } from 'element-plus'
import type { HeaderClassNameGetter } from 'element-plus'
import Table from '@/components/table/OrderTable.vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import OrderSearchFormWrapper from '@/components/search/OrderSearchFormWrapper.vue'
import OrderViewDialog from '@/components/shipment-orders/OrderViewDialog.vue'
import CustomExportDialog from '@/components/export/CustomExportDialog.vue'
import FormExportDialog from '@/components/form-export/FormExportDialog.vue'
import type { OrderDocument } from '@/types/order'
import type { HeaderGroupingConfig } from '@/components/table/tableHeaderGroup'
import type { Operator, TableColumn } from '@/types/table'
import { getOrderFieldDefinitions } from '@/types/order'
import { buildOrderHeaderGroupingConfig } from '@/utils/orderHeaderGrouping'
import { fetchShipmentOrder, fetchShipmentOrdersPage, fetchShipmentOrdersByIds } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'

type SortOrder = 'asc' | 'desc' | null
type OrderRow = Record<string, any>

const rows = ref<OrderRow[]>([])
const tableSelectedKeys = ref<Array<string | number>>([])
const isSelectAll = ref(false) // 是否全选所有符合条件的记录
const isLoadingOrders = ref(false)

const pageSize = ref(10)
const currentPage = ref(1)
const totalItems = ref(0)
const sortBy = ref<string | null>('orderNumber')
const sortOrder = ref<SortOrder>('asc')

// Carriers for dialog
const carriers = ref<Carrier[]>([])

// Products for OrderTable
const products = ref<Product[]>([])

// Custom export dialog state
const customExportDialogVisible = ref(false)
const selectedOrdersForCustomExport = ref<any[]>([])

// Form export dialog state (PDF)
const formExportDialogVisible = ref(false)
const selectedOrdersForFormExport = ref<OrderDocument[]>([])

// 默认过滤：今日的出荷予定日
const searchInitialValues = computed((): Record<string, { operator: Operator; value: any }> => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  return {
    shipPlanDate: { operator: 'is' as Operator, value: today },
  }
})

const carrierOptions = computed(() => {
  return (carriers.value || []).map((c) => ({ label: `${c.name} (${c.code})`, value: c._id }))
})

const allFieldDefinitions = computed(() =>
  getOrderFieldDefinitions({ carrierOptions: carrierOptions.value }).map((col) =>
    col.key === 'trackingId' ? { ...col, tableVisible: true } : col,
  ),
)

const baseColumns = computed(() => {
  const systemFieldKeys = ['tenantId']
  // 状態関連のカラムを強制的に表示
  const statusKeys = ['statusPrinted', 'statusCarrierReceipt', 'statusShipped', 'statusEcExported']
  return allFieldDefinitions.value.filter((col) => {
    if (systemFieldKeys.includes(col.key)) return false
    if (statusKeys.includes(col.key)) return true
    return col.tableVisible !== false
  })
})

const searchColumns = computed(() => {
  return allFieldDefinitions.value.filter(
    (col) => col.searchType !== undefined && col.key !== 'statusEcExported',
  )
})

const currentSearchPayload = ref<Record<string, { operator: Operator; value: any }> | null>(null)
const globalSearchText = ref<string>('')

// Toggle: show rows where EC export is done
const showExportedRows = ref(false)

const effectiveSearchPayload = computed(() => {
  const base = currentSearchPayload.value || searchInitialValues.value
  const q: Record<string, { operator: Operator; value: any }> = { ...(base || {}) }

  // 只显示已出荷的订单
  q['status.shipped.isShipped'] = { operator: 'is', value: true }

  // EC連携状态过滤
  if (!showExportedRows.value) {
    q['status.ecExported.isExported'] = { operator: 'is', value: false }
  }

  return q
})

const displayRows = computed(() => [...rows.value])

const viewDialogVisible = ref(false)
const selectedOrder = ref<any>(null)

const handleView = async (row: any) => {
  try {
    const id = row?._id
    if (!id) return
    selectedOrder.value = await fetchShipmentOrder(String(id))
    viewDialogVisible.value = true
  } catch (e: any) {
    ElMessage.error(e?.message || '詳細の取得に失敗しました')
  }
}

const handleTableSelectionChange = (payload: { selectedKeys: Array<string | number>; selectedRows: any[]; isSelectAllTriggered?: boolean }) => {
  tableSelectedKeys.value = payload.selectedKeys

  // 点击全选且选中了当前页所有数据 → 全选模式
  if (payload.isSelectAllTriggered && payload.selectedKeys.length === rows.value.length && rows.value.length > 0) {
    isSelectAll.value = true
  } else if (payload.selectedKeys.length < rows.value.length || payload.selectedKeys.length === 0) {
    // 取消任何选择 → 退出全选模式
    isSelectAll.value = false
  }
}

const handleCustomExportClick = async () => {
  if (tableSelectedKeys.value.length === 0) return
  // Backend pagination: fetch full order data for selected rows
  const selectedIds = tableSelectedKeys.value.map((k) => String(k))
  try {
    const orders = await fetchShipmentOrdersByIds(selectedIds)
    selectedOrdersForCustomExport.value = orders
    customExportDialogVisible.value = true
  } catch (e: any) {
    console.error('Failed to fetch orders for custom export:', e)
    ElMessage.error('注文データの取得に失敗しました')
  }
}

const handleFormExportClick = async () => {
  if (tableSelectedKeys.value.length === 0) return
  const selectedIds = tableSelectedKeys.value.map((k) => String(k))
  try {
    const orders = await fetchShipmentOrdersByIds(selectedIds)
    selectedOrdersForFormExport.value = orders as OrderDocument[]
    formExportDialogVisible.value = true
  } catch (e: any) {
    console.error('Failed to fetch orders for form export:', e)
    ElMessage.error('注文データの取得に失敗しました')
  }
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  const nextPayload: Record<string, { operator: Operator; value: any }> = { ...(payload || {}) }
  const keyword = (nextPayload as any)?.__global?.value
  globalSearchText.value = keyword ? String(keyword) : ''
  delete (nextPayload as any).__global
  currentSearchPayload.value = nextPayload
  currentPage.value = 1 // 重置页码
  isSelectAll.value = false // 重置全选状态
  void loadOrders()
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
      h(
        ElButton,
        {
          type: 'primary',
          size: 'small',
          plain: true,
          onClick: () => handleView(rowData),
        },
        () => '詳細',
      ),
  }

  return [...baseColumns.value, actionColumn]
})

const headerGroupingConfig = computed<HeaderGroupingConfig>(() => {
  return buildOrderHeaderGroupingConfig(baseColumns.value as any)
})

const headerClass: HeaderClassNameGetter<any> = () => ''

const tableProps = computed(() => ({}))

const loadOrders = async () => {
  if (isLoadingOrders.value) return
  isLoadingOrders.value = true

  try {
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    const q = effectiveSearchPayload.value || undefined

    const res = await fetchShipmentOrdersPage<OrderRow>({
      page: currentPage.value,
      limit: pageSize.value,
      q,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      tzOffsetMinutes,
    })

    rows.value = Array.isArray(res?.items) ? res.items : []
    totalItems.value = typeof res?.total === 'number' ? res.total : 0
  } catch (e: any) {
    ElMessage.error(e?.message || '出荷データの取得に失敗しました')
  } finally {
    isLoadingOrders.value = false
  }
}

const handlePageChange = (payload: { page: number; pageSize: number; mode: string }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  isSelectAll.value = false // 重置全选状态
  void loadOrders()
}

const handleSortChange = (payload: { sortBy: string | null; sortOrder: SortOrder; mode: 'client' | 'server' }) => {
  if (payload.mode !== 'server') return
  sortBy.value = payload.sortBy
  sortOrder.value = payload.sortOrder
  currentPage.value = 1 // 重置页码
  void loadOrders()
}

const loadCarriers = async () => {
  try {
    carriers.value = await fetchCarriers({ enabled: true })
  } catch (e: any) {
    console.error('Failed to load carriers:', e)
  }
}

watch(
  () => showExportedRows.value,
  () => {
    currentPage.value = 1 // 重置页码
    isSelectAll.value = false // 重置全选状态
    void loadOrders()
  },
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

<style scoped>
.shipment-results {
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
</style>
