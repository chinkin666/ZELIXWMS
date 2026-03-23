<template>
  <div class="notification-center">
    <PageHeader :title="t('wms.notifications.center', '通知センター')" :show-search="false">
      <template #actions>
        <Button variant="outline" size="sm" @click="markAllRead" :disabled="unreadCount === 0">
          {{ t('wms.notifications.markAllRead', 'すべて既読にする') }}
        </Button>
      </template>
    </PageHeader>

    <!-- タブ切替 / 标签切换 -->
    <div class="tab-bar">
      <Button
        :variant="activeTab === 'unread' ? 'default' : 'outline'"
        class="tab-item"
        :class="{ active: activeTab === 'unread' }"
        @click="activeTab = 'unread'; loadNotifications()"
      >
        {{ t('wms.notifications.unread', '未読') }}
        <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
      </Button>
      <Button
        :variant="activeTab === 'read' ? 'default' : 'outline'"
        class="tab-item"
        :class="{ active: activeTab === 'read' }"
        @click="activeTab = 'read'; loadNotifications()"
      >
        {{ t('wms.notifications.read', '既読') }}
      </Button>
    </div>

    <!-- 通知一覧 / 通知列表 -->
    <div v-if="isLoading" class="flex flex-col items-center gap-2 py-8">
      <Skeleton class="h-16 w-full rounded-lg" />
      <Skeleton class="h-16 w-full rounded-lg" />
      <Skeleton class="h-16 w-full rounded-lg" />
    </div>
    <div v-else-if="!isLoading && notifications.length === 0" class="text-center py-8 text-muted-foreground">
      データがありません
    </div>
    <template v-else>
      <div class="notification-list">
        <div
          v-for="item in notifications"
          :key="item._id"
          class="notification-card"
          :class="{ unread: !item.readAt }"
          @click="handleClickNotification(item)"
        >
          <!-- タイプ別アイコン / 类型图标 -->
          <div class="notification-icon" :style="{ background: getIconBg(item.type), color: getIconColor(item.type) }">
            {{ getIcon(item.type) }}
          </div>

          <div class="notification-body">
            <div class="notification-header">
              <span class="notification-title">{{ item.title }}</span>
              <!-- 優先度バッジ / 优先级标签 -->
              <span
                class="priority-badge"
                :class="`priority-${item.priority || 'normal'}`"
              >
                {{ getPriorityLabel(item.priority) }}
              </span>
            </div>
            <div class="notification-message">{{ item.message }}</div>
            <div class="notification-meta">
              <span class="notification-time">{{ formatTime(item.createdAt) }}</span>
              <span v-if="!item.readAt" class="unread-dot" />
            </div>
          </div>
        </div>
      </div>

      <!-- ページネーション / 分页 -->
      <div v-if="totalPages > 1" class="pagination">
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage <= 1"
          @click="currentPage--; loadNotifications()"
        >
          {{ t('wms.common.prev', '前へ') }}
        </Button>
        <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
        <Button
          variant="outline"
          size="sm"
          :disabled="currentPage >= totalPages"
          @click="currentPage++; loadNotifications()"
        >
          {{ t('wms.common.next', '次へ') }}
        </Button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 通知センター / 通知中心
 *
 * 未読・既読の通知一覧を表示し、既読操作・全既読操作を行う
 * 显示未读/已读通知列表，支持标记已读和全部已读操作
 */
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiBaseUrl } from '@/api/base'
import { apiFetch } from '@/api/http'

const API_BASE_URL = getApiBaseUrl()
const toast = useToast()
const { t } = useI18n()

// 通知データ型 / 通知数据类型
interface Notification {
  _id: string
  title: string
  message: string
  type: string        // order.created, order.shipped, inbound.received, etc.
  priority?: string   // urgent, high, normal, low
  readAt?: string | null
  createdAt: string
}

const isLoading = ref(false)
const notifications = ref<Notification[]>([])
const activeTab = ref<'unread' | 'read'>('unread')
const unreadCount = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)
const pageSize = 20

// 通知一覧の読み込み / 加载通知列表
const loadNotifications = async () => {
  isLoading.value = true
  try {
    const url = new URL(`${API_BASE_URL}/notifications`)
    url.searchParams.append('status', activeTab.value)
    url.searchParams.append('page', String(currentPage.value))
    url.searchParams.append('limit', String(pageSize))

    const res = await apiFetch(url.toString())
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || '通知の取得に失敗しました')
    const data = await res.json()
    notifications.value = data.data || data.notifications || []
    totalPages.value = data.totalPages || Math.ceil((data.total || 0) / pageSize) || 1
    unreadCount.value = data.unreadCount ?? unreadCount.value
  } catch (e: any) {
    toast.showError(e.message || t('wms.notifications.fetchFailed', '通知の取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

// 未読件数の取得 / 获取未读数
const loadUnreadCount = async () => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/notifications?status=unread&limit=0`)
    if (res.ok) {
      const data = await res.json()
      unreadCount.value = data.unreadCount ?? data.total ?? 0
    }
  } catch {
    // サイレント / 静默处理
  }
}

// 通知クリック → 既読にする / 点击通知 → 标记已读
const handleClickNotification = async (item: Notification) => {
  if (item.readAt) return
  try {
    const res = await apiFetch(`${API_BASE_URL}/notifications/${item._id}/read`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('既読の更新に失敗しました')
    item.readAt = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch (e: any) {
    toast.showError(e.message || t('wms.notifications.markReadFailed', '既読の更新に失敗しました'))
  }
}

// 全て既読にする / 全部标记已读
const markAllRead = async () => {
  try {
    const res = await apiFetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'POST',
    })
    if (!res.ok) throw new Error('既読の更新に失敗しました')
    toast.showSuccess(t('wms.notifications.allMarkedRead', 'すべての通知を既読にしました'))
    unreadCount.value = 0
    await loadNotifications()
  } catch (e: any) {
    toast.showError(e.message || t('wms.notifications.markAllReadFailed', '全既読の更新に失敗しました'))
  }
}

// タイプ別アイコン / 类型图标映射
const getIcon = (type: string): string => {
  const map: Record<string, string> = {
    'order.created': '\u{1F4E6}',    // 注文作成 / 订单创建
    'order.shipped': '\u{1F69A}',    // 出荷完了 / 已发货
    'inbound.received': '\u{1F4E5}', // 入庫完了 / 入库完成
    'inventory.low': '\u{26A0}',     // 在庫不足 / 库存不足
    'system.alert': '\u{1F514}',     // システム通知 / 系统通知
    'exception.created': '\u{26D4}', // 異常発生 / 异常发生
  }
  return map[type] || '\u{1F4E8}'
}

const getIconBg = (type: string): string => {
  if (type.startsWith('order')) return '#e6f4ff'
  if (type.startsWith('inbound')) return '#e6fffb'
  if (type.startsWith('inventory')) return '#fff7e6'
  if (type.startsWith('exception')) return '#fff1f0'
  return '#f0f2f5'
}

const getIconColor = (type: string): string => {
  if (type.startsWith('order')) return '#1677ff'
  if (type.startsWith('inbound')) return '#13c2c2'
  if (type.startsWith('inventory')) return '#fa8c16'
  if (type.startsWith('exception')) return '#f5222d'
  return '#606266'
}

// 優先度ラベル / 优先级标签
const getPriorityLabel = (priority?: string): string => {
  const map: Record<string, string> = {
    urgent: '緊急',
    high: '高',
    normal: '通常',
    low: '低',
  }
  return map[priority || 'normal'] || '通常'
}

// 時刻フォーマット / 时间格式化
const formatTime = (dateStr: string): string => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  // 1時間以内は相対時間 / 1小时内用相对时间
  if (diffMin < 1) return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}時間前`

  return d.toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  loadNotifications()
  loadUnreadCount()
})
</script>

<style scoped>
.notification-center {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* タブバー / 标签栏 */
.tab-bar {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
}

.tab-item {
  padding: 10px 20px;
  border: none;
  background: none;
  font-size: 14px;
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-item:hover {
  color: var(--o-brand-primary, #0052A3);
}

.tab-item.active {
  color: var(--o-brand-primary, #0052A3);
  border-bottom-color: var(--o-brand-primary, #0052A3);
  font-weight: 600;
}

/* 未読バッジ / 未读徽标 */
.unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--o-danger, #f56c6c);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

/* 通知リスト / 通知列表 */
.notification-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 18px;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  cursor: pointer;
  transition: box-shadow 0.2s, background 0.2s;
}

.notification-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.notification-card.unread {
  background: #f6faff;
  border-left: 3px solid var(--o-brand-primary, #0052A3);
}

/* アイコン / 图标 */
.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

/* 通知本体 / 通知正文 */
.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.notification-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-800, #303133);
}

.notification-message {
  font-size: 13px;
  color: var(--o-gray-600, #606266);
  line-height: 1.5;
  margin-bottom: 6px;
}

.notification-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-time {
  font-size: 12px;
  color: var(--o-gray-400, #c0c4cc);
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--o-brand-primary, #0052A3);
}

/* 優先度バッジ / 优先级标签 */
.priority-badge {
  display: inline-block;
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.priority-urgent {
  background: #fff1f0;
  color: #cf1322;
}

.priority-high {
  background: #fff7e6;
  color: #d46b08;
}

.priority-normal {
  background: #e6f4ff;
  color: #1677ff;
}

.priority-low {
  background: #f0f2f5;
  color: #909399;
}

/* ページネーション / 分页 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 0;
}

.page-info {
  font-size: 13px;
  color: var(--o-gray-600, #606266);
}
</style>
