<template>
  <div class="shipment-statistics">
    <ControlPanel :title="t('wms.daily.shipmentStats', '出荷統計')" :show-search="false" />

    <!-- 日期范围 / 日付範囲 -->
    <div class="stats-date-range">
      <label class="stats-label">{{ t('wms.daily.period', '期間') }}:</label>
      <input v-model="statsFrom" type="date" class="o-input o-input-sm" />
      <span class="stats-separator">〜</span>
      <input v-model="statsTo" type="date" class="o-input o-input-sm" />
      <OButton variant="primary" size="sm" @click="loadStats">{{ t('wms.daily.aggregate', '集計') }}</OButton>
      <div class="stats-presets">
        <button class="stats-preset-btn" @click="setRange(7)">7日</button>
        <button class="stats-preset-btn" @click="setRange(14)">14日</button>
        <button class="stats-preset-btn" @click="setRange(30)">30日</button>
        <button class="stats-preset-btn" @click="setRange(90)">90日</button>
      </div>
    </div>

    <div v-if="loading" class="stats-loading">{{ t('wms.daily.aggregating', '集計中...') }}</div>

    <template v-else-if="stats">
      <!-- KPI 卡片 / KPI カード -->
      <div class="stats-kpi-grid">
        <div class="stats-kpi">
          <div class="stats-kpi__value">{{ stats.totalShipped.toLocaleString() }}</div>
          <div class="stats-kpi__label">{{ t('wms.daily.shippedCount', '出荷件数') }}</div>
        </div>
        <div class="stats-kpi">
          <div class="stats-kpi__value">{{ stats.totalQuantity.toLocaleString() }}</div>
          <div class="stats-kpi__label">{{ t('wms.daily.shippedQuantity', '出荷個数') }}</div>
        </div>
        <div class="stats-kpi">
          <div class="stats-kpi__value">{{ stats.totalSkus.toLocaleString() }}</div>
          <div class="stats-kpi__label">SKU {{ t('wms.daily.count', '数') }}</div>
        </div>
        <div class="stats-kpi">
          <div class="stats-kpi__value">{{ stats.daily.length }}</div>
          <div class="stats-kpi__label">{{ t('wms.daily.workingDays', '稼働日数') }}</div>
        </div>
        <div class="stats-kpi">
          <div class="stats-kpi__value">{{ avgDaily }}</div>
          <div class="stats-kpi__label">{{ t('wms.daily.dailyAverage', '日平均出荷') }}</div>
        </div>
      </div>

      <!-- 日别趋势 / 日別トレンド -->
      <div class="stats-section" v-if="stats.daily.length > 0">
        <h3 class="stats-section-title">{{ t('wms.daily.dailyTrend', '日別出荷トレンド') }}</h3>
        <div class="stats-chart">
          <div v-for="day in stats.daily" :key="day.date" class="stats-chart-col">
            <div class="stats-chart-bar-wrap">
              <div
                class="stats-chart-bar stats-chart-bar--count"
                :style="{ height: barHeight(day.count, maxCount) }"
                :title="`${day.date}: ${day.count}件`"
              />
            </div>
            <div class="stats-chart-value">{{ day.count }}</div>
            <div class="stats-chart-label">{{ day.date.slice(5) }}</div>
          </div>
        </div>
      </div>

      <!-- 个数趋势 / 個数トレンド -->
      <div class="stats-section" v-if="stats.daily.length > 0">
        <h3 class="stats-section-title">{{ t('wms.daily.quantityTrend', '日別出荷個数') }}</h3>
        <div class="stats-chart">
          <div v-for="day in stats.daily" :key="day.date" class="stats-chart-col">
            <div class="stats-chart-bar-wrap">
              <div
                class="stats-chart-bar stats-chart-bar--qty"
                :style="{ height: barHeight(day.quantity, maxQty) }"
                :title="`${day.date}: ${day.quantity}個`"
              />
            </div>
            <div class="stats-chart-value">{{ day.quantity }}</div>
            <div class="stats-chart-label">{{ day.date.slice(5) }}</div>
          </div>
        </div>
      </div>

      <!-- 配送商分布 / 配送業者分布 -->
      <div class="stats-section" v-if="stats.carriers.length > 0">
        <h3 class="stats-section-title">{{ t('wms.daily.carrierBreakdown', '配送業者別出荷') }}</h3>
        <div class="stats-carrier-list">
          <div v-for="c in stats.carriers" :key="c.carrierId" class="stats-carrier-row">
            <span class="stats-carrier-name">{{ getCarrierName(c.carrierId) }}</span>
            <div class="stats-carrier-bar-wrap">
              <div class="stats-carrier-bar" :style="{ width: barHeight(c.count, maxCarrier) }" />
            </div>
            <span class="stats-carrier-count">{{ c.count }}{{ t('wms.daily.items', '件') }}</span>
            <span class="stats-carrier-pct">{{ stats.totalShipped > 0 ? Math.round(c.count / stats.totalShipped * 100) : 0 }}%</span>
          </div>
        </div>
      </div>

      <!-- 无数据 / データなし -->
      <div v-if="stats.totalShipped === 0" class="stats-empty">
        {{ t('wms.daily.noShipmentData', 'この期間の出荷データがありません') }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchShipmentStats, type ShipmentStatsResult } from '@/api/dashboard'
import { fetchCarriers } from '@/api/carrier'
import type { Carrier } from '@/types/carrier'

const { t } = useI18n()
const toast = useToast()

const loading = ref(false)
const stats = ref<ShipmentStatsResult | null>(null)
const carriers = ref<Carrier[]>([])
const statsFrom = ref(new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10))
const statsTo = ref(new Date().toISOString().slice(0, 10))

const avgDaily = computed(() => {
  if (!stats.value || stats.value.daily.length === 0) return 0
  return Math.round(stats.value.totalShipped / stats.value.daily.length)
})

const maxCount = computed(() => stats.value ? Math.max(1, ...stats.value.daily.map(d => d.count)) : 1)
const maxQty = computed(() => stats.value ? Math.max(1, ...stats.value.daily.map(d => d.quantity)) : 1)
const maxCarrier = computed(() => stats.value ? Math.max(1, ...stats.value.carriers.map(c => c.count)) : 1)

function barHeight(value: number, max: number): string {
  return `${Math.max(4, (value / max) * 100)}%`
}

function setRange(days: number) {
  statsTo.value = new Date().toISOString().slice(0, 10)
  statsFrom.value = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10)
  loadStats()
}

function getCarrierName(id: string): string {
  if (id === '__builtin_yamato_b2__') return 'ヤマト運輸'
  if (id === '__builtin_sagawa__') return '佐川急便'
  const c = carriers.value.find(cr => String(cr._id) === id)
  return c?.name || id || '不明'
}

async function loadStats() {
  loading.value = true
  try {
    stats.value = await fetchShipmentStats(statsFrom.value, statsTo.value)
  } catch (e: any) {
    toast.showError(e?.message || '統計データの取得に失敗しました')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try { carriers.value = await fetchCarriers({ enabled: true }) } catch { /* ignore */ }
  await loadStats()
})
</script>

<style scoped>
.shipment-statistics {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 20px 20px;
  max-width: 1200px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* 日期范围 / 日付範囲 */
.stats-date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.stats-label { font-size: 13px; color: var(--o-gray-600); font-weight: 500; }
.stats-separator { color: var(--o-gray-400); }
.stats-presets { display: flex; gap: 4px; margin-left: 8px; }
.stats-preset-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--o-border-color, #e4e7ed);
  background: var(--o-view-background, #fff);
  color: var(--o-gray-600);
  cursor: pointer;
  transition: all 0.15s;
}
.stats-preset-btn:hover {
  border-color: var(--o-brand-primary, #D97756);
  color: var(--o-brand-primary, #D97756);
}

.stats-loading { text-align: center; padding: 40px; color: var(--o-gray-500); }
.stats-empty { text-align: center; padding: 40px; color: var(--o-gray-400); font-size: 14px; }

/* KPI 卡片 / KPI カード */
.stats-kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}
.stats-kpi {
  text-align: center;
  padding: 18px 12px;
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
}
.stats-kpi__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--o-gray-800, #303133);
}
.stats-kpi__label {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-top: 4px;
}

/* 分区标题 / セクションタイトル */
.stats-section {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  padding: 16px 20px;
}
.stats-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-700, #4a433d);
  margin: 0 0 12px 0;
}

/* 日别图表 / 日別チャート */
.stats-chart {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 140px;
}
.stats-chart-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-width: 0;
}
.stats-chart-bar-wrap {
  flex: 1;
  display: flex;
  align-items: flex-end;
  width: 100%;
  justify-content: center;
}
.stats-chart-bar {
  width: 80%;
  max-width: 28px;
  min-height: 2px;
  transition: height 0.4s ease;
}
.stats-chart-bar--count { background: var(--o-brand-primary, #D97756); }
.stats-chart-bar--qty { background: var(--o-success, #3D8B37); }

.stats-chart-value {
  font-size: 10px;
  color: var(--o-gray-600);
  margin-top: 2px;
  font-weight: 600;
}
.stats-chart-label {
  font-size: 10px;
  color: var(--o-gray-400);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 配送商分布 / 配送業者分布 */
.stats-carrier-list { display: flex; flex-direction: column; gap: 8px; }
.stats-carrier-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.stats-carrier-name {
  min-width: 100px;
  color: var(--o-gray-700);
  white-space: nowrap;
  font-weight: 500;
}
.stats-carrier-bar-wrap {
  flex: 1;
  height: 20px;
  background: var(--o-gray-100, #f5f7fa);
  overflow: hidden;
}
.stats-carrier-bar {
  height: 100%;
  background: var(--o-info, #4A90A4);
  transition: width 0.4s ease;
}
.stats-carrier-count {
  min-width: 50px;
  text-align: right;
  font-weight: 600;
  color: var(--o-gray-700);
}
.stats-carrier-pct {
  min-width: 35px;
  text-align: right;
  color: var(--o-gray-500);
  font-size: 12px;
}

@media (max-width: 768px) {
  .stats-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .stats-chart { height: 100px; }
  .stats-presets { display: none; }
}
</style>
