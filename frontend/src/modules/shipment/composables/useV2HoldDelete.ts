import { ElMessage, ElMessageBox } from 'element-plus'
import {
  updateShipmentOrderStatusBulk,
  deleteShipmentOrdersBulk,
} from '@/api/shipmentOrders'
import type { V2State } from './useV2State'

interface HoldDeleteDeps {
  state: V2State
  draftStore: any
  heldRowIds: any
  allRows: any
  loadBackendOrders: () => Promise<void>
}

export function useV2HoldDelete({ state, draftStore, heldRowIds, allRows, loadBackendOrders }: HoldDeleteDeps) {
  // 保留にする（ローカルドラフト）
  const handleHold = () => {
    if (state.selectedRows.value.length === 0) return
    const ids = state.selectedRows.value.map(r => r.id || r._id)
    draftStore.setHeldIds([...new Set([...heldRowIds.value, ...ids])])
    ElMessage.success(`${ids.length}件を保留に設定しました`)
    state.selectedRows.value = []
  }

  // 保留にする（バックエンド注文）
  const handleHoldBackend = async () => {
    if (state.selectedRows.value.length === 0) return
    const ids = state.selectedRows.value.map(r => String(r._id || r.id))
    try {
      await updateShipmentOrderStatusBulk(ids, 'mark-held')
      await loadBackendOrders()
      ElMessage.success(`${ids.length}件を保留に設定しました`)
    } catch (err: any) {
      ElMessage.error(err?.message || '保留設定に失敗しました')
    }
    state.selectedRows.value = []
  }

  // 保留解除
  const handleReleaseHold = async () => {
    if (state.selectedRows.value.length === 0) return

    const backendIds: string[] = []
    const localIds: (string | number)[] = []
    for (const row of state.selectedRows.value) {
      const id = row._id || row.id
      const isBackend = state.backendRows.value.some(r => (r._id || r.id) === id)
      if (isBackend) {
        backendIds.push(String(id))
      } else {
        localIds.push(id)
      }
    }

    if (localIds.length > 0) {
      const removeSet = new Set(localIds)
      draftStore.setHeldIds(heldRowIds.value.filter((id: any) => !removeSet.has(id)))
    }

    if (backendIds.length > 0) {
      try {
        await updateShipmentOrderStatusBulk(backendIds, 'unhold')
        await loadBackendOrders()
      } catch (err: any) {
        ElMessage.error('保留解除に失敗しました')
        return
      }
    }

    const count = state.selectedRows.value.length
    state.selectedRows.value = []
    ElMessage.success(`${count}件の保留を解除しました`)
  }

  // 削除（出荷確認待ちタブ = ローカルドラフト）
  const handleDelete = () => {
    if (state.selectedRows.value.length === 0) return
    const ids = state.selectedRows.value.map(r => r.id || r._id)
    state.deleteTarget.value = { type: 'local', localIds: ids, backendIds: [] }
    state.deleteDialogMessage.value = `選択した${ids.length}件の出荷指示を削除しますか？`
    state.deleteDialogVisible.value = true
  }

  // 削除（保留タブ = ローカル + バックエンド混在）
  const handleDeleteHeld = async () => {
    if (state.selectedRows.value.length === 0) return

    const backendIds: string[] = []
    const localIds: (string | number)[] = []
    for (const row of state.selectedRows.value) {
      const id = row._id || row.id
      const isBackend = state.backendRows.value.some(r => (r._id || r.id) === id)
      if (isBackend) {
        backendIds.push(String(id))
      } else {
        localIds.push(id)
      }
    }

    state.deleteTarget.value = { type: 'mixed', localIds, backendIds }
    state.deleteDialogMessage.value = `選択した${state.selectedRows.value.length}件を削除しますか？`
    state.deleteDialogVisible.value = true
  }

  // 削除確認
  const confirmDelete = async () => {
    if (!state.deleteTarget.value) return

    const { localIds, backendIds } = state.deleteTarget.value

    if (localIds.length > 0) {
      draftStore.removeRows(new Set(localIds))
      const removeSet = new Set(localIds)
      draftStore.setHeldIds(heldRowIds.value.filter((id: any) => !removeSet.has(id)))
    }

    if (backendIds.length > 0) {
      try {
        await deleteShipmentOrdersBulk(backendIds)
        await loadBackendOrders()
      } catch (e: any) {
        ElMessage.error(e?.message || '削除に失敗しました')
        state.deleteDialogVisible.value = false
        state.deleteTarget.value = null
        return
      }
    }

    const count = localIds.length + backendIds.length
    ElMessage.success(`${count}件を削除しました`)
    state.selectedRows.value = []
    state.deleteDialogVisible.value = false
    state.deleteTarget.value = null
  }

  // 確認取消（送り状未発行タブ）
  const handleUnconfirm = async () => {
    if (state.selectedRows.value.length === 0) return
    try {
      await ElMessageBox.confirm(
        `選択した${state.selectedRows.value.length}件の確認を取り消しますか？`,
        '確認取消',
        { confirmButtonText: '取り消す', cancelButtonText: 'キャンセル', type: 'warning' }
      )
    } catch { return }

    const ids = state.selectedRows.value.map(r => String(r._id || r.id))
    try {
      await updateShipmentOrderStatusBulk(ids, 'unconfirm', 'confirm')
      await loadBackendOrders()
      ElMessage.success(`${ids.length}件の確認を取り消しました`)
    } catch (err: any) {
      ElMessage.error(err?.message || '確認取消に失敗しました')
    }
    state.selectedRows.value = []
  }

  // バックエンド注文の削除（処理中/送り状未発行共通）
  const handleDeleteBackend = async () => {
    if (state.selectedRows.value.length === 0) return
    try {
      await ElMessageBox.confirm(
        `選択した${state.selectedRows.value.length}件の出荷指示を削除しますか？\nこの操作は元に戻せません。`,
        '削除確認',
        { confirmButtonText: '削除する', cancelButtonText: 'キャンセル', type: 'warning', confirmButtonClass: 'el-button--danger' }
      )
    } catch { return }

    const ids = state.selectedRows.value.map((row) => String(row._id || row.id)).filter(Boolean)
    try {
      const result = await deleteShipmentOrdersBulk(ids)
      ElMessage.success(`${result.deletedCount}件の出荷指示を削除しました`)
      state.selectedRows.value = []
      await loadBackendOrders()
    } catch (e: any) {
      ElMessage.error(e?.message || '削除に失敗しました')
    }
  }

  return {
    handleHold, handleHoldBackend, handleReleaseHold,
    handleDelete, handleDeleteHeld, confirmDelete,
    handleUnconfirm, handleDeleteBackend,
  }
}
