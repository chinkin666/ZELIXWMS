<script setup lang="ts">
/**
 * WMS DataTable ツールバー / WMS DataTable 工具栏
 *
 * 検索・フィルター・列表示制御・バッチアクションを提供。
 * 全て設定駆動 — ハードコーディングなし。
 */
import type { Table } from '@tanstack/vue-table'
import type { WmsToolbarConfig, WmsColumnSchema } from './types'
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Search, X, Settings2, SlidersHorizontal } from 'lucide-vue-next'

const props = defineProps<{
  table: Table<any>
  config?: WmsToolbarConfig
  schemas?: WmsColumnSchema[]
}>()

const searchText = ref('')
const activeFilters = ref<Record<string, string>>({})

const isFiltered = computed(() =>
  props.table.getState().columnFilters.length > 0 || searchText.value.length > 0,
)

const filterableSchemas = computed(() =>
  (props.schemas ?? []).filter(s => s.filterable && s.filterType === 'select' && s.filterOptions),
)

const selectedRowCount = computed(() => props.table.getFilteredSelectedRowModel().rows.length)

function handleSearch(value: string) {
  searchText.value = value
  const col = props.config?.searchColumnKey
  if (col && props.table.getColumn(col)) {
    props.table.getColumn(col)!.setFilterValue(value)
  } else {
    props.table.setGlobalFilter(value)
  }
}

function handleSelectFilter(columnKey: string, value: string) {
  if (value === '__all__') {
    activeFilters.value[columnKey] = ''
    props.table.getColumn(columnKey)?.setFilterValue(undefined)
  } else {
    activeFilters.value[columnKey] = value
    props.table.getColumn(columnKey)?.setFilterValue(value)
  }
}

function resetFilters() {
  searchText.value = ''
  activeFilters.value = {}
  props.table.resetColumnFilters()
  props.table.setGlobalFilter('')
}
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <div class="flex flex-1 items-center gap-2">
      <!-- 検索 / 搜索 -->
      <div v-if="config?.searchEnabled !== false" class="relative">
        <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          :placeholder="config?.searchPlaceholder ?? '検索...'"
          :model-value="searchText"
          class="h-9 w-[200px] pl-8 lg:w-[280px]"
          @update:model-value="handleSearch"
        />
      </div>

      <!-- ファセットフィルター / 分面筛选 -->
      <template v-for="schema in filterableSchemas" :key="schema.key">
        <Select
          :model-value="activeFilters[schema.key] || '__all__'"
          @update:model-value="(v: string) => handleSelectFilter(schema.key, v)"
        >
          <SelectTrigger class="h-9 w-auto min-w-[120px] gap-1 text-xs">
            <SlidersHorizontal class="h-3.5 w-3.5" />
            <SelectValue :placeholder="schema.label" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全て</SelectItem>
            <SelectItem v-for="opt in schema.filterOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </template>

      <!-- リセット / 重置 -->
      <Button v-if="isFiltered" variant="ghost" class="h-9 px-2 lg:px-3" @click="resetFilters">
        リセット
        <X class="ml-2 h-4 w-4" />
      </Button>
    </div>

    <div class="flex items-center gap-2">
      <!-- バッチアクション / 批量操作 -->
      <template v-if="selectedRowCount > 0 && config?.batchActions?.length">
        <Badge variant="secondary" class="mr-1">{{ selectedRowCount }}件選択</Badge>
        <Button
          v-for="action in config.batchActions"
          :key="action.key"
          :variant="action.variant ?? 'secondary'"
          size="sm"
          class="h-9"
          @click="action.handler(table.getFilteredSelectedRowModel().rows.map(r => r.original))"
        >
          <component v-if="action.icon" :is="action.icon" class="mr-1.5 h-4 w-4" />
          {{ action.label }}
        </Button>
      </template>

      <!-- ツールバーアクション / 工具栏操作 -->
      <Button
        v-for="action in config?.actions"
        :key="action.key"
        :variant="action.variant ?? 'default'"
        size="sm"
        class="h-9"
        @click="action.handler([])"
      >
        <component v-if="action.icon" :is="action.icon" class="mr-1.5 h-4 w-4" />
        {{ action.label }}
      </Button>

      <!-- 列表示制御 / 列显示控制 -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm" class="ml-auto h-9">
            <Settings2 class="mr-2 h-4 w-4" />
            列の表示
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-[180px]">
          <DropdownMenuLabel>表示列の切り替え</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            v-for="column in table.getAllColumns().filter(c => c.getCanHide())"
            :key="column.id"
            :model-value="column.getIsVisible()"
            @update:model-value="(v: boolean) => column.toggleVisibility(v)"
          >
            {{ column.columnDef.header ?? column.id }}
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </div>
</template>
