import { computed, ref, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'

/**
 * 行選択状態管理コンポーザブル / 行选择状态管理组合式函数
 *
 * チェックボックスによる行選択、全選択/解除、中間状態の計算を提供する。
 * 提供通过复选框进行行选择、全选/取消、半选状态的计算。
 */

type RowData = Record<string, unknown>
type RowKey = string | number
type PaginationMode = 'client' | 'server'

/** コンポーザブルの入力パラメータ / 组合式函数的输入参数 */
interface UseOrderTableSelectionParams {
  /** 行キーフィールド / 行键字段 */
  rowKey: Ref<string | number>
  /** 表示中のデータ / 当前显示的数据 */
  displayData: ComputedRef<RowData[]>
  /** フィルタ済みデータ（全ページ分） / 过滤后的数据（所有页） */
  filteredData: ComputedRef<RowData[]>
  /** 全データ / 全部数据 */
  data: Ref<RowData[]>
  /** 行選択有効フラグ / 行选择是否启用 */
  rowSelectionEnabled: Ref<boolean>
  /** ページネーション有効フラグ / 分页是否启用 */
  paginationEnabled: Ref<boolean>
  /** ページネーションモード / 分页模式 */
  paginationMode: Ref<PaginationMode>
  /** 外部から渡される選択キー / 从外部传入的选择键 */
  selectedKeys: RowKey[] | undefined
  /** イベント発火関数 / 事件触发函数 */
  emits: {
    (e: 'update:selectedKeys', value: Array<RowKey>): void
    (e: 'selection-change', payload: {
      selectedKeys: Array<RowKey>
      selectedRows: RowData[]
      isSelectAllTriggered?: boolean
    }): void
  }
}

export function useOrderTableSelection(params: UseOrderTableSelectionParams) {
  const {
    rowKey,
    displayData,
    filteredData,
    data,
    rowSelectionEnabled,
    paginationEnabled,
    paginationMode,
    selectedKeys,
    emits,
  } = params

  // 行選択内部状態 / 行选择内部状态
  const innerSelectedKeys = ref<Array<RowKey>>([...(selectedKeys ?? [])])

  // 外部の selectedKeys を監視して同期 / 监听外部 selectedKeys 并同步
  watch(
    () => selectedKeys,
    (val) => {
      if (!val) return
      const next = Array.isArray(val) ? [...val] : []
      if (next.length !== innerSelectedKeys.value.length) {
        innerSelectedKeys.value = next
        return
      }
      const currentSet = new Set(innerSelectedKeys.value)
      let changed = false
      for (const key of next) {
        if (!currentSet.has(key)) {
          changed = true
          break
        }
      }
      if (changed) {
        innerSelectedKeys.value = next
      }
    },
  )

  /**
   * 行が選択されているか判定 / 判断行是否被选中
   */
  const isRowSelected = (row: RowData): boolean => {
    const keyField = rowKey.value as string
    const key = (row as any)?.[keyField]
    return key !== undefined && key !== null && innerSelectedKeys.value.includes(key)
  }

  /**
   * 現在ページの全行が選択されているか / 当前页的所有行是否都被选中
   */
  const isAllCurrentPageSelected = computed(() => {
    if (displayData.value.length === 0) return false
    const keyField = rowKey.value as string
    return displayData.value.every((row) => {
      const key = (row as any)?.[keyField]
      return key !== undefined && key !== null && innerSelectedKeys.value.includes(key)
    })
  })

  /**
   * 中間状態（一部選択）の計算 / 半选状态（部分选择）的计算
   */
  const isIndeterminate = computed(() => {
    if (displayData.value.length === 0) return false
    const keyField = rowKey.value as string
    const selectedCount = displayData.value.filter((row) => {
      const key = (row as any)?.[keyField]
      return key !== undefined && key !== null && innerSelectedKeys.value.includes(key)
    }).length
    return selectedCount > 0 && selectedCount < displayData.value.length
  })

  /**
   * 全選択/解除トグル処理 / 全选/取消切换处理
   */
  const handleSelectAllToggle = (event: Event) => {
    const checked = (event.target as HTMLInputElement).checked
    const keyField = rowKey.value as string

    if (checked) {
      // 全選択 - クライアントページネーション時は全フィルタデータを選択（クロスページ）
      // 全选 - 客户端分页时选择所有过滤数据（跨页）
      if (paginationEnabled.value && paginationMode.value === 'client') {
        const allDataKeys = new Set(
          filteredData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
        )
        const finalKeys = Array.from(allDataKeys)
        innerSelectedKeys.value = finalKeys
        const allSelectedRows = filteredData.value.filter((row) => allDataKeys.has((row as any)?.[keyField]))
        emits('update:selectedKeys', finalKeys)
        emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows, isSelectAllTriggered: true })
      } else {
        const currentPageKeys = displayData.value
          .map((row) => (row as any)?.[keyField])
          .filter((k: any) => k !== undefined && k !== null)
        const newKeys = new Set([...innerSelectedKeys.value, ...currentPageKeys])
        const finalKeys = Array.from(newKeys)
        innerSelectedKeys.value = finalKeys
        const keySet = new Set(finalKeys)
        const allSelectedRows = filteredData.value.filter((row) => keySet.has((row as any)?.[keyField]))
        emits('update:selectedKeys', finalKeys)
        emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows, isSelectAllTriggered: true })
      }
    } else {
      // 選択解除 / 取消选择
      const allDataKeys = new Set(
        filteredData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
      )
      const wasAllSelected =
        allDataKeys.size > 0 &&
        allDataKeys.size === innerSelectedKeys.value.length &&
        Array.from(allDataKeys).every((key) => innerSelectedKeys.value.includes(key))

      if (wasAllSelected && paginationEnabled.value && paginationMode.value === 'client') {
        innerSelectedKeys.value = []
        emits('update:selectedKeys', [])
        emits('selection-change', { selectedKeys: [], selectedRows: [], isSelectAllTriggered: false })
      } else {
        const currentPageKeys = new Set(
          displayData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
        )
        const finalKeys = innerSelectedKeys.value.filter((key) => !currentPageKeys.has(key))
        innerSelectedKeys.value = finalKeys
        const keySet = new Set(finalKeys)
        const allSelectedRows = filteredData.value.filter((row) => keySet.has((row as any)?.[keyField]))
        emits('update:selectedKeys', finalKeys)
        emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows, isSelectAllTriggered: false })
      }
    }
  }

  /**
   * 行チェックボックス変更処理 / 行复选框变更处理
   */
  const handleRowCheckboxChange = (row: RowData, event: Event) => {
    const checked = (event.target as HTMLInputElement).checked
    const keyField = rowKey.value as string
    const key = (row as any)?.[keyField]
    if (key === undefined || key === null) return

    let finalKeys: Array<RowKey>
    if (checked) {
      finalKeys = [...innerSelectedKeys.value, key]
    } else {
      finalKeys = innerSelectedKeys.value.filter((k) => k !== key)
    }
    innerSelectedKeys.value = finalKeys

    const keySet = new Set(finalKeys)
    const allSelectedRows = filteredData.value.filter((r) => keySet.has((r as any)?.[keyField]))
    emits('update:selectedKeys', finalKeys)
    emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows })
  }

  // データ変更時に無効な選択キーを除去 / 数据变更时移除无效的选择键
  watch(
    () => data.value,
    (newData) => {
      if (!rowSelectionEnabled.value) return

      const keyField = rowKey.value as string
      const newIds = new Set(
        newData.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
      )

      if (innerSelectedKeys.value.length > 0) {
        const validKeys = innerSelectedKeys.value.filter((key) => newIds.has(key))
        if (validKeys.length !== innerSelectedKeys.value.length) {
          innerSelectedKeys.value = validKeys
          emits('update:selectedKeys', validKeys)
        }
      }
    },
    { deep: false },
  )

  return {
    innerSelectedKeys,
    isRowSelected,
    isAllCurrentPageSelected,
    isIndeterminate,
    handleSelectAllToggle,
    handleRowCheckboxChange,
  }
}
