<template>
  <div v-if="visible" class="drawer-overlay" @click.self="$emit('update:visible', false)">
    <div class="drawer-panel">
      <div class="drawer-header">
        <h3 class="drawer-title">スキーマ分析</h3>
        <button class="drawer-close" @click="$emit('update:visible', false)">&times;</button>
      </div>
      <div class="drawer-body">
        <OrderSchemaAnalysis
          :orders="orders"
          :carriers="carriers"
          @filter="(fieldPath: string, value: any) => $emit('filter', fieldPath, value)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import OrderSchemaAnalysis from '@/components/schema-analysis/OrderSchemaAnalysis.vue'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'

defineProps<{
  visible: boolean
  orders: OrderDocument[]
  carriers: Carrier[]
}>()

defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'filter', fieldPath: string, value: any): void
}>()
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}

.drawer-panel {
  width: 50%;
  min-width: 400px;
  max-width: 100%;
  height: 100%;
  background: #fff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.drawer-close {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #909399;
  padding: 4px 8px;
}

.drawer-body {
  flex: 1;
  overflow: auto;
  padding: 20px;
}
</style>
