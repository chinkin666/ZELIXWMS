<script setup lang="ts">
/**
 * WMS レイアウト / WMS 布局
 *
 * メインレイアウト: ナビバー + サブナビ + サイドバー + コンテンツエリア。
 * 主布局: 导航栏 + 子导航 + 侧边栏 + 内容区域。
 * Tailwind CSS でリビルド。構造は維持。
 * 用 Tailwind CSS 重建。结构不变。
 */
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import WmsNavbar from '../components/layout/WmsNavbar.vue'
import WmsSubNav from '../components/layout/WmsSubNav.vue'
import WmsSettingsSidebar from '../components/layout/WmsSettingsSidebar.vue'
import CommandPalette from '../components/layout/CommandPalette.vue'
import { wmsMenuItems, settingsGroups, subMenuMap } from '../components/layout/menuData'
import type { SubMenuItem } from '../components/layout/menuData'
import { cn } from '@/lib/utils'

const route = useRoute()
const router = useRouter()

const mobileSidebarOpen = ref(false)
const subNavRef = ref<InstanceType<typeof WmsSubNav> | null>(null)

const activeSection = computed(() => {
  for (const prefix of Object.keys(subMenuMap)) {
    if (route.path.startsWith(prefix)) return prefix
  }
  return ''
})

const subMenuItems = computed<SubMenuItem[]>(() => {
  return subMenuMap[activeSection.value] ?? []
})

const isSettingsSection = computed(() => activeSection.value === '/settings')
const hasTopSubNav = computed(() => activeSection.value !== '' && !isSettingsSection.value && subMenuItems.value.length > 0)

const subNavHeight = computed(() => subNavRef.value?.subNavHeight ?? 36)

function navigateTo(to: string) {
  router.push(to)
  mobileSidebarOpen.value = false
}

watch(() => route.path, () => {
  mobileSidebarOpen.value = false
})
</script>

<template>
  <div :class="cn('flex flex-col h-screen overflow-hidden', isSettingsSection && 'has-settings-sidebar')">
    <WmsNavbar
      v-model:mobile-sidebar-open="mobileSidebarOpen"
      :menu-items="wmsMenuItems"
      @navigate="navigateTo"
    />

    <WmsSubNav
      v-if="hasTopSubNav"
      ref="subNavRef"
      :items="subMenuItems"
      :current-path="route.path"
      @navigate="navigateTo"
    />

    <WmsSettingsSidebar
      v-if="isSettingsSection"
      :groups="settingsGroups"
      :current-path="route.path"
      @navigate="navigateTo"
    />

    <!-- モバイルサイドバー背景 / 移动端侧边栏背景 -->
    <Transition name="wms-backdrop">
      <div
        v-if="mobileSidebarOpen"
        class="hidden max-md:block fixed top-[56px] left-0 right-0 bottom-0 bg-black/40 z-[999]"
        @click="mobileSidebarOpen = false"
      />
    </Transition>

    <!-- メインコンテンツエリア / 主内容区域 -->
    <main
      :class="cn(
        'flex-1 mt-[56px] overflow-y-auto bg-muted/30 dark:bg-background',
        isSettingsSection && 'ml-[200px] max-md:ml-[220px] max-[480px]:ml-0',
      )"
      :style="hasTopSubNav ? { marginTop: `calc(56px + ${subNavHeight}px)` } : undefined"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="wms-page" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </Transition>
      </RouterView>
    </main>

    <CommandPalette />
  </div>
</template>

<style>
/* ページ遷移アニメーション / 页面过渡动画 */
.wms-page-enter-active,
.wms-page-leave-active { transition: all 0.25s ease-out; }
.wms-page-enter-from { opacity: 0; transform: translateX(20px); }
.wms-page-leave-to { opacity: 0; transform: translateX(-20px); }
.wms-backdrop-enter-active { transition: opacity 0.2s ease; }
.wms-backdrop-leave-active { transition: opacity 0.15s ease; }
.wms-backdrop-enter-from,
.wms-backdrop-leave-to { opacity: 0; }
</style>
