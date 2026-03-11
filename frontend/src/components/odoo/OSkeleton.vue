<script setup lang="ts">
interface Props {
  /** 'text' | 'circle' | 'rect' | 'table' */
  type?: 'text' | 'circle' | 'rect' | 'table'
  lines?: number
  width?: string
  height?: string
  rows?: number
  cols?: number
}

withDefaults(defineProps<Props>(), {
  type: 'text',
  lines: 3,
  width: '100%',
  height: '1rem',
  rows: 5,
  cols: 4,
})
</script>

<template>
  <!-- Text skeleton: multiple lines -->
  <div v-if="type === 'text'" class="o-skeleton-text">
    <div
      v-for="n in lines"
      :key="n"
      class="o-skeleton-line"
      :style="{ width: n === lines ? '60%' : width, height }"
    />
  </div>

  <!-- Circle avatar skeleton -->
  <div
    v-else-if="type === 'circle'"
    class="o-skeleton-circle"
    :style="{ width, height: width }"
  />

  <!-- Rectangle block skeleton -->
  <div
    v-else-if="type === 'rect'"
    class="o-skeleton-rect"
    :style="{ width, height }"
  />

  <!-- Table skeleton -->
  <div v-else-if="type === 'table'" class="o-skeleton-table">
    <div class="o-skeleton-table-header">
      <div v-for="c in cols" :key="c" class="o-skeleton-rect" style="height: 0.75rem; flex: 1" />
    </div>
    <div v-for="r in rows" :key="r" class="o-skeleton-table-row">
      <div v-for="c in cols" :key="c" class="o-skeleton-rect" style="height: 0.75rem; flex: 1" />
    </div>
  </div>
</template>

<style scoped>
@keyframes o-skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.o-skeleton-line,
.o-skeleton-circle,
.o-skeleton-rect {
  background: var(--o-gray-200, #e9ecef);
  border-radius: var(--o-border-radius-sm, 2px);
  animation: o-skeleton-pulse 1.5s ease-in-out infinite;
}

.o-skeleton-text {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.o-skeleton-circle {
  border-radius: 50%;
}

.o-skeleton-table {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--o-gray-200, #e9ecef);
  border-radius: var(--o-border-radius, 4px);
  overflow: hidden;
}
.o-skeleton-table-header {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--o-gray-100, #f8f9fa);
  border-bottom: 2px solid var(--o-gray-200, #e9ecef);
}
.o-skeleton-table-row {
  display: flex;
  gap: 1rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--o-gray-200, #e9ecef);
}
.o-skeleton-table-row:last-child {
  border-bottom: none;
}
</style>
