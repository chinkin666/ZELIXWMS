<template>
  <div v-if="total > 0" class="wms-pagination">
    <el-pagination
      v-model:current-page="currentPageModel"
      v-model:page-size="pageSizeModel"
      :page-sizes="pageSizes"
      :total="total"
      :layout="layout"
      background
      @current-change="$emit('current-change', $event)"
      @size-change="$emit('size-change', $event)"
    />
  </div>
</template>

<script setup lang="ts">
const currentPageModel = defineModel<number>('currentPage', { default: 1 })
const pageSizeModel = defineModel<number>('pageSize', { default: 50 })

withDefaults(defineProps<{
  total: number
  pageSizes?: number[]
  layout?: string
}>(), {
  pageSizes: () => [20, 50, 100, 200],
  layout: 'total, sizes, prev, pager, next, jumper',
})

defineEmits<{
  'current-change': [page: number]
  'size-change': [size: number]
}>()
</script>

<style scoped>
.wms-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
}
</style>
