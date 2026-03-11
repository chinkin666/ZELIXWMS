import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { UserOrderRow } from '@/types/orderRow'
import {
  saveTableDataToStorage,
  loadTableDataFromStorage,
  loadHeldRowsFromStorage,
  clearTableDataStorage,
} from '@/views/shipment-orders/composables/useOrderStorage'

export const useShipmentOrderDraftStore = defineStore('shipmentOrderDraft', () => {
  const allRows = ref<UserOrderRow[]>([])
  const heldRowIds = ref<(string | number)[]>([])

  // ストレージから状態を読み込む
  const loadFromStorage = () => {
    const savedRows = loadTableDataFromStorage()
    const savedHeldIds = loadHeldRowsFromStorage()
    allRows.value = savedRows
    // 存在しないローカル行の保留記録をクリーン
    const localRowIds = new Set(savedRows.map(r => r.id))
    heldRowIds.value = savedHeldIds.filter(id => localRowIds.has(id as string))
  }

  // ストレージへ状態を保存
  const saveToStorage = () => {
    saveTableDataToStorage(allRows.value, heldRowIds.value)
  }

  // ストレージをクリア
  const clearStorage = () => {
    clearTableDataStorage()
  }

  // 行を追加（イミュータブル）
  const addRows = (newRows: UserOrderRow[]) => {
    allRows.value = [...allRows.value, ...newRows]
  }

  // 行を更新（イミュータブル）
  const updateRow = (id: string, patch: Partial<UserOrderRow>) => {
    allRows.value = allRows.value.map(r =>
      r.id === id ? { ...r, ...patch } : r
    )
  }

  // 行を削除（イミュータブル）
  const removeRows = (ids: Set<string | number>) => {
    allRows.value = allRows.value.filter(r => !ids.has(r.id))
  }

  // 全行クリア
  const clearAll = () => {
    allRows.value = []
    heldRowIds.value = []
    clearStorage()
  }

  // 保留IDを設定
  const setHeldIds = (ids: (string | number)[]) => {
    heldRowIds.value = [...ids]
  }

  // 変更時に自動保存（デバウンス）
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  watch(
    [allRows, heldRowIds],
    () => {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        saveToStorage()
      }, 300)
    },
    { deep: true },
  )

  return {
    allRows,
    heldRowIds,
    loadFromStorage,
    saveToStorage,
    clearStorage,
    addRows,
    updateRow,
    removeRows,
    clearAll,
    setHeldIds,
  }
})
