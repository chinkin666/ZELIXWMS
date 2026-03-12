<template>
  <div class="right-panel">
    <!-- 统计摘要栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">出荷指示数</span>
        <span class="stat-value">{{ totalCount }}</span>
      </div>
      <div class="stat-item stat-inspected-block">
        <span class="stat-label">検品済</span>
        <span class="stat-value">{{ inspectedCount }}</span>
      </div>
      <div class="stat-item stat-remaining-block">
        <span class="stat-label">残り</span>
        <span class="stat-value">{{ totalCount - inspectedCount }}</span>
      </div>
    </div>

    <!-- 订单表格 -->
    <div class="order-table-section">
      <table ref="orderTableRef" class="o-list-table o-list-table-border" style="width: 100%">
        <thead>
          <tr>
            <th style="width: 60px; text-align: center">No</th>
            <th style="width: 150px">伝票番号</th>
            <th style="width: 120px">配送業者</th>
            <th style="width: 110px">送り状種類</th>
            <th style="min-width: 120px">商品名</th>
            <th style="min-width: 170px">SKU</th>
            <th style="min-width: 220px">検品コード（バーコード）</th>
            <th style="width: 100px; text-align: center">出荷指示数</th>
            <th style="width: 80px; text-align: center">検品数</th>
            <th style="width: 80px; text-align: center">残数</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in tableRows"
            :key="row.orderId"
            :class="getRowClassName(row)"
          >
            <td style="text-align: center">{{ row.no }}</td>
            <td>{{ row.trackingId }}</td>
            <td>{{ row.carrierName }}</td>
            <td>{{ row.invoiceTypeName }}</td>
            <td>{{ row.productName }}</td>
            <td>{{ row.sku }}</td>
            <td>{{ row.barcode }}</td>
            <td style="text-align: center">1</td>
            <td style="text-align: center">{{ row.isInspected ? 1 : 0 }}</td>
            <td style="text-align: center">{{ row.isInspected ? 0 : 1 }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import type { OrderDocument } from '@/types/order'

interface TableRow {
  no: number
  orderId: string
  trackingId: string
  carrierName: string
  invoiceTypeName: string
  productName: string
  sku: string
  barcode: string
  isInspected: boolean
  order: OrderDocument
}

const props = defineProps<{
  tableRows: TableRow[]
  totalCount: number
  inspectedCount: number
  currentMatchedOrderId: string | null
}>()

const orderTableRef = ref<HTMLTableElement | null>(null)

function getRowClassName(row: TableRow): string {
  if (row.isInspected) return 'row-inspected'
  if (row.orderId === props.currentMatchedOrderId) return 'row-active'
  return ''
}

function scrollToRow(index: number) {
  nextTick(() => {
    const tableEl = orderTableRef.value
    if (!tableEl) return
    const rows = tableEl.querySelectorAll('tbody tr')
    if (rows[index]) {
      rows[index].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

defineExpose({ scrollToRow })
</script>

<style scoped>
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
}

.stats-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  justify-content: flex-end;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 24px;
  background: #f5f7fa;
  border-radius: 8px;
  min-width: 100px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.stat-inspected-block { background: #81B337; }
.stat-inspected-block .stat-label,
.stat-inspected-block .stat-value { color: #fff; }

.stat-remaining-block { background: #1F3A5F; }
.stat-remaining-block .stat-label,
.stat-remaining-block .stat-value { color: #fff; }

.order-table-section {
  flex: 1;
  overflow: auto;
  max-height: calc(100vh - 200px);
}

.o-list-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
}
.o-list-table-border th,
.o-list-table-border td {
  border: 1px solid #ebeef5;
  padding: 8px 12px;
}
.o-list-table th {
  background: #f5f7fa;
  font-weight: 600;
  color: #606266;
  position: sticky;
  top: 0;
  z-index: 1;
}
.o-list-table td { color: #303133; }

.row-inspected { background-color: #81B337 !important; }
.row-inspected td { color: #fff !important; background-color: #81B337 !important; }
.row-inspected:hover td { background-color: #6f9e2d !important; }

.row-active { background-color: #ecf5ff !important; }
.row-active td { background-color: #ecf5ff !important; }
</style>
