<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import type { SubMenuItem } from './menuData'

const props = defineProps<{
  items: SubMenuItem[]
  currentPath: string
}>()

const emit = defineEmits<{
  navigate: [to: string]
}>()

const subNavRef = ref<HTMLElement | null>(null)
const subNavHeight = ref(36)

function isSubActive(to: string) {
  return props.currentPath === to || props.currentPath.startsWith(to + '/')
}

const updateSubNavHeight = () => {
  if (subNavRef.value) {
    subNavHeight.value = subNavRef.value.offsetHeight
  }
}

watch(() => props.items, () => {
  nextTick(updateSubNavHeight)
})

onMounted(() => {
  nextTick(updateSubNavHeight)
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(updateSubNavHeight)
    watch(subNavRef, (el, _, onCleanup) => {
      if (el) ro.observe(el)
      onCleanup(() => ro.disconnect())
    }, { immediate: true })
  }
})

defineExpose({ subNavHeight })
</script>

<template>
  <nav ref="subNavRef" class="o-sub-navbar">
    <div class="o-sub-navbar-inner">
      <button
        v-for="item in items"
        :key="item.to"
        class="o-sub-navbar-entry"
        :class="{ active: isSubActive(item.to) }"
        @click="emit('navigate', item.to)"
      >
        {{ item.label }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.o-sub-navbar {
  position: fixed;
  top: var(--o-navbar-height);
  left: 0;
  right: 0;
  height: auto;
  background: var(--o-view-background);
  border-bottom: 1px solid var(--o-border-color);
  z-index: 999;
  display: flex;
  align-items: flex-start;
}
.o-sub-navbar-inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  overflow-x: hidden;
  padding: 0 0.5rem;
  gap: 0;
}
.o-sub-navbar-inner::-webkit-scrollbar { display: none; }
.o-sub-navbar-entry {
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 0.75rem;
  font-size: var(--o-font-size-small);
  color: var(--o-gray-600);
  white-space: nowrap;
  border: none;
  background: none;
  cursor: pointer;
  transition: color 0.15s, box-shadow 0.15s;
  position: relative;
}
.o-sub-navbar-entry:hover {
  color: var(--o-gray-900);
}
.o-sub-navbar-entry.active {
  color: var(--o-brand-primary);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 var(--o-brand-primary);
}

@media (max-width: 768px) {
  .o-sub-navbar {
    overflow-x: auto;
  }
  .o-sub-navbar-entry {
    padding: 0 0.625rem;
    font-size: var(--o-font-size-smaller);
  }
}
</style>
