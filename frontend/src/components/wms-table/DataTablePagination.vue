<script setup lang="ts">
import type { Table } from '@tanstack/vue-table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'

defineProps<{
  table: Table<any>
  pageSizes?: number[]
}>()
</script>

<template>
  <div class="flex items-center justify-between px-2 py-4">
    <div class="flex-1 text-sm text-muted-foreground">
      {{ table.getFilteredSelectedRowModel().rows.length }}件選択 /
      {{ table.getFilteredRowModel().rows.length }}件中
    </div>
    <div class="flex items-center space-x-6 lg:space-x-8">
      <div class="flex items-center space-x-2">
        <p class="text-sm font-medium">表示件数</p>
        <Select
          :model-value="`${table.getState().pagination.pageSize}`"
          @update:model-value="(v: string) => table.setPageSize(Number(v))"
        >
          <SelectTrigger class="h-8 w-[70px]">
            <SelectValue :placeholder="`${table.getState().pagination.pageSize}`" />
          </SelectTrigger>
          <SelectContent side="top">
            <SelectItem v-for="size in (pageSizes ?? [10, 20, 50, 100])" :key="size" :value="`${size}`">
              {{ size }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="flex w-[120px] items-center justify-center text-sm font-medium">
        {{ table.getState().pagination.pageIndex + 1 }} / {{ table.getPageCount() }} ページ
      </div>
      <div class="flex items-center space-x-2">
        <Button variant="outline" class="hidden h-8 w-8 p-0 lg:flex" :disabled="!table.getCanPreviousPage()" @click="table.setPageIndex(0)">
          <span class="sr-only">最初のページ</span>
          <ChevronsLeft class="h-4 w-4" />
        </Button>
        <Button variant="outline" class="h-8 w-8 p-0" :disabled="!table.getCanPreviousPage()" @click="table.previousPage()">
          <span class="sr-only">前のページ</span>
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <Button variant="outline" class="h-8 w-8 p-0" :disabled="!table.getCanNextPage()" @click="table.nextPage()">
          <span class="sr-only">次のページ</span>
          <ChevronRight class="h-4 w-4" />
        </Button>
        <Button variant="outline" class="hidden h-8 w-8 p-0 lg:flex" :disabled="!table.getCanNextPage()" @click="table.setPageIndex(table.getPageCount() - 1)">
          <span class="sr-only">最後のページ</span>
          <ChevronsRight class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
