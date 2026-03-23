<script setup lang="ts">
/**
 * ページネーションフッターコンポーネント
 * 分页脚注组件
 *
 * shadcn-vue DataTable Pagination パターン準拠
 * 遵循 shadcn-vue DataTable Pagination 模式
 */
import type { Table } from '@tanstack/vue-table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  table: Table<any>
  pageSizes?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  pageSizes: () => [10, 20, 30, 50, 100],
})

const emit = defineEmits<{
  'page-change': [payload: { page: number; pageSize: number }]
}>()

function handlePageSizeChange(value: string) {
  props.table.setPageSize(Number(value))
  emitPageChange()
}

function goToFirstPage() {
  props.table.setPageIndex(0)
  emitPageChange()
}

function goToPreviousPage() {
  props.table.previousPage()
  emitPageChange()
}

function goToNextPage() {
  props.table.nextPage()
  emitPageChange()
}

function goToLastPage() {
  props.table.setPageIndex(props.table.getPageCount() - 1)
  emitPageChange()
}

function emitPageChange() {
  emit('page-change', {
    page: props.table.getState().pagination.pageIndex + 1,
    pageSize: props.table.getState().pagination.pageSize,
  })
}
</script>

<template>
  <div class="flex items-center justify-between px-2 py-4">
    <!-- 選択件数 / 选中数量 -->
    <div class="flex-1 text-sm text-muted-foreground">
      <template v-if="table.getFilteredSelectedRowModel().rows.length > 0">
        {{ table.getFilteredSelectedRowModel().rows.length }} 件選択中 /
      </template>
      合計 {{ table.getFilteredRowModel().rows.length }} 件
    </div>

    <div class="flex items-center space-x-6 lg:space-x-8">
      <!-- ページサイズセレクター / 每页条数选择器 -->
      <div class="flex items-center space-x-2">
        <p class="text-sm font-medium">表示件数</p>
        <Select
          :model-value="`${table.getState().pagination.pageSize}`"
          @update:model-value="handlePageSizeChange"
        >
          <SelectTrigger class="h-8 w-[70px]">
            <SelectValue :placeholder="`${table.getState().pagination.pageSize}`" />
          </SelectTrigger>
          <SelectContent side="top">
            <SelectItem
              v-for="pageSize in props.pageSizes"
              :key="pageSize"
              :value="`${pageSize}`"
            >
              {{ pageSize }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- ページ情報 / 页码信息 -->
      <div class="flex w-[100px] items-center justify-center text-sm font-medium">
        {{ table.getState().pagination.pageIndex + 1 }} / {{ table.getPageCount() }} ページ
      </div>

      <!-- ページナビゲーション / 页面导航 -->
      <div class="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon-sm"
          :disabled="!table.getCanPreviousPage()"
          @click="goToFirstPage"
        >
          <span class="sr-only">最初のページ</span>
          <ChevronsLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          :disabled="!table.getCanPreviousPage()"
          @click="goToPreviousPage"
        >
          <span class="sr-only">前のページ</span>
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          :disabled="!table.getCanNextPage()"
          @click="goToNextPage"
        >
          <span class="sr-only">次のページ</span>
          <ChevronRight class="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          :disabled="!table.getCanNextPage()"
          @click="goToLastPage"
        >
          <span class="sr-only">最後のページ</span>
          <ChevronsRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
