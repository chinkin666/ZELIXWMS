<template>
  <div class="mgmt-cell">
    <div class="mgmt-cell__row">
      <span class="mgmt-cell__label">配送会社</span>
      <span>{{ carrierLabel }}</span>
    </div>
    <div class="mgmt-cell__row">
      <span class="mgmt-cell__label">サービス</span>
      <span>{{ invoiceTypeLabel }}</span>
    </div>
    <div class="mgmt-cell__row">
      <span class="mgmt-cell__label">温度帯</span>
      <span :style="{ color: coolTypeColor }">{{ coolTypeLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  carrierLabel: string
  invoiceTypeLabel: string
  coolTypeLabel: string
  coolTypeColor: string
}>()
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
</style>
