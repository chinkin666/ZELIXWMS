<template>
  <div v-if="row.sender" class="addr-cell">
    <div>{{ row.sender.name }}</div>
    <div class="addr-cell__sub">{{ row.sender.prefecture }}{{ row.sender.city }}</div>
  </div>
  <span v-else>-</span>
</template>

<script setup lang="ts">
defineProps<{ row: any }>()
</script>

<style scoped>
.addr-cell {
  font-size: 12px;
  line-height: 1.5;
}
.addr-cell__sub {
  color: #909399;
  font-size: 11px;
}
</style>
