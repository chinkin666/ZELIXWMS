<script setup lang="ts">
/**
 * DataTable メインコンポーネント — shadcn-vue + TanStack Vue Table
 * DataTable 主组件 — shadcn-vue + TanStack Vue Table
 *
 * 旧 Table.vue との後方互換性を維持しつつ、TanStack Vue Table を活用
 * 在保持与旧 Table.vue 向后兼容的同时，利用 TanStack Vue Table
 */
import type { DataTableColumn } from './types'
import type {
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  PaginationState,
  RowSelectionState,
} from '@tanstack/vue-table'
import {
  FlexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { ref, computed, watch, h } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createColumnDefs } from './columns'
import DataTablePagination from './DataTablePagination.vue'
import DataTableViewOptions from './DataTableViewOptions.vue'

// ── Props / プロパティ ──
interface Props {
  /** 列定義 / 列定义 */
  columns: DataTableColumn[]
  /** テーブルデータ / 表格数据 */
  data: any[]
  /** 行キー / 行键 */
  rowKey?: string
  /** ローディング状態 / 加载状态 */
  loading?: boolean

  // ページネーション / 分页
  /** ページネーション有効化 / 启用分页 */
  paginationEnabled?: boolean
  /** ページネーションモード / 分页模式 */
  paginationMode?: 'client' | 'server'
  /** ページサイズ / 每页条数 */
  pageSize?: number
  /** ページサイズ選択肢 / 每页条数选项 */
  pageSizes?: number[]
  /** 総件数（サーバーモード用） / 总数（服务端模式用） */
  total?: number
  /** 現在のページ（1始まり、サーバーモード用） / 当前页（从1开始，服务端模式用） */
  currentPage?: number

  // 選択 / 选择
  /** 行選択有効化 / 启用行选择 */
  rowSelectionEnabled?: boolean

  // ソート / 排序
  /** ソート有効化 / 启用排序 */
  sortEnabled?: boolean

  // 検索 / 搜索
  /** グローバル検索テキスト / 全局搜索文本 */
  globalSearchText?: string
  /** 検索対象列 / 搜索列 */
  searchColumns?: DataTableColumn[]
}

const props = withDefaults(defineProps<Props>(), {
  rowKey: '_id',
  loading: false,
  paginationEnabled: true,
  paginationMode: 'client',
  pageSize: 20,
  pageSizes: () => [10, 20, 30, 50, 100],
  total: 0,
  currentPage: 1,
  rowSelectionEnabled: false,
  sortEnabled: true,
  globalSearchText: '',
  searchColumns: () => [],
})

// ── Emits / イベント ──
const emit = defineEmits<{
  'page-change': [payload: { page: number; pageSize: number }]
  'sort-change': [payload: { key: string; order: 'asc' | 'desc' | false }]
  'search': [filters: Record<string, any>]
  'selection-change': [rows: any[]]
  'update:selectedKeys': [keys: string[]]
}>()

// ── State / 状態 ──
const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>(
  buildInitialVisibility(props.columns),
)
const rowSelection = ref<RowSelectionState>({})
const globalFilter = ref(props.globalSearchText)

const pagination = ref<PaginationState>({
  pageIndex: (props.currentPage ?? 1) - 1,
  pageSize: props.pageSize ?? 20,
})

// ── 初期列非表示設定 / 初始列隐藏设置 ──
function buildInitialVisibility(cols: DataTableColumn[]): VisibilityState {
  const vis: VisibilityState = {}
  for (const col of cols) {
    if (col.visible === false) {
      vis[col.key] = false
    }
  }
  return vis
}

// ── TanStack 列定義構築 / TanStack 列定义构建 ──
const tanstackColumns = computed(() => {
  const defs = createColumnDefs(props.columns)

  // 行選択チェックボックス列を先頭に追加 / 在最前面添加行选择复选框列
  if (props.rowSelectionEnabled) {
    defs.unshift({
      id: 'select',
      header: ({ table }) =>
        h(Checkbox, {
          'modelValue': table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
          'ariaLabel': 'Select all',
          'class': 'translate-y-0.5',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          'modelValue': row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean) => row.toggleSelected(!!value),
          'ariaLabel': 'Select row',
          'class': 'translate-y-0.5',
        }),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    })
  }

  return defs
})

// ── テーブルインスタンス / 表格实例 ──
const table = useVueTable({
  get data() {
    return props.data
  },
  get columns() {
    return tanstackColumns.value
  },
  state: {
    get sorting() {
      return sorting.value
    },
    get columnFilters() {
      return columnFilters.value
    },
    get columnVisibility() {
      return columnVisibility.value
    },
    get rowSelection() {
      return rowSelection.value
    },
    get globalFilter() {
      return globalFilter.value
    },
    get pagination() {
      return pagination.value
    },
  },
  // サーバーモードの場合は手動ページネーション / 服务端模式时使用手动分页
  manualPagination: props.paginationMode === 'server',
  manualSorting: props.paginationMode === 'server',
  manualFiltering: props.paginationMode === 'server',
  get pageCount() {
    if (props.paginationMode === 'server' && props.total) {
      return Math.ceil(props.total / pagination.value.pageSize)
    }
    return undefined
  },
  enableRowSelection: props.rowSelectionEnabled,
  getRowId: (row) => row[props.rowKey] ?? row.id ?? row._id,
  onSortingChange: (updaterOrValue) => {
    sorting.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(sorting.value)
        : updaterOrValue
  },
  onColumnFiltersChange: (updaterOrValue) => {
    columnFilters.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(columnFilters.value)
        : updaterOrValue
  },
  onColumnVisibilityChange: (updaterOrValue) => {
    columnVisibility.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(columnVisibility.value)
        : updaterOrValue
  },
  onRowSelectionChange: (updaterOrValue) => {
    rowSelection.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(rowSelection.value)
        : updaterOrValue
  },
  onPaginationChange: (updaterOrValue) => {
    pagination.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(pagination.value)
        : updaterOrValue
  },
  onGlobalFilterChange: (updaterOrValue) => {
    globalFilter.value =
      typeof updaterOrValue === 'function'
        ? updaterOrValue(globalFilter.value)
        : updaterOrValue
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: props.paginationEnabled
    ? getPaginationRowModel()
    : undefined,
})

// ── Watchers / 監視 ──

// ソート変更を親に通知 / 将排序变更通知父组件
watch(sorting, (newSorting) => {
  if (newSorting.length > 0) {
    const sort = newSorting[0]
    emit('sort-change', {
      key: sort.id,
      order: sort.desc ? 'desc' : 'asc',
    })
  } else {
    emit('sort-change', { key: '', order: false })
  }
})

// 行選択変更を親に通知 / 将行选择变更通知父组件
watch(
  rowSelection,
  () => {
    const selectedRows = table
      .getFilteredSelectedRowModel()
      .rows.map((row) => row.original)
    emit('selection-change', selectedRows)
    emit(
      'update:selectedKeys',
      selectedRows.map((r) => r[props.rowKey] ?? r.id ?? r._id),
    )
  },
  { deep: true },
)

// 外部からのグローバル検索テキスト同期 / 从外部同步全局搜索文本
watch(
  () => props.globalSearchText,
  (val) => {
    globalFilter.value = val
  },
)

// 外部からのページ同期（サーバーモード） / 从外部同步页码（服务端模式）
watch(
  () => props.currentPage,
  (val) => {
    if (val != null) {
      pagination.value = { ...pagination.value, pageIndex: val - 1 }
    }
  },
)

watch(
  () => props.pageSize,
  (val) => {
    if (val != null) {
      pagination.value = { ...pagination.value, pageSize: val }
    }
  },
)

// ページネーションイベント中継 / 分页事件中继
function handlePageChange(payload: { page: number; pageSize: number }) {
  emit('page-change', payload)
}

// テーブルインスタンスを親に公開 / 将表格实例暴露给父组件
defineExpose({ table })
</script>

<template>
  <div class="w-full">
    <!-- ツールバー / 工具栏 -->
    <div class="flex items-center py-4 gap-2">
      <Input
        placeholder="検索..."
        :model-value="globalFilter"
        class="max-w-sm"
        @update:model-value="(val: string) => (globalFilter = val)"
      />
      <slot name="toolbar" />
      <DataTableViewOptions :table="table" />
    </div>

    <!-- テーブル本体 / 表格主体 -->
    <div class="rounded-md border relative">
      <!-- ローディングオーバーレイ / 加载遮罩 -->
      <div
        v-if="loading"
        class="absolute inset-0 z-10 flex items-center justify-center bg-background/60"
      >
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>

      <Table>
        <TableHeader>
          <TableRow
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
          >
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              :style="{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }"
            >
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() ? 'selected' : undefined"
            >
              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
              >
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-else>
            <TableCell
              :colspan="tanstackColumns.length"
              class="h-24 text-center"
            >
              データがありません
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- ページネーション / 分页 -->
    <DataTablePagination
      v-if="paginationEnabled"
      :table="table"
      :page-sizes="pageSizes"
      @page-change="handlePageChange"
    />
  </div>
</template>
