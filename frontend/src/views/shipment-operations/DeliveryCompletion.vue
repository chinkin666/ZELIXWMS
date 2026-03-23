<template>
  <div class="delivery-completion">
    <PageHeader :title="t('wms.shipment.deliveryTitle', '配完管理')" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="loadData">{{ t('wms.common.refresh', '更新') }}</Button>
      </template>
    </PageHeader>

    <!-- 集計カード / 统计卡片 -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-value">{{ stats.shipped }}</div>
        <div class="summary-label">出荷済（未配完）</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ stats.delivered }}</div>
        <div class="summary-label">配達完了</div>
      </div>
      <div class="summary-card warning" v-if="stats.undelivered > 0">
        <div class="summary-value">{{ stats.undelivered }}</div>
        <div class="summary-label">未配完（3日超過）</div>
      </div>
    </div>

    <!-- 出荷済み一覧 / 已出荷列表 -->
    <div class="section-header">
      <h3 class="section-title">出荷済みオーダー</h3>
      <div class="filter-tabs">
        <Button :class="['tab-btn', filter === 'all' && 'active']" @click="filter = 'all'; loadData()">全て</Button>
        <Button :class="['tab-btn', filter === 'shipped' && 'active']" @click="filter = 'shipped'; loadData()">出荷済</Button>
        <Button :class="['tab-btn', filter === 'delivered' && 'active']" @click="filter = 'delivered'; loadData()">配完済</Button>
      </div>
    </div>

    <div class="rounded-md border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Checkbox :checked="selectAll" @update:checked="(v: boolean) => { selectAll = v; toggleSelectAll() }" /></TableHead>
            <TableHead>出荷管理No</TableHead>
            <TableHead>お客様管理番号</TableHead>
            <TableHead>伝票番号</TableHead>
            <TableHead>配送業者</TableHead>
            <TableHead>お届け先</TableHead>
            <TableHead>出荷日時</TableHead>
            <TableHead>配完ステータス</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="orders.length === 0">
            <TableCell colspan="9" class="text-center py-8 text-muted-foreground">データがありません</TableCell>
          </TableRow>
          <TableRow v-for="order in orders" :key="order._id">
            <TableCell><Checkbox :checked="selectedIds.includes(order._id)" @update:checked="(v: boolean) => { if (v) { selectedIds.push(order._id) } else { selectedIds = selectedIds.filter(id => id !== order._id) } }" /></TableCell>
            <TableCell>{{ order.orderNumber }}</TableCell>
            <TableCell>{{ order.customerManagementNumber || '-' }}</TableCell>
            <TableCell>{{ order.trackingId || '未発行' }}</TableCell>
            <TableCell>{{ getCarrierName(order.carrierId) }}</TableCell>
            <TableCell>{{ order.recipient?.name || '-' }}</TableCell>
            <TableCell>{{ formatDate(order.statusShippedAt) }}</TableCell>
            <TableCell>
              <span v-if="order.statusCarrierReceived" class="badge badge-success">配完</span>
              <span v-else class="badge badge-warning">未配完</span>
            </TableCell>
            <TableCell>
              <Button v-if="!order.statusCarrierReceived" class="btn-action" @click="markDelivered(order._id)">配完</Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- 一括配完ボタン / 批量配完按钮 -->
    <div v-if="selectedIds.length > 0" class="bulk-actions">
      <span>{{ selectedIds.length }}件選択中</span>
      <Button variant="default" size="sm" @click="markDeliveredBulk">一括配完</Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import PageHeader from '@/components/shared/PageHeader.vue'
import { apiFetch } from '@/api/http'
import { getApiBaseUrl } from '@/api/base'

const API_BASE_URL = getApiBaseUrl()
const toast = useToast()
const { t } = useI18n()
const orders = ref<any[]>([])
const selectedIds = ref<string[]>([])
const selectAll = ref(false)
const filter = ref('all')
const stats = ref({ shipped: 0, delivered: 0, undelivered: 0 })

// 配送業者名取得 / 获取配送公司名称
function getCarrierName(id: string) {
  if (id === '__builtin_yamato_b2__') return 'ヤマト運輸'
  if (id?.includes('sagawa')) return '佐川急便'
  return id || '-'
}

// 日付フォーマット / 日期格式化
function formatDate(d: string | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// データ読込 / 加载数据
async function loadData() {
  try {
    // 出荷済み注文を取得 / 获取已出荷订单
    const params = new URLSearchParams({ limit: '200', sortBy: 'createdAt', sortOrder: 'desc' })
    const res = await apiFetch(`${API_BASE_URL}/shipment-orders?${params}`)
    if (!res.ok) {
      toast.showError('データの取得に失敗しました')
      return
    }
    const data = await res.json()
    const items = Array.isArray(data) ? data : data.items || data.data || []

    // NestJS扁平構造に適応 / 适配NestJS扁平结构
    // statusShipped / statusCarrierReceived フラグを使用
    const shipped = items.filter((o: any) => o.statusShipped)
    if (filter.value === 'shipped') {
      orders.value = shipped.filter((o: any) => !o.statusCarrierReceived)
    } else if (filter.value === 'delivered') {
      orders.value = shipped.filter((o: any) => o.statusCarrierReceived)
    } else {
      orders.value = shipped
    }

    // 集計 / 统计
    stats.value = {
      shipped: shipped.filter((o: any) => !o.statusCarrierReceived).length,
      delivered: shipped.filter((o: any) => o.statusCarrierReceived).length,
      undelivered: shipped.filter((o: any) => {
        if (o.statusCarrierReceived) return false
        const shippedAt = o.statusShippedAt
        if (!shippedAt) return false
        const days = (Date.now() - new Date(shippedAt).getTime()) / (1000 * 60 * 60 * 24)
        return days > 3
      }).length,
    }
  } catch (e: any) {
    toast.showError('データの取得に失敗しました')
  }
}

// 配完処理（carrier_received ステータスに変更）/ 标记配达完成（变更为carrier_received状态）
async function markDelivered(orderId: string) {
  try {
    await apiFetch(`${API_BASE_URL}/shipment-orders/status/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [orderId], status: 'carrier_received' }),
    })
    toast.showSuccess('配完しました')
    loadData()
  } catch {
    toast.showError('配完処理に失敗しました')
  }
}

// 一括配完 / 批量配达完成
async function markDeliveredBulk() {
  try {
    await apiFetch(`${API_BASE_URL}/shipment-orders/status/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds.value, status: 'carrier_received' }),
    })
    toast.showSuccess(`${selectedIds.value.length}件を配完しました`)
    selectedIds.value = []
    selectAll.value = false
    loadData()
  } catch {
    toast.showError('一括配完に失敗しました')
  }
}

function toggleSelectAll() {
  if (selectAll.value) {
    selectedIds.value = orders.value.filter((o: any) => !o.statusCarrierReceived).map((o: any) => o._id)
  } else {
    selectedIds.value = []
  }
}

onMounted(loadData)
</script>

<style scoped>
.delivery-completion { display: flex; flex-direction: column; gap: 16px; padding: 0 20px 20px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.summary-card { background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: 8px; padding: 16px; text-align: center; }
.summary-card.warning { border-color: #e6a23c; background: #fef9e7; }
.summary-value { font-size: 28px; font-weight: 700; color: var(--o-primary, #017e84); }
.summary-card.warning .summary-value { color: #e6a23c; }
.summary-label { font-size: 13px; color: var(--o-gray-600, #606266); margin-top: 4px; }
.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 16px; font-weight: 600; margin: 0; }
.filter-tabs { display: flex; gap: 4px; }
.tab-btn { padding: 4px 12px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: 4px; background: var(--o-view-background, #fff); cursor: pointer; font-size: 13px; }
.tab-btn.active { background: var(--o-primary, #017e84); color: white; border-color: var(--o-primary, #017e84); }
.badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.badge-success { background: #e8f5e9; color: #2e7d32; }
.badge-warning { background: #fff8e1; color: #f57f17; }
.btn-action { padding: 4px 12px; border: 1px solid var(--o-primary, #017e84); border-radius: 4px; background: transparent; color: var(--o-primary, #017e84); cursor: pointer; font-size: 12px; }
.btn-action:hover { background: var(--o-primary, #017e84); color: white; }
.bulk-actions { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
@import '@/styles/order-table.css';
</style>
