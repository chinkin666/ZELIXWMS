<template>
  <div class="shipment-operations-list">
    <div class="page-header">
      <h1 class="page-title">出荷一覧</h1>
    </div>

    <OrderSearchFormWrapper
      class="search-section"
      :columns="searchColumns"
      :initial-values="searchInitialValues"
      storage-key="shipment_operations_list"
      @search="handleSearch"
      @save="handleSave"
    />

    <div class="between-controls">
      <label class="switch-label">印刷済みのみ表示 <el-switch v-model="showPrintedOnly" /></label>
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
      :batch-delete-enabled="batchDeleteEnabled"
      :products="products"
      :show-status-tags="true"
      page-key="shipment-operations-tasks"
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
        <el-button
          type="primary"
          :loading="isMarkingShipped"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleMarkShipped"
        >
          出荷完了
        </el-button>
      </template>
    </OrderBottomBar>

    <OrderViewDialog
      v-model="viewDialogVisible"
      :order="selectedOrder"
      :carriers="carriers"
      title="出荷予定明細"
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
import { ElButton, ElMessage, ElSpace } from 'element-plus'
import type { HeaderClassNameGetter } from 'element-plus'
import Table from '@/components/table/OrderTable.vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import OrderSearchFormWrapper from '@/components/search/OrderSearchFormWrapper.vue'
import OrderViewDialog from '@/components/shipment-orders/OrderViewDialog.vue'
import CustomExportDialog from '@/components/export/CustomExportDialog.vue'
import FormExportDialog from '@/components/form-export/FormExportDialog.vue'
import type { HeaderGroupingConfig } from '@/components/table/tableHeaderGroup'
import type { Operator, TableColumn } from '@/types/table'
import { getOrderFieldDefinitions } from '@/types/order'
import { buildOrderHeaderGroupingConfig } from '@/utils/orderHeaderGrouping'
import { fetchShipmentOrder, fetchShipmentOrdersPage, updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import { ElMessageBox } from 'element-plus'
import type { OrderDocument } from '@/types/order'
import { yamatoB2Unconfirm, isCarrierDeleteError } from '@/api/carrierAutomation'

type SortOrder = 'asc' | 'desc' | null
type OrderRow = Record<string, any>

const rows = ref<OrderRow[]>([])
const tableSelectedKeys = ref<Array<string | number>>([])
const isLoadingOrders = ref(false)

// 批量删除功能已禁用（此页面使用確認取消功能代替）
const batchDeleteEnabled = ref(false)

const pageSize = ref(10)
const sortBy = ref<string | null>('orderNumber') // 默认按出荷管理No排序
const sortOrder = ref<SortOrder>('asc') // 默认升序
const isMarkingShipped = ref(false)
const isUnconfirming = ref(false)
const showPrintedOnly = ref(true)

// Custom export dialog state
const customExportDialogVisible = ref(false)
const selectedOrdersForCustomExport = ref<any[]>([])

// Form export dialog state (PDF)
const formExportDialogVisible = ref(false)
const selectedOrdersForFormExport = ref<OrderDocument[]>([])

// Carrier options
const carriers = ref<Carrier[]>([])
const carrierOptions = computed(() => {
  return (carriers.value || []).map((c) => ({ label: `${c.name} (${c.code})`, value: c._id }))
})
// Products for OrderTable
const products = ref<Product[]>([])

const searchInitialValues = computed(() => {
  return {}
})

const allFieldDefinitions = computed(() =>
  getOrderFieldDefinitions({ carrierOptions: carrierOptions.value }).map((col) =>
    col.key === 'trackingId' ? { ...col, tableVisible: true } : col,
  ),
)
const baseColumns = computed(() => {
  const systemFieldKeys = ['tenantId']
  // 在 shipment-operations/list 页面显示ステータス字段
  const statusKeys = ['statusCarrierReceipt', 'statusPrintReady', 'statusPrinted', 'statusShipped']
  return allFieldDefinitions.value.filter((col) => {
    if (systemFieldKeys.includes(col.key)) return false
    // 如果字段设置了 tableVisible: false，但在 statusKeys 中，则显示
    if (statusKeys.includes(col.key)) return true
    // 否则遵循 tableVisible 设置
    return col.tableVisible !== false
  })
})
const searchColumns = computed(() => {
  return allFieldDefinitions.value.filter((col) => col.searchType !== undefined)
})

const currentSearchPayload = ref<Record<string, { operator: Operator; value: any }> | null>(null)
const globalSearchText = ref<string>('')

const effectiveSearchPayload = computed(() => {
  const base = currentSearchPayload.value || searchInitialValues.value
  const q: Record<string, { operator: Operator; value: any }> = { ...(base || {}) }
  // 只显示 confirm.isConfirmed 为 true 的订单
  q['status.confirm.isConfirmed'] = { operator: 'is', value: true }
  // 只显示 carrierReceipt.isReceived 为 true 的订单
  q['status.carrierReceipt.isReceived'] = { operator: 'is', value: true }
  // 只显示 shipped.isShipped 不为 true（未出荷）的订单
  q['status.shipped.isShipped'] = { operator: 'isNot', value: true }
  // 印刷済みフィルター（トグルで制御）
  if (showPrintedOnly.value) {
    q['status.printed.isPrinted'] = { operator: 'is', value: true }
  }
  return q
})

// 显示数据（直接使用从后端获取的数据，过滤已在后端完成）
const displayRows = computed(() => {
  return [...rows.value]
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
    ElMessage.error(e?.message || '詳細の取得に失敗しました')
  }
}

const handleUnconfirm = async (row: any, skipCarrierDelete = false) => {
  try {
    const id = row?._id
    if (!id) return

    let reason: string

    // 如果是跳过B2删除的重试，不再弹出理由输入框
    if (skipCarrierDelete && row._unconfirmReason) {
      reason = row._unconfirmReason
    } else {
      // 使用 ElMessageBox.prompt 获取理由输入
      const { value } = await ElMessageBox.prompt(
        `注文番号: ${row.orderNumber || id}\n確認を取り消し、未確認状態に戻します。\nB2 Cloud連携を使用している場合、B2 Cloudからも削除されます。`,
        '確認取消',
        {
          confirmButtonText: '確認取消',
          cancelButtonText: 'キャンセル',
          inputPlaceholder: '取消理由を入力してください（内部データとして記録されます）',
          inputValidator: (value: string) => {
            if (!value || value.trim() === '') {
              return '理由を入力してください'
            }
            return true
          },
          type: 'warning',
        },
      )

      if (!value || value.trim() === '') {
        ElMessage.warning('理由を入力してください')
        return
      }
      reason = value.trim()
      // 保存理由以便重试时使用
      row._unconfirmReason = reason
    }

    isUnconfirming.value = true
    try {
      const result = await yamatoB2Unconfirm([String(id)], reason, { skipCarrierDelete })
      if (result.success) {
        let message = '確認を取り消しました'
        if (result.carrierDeleteSkipped) {
          message += '（B2 Cloud削除スキップ）'
        } else if (result.b2DeleteResult) {
          if (result.b2DeleteResult.success) {
            message += `（B2 Cloudから${result.b2DeleteResult.deleted}件削除）`
          } else {
            message += `（B2 Cloud削除失敗: ${result.b2DeleteResult.error}）`
          }
        }
        ElMessage.success(message)
      }
      await loadOrders()
    } catch (e: any) {
      // B2削除エラーの場合はスキップ確認ダイアログを表示
      if (isCarrierDeleteError(e)) {
        isUnconfirming.value = false
        try {
          await ElMessageBox.confirm(
            `B2 Cloudからの履歴削除に失敗しました。\n\nエラー: ${e.error}\n\nB2 Cloud削除をスキップして、ローカルのみ更新しますか？\n（B2 Cloud側は手動で削除してください）`,
            'B2 Cloud削除エラー',
            {
              confirmButtonText: 'スキップして続行',
              cancelButtonText: 'キャンセル',
              type: 'warning',
            }
          )
          // スキップして再実行
          await handleUnconfirm(row, true)
          return
        } catch {
          // キャンセルされた場合
          return
        }
      }
      throw e
    } finally {
      isUnconfirming.value = false
    }
  } catch (e: any) {
    if (e === 'cancel') return
    ElMessage.error(e?.message || '確認取消に失敗しました')
    isUnconfirming.value = false
  }
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

const handleMarkShipped = async () => {
  if (tableSelectedKeys.value.length === 0) {
    ElMessage.warning('出荷完了行を選択してください')
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

    await ElMessageBox.confirm(
      `選択した${tableSelectedKeys.value.length}件の出荷を完了にしますか？\n${orderNumbersText}${moreText ? `\n${moreText}` : ''}`,
      '出荷完了確認',
      {
        confirmButtonText: '完了にする',
        cancelButtonText: 'キャンセル',
        type: 'info',
        dangerouslyUseHTMLString: false,
      },
    )

    isMarkingShipped.value = true
    const ids = tableSelectedKeys.value.map((key) => String(key)).filter(Boolean)
    
    if (ids.length === 0) {
      ElMessage.warning('有効なIDがありません')
      isMarkingShipped.value = false
      return
    }
    
    try {
      console.log('Marking shipped for ids:', ids)
      const result = await updateShipmentOrderStatusBulk(ids, 'mark-shipped')
      console.log('Mark shipped result:', result)
      
      if (result && result.modifiedCount !== undefined) {
        if (result.modifiedCount > 0) {
          ElMessage.success(`${result.modifiedCount}件の出荷を完了にしました`)
        } else {
          ElMessage.warning('更新されたレコードがありません。既に出荷完了になっている可能性があります。')
        }
      } else {
        ElMessage.success(`${ids.length}件の出荷を完了にしました`)
      }
      
      // 清空选择并重新加载列表
      tableSelectedKeys.value = []
      await loadOrders()
    } catch (e: any) {
      console.error('Error marking shipped:', e)
      ElMessage.error(e?.message || '出荷完了の更新に失敗しました')
    } finally {
      isMarkingShipped.value = false
    }
  } catch (e: any) {
    if (e === 'cancel') return
    ElMessage.error(e?.message || '出荷完了の更新に失敗しました')
    isMarkingShipped.value = false
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
  ElMessage.success('検索条件を保存しました（ダミー）')
}

const tableColumns = computed(() => {
  const actionColumn = {
    key: 'actions',
    dataKey: 'actions',
    title: '操作',
    width: 180,
    fixed: 'right' as const,
    align: 'center' as const,
    cellRenderer: ({ rowData }: { rowData: any }) =>
      h(
        ElSpace,
        { size: 8 },
        () => [
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
          h(
            ElButton,
            {
              type: 'warning',
              size: 'small',
              plain: true,
              loading: isUnconfirming.value,
              onClick: () => handleUnconfirm(rowData),
            },
            () => '確認取消',
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

const headerClass: HeaderClassNameGetter<any> = () => ''

const tableProps = computed(() => ({}))

const loadCarriers = async () => {
  try {
    carriers.value = await fetchCarriers()
  } catch (e) {
    console.error(e)
    ElMessage.warning('配送会社マスタの取得に失敗しました')
  }
}

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
    ElMessage.error(e?.message || '出荷予定の取得に失敗しました')
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
  () => showPrintedOnly.value,
  () => {
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
.shipment-operations-list {
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #2a3474;
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
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.bottom-bar__meta {
  color: #303133;
  font-size: 13px;
  white-space: nowrap;
}

.bottom-bar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
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

::v-deep(.error-cell) {
  background-color: #ffebee !important;
}
</style>
