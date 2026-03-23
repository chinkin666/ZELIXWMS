import { onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import type { OrderDocument } from '@/types/order'
import { fetchShipmentOrdersByIds, fetchShipmentOrdersPage } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import { fetchProducts } from '@/api/product'
import { fetchPrintTemplates } from '@/api/printTemplates'
import { fetchCarrierAutomationConfig } from '@/api/carrierAutomation'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import type { InspectionState, FKeyDef } from './useInspectionState'
import type { useInspectionPrint } from '@/composables/useInspectionPrint'

/**
 * 検品ページの注文ロード・ナビゲーション・初期化を管理するComposable
 * 检品页面的订单加载、导航、初始化管理Composable
 */
export function useInspectionOrders(
  state: InspectionState,
  inspPrint: ReturnType<typeof useInspectionPrint>,
  saveOrdersToStorage: () => void,
  loadOrdersFromStorage: () => Promise<void>,
  focusScanInput: () => void,
  fKeyDefs: FKeyDef[],
  handleAdjustConfirm: () => void,
) {
  const { show: showToast } = useToast()
  const { t } = useI18n()
  const router = useRouter()
  const route = useRoute()

  // ─── 注文一覧ダイアログ / 订单列表对话框 ─────────────────────────────

  /** 注文一覧ダイアログを開く / 打开订单列表对话框 */
  async function openOrderListDialog() {
    state.orderListDialogVisible.value = true
    if (state.processedOrderIds.value.length > 0) {
      state.loadingProcessedOrders.value = true
      try {
        state.processedOrdersData.value = await fetchShipmentOrdersByIds<OrderDocument>(state.processedOrderIds.value)
      } catch (e) {
        // 処理済み注文読み込み失敗 / 处理完成的订单加载失败
        state.processedOrdersData.value = []
      } finally {
        state.loadingProcessedOrders.value = false
      }
    } else {
      state.processedOrdersData.value = []
    }
  }

  // ─── ナビゲーション / 导航 ────────────────────────────────────────────

  /** 戻る / 返回 */
  function handleGoBack() {
    router.push('/shipment/operations/tasks')
  }

  /** 全クリアして戻る / 全部清除并返回 */
  function handleClear() {
    localStorage.removeItem('oneByOneSelectedOrderIds')
    localStorage.removeItem('oneByOneProcessedOrderIds')
    state.pendingOrders.value = []
    state.processedOrderIds.value = []
    state.resetCurrentOrder()
    state.productCache.clear()
    router.push('/shipment/operations/tasks')
  }

  // ─── Fキーイベント / F键事件 ──────────────────────────────────────────

  /** Fキーダウンハンドラ / F键按下处理 */
  function handleFKeyDown(e: KeyboardEvent) {
    // 数量調整ダイアログ表示中の特別処理 / 数量调整对话框显示时的特殊处理
    if (state.adjustDialogVisible.value) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        state.adjustDialogVisible.value = false
        focusScanInput()
        return
      }
      if (e.key === 'F1') {
        e.preventDefault()
        handleAdjustConfirm()
        return
      }
      return
    }

    const def = fKeyDefs.find(fk => fk.code === e.key)
    if (!def || !def.action) return
    e.preventDefault()
    def.action()
  }

  // ─── ウォッチャー / 监视器 ────────────────────────────────────────────

  /** 数量調整ダイアログのフォーカス制御 / 数量调整对话框的焦点控制 */
  watch(() => state.adjustDialogVisible.value, (v) => {
    if (v) {
      nextTick(() => {
        state.adjustInputRef.value?.focus()
        state.adjustInputRef.value?.select()
      })
    } else {
      focusScanInput()
    }
  })

  /** 完了ダイアログの印刷プレビュー制御 / 完成对话框的打印预览控制 */
  watch(() => state.completionDialogVisible.value, async (v) => {
    if (v && state.currentOrder.value) {
      await inspPrint.renderPrintPreview(state.currentOrder.value, state.getPrintContext())
    } else {
      inspPrint.cleanupPrintImage()
    }
  })

  // ─── ライフサイクル / 生命周期 ────────────────────────────────────────

  /** マウント時の初期化処理 / 挂载时的初始化处理 */
  onMounted(async () => {
    state.orderGroupId.value = (route.query.orderGroupId as string) || null

    // マスタデータの並行読み込み / 主数据并行加载
    try {
      await Promise.all([
        fetchCarriers().then((data) => { state.carriers.value = data }),
        fetchProducts().then((data) => {
          for (const p of data) {
            if (p.sku) state.productCache.set(p.sku, p)
          }
        }),
        fetchPrintTemplates().then((data) => {
          state.printTemplatesCache.value = data
        }),
        fetchCarrierAutomationConfig('yamato-b2')
          .then((data) => { state.carrierAutomationConfigCache.value = data })
          .catch(() => { state.carrierAutomationConfigCache.value = null }),
      ])
    } catch (e) {
      // 初期データ読み込み失敗 / 初始数据加载失败
    }

    // 注文データの読み込み / 订单数据加载
    if (state.orderGroupId.value) {
      try {
        const q: Record<string, any> = {
          'statusConfirmed': { operator: 'is', value: true },
          'statusCarrierReceived': { operator: 'is', value: true },
          'statusShipped': { operator: 'is', value: false },
          'statusInspected': { operator: 'is', value: false },
        }
        if (state.orderGroupId.value !== '__all__') {
          q['orderGroupId'] = { operator: 'is', value: state.orderGroupId.value }
        }
        const result = await fetchShipmentOrdersPage<OrderDocument>({
          page: 1,
          limit: 1000,
          q,
        })
        state.pendingOrders.value = result.items
      } catch (e) {
        // グループ別注文読み込み失敗 / 按组加载订单失败
        showToast(t('wms.inspection.loadOrdersFailed', '注文の読み込みに失敗しました'), 'danger')
      }
    } else {
      try {
        await loadOrdersFromStorage()
      } catch (e: any) {
        showToast(t('wms.inspection.loadOrdersFailed', '保存された注文の読み込みに失敗しました'), 'danger')
      }
    }

    state.totalOrderCount.value = state.pendingOrders.value.length + state.processedOrderIds.value.length

    // 注文がない場合は一覧ページに戻る / 没有订单时返回列表页
    if (state.pendingOrders.value.length === 0 && state.processedOrderIds.value.length === 0) {
      showToast(t('wms.inspection.noOrdersToInspect', '検品対象の注文がありません。一覧ページに戻ります。'), 'warning')
      router.push('/shipment/operations/tasks')
      return
    }

    document.addEventListener('keydown', handleFKeyDown)
    focusScanInput()
  })

  /** アンマウント時のクリーンアップ / 卸载时的清理 */
  onBeforeUnmount(() => {
    const autoPrintTimer = state.getAutoPrintTimer()
    const autoReturnTimer = state.getAutoReturnTimer()
    if (autoPrintTimer) { clearTimeout(autoPrintTimer); state.setAutoPrintTimer(null) }
    if (autoReturnTimer) { clearTimeout(autoReturnTimer); state.setAutoReturnTimer(null) }
    inspPrint.cleanupPrintImage()
    document.removeEventListener('keydown', handleFKeyDown)
  })

  return {
    // 注文一覧 / 订单列表
    openOrderListDialog,

    // ナビゲーション / 导航
    handleGoBack,
    handleClear,

    // Fキーイベント / F键事件
    handleFKeyDown,
  }
}
