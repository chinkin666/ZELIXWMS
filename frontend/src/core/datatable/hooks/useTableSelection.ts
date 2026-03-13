import { ref, type Ref } from 'vue'

/**
 * 表格選擇管理 composable
 * 封裝 el-table 的多選邏輯
 */
export function useTableSelection<T = any>() {
  const selectedRows: Ref<T[]> = ref([])

  const handleSelectionChange = (rows: T[]) => {
    selectedRows.value = rows
  }

  const clearSelection = () => {
    selectedRows.value = []
  }

  const isSelected = (row: T): boolean => {
    return selectedRows.value.includes(row)
  }

  return {
    selectedRows,
    handleSelectionChange,
    clearSelection,
    isSelected,
  }
}
