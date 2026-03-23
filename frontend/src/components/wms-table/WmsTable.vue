<script setup lang="ts">
/**
 * WMS通用データテーブル / WMS通用数据表格
 *
 * shadcn-vue + TanStack Table ベース。
 * 全ての列定義・フィルター・アクションは JSON/TS スキーマで駆動。
 * テンプレートにハードコーディングされた列は一切ない。
 */
import type { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/vue-table'
import type { WmsColumnSchema, WmsToolbarConfig } from './types'

import {
  FlexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { computed, ref, watch } from 'vue'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { valueUpdater } from '@/components/ui/table/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { buildColumnDefs } from './column-builder'
import DataTableToolbar from './DataTableToolbar.vue'
import DataTablePagination from './DataTablePagination.vue'

const props = withDefaults(defineProps<{
  columns: WmsColumnSchema[]
  data: any[]
  rowKey?: string
  loading?: boolean
  toolbar?: WmsToolbarConfig
  selectable?: boolean
  pageSizes?: number[]
  pageSize?: number
  onRowClick?: (row: any) => void
}>(), {
  rowKey: '_id',
  loading: false,
  selectable: false,
  pageSizes: () => [10, 20, 50, 100],
  pageSize: 20,
})

const emit = defineEmits<{
  'row-click': [row: any]
  'selection-change': [rows: any[]]
}>()

// TanStack状態 / TanStack状态
const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>(
  Object.fromEntries(
    props.columns.filter(c => c.visible === false).map(c => [c.key, false]),
  ),
)
const rowSelection = ref({})
const globalFilter = ref('')

// TanStack列定義（スキーマから自動構築）/ TanStack列定义（从Schema自动构建）
const columnDefs = computed(() => buildColumnDefs(props.columns, { selectable: props.selectable }))

// TanStackテーブルインスタンス / TanStack表格实例
const table = useVueTable({
  get data() { return props.data },
  get columns() { return columnDefs.value },
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get columnVisibility() { return columnVisibility.value },
    get rowSelection() { return rowSelection.value },
    get globalFilter() { return globalFilter.value },
  },
  enableRowSelection: props.selectable,
  onSortingChange: v => valueUpdater(v, sorting),
  onColumnFiltersChange: v => valueUpdater(v, columnFilters),
  onColumnVisibilityChange: v => valueUpdater(v, columnVisibility),
  onRowSelectionChange: v => valueUpdater(v, rowSelection),
  onGlobalFilterChange: v => valueUpdater(v, globalFilter),
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFacetedRowModel: getFacetedRowModel(),
  getFacetedUniqueValues: getFacetedUniqueValues(),
  initialState: {
    pagination: { pageSize: props.pageSize },
  },
})

// 選択行変更の監視 / 监听选中行变化
watch(rowSelection, () => {
  emit('selection-change', table.getFilteredSelectedRowModel().rows.map(r => r.original))
}, { deep: true })

function handleRowClick(row: any) {
  emit('row-click', row.original)
  props.onRowClick?.(row.original)
}
</script>

<template>
  <div class="w-full space-y-4">
    <!-- ツールバー / 工具栏 -->
    <DataTableToolbar :table="table" :config="toolbar" :schemas="columns" />

    <!-- テーブル / 表格 -->
    <div class="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead
              v-for="header in headerGroup.headers"
              :key="header.id"
              :style="header.column.columnDef.size ? { width: `${header.column.columnDef.size}px` } : undefined"
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
          <!-- ローディング / 加载中 -->
          <template v-if="loading">
            <TableRow v-for="i in 5" :key="`skeleton-${i}`">
              <TableCell v-for="j in table.getAllColumns().length" :key="`s-${i}-${j}`">
                <Skeleton class="h-5 w-full" />
              </TableCell>
            </TableRow>
          </template>

          <!-- データ行 / 数据行 -->
          <template v-else-if="table.getRowModel().rows?.length">
            <TableRow
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              :data-state="row.getIsSelected() && 'selected'"
              :class="onRowClick ? 'cursor-pointer' : ''"
              @click="handleRowClick(row)"
            >
              <TableCell
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                :class="(cell.column.columnDef.meta as any)?.align === 'right' ? 'text-right' : (cell.column.columnDef.meta as any)?.align === 'center' ? 'text-center' : ''"
              >
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>

          <!-- 空状態 / 空状态 -->
          <TableRow v-else>
            <TableCell :colspan="table.getAllColumns().length" class="h-24 text-center">
              <slot name="empty">
                データがありません
              </slot>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- ページネーション / 分页 -->
    <DataTablePagination :table="table" :page-sizes="pageSizes" />
  </div>
</template>
