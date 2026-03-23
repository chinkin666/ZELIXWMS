<template>
  <div class="product-shipment-stats">
    <PageHeader :title="'商品別出荷統計'" :show-search="false" />

    <!-- 日付範囲選択 / 日期范围选择 -->
    <div class="stats-filter-bar">
      <label class="stats-label">期間:</label>
      <input v-model="dateFrom" type="date" class="h-8 text-sm" />
      <span class="stats-separator">〜</span>
      <input v-model="dateTo" type="date" class="h-8 text-sm" />
      <Button variant="default" size="sm" @click="loadStats">集計</Button>
      <div class="stats-presets">
        <Button class="stats-preset-btn" @click="setRange(7)">7日</Button>
        <Button class="stats-preset-btn" @click="setRange(14)">14日</Button>
        <Button class="stats-preset-btn" @click="setRange(30)">30日</Button>
        <Button class="stats-preset-btn" @click="setRange(90)">90日</Button>
      </div>
      <Button variant="outline" size="sm" @click="exportCsv" :disabled="data.length === 0">
        CSV出力
      </Button>
    </div>

    <!-- ローディング / 加载中 -->
    <div v-if="loading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="text-center">#</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>入力SKU</TableHead>
            <TableHead>商品名</TableHead>
            <TableHead class="text-right">出荷数量</TableHead>
            <TableHead class="text-right">出荷金額</TableHead>
            <TableHead class="text-right">注文件数</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(row, idx) in data" :key="row._id ?? idx">
            <TableCell class="text-center">{{ idx + 1 }}</TableCell>
            <TableCell>{{ row._id ?? '-' }}</TableCell>
            <TableCell>{{ row.inputSku ?? '-' }}</TableCell>
            <TableCell>{{ row.productName ?? '-' }}</TableCell>
            <TableCell class="text-right">{{ row.totalQuantity.toLocaleString() }}</TableCell>
            <TableCell class="text-right">¥{{ row.totalAmount.toLocaleString() }}</TableCell>
            <TableCell class="text-right">{{ row.orderCount.toLocaleString() }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { ref, computed, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import PageHeader from '@/components/shared/PageHeader.vue'
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
