import { ref } from 'vue'
import { yamatoB2Unconfirm, changeInvoiceType, splitOrder as splitOrderApi, isCarrierDeleteError } from '@/api/carrierAutomation'
import { isBuiltInCarrierId } from '@/utils/carrier'
import type { OrderDocument } from '@/types/order'
import type { SplitOrderRequest } from '@/types/carrierAutomation'

export function useOrderUnconfirm(
  rows: () => Record<string, any>[],
  tableSelectedKeys: () => Array<string | number>,
  loadOrders: () => Promise<void>,
) {
  // Unconfirm dialog state
  const isUnconfirming = ref(false)
  const unconfirmDialogVisible = ref(false)
  const unconfirmOrderNumber = ref('')
  const unconfirmOrderId = ref('')
  const unconfirmShowManualCarrierWarning = ref(false)
  const batchUnconfirmOrderIds = ref<string[]>([])
  const isBatchUnconfirm = ref(false)

  // Change invoice type dialog state
  const changeInvoiceTypeDialogVisible = ref(false)
  const changeInvoiceTypeOrders = ref<OrderDocument[]>([])
  const isChangingInvoiceType = ref(false)

  // Split order dialog state
  const splitOrderDialogVisible = ref(false)
  const splitOrderTarget = ref<OrderDocument | null>(null)
  const isSplittingOrder = ref(false)

  // B2 delete error handler
  const handleB2DeleteErrorWithRetry = async (
    error: unknown,
    loadingRef: { value: boolean },
    retryFn: () => Promise<void>,
  ): Promise<boolean> => {
    if (!isCarrierDeleteError(error)) return false
    loadingRef.value = false
    if (confirm(`B2 Cloudからの履歴削除に失敗しました。\n\nエラー: ${(error as any).error}\n\nB2 Cloud削除をスキップして、ローカルのみ更新しますか？\n（B2 Cloud側は手動で削除してください）`)) {
      await retryFn()
    }
    return true
  }

  // Open unconfirm dialog (single)
  const openUnconfirmDialog = (row: any) => {
    const id = row?._id
    if (!id) return
    isBatchUnconfirm.value = false
    unconfirmOrderId.value = String(id)
    unconfirmOrderNumber.value = row.orderNumber || String(id)
    unconfirmShowManualCarrierWarning.value = !isBuiltInCarrierId(row.carrierId)
    unconfirmDialogVisible.value = true
  }

  // Open batch unconfirm dialog
  const openBatchUnconfirmDialog = () => {
    const keys = tableSelectedKeys()
    if (keys.length === 0) return
    batchUnconfirmOrderIds.value = keys.map((k) => String(k))
    isBatchUnconfirm.value = true
    unconfirmOrderNumber.value = `${keys.length}件`
    const keySet = new Set(keys.map((k) => String(k)))
    const selectedOrders = rows().filter((r: any) => keySet.has(String(r?._id)))
    unconfirmShowManualCarrierWarning.value = selectedOrders.some((o: any) => !isBuiltInCarrierId(o.carrierId))
    unconfirmDialogVisible.value = true
  }

  // Handle unconfirm confirm (single & batch)
  const handleUnconfirmConfirm = async (reason: string, skipCarrierDelete = false) => {
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
    } catch (e: any) {
      const handled = await handleB2DeleteErrorWithRetry(
        e,
        isUnconfirming,
        () => handleUnconfirmConfirm(reason, true),
      )
      if (!handled) {
        alert(e?.message || '確認取消に失敗しました')
        unconfirmDialogVisible.value = false
      }
    } finally {
      isUnconfirming.value = false
    }
  }

  // Open change invoice type dialog
  const openChangeInvoiceTypeDialog = (row: any) => {
    const id = row?._id
    if (!id) return
    changeInvoiceTypeOrders.value = [row as OrderDocument]
    changeInvoiceTypeDialogVisible.value = true
  }

  // Handle change invoice type confirm
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
        e,
        isChangingInvoiceType,
        () => handleChangeInvoiceTypeConfirm(newInvoiceType, true),
      )
      if (!handled) {
        alert(e?.message || '送り状種類変更に失敗しました')
        changeInvoiceTypeDialogVisible.value = false
      }
    } finally {
      isChangingInvoiceType.value = false
    }
  }

  // Open split order dialog
  const openSplitOrderDialog = (row: any) => {
    const id = row?._id
    if (!id) return
    const totalQty = (row.products || []).reduce(
      (sum: number, p: any) => sum + (p.quantity || 0),
      0,
    )
    if (totalQty <= 1) {
      alert('商品が1つの注文は分割できません')
      return
    }
    splitOrderTarget.value = row as OrderDocument
    splitOrderDialogVisible.value = true
  }

  // Handle split order confirm
  const handleSplitOrderConfirm = async (splitGroups: SplitOrderRequest['splitGroups'], skipCarrierDelete = false) => {
    if (!splitOrderTarget.value) return

    isSplittingOrder.value = true
    try {
      const result = await splitOrderApi(
        { orderId: String(splitOrderTarget.value._id), splitGroups },
        { skipCarrierDelete },
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
        e,
        isSplittingOrder,
        () => handleSplitOrderConfirm(splitGroups, true),
      )
      if (!handled) {
        alert(e?.message || '注文分割に失敗しました')
        splitOrderDialogVisible.value = false
      }
    } finally {
      isSplittingOrder.value = false
    }
  }

  // Check if order can be split
  const canSplitOrder = (row: any): boolean => {
    const totalQty = (row.products || []).reduce(
      (sum: number, p: any) => sum + (p.quantity || 0),
      0,
    )
    return totalQty > 1
  }

  return {
    // Unconfirm
    isUnconfirming,
    unconfirmDialogVisible,
    unconfirmOrderNumber,
    unconfirmShowManualCarrierWarning,
    isBatchUnconfirm,
    openUnconfirmDialog,
    openBatchUnconfirmDialog,
    handleUnconfirmConfirm,

    // Change invoice type
    changeInvoiceTypeDialogVisible,
    changeInvoiceTypeOrders,
    isChangingInvoiceType,
    openChangeInvoiceTypeDialog,
    handleChangeInvoiceTypeConfirm,

    // Split order
    splitOrderDialogVisible,
    splitOrderTarget,
    isSplittingOrder,
    openSplitOrderDialog,
    handleSplitOrderConfirm,
    canSplitOrder,
  }
}
