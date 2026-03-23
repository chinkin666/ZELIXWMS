<script setup lang="ts">
/**
 * ソート可能な列ヘッダーコンポーネント
 * 可排序的列标题组件
 *
 * shadcn-vue DataTable パターン準拠
 * 遵循 shadcn-vue DataTable 模式
 */
import type { Column } from '@tanstack/vue-table'
import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Props {
  column: Column<any, any>
  title: string
  class?: string
}

const props = defineProps<Props>()
</script>

<template>
  <div v-if="!props.column.getCanSort()" :class="cn('text-xs', props.class)">
    {{ props.title }}
  </div>
  <DropdownMenu v-else>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="-ml-3 h-8 data-[state=open]:bg-accent"
      >
        <span>{{ props.title }}</span>
        <ArrowDown
          v-if="props.column.getIsSorted() === 'desc'"
          class="ml-2 h-4 w-4"
        />
        <ArrowUp
          v-else-if="props.column.getIsSorted() === 'asc'"
          class="ml-2 h-4 w-4"
        />
        <ArrowUpDown v-else class="ml-2 h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem @click="props.column.toggleSorting(false)">
        <ArrowUp class="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
        昇順
      </DropdownMenuItem>
      <DropdownMenuItem @click="props.column.toggleSorting(true)">
        <ArrowDown class="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
        降順
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem @click="props.column.toggleVisibility(false)">
        <EyeOff class="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
        非表示
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
