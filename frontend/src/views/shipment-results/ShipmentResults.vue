<template>
  <div class="shipment-results">
    <ControlPanel title="出荷実績一覧" :show-search="false" />

    <OrderSearchFormWrapper
      class="search-section"
      :columns="searchColumns"
      :initial-values="searchInitialValues"
      storage-key="shipment_results"
      @search="handleSearch"
    />

    <div class="between-controls">
      <label class="switch-label">連携済みを表示
        <label class="o-toggle">
          <input type="checkbox" v-model="showExportedRows" />
          <span class="o-toggle-slider"></span>
        </label>
      </label>
    </div>

    <!-- Plain table (same style as shipment-orders/create) -->
    <div class="o-table-wrapper">
      <div v-if="tableSelectedKeys.length > 0" class="o-list-toolbar o-toolbar-active">
        <span class="o-selected-count">{{ tableSelectedKeys.length }}件選択中</span>
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
            <th class="o-table-th" style="width:90px;">状態</th>
            <th class="o-table-th o-table-th--sortable" style="width:220px;" @click="handleSortClick('orderNumber')">
              出荷管理番号
              <span v-if="sortBy === 'orderNumber'" class="o-sort-icon">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
            </th>
            <th class="o-table-th" style="width:200px;">配送情報</th>
            <th class="o-table-th" style="width:180px;">配送指定</th>
            <th class="o-table-th" style="width:200px;">お届け先</th>
            <th class="o-table-th" style="width:200px;">商品</th>
            <th class="o-table-th" style="width:170px;">履歴</th>
            <th class="o-table-th" style="width:100px;">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoadingOrders">
            <td colspan="9" class="o-table-empty">読み込み中...</td>
          </tr>
          <tr v-else-if="paginatedRows.length === 0">
            <td colspan="9" class="o-table-empty">データがありません</td>
          </tr>
          <tr
            v-for="row in paginatedRows"
            :key="row._id"
            class="o-table-row"
            :class="{ 'o-table-row--selected': tableSelectedKeys.includes(String(row._id)) }"
          >
            <td class="o-table-td o-table-td--checkbox">
              <input
                type="checkbox"
                :checked="tableSelectedKeys.includes(String(row._id))"
                @change="toggleRowSelection(row)"
              />
            </td>
            <td class="o-table-td o-table-td--status">
              <div class="status-cell">
                <span v-if="row.status?.confirm?.isConfirmed" class="o-status-tag o-status-tag--confirmed">確定済</span>
                <span v-if="row.status?.carrierReceipt?.isReceived" class="o-status-tag o-status-tag--issued">送り状発行済</span>
                <span v-if="row.status?.printed?.isPrinted" class="o-status-tag o-status-tag--printed">印刷済</span>
                <span v-if="row.status?.inspected?.isInspected" class="o-status-tag o-status-tag--confirmed">検品済</span>
                <span v-if="row.status?.shipped?.isShipped" class="o-status-tag o-status-tag--shipped">出荷済</span>
                <span v-if="row.status?.ecExported?.isExported" class="o-status-tag o-status-tag--exported">連携済</span>
              </div>
            </td>
            <!-- 出荷管理番号 -->
            <td class="o-table-td o-table-td--mgmt">
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">出荷管理No</span>
                  <a href="#" class="mgmt-cell__link mgmt-cell__value" @click.prevent="handleView(row)">{{ row.orderNumber || '-' }}</a>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">注文番号</span>
                  <span class="mgmt-cell__value">{{ row.customerManagementNumber || '-' }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">送り状番号</span>
                  <span class="mgmt-cell__value">{{ row.trackingId || '-' }}</span>
                </div>
              </div>
            </td>
            <!-- 配送情報 -->
            <td class="o-table-td o-table-td--mgmt">
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">配送会社</span>
                  <span class="mgmt-cell__value">{{ getCarrierLabel(row) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">配送サービス</span>
                  <span class="mgmt-cell__value">{{ getInvoiceTypeLabel(row) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">温度帯</span>
                  <span class="mgmt-cell__value" :style="{ color: getCoolTypeInfo(row).color }">{{ getCoolTypeInfo(row).label }}</span>
                </div>
              </div>
            </td>
            <!-- 配送指定 -->
            <td class="o-table-td o-table-td--mgmt">
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">出荷予定日</span>
                  <span class="mgmt-cell__value">{{ row.shipPlanDate || '-' }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">お届け日</span>
                  <span class="mgmt-cell__value">{{ row.deliveryDatePreference || '最短' }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">時間帯指定</span>
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
                    <span class="product-item__meta">SKU: {{ p.inputSku || p.productSku || '-' }} / 個数: {{ p.quantity ?? 0 }}</span>
                  </div>
                </div>
                <span v-if="!row.products?.length" class="o-cell">-</span>
              </div>
            </td>
            <!-- 履歴 -->
            <td class="o-table-td o-table-td--mgmt">
              <div class="mgmt-cell">
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">出荷完了</span>
                  <span class="mgmt-cell__value">{{ fmtDateTime(row.status?.shipped?.shippedAt) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">EC連携</span>
                  <span class="mgmt-cell__value">{{ fmtDateTime(row.status?.ecExported?.exportedAt) }}</span>
                </div>
                <div class="mgmt-cell__row">
                  <span class="mgmt-cell__label">印刷日時</span>
                  <span class="mgmt-cell__value">{{ fmtDateTime(row.status?.printed?.printedAt) }}</span>
                </div>
              </div>
            </td>
            <!-- 操作 -->
            <td class="o-table-td o-table-td--actions">
              <OButton variant="primary" size="sm" @click="handleView(row)">詳細</OButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ totalItems }} 件中 {{ paginatedRows.length }} 件表示</span>
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
      :total-count="totalItems"
      :selected-count="tableSelectedKeys.length"
      total-label="総件数"
    >
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
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { useOrderCellHelpers } from '@/composables/useOrderCellHelpers'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import OrderSearchFormWrapper from '@/components/search/OrderSearchFormWrapper.vue'
import OrderViewDialog from '@/components/shipment-orders/OrderViewDialog.vue'
import CustomExportDialog from '@/components/export/CustomExportDialog.vue'
import FormExportDialog from '@/components/form-export/FormExportDialog.vue'
import type { OrderDocument } from '@/types/order'
import type { Operator } from '@/types/table'
import { fetchShipmentOrder, fetchShipmentOrdersPage, fetchShipmentOrdersByIds } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'

const { show: showToast } = useToast()

type SortOrder = 'asc' | 'desc' | null
type OrderRow = Record<string, any>

const rows = ref<OrderRow[]>([])
const tableSelectedKeys = ref<Array<string | number>>([])
const isLoadingOrders = ref(false)

const pageSize = ref(10)
const currentPage = ref(1)
const totalItems = ref(0)
const sortBy = ref<string | null>('orderNumber')
const sortOrder = ref<SortOrder>('asc')

// Carriers & Products
const carriers = ref<Carrier[]>([])
const products = ref<Product[]>([])

// Cell helpers
const { getCarrierLabel, getInvoiceTypeLabel, getTimeSlotLabel, getCoolTypeInfo, fmtDateTime, fmtPostal, allFieldDefinitions } = useOrderCellHelpers(carriers)

// Custom export dialog state
const customExportDialogVisible = ref(false)
const selectedOrdersForCustomExport = ref<any[]>([])

// Form export dialog state (PDF)
const formExportDialogVisible = ref(false)
const selectedOrdersForFormExport = ref<OrderDocument[]>([])

// Default filter: today's shipPlanDate
const searchInitialValues = computed((): Record<string, { operator: Operator; value: any }> => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
  return {
    shipPlanDate: { operator: 'is' as Operator, value: today },
  }
})

const searchColumns = computed(() =>
  allFieldDefinitions.value.filter(
    (col) => col.searchType !== undefined && col.key !== 'statusEcExported',
  ),
)

const currentSearchPayload = ref<Record<string, { operator: Operator; value: any }> | null>(null)

// Toggle: show rows where EC export is done
const showExportedRows = ref(false)

const effectiveSearchPayload = computed(() => {
  const base = currentSearchPayload.value || searchInitialValues.value
  const q: Record<string, { operator: Operator; value: any }> = { ...(base || {}) }

  q['status.shipped.isShipped'] = { operator: 'is', value: true }

  if (!showExportedRows.value) {
    q['status.ecExported.isExported'] = { operator: 'is', value: false }
  }

  return q
})

// --- Pagination (server-side) ---
const totalPages = computed(() => Math.max(1, Math.ceil(totalItems.value / pageSize.value)))
const paginatedRows = computed(() => [...rows.value])

watch(pageSize, () => {
  currentPage.value = 1
  void loadOrders()
})

// --- Selection ---
const isAllCurrentPageSelected = computed(() =>
  paginatedRows.value.length > 0 && paginatedRows.value.every(r => tableSelectedKeys.value.includes(String(r._id))),
)
const isSomeCurrentPageSelected = computed(() =>
  paginatedRows.value.some(r => tableSelectedKeys.value.includes(String(r._id))),
)

const toggleSelectAll = () => {
  if (isAllCurrentPageSelected.value) {
    const pageIds = new Set(paginatedRows.value.map(r => String(r._id)))
    tableSelectedKeys.value = tableSelectedKeys.value.filter(k => !pageIds.has(String(k)))
  } else {
    const existing = new Set(tableSelectedKeys.value.map(k => String(k)))
    for (const r of paginatedRows.value) {
      existing.add(String(r._id))
    }
    tableSelectedKeys.value = [...existing]
  }
}

const toggleRowSelection = (row: any) => {
  const id = String(row._id)
  if (tableSelectedKeys.value.includes(id)) {
    tableSelectedKeys.value = tableSelectedKeys.value.filter(k => String(k) !== id)
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
    showToast(e?.message || '詳細の取得に失敗しました', 'danger')
  }
}

// --- Export ---
const handleCustomExportClick = async () => {
  if (tableSelectedKeys.value.length === 0) return
  const selectedIds = tableSelectedKeys.value.map((k) => String(k))
  try {
    const orders = await fetchShipmentOrdersByIds(selectedIds)
    selectedOrdersForCustomExport.value = orders
    customExportDialogVisible.value = true
  } catch (e: any) {
    console.error('Failed to fetch orders for custom export:', e)
    showToast('注文データの取得に失敗しました', 'danger')
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
    showToast('注文データの取得に失敗しました', 'danger')
  }
}

// --- Search ---
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  const nextPayload: Record<string, { operator: Operator; value: any }> = { ...(payload || {}) }
  delete (nextPayload as any).__global
  currentSearchPayload.value = nextPayload
  currentPage.value = 1
  void loadOrders()
}

// --- Sort ---
const handleSortClick = (field: string) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
  currentPage.value = 1
  void loadOrders()
}

// --- Data loading ---
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
    showToast(e?.message || '出荷データの取得に失敗しました', 'danger')
  } finally {
    isLoadingOrders.value = false
  }
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
    currentPage.value = 1
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

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.shipment-results {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.search-section {
  margin-bottom: 20px;
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

.o-status-tag--shipped {
  background: #e1f3d8;
  color: #67c23a;
}

.o-status-tag--exported {
  background: #d9ecff;
  color: #409eff;
}
</style>
