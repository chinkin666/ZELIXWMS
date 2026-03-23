/**
 * 列スキーマ → TanStack ColumnDef 変換
 * 列Schema → TanStack ColumnDef 转换
 *
 * WmsColumnSchema[] を TanStack vue-table の ColumnDef[] に変換する。
 * ハードコーディング一切なし — 全て設定駆動。
 */
import type { ColumnDef } from '@tanstack/vue-table'
import type { WmsColumnSchema } from './types'
import { h } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from './DataTableColumnHeader.vue'

/** 日付フォーマッタ / 日期格式化 */
function formatDate(value: any, format?: string): string {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  if (format === 'date') return d.toLocaleDateString('ja-JP')
  if (format === 'datetime') return d.toLocaleString('ja-JP')
  return d.toLocaleDateString('ja-JP')
}

/** 通貨フォーマッタ / 货币格式化 */
function formatCurrency(value: any, prefix = '¥'): string {
  if (value == null) return '-'
  return `${prefix}${Number(value).toLocaleString()}`
}

/** スキーマ配列からColumnDef配列を構築 / 从Schema数组构建ColumnDef数组 */
export function buildColumnDefs<T>(
  schemas: WmsColumnSchema<T>[],
  options?: { selectable?: boolean },
): ColumnDef<T, any>[] {
  const defs: ColumnDef<T, any>[] = []

  // 選択列 / 选择列
  if (options?.selectable) {
    defs.push({
      id: '__select__',
      header: ({ table }) =>
        h(Checkbox, {
          modelValue: table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate'),
          'onUpdate:modelValue': (value: boolean) => table.toggleAllPageRowsSelected(!!value),
          ariaLabel: '全選択',
        }),
      cell: ({ row }) =>
        h(Checkbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean) => row.toggleSelected(!!value),
          ariaLabel: '行選択',
        }),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    })
  }

  // スキーマから列を構築 / 从Schema构建列
  for (const schema of schemas) {
    const def: ColumnDef<T, any> = {
      accessorKey: schema.key,
      header: schema.sortable !== false
        ? ({ column }) => h(DataTableColumnHeader, { column, title: schema.label })
        : schema.label,
      enableSorting: schema.sortable !== false,
      enableHiding: true,
      size: schema.width,
      meta: { align: schema.align, schema },
    }

    // セルレンダラー / 单元格渲染器
    if (schema.render) {
      def.cell = ({ row }) => schema.render!(row.getValue(schema.key), row.original)
    } else {
      switch (schema.type) {
        case 'badge':
          def.cell = ({ row }) => {
            const value = row.getValue(schema.key) as string
            const mapping = schema.badgeMap?.[value]
            if (mapping) {
              return h(Badge, { variant: mapping.variant }, () => mapping.label)
            }
            return h(Badge, { variant: 'secondary' }, () => value ?? '-')
          }
          break

        case 'date':
          def.cell = ({ row }) => formatDate(row.getValue(schema.key), 'date')
          break

        case 'datetime':
          def.cell = ({ row }) => formatDate(row.getValue(schema.key), 'datetime')
          break

        case 'currency':
          def.cell = ({ row }) => formatCurrency(row.getValue(schema.key), schema.currencyPrefix)
          break

        case 'boolean':
          def.cell = ({ row }) => row.getValue(schema.key) ? '○' : '-'
          break

        case 'number':
          def.cell = ({ row }) => {
            const v = row.getValue(schema.key)
            return v != null ? Number(v).toLocaleString() : '-'
          }
          break

        default:
          def.cell = ({ row }) => row.getValue(schema.key) ?? '-'
      }
    }

    // フィルター設定 / 筛选设置
    if (schema.filterable) {
      def.enableColumnFilter = true
      def.filterFn = schema.filterType === 'select' ? 'equals' : 'includesString'
    }

    defs.push(def)
  }

  return defs
}
