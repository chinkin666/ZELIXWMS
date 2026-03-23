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
      <Table ref="orderTableRef" style="width: 100%">
        <TableHeader>
          <TableRow>
            <TableHead style="width: 60px; text-align: center">No</TableHead>
            <TableHead style="width: 150px">{{ t('wms.inspection.slipNumber', '伝票番号') }}</TableHead>
            <TableHead style="width: 120px">{{ t('wms.inspection.carrierName', '配送業者') }}</TableHead>
            <TableHead style="width: 110px">{{ t('wms.inspection.invoiceType', '送り状種類') }}</TableHead>
            <TableHead style="min-width: 120px">{{ t('wms.inspection.productName', '商品名') }}</TableHead>
            <TableHead style="min-width: 170px">SKU</TableHead>
            <TableHead style="min-width: 220px">{{ t('wms.inspection.inspectionCode', '検品コード（バーコード）') }}</TableHead>
            <TableHead style="width: 100px; text-align: center">{{ t('wms.inspection.shipmentCount', '出荷指示数') }}</TableHead>
            <TableHead style="width: 80px; text-align: center">{{ t('wms.inspection.inspectedQty', '検品数') }}</TableHead>
            <TableHead style="width: 80px; text-align: center">{{ t('wms.inspection.remainingQty', '残数') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="row in tableRows"
            :key="row.orderId"
            :class="getRowClassName(row)"
          >
            <TableCell style="text-align: center">{{ row.no }}</TableCell>
            <TableCell>{{ row.trackingId }}</TableCell>
            <TableCell>{{ row.carrierName }}</TableCell>
            <TableCell>{{ row.invoiceTypeName }}</TableCell>
            <TableCell>{{ row.productName }}</TableCell>
            <TableCell>{{ row.sku }}</TableCell>
            <TableCell>{{ row.barcode }}</TableCell>
            <TableCell style="text-align: center">1</TableCell>
            <TableCell style="text-align: center">{{ row.isInspected ? 1 : 0 }}</TableCell>
            <TableCell style="text-align: center">{{ row.isInspected ? 0 : 1 }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

const orderTableRef = ref<any>(null)

function getRowClassName(row: TableRow): string {
  if (row.isInspected) return 'row-inspected'
  if (row.orderId === props.currentMatchedOrderId) return 'row-active'
  return ''
}

function scrollToRow(index: number) {
  nextTick(() => {
    const tableEl = orderTableRef.value?.$el ?? orderTableRef.value
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


.row-inspected { background-color: #81B337 !important; }
.row-inspected td { color: #fff !important; background-color: #81B337 !important; }
.row-inspected:hover td { background-color: #6f9e2d !important; }

.row-active { background-color: #ecf5ff !important; }
.row-active td { background-color: #ecf5ff !important; }
</style>
