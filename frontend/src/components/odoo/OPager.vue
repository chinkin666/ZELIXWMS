<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { computed } from 'vue'

interface Props {
  total: number
  offset: number
  limit: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:offset': [value: number]
}>()

const from = computed(() => Math.min(props.offset + 1, props.total))
const to = computed(() => Math.min(props.offset + props.limit, props.total))

const hasPrev = computed(() => props.offset > 0)
const hasNext = computed(() => props.offset + props.limit < props.total)

function prev() {
  if (hasPrev.value) {
    emit('update:offset', Math.max(0, props.offset - props.limit))
  }
}

function next() {
  if (hasNext.value) {
    emit('update:offset', props.offset + props.limit)
  }
}
</script>

<template>
  <div class="o-pager">
    <span class="o-pager-value">{{ from }}-{{ to }} / {{ total }}</span>
    <div class="o-pager-nav">
      <Button class="o-pager-btn" :disabled="!hasPrev" @click="prev">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
        </svg>
      </button>
      <Button class="o-pager-btn" :disabled="!hasNext" @click="next">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.o-pager {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--o-font-size-small, 0.8125rem);
}
.o-pager-value {
  color: var(--o-gray-600, #6c757d);
  white-space: nowrap;
}
.o-pager-nav {
  display: flex;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  overflow: hidden;
}
.o-pager-btn {
  background: var(--o-view-background, #fff);
  border: none;
  border-right: 1px solid var(--o-border-color, #dee2e6);
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--o-gray-600, #6c757d);
  cursor: pointer;
}
.o-pager-btn:last-child { border-right: none; }
.o-pager-btn:hover:not(:disabled) { background: var(--o-gray-100, #f8f9fa); color: var(--o-gray-900, #212529); }
.o-pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
