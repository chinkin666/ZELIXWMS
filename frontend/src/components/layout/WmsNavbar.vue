<script setup lang="ts">
/**
 * ナビバー / 导航栏
 *
 * shadcn-vue デフォルトスタイルでリビルド。白背景 + border-b。
 * 用 shadcn-vue 默认样式重建。白色背景 + border-b。
 * 既存ロジック（認証、倉庫選択、ナビゲーション）はすべて維持。
 * 保留所有现有逻辑（认证、仓库选择、导航）。
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useAuth } from '@/stores/auth'
import { useWarehouseStore } from '@/stores/warehouse'
import { fetchWarehouses, type Warehouse } from '@/api/warehouse'
import { cn } from '@/lib/utils'
import NotificationBell from './NotificationBell.vue'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Home,
  Sun,
  Moon,
  Bell,
  Search,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Menu,
  X,
  Warehouse as WarehouseIcon,
} from 'lucide-vue-next'

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

// 倉庫選択 / 仓库选择
const { selectedWarehouseId, setWarehouse } = useWarehouseStore()
const warehouses = ref<Warehouse[]>([])
const localWarehouseId = computed(() => selectedWarehouseId.value || '__all__')

function onWarehouseChange(val: string) {
  const actual = val === '__all__' ? '' : val
  setWarehouse(actual)
}

onMounted(async () => {
  try {
    const res = await fetchWarehouses({ isActive: 'true', limit: 100 })
    warehouses.value = Array.isArray(res) ? res : res.data || []
  } catch {
    // 倉庫取得失敗は無視 / 仓库获取失败时忽略
  }
})

const isDark = ref(document.documentElement.getAttribute('data-theme') === 'dark')

// ユーザー表示情報 / 用户显示信息
const userDisplayName = computed(() => user.value?.displayName ?? 'User')
const userInitial = computed(() => userDisplayName.value.charAt(0).toUpperCase())
const userRole = computed(() => user.value?.role ?? '')

const { confirm } = useConfirmDialog()

async function handleLogout() {
  const ok = await confirm('ログアウトしますか？')
  if (!ok) return
  clearAuth()
  router.push('/login')
}

function openCommandPalette() {
  window.document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// 起動時にテーマを復元 / 启动时恢复主题
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
    manager: ['/products', '/materials', '/inbound', '/inventory', '/shipment', '/fba', '/returns', '/stocktaking', '/set-products', '/warehouse-ops', '/daily', '/reports', '/billing', '/settings'],
    operator: ['/inbound', '/inventory', '/shipment', '/returns', '/stocktaking', '/warehouse-ops'],
    viewer: ['/products', '/inventory', '/shipment', '/returns', '/daily', '/reports', '/billing'],
    client: ['/shipment', '/inventory', '/billing', '/daily', '/reports'],
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

// 言語表示 / 语言显示
const langDisplay = computed(() => {
  if (locale.value === 'en') return 'EN'
  if (locale.value === 'ja') return 'JA'
  return '中'
})
</script>

<template>
  <header class="fixed top-0 left-0 right-0 z-[1000] h-14 border-b bg-background">
    <div class="flex h-full items-center px-4 gap-2">
      <!-- モバイルメニュー / 移动端菜单 (Sheet) -->
      <Sheet :open="mobileSidebarOpen" @update:open="(v: boolean) => emit('update:mobileSidebarOpen', v)">
        <SheetTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="md:hidden shrink-0"
            @click.stop="emit('update:mobileSidebarOpen', !mobileSidebarOpen)"
          >
            <Menu class="size-5" />
            <span class="sr-only">メニュー</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" class="w-[280px] p-0">
          <SheetHeader class="border-b px-4 py-3">
            <SheetTitle class="text-lg font-bold tracking-tight">ZELIX WMS</SheetTitle>
          </SheetHeader>
          <nav class="flex flex-col py-2">
            <button
              :class="cn(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left',
                isActive('/home')
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )"
              @click="navigateTo('/home'); emit('update:mobileSidebarOpen', false)"
            >
              <Home class="size-4" />
              ホーム
            </button>
            <button
              v-for="item in visibleMenuItems"
              :key="item.to"
              :class="cn(
                'flex items-center px-4 py-2.5 text-sm transition-colors text-left',
                isActive(item.to)
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )"
              @click="navigateTo(item.to); emit('update:mobileSidebarOpen', false)"
            >
              {{ item.label }}
            </button>
          </nav>
        </SheetContent>
      </Sheet>

      <!-- ロゴ / Logo -->
      <button
        class="flex items-center gap-2 shrink-0 mr-2"
        @click="navigateTo('/home')"
      >
        <span class="text-lg font-bold tracking-tight">ZELIX WMS</span>
      </button>

      <Separator orientation="vertical" class="h-6 hidden md:block" />

      <!-- ホームボタン / 首页按钮 (desktop) -->
      <TooltipProvider :delay-duration="300">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              :class="cn(
                'hidden md:inline-flex shrink-0',
                isActive('/home') && 'bg-accent text-accent-foreground',
              )"
              @click="navigateTo('/home')"
            >
              <Home class="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>ホーム</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <!-- メニュー項目 / 菜单项 (desktop) -->
      <nav
        class="hidden md:flex items-center gap-0.5 flex-1 overflow-x-auto overflow-y-hidden h-full"
        style="scrollbar-width: none;"
      >
        <Button
          v-for="item in visibleMenuItems"
          :key="item.to"
          variant="ghost"
          size="sm"
          :class="cn(
            'shrink-0 text-muted-foreground font-normal h-8',
            isActive(item.to) && 'bg-accent text-accent-foreground font-medium',
          )"
          @click="navigateTo(item.to)"
        >
          {{ item.label }}
        </Button>
      </nav>

      <!-- 右側ツールバー / 右侧工具栏 -->
      <div class="flex items-center gap-1 ml-auto">
        <!-- 倉庫セレクター / 仓库选择器 -->
        <div v-if="warehouses.length > 0" class="hidden sm:flex items-center">
          <Select :model-value="localWarehouseId" @update:model-value="onWarehouseChange">
            <SelectTrigger class="h-8 w-auto max-w-[200px] text-xs gap-1">
              <WarehouseIcon class="size-3.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="全倉庫" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">全倉庫</SelectItem>
              <SelectItem v-for="wh in warehouses" :key="wh._id" :value="wh._id">
                {{ wh.code }} - {{ wh.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator orientation="vertical" class="h-6 hidden sm:block mx-1" />

        <!-- 言語切替 / 语言切换 -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="sm" class="h-8 px-2 text-xs font-semibold">
              {{ langDisplay }}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-40">
            <DropdownMenuItem
              v-for="loc in availableLocales"
              :key="loc.code"
              :class="cn(locale === loc.code && 'font-semibold text-primary')"
              @click="setLocale(loc.code)"
            >
              <span class="w-6 text-center font-semibold text-sm">{{ loc.flag }}</span>
              <span class="flex-1">{{ loc.label }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <!-- クイック検索 / 快速搜索 -->
        <TooltipProvider :delay-duration="300">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="sm"
                class="h-8 gap-1.5 px-2"
                @click="openCommandPalette"
              >
                <Search class="size-4 text-muted-foreground" />
                <Badge variant="outline" class="hidden md:inline-flex text-[10px] px-1.5 py-0 h-5 font-mono">
                  ⌘K
                </Badge>
              </Button>
            </TooltipTrigger>
            <TooltipContent>検索 (Ctrl+K)</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <!-- 通知ベル / 通知铃铛 -->
        <NotificationBell />

        <!-- テーマ切替 / 主题切换 -->
        <TooltipProvider :delay-duration="300">
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8"
                @click="toggleTheme"
              >
                <Sun v-if="isDark" class="size-4" />
                <Moon v-else class="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{ isDark ? 'ライトモード' : 'ダークモード' }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" class="h-6 mx-1" />

        <!-- ユーザーメニュー / 用户菜单 -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="h-8 gap-2 px-2">
              <Avatar class="size-6">
                <AvatarFallback class="text-xs font-semibold bg-primary text-primary-foreground">
                  {{ userInitial }}
                </AvatarFallback>
              </Avatar>
              <span class="text-sm max-md:hidden">{{ userDisplayName }}</span>
              <ChevronDown class="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel class="flex flex-col gap-0.5">
              <span>{{ userDisplayName }}</span>
              <span class="text-[11px] text-muted-foreground capitalize font-normal">{{ userRole }}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem @click="router.push('/settings/basic')">
                <Settings class="size-4" />
                <span>設定</span>
              </DropdownMenuItem>
              <DropdownMenuItem class="text-destructive focus:text-destructive" @click="handleLogout">
                <LogOut class="size-4" />
                <span>ログアウト</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
</template>
