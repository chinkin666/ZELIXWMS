/**
 * 出荷指示作成画面 — バッチアクション集約コンポーザブル
 * 出货指示创建画面 — 批量操作聚合composable
 *
 * 同梱・一括設定（依頼主/配送業者/出荷予定日）・保留・削除・バッチアクションバーを統合。
 * 整合同捆/批量设置（发件人/配送业者/出货预定日）/保留/删除/批量操作工具栏。
 */
import { computed, type Ref, type ComputedRef } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { useToast } from '@/composables/useToast'
import type { useI18n } from '@/composables/useI18n'
import { useOrderBulkActions } from '../composables/useOrderBulkActions'
import { useOrderDelete } from '../composables/useOrderDelete'
import { useOrderHold } from '../composables/useOrderHold'
import { useOrderBundle } from '../composables/useOrderBundle'
import { useOrderBatchBar } from '../composables/useOrderBatchBar'

/** 依存パラメータ型定義 / 依赖参数类型定义 */
export interface ShipmentCreateBatchActionsDeps {
  // データソース / 数据源
  allRows: Ref<UserOrderRow[]>
  heldRowIds: Ref<(string | number)[]>
  tableSelectedKeys: Ref<Array<string | number>>
  sortedRows: ComputedRef<UserOrderRow[]>
  filteredRows: ComputedRef<UserOrderRow[]>
  displayRows: ComputedRef<UserOrderRow[]>
  pendingWaybillRows: Ref<UserOrderRow[]>
  orderSourceCompanies: Ref<OrderSourceCompany[]>
  displayFilter: Ref<'pending_confirm' | 'processing' | 'pending_waybill' | 'held'>

  // 外部ステート（submit / B2 Cloud 由来）/ 外部状态（来自 submit / B2 Cloud）
  isSubmitting: Ref<boolean>
  backendErrorCount: ComputedRef<number>
  b2Validating: Ref<boolean>
  isAutoValidating: Ref<boolean>
  b2Exporting: Ref<boolean>
  canSendToB2Cloud: ComputedRef<boolean>
  submitErrorDialogVisible: Ref<boolean>

  // コールバック / 回调函数
  saveHeldIds: (ids: (string | number)[]) => void
  saveStorage: (rows: UserOrderRow[], heldIds: (string | number)[]) => void
  loadPendingWaybillOrders: () => void | Promise<void>
  handleSubmitClick: () => void
  handleConfirmPrintReady: () => void
  handleB2Export: () => void
  handleCarrierExport: () => void
  clearBackendErrors: () => void
  handleReleaseHold: () => void
}

export function useShipmentCreateBatchActions(
  deps: ShipmentCreateBatchActionsDeps,
  toast: ReturnType<typeof useToast>,
  t: ReturnType<typeof useI18n>['t'],
) {
  const {
    allRows, heldRowIds, tableSelectedKeys, sortedRows, filteredRows, displayRows,
    pendingWaybillRows, orderSourceCompanies, displayFilter,
    isSubmitting, backendErrorCount, b2Validating, isAutoValidating, b2Exporting, canSendToB2Cloud,
    submitErrorDialogVisible,
    saveHeldIds, saveStorage, loadPendingWaybillOrders,
    handleSubmitClick, handleConfirmPrintReady, handleB2Export, handleCarrierExport,
    clearBackendErrors, handleReleaseHold,
  } = deps

  // ========================================
  // 同梱（バンドル）操作 / 同捆（捆绑）操作
  // ========================================
  const bundle = useOrderBundle(
    allRows,
    filteredRows,
    displayRows,
    computed({
      get: () => tableSelectedKeys.value,
      set: (v) => { tableSelectedKeys.value = v },
    }) as any,
    displayFilter,
    toast,
  )

  // ========================================
  // 一括設定（依頼主・配送業者・出荷予定日）
  // 批量设置（发件人/配送业者/出货预定日）
  // ========================================
  const bulk = useOrderBulkActions(
    allRows,
    tableSelectedKeys,
    orderSourceCompanies,
    saveStorage,
    heldRowIds,
    toast,
  )

  // ========================================
  // 保留操作 / 保留操作
  // ========================================
  const hold = useOrderHold(
    allRows,
    pendingWaybillRows,
    tableSelectedKeys,
    (_rows: UserOrderRow[], hIds: (string | number)[]) => { saveHeldIds(hIds) },
    loadPendingWaybillOrders,
    toast,
  )

  // ========================================
  // 削除操作 / 删除操作
  // ========================================
  const del = useOrderDelete(
    allRows,
    pendingWaybillRows,
    tableSelectedKeys,
    heldRowIds,
    (ids: (string | number)[]) => saveHeldIds(ids),
    sortedRows,
    loadPendingWaybillOrders,
    toast,
  )

  // ========================================
  // バッチアクションバー（ボトムバー）
  // 批量操作工具栏（底部栏）
  // ========================================
  const batchBar = useOrderBatchBar(
    {
      displayFilter,
      tableSelectedKeys,
      sortedRows,
      bundleModeEnabled: bundle.bundleModeEnabled,
      isSubmitting: computed(() => isSubmitting.value),
      backendErrorCount,
      b2Validating: computed(() => b2Validating.value),
      isAutoValidating: computed(() => isAutoValidating.value),
      b2Exporting: computed(() => b2Exporting.value),
      canSendToB2Cloud,
    },
    {
      bundleMerge: () => bundle.handleBundleMergeAllSelected(),
      unbundle: () => bundle.handleUnbundleSelected(),
      shipPlanDate: () => { bulk.shipPlanDateDialogVisible.value = true },
      senderBulk: () => { bulk.senderBulkDialogVisible.value = true },
      carrierBulk: () => { bulk.carrierBulkDialogVisible.value = true },
      submit: () => handleSubmitClick(),
      clearSelected: () => del.handleBatchDeleteFromBar(),
      holdToggle: () => hold.toggleHoldSelected(),
      showErrorDetail: () => { submitErrorDialogVisible.value = true },
      deletePending: () => del.handleDeletePending(),
      confirmPrintReady: () => handleConfirmPrintReady(),
      reloadPending: () => loadPendingWaybillOrders(),
      b2Export: () => handleB2Export(),
      carrierExport: () => handleCarrierExport(),
      clearBackendErrors: () => clearBackendErrors(),
      releaseHold: () => handleReleaseHold(),
      deleteHeld: () => del.handleDeleteHeld(),
      exportCsv: () => { /* バッチバー内部で処理 / 在批量栏内部处理 */ },
    },
    t,
  )

  return {
    // --- 同梱 / 同捆 ---
    bundleFilterKeys: bundle.bundleFilterKeys,
    bundleModeEnabled: bundle.bundleModeEnabled,
    showBundleFilterDialog: bundle.showBundleFilterDialog,
    bundleFilterFields: bundle.bundleFilterFields,
    bundleFilterLabels: bundle.bundleFilterLabels,
    isBundleable: bundle.isBundleable,
    hasUnbundleableRows: bundle.hasUnbundleableRows,
    selectedBundleGroupKeys: bundle.selectedBundleGroupKeys,
    handleBundleMergeAllSelected: bundle.handleBundleMergeAllSelected,
    handleUnbundleSelected: bundle.handleUnbundleSelected,
    handleOpenBundleList: bundle.handleOpenBundleList,
    handleExitBundleMode: bundle.handleExitBundleMode,
    handleBundleFilterSave: bundle.handleBundleFilterSave,
    handleBundleFilterUpdate: bundle.handleBundleFilterUpdate,
    restoreBundleCookies: bundle.restoreFromCookies,

    // --- 一括設定ダイアログ状態 / 批量设置对话框状态 ---
    senderBulkDialogVisible: bulk.senderBulkDialogVisible,
    senderBulkCompanyId: bulk.senderBulkCompanyId,
    senderBulkOverwriteBaseNo: bulk.senderBulkOverwriteBaseNo,
    carrierBulkDialogVisible: bulk.carrierBulkDialogVisible,
    carrierBulkId: bulk.carrierBulkId,
    shipPlanDateDialogVisible: bulk.shipPlanDateDialogVisible,
    shipPlanDateSelected: bulk.shipPlanDateSelected,
    todayDate: bulk.todayDate,
    applyShipPlanDateToSelected: bulk.applyShipPlanDateToSelected,
    applySenderBulkCompany: bulk.applySenderBulkCompany,
    applyCarrierBulk: bulk.applyCarrierBulk,

    // --- 保留 / 保留 ---
    isHeld: hold.isHeld,
    pendingConfirmCount: hold.pendingConfirmCount,
    totalHeldCount: hold.totalHeldCount,
    processingNonHeldCount: hold.processingNonHeldCount,
    pendingWaybillNonHeldCount: hold.pendingWaybillNonHeldCount,
    toggleHoldSelected: hold.toggleHoldSelected,

    // --- 削除 / 删除 ---
    deleteDialogOpen: del.deleteDialogOpen,
    deleteDialogMessage: del.deleteDialogMessage,
    confirmDelete: del.confirmDelete,
    handleBatchDeleteFromBar: del.handleBatchDeleteFromBar,
    handleDeletePending: del.handleDeletePending,
    handleDeleteHeld: del.handleDeleteHeld,

    // --- バッチアクションバー / 批量操作工具栏 ---
    batchActions: batchBar.batchActions,
    handleBatchAction: batchBar.handleBatchAction,
    handleSelectAll: batchBar.handleSelectAll,
    customExportDialogVisible: batchBar.customExportDialogVisible,
    customExportOrders: batchBar.customExportOrders,
  }
}
