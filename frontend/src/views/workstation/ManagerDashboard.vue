<script setup lang="ts">
/**
 * 管理者ダッシュボード / 管理者仪表盘
 *
 * 管理者が倉庫全体の状況を把握する統合画面。KPI・出荷・入庫・在庫・パフォーマンスを一望。
 * 管理者掌握仓库整体情况的统合画面。KPI、出货、入库、库存、性能一览无余。
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { http } from '@/api/http'

const router = useRouter()
const { t } = useI18n()
const loading = ref(false)

// 概要メトリクス / 概要指标
const overview = ref({
  totalShipments: 0,
  totalInbounds: 0,
  totalProducts: 0,
  totalStockQuantity: 0,
})

// 出荷メトリクス / 出货指标
const shipment = ref({
  total: 0,
  confirmed: 0,
  shipped: 0,
  held: 0,
  pending: 0,
})

// 在庫メトリクス / 库存指标
const inventory = ref({
  totalQuantity: 0,
  reservedQuantity: 0,
  availableQuantity: 0,
})

// パフォーマンス / 性能指标
const performance = ref({
  fulfillmentRate: 0,
  averageProcessingHours: null as number | null,
})

// KPIダッシュボード / KPI仪表盘
const dashboard = ref({
  orderCount: 0,
  shipmentCount: 0,
  inboundCount: 0,
  returnCount: 0,
})

// 低在庫アラート / 低库存警报
const stockAlerts = ref<Array<{
  productId: string
  productSku: string
  productName: string
  quantity: number
  locationId: string
}>>([])

// スループット / 吞吐量
const throughput = ref({ rate: 0 })

async function loadDashboard() {
  loading.value = true
  try {
    // 全KPIを並列取得 / 并行获取所有KPI
    const [dashRes, overviewRes, shipRes, invRes, perfRes, alertsRes, thruRes] = await Promise.all([
      http.get<any>('/api/kpi/dashboard'),
      http.get<any>('/api/kpi/overview-metrics'),
      http.get<any>('/api/kpi/shipment-metrics'),
      http.get<any>('/api/kpi/inventory-metrics'),
      http.get<any>('/api/kpi/performance'),
      http.get<any>('/api/kpi/alerts?threshold=10'),
      http.get<any>('/api/kpi/throughput'),
    ])

    dashboard.value = { ...dashboard.value, ...(dashRes ?? {}) }
    overview.value = { ...overview.value, ...(overviewRes ?? {}) }
    shipment.value = { ...shipment.value, ...(shipRes ?? {}) }
    inventory.value = { ...inventory.value, ...(invRes ?? {}) }
    performance.value = { ...performance.value, ...(perfRes ?? {}) }
    stockAlerts.value = Array.isArray(alertsRes) ? alertsRes.slice(0, 10) : []
    throughput.value = thruRes ?? { rate: 0 }
  } catch (e) {
    console.error('Manager dashboard load failed', e)
  } finally {
    loading.value = false
  }
}

function goTo(path: string) {
  router.push(path)
}

function formatNumber(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('ja-JP')
}

onMounted(loadDashboard)
</script>

<template>
  <div class="workstation" v-loading="loading">
    <!-- ヘッダー / 头部 -->
    <div class="ws-header">
      <h1 class="ws-title">管理者ダッシュボード</h1>
      <span class="ws-date">{{ new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}</span>
    </div>

    <!-- 低在庫アラート / 低库存警报 -->
    <div v-if="stockAlerts.length" class="ws-alerts">
      <el-alert
        title="低在庫アラート"
        :description="`${stockAlerts.length}件の商品が在庫不足 / ${stockAlerts.length}件商品库存不足`"
        type="warning"
        show-icon
        :closable="false"
        style="cursor: pointer; margin-bottom: 8px"
        @click="goTo('/inventory/low-stock-alerts')"
      />
    </div>

    <!-- 概要カード / 概要卡片 -->
    <div class="ws-overview">
      <div class="ws-overview-card" @click="goTo('/shipment/workstation')">
        <div class="ws-overview-icon">📦</div>
        <div class="ws-overview-data">
          <div class="ws-overview-value">{{ formatNumber(overview.totalShipments) }}</div>
          <div class="ws-overview-label">出荷注文数</div>
        </div>
      </div>
      <div class="ws-overview-card" @click="goTo('/inbound/workstation')">
        <div class="ws-overview-icon">📥</div>
        <div class="ws-overview-data">
          <div class="ws-overview-value">{{ formatNumber(overview.totalInbounds) }}</div>
          <div class="ws-overview-label">入庫注文数</div>
        </div>
      </div>
      <div class="ws-overview-card" @click="goTo('/products/list')">
        <div class="ws-overview-icon">🏷️</div>
        <div class="ws-overview-data">
          <div class="ws-overview-value">{{ formatNumber(overview.totalProducts) }}</div>
          <div class="ws-overview-label">商品数</div>
        </div>
      </div>
      <div class="ws-overview-card" @click="goTo('/inventory/stock')">
        <div class="ws-overview-icon">🏭</div>
        <div class="ws-overview-data">
          <div class="ws-overview-value">{{ formatNumber(overview.totalStockQuantity) }}</div>
          <div class="ws-overview-label">総在庫数量</div>
        </div>
      </div>
    </div>

    <!-- パフォーマンスKPI / 性能KPI -->
    <div class="ws-kpi-row">
      <div class="ws-kpi-card">
        <div class="ws-kpi-value ws-kpi-primary">{{ performance.fulfillmentRate }}%</div>
        <div class="ws-kpi-label">フルフィルメント率</div>
        <div class="ws-kpi-sublabel">出荷完了 / 全注文</div>
      </div>
      <div class="ws-kpi-card">
        <div class="ws-kpi-value ws-kpi-success">{{ throughput.rate }}</div>
        <div class="ws-kpi-label">日次スループット</div>
        <div class="ws-kpi-sublabel">1日あたり出荷件数</div>
      </div>
      <div class="ws-kpi-card">
        <div class="ws-kpi-value ws-kpi-info">{{ performance.averageProcessingHours != null ? performance.averageProcessingHours + 'h' : '-' }}</div>
        <div class="ws-kpi-label">平均処理時間</div>
        <div class="ws-kpi-sublabel">確認→出荷</div>
      </div>
      <div class="ws-kpi-card">
        <div class="ws-kpi-value ws-kpi-warning">{{ dashboard.returnCount }}</div>
        <div class="ws-kpi-label">返品数</div>
        <div class="ws-kpi-sublabel">キャンセル入庫</div>
      </div>
    </div>

    <!-- 出荷・在庫セクション（横並び）/ 出货・库存区域（横排） -->
    <el-row :gutter="24" class="ws-detail-row">
      <!-- 出荷ステータス / 出货状态 -->
      <el-col :span="12">
        <div class="ws-detail-card">
          <div class="ws-section-header">
            <h3>出荷ステータス</h3>
            <el-button text type="primary" @click="goTo('/shipment/workstation')">詳細</el-button>
          </div>
          <div class="ws-detail-stats">
            <div class="ws-detail-stat">
              <span class="ws-detail-stat-value">{{ shipment.total }}</span>
              <span class="ws-detail-stat-label">総数</span>
            </div>
            <div class="ws-detail-stat">
              <span class="ws-detail-stat-value ws-text-danger">{{ shipment.pending }}</span>
              <span class="ws-detail-stat-label">未処理</span>
            </div>
            <div class="ws-detail-stat">
              <span class="ws-detail-stat-value ws-text-info">{{ shipment.confirmed }}</span>
              <span class="ws-detail-stat-label">確認済</span>
            </div>
            <div class="ws-detail-stat">
              <span class="ws-detail-stat-value ws-text-success">{{ shipment.shipped }}</span>
              <span class="ws-detail-stat-label">出荷済</span>
            </div>
            <div class="ws-detail-stat">
              <span class="ws-detail-stat-value ws-text-warning">{{ shipment.held }}</span>
              <span class="ws-detail-stat-label">保留</span>
            </div>
          </div>
          <!-- 簡易プログレス / 简易进度 -->
          <div class="ws-shipment-progress" v-if="shipment.total > 0">
            <el-progress
              :percentage="Math.round((shipment.shipped / shipment.total) * 100)"
              :stroke-width="10"
              :format="(p: number) => `出荷率 ${p}%`"
            />
          </div>
        </div>
      </el-col>

      <!-- 在庫メトリクス / 库存指标 -->
      <el-col :span="12">
        <div class="ws-detail-card">
          <div class="ws-section-header">
            <h3>在庫状況</h3>
            <el-button text type="primary" @click="goTo('/inventory/stock')">詳細</el-button>
          </div>
          <div class="ws-detail-stats">
            <div class="ws-detail-stat">
              <span class="ws-detail-stat-value">{{ formatNumber(inventory.totalQuantity) }}</span>
              <span class="ws-detail-stat-label">総在庫</span>
            </div>
            <div class="ws-detail-stat">
              <span class="ws-detail-stat-value ws-text-warning">{{ formatNumber(inventory.reservedQuantity) }}</span>
              <span class="ws-detail-stat-label">引当済</span>
            </div>
            <div class="ws-detail-stat">
              <span class="ws-detail-stat-value ws-text-success">{{ formatNumber(inventory.availableQuantity) }}</span>
              <span class="ws-detail-stat-label">利用可能</span>
            </div>
          </div>
          <!-- 引当率プログレス / 引当率进度 -->
          <div class="ws-shipment-progress" v-if="inventory.totalQuantity > 0">
            <el-progress
              :percentage="Math.round((inventory.availableQuantity / inventory.totalQuantity) * 100)"
              :stroke-width="10"
              status="success"
              :format="(p: number) => `利用可能 ${p}%`"
            />
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 低在庫テーブル / 低库存表格 -->
    <div v-if="stockAlerts.length" class="ws-recent">
      <div class="ws-section-header">
        <h3>低在庫商品</h3>
        <el-button text type="primary" @click="goTo('/inventory/low-stock-alerts')">すべて表示</el-button>
      </div>
      <el-table :data="stockAlerts" size="small">
        <el-table-column prop="productSku" label="SKU" width="160" />
        <el-table-column prop="productName" label="商品名" />
        <el-table-column prop="quantity" label="残数" width="100">
          <template #default="{ row }">
            <el-tag :type="row.quantity <= 3 ? 'danger' : 'warning'" size="small">{{ row.quantity }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="locationId" label="ロケーション" width="160" />
      </el-table>
    </div>

    <!-- クイックナビゲーション / 快速导航 -->
    <div class="ws-quick-links">
      <h3>クイックナビゲーション</h3>
      <div class="ws-link-grid">
        <el-button text @click="goTo('/shipment/workstation')">出荷ワークステーション</el-button>
        <el-button text @click="goTo('/inbound/workstation')">入庫ワークステーション</el-button>
        <el-button text @click="goTo('/inventory/ledger')">在庫ダッシュボード</el-button>
        <el-button text @click="goTo('/daily/list')">日次レポート</el-button>
        <el-button text @click="goTo('/reports')">業績レポート</el-button>
        <el-button text @click="goTo('/billing/dashboard')">請求ダッシュボード</el-button>
        <el-button text @click="goTo('/returns/dashboard')">返品ダッシュボード</el-button>
        <el-button text @click="goTo('/settings/basic')">システム設定</el-button>
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

/* 概要カード / 概要卡片 */
.ws-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.ws-overview-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.ws-overview-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}
.ws-overview-icon {
  font-size: 36px;
}
.ws-overview-data {
  flex: 1;
}
.ws-overview-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}
.ws-overview-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* KPI行 / KPI行 */
.ws-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.ws-kpi-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}
.ws-kpi-value {
  font-size: 32px;
  font-weight: 700;
}
.ws-kpi-primary { color: #2a3474; }
.ws-kpi-success { color: #67c23a; }
.ws-kpi-info { color: #409eff; }
.ws-kpi-warning { color: #e6a23c; }
.ws-kpi-label {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-top: 4px;
}
.ws-kpi-sublabel {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

/* 詳細カード / 详细卡片 */
.ws-detail-row {
  margin-bottom: 24px;
}
.ws-detail-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
  height: 100%;
}
.ws-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.ws-section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.ws-detail-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}
.ws-detail-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ws-detail-stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
}
.ws-detail-stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
.ws-text-danger { color: #f56c6c; }
.ws-text-info { color: #409eff; }
.ws-text-success { color: #67c23a; }
.ws-text-warning { color: #e6a23c; }

.ws-shipment-progress {
  margin-top: 8px;
}

/* 最近テーブル / 最近表格 */
.ws-recent {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

/* クイックリンク / 快速链接 */
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
