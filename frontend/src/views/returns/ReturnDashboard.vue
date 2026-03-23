<template>
  <div class="return-dashboard">
    <PageHeader :title="t('wms.returns.dashboard', '返品ダッシュボード')" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;">
          <Button variant="secondary" size="sm" @click="loadData">{{ t('wms.common.refresh', '更新') }}</Button>
          <Button variant="default" size="sm" @click="$router.push('/returns/create')">{{ t('wms.common.create', '新規作成') }}</Button>
        </div>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>

    <template v-else-if="stats && stats.statusCounts">
      <!-- ステータス別KPIカード / 按状态KPI卡片 -->
      <div class="kpi-grid">
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ totalReturns }}</div>
            <div class="kpi-label">{{ t('wms.returns.totalReturns', '返品合計') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ stats.statusCounts?.draft ?? 0 }}</div>
            <div class="kpi-label">{{ t('wms.returns.statusDraft', '下書き') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card kpi-card--warning text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ stats.statusCounts?.inspecting ?? 0 }}</div>
            <div class="kpi-label">{{ t('wms.returns.statusInspecting', '検品中') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card kpi-card--success text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ stats.statusCounts?.completed ?? 0 }}</div>
            <div class="kpi-label">{{ t('wms.returns.statusCompleted', '完了') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card kpi-card--danger text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ stats.statusCounts?.cancelled ?? 0 }}</div>
            <div class="kpi-label">{{ t('wms.returns.statusCancelled', 'キャンセル') }}</div>
          </CardContent>
        </Card>
      </div>

      <!-- 再入庫・廃棄集計 / 再入库・废弃汇总 -->
      <div class="kpi-grid kpi-grid--secondary">
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ stats.totalRestocked ?? 0 }}</div>
            <div class="kpi-label">{{ t('wms.returns.totalRestocked', '再入庫合計') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ stats.totalDisposed ?? 0 }}</div>
            <div class="kpi-label">{{ t('wms.returns.totalDisposed', '廃棄合計') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ restockRatio }}%</div>
            <div class="kpi-label">{{ t('wms.returns.restockRatio', '再入庫率') }}</div>
          </CardContent>
        </Card>
      </div>

      <!-- 返品理由別内訳 / 按退货理由分类 -->
      <div class="section">
        <h2 class="section-title">{{ t('wms.returns.reasonBreakdown', '返品理由別内訳') }}</h2>
        <div class="reason-grid">
          <Card v-for="(count, reason) in (stats.reasonBreakdown ?? {})" :key="reason" class="reason-card text-center">
            <CardContent class="pt-6">
              <div class="reason-count">{{ count }}</div>
              <div class="reason-label">{{ reasonLabel(String(reason)) }}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <!-- 最近の返品（10件） / 最近的退货（10件） -->
      <div class="section">
        <h2 class="section-title">{{ t('wms.returns.recentReturns', '最近の返品') }}</h2>
        <div v-if="!stats.recentReturns || stats.recentReturns.length === 0" class="empty-state">{{ t('wms.returns.noReturns', '返品データがありません') }}</div>
        <div class="rounded-md border overflow-auto" v-else>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('wms.returns.orderNumber', '返品番号') }}</TableHead>
                <TableHead>{{ t('wms.returns.status', '状態') }}</TableHead>
                <TableHead>{{ t('wms.returns.reason', '理由') }}</TableHead>
                <TableHead>{{ t('wms.returns.customer', '顧客') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.returns.lineCount', '行数') }}</TableHead>
                <TableHead>{{ t('wms.returns.receivedDate', '受領日') }}</TableHead>
                <TableHead style="width:100px;">{{ t('wms.common.actions', '操作') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in (stats.recentReturns ?? [])" :key="row._id">
                <TableCell><span class="order-number">{{ row.orderNumber }}</span></TableCell>
                <TableCell><Badge variant="secondary">{{ statusLabel(row.status) }}</Badge></TableCell>
                <TableCell>{{ reasonLabel(row.returnReason) }}</TableCell>
                <TableCell>{{ row.customerName || '-' }}</TableCell>
                <TableCell class="text-right">{{ row.lines?.length ?? 0 }}</TableCell>
                <TableCell>{{ formatDate(row.receivedDate) }}</TableCell>
                <TableCell>
                  <Button variant="default" size="sm" @click="goToDetail(row)">{{ t('wms.common.detail', '詳細') }}</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PageHeader from '@/components/shared/PageHeader.vue'
import { fetchReturnDashboardStats, type ReturnDashboardStats, type ReturnOrder } from '@/api/returnOrder'
import { computed, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const isLoading = ref(false)
const stats = ref<ReturnDashboardStats | null>(null)

// 返品合計数 / 退货合计数
const totalReturns = computed(() => {
  if (!stats.value?.statusCounts) return 0
  const c = stats.value.statusCounts
  return (c.draft ?? 0) + (c.inspecting ?? 0) + (c.completed ?? 0) + (c.cancelled ?? 0)
})

// 再入庫率 / 再入库率
const restockRatio = computed(() => {
  if (!stats.value) return 0
  const total = (stats.value.totalRestocked ?? 0) + (stats.value.totalDisposed ?? 0)
  if (total === 0) return 0
  return Math.round(((stats.value.totalRestocked ?? 0) / total) * 100)
})

// ステータスラベル / 状态标签
const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    draft: t('wms.returns.statusDraft', '下書き'),
    inspecting: t('wms.returns.statusInspecting', '検品中'),
    completed: t('wms.returns.statusCompleted', '完了'),
    cancelled: t('wms.common.cancel', 'キャンセル'),
  }
  return map[s] || s
}

// ステータスCSSクラス / 状态CSS类
const statusClass = (s: string) => {
  const map: Record<string, string> = {
    draft: 'o-status-tag--draft',
    inspecting: 'o-status-tag--printed',
    completed: 'o-status-tag--confirmed',
    cancelled: 'o-status-tag--cancelled',
  }
  return map[s] || ''
}

// 返品理由ラベル / 退货理由标签
const reasonLabel = (r: string) => {
  const map: Record<string, string> = {
    customer_request: t('wms.returns.reasonCustomerRequest', 'お客様都合'),
    defective: t('wms.returns.reasonDefective', '不良品'),
    wrong_item: t('wms.returns.reasonWrongItem', '誤配送'),
    damaged: t('wms.returns.reasonDamaged', '破損'),
    other: t('wms.returns.reasonOther', 'その他'),
  }
  return map[r] || r
}

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ja-JP') : '-'

const goToDetail = (row: ReturnOrder) => {
  router.push(`/returns/${row._id}`)
}

const loadData = async () => {
  isLoading.value = true
  try {
    stats.value = await fetchReturnDashboardStats()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.common.fetchError', 'データの取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.return-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--o-gray-500, #909399);
  font-size: 14px;
}

/* KPI カード / KPI卡片 */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.kpi-grid--secondary {
  margin-bottom: 0.5rem;
}

.kpi-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.kpi-card--warning { border-left: 4px solid var(--o-warning, #e6a23c); }
.kpi-card--success { border-left: 4px solid var(--o-success, #67c23a); }
.kpi-card--danger { border-left: 4px solid var(--o-danger, #f56c6c); }

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--o-gray-800, #1f2937);
}

.kpi-label {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-top: 4px;
}

/* セクション / 区块 */
.section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--o-border-color, #e4e7ed);
}

/* 理由別カード / 按理由分类卡片 */
.reason-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.reason-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.reason-count {
  font-size: 22px;
  font-weight: 700;
  color: var(--o-gray-800, #1f2937);
}

.reason-label {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-top: 2px;
}

/* テーブル補助 / 表格辅助 */
.order-number {
  font-family: monospace;
  font-weight: 600;
  color: var(--o-brand-primary, #0052A3);
}

.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

.o-status-tag--draft { background: var(--o-gray-100); color: var(--o-gray-500); }
.o-status-tag--cancelled { background: var(--o-danger-bg); color: var(--o-danger); }
</style>
