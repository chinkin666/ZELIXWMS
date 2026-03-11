<script setup lang="ts">
interface Props {
  title: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon?: string
  color?: string
}

withDefaults(defineProps<Props>(), {
  changeType: 'neutral',
  icon: '📈',
  color: 'var(--o-brand-primary)',
})
</script>

<template>
  <div class="o-stat-card">
    <div class="o-stat-header">
      <span class="o-stat-title">{{ title }}</span>
      <span class="o-stat-icon" :style="{ background: color + '18', color }">{{ icon }}</span>
    </div>
    <div class="o-stat-value">{{ value }}</div>
    <div v-if="change" class="o-stat-change" :class="`o-change--${changeType}`">
      <span v-if="changeType === 'up'">↑</span>
      <span v-else-if="changeType === 'down'">↓</span>
      {{ change }}
    </div>
  </div>
</template>

<style scoped>
.o-stat-card {
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: var(--o-border-radius);
  padding: 1.25rem;
  transition: box-shadow 0.15s;
}
.o-stat-card:hover {
  box-shadow: var(--o-shadow-md);
}
.o-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}
.o-stat-title {
  font-size: var(--o-font-size-small);
  color: var(--o-gray-600);
  font-weight: 500;
}
.o-stat-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
}
.o-stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--o-gray-900);
  line-height: 1;
  margin-bottom: 0.5rem;
}
.o-stat-change {
  font-size: var(--o-font-size-small);
  font-weight: 500;
}
.o-change--up { color: var(--o-success); }
.o-change--down { color: var(--o-danger); }
.o-change--neutral { color: var(--o-gray-600); }
</style>
