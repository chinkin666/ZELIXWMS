import { ref, computed, type Ref, type ComputedRef } from 'vue'

export interface UseTablePaginationOptions<T> {
  /** 全量數據源 */
  data: Ref<T[]> | ComputedRef<T[]>
  /** 默認每頁條數 */
  defaultPageSize?: number
}

/**
 * 表格分頁管理 composable
 * 負責客戶端分頁邏輯
 */
export function useTablePagination<T = any>(options: UseTablePaginationOptions<T>) {
  const { data, defaultPageSize = 50 } = options

  const currentPage = ref(1)
  const pageSize = ref(defaultPageSize)

  const total = computed(() => data.value.length)

  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return data.value.slice(start, start + pageSize.value)
  })

  const handleCurrentChange = (page: number) => {
    currentPage.value = page
  }

  const handleSizeChange = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
  }

  const resetPage = () => {
    currentPage.value = 1
  }

  return {
    currentPage,
    pageSize,
    total,
    paginatedData,
    handleCurrentChange,
    handleSizeChange,
    resetPage,
  }
}
