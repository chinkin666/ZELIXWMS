import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import type { useI18n } from '@/composables/useI18n'

// バッチアクション定義 / バッチアクション定義
export interface BatchAction {
  id: string
  label: string
  icon?: string
  variant?: 'primary' | 'danger' | 'secondary' | 'warning' | 'success'
  position?: 'left' | 'right'
  separated?: boolean
  disabled?: boolean
}

// ハンドラーマップ / ハンドラーマップ
export interface BatchActionHandlers {
  bundleMerge: () => void
  unbundle: () => void
  shipPlanDate: () => void
  senderBulk: () => void
  carrierBulk: () => void
  submit: () => void
  clearSelected: () => void
  holdToggle: () => void
  showErrorDetail: () => void
  deletePending: () => void
  confirmPrintReady: () => void
  reloadPending: () => void
  b2Export: () => void
  carrierExport: () => void
  clearBackendErrors: () => void
  releaseHold: () => void
  deleteHeld: () => void
  exportCsv: () => void
}

// バッチアクションバーの状態依存 / バッチアクションバーの状態依存
export interface BatchBarDeps {
  displayFilter: Ref<'pending_confirm' | 'processing' | 'pending_waybill' | 'held'>
  tableSelectedKeys: Ref<Array<string | number>>
  sortedRows: ComputedRef<UserOrderRow[]>
  bundleModeEnabled: Ref<boolean>
  isSubmitting: Ref<boolean>
  backendErrorCount: ComputedRef<number>
  b2Validating: Ref<boolean>
  isAutoValidating: Ref<boolean>
  b2Exporting: Ref<boolean>
  canSendToB2Cloud: ComputedRef<boolean>
}

/**
 * バッチアクションバーのロジックを管理するComposable
 * バッチアクションバーのロジックを管理するComposable
 */
export function useOrderBatchBar(
  deps: BatchBarDeps,
  handlers: BatchActionHandlers,
  t: ReturnType<typeof useI18n>['t'],
) {
  const {
    displayFilter,
    tableSelectedKeys,
    sortedRows,
    bundleModeEnabled,
    isSubmitting,
    backendErrorCount,
    b2Validating,
    isAutoValidating,
    b2Exporting,
    canSendToB2Cloud,
  } = deps

  // --- CSV/Excel出力ダイアログ / CSV/Excel出力ダイアログ ---
  const customExportDialogVisible = ref(false)
  const customExportOrders = computed(() => {
    if (tableSelectedKeys.value.length > 0) {
      return sortedRows.value.filter(r => tableSelectedKeys.value.includes(r.id))
    }
    return sortedRows.value
  })

  // --- バッチアクション定義 / バッチアクション定義 ---
  const batchActions = computed<BatchAction[]>(() => {
    if (displayFilter.value === 'pending_confirm') {
      if (bundleModeEnabled.value) {
        return [
          { id: 'bundle-merge', label: t('wms.shipmentOrder.bundle', '同梱する'), variant: 'primary' as const },
          { id: 'unbundle', label: t('wms.shipmentOrder.unbundle', '同梱を解除する'), variant: 'warning' as const },
        ]
      }
      const noSel = tableSelectedKeys.value.length === 0
      const actions: BatchAction[] = [
        { id: 'ship-plan-date', label: t('wms.shipmentOrder.shipPlanDateBulkSetting', '出荷予定日一括設定'), variant: 'primary', position: 'left', disabled: noSel },
        { id: 'sender-bulk', label: t('wms.shipmentOrder.senderBulkSetting', 'ご依頼主情報の一括設定'), variant: 'primary', position: 'left', disabled: noSel },
        { id: 'carrier-bulk', label: t('wms.shipmentOrder.carrierBulkSetting', '配送業者一括設定'), variant: 'primary', position: 'left', disabled: noSel },
        { id: 'clear-selected', label: t('wms.common.delete', '削除'), variant: 'danger', position: 'left', disabled: noSel },
        { id: 'export-csv', label: t('wms.shipmentOrder.csvExport', 'CSV出力'), variant: 'secondary', position: 'left' },
        { id: 'hold-toggle', label: t('wms.shipmentOrder.holdToggle', '保留切替'), variant: 'secondary', disabled: noSel },
        { id: 'submit', label: isSubmitting.value ? t('wms.shipmentOrder.confirming', '確認中...') : t('wms.shipmentOrder.confirmShipmentAction', '出荷確認する'), variant: 'primary', separated: true, disabled: noSel || isSubmitting.value },
      ]
      if (backendErrorCount.value > 0) {
        actions.push({ id: 'show-error-detail', label: t('wms.shipmentOrder.errorDetail', 'エラー詳細'), variant: 'danger' })
      }
      return actions
    }
    if (displayFilter.value === 'processing') {
      const noSel = tableSelectedKeys.value.length === 0
      return [
        { id: 'delete-pending', label: t('wms.common.delete', '削除'), variant: 'danger' as const, position: 'left' as const, disabled: noSel },
        { id: 'export-csv', label: t('wms.shipmentOrder.csvExport', 'CSV出力'), variant: 'secondary' as const, position: 'left' as const },
        { id: 'confirm-print-ready', label: (b2Validating.value || isAutoValidating.value) ? t('wms.shipmentOrder.confirming', '確定中...') : t('wms.shipmentOrder.revalidate', '再検証'), variant: 'success' as const, disabled: noSel || b2Validating.value || isAutoValidating.value },
      ]
    }
    if (displayFilter.value === 'pending_waybill') {
      const noSel = tableSelectedKeys.value.length === 0
      return [
        { id: 'delete-pending', label: t('wms.common.delete', '削除'), icon: 'delete', variant: 'danger' as const, position: 'left' as const, disabled: noSel },
        { id: 'export-csv', label: t('wms.shipmentOrder.csvExport', 'CSV出力'), variant: 'secondary' as const, position: 'left' as const },
        { id: 'b2-export', label: b2Exporting.value ? t('wms.shipmentOrder.processing', '処理中...') : t('wms.shipmentOrder.b2CloudCreateSlip', 'B2 Cloudで伝票作成'), variant: 'success' as const, disabled: !canSendToB2Cloud.value || b2Exporting.value },
        { id: 'carrier-export', label: t('wms.shipmentOrder.carrierDataExport', '配送業者データ出力'), variant: 'primary' as const, disabled: noSel },
      ]
    }
    if (displayFilter.value === 'held') {
      const noSel = tableSelectedKeys.value.length === 0
      return [
        { id: 'delete-held', label: t('wms.common.delete', '削除'), variant: 'danger' as const, position: 'left' as const, disabled: noSel },
        { id: 'export-csv', label: t('wms.shipmentOrder.csvExport', 'CSV出力'), variant: 'secondary' as const, position: 'left' as const },
        { id: 'release-hold', label: t('wms.shipmentOrder.releaseHold', '保留解除'), variant: 'primary' as const, disabled: noSel },
      ]
    }
    return []
  })

  // --- バッチアクションディスパッチ / バッチアクションディスパッチ ---
  const handleBatchAction = (actionId: string) => {
    switch (actionId) {
      case 'bundle-merge': handlers.bundleMerge(); break
      case 'unbundle': handlers.unbundle(); break
      case 'ship-plan-date': handlers.shipPlanDate(); break
      case 'sender-bulk': handlers.senderBulk(); break
      case 'carrier-bulk': handlers.carrierBulk(); break
      case 'submit': handlers.submit(); break
      case 'clear-selected': handlers.clearSelected(); break
      case 'hold-toggle': handlers.holdToggle(); break
      case 'show-error-detail': handlers.showErrorDetail(); break
      case 'delete-pending': handlers.deletePending(); break
      case 'confirm-print-ready': handlers.confirmPrintReady(); break
      case 'reload-pending': handlers.reloadPending(); break
      case 'b2-export': handlers.b2Export(); break
      case 'carrier-export': handlers.carrierExport(); break
      case 'clear-backend-errors': handlers.clearBackendErrors(); break
      case 'release-hold': handlers.releaseHold(); break
      case 'delete-held': handlers.deleteHeld(); break
      case 'export-csv': customExportDialogVisible.value = true; break
    }
  }

  // --- 全選択 / 全選択 ---
  const handleSelectAll = () => {
    tableSelectedKeys.value = sortedRows.value.map((r) => r.id)
  }

  return {
    batchActions,
    handleBatchAction,
    handleSelectAll,
    customExportDialogVisible,
    customExportOrders,
  }
}
