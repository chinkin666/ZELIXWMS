<template>
  <div class="product-shipment-stats">
    <ControlPanel :title="'商品別出荷統計'" :show-search="false" />

    <!-- 日付範囲選択 / 日期范围选择 -->
    <div class="stats-filter-bar">
      <label class="stats-label">期間:</label>
      <input v-model="dateFrom" type="date" class="o-input o-input-sm" />
      <span class="stats-separator">〜</span>
      <input v-model="dateTo" type="date" class="o-input o-input-sm" />
      <OButton variant="primary" size="sm" @click="loadStats">集計</OButton>
      <div class="stats-presets">
        <button class="stats-preset-btn" @click="setRange(7)">7日</button>
        <button class="stats-preset-btn" @click="setRange(14)">14日</button>
        <button class="stats-preset-btn" @click="setRange(30)">30日</button>
        <button class="stats-preset-btn" @click="setRange(90)">90日</button>
      </div>
      <OButton variant="secondary" size="sm" @click="exportCsv" :disabled="data.length === 0">
        CSV出力
      </OButton>
    </div>

    <!-- ローディング / 加载中 -->
    <div v-if="loading" class="stats-loading">集計中...</div>

    <!-- エラー / 错误 -->
    <div v-else-if="error" class="stats-error">{{ error }}</div>

    <!-- データなし / 无数据 -->
    <div v-else-if="data.length === 0 && loaded" class="stats-empty">
      該当期間の出荷データがありません
    </div>

    <!-- 統計テーブル / 统计表格 -->
    <div v-else-if="data.length > 0" class="stats-table-wrap">
      <!-- サマリ / 摘要 -->
      <div class="stats-summary">
        <span class="stats-summary-item">
          SKU数: <strong>{{ data.length }}</strong>
        </span>
        <span class="stats-summary-item">
          総出荷数量: <strong>{{ totalQuantity.toLocaleString() }}</strong>
        </span>
        <span class="stats-summary-item">
          総出荷金額: <strong>¥{{ totalAmount.toLocaleString() }}</strong>
        </span>
        <span class="stats-summary-item">
          総注文件数: <strong>{{ totalOrders.toLocaleString() }}</strong>
        </span>
      </div>

      <table class="o-table">
        <thead>
          <tr>
            <th class="text-center">#</th>
            <th>SKU</th>
            <th>入力SKU</th>
            <th>商品名</th>
            <th class="text-right">出荷数量</th>
            <th class="text-right">出荷金額</th>
            <th class="text-right">注文件数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in data" :key="row._id ?? idx">
            <td class="text-center">{{ idx + 1 }}</td>
            <td>{{ row._id ?? '-' }}</td>
            <td>{{ row.inputSku ?? '-' }}</td>
            <td>{{ row.productName ?? '-' }}</td>
            <td class="text-right">{{ row.totalQuantity.toLocaleString() }}</td>
            <td class="text-right">¥{{ row.totalAmount.toLocaleString() }}</td>
            <td class="text-right">{{ row.orderCount.toLocaleString() }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { fetchProductShipmentStats, type ProductShipmentStat } from '@/api/product'

// 状態 / 状态
const data = ref<ProductShipmentStat[]>([])
const loading = ref(false)
const loaded = ref(false)
const error = ref('')

// 日付範囲（デフォルト: 過去30日） / 日期范围（默认：过去30天）
const today = new Date()
const thirtyDaysAgo = new Date(today)
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

const dateFrom = ref(formatDate(thirtyDaysAgo))
const dateTo = ref(formatDate(today))

// サマリ計算 / 摘要计算
const totalQuantity = computed(() => data.value.reduce((sum, r) => sum + r.totalQuantity, 0))
const totalAmount = computed(() => data.value.reduce((sum, r) => sum + r.totalAmount, 0))
const totalOrders = computed(() => data.value.reduce((sum, r) => sum + r.orderCount, 0))

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function setRange(days: number): void {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  dateFrom.value = formatDate(start)
  dateTo.value = formatDate(end)
  loadStats()
}

async function loadStats(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    data.value = await fetchProductShipmentStats({
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
    })
    loaded.value = true
  } catch (e: any) {
    error.value = e.message || '出荷統計の取得に失敗しました'
    data.value = []
  } finally {
    loading.value = false
  }
}

/**
 * CSV出力 / CSV导出
 * BOM付きUTF-8でダウンロード / 带BOM的UTF-8下载
 */
function exportCsv(): void {
  if (data.value.length === 0) return

  const header = ['SKU', '入力SKU', '商品名', '出荷数量', '出荷金額', '注文件数']
  const rows = data.value.map((r) => [
    r._id ?? '',
    r.inputSku ?? '',
    r.productName ?? '',
    String(r.totalQuantity),
    String(r.totalAmount),
    String(r.orderCount),
  ])

  const csvContent = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  // BOM付きUTF-8 / 带BOM的UTF-8
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `商品出荷統計_${dateFrom.value}_${dateTo.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// 初回読み込み / 初始加载
onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.product-shipment-stats {
  padding: 0 16px 24px;
}

.stats-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  flex-wrap: wrap;
}

.stats-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #333);
}

.stats-separator {
  color: var(--text-secondary, #666);
}

.stats-presets {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.stats-preset-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: var(--bg-secondary, #f8f9fa);
  cursor: pointer;
  transition: background 0.15s;
}

.stats-preset-btn:hover {
  background: var(--bg-hover, #e9ecef);
}

.stats-loading,
.stats-error,
.stats-empty {
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.stats-error {
  color: var(--danger, #dc3545);
}

.stats-summary {
  display: flex;
  gap: 24px;
  padding: 12px 0;
  flex-wrap: wrap;
  font-size: 14px;
}

.stats-summary-item {
  color: var(--text-secondary, #666);
}

.stats-summary-item strong {
  color: var(--text-primary, #333);
}

.stats-table-wrap {
  overflow-x: auto;
}

.o-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.o-table th,
.o-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.o-table th {
  background: var(--bg-secondary, #f8f9fa);
  font-weight: 600;
  text-align: left;
  position: sticky;
  top: 0;
}

.o-table tbody tr:hover {
  background: var(--bg-hover, #f5f5f5);
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}
</style>
