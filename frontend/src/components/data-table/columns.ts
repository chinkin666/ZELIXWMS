/**
 * DataTableColumn → TanStack ColumnDef 変換アダプター
 * DataTableColumn → TanStack ColumnDef 转换适配器
 *
 * 旧 Table.vue の列定義を TanStack Vue Table 形式に変換する
 * 将旧 Table.vue 的列定义转换为 TanStack Vue Table 格式
 */
import type { ColumnDef } from '@tanstack/vue-table'
import { h } from 'vue'
import type { DataTableColumn } from './types'
import DataTableColumnHeader from './DataTableColumnHeader.vue'

/**
 * DataTableColumn 配列を TanStack ColumnDef 配列に変換
 * 将 DataTableColumn 数组转换为 TanStack ColumnDef 数组
 */
export function createColumnDefs(columns: DataTableColumn[]): ColumnDef<any>[] {
  return columns.map((col) => {
    const accessorKey = col.dataKey ?? col.key
    const headerTitle = col.label ?? col.title ?? accessorKey

    const columnDef: ColumnDef<any> = {
      accessorKey,
      id: col.key,

      header: ({ column }) => {
        return h(DataTableColumnHeader, {
          column,
          title: headerTitle,
        })
      },

      enableSorting: col.sortable !== false,
      enableHiding: true,

      meta: {
        align: col.align,
        className: col.className,
        fieldType: col.fieldType,
        searchable: col.searchable,
        searchType: col.searchType,
        searchOptions: col.searchOptions,
      },
    }

    // 列幅設定 / 列宽设置
    if (col.width != null) {
      columnDef.size = col.width
    }
    if (col.minWidth != null) {
      columnDef.minSize = col.minWidth
    }

    // cellRenderer 後方互換対応 / cellRenderer 向后兼容处理
    if (col.cellRenderer) {
      const renderer = col.cellRenderer
      columnDef.cell = ({ row, getValue }) => {
        return renderer({
          rowData: row.original,
          value: getValue(),
        })
      }
    }

    return columnDef
  })
}
