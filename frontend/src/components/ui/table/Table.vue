<script setup lang="ts">
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()
</script>

<template>
  <div data-slot="table-container" class="relative w-full overflow-auto">
    <Table data-slot="table" :class="cn('w-full caption-bottom text-sm', props.class)">
      <slot />
    </Table>
  </div>
</template>
