import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { TableColumn } from '@/types/table'

const STORAGE_KEY = 'shipmentOrderCreate_hiddenColumns'

export function useColumnVisibility(displayColumns: Ref<TableColumn[]>) {
  // Load hidden column keys from localStorage
  const hiddenColumnKeys = ref<Set<string>>(new Set())

  // Load from storage on init
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) hiddenColumnKeys.value = new Set(parsed)
    }
  } catch { /* ignore */ }

  // Save to storage on change
  watch(hiddenColumnKeys, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...val]))
  }, { deep: true })

  const visibleColumns = computed(() =>
    displayColumns.value.filter(col => !hiddenColumnKeys.value.has(String(col.dataKey || col.key)))
  )

  const toggleColumn = (colKey: string) => {
    const next = new Set(hiddenColumnKeys.value)
    if (next.has(colKey)) {
      next.delete(colKey)
    } else {
      next.add(colKey)
    }
    hiddenColumnKeys.value = next
  }

  const isColumnVisible = (colKey: string) => !hiddenColumnKeys.value.has(colKey)

  const showAllColumns = () => {
    hiddenColumnKeys.value = new Set()
  }

  // Column visibility dialog state
  const showColumnSettingsDialog = ref(false)

  return {
    visibleColumns,
    hiddenColumnKeys,
    toggleColumn,
    isColumnVisible,
    showAllColumns,
    showColumnSettingsDialog,
  }
}
