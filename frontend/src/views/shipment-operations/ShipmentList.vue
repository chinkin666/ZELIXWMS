<template>
  <div class="shipment-list">
    <div class="page-header">
      <h1 class="page-title">出荷作業一覧</h1>
    </div>

    <CarrierSelector
      v-model="selectedCarrierId"
      :enabled="true"
      @change="handleCarrierChange"
      @carriers-loaded="handleCarriersLoaded"
    />

    <OrderSearchFormWrapper
      ref="searchFormRef"
      class="search-section"
      :columns="searchColumns"
      :initial-values="searchInitialValues"
      storage-key="shipment_list"
      @search="handleSearch"
      @save="handleSave"
    />

    <div class="between-controls">
      <label class="switch-label">検品済み表示
        <label class="o-toggle">
          <input type="checkbox" v-model="showInspected">
          <span class="o-toggle-slider"></span>
        </label>
      </label>
      <label class="switch-label">印刷済み表示
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

    <Table
      class="table-attached"
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
      page-key="shipment-operations-list"
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
        <OButton
          variant="warning"
          size="sm"
          :disabled="tableSelectedKeys.length === 0 || isUnconfirming"
          @click="openBatchUnconfirmDialog"
        >
          {{ isUnconfirming ? '処理中...' : '一括確認取消' }}
        </OButton>
      </template>
      <template #right>
        <OButton
          variant="secondary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handlePickingListClick"
        >
          ピッキングリスト出力
        </OButton>
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
          @click="handleShipmentDetailListClick"
        >
          出荷明細リスト出力(pdf)
        </OButton>
        <OButton
          variant="primary"
          :disabled="tableSelectedKeys.length === 0"
          @click="handlePrintClick"
        >
          送り状印刷
        </OButton>
        <OButton
          variant="success"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleOneByOneStart"
        >
          1-1検品開始
        </OButton>
        <OButton
          variant="warning"
          size="sm"
          :disabled="tableSelectedKeys.length === 0"
          @click="handleNByOneStart"
        >
          N-1検品開始
        </OButton>
        <OButton
          variant="secondary"
          @click="schemaAnalysisDrawerVisible = true"
        >
          データ分析
        </OButton>
      </template>
    </OrderBottomBar>

    <OrderViewDialog
      v-model="viewDialogVisible"
      :order="selectedOrder"
      :carriers="carriers"
      title="出荷予定明細"
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

    <!-- Schema Analysis Drawer (native slide-over panel) -->
    <div v-if="schemaAnalysisDrawerVisible" class="drawer-overlay" @click.self="schemaAnalysisDrawerVisible = false">
      <div class="drawer-panel">
        <div class="drawer-header">
          <h3 class="drawer-title">スキーマ分析</h3>
          <button class="drawer-close" @click="schemaAnalysisDrawerVisible = false">&times;</button>
        </div>
        <div class="drawer-body">
          <OrderSchemaAnalysis
            :orders="displayRows as OrderDocument[]"
            :carriers="carriers"
            @filter="handleSchemaFilter"
          />
        </div>
      </div>
    </div>

    <CustomExportDialog
      v-model="customExportDialogVisible"
      :orders="selectedOrdersForCustomExport"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import { useRouter } from 'vue-router'
import Table from '@/components/table/OrderTable.vue'
import OrderBottomBar from '@/components/table/OrderBottomBar.vue'
import OrderSearchFormWrapper from '@/components/search/OrderSearchFormWrapper.vue'
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
import OrderSchemaAnalysis from '@/components/schema-analysis/OrderSchemaAnalysis.vue'
import CustomExportDialog from '@/components/export/CustomExportDialog.vue'
import type { HeaderGroupingConfig } from '@/components/table/tableHeaderGroup'
import type { Operator } from '@/types/table'
import { getOrderFieldDefinitions } from '@/types/order'
import { buildOrderHeaderGroupingConfig } from '@/utils/orderHeaderGrouping'
import { isBuiltInCarrierId } from '@/utils/carrier'
import { fetchShipmentOrder, fetchShipmentOrdersPage, fetchShipmentOrdersByIds } from '@/api/shipmentOrders'
import { yamatoB2Unconfirm, changeInvoiceType, splitOrder as splitOrderApi, isCarrierDeleteError } from '@/api/carrierAutomation'
import type { SplitOrderRequest } from '@/types/carrierAutomation'
import type { Carrier } from '@/types/carrier'
import { fetchProducts } from '@/api/product'
import type { Product } from '@/types/product'
import type { PrintTemplate } from '@/types/printTemplate'
import { fetchPrintTemplates } from '@/api/printTemplates'
import type { OrderDocument } from '@/types/order'

const router = useRouter()

type SortOrder = 'asc' | 'desc' | null
type OrderRow = Record<string, any>

const rows = ref<OrderRow[]>([])
const tableSelectedKeys = ref<Array<string | number>>([])
const isLoadingOrders = ref(false)

// 批量删除功能已禁用（此页面使用確認取消功能代替）
const batchDeleteEnabled = ref(false)
const isUnconfirming = ref(false)

// 確認取消ダイアログ用
const unconfirmDialogVisible = ref(false)
const unconfirmOrderNumber = ref('')
const unconfirmOrderId = ref('')
const unconfirmShowManualCarrierWarning = ref(false)
// 一括確認取消用
const batchUnconfirmOrderIds = ref<string[]>([])
const isBatchUnconfirm = ref(false)

// 送り状種類変更ダイアログ用
const changeInvoiceTypeDialogVisible = ref(false)
const changeInvoiceTypeOrders = ref<OrderDocument[]>([])
const isChangingInvoiceType = ref(false)

// 注文分割ダイアログ用
const splitOrderDialogVisible = ref(false)
const splitOrderTarget = ref<OrderDocument | null>(null)
const isSplittingOrder = ref(false)

// データ分析 Drawer
const schemaAnalysisDrawerVisible = ref(false)

// カスタム出力ダイアログ
const customExportDialogVisible = ref(false)
const selectedOrdersForCustomExport = ref<OrderDocument[]>([])

// Search form ref for external filter addition
const searchFormRef = ref<{ addFilter: (fieldKey: string, value: any) => boolean } | null>(null)

const pageSize = ref(10)
const sortBy = ref<string | null>('orderNumber') // 默认按出荷管理No排序
const sortOrder = ref<SortOrder>('asc') // 默认升序

// Carrier selector (handled by CarrierSelector component)
const selectedCarrierId = ref<string>('')
const carriers = ref<Carrier[]>([])
// Order group selector
const selectedOrderGroupId = ref<string>('')
const orderGroups = ref<OrderGroup[]>([])
const orderGroupSelectorRef = ref<{ reloadCounts: () => Promise<void> } | null>(null)
// Products for OrderTable
const products = ref<Product[]>([])
const showInspected = ref(false)
const showPrinted = ref(false)

const handleCarrierChange = (carrierId: string) => {
  selectedCarrierId.value = carrierId
}

const handleCarriersLoaded = (loadedCarriers: Carrier[]) => {
  carriers.value = loadedCarriers
  // CarrierSelector 不再自动选择，直接加载订单（无配送業者过滤时显示全部）
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
  getOrderFieldDefinitions({ carrierOptions: carrierOptions.value }).map((col) =>
    col.key === 'trackingId' ? { ...col, tableVisible: true } : col,
  ),
)
const baseColumns = computed(() => {
  const systemFieldKeys = ['tenantId']
  // 在 shipment-list 页面显示ステータス字段
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
  return allFieldDefinitions.value.filter(
    (col) => col.searchType !== undefined && col.key !== 'carrierId',
  )
})

const currentSearchPayload = ref<Record<string, { operator: Operator; value: any }> | null>(null)
const globalSearchText = ref<string>('')

const effectiveSearchPayload = computed(() => {
  const base = currentSearchPayload.value || searchInitialValues.value
  const q: Record<string, { operator: Operator; value: any }> = { ...(base || {}) }
  // Carrier selector acts as a dedicated filter for this page
  if (selectedCarrierId.value) {
    q.carrierId = { operator: 'is', value: selectedCarrierId.value }
  }
  // Order group selector filter
  if (selectedOrderGroupId.value) {
    if (selectedOrderGroupId.value === UNCATEGORIZED_VALUE) {
      // 筛选未分类的订单（orderGroupId 为空）
      q.orderGroupId = { operator: 'isEmpty', value: null }
    } else {
      q.orderGroupId = { operator: 'is', value: selectedOrderGroupId.value }
    }
  }
  // 只显示 confirm.isConfirmed 为 true 的订单
  q['status.confirm.isConfirmed'] = { operator: 'is', value: true }
  // 只显示 carrierReceipt.isReceived 为 true 的订单
  q['status.carrierReceipt.isReceived'] = { operator: 'is', value: true }
  // 隐藏过滤：不显示已出荷済み的订单
  q['status.shipped.isShipped'] = { operator: 'isNot', value: true }
  // 検品済み・印刷済みの表示制御
  if (!showInspected.value) {
    q['status.inspected.isInspected'] = { operator: 'isNot', value: true }
  }
  if (!showPrinted.value) {
    q['status.printed.isPrinted'] = { operator: 'isNot', value: true }
  }
  return q
})

const displayRows = computed(() => {
  return [...rows.value]
})

const viewDialogVisible = ref(false)
const selectedOrder = ref<any>(null)
const printPreviewVisible = ref(false)
const previewOrders = ref<OrderDocument[]>([])
const formExportDialogVisible = ref(false)
const formExportTargetType = ref<'shipment-list-picking' | 'shipment-detail-list'>('shipment-list-picking')

// 帳票出力用の選択された注文
const selectedOrdersForExport = computed(() => {
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  return rows.value.filter((r: any) => keySet.has(String(r?._id))) as OrderDocument[]
})

// Print templates cache
const printTemplatesCache = ref<PrintTemplate[]>([])

// Load all print templates
const loadPrintTemplates = async () => {
  try {
    const templates = await fetchPrintTemplates()
    printTemplatesCache.value = templates
    // Also save to localStorage for consistency with other pages
    localStorage.setItem('allPrintTemplatesCache', JSON.stringify(templates))
  } catch (e) {
    console.error('Failed to load print templates:', e)
    alert('印刷テンプレートの読み込みに失敗しました')
  }
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

// 打开确认取消对话框（単一）
const openUnconfirmDialog = (row: any) => {
  const id = row?._id
  if (!id) return
  isBatchUnconfirm.value = false
  unconfirmOrderId.value = String(id)
  unconfirmOrderNumber.value = row.orderNumber || String(id)
  // 检查是否为手动carrier
  unconfirmShowManualCarrierWarning.value = !isBuiltInCarrierId(row.carrierId)
  unconfirmDialogVisible.value = true
}

// 打开一括確認取消对话框
const openBatchUnconfirmDialog = () => {
  if (tableSelectedKeys.value.length === 0) return
  batchUnconfirmOrderIds.value = tableSelectedKeys.value.map(k => String(k))
  isBatchUnconfirm.value = true
  unconfirmOrderNumber.value = `${tableSelectedKeys.value.length}件`
  // 检查选中的订单是否有手动carrier
  const keySet = new Set(tableSelectedKeys.value.map(k => String(k)))
  const selectedOrders = rows.value.filter((r: any) => keySet.has(String(r?._id)))
  unconfirmShowManualCarrierWarning.value = selectedOrders.some((o: any) => !isBuiltInCarrierId(o.carrierId))
  unconfirmDialogVisible.value = true
}

// 打开送り状種類変更对话框
const openChangeInvoiceTypeDialog = (row: any) => {
  const id = row?._id
  if (!id) return
  changeInvoiceTypeOrders.value = [row as OrderDocument]
  changeInvoiceTypeDialogVisible.value = true
}

// B2削除エラーハンドリング共通ヘルパー
const handleB2DeleteErrorWithRetry = async (
  error: unknown,
  loadingRef: { value: boolean },
  retryFn: () => Promise<void>
): Promise<boolean> => {
  if (!isCarrierDeleteError(error)) return false
  loadingRef.value = false
  if (confirm(`B2 Cloudからの履歴削除に失敗しました。\n\nエラー: ${(error as any).error}\n\nB2 Cloud削除をスキップして、ローカルのみ更新しますか？\n（B2 Cloud側は手動で削除してください）`)) {
    await retryFn()
  }
  return true
}

// 处理送り状種類変更确认
const handleChangeInvoiceTypeConfirm = async (newInvoiceType: string, skipCarrierDelete = false) => {
  if (changeInvoiceTypeOrders.value.length === 0) return

  isChangingInvoiceType.value = true
  try {
    const orderIds = changeInvoiceTypeOrders.value.map((o) => String(o._id))
    const result = await changeInvoiceType(orderIds, newInvoiceType, { skipCarrierDelete })

    if (result.success) {
      let message = `送り状種類を変更しました（${result.updatedCount}件更新）`
      if (result.resubmittedCount > 0) {
        message += `、${result.resubmittedCount}件をB2 Cloudに再登録`
      }
      if (result.carrierDeleteSkipped) {
        message += '（B2 Cloud削除スキップ）'
      }
      if (result.requiresManualUpload) {
        message += '。手動連携の注文は運送会社への再登録が必要です。'
        alert(message)
      } else {
        alert(message)
      }
    } else {
      const errorMsg = result.errors?.join(', ') || '送り状種類変更に失敗しました'
      alert(errorMsg)
    }
    await loadOrders()
    changeInvoiceTypeDialogVisible.value = false
  } catch (e: any) {
    const handled = await handleB2DeleteErrorWithRetry(
      e, isChangingInvoiceType,
      () => handleChangeInvoiceTypeConfirm(newInvoiceType, true)
    )
    if (!handled) {
      alert(e?.message || '送り状種類変更に失敗しました')
      changeInvoiceTypeDialogVisible.value = false
    }
  } finally {
    isChangingInvoiceType.value = false
  }
}

// 处理确认取消（単一・一括共通）
const handleUnconfirmConfirm = async (reason: string, skipCarrierDelete = false) => {
  // 批量模式或单个模式获取 orderIds
  const orderIds = isBatchUnconfirm.value
    ? batchUnconfirmOrderIds.value
    : (unconfirmOrderId.value ? [unconfirmOrderId.value] : [])

  if (orderIds.length === 0) return

  isUnconfirming.value = true
  try {
    const result = await yamatoB2Unconfirm(orderIds, reason, { skipCarrierDelete })
    if (result.success) {
      let message = isBatchUnconfirm.value
        ? `${result.updatedCount}件の確認を取り消しました`
        : '確認を取り消しました'
      if (result.carrierDeleteSkipped) {
        message += '（B2 Cloud削除スキップ）'
      } else if (result.b2DeleteResult) {
        if (result.b2DeleteResult.success) {
          message += `（B2 Cloudから${result.b2DeleteResult.deleted}件削除）`
        } else {
          message += `（B2 Cloud削除失敗: ${result.b2DeleteResult.error}）`
        }
      }
      alert(message)
    }
    await loadOrders()
    unconfirmDialogVisible.value = false
    // 一括の場合は選択をクリア
    if (isBatchUnconfirm.value) {
      tableSelectedKeys.value = []
    }
  } catch (e: any) {
    const handled = await handleB2DeleteErrorWithRetry(
      e, isUnconfirming,
      () => handleUnconfirmConfirm(reason, true)
    )
    if (!handled) {
      alert(e?.message || '確認取消に失敗しました')
      unconfirmDialogVisible.value = false
    }
  } finally {
    isUnconfirming.value = false
  }
}

// 注文分割ダイアログを開く
const openSplitOrderDialog = (row: any) => {
  const id = row?._id
  if (!id) return
  const totalQty = (row.products || []).reduce(
    (sum: number, p: any) => sum + (p.quantity || 0), 0
  )
  if (totalQty <= 1) {
    alert('商品が1つの注文は分割できません')
    return
  }
  splitOrderTarget.value = row as OrderDocument
  splitOrderDialogVisible.value = true
}

// 注文分割の確認ハンドラ
const handleSplitOrderConfirm = async (splitGroups: SplitOrderRequest['splitGroups'], skipCarrierDelete = false) => {
  if (!splitOrderTarget.value) return

  isSplittingOrder.value = true
  try {
    const result = await splitOrderApi(
      { orderId: String(splitOrderTarget.value._id), splitGroups },
      { skipCarrierDelete }
    )
    if (result.success) {
      const successCount = result.splitOrders.filter((o) => o.success).length
      let message = `注文を${successCount}件に分割しました`
      if (result.carrierDeleteSkipped) {
        message += '（B2 Cloud削除スキップ）'
      }
      alert(message)
    } else {
      const errorMsg = result.errors?.join(', ') || '注文分割に失敗しました'
      alert(errorMsg)
    }
    await loadOrders()
    splitOrderDialogVisible.value = false
  } catch (e: any) {
    const handled = await handleB2DeleteErrorWithRetry(
      e, isSplittingOrder,
      () => handleSplitOrderConfirm(splitGroups, true)
    )
    if (!handled) {
      alert(e?.message || '注文分割に失敗しました')
      splitOrderDialogVisible.value = false
    }
  } finally {
    isSplittingOrder.value = false
  }
}

// 注文が分割可能か判定
const canSplitOrder = (row: any): boolean => {
  const totalQty = (row.products || []).reduce(
    (sum: number, p: any) => sum + (p.quantity || 0), 0
  )
  return totalQty > 1
}

const handleTableSelectionChange = (payload: { selectedKeys: Array<string | number>; selectedRows: any[] }) => {
  tableSelectedKeys.value = payload.selectedKeys
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
  // Fetch full order data for selected rows
  const orderIds = tableSelectedKeys.value.map((k) => String(k))
  try {
    const orders = await fetchShipmentOrdersByIds(orderIds)
    selectedOrdersForCustomExport.value = orders
    customExportDialogVisible.value = true
  } catch (e: any) {
    console.error('Failed to fetch orders for custom export:', e)
    alert('注文データの取得に失敗しました')
  }
}

const handlePrintClick = async () => {
  if (tableSelectedKeys.value.length === 0) return

  // 打开预览对话框
  await openPrintPreview()
}

const handleOneByOneStart = () => {
  if (tableSelectedKeys.value.length === 0) return
  const orderIds = tableSelectedKeys.value.map((k) => String(k))
  localStorage.setItem('oneByOneSelectedOrderIds', JSON.stringify(orderIds))
  localStorage.removeItem('oneByOneProcessedOrderIds')
  router.push('/shipment-operations/one-by-one/inspection')
}

const handleNByOneStart = () => {
  if (tableSelectedKeys.value.length === 0) return
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  const selectedOrders = rows.value.filter((r: any) => keySet.has(String(r?._id)))

  // Validate: all selected orders must have totalQuantity === 1
  const invalidOrders = selectedOrders.filter((o: any) => {
    const totalQty = o._productsMeta?.totalQuantity
      ?? (Array.isArray(o.products)
        ? o.products.reduce((s: number, p: any) => s + (p.quantity || 1), 0)
        : 0)
    return totalQty !== 1
  })

  if (invalidOrders.length > 0) {
    const names = invalidOrders.slice(0, 5).map((o: any) => o.orderNumber || String(o._id))
    alert(
      `商品数が1でない注文があります: ${names.join(', ')}${invalidOrders.length > 5 ? ` 他${invalidOrders.length - 5}件` : ''}`,
    )
    return
  }

  const orderIds = tableSelectedKeys.value.map((k) => String(k))
  localStorage.setItem('nByOneSelectedOrderIds', JSON.stringify(orderIds))
  localStorage.removeItem('nByOneProcessedOrderIds')
  router.push('/shipment-operations/n-by-one/inspection')
}

/**
 * 打开打印预览对话框
 */
const openPrintPreview = async () => {
  const keySet = new Set(tableSelectedKeys.value.map((k) => String(k)))
  const selectedRows = rows.value.filter((r: any) => keySet.has(String(r?._id)))
  if (!selectedRows.length) return

  // 确保打印模板已加载
  if (printTemplatesCache.value.length === 0) {
    await loadPrintTemplates()
  }

  // 尝试从 localStorage 加载模板（如果 API 加载失败）
  if (printTemplatesCache.value.length === 0) {
    try {
      const storedTemplates = localStorage.getItem('allPrintTemplatesCache')
      if (storedTemplates) {
        printTemplatesCache.value = JSON.parse(storedTemplates) as PrintTemplate[]
      }
    } catch (e) {
      console.error('Failed to load templates from localStorage:', e)
    }
  }

  if (printTemplatesCache.value.length === 0) {
    alert('印刷テンプレートが読み込まれていません')
    return
  }

  // 从后端获取完整的订单数据（包含 carrierRawRow）
  const orderIds = selectedRows
    .map((row) => String((row as any)?._id))
    .filter((id) => id && id !== 'undefined')

  if (orderIds.length === 0) {
    alert('印刷可能な注文がありません')
    return
  }

  let orders: OrderDocument[] = []
  try {
    orders = await fetchShipmentOrdersByIds<OrderDocument>(orderIds, { includeRawData: true })
  } catch (e: any) {
    console.error('Failed to fetch orders for print:', e)
    alert(`注文データの取得に失敗しました: ${e?.message || String(e)}`)
    return
  }

  // 确保订单有必要的字段
  orders = orders.filter((order) => {
    return order && order._id && order.carrierId && order.invoiceType
  })

  if (orders.length === 0) {
    alert('印刷可能な注文がありません')
    return
  }

  previewOrders.value = orders
  printPreviewVisible.value = true
}

/**
 * 打印完成后的回调
 */
const handlePrintCompleted = async () => {
  // 重新加载列表以更新打印状态
  await loadOrders()
  // 清空选择
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
  alert('検索条件を保存しました（ダミー）')
}

const handleSchemaFilter = (fieldPath: string, value: any) => {
  // SearchForm のフィルターに追加
  const success = searchFormRef.value?.addFilter(fieldPath, value)

  // Close the drawer
  schemaAnalysisDrawerVisible.value = false

  if (success) {
    alert('フィルタを追加しました')
  } else {
    // フィールドが SearchForm にない場合は、直接 payload に追加してフォールバック
    const payload = currentSearchPayload.value || {}
    payload[fieldPath] = { operator: 'is', value }
    currentSearchPayload.value = { ...payload }
    void loadOrders()
    alert('フィルタを追加しました（検索フォーム外）')
  }
}

const tableColumns = computed(() => {
  const actionColumn = {
    key: 'actions',
    dataKey: 'actions',
    title: '操作',
    width: 350,
    fixed: 'right' as const,
    align: 'center' as const,
    cellRenderer: ({ rowData }: { rowData: any }) =>
      h(
        'div',
        { style: 'display:inline-flex;gap:4px;flex-wrap:wrap;' },
        [
          h(
            OButton,
            {
              variant: 'primary',
              size: 'sm',
              onClick: () => handleView(rowData),
            },
            () => '詳細',
          ),
          h(
            OButton,
            {
              variant: 'warning',
              size: 'sm',
              disabled: isUnconfirming.value,
              onClick: () => openUnconfirmDialog(rowData),
            },
            () => '確認取消',
          ),
          h(
            OButton,
            {
              variant: 'secondary',
              size: 'sm',
              disabled: isChangingInvoiceType.value,
              onClick: () => openChangeInvoiceTypeDialog(rowData),
            },
            () => '送り状種類変更',
          ),
          h(
            OButton,
            {
              variant: 'success',
              size: 'sm',
              disabled: !canSplitOrder(rowData) || isSplittingOrder.value,
              onClick: () => openSplitOrderDialog(rowData),
            },
            () => '分割',
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
    // Refresh group counts after loading orders
    orderGroupSelectorRef.value?.reloadCounts()
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

onMounted(async () => {
  // 注意：loadOrders() 不在这里调用，由 handleCarriersLoaded() 触发
  await Promise.all([
    loadPrintTemplates(),
    (async () => {
      try {
        products.value = await fetchProducts()
      } catch (e) {
        console.error('Failed to load products:', e)
      }
    })(),
  ])
})
</script>

<style scoped>
.shipment-list {
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

::v-deep(.error-cell) {
  background-color: #ffebee !important;
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

/* OrderGroupSelector tabs 紧贴 table，无间距 */
.table-attached {
  margin-top: 0 !important;
}

.table-attached :deep(.el-table) {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

/* Drawer styles (replaces el-drawer) */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 50%;
  min-width: 400px;
  max-width: 100%;
  height: 100%;
  background: #fff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.drawer-close {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #909399;
  padding: 4px 8px;
}

.drawer-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.o-toggle { position:relative; display:inline-flex; align-items:center; cursor:pointer; }
.o-toggle input { position:absolute; opacity:0; width:0; height:0; }
.o-toggle-slider { width:40px; height:20px; background:var(--o-toggle-off, #ccc); border-radius:10px; transition:0.2s; position:relative; }
.o-toggle-slider::after { content:''; position:absolute; width:16px; height:16px; border-radius:50%; background:#fff; top:2px; left:2px; transition:0.2s; }
.o-toggle input:checked + .o-toggle-slider { background:var(--o-brand-primary, #714B67); }
.o-toggle input:checked + .o-toggle-slider::after { left:22px; }
</style>
