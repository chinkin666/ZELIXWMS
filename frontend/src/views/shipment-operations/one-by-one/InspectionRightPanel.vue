<template>
  <div class="right-panel">
    <!-- 统计摘要栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">{{ t('wms.inspection.shipmentCount', '出荷指示数') }}</span>
        <span class="stat-value">{{ totalQuantity }}</span>
      </div>
      <div class="stat-item stat-inspected-block">
        <span class="stat-label">{{ t('wms.inspection.inspectedCount', '検品済') }}</span>
        <span class="stat-value">{{ inspectedQuantity }}</span>
      </div>
      <div class="stat-item stat-remaining-block">
        <span class="stat-label">{{ t('wms.inspection.remaining', '残り') }}</span>
        <span class="stat-value">{{ remainingQuantity }}</span>
      </div>
      <div class="stat-item stat-orders stat-clickable" @click="$emit('open-order-list')">
        <span class="stat-label">{{ t('wms.inspection.orders', '注文') }}</span>
        <span class="stat-value">{{ processedCount }} / {{ totalOrderCount }}</span>
      </div>
    </div>

    <!-- 商品表格 -->
    <div class="product-table-section">
      <template v-if="currentOrder">
        <Table style="width: 100%">
          <TableHeader>
            <TableRow>
              <TableHead style="min-width: 180px">{{ t('wms.inspection.productName', '商品名') }}</TableHead>
              <TableHead style="min-width: 140px">SKU</TableHead>
              <TableHead style="min-width: 160px">{{ t('wms.inspection.inspectionCode', '検品コード（バーコード）') }}</TableHead>
              <TableHead style="width: 110px; text-align: center">{{ t('wms.inspection.shipmentCount', '出荷指示数') }}</TableHead>
              <TableHead style="width: 110px; text-align: center" class="col-inspected">{{ t('wms.inspection.inspectedQty', '検品数') }}</TableHead>
              <TableHead style="width: 110px; text-align: center" class="col-remaining">{{ t('wms.inspection.remainingQty', '残数') }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in inspectionItems"
              :key="row.productIndex"
              :class="getRowClassName(row)"
            >
              <TableCell>{{ row.name }}</TableCell>
              <TableCell>{{ row.sku }}</TableCell>
              <TableCell>{{ row.barcodes.join(', ') || '-' }}</TableCell>
              <TableCell style="text-align: center">{{ row.totalQuantity }}</TableCell>
              <TableCell class="col-inspected" style="padding: 0">
                <div class="cell-inspected" @click.stop="$emit('cell-click', row)">
                  {{ row.inspectedQuantity }}
                </div>
              </TableCell>
              <TableCell class="col-remaining" style="padding: 0">
                <div class="cell-remaining" @click.stop="$emit('cell-click', row)">
                  {{ row.remainingQuantity }}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </template>
      <div v-else class="empty-table-hint">
        {{ t('wms.inspection.scanToShowProducts', '注文をスキャンすると商品一覧が表示されます') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { OrderDocument } from '@/types/order'
import type { Product } from '@/types/product'

interface InspectionItem {
  productIndex: number
  sku: string
  name: string
  barcodes: string[]
  totalQuantity: number
  inspectedQuantity: number
  remainingQuantity: number
  productData?: Product
}

const { t } = useI18n()

defineProps<{
  currentOrder: OrderDocument | null
  inspectionItems: InspectionItem[]
  totalQuantity: number
  inspectedQuantity: number
  remainingQuantity: number
  processedCount: number
  totalOrderCount: number
}>()

defineEmits<{
  'open-order-list': []
  'cell-click': [row: InspectionItem]
}>()

function getRowClassName(row: InspectionItem): string {
  if (row.remainingQuantity === 0) return 'row-completed'
  return ''
}
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

.stat-orders { background: #ecf5ff; }
.stat-orders .stat-value { color: #409eff; font-size: 18px; }

.stat-clickable { cursor: pointer; transition: opacity 0.2s; }
.stat-clickable:hover { opacity: 0.8; }

.product-table-section { flex: 1; }

.empty-table-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
  font-size: 14px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
}


.col-inspected, .col-remaining { padding: 0 !important; }

.cell-inspected,
.cell-remaining {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  user-select: none;
  height: 100%;
  min-height: 48px;
}

.cell-inspected { background: #81B337; }
.cell-remaining { background: #1F3A5F; }
.cell-inspected:hover { background: #6f9e2d; }
.cell-remaining:hover { background: #162d4a; }

.row-completed { background-color: #f0f9eb !important; }
.row-completed:hover td { background-color: #e1f3d8 !important; }

/* タブレット / 平板 */
@media (max-width: 1024px) {
  .right-panel {
    padding: 12px;
    overflow-x: auto;
  }

  .stats-bar {
    gap: 8px;
    flex-wrap: wrap;
  }

  .stat-item {
    padding: 8px 16px;
    min-width: 80px;
    flex: 1;
  }

  .stat-value {
    font-size: 20px;
  }

  .product-table-section {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* モバイル / 手机 */
@media (max-width: 768px) {
  .right-panel {
    padding: 8px;
  }

  .stats-bar {
    gap: 6px;
  }

  .stat-item {
    padding: 6px 10px;
    min-width: 60px;
  }

  .stat-label {
    font-size: 10px;
  }

  .stat-value {
    font-size: 18px;
  }

  .cell-inspected,
  .cell-remaining {
    min-height: 44px;
    font-size: 14px;
  }
}
</style>
