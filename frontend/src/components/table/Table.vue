<template>
  <div ref="tableContainerRef" class="w-full flex flex-col">
    <!-- ツールバー: カラム表示切替 / 工具栏: 列显示切换 -->
    <div class="flex items-center justify-end px-2 py-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="icon-sm">
            <Settings2 class="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56 max-h-80 overflow-y-auto">
          <DropdownMenuLabel>表示カラム / 显示列</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            v-for="col in regularColumns"
            :key="String(col.key || col.dataKey)"
            :checked="!hiddenColumnKeys.has(String(col.key || col.dataKey))"
            @update:checked="toggleColumnVisibility(String(col.key || col.dataKey), $event)"
          >
            {{ col.title || col.key || col.dataKey }}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div class="rounded-md border overflow-auto" :style="tableHeight ? { maxHeight: tableHeight + 'px' } : {}">
      <Table class="w-full caption-bottom text-sm">
        <thead class="[&_tr]:border-b">
          <TableRow>
            <!-- Selection column header / 選択列ヘッダー -->
            <TableHead
              v-if="rowSelectionEnabled && paginationMode !== 'server'"
              class="h-10 px-2 text-center align-middle font-medium text-muted-foreground"
              style="width: 50px;"
            >
              <Input
                type="checkbox"
                :checked="isAllCurrentPageSelected"
                :indeterminate="isIndeterminate"
                @change="handleSelectAllToggle"
                class="cursor-pointer"
              />
            </TableHead>

            <!-- Bundle column header / 同梱列ヘッダー -->
            <TableHead
              v-if="hasBundleColumn"
              class="h-10 px-2 text-center align-middle font-medium text-muted-foreground"
              :style="{ width: (bundleColumn?.width || 110) + 'px' }"
            >
              {{ bundleColumn?.title || '同梱' }}
            </TableHead>

            <!-- Regular column headers / 通常列ヘッダー -->
            <TableHead
              v-for="col in visibleRegularColumns"
              :key="String(col.key || col.dataKey)"
              class="h-10 px-2 align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
              :style="{
                width: col.fixed ? (col.width ? col.width + 'px' : undefined) : undefined,
                minWidth: (col.width || col.minWidth || 100) + 'px',
                textAlign: col.align || 'left',
              }"
              :class="col.className"
            >
              {{ col.title }}
            </TableHead>

            <!-- Action column header / 操作列ヘッダー -->
            <TableHead
              v-if="hasActionColumn"
              class="h-10 px-2 align-middle font-medium text-muted-foreground"
              :style="{ width: (actionColumn?.width || 110) + 'px', textAlign: actionColumn?.align || 'center' }"
            >
              {{ actionColumn?.title || t('wms.common.actions', '操作') }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <tbody class="[&_tr:last-child]:border-0">
          <TableRow
            v-for="(row, rowIndex) in displayData"
            :key="String((row as any)[rowKey as string] ?? (row as any).id ?? rowIndex)"
            class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
            :class="getRowClassName({ row })"
          >
            <!-- Selection column / 選択列 -->
            <TableCell
              v-if="rowSelectionEnabled && paginationMode !== 'server'"
              class="p-2 align-middle text-center"
            >
              <Input
                type="checkbox"
                :checked="isRowSelected(row)"
                @change="handleRowCheckboxChange(row, $event)"
                class="cursor-pointer"
              />
            </TableCell>

            <!-- Bundle column / 同梱列 -->
            <TableCell
              v-if="hasBundleColumn"
              class="p-2 align-middle text-center"
            >
              <BundleCell
                v-if="bundleColumn?.cellRenderer"
                :renderer="bundleColumn.cellRenderer"
                :row-data="row"
              />
              <span v-else>-</span>
            </TableCell>

            <!-- Regular columns / 通常列 -->
            <TableCell
              v-for="col in visibleRegularColumns"
              :key="String(col.key || col.dataKey)"
              class="p-2 align-middle [&:has([role=checkbox])]:pr-0"
              :style="{ textAlign: col.align || 'left' }"
              :class="[col.className, getCellClassName({ row, column: col })]"
            >
              <TableCell
                v-if="col.cellRenderer"
                :renderer="col.cellRenderer"
                :row-data="row"
              />
              <span v-else>{{ formatColumnValue(row, col) }}</span>
            </TableCell>

            <!-- Action column / 操作列 -->
            <TableCell
              v-if="hasActionColumn"
              class="p-2 align-middle"
              :style="{ textAlign: actionColumn?.align || 'center' }"
            >
              <ActionCell
                v-if="actionColumn?.cellRenderer"
                :renderer="actionColumn.cellRenderer"
                :row-data="row"
              />
              <div v-else class="flex items-center gap-1.5">
                <Button variant="default" size="sm">編集</Button>
                <Button variant="destructive" size="sm">削除</Button>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-if="displayData.length === 0">
            <TableCell
              :colspan="totalColumnCount"
              class="text-center text-muted-foreground py-8"
            >
              <div class="flex flex-col items-center gap-2 text-sm">
                <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.3">
                  <path d="M2.5 0A2.5 2.5 0 0 0 0 2.5v11A2.5 2.5 0 0 0 2.5 16h11a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 13.5 0h-11zM1 2.5A1.5 1.5 0 0 1 2.5 1H7v5H1V2.5zM1 7h6v5H2.5A1.5 1.5 0 0 1 1 10.5V7zm7-6h5.5A1.5 1.5 0 0 1 15 2.5V6H8V1zm0 6h7v3.5a1.5 1.5 0 0 1-1.5 1.5H8V7z"/>
                </svg>
                <span>データがありません</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- ページネーション / 分页 -->
    <div
      v-if="paginationEnabled"
      class="flex items-center justify-between px-2 py-3 text-sm text-muted-foreground"
    >
      <div v-if="showBulkEditButton || batchDeleteEnabled" class="flex items-center gap-2">
        <Button
          v-if="showBulkEditButton"
          variant="default"
          size="sm"
          @click="bulkEditVisible = true"
        >一括修正</Button>
        <Button
          v-if="batchDeleteEnabled"
          variant="destructive"
          size="sm"
          :disabled="!innerSelectedKeys.length"
          @click="handleBatchDeleteClick"
        >一括削除 ({{ innerSelectedKeys.length }})</Button>
      </div>
      <div v-else />
      <div class="flex items-center gap-3">
        <span class="text-sm whitespace-nowrap">
          合計 {{ totalItems }} 件 | ページ {{ innerCurrentPage }} / {{ totalPages }}
        </span>
        <select
          class="h-8 rounded-md border bg-background px-2 text-sm"
          :value="innerPageSize"
          @change="handlePageSizeSelectChange"
        >
          <option v-for="size in pageSizes" :key="size" :value="size">{{ size }} 件/ページ</option>
        </select>
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            :disabled="innerCurrentPage <= 1"
            @click="handlePageChange(innerCurrentPage - 1)"
          >
            <ChevronLeft class="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            :disabled="innerCurrentPage >= totalPages"
            @click="handlePageChange(innerCurrentPage + 1)"
          >
            <ChevronRight class="size-4" />
          </Button>
        </div>
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { computed, h, ref, toRefs, watch, defineComponent } from 'vue'
import type { HeaderGroupingConfig } from './tableHeaderGroup'
import { getNestedValue, setNestedValue } from '@/utils/nestedObject'
import { naturalSort } from '@/utils/naturalSort'
import BulkEditDialog from './BulkEditDialog.vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Settings2, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { LINK_COLOR } from '@/theme/config'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

// 普通单元格渲染组件 / 通常セルレンダリングコンポーネント
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
        // セルレンダリングエラー / Cell render error
        return null
      }
    }
  },
})

// 操作列渲染组件（保证按钮垂直排列） / アクション列レンダリング
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
        return h('div', { class: 'flex items-center gap-1.5' }, [result])
      } catch (e) {
        // アクションセルレンダリングエラー / Action cell render error
        return null
      }
    }
  },
})

// 同梱列渲染组件 / 同梱列レンダリング
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
        // 同梱セルレンダリングエラー / Bundle cell render error
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
    globalSearchText?: string
  }>(),
  {
    height: 0,
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

// 行選択内部状態 / 行选择内部状态
const innerSelectedKeys = ref<Array<RowKey>>([...(props.selectedKeys ?? [])])

// カラム表示/非表示管理 / 列显示/隐藏管理
const hiddenColumnKeys = ref<Set<string>>(new Set())

const toggleColumnVisibility = (key: string, checked: boolean) => {
  const next = new Set(hiddenColumnKeys.value)
  if (checked) {
    next.delete(key)
  } else {
    next.add(key)
  }
  hiddenColumnKeys.value = next
}

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

// 检查是否有操作列 / 操作列の有無チェック
const hasActionColumn = computed(() => {
  return columns.value?.some((col) => col.key === 'actions' || col.dataKey === 'actions')
})
const actionColumn = computed(() => {
  return columns.value?.find((col) => col.key === 'actions' || col.dataKey === 'actions')
})

// 检查是否有同梱列 / 同梱列の有無チェック
const hasBundleColumn = computed(() => {
  return columns.value?.some((col) => col.key === '__bundle__' || col.dataKey === '__bundle__')
})
const bundleColumn = computed(() => {
  return columns.value?.find((col) => col.key === '__bundle__' || col.dataKey === '__bundle__')
})

// 普通列（排除選択/操作/同梱） / 通常列（選択・操作・同梱を除外）
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

// 表示中の通常列（非表示除外） / 显示中的通常列（排除隐藏列）
const visibleRegularColumns = computed(() => {
  return regularColumns.value.filter((col: any) => {
    const key = String(col.key || col.dataKey)
    return !hiddenColumnKeys.value.has(key)
  })
})

// Total column count for empty-row colspan
const totalColumnCount = computed(() => {
  let count = visibleRegularColumns.value.length
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

// 获取单元格类名（用于 error-cell 等） / セルクラス名取得
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

// Row selection helpers / 行選択ヘルパー
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

// 批量編集相関 / 一括編集関連
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
    // 行選択が有効ではありません / Row selection not enabled
    return
  }
  if (!innerSelectedKeys.value.length) {
    // 編集対象の行が未選択 / No rows selected for editing
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
}

const handleBatchDeleteClick = () => {
  if (!batchDeleteEnabled.value) return
  if (!rowSelectionEnabled.value) {
    // 行選択が有効ではありません / Row selection not enabled
    return
  }
  if (!innerSelectedKeys.value.length) {
    // 削除対象の行が未選択 / No rows selected for deletion
    return
  }
  const keySet = new Set(innerSelectedKeys.value)
  const selectedRows = data.value.filter((row) => keySet.has((row as any)?.[rowKey.value as string]))
  emits('batch-delete', { selectedKeys: [...innerSelectedKeys.value], selectedRows })
}

// 分頁相関 / ページネーション関連
const totalItems = computed(() => {
  if (!paginationEnabled.value) {
    return filteredData.value.length
  }
  if (paginationMode.value === 'server') {
    return props.total !== undefined ? props.total : (data.value.length || 0)
  }
  return filteredData.value.length
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalItems.value / innerPageSize.value))
})

const pagerOffset = computed(() => (innerCurrentPage.value - 1) * innerPageSize.value)

const handlePagerOffsetChange = (newOffset: number) => {
  const newPage = Math.floor(newOffset / innerPageSize.value) + 1
  handlePageChange(newPage)
}

const handlePageSizeSelectChange = (event: Event) => {
  const size = Number((event.target as HTMLSelectElement).value)
  handlePageSizeChange(size)
}

// 前端排序関数 / フロントエンドソート関数
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

// 全局搜索过滤 / グローバル検索フィルター
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
.error-cell {
  background-color: #fef2f2;
}
</style>
