<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter, RouterView } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import ToastContainer from '../components/odoo/ToastContainer.vue'
import OToastManager from '../components/odoo/OToastManager.vue'

const route = useRoute()
const router = useRouter()
const { locale, setLocale, availableLocales } = useI18n()

// ---------------------------------------------------------------------------
// Menu state
// ---------------------------------------------------------------------------
const showUserMenu = ref(false)
const showLangMenu = ref(false)
const mobileSidebarOpen = ref(false)

// ZELIXWMS main navigation
const wmsMenuItems = computed(() => [
  { label: '入庫管理', to: '/inbound' },
  { label: '在庫管理', to: '/inventory' },
  { label: '商品管理', to: '/products' },
  { label: 'セット組管理', to: '/set-products' },
  { label: '出荷指示', to: '/shipment-orders' },
  { label: '出荷作業', to: '/shipment-operations' },
  { label: '出荷実績', to: '/shipment-results' },
  { label: '棚卸管理', to: '/stocktaking' },
  { label: '返品管理', to: '/returns' },
  { label: '倉庫オペレーション', to: '/warehouse-ops' },
  { label: '日次管理', to: '/daily' },
  { label: '設定管理', to: '/settings' },
])

// ---------------------------------------------------------------------------
// Sub-menu items per section
// ---------------------------------------------------------------------------
interface SubMenuItem {
  readonly label: string
  readonly to: string
}

const subMenuMap: Record<string, SubMenuItem[]> = {
  '/products': [
    { label: '商品設定', to: '/products/list' },
    { label: 'バーコード管理', to: '/products/barcodes' },
  ],
  '/set-products': [
    { label: 'セット組一覧', to: '/set-products/list' },
    { label: 'セット組制作指示', to: '/set-products/assembly' },
    { label: '指示履歴', to: '/set-products/history' },
  ],
  '/shipment-orders': [
    { label: '出荷指示作成', to: '/shipment-orders/create' },
  ],
  '/shipment-operations': [
    { label: '出荷作業一覧', to: '/shipment-operations/tasks' },
    { label: '出荷一覧', to: '/shipment-operations/list' },
    { label: '1-1検品', to: '/shipment-operations/one-by-one/inspection' },
    { label: 'N-1検品', to: '/shipment-operations/n-by-one/inspection' },
  ],
  '/shipment-results': [],
  '/inbound': [
    { label: '入庫ダッシュボード', to: '/inbound/dashboard' },
    { label: '入庫指示一覧', to: '/inbound/orders' },
    { label: '入庫指示作成', to: '/inbound/create' },
    { label: 'CSV取込', to: '/inbound/import' },
    { label: '入庫実績', to: '/inbound/history' },
  ],
  '/inventory': [
    { label: '在庫一覧', to: '/inventory/stock' },
    { label: '入出庫履歴', to: '/inventory/movements' },
    { label: '在庫調整', to: '/inventory/adjustments' },
    { label: 'ロット管理', to: '/inventory/lots' },
    { label: '賞味期限アラート', to: '/inventory/expiry-alerts' },
    { label: 'ロケーション', to: '/inventory/locations' },
    { label: '在庫台帳', to: '/inventory/ledger' },
  ],
  '/stocktaking': [
    { label: '棚卸一覧', to: '/stocktaking/list' },
    { label: '棚卸作成', to: '/stocktaking/create' },
  ],
  '/returns': [
    { label: '返品一覧', to: '/returns/list' },
    { label: '返品作成', to: '/returns/create' },
  ],
  '/warehouse-ops': [
    { label: 'タスクダッシュボード', to: '/warehouse-ops/tasks' },
    { label: 'ウェーブ管理', to: '/warehouse-ops/waves' },
    { label: 'シリアル番号', to: '/warehouse-ops/serial-numbers' },
  ],
  '/daily': [
    { label: '日次レポート', to: '/daily/list' },
  ],
  '/settings': [
    { label: '基本設定', to: '/settings/basic' },
    { label: 'ご依頼主設定', to: '/settings/orderSourceCompany' },
    { label: '配送業者設定', to: '/settings/carrier' },
    { label: 'ファイルレイアウト', to: '/settings/mapping-patterns' },
    { label: '印刷テンプレート', to: '/settings/print-templates' },
    { label: 'プリンター設定', to: '/settings/printer' },
    { label: '帳票テンプレート', to: '/settings/form-templates' },
    { label: '配送業者自動化', to: '/settings/carrier-automation' },
    { label: '検品グループ', to: '/settings/order-groups' },
    { label: '自動処理', to: '/settings/auto-processing' },
    { label: '出荷メール設定', to: '/settings/email-templates' },
    { label: '得意先一覧', to: '/settings/customers' },
    { label: '顧客（3PL荷主）', to: '/settings/clients' },
    { label: '倉庫管理', to: '/settings/warehouses' },
    { label: '仕入先一覧', to: '/settings/suppliers' },
    { label: '在庫区分', to: '/settings/inventory-categories' },
    { label: '操作ログ', to: '/settings/operation-logs' },
    { label: 'API連携ログ', to: '/settings/api-logs' },
    { label: 'WMSスケジュール', to: '/settings/wms-schedules' },
    { label: 'ルール設定', to: '/settings/rules' },
    { label: 'テナント管理', to: '/settings/tenants' },
    { label: '応用設定', to: '/settings/system' },
  ],
}

const activeSection = computed(() => {
  for (const prefix of Object.keys(subMenuMap)) {
    if (route.path.startsWith(prefix)) return prefix
  }
  return ''
})

const subMenuItems = computed<SubMenuItem[]>(() => {
  return subMenuMap[activeSection.value] ?? []
})

const subNavRef = ref<HTMLElement | null>(null)
const subNavHeight = ref(36)

const updateSubNavHeight = () => {
  if (subNavRef.value) {
    subNavHeight.value = subNavRef.value.offsetHeight
  }
}

watch(subMenuItems, () => {
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

function isSubActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/')
}

function isActive(to: string) {
  if (to === '/home') return route.path === '/home' || route.path === '/'
  return route.path.startsWith(to)
}

function navigateTo(to: string) {
  router.push(to)
  mobileSidebarOpen.value = false
}

// ---------------------------------------------------------------------------
// Close menus on outside click
// ---------------------------------------------------------------------------
function closeMenus(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.o-user-menu')) showUserMenu.value = false
  if (!target.closest('.o-lang-switcher')) showLangMenu.value = false
}

watch(() => route.path, () => {
  mobileSidebarOpen.value = false
})
</script>

<template>
  <div class="o-web-client">
    <!-- ===== NavBar ===== -->
    <nav class="o-navbar" @click="closeMenus">
      <!-- Mobile hamburger -->
      <button
        class="o-mobile-hamburger"
        :class="{ active: mobileSidebarOpen }"
        title="Menu"
        @click.stop="mobileSidebarOpen = !mobileSidebarOpen"
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
          v-for="item in wmsMenuItems"
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

        <!-- User menu -->
        <div class="o-user-menu" @click.stop>
          <button class="o-navbar-entry o-user-btn" @click="showUserMenu = !showUserMenu">
            <span class="o-user-avatar">N</span>
            <span class="o-user-name">Nexand</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style="opacity:0.7">
              <path d="M2 3.5L5 7l3-3.5H2z"/>
            </svg>
          </button>
          <div v-if="showUserMenu" class="o-user-dropdown">
            <div class="o-user-dropdown-header">
              <strong>Nexand Admin</strong>
              <span class="o-user-dropdown-role">admin</span>
            </div>
            <div class="o-dropdown-divider" />
            <button class="o-dropdown-item" @click="router.push('/settings/basic'); showUserMenu = false">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/><path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/></svg>
              設定
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- ===== Sub-header ===== -->
    <nav v-if="activeSection !== ''" ref="subNavRef" class="o-sub-navbar">
      <div class="o-sub-navbar-inner">
        <button
          v-for="item in subMenuItems"
          :key="item.to"
          class="o-sub-navbar-entry"
          :class="{ active: isSubActive(item.to) }"
          @click="navigateTo(item.to)"
        >
          {{ item.label }}
        </button>
      </div>
    </nav>

    <!-- Mobile sidebar backdrop -->
    <Transition name="o-backdrop">
      <div
        v-if="mobileSidebarOpen"
        class="o-mobile-backdrop"
        @click="mobileSidebarOpen = false"
      />
    </Transition>

    <!-- Main content area -->
    <main class="o-action-manager" :style="activeSection ? { marginTop: `calc(var(--o-navbar-height) + ${subNavHeight}px)` } : undefined">
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
.o-web-client {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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

/* Sub-navbar */
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

.o-action-manager {
  flex: 1;
  margin-top: var(--o-navbar-height);
  overflow-y: auto;
  background: var(--o-webclient-background);
}

.o-mobile-backdrop { display: none; }
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
  .o-sub-navbar {
    overflow-x: auto;
  }
  .o-sub-navbar-entry {
    padding: 0 0.625rem;
    font-size: var(--o-font-size-smaller);
  }
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
  .o-mobile-backdrop {
    display: block; position: fixed;
    top: var(--o-navbar-height); left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.4); z-index: 999;
  }
  .o-user-name { display: none; }
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
