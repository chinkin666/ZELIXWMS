<script setup lang="ts">
import { Button } from '@/components/ui/button'
/**
 * 設定サイドバー / 设置侧边栏
 *
 * 設定ページ用の左サイドバー。shadcn ScrollArea + Tailwind CSS でリビルド。
 * 设置页面的左侧边栏。用 shadcn ScrollArea + Tailwind CSS 重建。
 */
import { computed } from 'vue'
import { cn } from '@/lib/utils'
import type { SubMenuGroup } from './menuData'
import { useAuth } from '@/stores/auth'
import { ScrollArea } from '@/components/ui/scroll-area'

const props = defineProps<{
  groups: SubMenuGroup[]
  currentPath: string
}>()

const emit = defineEmits<{
  navigate: [to: string]
}>()

const { user } = useAuth()

// ロールベースの設定メニュー表示制御 / 基于角色的设置菜单显示控制
const MANAGER_GROUPS = new Set(['出荷設定', 'テンプレート・印刷'])

const visibleGroups = computed<SubMenuGroup[]>(() => {
  const role = user.value?.role
  if (!role || role === 'admin' || role === 'super_admin') return props.groups
  if ((role as string) === 'manager') return props.groups.filter(g => MANAGER_GROUPS.has(g.groupLabel))
  return []
})

function isSubActive(to: string) {
  return props.currentPath === to || props.currentPath.startsWith(to + '/')
}
</script>

<template>
  <aside
    class="fixed top-[var(--topbar-height)] left-0 bottom-0 w-[200px] bg-background border-r border-border z-[998] max-md:w-[220px] max-[480px]:w-full max-[480px]:h-auto max-[480px]:max-h-[50vh] max-[480px]:bottom-auto max-[480px]:border-r-0 max-[480px]:border-b max-[480px]:border-border dark:bg-background"
  >
    <ScrollArea class="h-full">
      <div class="py-2">
        <template v-for="group in visibleGroups" :key="group.groupLabel">
          <!-- グループラベル / 分组标签 -->
          <div
            class="px-4 pt-3 pb-1 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-wider select-none first:pt-1.5"
          >
            {{ group.groupLabel }}
          </div>

          <!-- メニュー項目 / 菜单项 -->
          <Button
            v-for="item in group.items"
            :key="item.to"
            :class="cn(
              'block w-full py-[7px] px-5 text-[13px] text-muted-foreground text-left whitespace-nowrap overflow-hidden text-ellipsis border-0 bg-transparent cursor-pointer transition-colors',
              'hover:bg-muted hover:text-foreground',
              isSubActive(item.to) && 'bg-primary/5 text-primary font-semibold border-l-[3px] border-primary pl-[17px]',
            )"
            @click="emit('navigate', item.to)"
          >
            {{ item.label }}
          </button>
        </template>
      </div>
    </ScrollArea>
  </aside>
</template>
