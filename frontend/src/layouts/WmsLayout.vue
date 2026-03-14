<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import ToastContainer from '../components/odoo/ToastContainer.vue'
import OToastManager from '../components/odoo/OToastManager.vue'
import WmsNavbar from '../components/layout/WmsNavbar.vue'
import WmsSubNav from '../components/layout/WmsSubNav.vue'
import WmsSettingsSidebar from '../components/layout/WmsSettingsSidebar.vue'
import { wmsMenuItems, settingsGroups, subMenuMap } from '../components/layout/menuData'
import type { SubMenuItem } from '../components/layout/menuData'

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
  <div class="o-web-client" :class="{ 'has-settings-sidebar': isSettingsSection }">
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

    <!-- Mobile sidebar backdrop -->
    <Transition name="o-backdrop">
      <div
        v-if="mobileSidebarOpen"
        class="o-mobile-backdrop"
        @click="mobileSidebarOpen = false"
      />
    </Transition>

    <!-- Main content area -->
    <main
      class="o-action-manager"
      :style="hasTopSubNav ? { marginTop: `calc(var(--o-navbar-height) + ${subNavHeight}px)` } : undefined"
    >
      <RouterView v-slot="{ Component }">
        <Transition name="o-page" mode="out-in">
          <component :is="Component" :key="$route.path" />
        </Transition>
      </RouterView>
    </main>

    <ToastContainer />
    <OToastManager />
  </div>
</template>

<style scoped>
:root {
  --o-settings-sidebar-width: 200px;
}

.o-web-client {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.has-settings-sidebar > .o-action-manager {
  margin-left: var(--o-settings-sidebar-width, 200px);
}

.o-action-manager {
  flex: 1;
  margin-top: var(--o-navbar-height);
  overflow-y: auto;
  background: var(--o-webclient-background);
}

.o-mobile-backdrop { display: none; }

@media (max-width: 768px) {
  .o-mobile-backdrop {
    display: block; position: fixed;
    top: var(--o-navbar-height); left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.4); z-index: 999;
  }

  .has-settings-sidebar > .o-action-manager {
    margin-left: 220px;
  }
}

@media (max-width: 480px) {
  .has-settings-sidebar > .o-action-manager {
    margin-left: 0;
  }
}
</style>

<style>
.o-page-enter-active,
.o-page-leave-active { transition: all 0.25s ease-out; }
.o-page-enter-from { opacity: 0; transform: translateX(20px); }
.o-page-leave-to { opacity: 0; transform: translateX(-20px); }
.o-backdrop-enter-active { transition: opacity 0.2s ease; }
.o-backdrop-leave-active { transition: opacity 0.15s ease; }
.o-backdrop-enter-from,
.o-backdrop-leave-to { opacity: 0; }
</style>
