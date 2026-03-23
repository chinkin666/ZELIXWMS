<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ref, onMounted } from 'vue'

interface Props {
  message: string
  type?: 'success' | 'danger' | 'warning' | 'info'
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 3000,
})

const emit = defineEmits<{ close: [] }>()

const visible = ref(false)

onMounted(() => {
  requestAnimationFrame(() => { visible.value = true })
  if (props.duration > 0) {
    setTimeout(() => { visible.value = false; setTimeout(() => emit('close'), 200) }, props.duration)
  }
})

const icons: Record<string, string> = {
  success: '✓',
  danger: '✕',
  warning: '⚠',
  info: 'ℹ',
}
</script>

<template>
  <div class="o-toast" :class="[`o-toast--${type}`, { 'o-toast--visible': visible }]">
    <span class="o-toast-icon">{{ icons[type] }}</span>
    <span class="o-toast-msg">{{ message }}</span>
    <Button class="o-toast-close" @click="visible = false; $emit('close')">&times;</Button>
  </div>
</template>

<style scoped>
.o-toast {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1rem;
  border-radius: var(--o-border-radius, 4px);
  box-shadow: var(--o-shadow-lg);
  font-size: 0.875rem;
  min-width: 280px;
  max-width: 420px;
  transform: translateX(100%);
  opacity: 0;
  transition: transform 0.2s ease, opacity 0.2s ease;
  pointer-events: auto;
}
.o-toast--visible {
  transform: translateX(0);
  opacity: 1;
}

.o-toast--success { background: var(--o-success-bg); color: var(--o-success-text); border-left: 4px solid var(--o-success); }
.o-toast--danger  { background: var(--o-danger-bg); color: var(--o-danger-text); border-left: 4px solid var(--o-danger); }
.o-toast--warning { background: var(--o-warning-bg); color: var(--o-warning-text); border-left: 4px solid var(--o-warning); }
.o-toast--info    { background: var(--o-info-bg); color: var(--o-info-text); border-left: 4px solid var(--o-info); }

.o-toast-icon { font-size: 1rem; font-weight: 700; flex-shrink: 0; }
.o-toast-msg { flex: 1; }
.o-toast-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  line-height: 1;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  padding: 0;
}
.o-toast-close:hover { opacity: 1; }
</style>
