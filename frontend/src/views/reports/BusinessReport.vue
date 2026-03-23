<template>
  <div class="report-page">
    <PageHeader :title="t('wms.report.title', '業績レポート')" :show-search="false">
      <template #actions>
        <div class="report-period-bar">
          <Button
            v-for="preset in periodPresets"
            :key="preset.days"
            :variant="activeDays === preset.days ? 'default' : 'outline'"
            size="sm"
            class="period-btn"
            :class="{ active: activeDays === preset.days }"
            @click="setPeriod(preset.days)"
          >{{ preset.label }}</Button>
          <Input type="date" v-model="customFrom" class="h-8 text-sm" />
          <span style="color:var(--o-gray-400)">〜</span>
          <Input type="date" v-model="customTo" class="h-8 text-sm" />
          <Button variant="secondary" size="sm" @click="loadCustom">{{ t('wms.common.search', '検索') }}</Button>
        </div>
      </template>
    </PageHeader>

    <div v-if="false"><!-- loading handled by DataTable --></div><template v-if="true">
      <!-- 出荷サマリーカード / 出货概要卡片 -->
      <div class="kpi-row">
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ shipStats?.totalShipped ?? '-' }}</div>
            <div class="kpi-label">{{ t('wms.report.totalShipped', '出荷件数') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ formatNumber(shipStats?.totalQuantity ?? 0) }}</div>
            <div class="kpi-label">{{ t('wms.report.totalQuantity', '出荷個数') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ turnover?.summary?.currentStock ?? '-' }}</div>
            <div class="kpi-label">{{ t('wms.report.currentStock', '現在庫数') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card kpi-card--accent text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ turnover?.summary?.turnoverRate ?? '-' }}</div>
            <div class="kpi-label">{{ t('wms.report.turnoverRate', '在庫回転率') }}</div>
          </CardContent>
        </Card>
        <Card class="kpi-card text-center">
          <CardContent class="pt-6">
            <div class="kpi-value">{{ turnover?.summary?.turnoverDays ?? '-' }}{{ t('wms.report.days', '日') }}</div>
            <div class="kpi-label">{{ t('wms.report.turnoverDays', '在庫回転日数') }}</div>
          </CardContent>
        </Card>
      </div>

      <!-- 日別出荷トレンド / 日别出货趋势 -->
      <div class="section">
        <h3 class="section-title">{{ t('wms.report.dailyTrend', '日別出荷トレンド') }}</h3>
        <div class="chart-card" v-if="shipStats && shipStats.daily?.length > 0">
          <div class="bar-chart">
            <div v-for="day in shipStats.daily" :key="day.date" class="bar-col">
              <div class="bar-stack">
                <div class="bar bar--count" :style="{ height: barHeight(day.count, maxDailyCount) }" :title="`${day.count}件`" />
              </div>
              <div class="bar-label">{{ formatDateShort(day.date) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="empty-chart">{{ t('wms.report.noData', 'データがありません') }}</div>
      </div>

      <!-- 在庫回転率 TOP SKU / 库存周转率 TOP SKU -->
      <div class="section">
        <h3 class="section-title">{{ t('wms.report.topSkuTurnover', '在庫回転率 TOP SKU') }}</h3>
        <div class="table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>{{ t('wms.report.productName', '商品名') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.report.outboundQty', '出庫数') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.report.currentStock', '在庫数') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.report.turnoverRate', '回転率') }}</TableHead>
                <TableHead>{{ t('wms.report.turnoverBar', '回転率') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(item, idx) in turnover?.topSkus ?? []" :key="item.sku">
                <TableCell>{{ idx + 1 }}</TableCell>
                <TableCell class="sku-cell">{{ item.sku }}</TableCell>
                <TableCell>{{ item.productName || '-' }}</TableCell>
                <TableCell class="text-right">{{ formatNumber(item.outboundQty) }}</TableCell>
                <TableCell class="text-right">{{ formatNumber(item.currentStock) }}</TableCell>
                <TableCell class="text-right font-bold">{{ item.turnover }}</TableCell>
                <TableCell style="width:120px;">
                  <div class="turnover-bar-wrap">
                    <div class="turnover-bar" :style="{ width: Math.min(100, (item.turnover / maxTurnover) * 100) + '%' }" />
                  </div>
                </TableCell>
              </TableRow>
              <TableRow v-if="!turnover?.topSkus?.length">
                <TableCell colspan="7" class="empty-row">{{ t('wms.report.noData', 'データがありません') }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- 荷主別出荷 / 荷主别出货 -->
      <div class="section" v-if="clientReport?.shipments?.length">
        <h3 class="section-title">{{ t('wms.report.clientShipments', '荷主別出荷実績') }}</h3>
        <div class="table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('wms.report.client', '荷主') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.report.orderCount', '注文数') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.report.totalQuantity', '個数') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.report.totalAmount', '金額') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.report.shippingCost', '配送料') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in clientReport.shipments" :key="row.clientId">
                <TableCell>{{ row.clientId || t('wms.report.directOrder', '直接注文') }}</TableCell>
                <TableCell class="text-right">{{ formatNumber(row.orderCount) }}</TableCell>
                <TableCell class="text-right">{{ formatNumber(row.totalQuantity) }}</TableCell>
                <TableCell class="text-right">¥{{ formatNumber(row.totalAmount) }}</TableCell>
                <TableCell class="text-right">¥{{ formatNumber(row.shippingCost) }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <!-- 仕入先別入庫 / 供应商别入库 -->
      <div class="section" v-if="clientReport?.inbound?.length">
        <h3 class="section-title">{{ t('wms.report.supplierInbound', '仕入先別入庫実績') }}</h3>
        <div class="table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('wms.report.supplier', '仕入先') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.report.inboundCount', '入庫件数') }}</TableHead>
                <TableHead class="text-right">{{ t('wms.report.totalLines', '行数') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in clientReport.inbound" :key="row.supplierName">
                <TableCell>{{ row.supplierName }}</TableCell>
                <TableCell class="text-right">{{ row.inboundCount }}</TableCell>
                <TableCell class="text-right">{{ row.totalLines }}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  fetchShipmentStats, fetchClientReport, fetchInventoryTurnover,
  type ShipmentStatsResult, type ClientReportResult, type InventoryTurnoverResult,
} from '@/api/dashboard'

const { t } = useI18n()
const toast = useToast()

const isLoading = ref(false)
const activeDays = ref(30)
const customFrom = ref('')
const customTo = ref('')

const shipStats = ref<ShipmentStatsResult | null>(null)
const clientReport = ref<ClientReportResult | null>(null)
const turnover = ref<InventoryTurnoverResult | null>(null)

const periodPresets = [
  { days: 7, label: '7日' },
  { days: 14, label: '14日' },
  { days: 30, label: '30日' },
  { days: 90, label: '90日' },
]

const maxDailyCount = computed(() => Math.max(1, ...(shipStats.value?.daily?.map(d => d.count) || [1])))
const maxTurnover = computed(() => Math.max(1, ...(turnover.value?.topSkus?.map(s => s.turnover) || [1])))

function formatNumber(n: number): string {
  return (n ?? 0).toLocaleString()
}

function formatDateShort(d: string): string {
  const parts = d.split('-')
  return parts.length >= 3 ? `${Number(parts[1])}/${Number(parts[2])}` : d
}

function barHeight(value: number, max: number): string {
  return `${Math.max(2, (value / max) * 100)}%`
}

function getDateRange(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getTime() - (days - 1) * 86400000)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

async function loadData(from?: string, to?: string, days?: number) {
  isLoading.value = true
  try {
    // 個別にcatchしてAPIエラーを抑制（未実装の場合はnull）/ 单独catch以抑制API错误（未实装时为null）
    const [shipResult, clientResult, turnoverResult] = await Promise.all([
      fetchShipmentStats(from, to).catch(() => null),
      fetchClientReport(from, to).catch(() => null),
      fetchInventoryTurnover(days || activeDays.value).catch(() => null),
    ])
    shipStats.value = shipResult
    clientReport.value = clientResult
    turnover.value = turnoverResult
  } catch {
    // レポートデータの取得失敗は無視 / 报表数据获取失败时忽略
  } finally {
    isLoading.value = false
  }
}

function setPeriod(days: number) {
  activeDays.value = days
  const { from, to } = getDateRange(days)
  customFrom.value = from
  customTo.value = to
  loadData(from, to, days)
}

function loadCustom() {
  if (!customFrom.value || !customTo.value) return
  activeDays.value = 0
  const d1 = new Date(customFrom.value)
  const d2 = new Date(customTo.value)
  const days = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000))
  loadData(customFrom.value, customTo.value, days)
}

onMounted(() => {
  const { from, to } = getDateRange(30)
  customFrom.value = from
  customTo.value = to
  loadData(from, to, 30)
})
</script>

<style scoped>
.report-page {
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.report-period-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.period-btn {
  padding: 5px 12px;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 6px;
  background: var(--o-view-background, #fff);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--o-gray-600);
}

.period-btn:hover { border-color: var(--o-brand-primary); color: var(--o-brand-primary); }
.period-btn.active { background: var(--o-brand-primary); color: #fff; border-color: var(--o-brand-primary); }

.o-input-sm { height: 30px; padding: 4px 8px; font-size: 13px; border: 1px solid var(--o-border-color); border-radius: 4px; }

/* KPI */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.kpi-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.kpi-card--accent { border-left: 4px solid var(--o-brand-primary); }
.kpi-value { font-size: 28px; font-weight: 700; color: var(--o-gray-800); }
.kpi-label { font-size: 12px; color: var(--o-gray-500); margin-top: 4px; }

/* Section */
.section { margin-bottom: 24px; }
.section-title { font-size: 16px; font-weight: 600; color: var(--o-gray-700); margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid var(--o-border-color); }

/* Chart */
.chart-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color);
  border-radius: 8px;
  padding: 16px;
}

.bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 160px; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
.bar-stack { flex: 1; display: flex; align-items: flex-end; width: 100%; justify-content: center; }
.bar { width: 20px; min-height: 2px; border-radius: 3px 3px 0 0; transition: height 0.4s; }
.bar--count { background: var(--o-brand-primary); }
.bar-label { font-size: 10px; color: var(--o-gray-500); margin-top: 6px; white-space: nowrap; }
.empty-chart { text-align: center; padding: 40px; color: var(--o-gray-400); font-size: 14px; }

/* Table */
.table-wrap { overflow-x: auto; }
.o-table { width: 100%; border-collapse: collapse; }
.o-table th { background: var(--o-gray-50); padding: 8px 12px; text-align: left; font-size: 13px; font-weight: 600; color: var(--o-gray-600); border-bottom: 1px solid var(--o-border-color); }
.o-table td { padding: 8px 12px; font-size: 14px; color: var(--o-gray-700); border-bottom: 1px solid var(--o-border-color-light, #f0f0f0); }
.text-right { text-align: right; }
.font-bold { font-weight: 700; }
.sku-cell { font-family: monospace; font-weight: 600; color: var(--o-brand-primary); }
.empty-row { text-align: center; color: var(--o-gray-400); padding: 24px 12px !important; }

/* Turnover bar */
.turnover-bar-wrap { height: 8px; background: var(--o-gray-200); border-radius: 4px; overflow: hidden; }
.turnover-bar { height: 100%; background: linear-gradient(90deg, #0052A3, #67c23a); border-radius: 4px; transition: width 0.4s; }

@media (max-width: 768px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .kpi-value { font-size: 22px; }
  .report-period-bar { flex-direction: column; align-items: stretch; }
  .bar { width: 12px; }
}
</style>
