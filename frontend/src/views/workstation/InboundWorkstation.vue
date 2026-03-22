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
import { http } from '@/api/http'
import { fetchInboundOrders } from '@/api/inboundOrder'
import type { InboundOrder } from '@/types/inventory'

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
    // 並列でデータ取得 / 并行获取数据
    const [kpi, ordersRes] = await Promise.all([
      http.get<any>('/api/kpi/dashboard'),
      fetchInboundOrders({ limit: 500 }),
    ])

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
        type: 'danger',
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
function statusType(status: string): string {
  const map: Record<string, string> = {
    draft: 'info', confirmed: 'warning', receiving: '', received: 'success', done: 'success', cancelled: 'danger',
  }
  return map[status] ?? 'info'
}
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: '下書き', confirmed: '確認済', receiving: '入庫中', received: '検品済', done: '完了', cancelled: 'キャンセル',
  }
  return map[status] ?? status
}

// 進捗計算 / 进度计算
function totalExpected(row: InboundOrder): number {
  return row.lines.reduce((s, l) => s + l.expectedQuantity, 0)
}
function totalReceived(row: InboundOrder): number {
  return row.lines.reduce((s, l) => s + l.receivedQuantity, 0)
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
  <div class="workstation" v-loading="loading">
    <!-- ヘッダー / 头部 -->
    <div class="ws-header">
      <h1 class="ws-title">入庫ワークステーション</h1>
      <span class="ws-date">{{ new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}</span>
    </div>

    <!-- アラート / 告警 -->
    <div v-if="alerts.length" class="ws-alerts">
      <el-alert
        v-for="(alert, idx) in alerts"
        :key="idx"
        :title="alert.message"
        :type="alert.type"
        show-icon
        :closable="false"
        style="cursor: pointer; margin-bottom: 8px"
        @click="goTo(alert.action)"
      />
    </div>

    <!-- メインアクションボタン / 主操作按钮 -->
    <div class="ws-actions">
      <div class="ws-action-card ws-action-primary" @click="goTo('/inbound/orders')">
        <div class="ws-action-icon">📥</div>
        <div class="ws-action-label">入庫検品を開始</div>
        <div class="ws-action-badge" v-if="stats.confirmed">{{ stats.confirmed }}件</div>
      </div>

      <div class="ws-action-card" @click="goTo('/inbound/orders')">
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
    <el-row :gutter="16" class="ws-stats">
      <el-col :span="4">
        <div class="ws-stat-card" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.total }}</div>
          <div class="ws-stat-label">総数</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-info" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.draft }}</div>
          <div class="ws-stat-label">下書き</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-warning" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.confirmed }}</div>
          <div class="ws-stat-label">検品待ち</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-primary" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.receiving }}</div>
          <div class="ws-stat-label">入庫中</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-success">
          <div class="ws-stat-value">{{ stats.done }}</div>
          <div class="ws-stat-label">完了</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-danger" @click="goTo('/inbound/orders')">
          <div class="ws-stat-value">{{ stats.overdue }}</div>
          <div class="ws-stat-label">期限超過</div>
        </div>
      </el-col>
    </el-row>

    <!-- 最近の入庫指示 / 最近入库指示 -->
    <div class="ws-recent">
      <div class="ws-section-header">
        <h3>最近の入庫指示</h3>
        <el-button text type="primary" @click="goTo('/inbound/orders')">すべて表示</el-button>
      </div>
      <el-table :data="recentOrders" size="small" @row-click="(row: any) => goToOrder(row)">
        <el-table-column prop="orderNumber" label="入庫指示番号" width="160" />
        <el-table-column label="ステータス" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="仕入先" width="150">
          <template #default="{ row }">{{ row.supplier?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="進捗" width="150">
          <template #default="{ row }">
            <div class="ws-progress-cell">
              <el-progress :percentage="progressPercent(row)" :stroke-width="6" :show-text="false" />
              <span class="ws-progress-text">{{ totalReceived(row) }}/{{ totalExpected(row) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="入庫予定日" width="120">
          <template #default="{ row }">{{ row.expectedDate ? new Date(row.expectedDate).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' }) : '-' }}</template>
        </el-table-column>
        <el-table-column label="日時" width="120">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!recentOrders.length && !loading" description="入庫指示がありません" />
    </div>

    <!-- クイックリンク / 快速链接 -->
    <div class="ws-quick-links">
      <h3>その他の操作</h3>
      <div class="ws-link-grid">
        <el-button text @click="goTo('/inbound/history')">入庫履歴</el-button>
        <el-button text @click="goTo('/inbound/sizes')">サイズ登録</el-button>
        <el-button text @click="goTo('/inbound/billing')">入庫請求</el-button>
        <el-button text @click="goTo('/inbound/photos')">写真登録</el-button>
        <el-button text @click="goTo('/passthrough/receive')">通過型受付</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.workstation {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.ws-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20px;
}
.ws-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #1d1e2c;
}
.ws-date {
  color: #909399;
  font-size: 14px;
}

.ws-alerts {
  margin-bottom: 16px;
}

.ws-actions {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}
.ws-action-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 24px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.ws-action-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}
.ws-action-primary {
  background: linear-gradient(135deg, #0d7a3f 0%, #67c23a 100%);
  color: #fff;
  border: none;
}
.ws-action-primary:hover {
  box-shadow: 0 6px 20px rgba(13, 122, 63, 0.3);
}
.ws-action-primary .ws-action-label {
  color: #fff;
  font-size: 16px;
}
.ws-action-icon {
  font-size: 32px;
  margin-bottom: 8px;
}
.ws-action-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.ws-action-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #f56c6c;
  color: #fff;
  border-radius: 10px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 700;
}
.ws-action-primary .ws-action-badge {
  background: #fff;
  color: #f56c6c;
}

.ws-stats {
  margin-bottom: 24px;
}
.ws-stat-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s;
}
.ws-stat-card:hover {
  border-color: #dcdfe6;
  background: #fafafa;
}
.ws-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}
.ws-stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.ws-stat-danger .ws-stat-value { color: #f56c6c; }
.ws-stat-info .ws-stat-value { color: #909399; }
.ws-stat-primary .ws-stat-value { color: #2a3474; }
.ws-stat-success .ws-stat-value { color: #67c23a; }
.ws-stat-warning .ws-stat-value { color: #e6a23c; }

.ws-recent {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}
.ws-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.ws-section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.ws-progress-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ws-progress-text {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.ws-quick-links {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
}
.ws-quick-links h3 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #909399;
}
.ws-link-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
