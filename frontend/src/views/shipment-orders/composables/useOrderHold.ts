import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import { updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import type { useToast } from '@/composables/useToast'

export function useOrderHold(
  allRows: Ref<UserOrderRow[]>,
  pendingWaybillRows: Ref<UserOrderRow[]>,
  tableSelectedKeys: Ref<Array<string | number>>,
  saveStorage: (rows: UserOrderRow[], heldIds: (string | number)[]) => void,
  loadPendingWaybillOrders: () => Promise<void>,
  toast: ReturnType<typeof useToast>,
) {
  const heldRowIds = ref<(string | number)[]>([])

  // 行が保留中か確認（ローカル保留リストまたはバックエンドのステータスを確認）
  const isHeld = (id: string | number) => {
    if (heldRowIds.value.includes(id)) return true
    const pwRow = pendingWaybillRows.value.find(r => r.id === id)
    if (pwRow && (pwRow as any).status?.held?.isHeld) return true
    return false
  }

  // 非保留行（ローカル行のみ）
  const nonHeldRows = computed(() =>
    allRows.value.filter((r) => !isHeld(r.id))
  )

  // 出荷確認まち件数（新規 + エラー、保留除外）
  const pendingConfirmCount = computed(() => nonHeldRows.value.length)

  // 保留件数合計（ローカル + バックエンド、重複排除）
  const totalHeldCount = computed(() => {
    const localIds = new Set(heldRowIds.value)
    const backendOnlyCount = pendingWaybillRows.value.filter((r: any) =>
      r.status?.held?.isHeld && !localIds.has(r.id)
    ).length
    return localIds.size + backendOnlyCount
  })

  // 処理中の非保留件数（未確定）
  const processingNonHeldCount = computed(() =>
    pendingWaybillRows.value.filter((r: any) =>
      !r.status?.held?.isHeld && !r.status?.confirm?.isConfirmed
    ).length
  )

  // 送り状未発行の件数（確定済み & trackingId 未設定 & 保留なし）
  const pendingWaybillNonHeldCount = computed(() =>
    pendingWaybillRows.value.filter((r: any) =>
      !r.status?.held?.isHeld && r.status?.confirm?.isConfirmed && !r.trackingId
    ).length
  )

  // 選択中の行の保留状態をトグル
  const toggleHoldSelected = async () => {
    if (tableSelectedKeys.value.length === 0) {
      toast.showWarning('保留する行を選択してください')
      return
    }

    // バックエンド注文（_idあり）とローカル行を分類
    const backendIds: string[] = []
    const localIds: (string | number)[] = []
    for (const id of tableSelectedKeys.value) {
      const isPendingWaybill = pendingWaybillRows.value.some(r => r.id === id)
      if (isPendingWaybill) {
        backendIds.push(String(id))
      } else {
        localIds.push(id)
      }
    }

    // ローカル行の保留処理（不変パターン）
    if (localIds.length > 0) {
      const currentSet = new Set(heldRowIds.value)
      const allHeld = localIds.every(id => currentSet.has(id))
      const localSet = new Set(localIds)
      heldRowIds.value = allHeld
        ? heldRowIds.value.filter(id => !localSet.has(id))
        : [...new Set([...heldRowIds.value, ...localIds])]
      saveStorage(allRows.value, heldRowIds.value)
    }

    // バックエンド注文の保留処理
    if (backendIds.length > 0) {
      const allBackendHeld = backendIds.every(id => {
        const row = pendingWaybillRows.value.find(r => r.id === id)
        return row && (row as any).status?.held?.isHeld
      })
      const action = allBackendHeld ? 'unhold' : 'mark-held'
      try {
        await updateShipmentOrderStatusBulk(backendIds, action)
        await loadPendingWaybillOrders()
      } catch (err) {
        // 保留状態の更新失敗 / Failed to update hold status
        toast.showError('保留状態の更新に失敗しました')
      }
    }

    tableSelectedKeys.value = []
  }

  return {
    heldRowIds,
    isHeld,
    nonHeldRows,
    pendingConfirmCount,
    totalHeldCount,
    processingNonHeldCount,
    pendingWaybillNonHeldCount,
    toggleHoldSelected,
  }
}
