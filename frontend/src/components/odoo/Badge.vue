<script setup lang="ts">
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'

interface Props {
  variant?: BadgeVariant | string
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<template>
  <span class="o-badge" :class="`o-badge--${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.o-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 10rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  line-height: 1.5;
}
.o-badge--default { background: var(--o-gray-200); color: var(--o-gray-700); }
.o-badge--success { background: var(--o-success-bg); color: var(--o-success-text); }
.o-badge--warning { background: var(--o-warning-bg); color: var(--o-warning-text); }
.o-badge--danger { background: var(--o-danger-bg); color: var(--o-danger-text); }
.o-badge--info { background: var(--o-info-bg); color: var(--o-info-text); }
.o-badge--purple { background: var(--o-brand-lightest); color: var(--o-brand-primary); }
</style>
