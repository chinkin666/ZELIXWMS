<template>
  <div ref="tableContainerRef" class="nex-table">
    <div class="nex-table__wrapper" :style="{ maxHeight: tableHeight + 'px', overflow: 'auto' }">
      <table class="o-list-table">
        <thead>
          <tr>
            <!-- Selection column header -->
            <th
              v-if="rowSelectionEnabled && paginationMode !== 'server'"
              class="selection-column"
              style="width: 50px; text-align: center;"
            >
              <input
                type="checkbox"
                :checked="isAllCurrentPageSelected"
                :indeterminate="isIndeterminate"
                @change="handleSelectAllToggle"
              />
            </th>

            <!-- Bundle column header -->
            <th
              v-if="hasBundleColumn"
              :style="{ width: (bundleColumn?.width || 110) + 'px', textAlign: 'center' }"
            >
              {{ bundleColumn?.title || '同梱' }}
            </th>

            <!-- Regular column headers -->
            <th
              v-for="col in regularColumns"
              :key="String(col.key || col.dataKey)"
              :style="{
                width: col.fixed ? (col.width ? col.width + 'px' : undefined) : undefined,
                minWidth: (col.width || col.minWidth || 100) + 'px',
                textAlign: col.align || 'left',
              }"
              :class="col.className"
            >
              {{ col.title }}
            </th>

            <!-- Action column header -->
            <th
              v-if="hasActionColumn"
              :style="{ width: (actionColumn?.width || 110) + 'px', textAlign: actionColumn?.align || 'center' }"
            >
              {{ actionColumn?.title || '操作' }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in displayData"
            :key="String((row as any)[rowKey as string] ?? (row as any).id ?? rowIndex)"
            :class="getRowClassName({ row })"
          >
            <!-- Selection column -->
            <td
              v-if="rowSelectionEnabled && paginationMode !== 'server'"
              class="selection-column"
              style="text-align: center; vertical-align: top;"
            >
              <input
                type="checkbox"
                :checked="isRowSelected(row)"
                @change="handleRowCheckboxChange(row, $event)"
              />
            </td>

            <!-- Bundle column -->
            <td
              v-if="hasBundleColumn"
              style="text-align: center; vertical-align: top;"
            >
              <BundleCell
                v-if="bundleColumn?.cellRenderer"
                :renderer="bundleColumn.cellRenderer"
                :row-data="row"
              />
              <span v-else>-</span>
            </td>

            <!-- Regular columns -->
            <td
              v-for="col in regularColumns"
              :key="String(col.key || col.dataKey)"
              :style="{ textAlign: col.align || 'left', verticalAlign: 'top' }"
              :class="[col.className, getCellClassName({ row, column: col })]"
            >
              <TableCell
                v-if="col.cellRenderer"
                :renderer="col.cellRenderer"
                :row-data="row"
              />
              <span v-else>{{ formatColumnValue(row, col) }}</span>
            </td>

            <!-- Action column -->
            <td
              v-if="hasActionColumn"
              :style="{ textAlign: actionColumn?.align || 'center', verticalAlign: 'top' }"
            >
              <ActionCell
                v-if="actionColumn?.cellRenderer"
                :renderer="actionColumn.cellRenderer"
                :row-data="row"
              />
              <div v-else class="action-buttons">
                <OButton variant="primary" size="sm">編集</OButton>
                <OButton variant="danger" size="sm">削除</OButton>
              </div>
            </td>
          </tr>
          <tr v-if="displayData.length === 0">
            <td
              :colspan="totalColumnCount"
              style="text-align: center; padding: 20px; color: #909399;"
            >
              データがありません
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="paginationEnabled"
      class="nex-table__pagination"
      :class="{ 'nex-table__pagination--with-left': showBulkEditButton || batchDeleteEnabled }"
    >
      <div v-if="showBulkEditButton || batchDeleteEnabled" class="nex-table__pagination-left">
        <OButton
          v-if="showBulkEditButton"
          variant="primary"
          size="sm"
          @click="bulkEditVisible = true"
        >一括修正</OButton>
        <OButton
          v-if="batchDeleteEnabled"
          variant="danger"
          size="sm"
          :disabled="!innerSelectedKeys.length"
          @click="handleBatchDeleteClick"
        >一括削除 ({{ innerSelectedKeys.length }})</OButton>
      </div>
      <div class="nex-table__pagination-right">
        <span class="pagination-total">合計 {{ totalItems }} 件</span>
        <select class="o-input pagination-size-select" :value="innerPageSize" @change="handlePageSizeSelectChange">
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }} 件/ページ</option>
        </select>
        <OPager
          :total="totalItems"
          :offset="pagerOffset"
          :limit="innerPageSize"
          @update:offset="handlePagerOffsetChange"
        />
      </div>
    </div>

    <BulkEditDialog
      v-if="bulkEditEnabled"
      v-model="bulkEditVisible"
      :columns="bulkEditableColumns"
      :selected-count="innerSelectedKeys.length"
      @confirm="applyBulkEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, toRefs, watch, defineComponent } from 'vue'
import type { HeaderGroupingConfig } from './tableHeaderGroup'
import { getNestedValue, setNestedValue } from '@/utils/nestedObject'
import { naturalSort } from '@/utils/naturalSort'
import BulkEditDialog from './BulkEditDialog.vue'
import OPager from '@/components/odoo/OPager.vue'
import OButton from '@/components/odoo/OButton.vue'
import { LINK_COLOR } from '@/theme/config'

// 普通单元格渲染组件
const TableCell = defineComponent({
  name: 'TableCell',
  props: {
    renderer: { type: Function, required: true },
    rowData: { type: Object, required: true },
  },
  setup(props) {
    return () => {
      try {
        return props.renderer({ rowData: props.rowData })
      } catch (e) {
        console.error('Error rendering cell:', e)
        return null
      }
    }
  },
})

// 操作列渲染组件（保证按钮垂直排列）
const ActionCell = defineComponent({
  name: 'ActionCell',
  props: {
    renderer: { type: Function, required: true },
    rowData: { type: Object, required: true },
  },
  setup(props) {
    return () => {
      try {
        const result = props.renderer({ rowData: props.rowData })
        return h('div', { class: 'action-cell-wrapper' }, [result])
      } catch (e) {
        console.error('Error rendering action cell:', e)
        return null
      }
    }
  },
})

// 同梱列渲染组件
const BundleCell = defineComponent({
  name: 'BundleCell',
  props: {
    renderer: { type: Function, required: true },
    rowData: { type: Object, required: true },
  },
  setup(props) {
    return () => {
      try {
        return props.renderer({ rowData: props.rowData })
      } catch (e) {
        console.error('Error rendering bundle cell:', e)
        return null
      }
    }
  },
})

type RowData = Record<string, unknown>
type RowKey = string | number
type PaginationMode = 'client' | 'server'
type SortMode = 'client' | 'server'
type SortOrder = 'asc' | 'desc' | null

const props = withDefaults(
  defineProps<{
    columns: Array<any>
    data: RowData[]
    rowKey?: RowKey
    height?: number
    paginationEnabled?: boolean
    paginationMode?: PaginationMode
    pageSize?: number
    pageSizes?: number[]
    total?: number
    currentPage?: number
    tableProps?: Record<string, unknown>
    // 行选択
    rowSelectionEnabled?: boolean
    selectedKeys?: Array<RowKey>
    // 保持兼容：外部可能传入但当前普通表格不强制使用
    headerGroupingEnabled?: boolean
    headerGroupingConfig?: HeaderGroupingConfig
    // 排序相関
    sortEnabled?: boolean
    sortMode?: SortMode
    sortBy?: string | null
    sortOrder?: SortOrder
    // 表头批量編集（統一編集）
    bulkEditEnabled?: boolean
    // 批量削除
    batchDeleteEnabled?: boolean
    // SearchForm quick global search text (client-side, matches visible text)
    globalSearchText?: string
  }>(),
  {
    height: 400,
    rowKey: 'id',
    paginationEnabled: false,
    paginationMode: 'client' as PaginationMode,
    pageSize: 10,
    pageSizes: () => [10, 20, 50, 100],
    total: undefined,
    currentPage: 1,
    tableProps: () => ({}),
    rowSelectionEnabled: false,
    selectedKeys: () => [],
    headerGroupingEnabled: false,
    headerGroupingConfig: undefined,
    sortEnabled: false,
    sortMode: 'client' as SortMode,
    sortBy: null,
    sortOrder: null,
    bulkEditEnabled: false,
    batchDeleteEnabled: false,
    globalSearchText: '',
  },
)

const emits = defineEmits<{
  (e: 'update:currentPage', value: number): void
  (e: 'update:pageSize', value: number): void
  (e: 'page-change', payload: { page: number; pageSize: number; mode: PaginationMode }): void
  (e: 'update:selectedKeys', value: Array<RowKey>): void
  (e: 'selection-change', payload: { selectedKeys: Array<RowKey>; selectedRows: RowData[] }): void
  (e: 'update:sortBy', value: string | null): void
  (e: 'update:sortOrder', value: SortOrder): void
  (e: 'sort-change', payload: { sortBy: string | null; sortOrder: SortOrder; mode: SortMode }): void
  (e: 'bulk-edit', payload: { columnKey: string; dataKey: string; fieldType?: string; value: any; overwrite: boolean; selectedKeys: Array<RowKey>; selectedRows: RowData[] }): void
  (e: 'batch-delete', payload: { selectedKeys: Array<RowKey>; selectedRows: RowData[] }): void
}>()

const {
  rowKey,
  height,
  columns,
  data,
  paginationEnabled,
  paginationMode,
  pageSizes,
  rowSelectionEnabled,
  sortEnabled,
  sortMode,
  sortBy,
  sortOrder,
  bulkEditEnabled,
  batchDeleteEnabled,
  tableProps: rawTableProps,
} = toRefs(props)

const innerPageSize = ref(props.pageSize)
const innerCurrentPage = ref(props.currentPage)

// 行選択内部状態
const innerSelectedKeys = ref<Array<RowKey>>([...(props.selectedKeys ?? [])])

watch(
  () => props.selectedKeys,
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
    if (changed) innerSelectedKeys.value = next
  },
)

// 检查是否有操作列
const hasActionColumn = computed(() => {
  return columns.value?.some((col) => col.key === 'actions' || col.dataKey === 'actions')
})
const actionColumn = computed(() => {
  return columns.value?.find((col) => col.key === 'actions' || col.dataKey === 'actions')
})

// 检查是否有同梱列
const hasBundleColumn = computed(() => {
  return columns.value?.some((col) => col.key === '__bundle__' || col.dataKey === '__bundle__')
})
const bundleColumn = computed(() => {
  return columns.value?.find((col) => col.key === '__bundle__' || col.dataKey === '__bundle__')
})

// 普通列（排除選択/操作/同梱）
const regularColumns = computed(() => {
  return (columns.value || []).filter((col: any) => {
    const key = col.key || col.dataKey
    if (!key) return false
    if (key === '__selection__' || key === 'selection') return false
    if (key === 'actions' || key === '__actions__') return false
    if (key === '__bundle__') return false
    return true
  })
})

// Total column count for empty-row colspan
const totalColumnCount = computed(() => {
  let count = regularColumns.value.length
  if (rowSelectionEnabled.value && paginationMode.value !== 'server') count++
  if (hasBundleColumn.value) count++
  if (hasActionColumn.value) count++
  return count
})

// 格式化日期時間為 YYYYMMDD HH:MM:SS 格式
const formatDateTime = (dateValue: any): string => {
  if (!dateValue) return '-'
  let date: Date
  if (typeof dateValue === 'string') date = new Date(dateValue)
  else if (dateValue instanceof Date) date = dateValue
  else return String(dateValue)

  if (isNaN(date.getTime())) return String(dateValue)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()

  if (hours === 0 && minutes === 0 && seconds === 0) return `${year}${month}${day}`

  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(minutes).padStart(2, '0')
  const secondsStr = String(seconds).padStart(2, '0')
  return `${year}${month}${day} ${hoursStr}:${minutesStr}:${secondsStr}`
}

const isDateTimeField = (fieldKey: string): boolean => {
  return fieldKey.includes('At') || fieldKey.includes('Date')
}

const formatColumnValue = (row: RowData, col: any): string => {
  const dataKey = col?.dataKey ?? col?.key
  if (!dataKey) return '-'
  const value = getNestedValue(row as any, dataKey)
  if (value === undefined || value === null || value === '') return '-'

  if (isDateTimeField(String(col.key ?? dataKey))) {
    return formatDateTime(value)
  }
  if (Array.isArray(value)) return value.length > 0 ? value.map(String).join(', ') : '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// 获取单元格类名（用于 error-cell 等）
const getCellClassName = ({ row, column }: { row: RowData; column: any }) => {
  const cellProps = (rawTableProps.value as any)?.cellProps
  if (typeof cellProps === 'function') {
    try {
      const props = cellProps({ rowData: row, column })
      return props?.class || ''
    } catch {
      // ignore
    }
  }
  return ''
}

const getRowClassName = ({ row: _row }: { row: RowData }) => {
  return ''
}

// Row selection helpers
const isRowSelected = (row: RowData): boolean => {
  const keyField = rowKey.value as string
  const key = (row as any)?.[keyField]
  return key !== undefined && key !== null && innerSelectedKeys.value.includes(key)
}

const isAllCurrentPageSelected = computed(() => {
  if (displayData.value.length === 0) return false
  const keyField = rowKey.value as string
  return displayData.value.every((row) => {
    const key = (row as any)?.[keyField]
    return key !== undefined && key !== null && innerSelectedKeys.value.includes(key)
  })
})

const isIndeterminate = computed(() => {
  if (displayData.value.length === 0) return false
  const keyField = rowKey.value as string
  const selectedCount = displayData.value.filter((row) => {
    const key = (row as any)?.[keyField]
    return key !== undefined && key !== null && innerSelectedKeys.value.includes(key)
  }).length
  return selectedCount > 0 && selectedCount < displayData.value.length
})

const handleSelectAllToggle = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  const keyField = rowKey.value as string

  if (checked) {
    // Select all - when client pagination, select ALL data rows (cross-page)
    if (paginationEnabled.value && paginationMode.value === 'client') {
      const allDataKeys = new Set(
        data.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
      )
      const finalKeys = Array.from(allDataKeys)
      innerSelectedKeys.value = finalKeys
      const allSelectedRows = data.value.filter((row) => allDataKeys.has((row as any)?.[keyField]))
      emits('update:selectedKeys', finalKeys)
      emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows })
    } else {
      // Select current page only
      const currentPageKeys = displayData.value
        .map((row) => (row as any)?.[keyField])
        .filter((k: any) => k !== undefined && k !== null)
      const newKeys = new Set([...innerSelectedKeys.value, ...currentPageKeys])
      const finalKeys = Array.from(newKeys)
      innerSelectedKeys.value = finalKeys
      const keySet = new Set(finalKeys)
      const allSelectedRows = data.value.filter((row) => keySet.has((row as any)?.[keyField]))
      emits('update:selectedKeys', finalKeys)
      emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows })
    }
  } else {
    // Deselect all - when previously all selected in client mode, clear all
    const allDataKeys = new Set(
      data.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
    )
    const wasAllSelected =
      allDataKeys.size > 0 &&
      allDataKeys.size === innerSelectedKeys.value.length &&
      Array.from(allDataKeys).every((key) => innerSelectedKeys.value.includes(key))

    if (wasAllSelected && paginationEnabled.value && paginationMode.value === 'client') {
      innerSelectedKeys.value = []
      emits('update:selectedKeys', [])
      emits('selection-change', { selectedKeys: [], selectedRows: [] })
    } else {
      // Only deselect current page
      const currentPageKeys = new Set(
        displayData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
      )
      const finalKeys = innerSelectedKeys.value.filter((key) => !currentPageKeys.has(key))
      innerSelectedKeys.value = finalKeys
      const keySet = new Set(finalKeys)
      const allSelectedRows = data.value.filter((row) => keySet.has((row as any)?.[keyField]))
      emits('update:selectedKeys', finalKeys)
      emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows })
    }
  }
}

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
  const allSelectedRows = data.value.filter((r) => keySet.has((r as any)?.[keyField]))
  emits('update:selectedKeys', finalKeys)
  emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows })
}

// 批量編集相関
const bulkEditVisible = ref(false)

const isEmptyForBulkEdit = (val: any): boolean => {
  if (val === undefined || val === null) return true
  if (typeof val === 'string') {
    const s = val.trim()
    return s === '' || s === '-'
  }
  if (Array.isArray(val)) return val.length === 0
  if (typeof val === 'number') return Number.isNaN(val)
  if (typeof val === 'object') return Object.keys(val).length === 0
  return false
}

const getColumnDataKey = (col: any): string | null => {
  const k = col?.dataKey ?? col?.key
  return typeof k === 'string' && k.trim() ? k : null
}

const canBulkEditColumn = (col: any): boolean => {
  if (!col) return false
  if (col.key === '__selection__' || col.key === 'selection') return false
  if (col.key === 'actions' || col.key === '__actions__') return false
  if (col.key === '__bundle__') return false
  if (col.bulkEditDisabled === true || col.disableBulkEdit === true) return false
  const dataKey = getColumnDataKey(col)
  if (!dataKey) return false
  const ft = col.fieldType
  if (ft === 'array') return false
  return true
}

const bulkEditableColumns = computed<any[]>(() => {
  if (!bulkEditEnabled.value) return []
  if (!rowSelectionEnabled.value) return []
  return (columns.value || []).filter((c: any) => canBulkEditColumn(c))
})

const showBulkEditButton = computed(() => {
  if (!paginationEnabled.value) return false
  if (!bulkEditEnabled.value) return false
  if (!rowSelectionEnabled.value) return false
  return bulkEditableColumns.value.length > 0
})

const applyBulkEdit = (payload: {
  columnKey: string
  dataKey: string
  fieldType?: string
  value: any
  overwrite: boolean
}) => {
  const { columnKey, dataKey, fieldType, value, overwrite } = payload
  if (!dataKey) return
  if (!rowSelectionEnabled.value) {
    console.warn('行選択が有効ではありません')
    return
  }
  if (!innerSelectedKeys.value.length) {
    console.warn('左側のチェックで編集対象の行を選択してください')
    return
  }

  const keyField = rowKey.value as string
  const keySet = new Set(innerSelectedKeys.value)
  const selectedRows = data.value.filter((row) => keySet.has((row as any)?.[keyField]))

  let changed = 0
  for (const row of selectedRows) {
    const current = getNestedValue(row as any, dataKey)
    if (!overwrite && !isEmptyForBulkEdit(current)) continue
    setNestedValue(row as any, dataKey, value)
    changed += 1
  }

  emits('bulk-edit', {
    columnKey,
    dataKey,
    fieldType,
    value,
    overwrite,
    selectedKeys: [...innerSelectedKeys.value],
    selectedRows,
  })

  console.log(`一括編集：${changed}件更新しました`)
}

const handleBatchDeleteClick = () => {
  if (!batchDeleteEnabled.value) return
  if (!rowSelectionEnabled.value) {
    console.warn('行選択が有効ではありません')
    return
  }
  if (!innerSelectedKeys.value.length) {
    console.warn('削除する行を選択してください')
    return
  }
  const keySet = new Set(innerSelectedKeys.value)
  const selectedRows = data.value.filter((row) => keySet.has((row as any)?.[rowKey.value as string]))
  emits('batch-delete', { selectedKeys: [...innerSelectedKeys.value], selectedRows })
}

// 分頁相関
const totalItems = computed(() => {
  if (!paginationEnabled.value) {
    return filteredData.value.length
  }
  if (paginationMode.value === 'server') {
    return props.total !== undefined ? props.total : (data.value.length || 0)
  }
  return filteredData.value.length
})

// OPager offset (0-based)
const pagerOffset = computed(() => (innerCurrentPage.value - 1) * innerPageSize.value)

const handlePagerOffsetChange = (newOffset: number) => {
  const newPage = Math.floor(newOffset / innerPageSize.value) + 1
  handlePageChange(newPage)
}

const handlePageSizeSelectChange = (event: Event) => {
  const size = Number((event.target as HTMLSelectElement).value)
  handlePageSizeChange(size)
}

// 前端排序関数
const sortData = (dataToSort: RowData[]): RowData[] => {
  if (!sortEnabled.value || !sortBy.value || !sortOrder.value) return dataToSort
  if (sortMode.value === 'server') return dataToSort

  const sorted = [...dataToSort]
  const sortField = sortBy.value

  sorted.sort((a, b) => {
    const aValue = getNestedValue(a as any, sortField)
    const bValue = getNestedValue(b as any, sortField)

    const column = columns.value.find((col: any) => {
      const colDataKey = col.dataKey ?? col.key
      return colDataKey === sortField
    })

    if (column?.sortMethod) {
      const result = column.sortMethod(aValue, bValue)
      return sortOrder.value === 'asc' ? result : -result
    }

    if (aValue === null || aValue === undefined) return sortOrder.value === 'asc' ? -1 : 1
    if (bValue === null || bValue === undefined) return sortOrder.value === 'asc' ? 1 : -1

    if (aValue === '' || aValue === '-') return sortOrder.value === 'asc' ? -1 : 1
    if (bValue === '' || bValue === '-') return sortOrder.value === 'asc' ? 1 : -1

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder.value === 'asc' ? aValue - bValue : bValue - aValue
    }

    if (sortField === 'orderNumber') {
      const result = naturalSort(aValue, bValue)
      return sortOrder.value === 'asc' ? result : -result
    }

    const aStr = String(aValue).toLowerCase()
    const bStr = String(bValue).toLowerCase()
    if (aStr < bStr) return sortOrder.value === 'asc' ? -1 : 1
    if (aStr > bStr) return sortOrder.value === 'asc' ? 1 : -1
    return 0
  })

  return sorted
}

// 全局搜索过滤
const normalizedGlobalSearchText = computed(() => String(props.globalSearchText || '').trim().toLowerCase())

const rowMatchesGlobalSearch = (row: RowData, queryLower: string): boolean => {
  if (!queryLower) return true
  try {
    for (const col of regularColumns.value) {
      const text = formatColumnValue(row, col)
      if (text && text !== '-' && String(text).toLowerCase().includes(queryLower)) return true
    }
  } catch (_e) {
    return true
  }
  return false
}

const filteredData = computed(() => {
  const q = normalizedGlobalSearchText.value
  if (!q) return data.value
  return data.value.filter((row) => rowMatchesGlobalSearch(row, q))
})

const displayData = computed(() => {
  let result = filteredData.value
  if (sortEnabled.value && sortMode.value === 'client') result = sortData(result)
  if (!paginationEnabled.value) return result
  if (paginationMode.value === 'server') return result

  const start = (innerCurrentPage.value - 1) * innerPageSize.value
  return result.slice(start, start + innerPageSize.value)
})

const tableHeight = computed(() => height.value)

const tableContainerRef = ref<HTMLElement | null>(null)

const handlePageChange = (page: number) => {
  innerCurrentPage.value = page
  emits('update:currentPage', page)
  emits('page-change', { page, pageSize: innerPageSize.value, mode: paginationMode.value })
}

const handlePageSizeChange = (size: number) => {
  innerPageSize.value = size
  innerCurrentPage.value = 1
  emits('update:pageSize', size)
  emits('update:currentPage', 1)
  emits('page-change', { page: 1, pageSize: size, mode: paginationMode.value })
}

watch(
  () => props.pageSize,
  (val) => {
    if (typeof val === 'number' && val > 0 && val !== innerPageSize.value) innerPageSize.value = val
  },
)

watch(
  () => props.currentPage,
  (val) => {
    if (typeof val === 'number' && val > 0 && val !== innerCurrentPage.value) innerCurrentPage.value = val
  },
)

watch(
  [totalItems, innerPageSize],
  () => {
    if (!paginationEnabled.value) return
    const maxPage = Math.max(1, Math.ceil(totalItems.value / innerPageSize.value))
    if (innerCurrentPage.value > maxPage) handlePageChange(maxPage)
  },
  { immediate: true },
)
</script>

<style scoped>
.nex-table {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.nex-table__wrapper {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: auto;
}

.o-list-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ebeef5;
  table-layout: auto;
}

.o-list-table thead th {
  background-color: #fafafa;
  color: v-bind('LINK_COLOR');
  font-size: 13px;
  font-weight: normal;
  vertical-align: top;
  text-align: left;
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
  border-right: 1px solid #ebeef5;
  white-space: nowrap;
}

.o-list-table thead th:last-child {
  border-right: none;
}

.o-list-table tbody td {
  font-size: 12px;
  vertical-align: top;
  padding: 10px;
  border-bottom: 1px solid #ebeef5;
  border-right: 1px solid #ebeef5;
}

.o-list-table tbody td:last-child {
  border-right: none;
}

.o-list-table tbody tr:hover {
  background-color: #f5f7fa;
}

.nex-table__pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.nex-table__pagination--with-left {
  justify-content: space-between;
}

.nex-table__pagination-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nex-table__pagination-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pagination-total {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.pagination-size-select {
  width: auto;
  min-width: 120px;
  font-size: 13px;
  padding: 4px 8px;
}

/* Selection column */
.selection-column {
  width: 50px;
}

.selection-column input[type="checkbox"] {
  cursor: pointer;
}

/* 操作列包装器 */
.action-cell-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

/* 操作按钮容器 */
.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 8px;
  padding: 4px;
}

/* 错误单元格样式 */
.error-cell {
  background-color: #ffebee !important;
}

/* Button styles */
.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  background: #fff;
  color: #303133;
  white-space: nowrap;
  transition: background-color 0.2s, border-color 0.2s;
}

.o-btn:hover {
  background-color: #f5f7fa;
}

.o-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.o-btn-primary {
  background-color: #00798F;
  border-color: #00798F;
  color: #fff;
}

.o-btn-primary:hover {
  background-color: #006577;
}

.o-btn-danger {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}

.o-btn-danger:hover {
  background-color: #e04848;
}

.o-btn-secondary {
  background-color: #fff;
  border-color: #dee2e6;
  color: #303133;
}

.o-btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}

.o-input {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.o-input:focus {
  border-color: #00798F;
}
</style>
