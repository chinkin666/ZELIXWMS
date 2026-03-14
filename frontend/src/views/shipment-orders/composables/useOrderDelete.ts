import { ref } from 'vue'
import type { Ref } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import { deleteShipmentOrdersBulk } from '@/api/shipmentOrders'

export function useOrderDelete(
  allRows: Ref<UserOrderRow[]>,
  pendingWaybillRows: Ref<UserOrderRow[]>,
  tableSelectedKeys: Ref<(string | number)[]>,
  heldRowIds: Ref<(string | number)[]>,
  setHeldIds: (ids: (string | number)[]) => void,
  sortedRows: Ref<UserOrderRow[]>,
  loadPendingWaybillOrders: () => Promise<void>,
  toast: { showSuccess: (msg: string) => void; showWarning: (msg: string) => void; showError: (msg: string) => void },
) {
  const deleteDialogOpen = ref(false)
  const deleteTarget = ref<{ type: 'single'; row: UserOrderRow } | { type: 'batch'; keys: Set<string | number>; count: number } | null>(null)
  const deleteDialogMessage = ref('')

  const handleDelete = (row: UserOrderRow) => {
    deleteTarget.value = { type: 'single', row }
    deleteDialogMessage.value = `「${row.customerManagementNumber || row.orderNumber || row.id}」を削除しますか？`
    deleteDialogOpen.value = true
  }

  const confirmDelete = () => {
    if (!deleteTarget.value) return
    if (deleteTarget.value.type === 'single') {
      const { row } = deleteTarget.value
      allRows.value = allRows.value.filter(r => r.id !== row.id)
    } else {
      const { keys } = deleteTarget.value
      allRows.value = allRows.value.filter(r => !keys.has(r.id))
      tableSelectedKeys.value = []
    }
    deleteDialogOpen.value = false
    deleteTarget.value = null
  }

  const handleBatchDeleteFromBar = () => {
    if (tableSelectedKeys.value.length === 0) return
    deleteTarget.value = { type: 'batch', keys: new Set(tableSelectedKeys.value), count: tableSelectedKeys.value.length }
    deleteDialogMessage.value = `選択した${tableSelectedKeys.value.length}件の出荷指示を削除しますか？`
    deleteDialogOpen.value = true
  }

  const handleDeletePending = async () => {
    if (tableSelectedKeys.value.length === 0) {
      toast.showWarning('削除する行を選択してください')
      return
    }
    if (!confirm(`選択した${tableSelectedKeys.value.length}件の出荷指示を削除しますか？\nこの操作は元に戻せません。`)) return

    const ids = sortedRows.value
      .filter((row) => tableSelectedKeys.value.includes(row.id))
      .map((row) => String((row as any)._id || row.id))
      .filter(Boolean)

    try {
      const result = await deleteShipmentOrdersBulk(ids)
      toast.showSuccess(`${result.deletedCount}件の出荷指示を削除しました`)
      tableSelectedKeys.value = []
      await loadPendingWaybillOrders()
    } catch (e: any) {
      toast.showError(e?.message || '削除に失敗しました')
    }
  }

  const handleDeleteHeld = async () => {
    if (tableSelectedKeys.value.length === 0) {
      toast.showWarning('削除する行を選択してください')
      return
    }
    const backendIds: string[] = []
    const localIds: (string | number)[] = []
    for (const id of tableSelectedKeys.value) {
      const isPendingWaybill = pendingWaybillRows.value.some(r => r.id === id)
      if (isPendingWaybill) {
        const row = pendingWaybillRows.value.find(r => r.id === id)
        if (row) backendIds.push(String((row as any)._id || row.id))
      } else {
        localIds.push(id)
      }
    }
    if (localIds.length > 0) {
      const localSet = new Set(localIds)
      allRows.value = allRows.value.filter((r) => !localSet.has(r.id))
      heldRowIds.value = heldRowIds.value.filter(id => !localSet.has(id))
      setHeldIds(heldRowIds.value)
    }
    if (backendIds.length > 0) {
      try {
        await deleteShipmentOrdersBulk(backendIds)
        await loadPendingWaybillOrders()
      } catch (e: any) {
        toast.showError(e?.message || '削除に失敗しました')
        return
      }
    }
    const count = tableSelectedKeys.value.length
    tableSelectedKeys.value = []
    toast.showSuccess(`${count}件を削除しました`)
  }

  return {
    deleteDialogOpen,
    deleteDialogMessage,
    handleDelete,
    confirmDelete,
    handleBatchDeleteFromBar,
    handleDeletePending,
    handleDeleteHeld,
  }
}
