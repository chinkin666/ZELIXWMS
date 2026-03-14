<template>
  <div class="right-panel">
    <!-- 统计摘要栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">{{ t('wms.inspection.shipmentCount', '出荷指示数') }}</span>
        <span class="stat-value">{{ totalCount }}</span>
      </div>
      <div class="stat-item stat-inspected-block">
        <span class="stat-label">{{ t('wms.inspection.inspectedCount', '検品済') }}</span>
        <span class="stat-value">{{ inspectedCount }}</span>
      </div>
      <div class="stat-item stat-remaining-block">
        <span class="stat-label">{{ t('wms.inspection.remaining', '残り') }}</span>
        <span class="stat-value">{{ totalCount - inspectedCount }}</span>
      </div>
    </div>

    <!-- 订单表格 -->
    <div class="order-table-section">
      <table ref="orderTableRef" class="o-list-table o-list-table-border" style="width: 100%">
        <thead>
          <tr>
            <th style="width: 60px; text-align: center">No</th>
            <th style="width: 150px">{{ t('wms.inspection.slipNumber', '伝票番号') }}</th>
            <th style="width: 120px">{{ t('wms.inspection.carrierName', '配送業者') }}</th>
            <th style="width: 110px">{{ t('wms.inspection.invoiceType', '送り状種類') }}</th>
            <th style="min-width: 120px">{{ t('wms.inspection.productName', '商品名') }}</th>
            <th style="min-width: 170px">SKU</th>
            <th style="min-width: 220px">{{ t('wms.inspection.inspectionCode', '検品コード（バーコード）') }}</th>
            <th style="width: 100px; text-align: center">{{ t('wms.inspection.shipmentCount', '出荷指示数') }}</th>
            <th style="width: 80px; text-align: center">{{ t('wms.inspection.inspectedQty', '検品数') }}</th>
            <th style="width: 80px; text-align: center">{{ t('wms.inspection.remainingQty', '残数') }}</th>
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
import { useI18n } from '@/composables/useI18n'
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

const { t } = useI18n()

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

/* .o-list-table base styles are defined globally in style.css */

.row-inspected { background-color: #81B337 !important; }
.row-inspected td { color: #fff !important; background-color: #81B337 !important; }
.row-inspected:hover td { background-color: #6f9e2d !important; }

.row-active { background-color: #ecf5ff !important; }
.row-active td { background-color: #ecf5ff !important; }
</style>
