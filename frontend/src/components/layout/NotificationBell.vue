<script setup lang="ts">
/**
 * 通知ベルコンポーネント / 通知铃铛组件
 *
 * ナビバーに配置し、低在庫・期限切れ・入庫遅延等のアラートをリアルタイム表示
 * 放置在导航栏，实时显示低库存、到期、入库延迟等警报
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { http } from '@/api/http'
import { cachedFetch } from '@/composables/useApiCache'

interface AlertItem {
  id: string
  type: 'low-stock' | 'expiring' | 'expired' | 'overdue-inbound'
  title: string
  detail: string
  route: string
  severity: 'warning' | 'danger' | 'info'
}

const { t } = useI18n()
const router = useRouter()
const isOpen = ref(false)
const alerts = ref<AlertItem[]>([])
const isLoading = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const badgeCount = computed(() => alerts.value.length)
const hasDanger = computed(() => alerts.value.some(a => a.severity === 'danger'))

async function loadAlerts() {
  isLoading.value = true
  const items: AlertItem[] = []

  try {
    // 低在庫（60秒キャッシュ）/ 低库存（60秒缓存）
    const lowStock = await cachedFetch('ntf-low-stock', () => http.get<any[]>('/inventory/alerts/low-stock'), 60000).catch(() => [])
    if (Array.isArray(lowStock) && lowStock.length > 0) {
      items.push({
        id: 'low-stock',
        type: 'low-stock',
        title: t('wms.notification.lowStock', '低在庫アラート'),
        detail: `${lowStock.length} ${t('wms.notification.skusBelowSafety', 'SKUが安全在庫を下回っています')}`,
        route: '/inventory/stock',
        severity: 'warning',
      })
    }

    // 在庫概況から期限情報 / 从库存概况获取期限信息
    const overview = await http.get<any>('/inventory/overview').catch(() => null)
    if (overview) {
      if (overview.expiredCount > 0) {
        items.push({
          id: 'expired',
          type: 'expired',
          title: t('wms.notification.expired', '期限切れ在庫'),
          detail: `${overview.expiredCount} ${t('wms.notification.lotsExpired', 'ロットが期限切れです')}`,
          route: '/inventory/expiry-alerts',
          severity: 'danger',
        })
      }
      if (overview.expiringCount > 0) {
        items.push({
          id: 'expiring',
          type: 'expiring',
          title: t('wms.notification.expiringSoon', '期限間近'),
          detail: `${overview.expiringCount} ${t('wms.notification.lotsExpiringSoon', 'ロットが期限間近です')}`,
          route: '/inventory/expiry-alerts',
          severity: 'warning',
        })
      }
    }

    // 入庫遅延 / 入库延迟
    const inboundRes = await http.get<any>('/inbound-orders', { status: 'confirmed', limit: '200' }).catch(() => ({ items: [] }))
    const today = new Date().toISOString().slice(0, 10)
    const overdueInbound = (inboundRes.items || []).filter((o: any) =>
      o.expectedDate && o.expectedDate.slice(0, 10) < today && o.status !== 'done' && o.status !== 'cancelled'
    )
    if (overdueInbound.length > 0) {
      items.push({
        id: 'overdue-inbound',
        type: 'overdue-inbound',
        title: t('wms.notification.overdueInbound', '入庫遅延'),
        detail: `${overdueInbound.length} ${t('wms.notification.inboundOrdersOverdue', '件の入庫指示が期限超過')}`,
        route: '/inbound/dashboard',
        severity: 'danger',
      })
    }
  } catch {
    // サイレント失敗 / 静默失败
  } finally {
    alerts.value = items
    isLoading.value = false
  }
}

function handleClick(alert: AlertItem) {
  isOpen.value = false
  router.push(alert.route)
}

function handleClickOutside(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('.ntf-bell-wrap')
  if (!el) isOpen.value = false
}

onMounted(() => {
  loadAlerts()
  pollTimer = setInterval(loadAlerts, 5 * 60 * 1000) // 5分ごと / 每5分钟
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="ntf-bell-wrap">
    <button class="ntf-bell-btn" @click.stop="isOpen = !isOpen" :title="t('wms.notification.title', '通知')">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
      </svg>
      <span v-if="badgeCount > 0" class="ntf-badge" :class="{ 'ntf-badge--danger': hasDanger }">
        {{ badgeCount > 9 ? '9+' : badgeCount }}
      </span>
    </button>

    <Transition name="ntf-drop">
      <div v-if="isOpen" class="ntf-dropdown">
        <div class="ntf-dropdown-header">
          <span class="ntf-dropdown-title">{{ t('wms.notification.title', '通知') }}</span>
          <button class="ntf-refresh-btn" @click.stop="loadAlerts" :disabled="isLoading">
            <svg :class="{ 'ntf-spin': isLoading }" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
              <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
            </svg>
          </button>
        </div>

        <div v-if="alerts.length === 0 && !isLoading" class="ntf-empty">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" style="color:var(--o-gray-300)">
            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
          </svg>
          <span>{{ t('wms.notification.noAlerts', 'アラートはありません') }}</span>
        </div>

        <div v-else class="ntf-list">
          <button
            v-for="alert in alerts"
            :key="alert.id"
            class="ntf-item"
            :class="'ntf-item--' + alert.severity"
            @click="handleClick(alert)"
          >
            <div class="ntf-item-icon">
              <svg v-if="alert.severity === 'danger'" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.469l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
              </svg>
            </div>
            <div class="ntf-item-content">
              <div class="ntf-item-title">{{ alert.title }}</div>
              <div class="ntf-item-detail">{{ alert.detail }}</div>
            </div>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" class="ntf-item-arrow">
              <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.ntf-bell-wrap {
  position: relative;
}

.ntf-bell-btn {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--o-gray-500, #909399);
  cursor: pointer;
  transition: all 0.15s;
}

.ntf-bell-btn:hover {
  background: rgba(0,0,0,0.06);
  color: var(--o-gray-700, #303133);
}

.ntf-badge {
  position: absolute;
  top: 2px;
  right: 0;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  color: #fff;
  background: #e6a23c;
  border-radius: 8px;
}

.ntf-badge--danger {
  background: #f56c6c;
  animation: ntf-pulse 2s infinite;
}

@keyframes ntf-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.ntf-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 340px;
  background: var(--o-view-background, #fff);
  border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 8px 30px rgba(0,0,0,0.12);
  z-index: 1100;
  overflow: hidden;
}

.ntf-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.ntf-dropdown-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.ntf-refresh-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  border-radius: 6px;
  color: var(--o-gray-400, #909399);
  cursor: pointer;
}

.ntf-refresh-btn:hover {
  background: var(--o-gray-100, #f3f4f6);
}

.ntf-spin {
  animation: ntf-spin-anim 0.8s linear infinite;
}

@keyframes ntf-spin-anim {
  to { transform: rotate(360deg); }
}

.ntf-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--o-gray-400, #c0c4cc);
  font-size: 13px;
}

.ntf-list {
  max-height: 320px;
  overflow-y: auto;
}

.ntf-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
  border-bottom: 1px solid var(--o-border-color-light, #f0f0f0);
}

.ntf-item:last-child {
  border-bottom: none;
}

.ntf-item:hover {
  background: var(--o-gray-50, #f9fafb);
}

.ntf-item-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  flex-shrink: 0;
}

.ntf-item--danger .ntf-item-icon {
  background: #FEF2F2;
  color: #DC2626;
}

.ntf-item--warning .ntf-item-icon {
  background: #FFFBEB;
  color: #D97706;
}

.ntf-item--info .ntf-item-icon {
  background: #EFF6FF;
  color: #2563EB;
}

.ntf-item-content {
  flex: 1;
  min-width: 0;
}

.ntf-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  line-height: 1.3;
}

.ntf-item-detail {
  font-size: 12px;
  color: var(--o-gray-500, #6b7280);
  margin-top: 2px;
}

.ntf-item-arrow {
  color: var(--o-gray-300, #d1d5db);
  flex-shrink: 0;
}

/* Transition */
.ntf-drop-enter-active { transition: all 0.15s ease-out; }
.ntf-drop-leave-active { transition: all 0.1s ease-in; }
.ntf-drop-enter-from, .ntf-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Dark mode */
:global([data-theme="dark"]) .ntf-dropdown {
  background: #1C1C1E;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.4);
}

:global([data-theme="dark"]) .ntf-bell-btn:hover {
  background: rgba(255,255,255,0.08);
}

:global([data-theme="dark"]) .ntf-item:hover {
  background: rgba(255,255,255,0.04);
}
</style>
