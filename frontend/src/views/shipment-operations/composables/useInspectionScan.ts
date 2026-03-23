import { nextTick } from 'vue'
import type { Ref } from 'vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import type { OrderDocument } from '@/types/order'
import type { Product } from '@/types/product'
import type { InspectionItem, ScannedProductInfo, InspectionState } from './useInspectionState'
import { resolvePdfSource } from '@/utils/print/resolvePrintTemplate'
import { isBuiltInCarrierId } from '@/utils/carrier'
import { isCarrierDeleteError, yamatoB2Unconfirm, changeInvoiceType, splitOrder as splitOrderApi } from '@/api/carrierAutomation'
import type { SplitOrderRequest } from '@/types/carrierAutomation'
import { fetchShipmentOrder, fetchShipmentOrdersByIds, updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { beepSuccess, beepError, beepComplete } from '@/utils/scanBeep'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import type { useInspectionPrint } from '@/composables/useInspectionPrint'
import type InspectionLeftPanel from '../one-by-one/InspectionLeftPanel.vue'

/**
 * 検品スキャンロジックのComposable
 * 检品扫描逻辑的Composable
 *
 * バーコード入力処理、注文/商品マッチング、数量追跡、ビープ音制御を担当
 * 负责条码输入处理、订单/商品匹配、数量追踪、提示音控制
 */
export function useInspectionScan(
  state: InspectionState,
  inspPrint: ReturnType<typeof useInspectionPrint>,
  leftPanelRef: Ref<InstanceType<typeof InspectionLeftPanel> | null>,
  saveOrdersToStorage: () => void,
  addScanHistory: (value: string, result: 'ok' | 'error', detail: string) => void,
  autoPrintEnabled: Ref<boolean>,
  autoAdvanceEnabled: Ref<boolean>,
) {
  const { show: showToast } = useToast()
  const { t } = useI18n()
  const { confirm } = useConfirmDialog()

  // ─── フォーカス制御 / 焦点控制 ────────────────────────────────────────

  /** スキャン入力欄にフォーカス / 聚焦扫描输入框 */
  function focusScanInput() {
    nextTick(() => {
      leftPanelRef.value?.focus()
    })
  }

  // ─── 注文マッチング / 订单匹配 ────────────────────────────────────────

  /** 注文のマッチング値を取得 / 获取订单的匹配值 */
  function getOrderMatchingValues(order: OrderDocument): string[] {
    const values: string[] = []
    if (order.orderNumber) values.push(order.orderNumber)
    if (order.customerManagementNumber) values.push(order.customerManagementNumber)
    if (order.trackingId) values.push(String(order.trackingId))

    if (Array.isArray(order.products)) {
      for (const prod of order.products) {
        const p = prod as any
        const sku = p.inputSku || p.sku || ''
        if (sku) values.push(sku)
        if (p.productSku && p.productSku !== sku) values.push(p.productSku)

        const productData = state.productCache.get(p.productSku || sku)
        if (productData && Array.isArray(productData.subSkus)) {
          for (const sub of productData.subSkus) {
            if (sub?.subSku && sub.isActive !== false) values.push(sub.subSku)
          }
        }

        if (Array.isArray(p.barcode)) {
          for (const bc of p.barcode) { if (bc) values.push(String(bc)) }
        } else {
          const pd = state.productCache.get(p.productSku || sku)
          if (pd && Array.isArray(pd.barcode)) {
            for (const bc of pd.barcode) { if (bc) values.push(String(bc)) }
          }
        }
      }
    }
    return values
  }

  // ─── 商品マッチング / 商品匹配 ────────────────────────────────────────

  /** 検品アイテムのマッチング値を取得 / 获取检品项的匹配值 */
  function getItemMatchingValues(item: InspectionItem): string[] {
    const values: string[] = []
    if (item.sku) values.push(item.sku)
    if (item.barcodes.length > 0) {
      for (const bc of item.barcodes) { if (bc) values.push(bc) }
    }
    const pd = item.productData
    if (pd) {
      if (Array.isArray(pd.subSkus)) {
        for (const sub of pd.subSkus) {
          if (sub?.subSku && sub.isActive !== false) values.push(sub.subSku)
        }
      }
      if (Array.isArray(pd.barcode)) {
        for (const bc of pd.barcode) { if (bc) values.push(String(bc)) }
      }
    }
    return values
  }

  // ─── 検品アイテム初期化 / 检品项初始化 ────────────────────────────────

  /** 現在の注文から検品アイテムを初期化 / 从当前订单初始化检品项 */
  function initializeInspectionItems() {
    if (!state.currentOrder.value) return
    const items: InspectionItem[] = []
    if (Array.isArray(state.currentOrder.value.products)) {
      state.currentOrder.value.products.forEach((prod: any, idx: number) => {
        const sku = prod.inputSku || prod.sku || ''
        const pd = state.productCache.get(sku)
        const barcodes: string[] = []
        if (Array.isArray(prod.barcode)) {
          for (const bc of prod.barcode) { if (bc) barcodes.push(String(bc)) }
        } else if (pd && Array.isArray(pd.barcode)) {
          for (const bc of pd.barcode) { if (bc) barcodes.push(String(bc)) }
        }
        const qty = prod.quantity || 1
        items.push({
          productIndex: idx,
          sku,
          name: prod.productName || prod.name || sku,
          barcodes,
          totalQuantity: qty,
          inspectedQuantity: 0,
          remainingQuantity: qty,
          productData: pd || undefined,
        })
      })
    }
    state.inspectionItems.value = items
  }

  // ─── スキャン成功フラッシュ / 扫描成功闪烁 ────────────────────────────

  /** スキャン成功時のフラッシュエフェクト / 扫描成功时的闪烁效果 */
  function triggerScanFlash() {
    state.scanSuccessFlash.value = true
    setTimeout(() => { state.scanSuccessFlash.value = false }, 600)
  }

  // ─── 入力ハンドラ / 输入处理 ──────────────────────────────────────────

  /** メイン入力ハンドラ / 主输入处理 */
  function handleInput() {
    const input = state.inputValue.value.trim()
    if (!input) return
    state.inputValue.value = ''

    if (state.mode.value === 'order') {
      handleOrderMatch(input)
    } else {
      handleProductMatch(input)
    }
  }

  /** 注文スキャンマッチング / 订单扫描匹配 */
  function handleOrderMatch(input: string) {
    if (state.pendingOrders.value.length === 0) {
      showToast(t('wms.inspection.noPendingOrders', '処理待ちの注文がありません'), 'warning')
      return
    }

    let matched: OrderDocument | null = null
    for (const order of state.pendingOrders.value) {
      const vals = getOrderMatchingValues(order)
      if (vals.includes(input)) {
        matched = order
        break
      }
    }

    if (!matched) {
      addScanHistory(input, 'error', 'not found')
      showToast(t('wms.inspection.noMatchingOrder', 'マッチする注文が見つかりません') + `: ${input}`, 'danger')
      focusScanInput()
      return
    }

    state.currentOrder.value = matched
    state.mode.value = 'product'
    state.lastScannedProduct.value = null
    initializeInspectionItems()
    focusScanInput()

    tryAutoProductMatch(input)
  }

  /** 注文スキャン時の自動商品マッチング / 订单扫描时的自动商品匹配 */
  function tryAutoProductMatch(input: string) {
    for (const item of state.inspectionItems.value) {
      if (item.remainingQuantity <= 0) continue
      const vals = getItemMatchingValues(item)
      if (vals.includes(input)) {
        item.inspectedQuantity++
        item.remainingQuantity--
        state.lastScannedProduct.value = { sku: item.sku, name: item.name, barcodes: item.barcodes, imageUrl: item.productData?.imageUrl }
        addScanHistory(input, 'ok', `${item.name} x${item.inspectedQuantity}`)
        beepSuccess()
        triggerScanFlash()
        checkCompletion()
        return
      }
    }
  }

  /** 商品スキャンマッチング / 商品扫描匹配 */
  function handleProductMatch(input: string) {
    let matched: InspectionItem | null = null
    for (const item of state.inspectionItems.value) {
      if (item.remainingQuantity <= 0) continue
      const vals = getItemMatchingValues(item)
      if (vals.includes(input)) {
        matched = item
        break
      }
    }

    if (!matched) {
      addScanHistory(input, 'error', 'not found')
      beepError()
      state.wrongScanValue.value = input
      state.wrongScanDialogVisible.value = true
      focusScanInput()
      return
    }

    matched.inspectedQuantity++
    matched.remainingQuantity--
    state.lastScannedProduct.value = { sku: matched.sku, name: matched.name, barcodes: matched.barcodes, imageUrl: matched.productData?.imageUrl }
    addScanHistory(input, 'ok', `${matched.name} x${matched.inspectedQuantity}`)
    beepSuccess()
    triggerScanFlash()
    focusScanInput()
    checkCompletion()
  }

  // ─── 検品完了処理 / 检品完成处理 ──────────────────────────────────────

  /** 全商品の検品完了チェック / 全部商品检品完成检查 */
  async function checkCompletion() {
    const allDone = state.inspectionItems.value.every(item => item.remainingQuantity === 0)
    if (!allDone) return

    // 検品完了チャイム / 检品完成提示音
    beepComplete()

    const alreadyPrinted = !!(state.currentOrder.value as any)?.statusPrinted

    if (alreadyPrinted) {
      try {
        if (!(await confirm('この操作を実行しますか？'))) return
        if (autoPrintEnabled.value) {
          triggerAutoPrint()
        } else {
          state.completionDialogVisible.value = true
        }
      } catch {
        inspPrint.markOrderInspectedOnly(state.currentOrder.value!).then(() => {
          finishCurrentOrder()
        })
      }
      return
    }

    if (autoPrintEnabled.value) {
      triggerAutoPrint()
    } else {
      state.completionDialogVisible.value = true
    }
  }

  /** 自動印刷トリガー / 触发自动打印 */
  async function triggerAutoPrint() {
    if (!state.currentOrder.value) return

    const pdfSource = resolvePdfSource(state.currentOrder.value.carrierId, state.currentOrder.value.invoiceType, {
      carriers: state.carriers.value,
      carrierAutomationConfig: state.carrierAutomationConfigCache.value,
    })

    try {
      if (pdfSource === 'b2-webapi') {
        if (!state.currentOrder.value.trackingId) {
          showToast(t('wms.inspection.noTrackingNumber', '追跡番号がありません（B2 CloudからPDFを取得できません）'), 'danger')
          state.completionDialogVisible.value = true
          return
        }
        await inspPrint.printFromB2WebApi(state.currentOrder.value)
        await inspPrint.markOrderCompleted(state.currentOrder.value)
        finishCurrentOrder()
      } else {
        await inspPrint.renderPrintPreview(state.currentOrder.value, state.getPrintContext())
        if (inspPrint.printImageUrl.value && inspPrint.printTemplate.value && state.currentOrder.value) {
          await inspPrint.executePrint(state.currentOrder.value)
          await inspPrint.markOrderCompleted(state.currentOrder.value)
          finishCurrentOrder()
        } else {
          state.completionDialogVisible.value = true
        }
      }
    } catch (e: any) {
      // 自動印刷失敗 / 自动打印失败
      showToast(t('wms.inspection.autoPrintFailed', '自動印刷に失敗しました') + `: ${e?.message || String(e)}`, 'danger')
      state.completionDialogVisible.value = true
    }
  }

  /** 現在の注文を完了として処理 / 将当前订单标记为完成 */
  function finishCurrentOrder() {
    if (state.currentOrder.value?._id) {
      const orderId = String(state.currentOrder.value._id)
      state.pendingOrders.value = state.pendingOrders.value.filter(o => String(o._id) !== orderId)
      if (!state.processedOrderIds.value.includes(orderId)) {
        state.processedOrderIds.value.push(orderId)
      }
      saveOrdersToStorage()
    }

    inspPrint.cleanupPrintImage()
    state.completionDialogVisible.value = false
    state.lastScannedProduct.value = null

    // 分割注文キューの処理 / 处理分割订单队列
    if (state.splitOrderQueue.value.length > 0) {
      const nextId = state.splitOrderQueue.value.shift()!
      const nextOrder = state.pendingOrders.value.find(o => String(o._id) === nextId)
      if (nextOrder) {
        state.currentOrder.value = nextOrder
        state.mode.value = 'product'
        initializeInspectionItems()
        showToast(t('wms.inspection.autoMovedToSplitOrder', '分割注文に自動移動しました') + `: ${nextOrder.orderNumber || nextId}`, 'info')
        focusScanInput()
        return
      }
    }

    // 自動次注文移動 / 自动切换到下一个待检订单
    if (autoAdvanceEnabled.value && state.pendingOrders.value.length > 0) {
      const nextOrder = state.pendingOrders.value[0] ?? null
      state.currentOrder.value = nextOrder
      state.mode.value = 'product'
      initializeInspectionItems()
      showToast(t('wms.inspection.autoAdvancedToNext', '次の注文に自動移動しました') + `: ${nextOrder?.orderNumber || ''}`, 'info')
      focusScanInput()
      return
    }

    if (autoAdvanceEnabled.value && state.pendingOrders.value.length === 0) {
      showToast(t('wms.inspection.allOrdersCompleted', '全注文の検品が完了しました'), 'success')
    }

    state.resetCurrentOrder()
    focusScanInput()
  }

  // ─── 手動印刷ハンドラ / 手动打印处理 ──────────────────────────────────

  /** 印刷ボタンハンドラ / 打印按钮处理 */
  async function handlePrint() {
    if (!state.currentOrder.value) return
    try {
      if (inspPrint.currentPdfSource.value === 'b2-webapi') {
        await inspPrint.printFromB2WebApi(state.currentOrder.value)
      } else {
        await inspPrint.executePrint(state.currentOrder.value)
      }
      await inspPrint.markOrderCompleted(state.currentOrder.value)
      finishCurrentOrder()
    } catch (e: any) {
      showToast(t('wms.inspection.printFailed', '印刷に失敗しました') + `: ${e?.message || String(e)}`, 'danger')
    }
  }

  /** 印刷なしで確認 / 不打印直接确认 */
  async function handleCompletionConfirmNoPrint() {
    await inspPrint.markOrderInspectedOnly(state.currentOrder.value!)
    finishCurrentOrder()
  }

  // ─── 数量調整 / 数量调整 ──────────────────────────────────────────────

  /** セルクリックで調整ダイアログを開く / 点击单元格打开调整对话框 */
  function handleCellClick(row: InspectionItem) {
    state.adjustTarget.value = row
    state.adjustValue.value = row.inspectedQuantity
    state.adjustDialogVisible.value = true
  }

  /** 調整確定 / 确认调整 */
  function handleAdjustConfirm() {
    if (!state.adjustTarget.value) return
    const item = state.adjustTarget.value
    const newInspected = state.adjustValue.value
    item.inspectedQuantity = newInspected
    item.remainingQuantity = item.totalQuantity - newInspected
    state.adjustDialogVisible.value = false
    state.adjustTarget.value = null
    checkCompletion()
  }

  // ─── 確認取消 / 确认取消 ──────────────────────────────────────────────

  /** 確認取消ダイアログを開く / 打开确认取消对话框 */
  function openUnconfirmDialog() {
    state.unconfirmDialogVisible.value = true
  }

  /** 現在の注文を除外してリセット / 移除当前订单并重置 */
  function removeCurrentOrderAndReset() {
    if (state.currentOrder.value?._id) {
      const orderId = String(state.currentOrder.value._id)
      state.pendingOrders.value = state.pendingOrders.value.filter(o => String(o._id) !== orderId)
      state.processedOrderIds.value = state.processedOrderIds.value.filter(id => id !== orderId)
      state.totalOrderCount.value = state.pendingOrders.value.length + state.processedOrderIds.value.length
      saveOrdersToStorage()
    }
    state.resetCurrentOrder()
    focusScanInput()
  }

  /** 確認取消実行 / 执行确认取消 */
  async function handleUnconfirmConfirm(reason: string, skipCarrierDelete = false) {
    if (!state.currentOrder.value?._id) return

    const orderId = String(state.currentOrder.value._id)
    const builtIn = isBuiltInCarrierId(state.currentOrder.value.carrierId)

    state.isUnconfirming.value = true
    try {
      if (builtIn) {
        const result = await yamatoB2Unconfirm([orderId], reason, { skipCarrierDelete })
        if (result.success) {
          let message = t('wms.inspection.confirmCancelled', '確認を取り消しました')
          if (result.carrierDeleteSkipped) {
            message += '（B2 Cloud削除スキップ）'
          } else if (result.b2DeleteResult) {
            message += result.b2DeleteResult.success
              ? `（B2 Cloudから${result.b2DeleteResult.deleted}件削除）`
              : `（B2 Cloud削除失敗: ${result.b2DeleteResult.error}）`
          }
          showToast(message, 'success')
        }
      } else {
        await updateShipmentOrderStatus(orderId, 'unconfirm', 'confirm')
        showToast(t('wms.inspection.confirmCancelled', '確認を取り消しました'), 'success')
      }

      removeCurrentOrderAndReset()
      state.unconfirmDialogVisible.value = false
    } catch (e: any) {
      if (builtIn && isCarrierDeleteError(e)) {
        state.isUnconfirming.value = false
        try {
          if (!(await confirm('B2 Cloud削除をスキップして、ローカルのみ更新しますか？'))) return
          await handleUnconfirmConfirm(reason, true)
          return
        } catch { return }
      }
      showToast(e?.message || t('wms.inspection.unconfirmFailed', '確認取消に失敗しました'), 'danger')
      state.unconfirmDialogVisible.value = false
    } finally {
      state.isUnconfirming.value = false
    }
  }

  // ─── 送り状種類変更 / 送货单类型变更 ──────────────────────────────────

  /** 送り状種類変更ダイアログを開く / 打开送货单类型变更对话框 */
  function openChangeInvoiceTypeDialogFn() {
    if (!state.currentOrder.value) return
    state.changeInvoiceTypeOrders.value = [state.currentOrder.value]
    state.changeInvoiceTypeDialogVisible.value = true
  }

  /** 送り状種類変更実行 / 执行送货单类型变更 */
  async function handleChangeInvoiceTypeConfirm(newInvoiceType: string, skipCarrierDelete = false) {
    if (!state.currentOrder.value?._id) return

    const orderId = String(state.currentOrder.value._id)
    const builtIn = isBuiltInCarrierId(state.currentOrder.value.carrierId)

    state.isChangingInvoiceType.value = true
    try {
      const result = await changeInvoiceType([orderId], newInvoiceType, { skipCarrierDelete })

      if (result.success) {
        let message = t('wms.inspection.invoiceTypeChanged', '送り状種類を変更しました') + `（${result.updatedCount}${t('wms.common.items', '件')}）`
        if (result.resubmittedCount > 0) message += `、${result.resubmittedCount}件をB2 Cloudに再登録`
        if (result.carrierDeleteSkipped) message += '（B2 Cloud削除スキップ）'

        if (builtIn && result.resubmittedCount > 0) {
          showToast(message, 'success')
          state.currentOrder.value = await fetchShipmentOrder(orderId)
          initializeInspectionItems()
          state.changeInvoiceTypeDialogVisible.value = false
          focusScanInput()
          return
        }

        showToast(message, 'success')
        removeCurrentOrderAndReset()
      } else {
        showToast(result.errors?.join(', ') || t('wms.inspection.invoiceTypeChangeFailed', '送り状種類変更に失敗しました'), 'danger')
      }
      state.changeInvoiceTypeDialogVisible.value = false
    } catch (e: any) {
      if (builtIn && isCarrierDeleteError(e)) {
        state.isChangingInvoiceType.value = false
        try {
          if (!(await confirm('B2 Cloud削除をスキップして、ローカルのみ更新しますか？'))) return
          await handleChangeInvoiceTypeConfirm(newInvoiceType, true)
          return
        } catch { return }
      }
      showToast(e?.message || t('wms.inspection.invoiceTypeChangeFailed', '送り状種類変更に失敗しました'), 'danger')
      state.changeInvoiceTypeDialogVisible.value = false
    } finally {
      state.isChangingInvoiceType.value = false
    }
  }

  // ─── 注文分割 / 订单分割 ──────────────────────────────────────────────

  /** 注文分割ダイアログを開く / 打开订单分割对话框 */
  function openSplitOrderDialogFn() {
    if (!state.currentOrder.value) return
    state.splitOrderTarget.value = state.currentOrder.value
    state.splitOrderDialogVisible.value = true
  }

  /** 注文分割実行 / 执行订单分割 */
  async function handleSplitOrderConfirm(request: SplitOrderRequest, skipCarrierDelete = false) {
    const builtIn = isBuiltInCarrierId(state.currentOrder.value?.carrierId)

    state.isSplittingOrder.value = true
    try {
      const result = await splitOrderApi({ ...request, skipCarrierDelete })
      if (result.success) {
        let message = t('wms.inspection.orderSplit', '注文を分割しました') + `（${result.splitOrders.length}${t('wms.common.items', '件')}）`
        if (result.carrierDeleteSkipped) message += '（B2 Cloud削除スキップ）'
        showToast(message, 'success')

        const originalId = String(state.currentOrder.value?._id)
        state.pendingOrders.value = state.pendingOrders.value.filter(o => String(o._id) !== originalId)

        if (builtIn) {
          const newOrderIds = result.splitOrders.map(so => so.orderId)
          let newOrders: OrderDocument[] = []
          if (newOrderIds.length > 0) {
            newOrders = await fetchShipmentOrdersByIds<OrderDocument>(newOrderIds)
            state.pendingOrders.value.push(...newOrders)
          }
          state.totalOrderCount.value = state.pendingOrders.value.length + state.processedOrderIds.value.length
          saveOrdersToStorage()

          if (newOrders.length > 0) {
            state.currentOrder.value = newOrders[0]!
            state.mode.value = 'product'
            state.lastScannedProduct.value = null
            initializeInspectionItems()
            state.splitOrderQueue.value = newOrders.slice(1).map(o => String(o._id))
            focusScanInput()
          } else {
            state.resetCurrentOrder()
          }
        } else {
          state.totalOrderCount.value = state.pendingOrders.value.length + state.processedOrderIds.value.length
          saveOrdersToStorage()
          state.resetCurrentOrder()
          focusScanInput()
        }
      } else {
        showToast(result.errors?.join(', ') || t('wms.inspection.orderSplitFailed', '注文分割に失敗しました'), 'danger')
      }
      state.splitOrderDialogVisible.value = false
    } catch (e: any) {
      if (builtIn && isCarrierDeleteError(e)) {
        state.isSplittingOrder.value = false
        try {
          if (!(await confirm('B2 Cloud削除をスキップして続行しますか？'))) return
          await handleSplitOrderConfirm(request, true)
          return
        } catch { return }
      }
      showToast(e?.message || t('wms.inspection.orderSplitFailed', '注文分割に失敗しました'), 'danger')
      state.splitOrderDialogVisible.value = false
    } finally {
      state.isSplittingOrder.value = false
    }
  }

  // ─── Fキーアクション / F键操作 ────────────────────────────────────────

  /** 直前のスキャンを取り消す / 撤销上一次扫描 */
  function fkeyUndoLastScan() {
    if (!state.lastScannedProduct.value || state.mode.value !== 'product') return
    const lastSku = state.lastScannedProduct.value.sku
    const item = state.inspectionItems.value.find(i => i.sku === lastSku && i.inspectedQuantity > 0)
    if (item) {
      item.inspectedQuantity--
      item.remainingQuantity++
      showToast(t('wms.inspection.undoScanSuccess', '検品を1つ取り消しました') + `: ${item.name}`, 'info')
    }
    state.lastScannedProduct.value = null
    focusScanInput()
  }

  /** 現在の注文をクリア / 清除当前订单 */
  function fkeyClearCurrentOrder() {
    if (!state.currentOrder.value) return
    state.resetCurrentOrder()
    focusScanInput()
    showToast(t('wms.inspection.orderCleared', '注文をクリアしました'), 'info')
  }

  /** 数量修正ダイアログを開く / 打开数量修正对话框 */
  function fkeyAdjustQuantity() {
    if (!state.lastScannedProduct.value || state.mode.value !== 'product') return
    const item = state.inspectionItems.value.find(i => i.sku === state.lastScannedProduct.value!.sku)
    if (!item) return
    state.adjustTarget.value = item
    state.adjustValue.value = item.inspectedQuantity
    state.adjustDialogVisible.value = true
  }

  /**
   * 現在の注文をスキップして次の未検品注文へ移動
   * 跳过当前订单，移动到下一个未检品订单
   */
  function fkeySkipToNext() {
    if (state.pendingOrders.value.length <= 1) {
      showToast(t('wms.inspection.noMoreOrders', '次の未検品注文がありません'), 'warning')
      return
    }
    if (state.currentOrder.value) {
      const currentId = String(state.currentOrder.value._id)
      const idx = state.pendingOrders.value.findIndex(o => String(o._id) === currentId)
      if (idx >= 0) {
        const [skipped] = state.pendingOrders.value.splice(idx, 1)
        if (skipped) state.pendingOrders.value.push(skipped)
      }
    }
    const next = state.pendingOrders.value[0] ?? null
    state.currentOrder.value = next
    state.mode.value = 'product'
    initializeInspectionItems()
    showToast(t('wms.inspection.skippedToNext', 'スキップしました') + `: ${next?.orderNumber || ''}`, 'info')
    focusScanInput()
  }

  /**
   * 現在の注文を手動で検品完了にする / 手动将当前订单标记为检品完成
   */
  async function fkeyManualComplete() {
    if (!state.currentOrder.value) return
    try {
      if (!(await confirm('この操作を実行しますか？'))) return
    } catch { return }
    for (const item of state.inspectionItems.value) {
      item.inspectedQuantity = item.totalQuantity
    }
    checkCompletion()
  }

  return {
    // フォーカス / 焦点
    focusScanInput,

    // 初期化 / 初始化
    initializeInspectionItems,

    // 入力ハンドラ / 输入处理
    handleInput,
    handleOrderMatch,
    handleProductMatch,

    // 完了処理 / 完成处理
    checkCompletion,
    finishCurrentOrder,

    // 印刷 / 打印
    handlePrint,
    handleCompletionConfirmNoPrint,

    // 数量調整 / 数量调整
    handleCellClick,
    handleAdjustConfirm,

    // 確認取消 / 确认取消
    openUnconfirmDialog,
    removeCurrentOrderAndReset,
    handleUnconfirmConfirm,

    // 送り状種類変更 / 送货单类型变更
    openChangeInvoiceTypeDialogFn,
    handleChangeInvoiceTypeConfirm,

    // 注文分割 / 订单分割
    openSplitOrderDialogFn,
    handleSplitOrderConfirm,

    // Fキーアクション / F键操作
    fkeyUndoLastScan,
    fkeyClearCurrentOrder,
    fkeyAdjustQuantity,
    fkeySkipToNext,
    fkeyManualComplete,
  }
}
