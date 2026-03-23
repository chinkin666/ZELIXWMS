<script setup lang="ts">
/**
 * 入庫工作台 / 入庫ワークステーション
 *
 * 入庫担当者が毎日最初に見る画面。「今日何をするか」が一目でわかる。
 * 入库担当每天第一个看到的页面。一眼看到"今天做什么"。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { fetchInboundOrders } from '@/api/inboundOrder'
import type { InboundOrder } from '@/types/inventory'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const router = useRouter()
const { t } = useI18n()
const loading = ref(false)

// ステータス集計 / 状态统计
const stats = ref({
  total: 0,
  draft: 0,
  confirmed: 0,
  receiving: 0,
  received: 0,
  done: 0,
  overdue: 0,
})

const recentOrders = ref<InboundOrder[]>([])
const alerts = ref<Array<{ type: string; message: string; action: string }>>([])

async function loadDashboard() {
  loading.value = true
  try {
    // 入庫指示取得 / 获取入库指示
    const ordersRes = await fetchInboundOrders({ limit: 500 })

    const items = ordersRes.items ?? []
    recentOrders.value = items.slice(0, 20)

    // ステータス別集計 / 按状态统计
    const today = new Date().toISOString().slice(0, 10)
    let draft = 0, confirmed = 0, receiving = 0, received = 0, done = 0, overdue = 0
    for (const o of items) {
      if (o.status === 'draft') { draft++ }
      else if (o.status === 'confirmed') { confirmed++ }
      else if (o.status === 'receiving') { receiving++ }
      else if (o.status === 'received') { received++ }
      else if (o.status === 'done') { done++ }
      // 期限超過チェック / 逾期检查
      if (o.expectedDate && o.expectedDate.slice(0, 10) < today &&
          !['done', 'cancelled'].includes(o.status)) {
        overdue++
      }
    }
    stats.value = { total: items.length, draft, confirmed, receiving, received, done, overdue }

    // アラート生成 / 生成告警
    const newAlerts: typeof alerts.value = []
    if (overdue > 0) {
      newAlerts.push({
        type: 'error',
        message: `${overdue}件の入庫が期限超過 / ${overdue}件入库已逾期`,
        action: '/inbound/orders',
      })
    }
    if (confirmed > 5) {
      newAlerts.push({
        type: 'warning',
        message: `検品待ち${confirmed}件 — 検品を開始してください / 待检品${confirmed}件`,
        action: '/inbound/orders',
      })
    }
    if (received > 0) {
      newAlerts.push({
        type: 'info',
        message: `棚入れ待ち${received}件 / 待上架${received}件`,
        action: '/inbound/orders',
      })
    }
    alerts.value = newAlerts
  } catch (e) {
    console.error('Inbound dashboard load failed', e)
  } finally {
    loading.value = false
  }
}

// ステータスの色・ラベル / 状态颜色和标签
function statusTagClass(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    confirmed: 'bg-yellow-100 text-yellow-800',
    receiving: 'bg-blue-100 text-blue-800',
    received: 'bg-green-100 text-green-800',
    done: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return map[status] ?? 'bg-muted text-muted-foreground'
}
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: '下書き', confirmed: '確認済', receiving: '入庫中', received: '検品済', done: '完了', cancelled: 'キャンセル',
  }
  return map[status] ?? status
}

// 進捗計算 / 进度计算
function totalExpected(row: InboundOrder): number {
  return (row.lines ?? []).reduce((s, l) => s + (l.expectedQuantity ?? 0), 0)
}
function totalReceived(row: InboundOrder): number {
  return (row.lines ?? []).reduce((s, l) => s + (l.receivedQuantity ?? 0), 0)
}
function progressPercent(row: InboundOrder): number {
  const exp = totalExpected(row)
  return exp > 0 ? Math.round((totalReceived(row) / exp) * 100) : 0
}

function goTo(path: string) {
  router.push(path)
}

function goToOrder(row: InboundOrder) {
  if (row.status === 'received') {
    router.push(`/inbound/putaway/${row._id}`)
  } else if (row.status === 'confirmed' || row.status === 'receiving') {
    router.push(`/inbound/receive/${row._id}`)
  } else {
    router.push('/inbound/orders')
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="workstation">
    <div v-if="loading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>
    <template v-else>
      <!-- ヘッダー / 头部 -->
      <div class="ws-header">
        <h1 class="ws-title">入庫ワークステーション</h1>
        <span class="ws-date">{{ new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}</span>
      </div>

      <!-- アラート / 告警 -->
      <div v-if="alerts.length" class="ws-alerts">
        <div
          v-for="(alert, idx) in alerts"
          :key="idx"
          :class="alert.type === 'error' ? 'border-red-300 bg-red-50 text-red-800' : alert.type === 'warning' ? 'border-yellow-300 bg-yellow-50 text-yellow-800' : 'border-blue-300 bg-blue-50 text-blue-800'"
          class="rounded-md border p-3 text-sm cursor-pointer mb-2"
          @click="goTo(alert.action)"
        >
          {{ alert.message }}
        </div>
      </div>

      <!-- メインアクションボタン / 主操作按钮 -->
      <div class="ws-actions">
        <div class="ws-action-card ws-action-primary" @click="goTo('/inbound/orders')">
          <div class="ws-action-icon">📥</div>
          <div class="ws-action-label">入庫検品を開始</div>
          <div class="ws-action-badge" v-if="stats.confirmed">{{ stats.confirmed }}件</div>
        </div>
        <div class="ws-action-card" @click="goTo('/inbound/orders?status=received')">
          <div class="ws-action-icon">📦</div>
          <div class="ws-action-label">棚入れ</div>
          <div class="ws-action-badge" v-if="stats.received">{{ stats.received }}件</div>
        </div>
        <div class="ws-action-card" @click="goTo('/inbound/create')">
          <div class="ws-action-icon">➕</div>
          <div class="ws-action-label">入庫指示作成</div>
        </div>
        <div class="ws-action-card" @click="goTo('/inbound/import')">
          <div class="ws-action-icon">📄</div>
          <div class="ws-action-label">CSV取込</div>
        </div>
      </div>

      <!-- ステータスサマリー / 状态概览 -->
      <div class="grid grid-cols-6 gap-4 ws-stats">
        <div class="ws-stat-card" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.total }}</div>
          <div class="ws-stat-label">総数</div>
        </div>
        <div class="ws-stat-card ws-stat-info" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.draft }}</div>
          <div class="ws-stat-label">下書き</div>
        </div>
        <div class="ws-stat-card ws-stat-warning" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.confirmed }}</div>
          <div class="ws-stat-label">検品待ち</div>
        </div>
        <div class="ws-stat-card ws-stat-primary" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.receiving }}</div>
          <div class="ws-stat-label">入庫中</div>
        </div>
        <div class="ws-stat-card ws-stat-success" @click="goTo('/inbound/history')">
          <div class="ws-stat-value">{{ stats.done }}</div>
          <div class="ws-stat-label">完了</div>
        </div>
        <div class="ws-stat-card ws-stat-danger" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.overdue }}</div>
          <div class="ws-stat-label">期限超過</div>
        </div>
      </div>

      <!-- 最近の入庫指示 / 最近入库指示 -->
      <div class="ws-recent">
        <div class="ws-section-header">
          <h3>最近の入庫指示</h3>
          <Button class="text-sm text-primary hover:underline" @click="goTo('/inbound/orders')">すべて表示</Button>
        </div>
        <div class="rounded-md border overflow-auto">
          <Table class="w-full text-sm">
            <TableHeader>
              <TableRow class="border-b bg-muted/50">
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 160px">入庫指示番号</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 100px">ステータス</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 150px">仕入先</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 150px">進捗</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 120px">入庫予定日</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 120px">日時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in recentOrders" :key="row._id" class="border-b hover:bg-muted/50 cursor-pointer" @click="goToOrder(row)">
                <TableCell class="p-2">{{ row.orderNumber }}</TableCell>
                <TableCell class="p-2">
                  <span :class="statusTagClass(row.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ statusLabel(row.status) }}</span>
                </TableCell>
                <TableCell class="p-2">{{ row.supplier?.name || '-' }}</TableCell>
                <TableCell class="p-2">
                  <div class="ws-progress-cell">
                    <div class="w-full bg-muted rounded-full h-1.5 flex-1">
                      <div class="bg-primary h-1.5 rounded-full" :style="{ width: progressPercent(row) + '%' }"></div>
                    </div>
                    <span class="ws-progress-text">{{ totalReceived(row) }}/{{ totalExpected(row) }}</span>
                  </div>
                </TableCell>
                <TableCell class="p-2">{{ row.expectedDate ? new Date(row.expectedDate).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }) : '-' }}</TableCell>
                <TableCell class="p-2">{{ row.createdAt ? new Date(row.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-' }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div v-if="!recentOrders.length && !loading" class="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <p>入庫指示がありません</p>
        </div>
      </div>

      <!-- クイックリンク / 快速链接 -->
      <div class="ws-quick-links">
        <h3>その他の操作</h3>
        <div class="ws-link-grid">
          <Button class="text-sm text-primary hover:underline" @click="goTo('/inbound/history')">入庫履歴</Button>
          <Button class="text-sm text-primary hover:underline" @click="goTo('/inbound/sizes')">サイズ登録</Button>
          <Button class="text-sm text-primary hover:underline" @click="goTo('/inbound/billing')">入庫請求</Button>
          <Button class="text-sm text-primary hover:underline" @click="goTo('/inbound/photos')">写真登録</Button>
          <Button class="text-sm text-primary hover:underline" @click="goTo('/passthrough/receive')">通過型受付</Button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.workstation { padding: 24px; max-width: 1200px; margin: 0 auto; }
.ws-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; }
.ws-title { font-size: 24px; font-weight: 700; margin: 0; color: #1d1e2c; }
.ws-date { color: #909399; font-size: 14px; }
.ws-alerts { margin-bottom: 16px; }
.ws-actions { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.ws-action-card { background: #fff; border: 1px solid #ebeef5; border-radius: 12px; padding: 24px 20px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; }
.ws-action-card:hover { border-color: #409eff; box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15); transform: translateY(-2px); }
.ws-action-primary { background: linear-gradient(135deg, #0d7a3f 0%, #67c23a 100%); color: #fff; border: none; }
.ws-action-primary:hover { box-shadow: 0 6px 20px rgba(13, 122, 63, 0.3); }
.ws-action-primary .ws-action-label { color: #fff; font-size: 16px; }
.ws-action-icon { font-size: 32px; margin-bottom: 8px; }
.ws-action-label { font-size: 14px; font-weight: 600; color: #303133; }
.ws-action-badge { position: absolute; top: 8px; right: 8px; background: #f56c6c; color: #fff; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: 700; }
.ws-action-primary .ws-action-badge { background: #fff; color: #f56c6c; }
.ws-stats { margin-bottom: 24px; }
.ws-stat-card { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 16px; text-align: center; cursor: pointer; transition: all 0.15s; }
.ws-stat-card:hover { border-color: #dcdfe6; background: #fafafa; }
.ws-stat-value { font-size: 28px; font-weight: 700; color: #303133; }
.ws-stat-label { font-size: 12px; color: #909399; margin-top: 4px; }
.ws-stat-danger .ws-stat-value { color: #f56c6c; }
.ws-stat-info .ws-stat-value { color: #909399; }
.ws-stat-primary .ws-stat-value { color: #2a3474; }
.ws-stat-success .ws-stat-value { color: #67c23a; }
.ws-stat-warning .ws-stat-value { color: #e6a23c; }
.ws-recent { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
.ws-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.ws-section-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #303133; }
.ws-progress-cell { display: flex; align-items: center; gap: 8px; }
.ws-progress-text { font-size: 12px; color: #606266; white-space: nowrap; }
.ws-quick-links { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 20px; }
.ws-quick-links h3 { margin: 0 0 12px; font-size: 14px; color: #909399; }
.ws-link-grid { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
