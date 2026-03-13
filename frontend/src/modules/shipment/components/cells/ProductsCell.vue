<template>
  <template v-if="productList.length > 0">
    <div v-for="(p, idx) in productList" :key="idx" class="product-line">
      <span class="product-line__name">{{ p.productName || p.name || p.inputSku || p.sku }}</span>
      <el-tag size="small" type="info">×{{ p.quantity }}</el-tag>
    </div>
  </template>
  <span v-else>-</span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ row: any }>()

const productList = computed(() => {
  const prods = props.row.products
  if (!prods) return []
  if (Array.isArray(prods)) return prods
  if (typeof prods === 'object') return Object.values(prods)
  return []
})
</script>

<style scoped>
.product-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.8;
}
.product-line__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}
</style>
