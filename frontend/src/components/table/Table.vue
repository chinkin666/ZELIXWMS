<template>
  <div ref="tableContainerRef" class="nex-table">
    <div class="nex-table__wrapper">
      <el-table
        ref="tableRef"
        :data="displayData"
        :height="tableHeight"
        :row-key="(row: any) => String(row[rowKey as string] ?? row.id ?? '')"
        :highlight-current-row="false"
        :border="true"
        :cell-class-name="getCellClassName"
        :row-class-name="getRowClassName"
        :reserve-selection="paginationEnabled && paginationMode === 'client'"
        v-bind="tableProps"
      >
        <!-- 选择列（后端分页时禁用，因为只能选择当前页） -->
        <el-table-column
          v-if="rowSelectionEnabled && paginationMode !== 'server'"
          type="selection"
          width="50"
          fixed="left"
          align="center"
          class-name="selection-column"
        />

        <!-- 同梱列 -->
        <el-table-column
          v-if="hasBundleColumn"
          :label="bundleColumn?.title || '同梱'"
          :width="bundleColumn?.width || 110"
          fixed="left"
          align="center"
        >
          <template #default="{ row }">
            <BundleCell
              v-if="bundleColumn?.cellRenderer"
              :renderer="bundleColumn.cellRenderer"
              :row-data="row"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 普通列：非固定列使用 min-width 使其可以自动拉伸填满宽度 -->
        <el-table-column
          v-for="col in regularColumns"
          :key="String(col.key || col.dataKey)"
          :prop="col.dataKey || col.key"
          :label="col.title"
          :width="col.fixed ? col.width : undefined"
          :min-width="col.fixed ? col.minWidth : (col.width || col.minWidth || 100)"
          :fixed="col.fixed"
          :align="col.align"
          :class-name="col.className"
        >
          <template #default="{ row }">
            <TableCell
              v-if="col.cellRenderer"
              :renderer="col.cellRenderer"
              :row-data="row"
            />
            <span v-else>{{ formatColumnValue(row, col) }}</span>
          </template>
        </el-table-column>

        <!-- 操作列 -->
        <el-table-column
          v-if="hasActionColumn"
          :label="actionColumn?.title || '操作'"
          :width="actionColumn?.width || 110"
          :fixed="actionColumn?.fixed ?? 'right'"
          :align="actionColumn?.align || 'center'"
        >
          <template #default="{ row }">
            <ActionCell
              v-if="actionColumn?.cellRenderer"
              :renderer="actionColumn.cellRenderer"
              :row-data="row"
            />
            <div v-else class="action-buttons">
              <el-button type="primary" size="small" plain>編集</el-button>
              <el-button type="danger" size="small" plain>削除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div
      v-if="paginationEnabled"
      class="nex-table__pagination"
      :class="{ 'nex-table__pagination--with-left': showBulkEditButton || batchDeleteEnabled }"
    >
      <div v-if="showBulkEditButton || batchDeleteEnabled" class="nex-table__pagination-left">
        <el-button
          v-if="showBulkEditButton"
          type="primary"
          plain
          size="small"
          @click="bulkEditVisible = true"
        >
          一括修正
        </el-button>
        <el-button
          v-if="batchDeleteEnabled"
          type="danger"
          plain
          size="small"
          :disabled="!innerSelectedKeys.length"
          @click="handleBatchDeleteClick"
        >
          一括削除 ({{ innerSelectedKeys.length }})
        </el-button>
      </div>
      <el-pagination
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="totalItems"
        :page-size="innerPageSize"
        :page-sizes="pageSizes"
        :current-page="innerCurrentPage"
        :pager-count="paginationMode === 'server' ? 7 : 7"
        @current-change="handlePageChange"
        @size-change="handlePageSizeChange"
      />
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
import { computed, h, nextTick, ref, toRefs, watch, defineComponent } from 'vue'
import { ElButton, ElMessage, ElPagination, ElTable } from 'element-plus'
import type { HeaderGroupingConfig } from './tableHeaderGroup'
import { getNestedValue, setNestedValue } from '@/utils/nestedObject'
import { naturalSort } from '@/utils/naturalSort'
import BulkEditDialog from './BulkEditDialog.vue'
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
    // 行选择
    rowSelectionEnabled?: boolean
    selectedKeys?: Array<RowKey>
    // 保持兼容：外部可能传入但当前普通表格不强制使用
    headerGroupingEnabled?: boolean
    headerGroupingConfig?: HeaderGroupingConfig
    // 排序相关
    sortEnabled?: boolean
    sortMode?: SortMode
    sortBy?: string | null
    sortOrder?: SortOrder
    // 表头批量编辑（统一编辑）
    bulkEditEnabled?: boolean
    // 批量删除
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

// 行选择内部状态
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

// 普通列（排除选择/操作/同梱）
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

// 格式化日期时间为 YYYYMMDD HH:MM:SS 格式（如果只精确到日，则不显示时分秒）
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

const getRowClassName = ({ row }: { row: RowData }) => {
  return ''
}

// 批量编辑相关
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
    ElMessage.warning('行選択が有効ではありません')
    return
  }
  if (!innerSelectedKeys.value.length) {
    ElMessage.warning('左側のチェックで編集対象の行を選択してください')
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

  ElMessage.success(`一括編集：${changed}件更新しました`)
}

const handleBatchDeleteClick = () => {
  if (!batchDeleteEnabled.value) return
  if (!rowSelectionEnabled.value) {
    ElMessage.warning('行選択が有効ではありません')
    return
  }
  if (!innerSelectedKeys.value.length) {
    ElMessage.warning('削除する行を選択してください')
    return
  }
  const keySet = new Set(innerSelectedKeys.value)
  const selectedRows = data.value.filter((row) => keySet.has((row as any)?.[rowKey.value as string]))
  emits('batch-delete', { selectedKeys: [...innerSelectedKeys.value], selectedRows })
}

// 分页相关
const totalItems = computed(() => {
  if (!paginationEnabled.value) {
    return filteredData.value.length
  }
  if (paginationMode.value === 'server') {
    return props.total !== undefined ? props.total : (data.value.length || 0)
  }
  // 客户端分页：使用过滤后的数据长度
  return filteredData.value.length
})

// 前端排序函数（保持旧行为：只有 client mode 排序）
const sortData = (dataToSort: RowData[]): RowData[] => {
  if (!sortEnabled.value || !sortBy.value || !sortOrder.value) return dataToSort
  if (sortMode.value === 'server') return dataToSort

  const sorted = [...dataToSort]
  const sortField = sortBy.value

  sorted.sort((a, b) => {
    // Use getNestedValue to support nested keys like 'recipient.postalCode'
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
    // Search through all visible columns
    for (const col of regularColumns.value) {
      const text = formatColumnValue(row, col)
      if (text && text !== '-' && String(text).toLowerCase().includes(queryLower)) return true
    }
  } catch (e) {
    // fallback: do not filter out on error
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
const tableRef = ref<InstanceType<typeof ElTable> | null>(null)

// 防止循环触发的标志
const isUpdatingSelection = ref(false)

// 同步当前页的选中状态（当页面切换或数据变化时）
watch(
  [displayData, innerSelectedKeys],
  () => {
    if (!rowSelectionEnabled.value || !tableRef.value) return
    if (paginationEnabled.value && paginationMode.value !== 'client') return
    if (isUpdatingSelection.value) return

    const keyField = rowKey.value as string
    const selectedKeySet = new Set(innerSelectedKeys.value)

    isUpdatingSelection.value = true
    tableRef.value.clearSelection()

    nextTick(() => {
      if (!tableRef.value) {
        isUpdatingSelection.value = false
        return
      }

      const rowsToSelect: RowData[] = []
      for (const row of displayData.value) {
        const key = (row as any)?.[keyField]
        if (key !== undefined && key !== null && selectedKeySet.has(key)) rowsToSelect.push(row)
      }

      for (const row of rowsToSelect) {
        tableRef.value!.toggleRowSelection(row, true)
      }
      isUpdatingSelection.value = false
    })
  },
  { immediate: true, flush: 'post' },
)

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

// 处理行选择变化（支持跨页选择 + 全选/取消全选）
const handleSelectionChange = (selection: RowData[]) => {
  if (isUpdatingSelection.value) return
  const keyField = rowKey.value as string

  const currentPageKeys = new Set(
    displayData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
  )
  const selectedKeysInCurrentPage = new Set(
    selection.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
  )

  const isSelectAllCurrentPage =
    currentPageKeys.size > 0 &&
    currentPageKeys.size === selectedKeysInCurrentPage.size &&
    Array.from(currentPageKeys).every((key) => selectedKeysInCurrentPage.has(key))

  const isDeselectAllCurrentPage = currentPageKeys.size > 0 && selectedKeysInCurrentPage.size === 0

  const allDataKeys = new Set(
    data.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
  )

  const wasAllSelected =
    allDataKeys.size > 0 &&
    allDataKeys.size === innerSelectedKeys.value.length &&
    Array.from(allDataKeys).every((key) => innerSelectedKeys.value.includes(key))

  let finalKeys: Array<RowKey>

  if (isSelectAllCurrentPage && !wasAllSelected && paginationEnabled.value && paginationMode.value === 'client') {
    finalKeys = Array.from(allDataKeys)
  } else if (isDeselectAllCurrentPage && wasAllSelected && paginationEnabled.value && paginationMode.value === 'client') {
    finalKeys = []
  } else if (isSelectAllCurrentPage && wasAllSelected) {
    const newSelectedKeys = new Set(innerSelectedKeys.value)
    for (const key of currentPageKeys) newSelectedKeys.delete(key)
    finalKeys = Array.from(newSelectedKeys)
  } else {
    const newSelectedKeys = new Set(innerSelectedKeys.value)
    for (const key of currentPageKeys) newSelectedKeys.delete(key)
    for (const key of selectedKeysInCurrentPage) newSelectedKeys.add(key)
    finalKeys = Array.from(newSelectedKeys)
  }

  innerSelectedKeys.value = finalKeys

  const keySet = new Set(finalKeys)
  const allSelectedRows = data.value.filter((row) => keySet.has((row as any)?.[keyField]))

  emits('update:selectedKeys', finalKeys)
  emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows })
}

// 合并 tableProps（排除 cellProps，因为已经在 getCellClassName 中处理）
const tableProps = computed(() => {
  const { cellProps, ...rest } = rawTableProps.value ?? {}
  return { ...rest, onSelectionChange: handleSelectionChange }
})
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
  overflow: hidden;
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

/* 表头样式：使用 LINK_COLOR，13px */
:deep(.el-table__header) {
  font-size: 13px;
}

:deep(.el-table__header th) {
  background-color: transparent;
  color: v-bind('LINK_COLOR');
  font-size: 13px;
  font-weight: normal;
  vertical-align: top;
  text-align: left;
  padding: 10px;
}

/* 表格内容：12px */
:deep(.el-table__body) {
  font-size: 12px;
}

:deep(.el-table__body td) {
  font-size: 12px;
  vertical-align: top;
  padding: 10px;
}

/* 表格边框 */
:deep(.el-table) {
  border: 1px solid #ebeef5;
}

:deep(.el-table th),
:deep(.el-table td) {
  border-right: 1px solid #ebeef5;
}

/* 选择列：30px，左右居中，靠上 */
:deep(.selection-column) {
  width: 30px !important;
}

:deep(.selection-column th),
:deep(.selection-column td) {
  text-align: center;
  vertical-align: top;
  padding: 10px 0;
}

:deep(.selection-column .cell) {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 10px 0;
}

:deep(.selection-column .el-checkbox) {
  margin: 0;
}

/* 操作列包装器 */
.action-cell-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

/* 强制 ElSpace 垂直排列 */
.action-cell-wrapper :deep(.el-space) {
  display: flex;
  flex-direction: column !important;
  align-items: center;
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

/* 操作列按钮样式 */
.action-cell-wrapper .el-button,
.action-buttons .el-button {
  margin: 0;
  min-width: 54px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border-width: 1px;
}

/* 操作列按钮 - 描边颜色与文字颜色一致 */
.action-cell-wrapper .el-button--primary.is-plain,
.action-buttons .el-button--primary.is-plain {
  border-color: var(--el-color-primary);
}

.action-cell-wrapper .el-button--info.is-plain,
.action-buttons .el-button--info.is-plain {
  border-color: var(--el-color-info);
}

.action-cell-wrapper .el-button--success.is-plain,
.action-buttons .el-button--success.is-plain {
  border-color: var(--el-color-success);
}

.action-cell-wrapper .el-button--danger.is-plain,
.action-buttons .el-button--danger.is-plain {
  border-color: var(--el-color-danger);
}

.action-cell-wrapper :deep(.el-space .el-button) {
  margin: 2px;
  min-width: 54px;
  border-width: 1px;
}

.action-cell-wrapper :deep(.el-space .el-button--primary.is-plain) {
  border-color: var(--el-color-primary);
}

.action-cell-wrapper :deep(.el-space .el-button--info.is-plain) {
  border-color: var(--el-color-info);
}

.action-cell-wrapper :deep(.el-space .el-button--success.is-plain) {
  border-color: var(--el-color-success);
}

.action-cell-wrapper :deep(.el-space .el-button--danger.is-plain) {
  border-color: var(--el-color-danger);
}

/* 操作列单元格样式 */
:deep(.el-table__body td:has(.action-buttons)),
:deep(.el-table__body td:has(.action-cell-wrapper)),
:deep(.el-table__body td:has(.action-cell)) {
  vertical-align: top;
}

/* action-cell 样式 - 用于 cellRenderer 中的操作按钮 */
.action-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 4px;
}

.action-cell .el-button {
  margin: 0;
  min-width: 54px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border-width: 1px;
}

.action-cell .el-button--primary.is-plain {
  border-color: var(--el-color-primary);
}

.action-cell .el-button--info.is-plain {
  border-color: var(--el-color-info);
}

.action-cell .el-button--success.is-plain {
  border-color: var(--el-color-success);
}

.action-cell .el-button--danger.is-plain {
  border-color: var(--el-color-danger);
}

/* 错误单元格样式 */
:deep(.error-cell) {
  background-color: #ffebee !important;
}

/* 滚动条样式 - 一直显示水平滚动条 */
:deep(.el-scrollbar__bar.is-horizontal) {
  opacity: 1 !important;
  height: 8px;
}

:deep(.el-scrollbar__thumb) {
  background-color: rgba(144, 147, 153, 0.5);
}

:deep(.el-scrollbar__thumb:hover) {
  background-color: rgba(144, 147, 153, 0.7);
}

:deep(.el-table__body-wrapper) {
  overflow-x: auto !important;
}

:deep(.el-table__body-wrapper .el-scrollbar__bar.is-horizontal) {
  opacity: 1 !important;
  display: block !important;
}
</style>


