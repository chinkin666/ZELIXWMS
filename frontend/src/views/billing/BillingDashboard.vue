<template>
  <div class="billing-dashboard">
    <PageHeader title="請求ダッシュボード" :show-search="false">
      <template #actions>
        <Button variant="secondary" size="sm" @click="loadData">更新</Button>
      </template>
    </PageHeader>

    <div v-if="isLoading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>

    <template v-else-if="kpi">
      <!-- KPIカード / KPIカード -->
      <div class="kpi-grid">
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ (kpi.monthlyOrderCount || 0).toLocaleString() }}</div>
            <div class="kpi-label">当月出荷件数</div>
          </CardContent>
        </Card>
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">&yen;{{ (kpi.monthlyShippingCost || 0).toLocaleString() }}</div>
            <div class="kpi-label">当月配送料金</div>
          </CardContent>
        </Card>
        <Card class="kpi-card kpi-card--warning text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">&yen;{{ (kpi.unbilledAmount || 0).toLocaleString() }}</div>
            <div class="kpi-label">未請求額</div>
          </CardContent>
        </Card>
        <Card class="kpi-card kpi-card--danger text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">&yen;{{ (kpi.unpaidAmount || 0).toLocaleString() }}</div>
            <div class="kpi-label">未入金額</div>
          </CardContent>
        </Card>
      </div>

      <!-- 最近の請求レコード / 最近の請求レコード -->
      <div class="section">
        <h2 class="section-title">最近の請求データ</h2>
        <div v-if="kpi.recentRecords.length === 0" class="empty-state">請求データがありません</div>
        <div class="rounded-md border overflow-auto" v-else>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>期間</TableHead>
                <TableHead>荷主</TableHead>
                <TableHead>配送業者</TableHead>
                <TableHead class="text-right">出荷件数</TableHead>
                <TableHead class="text-right">合計</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in kpi.recentRecords" :key="row._id">
                <TableCell>{{ row.period }}</TableCell>
                <TableCell>{{ row.clientName }}</TableCell>
                <TableCell>{{ row.carrierName }}</TableCell>
                <TableCell class="text-right">{{ (row.orderCount || 0).toLocaleString() }}</TableCell>
                <TableCell class="text-right">&yen;{{ (row.totalAmount || 0).toLocaleString() }}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{{ statusLabel(row.status) }}</Badge>
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
import { useToast } from '@/composables/useToast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PageHeader from '@/components/shared/PageHeader.vue'
import { fetchBillingDashboard } from '@/api/billing'
import type { BillingDashboardKpi, BillingStatus } from '@/api/billing'
import { onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
const toast = useToast()
const isLoading = ref(false)
const kpi = ref<BillingDashboardKpi | null>(null)

// ── ステータス表示 / ステータス表示 ──
const statusLabel = (s: BillingStatus): string => {
  const map: Record<BillingStatus, string> = {
    draft: '下書き',
    confirmed: '確定',
    invoiced: '請求済',
    paid: '入金済',
  }
  return map[s] || s
}

const statusClass = (s: BillingStatus): string => {
  const map: Record<BillingStatus, string> = {
    draft: 'bg-muted text-muted-foreground',
    confirmed: 'bg-blue-100 text-blue-800',
    invoiced: 'bg-blue-100 text-blue-800',
    paid: 'bg-amber-100 text-amber-800',
  }
  return map[s] || ''
}

// ── データ取得 / データ取得 ──
const loadData = async () => {
  isLoading.value = true
  try {
    kpi.value = await fetchBillingDashboard()
  } catch (e: any) {
    toast.showError(e?.message || 'データの取得に失敗しました')
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
.billing-dashboard {
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

/* KPIカード / KPIカード */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.kpi-card {
  text-align: center;
}

.kpi-card--warning { border-left: 4px solid var(--o-warning, #e6a23c); }
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

/* セクション / セクション */
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

/* テーブル補助 / テーブル補助 */
.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }

</style>
