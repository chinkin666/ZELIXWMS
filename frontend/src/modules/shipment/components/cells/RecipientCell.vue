<template>
  <div v-if="row.recipient" class="addr-cell">
    <div>〒{{ row.recipient.postalCode }}</div>
    <div>{{ row.recipient.prefecture }}{{ row.recipient.city }}{{ row.recipient.street }}</div>
    <div class="addr-cell__name">{{ row.recipient.name }}</div>
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
.addr-cell__name {
  font-weight: 500;
}
</style>
