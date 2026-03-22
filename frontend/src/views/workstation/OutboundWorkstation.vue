<script setup lang="ts">
/**
 * 出荷工作台 / 出荷ワークステーション
 *
 * 出荷担当者が毎日最初に見る画面。「今日何をするか」が一目でわかる。
 * 出货担当每天第一个看到的页面。一眼看到"今天做什么"。
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { http } from '@/api/http'

const router = useRouter()
const { t } = useI18n()
const loading = ref(false)

// ダッシュボードデータ / 仪表盘数据
const stats = ref({
  total: 0,
  unprocessed: 0,
  picking: 0,
  inspected: 0,
  shipped: 0,
  held: 0,
})

const recentOrders = ref<any[]>([])
const alerts = ref<any[]>([])

async function loadDashboard() {
  loading.value = true
  try {
    // 並列でデータ取得 / 并行获取数据
    const [kpi, orders] = await Promise.all([
      http.get<any>('/kpi/dashboard'),
      http.get<any>('/shipment-orders?limit=20'),
    ])

    // KPIからステータス集計 / 从KPI提取状态统计
    stats.value.total = kpi.shipmentCount ?? 0

    // 注文データ / 订单数据
    const items = Array.isArray(orders) ? orders : (orders.items ?? [])
    recentOrders.value = items

    // ステータス別集計 / 按状态统计
    let unprocessed = 0, picking = 0, inspected = 0, shipped = 0, held = 0
    for (const o of items) {
      if (o.statusHeld) { held++; continue }
      if (o.statusShipped) { shipped++; continue }
      if (o.statusInspected) { inspected++; continue }
      if (o.statusConfirmed) { picking++; continue }
      unprocessed++
    }
    stats.value = { total: items.length, unprocessed, picking, inspected, shipped, held }

    // アラート生成 / 生成告警
    alerts.value = []
    if (held > 0) {
      alerts.value.push({ type: 'warning', message: `${held}件の出荷保留あり / ${held}件出货暂停`, action: '/shipment/operations/list?statusHeld=true' })
    }
    if (unprocessed > 10) {
      alerts.value.push({ type: 'error', message: `未処理${unprocessed}件 — 処理を開始してください / 未处理${unprocessed}件`, action: '/shipment/operations/tasks' })
    }
  } catch (e) {
    console.error('Dashboard load failed', e)
  } finally {
    loading.value = false
  }
}

// ステータスの色 / 状态颜色
function statusType(order: any): string {
  if (order.statusHeld) return 'warning'
  if (order.statusShipped) return 'success'
  if (order.statusInspected) return 'primary'
  if (order.statusConfirmed) return 'info'
  return 'danger'
}
function statusLabel(order: any): string {
  if (order.statusHeld) return '保留'
  if (order.statusShipped) return '出荷済'
  if (order.statusInspected) return '検品済'
  if (order.statusConfirmed) return 'ピッキング'
  return '未処理'
}

function goTo(path: string) {
  router.push(path)
}

onMounted(loadDashboard)
</script>

<template>
  <div class="workstation" v-loading="loading">
    <!-- ヘッダー / 头部 -->
    <div class="ws-header">
      <h1 class="ws-title">出荷ワークステーション</h1>
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
      <div class="ws-action-card ws-action-primary" @click="goTo('/shipment/operations/tasks')">
        <div class="ws-action-icon">📦</div>
        <div class="ws-action-label">出荷処理を開始</div>
        <div class="ws-action-badge" v-if="stats.unprocessed">{{ stats.unprocessed }}件</div>
      </div>

      <div class="ws-action-card" @click="goTo('/shipment/operations/one-by-one/inspection')">
        <div class="ws-action-icon">🔍</div>
        <div class="ws-action-label">検品</div>
        <div class="ws-action-badge" v-if="stats.picking">{{ stats.picking }}件</div>
      </div>

      <div class="ws-action-card" @click="goTo('/shipment/picking-list')">
        <div class="ws-action-icon">📋</div>
        <div class="ws-action-label">ピッキングリスト</div>
      </div>

      <div class="ws-action-card" @click="goTo('/shipment/orders/create')">
        <div class="ws-action-icon">➕</div>
        <div class="ws-action-label">出荷指示作成</div>
      </div>
    </div>

    <!-- ステータスサマリー / 状态概览 -->
    <el-row :gutter="16" class="ws-stats">
      <el-col :span="4">
        <div class="ws-stat-card" @click="goTo('/shipment/operations/list')">
          <div class="ws-stat-value">{{ stats.total }}</div>
          <div class="ws-stat-label">今日の総数</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-danger" @click="goTo('/shipment/operations/tasks')">
          <div class="ws-stat-value">{{ stats.unprocessed }}</div>
          <div class="ws-stat-label">未処理</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-info" @click="goTo('/shipment/operations/list?statusConfirmed=true')">
          <div class="ws-stat-value">{{ stats.picking }}</div>
          <div class="ws-stat-label">ピッキング中</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-primary">
          <div class="ws-stat-value">{{ stats.inspected }}</div>
          <div class="ws-stat-label">検品済</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-success">
          <div class="ws-stat-value">{{ stats.shipped }}</div>
          <div class="ws-stat-label">出荷済</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="ws-stat-card ws-stat-warning" @click="goTo('/shipment/operations/list?statusHeld=true')">
          <div class="ws-stat-value">{{ stats.held }}</div>
          <div class="ws-stat-label">保留</div>
        </div>
      </el-col>
    </el-row>

    <!-- 最近の出荷 / 最近出货 -->
    <div class="ws-recent">
      <div class="ws-section-header">
        <h3>最近の出荷指示</h3>
        <el-button text type="primary" @click="goTo('/shipment/operations/list')">すべて表示</el-button>
      </div>
      <el-table :data="recentOrders" size="small" @row-click="(row: any) => goTo(`/shipment/operations/list`)">
        <el-table-column prop="orderNumber" label="注文番号" width="160" />
        <el-table-column label="ステータス" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row)" size="small">{{ statusLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="recipientName" label="届け先" width="150" />
        <el-table-column prop="recipientPrefecture" label="都道府県" width="100" />
        <el-table-column label="日時" width="150">
          <template #default="{ row }">{{ new Date(row.createdAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!recentOrders.length && !loading" description="出荷指示がありません" />
    </div>

    <!-- クイックリンク / 快速链接 -->
    <div class="ws-quick-links">
      <h3>その他の操作</h3>
      <div class="ws-link-grid">
        <el-button text @click="goTo('/shipment/results')">出荷実績</el-button>
        <el-button text @click="goTo('/shipment/delivery')">配完管理</el-button>
        <el-button text @click="goTo('/shipment/correction')">受注訂正</el-button>
        <el-button text @click="goTo('/shipment/tracking')">伝票管理</el-button>
        <el-button text @click="goTo('/fba/plans')">FBA</el-button>
        <el-button text @click="goTo('/rsl/plans')">RSL</el-button>
        <el-button text @click="goTo('/shipment/gift-options')">ギフト設定</el-button>
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
  background: linear-gradient(135deg, #2a3474 0%, #409eff 100%);
  color: #fff;
  border: none;
}
.ws-action-primary:hover {
  box-shadow: 0 6px 20px rgba(42, 52, 116, 0.3);
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
.ws-stat-info .ws-stat-value { color: #409eff; }
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
