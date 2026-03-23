/**
 * WMS汎用ページ状態管理 / WMS通用页面状态管理
 *
 * CRUDリストページの共通ロジックを抽出。
 * データ取得・ページネーション・選択・検索・Sheet制御を一元管理。
 */
import { ref, computed, onMounted } from 'vue'

export interface UseWmsPageOptions<T> {
  /** データ取得関数 */
  fetchFn: (params: Record<string, any>) => Promise<{ data: T[]; total: number }>
  /** 初期ページサイズ */
  pageSize?: number
  /** 自動ロード */
  autoLoad?: boolean
}

export function useWmsPage<T = any>(options: UseWmsPageOptions<T>) {
  const data = ref<T[]>([]) as any
  const total = ref(0)
  const loading = ref(false)
  const currentPage = ref(1)
  const pageSize = ref(options.pageSize ?? 20)
  const searchText = ref('')
  const selectedRows = ref<T[]>([])

  // Sheet（右侧抽屉）状态
  const sheetOpen = ref(false)
  const sheetMode = ref<'view' | 'edit' | 'create'>('view')
  const sheetData = ref<T | null>(null) as any

  async function loadData(extraParams?: Record<string, any>) {
    loading.value = true
    try {
      const result = await options.fetchFn({
        page: currentPage.value,
        limit: pageSize.value,
        search: searchText.value || undefined,
        ...extraParams,
      })
      data.value = result.data
      total.value = result.total
    } catch (e) {
      console.error('データ取得エラー:', e)
    } finally {
      loading.value = false
    }
  }

  function handlePageChange(payload: { page: number; pageSize: number }) {
    currentPage.value = payload.page
    pageSize.value = payload.pageSize
    loadData()
  }

  function handleSearch(text: string) {
    searchText.value = text
    currentPage.value = 1
    loadData()
  }

  function handleSelectionChange(rows: T[]) {
    selectedRows.value = rows
  }

  function openSheet(row: T, mode: 'view' | 'edit' = 'view') {
    sheetData.value = row
    sheetMode.value = mode
    sheetOpen.value = true
  }

  function openCreateSheet() {
    sheetData.value = null
    sheetMode.value = 'create'
    sheetOpen.value = true
  }

  function closeSheet() {
    sheetOpen.value = false
    sheetData.value = null
  }

  if (options.autoLoad !== false) {
    onMounted(() => loadData())
  }

  return {
    data,
    total,
    loading,
    currentPage,
    pageSize,
    searchText,
    selectedRows,
    sheetOpen,
    sheetMode,
    sheetData,
    loadData,
    handlePageChange,
    handleSearch,
    handleSelectionChange,
    openSheet,
    openCreateSheet,
    closeSheet,
  }
}
