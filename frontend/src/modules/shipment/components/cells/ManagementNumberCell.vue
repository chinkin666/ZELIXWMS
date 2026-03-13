<template>
  <div class="mgmt-cell">
    <div class="mgmt-cell__row">
      <span class="mgmt-cell__label">管理No</span>
      <el-link v-if="row.orderNumber" type="primary" @click="$emit('edit', row)">{{ row.orderNumber }}</el-link>
      <span v-else class="mgmt-cell__muted">自動採番</span>
    </div>
    <div class="mgmt-cell__row">
      <span class="mgmt-cell__label">注文No</span>
      <el-link type="primary" @click="$emit('edit', row)">{{ row.customerManagementNumber || '-' }}</el-link>
    </div>
    <div class="mgmt-cell__row">
      <span class="mgmt-cell__label">送り状</span>
      <span>{{ row.trackingId || '未発行' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ row: any }>()
defineEmits<{ edit: [row: any] }>()
</script>

<style scoped>
.mgmt-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  line-height: 1.6;
}
.mgmt-cell__row {
  display: flex;
  gap: 6px;
  align-items: baseline;
}
.mgmt-cell__label {
  color: #909399;
  font-size: 11px;
  flex-shrink: 0;
  min-width: 48px;
}
.mgmt-cell__muted {
  color: #c0c4cc;
  font-size: 11px;
}
</style>
