<script setup lang="ts">
/**
 * 列表示/非表示トグルコンポーネント
 * 列显示/隐藏切换组件
 *
 * shadcn-vue DataTable ViewOptions パターン準拠
 * 遵循 shadcn-vue DataTable ViewOptions 模式
 */
import type { Table } from '@tanstack/vue-table'
import { Settings2 } from 'lucide-vue-next'
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  table: Table<any>
}

const props = defineProps<Props>()

const toggleableColumns = computed(() =>
  props.table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide()),
)
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="outline" size="sm" class="ml-auto hidden h-8 lg:flex">
        <Settings2 class="mr-2 h-4 w-4" />
        列の表示
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-40">
      <DropdownMenuLabel>表示する列</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuCheckboxItem
        v-for="column in toggleableColumns"
        :key="column.id"
        :checked="column.getIsVisible()"
        @update:checked="(value: boolean) => column.toggleVisibility(!!value)"
      >
        {{ (column.columnDef.meta as any)?.title ?? column.id }}
      </DropdownMenuCheckboxItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
