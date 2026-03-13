<template>
  <div class="mgmt-cell">
    <div class="mgmt-cell__row">
      <span class="mgmt-cell__label">出荷予定</span>
      <span>{{ row.shipPlanDate || '-' }}</span>
    </div>
    <div class="mgmt-cell__row">
      <span class="mgmt-cell__label">配達日</span>
      <span>{{ row.deliveryDatePreference || '-' }}</span>
    </div>
    <div class="mgmt-cell__row">
      <span class="mgmt-cell__label">時間帯</span>
      <span>{{ timeSlotLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  row: any
  timeSlotLabel: string
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
