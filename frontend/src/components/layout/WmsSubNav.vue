<script setup lang="ts">
/**
 * サブナビゲーション / 子导航
 *
 * ナビバー下部の水平サブナビタブ。Tailwind CSS でリビルド。
 * 导航栏下方的水平子导航标签。用 Tailwind CSS 重建。
 */
import { ref, watch, onMounted, nextTick } from 'vue'
import { cn } from '@/lib/utils'
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
  <nav
    ref="subNavRef"
    class="fixed top-[var(--topbar-height)] left-0 right-0 h-auto bg-background border-b border-border z-[999] flex items-start dark:bg-background max-md:overflow-x-auto"
  >
    <div class="flex items-center flex-wrap overflow-x-hidden px-2 gap-0">
      <button
        v-for="item in items"
        :key="item.to"
        :class="cn(
          'h-9 flex items-center px-3 text-[13px] text-muted-foreground whitespace-nowrap border-0 bg-transparent cursor-pointer transition-colors relative',
          'hover:text-foreground',
          'max-md:px-2.5 max-md:text-xs',
          isSubActive(item.to) && 'text-primary font-semibold border-b-2 border-primary',
        )"
        @click="emit('navigate', item.to)"
      >
        {{ item.label }}
      </button>
    </div>
  </nav>
</template>
