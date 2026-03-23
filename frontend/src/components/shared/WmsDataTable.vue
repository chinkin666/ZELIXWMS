<script setup lang="ts">
/**
 * 統合データテーブル / 统一数据表
 *
 * カラム表示切替・ページネーション・ソート機能を持つ統合テーブル。
 * 带列显示切换、分页、排序功能的统一数据表。
 */
import { ref, computed } from 'vue'
import { cn } from '@/lib/utils'
import { useI18n } from '@/composables/useI18n'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-vue-next'

const { t } = useI18n()

export interface WmsColumn {
  key: string
  title?: string
  label?: string
  width?: string
  sortable?: boolean
  visible?: boolean
  align?: 'left' | 'center' | 'right'
}

const props = withDefaults(defineProps<{
  columns: WmsColumn[]
  rows: Record<string, any>[]
  page?: number
  limit?: number
  total?: number
  pageSizes?: number[]
  selectable?: boolean
  striped?: boolean
  loading?: boolean
}>(), {
  page: 1,
  limit: 20,
  total: 0,
  pageSizes: () => [10, 20, 50, 100],
  selectable: false,
  striped: false,
  loading: false,
})

const emit = defineEmits<{
  'update:page': [page: number]
  'update:limit': [limit: number]
  'sort': [payload: { key: string; order: 'asc' | 'desc' }]
  'row-click': [row: Record<string, any>, index: number]
}>()

// カラム表示制御 / 列显示控制
const hiddenColumns = ref<Set<string>>(new Set(
  props.columns.filter(c => c.visible === false).map(c => c.key)
))

const visibleColumns = computed(() =>
  props.columns.filter(c => !hiddenColumns.value.has(c.key))
)

function toggleColumn(key: string) {
  const next = new Set(hiddenColumns.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  hiddenColumns.value = next
}

function getColumnLabel(col: WmsColumn): string {
  return col.title ?? col.label ?? col.key
}

// ソート / 排序
const sortKey = ref('')
const sortOrder = ref<'asc' | 'desc'>('asc')

function handleSort(key: string) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
  emit('sort', { key: sortKey.value, order: sortOrder.value })
}

// ページネーション / 分页
const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))

function goToPage(p: number) {
  const clamped = Math.max(1, Math.min(p, totalPages.value))
  emit('update:page', clamped)
}

function handleLimitChange(val: string) {
  emit('update:limit', Number(val))
  emit('update:page', 1)
}

// 行クリック / 行点击
function handleRowClick(row: Record<string, any>, index: number) {
  emit('row-click', row, index)
}

// 表示範囲テキスト / 显示范围文本
const rangeText = computed(() => {
  if (props.total === 0) return '0 件'
  const start = (props.page - 1) * props.limit + 1
  const end = Math.min(props.page * props.limit, props.total)
  return `${start}-${end} / ${props.total} 件`
})
</script>

<template>
  <div class="w-full space-y-2">
    <!-- ツールバー: カラム表示切替 / 工具栏: 列显示切换 -->
    <div class="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="gap-1.5">
            <Settings2 class="size-4" />
            表示列
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuLabel>カラム表示 / 列显示</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            v-for="col in columns"
            :key="col.key"
            :checked="!hiddenColumns.has(col.key)"
            @update:checked="toggleColumn(col.key)"
          >
            {{ getColumnLabel(col) }}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <!-- テーブル / 表格 -->
    <div class="rounded-md border dark:border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              v-for="col in visibleColumns"
              :key="col.key"
              :style="col.width ? { width: col.width } : undefined"
              :class="cn(
                col.sortable && 'cursor-pointer select-none hover:bg-muted/50',
                col.align === 'center' && 'text-center',
                col.align === 'right' && 'text-right',
              )"
              @click="col.sortable && handleSort(col.key)"
            >
              <div
                :class="cn(
                  'flex items-center gap-1',
                  col.align === 'center' && 'justify-center',
                  col.align === 'right' && 'justify-end',
                )"
              >
                <span>{{ getColumnLabel(col) }}</span>
                <template v-if="col.sortable">
                  <ArrowUp v-if="sortKey === col.key && sortOrder === 'asc'" class="size-3.5" />
                  <ArrowDown v-else-if="sortKey === col.key && sortOrder === 'desc'" class="size-3.5" />
                  <ArrowUpDown v-else class="size-3.5 text-muted-foreground/50" />
                </template>
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <!-- ローディング / 加载中 -->
          <TableRow v-if="loading">
            <TableCell :colspan="visibleColumns.length">
              <div class="space-y-3 p-4">
                <Skeleton class="h-4 w-[250px] mx-auto" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
                <Skeleton class="h-10 w-full" />
              </div>
            </TableCell>
          </TableRow>
          <!-- 空状態 / 空状态 -->
          <TableRow v-else-if="rows.length === 0">
            <TableCell :colspan="visibleColumns.length" class="h-24 text-center text-muted-foreground">
              データがありません
            </TableCell>
          </TableRow>
          <!-- データ行 / 数据行 -->
          <TableRow
            v-else
            v-for="(row, rowIndex) in rows"
            :key="rowIndex"
            :class="cn(
              'cursor-pointer transition-colors',
              striped && rowIndex % 2 === 1 && 'bg-muted/30',
            )"
            @click="handleRowClick(row, rowIndex)"
          >
            <TableCell
              v-for="col in visibleColumns"
              :key="col.key"
              :class="cn(
                col.align === 'center' && 'text-center',
                col.align === 'right' && 'text-right',
              )"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] ?? '-' }}
              </slot>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- ページネーション / 分页 -->
    <div v-if="total > 0" class="flex items-center justify-between px-2">
      <div class="text-sm text-muted-foreground">
        {{ rangeText }}
      </div>

      <div class="flex items-center gap-4">
        <!-- ページサイズ / 每页条数 -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground whitespace-nowrap">表示件数</span>
          <Select :model-value="String(limit)" @update:model-value="handleLimitChange">
            <SelectTrigger class="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="size in pageSizes" :key="size" :value="String(size)">
                {{ size }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- ページナビ / 页码导航 -->
        <div class="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            :disabled="page <= 1"
            @click="goToPage(1)"
          >
            <ChevronsLeft class="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            :disabled="page <= 1"
            @click="goToPage(page - 1)"
          >
            <ChevronLeft class="size-4" />
          </Button>
          <span class="text-sm px-2 whitespace-nowrap">
            {{ page }} / {{ totalPages }}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            :disabled="page >= totalPages"
            @click="goToPage(page + 1)"
          >
            <ChevronRight class="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            :disabled="page >= totalPages"
            @click="goToPage(totalPages)"
          >
            <ChevronsRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
