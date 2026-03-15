<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../../composables/useI18n'
import { useAuth } from '@/stores/auth'

const props = defineProps<{
  menuItems: Array<{ label: string; to: string }>
  mobileSidebarOpen: boolean
}>()

const emit = defineEmits<{
  navigate: [to: string]
  'update:mobileSidebarOpen': [val: boolean]
}>()

const route = useRoute()
const router = useRouter()
const { locale, setLocale, availableLocales } = useI18n()

const { user, isAuthenticated, clearAuth } = useAuth()

const showUserMenu = ref(false)
const showLangMenu = ref(false)
const isDark = ref(document.documentElement.getAttribute('data-theme') === 'dark')

// ユーザー表示情報 / 用户显示信息
const userDisplayName = computed(() => user.value?.displayName ?? 'User')
const userInitial = computed(() => userDisplayName.value.charAt(0).toUpperCase())
const userRole = computed(() => user.value?.role ?? '')

function handleLogout() {
  showUserMenu.value = false
  clearAuth()
  router.push('/login')
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// 启动时恢复主题 / 起動時にテーマを復元
;(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') {
    isDark.value = true
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})()

// ロールベースのメニュー表示制御 / 基于角色的菜单显示控制
const visibleMenuItems = computed(() => {
  const role = user.value?.role
  if (!role || role === 'admin' || role === 'super_admin') return props.menuItems

  const roleMenus: Record<string, string[]> = {
    manager: ['/products', '/materials', '/inbound', '/inventory', '/shipment', '/fba', '/returns', '/stocktaking', '/set-products', '/warehouse-ops', '/daily', '/billing', '/settings'],
    operator: ['/inbound', '/inventory', '/shipment', '/returns', '/stocktaking', '/warehouse-ops'],
    viewer: ['/products', '/inventory', '/shipment', '/returns', '/daily', '/billing'],
    client: ['/shipment', '/inventory', '/billing', '/daily'],
  }

  const allowed = roleMenus[role] || []
  return props.menuItems.filter(item => allowed.some(path => item.to.startsWith(path)))
})

function isActive(to: string) {
  if (to === '/home') return route.path === '/home' || route.path === '/'
  return route.path.startsWith(to)
}

function navigateTo(to: string) {
  emit('navigate', to)
}

function closeMenus(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.o-user-menu')) showUserMenu.value = false
  if (!target.closest('.o-lang-switcher')) showLangMenu.value = false
}
</script>

<template>
  <nav class="o-navbar" @click="closeMenus">
    <!-- Mobile hamburger -->
    <button
      class="o-mobile-hamburger"
      :class="{ active: mobileSidebarOpen }"
      title="Menu"
      @click.stop="emit('update:mobileSidebarOpen', !mobileSidebarOpen)"
    >
      <svg v-if="!mobileSidebarOpen" width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
      </svg>
    </button>

    <!-- Home button -->
    <button
      class="o-navbar-entry o-home-btn"
      :class="{ active: isActive('/home') }"
      title="ホーム"
      @click="navigateTo('/home')"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <rect x="1" y="1" width="4" height="4" rx="1"/>
        <rect x="7" y="1" width="4" height="4" rx="1"/>
        <rect x="13" y="1" width="4" height="4" rx="1"/>
        <rect x="1" y="7" width="4" height="4" rx="1"/>
        <rect x="7" y="7" width="4" height="4" rx="1"/>
        <rect x="13" y="7" width="4" height="4" rx="1"/>
        <rect x="1" y="13" width="4" height="4" rx="1"/>
        <rect x="7" y="13" width="4" height="4" rx="1"/>
        <rect x="13" y="13" width="4" height="4" rx="1"/>
      </svg>
    </button>

    <!-- Menu entries -->
    <div class="o-navbar-menu" :class="{ 'o-mobile-open': mobileSidebarOpen }">
      <button
        v-for="item in visibleMenuItems"
        :key="item.to"
        class="o-navbar-entry"
        :class="{ active: isActive(item.to) }"
        @click="navigateTo(item.to)"
      >
        {{ item.label }}
      </button>
    </div>

    <!-- Systray -->
    <div class="o-navbar-systray">
      <!-- Language Switcher -->
      <div class="o-lang-switcher" @click.stop>
        <button
          class="o-systray-btn"
          :class="{ active: showLangMenu }"
          @click="showLangMenu = !showLangMenu"
        >
          <span style="font-size: 0.8rem; font-weight: 600;">{{ locale === 'en' ? 'EN' : locale === 'ja' ? 'JA' : '中' }}</span>
        </button>
        <div v-if="showLangMenu" class="o-lang-dropdown">
          <button
            v-for="loc in availableLocales"
            :key="loc.code"
            class="o-lang-option"
            :class="{ active: locale === loc.code }"
            @click="setLocale(loc.code); showLangMenu = false"
          >
            <span class="o-lang-flag">{{ loc.flag }}</span>
            <span class="o-lang-label">{{ loc.label }}</span>
            <svg v-if="locale === loc.code" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Quick search hint / クイック検索ヒント -->
      <button class="o-systray-btn o-search-hint" title="Ctrl+K" @click="document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
        </svg>
        <kbd class="o-nav-kbd">Ctrl K</kbd>
      </button>

      <!-- Theme toggle / テーマ切替 -->
      <button class="o-systray-btn" :title="isDark ? 'ライトモード' : 'ダークモード'" @click="toggleTheme">
        <svg v-if="isDark" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
        </svg>
      </button>

      <!-- ユーザーメニュー / 用户菜单 -->
      <div class="o-user-menu" @click.stop>
        <button class="o-navbar-entry o-user-btn" @click="showUserMenu = !showUserMenu">
          <span class="o-user-avatar">{{ userInitial }}</span>
          <span class="o-user-name">{{ userDisplayName }}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style="opacity:0.7">
            <path d="M2 3.5L5 7l3-3.5H2z"/>
          </svg>
        </button>
        <div v-if="showUserMenu" class="o-user-dropdown">
          <div class="o-user-dropdown-header">
            <strong>{{ userDisplayName }}</strong>
            <span class="o-user-dropdown-role">{{ userRole }}</span>
          </div>
          <div class="o-dropdown-divider" />
          <button class="o-dropdown-item" @click="router.push('/settings/basic'); showUserMenu = false">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/></svg>
            設定
          </button>
          <button class="o-dropdown-item o-logout-item" @click="handleLogout">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/></svg>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.o-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--o-navbar-height);
  background: var(--o-brand-primary);
  display: flex;
  align-items: center;
  z-index: 1000;
  padding: 0;
  font-size: var(--o-font-size-base);
}

.o-home-btn {
  padding: 0 14px;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
}

.o-navbar-menu {
  display: flex;
  align-items: center;
  height: 100%;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
}
.o-navbar-menu::-webkit-scrollbar { display: none; }

.o-navbar-entry {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: var(--NavBar-entry-color);
  font-size: var(--o-font-size-small);
  font-weight: 400;
  white-space: nowrap;
  text-decoration: none;
  transition: background 0.1s;
  border: none;
  background: none;
  cursor: pointer;
}
.o-navbar-entry:hover {
  background: var(--NavBar-entry-bg-hover);
  color: #fff;
}
.o-navbar-entry.active {
  background: rgba(0, 0, 0, 0.15);
  color: #fff;
  font-weight: 500;
  box-shadow: inset 0 -2px 0 rgba(255, 255, 255, 0.8);
}

.o-navbar-systray {
  display: flex;
  align-items: center;
  height: 100%;
  margin-left: auto;
  gap: 0;
}
.o-systray-btn {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 10px;
  color: var(--NavBar-entry-color);
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.1s;
}
.o-systray-btn:hover { background: var(--NavBar-entry-bg-hover); }

.o-search-hint {
  gap: 6px;
}
.o-nav-kbd {
  font-size: 10px;
  padding: 1px 5px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--o-font-family-mono);
}

@media (max-width: 768px) {
  .o-nav-kbd { display: none; }
}

/* Language Switcher */
.o-lang-switcher { position: relative; height: 100%; display: flex; align-items: center; }
.o-lang-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 160px;
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: var(--o-border-radius);
  box-shadow: var(--o-shadow-lg);
  z-index: 1050;
  padding: 0.25rem 0;
}
.o-lang-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: var(--o-font-size-base);
  color: var(--o-gray-800);
  transition: background 0.1s;
}
.o-lang-option:hover { background: var(--o-gray-100); }
.o-lang-option.active { font-weight: 600; color: var(--o-brand-primary); }
.o-lang-flag { font-size: 0.875rem; font-weight: 600; width: 1.5rem; text-align: center; }
.o-lang-label { flex: 1; text-align: left; }

/* User menu */
.o-user-menu { position: relative; height: 100%; }
.o-user-btn { gap: 0.375rem; padding: 0 14px !important; }
.o-user-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.25); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6875rem; font-weight: 600;
}
.o-user-name { font-size: var(--o-font-size-small); }
.o-user-dropdown {
  position: absolute;
  top: 100%; right: 0; min-width: 220px;
  background: var(--o-view-background);
  border: 1px solid var(--o-border-color);
  border-radius: var(--o-border-radius);
  box-shadow: var(--o-shadow-lg);
  z-index: 1050;
  padding: 0.25rem 0;
}
.o-user-dropdown-header {
  display: flex; flex-direction: column; gap: 2px;
  padding: 0.75rem 1rem;
  font-size: var(--o-font-size-base); color: var(--o-gray-800);
}
.o-user-dropdown-role {
  font-size: 0.6875rem; color: var(--o-gray-500); text-transform: capitalize;
}
.o-dropdown-divider { height: 1px; margin: 0.25rem 0; background: var(--o-border-color); }
.o-dropdown-item {
  display: flex; align-items: center; gap: 0.5rem;
  width: 100%; padding: 0.5rem 1rem;
  border: none; background: none; cursor: pointer;
  font-size: var(--o-font-size-base); color: var(--o-gray-800);
  transition: background 0.1s; text-align: left;
}
.o-dropdown-item:hover { background: var(--o-gray-100); }
.o-logout-item { color: #c62828; }
.o-logout-item:hover { background: #fef2f2; }

.o-mobile-hamburger {
  display: none;
  align-items: center; justify-content: center;
  width: 46px; height: 100%;
  background: none; border: none;
  color: var(--NavBar-entry-color); cursor: pointer;
}
.o-mobile-hamburger:hover,
.o-mobile-hamburger.active { background: var(--NavBar-entry-bg-hover); }

@media (max-width: 768px) {
  .o-mobile-hamburger { display: flex; }
  .o-navbar-menu {
    position: fixed;
    top: var(--o-navbar-height); left: 0; bottom: 0;
    width: 260px; flex-direction: column; align-items: stretch;
    background: var(--o-brand-primary); z-index: 1001;
    overflow-y: auto;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }
  .o-navbar-menu.o-mobile-open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.3);
  }
  .o-navbar-menu .o-navbar-entry {
    height: auto; padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .o-user-name { display: none; }
}
</style>
