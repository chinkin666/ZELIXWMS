<template>
  <div class="right-panel">
    <!-- 统计摘要栏 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">出荷指示数</span>
        <span class="stat-value">{{ totalQuantity }}</span>
      </div>
      <div class="stat-item stat-inspected-block">
        <span class="stat-label">検品済</span>
        <span class="stat-value">{{ inspectedQuantity }}</span>
      </div>
      <div class="stat-item stat-remaining-block">
        <span class="stat-label">残り</span>
        <span class="stat-value">{{ remainingQuantity }}</span>
      </div>
      <div class="stat-item stat-orders stat-clickable" @click="$emit('open-order-list')">
        <span class="stat-label">注文</span>
        <span class="stat-value">{{ processedCount }} / {{ totalOrderCount }}</span>
      </div>
    </div>

    <!-- 商品表格 -->
    <div class="product-table-section">
      <template v-if="currentOrder">
        <table class="o-list-table o-list-table-border" style="width: 100%">
          <thead>
            <tr>
              <th style="min-width: 180px">商品名</th>
              <th style="min-width: 140px">SKU</th>
              <th style="min-width: 160px">検品コード（バーコード）</th>
              <th style="width: 110px; text-align: center">出荷指示数</th>
              <th style="width: 110px; text-align: center" class="col-inspected">検品数</th>
              <th style="width: 110px; text-align: center" class="col-remaining">残数</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in inspectionItems"
              :key="row.productIndex"
              :class="getRowClassName(row)"
            >
              <td>{{ row.name }}</td>
              <td>{{ row.sku }}</td>
              <td>{{ row.barcodes.join(', ') || '-' }}</td>
              <td style="text-align: center">{{ row.totalQuantity }}</td>
              <td class="col-inspected" style="padding: 0">
                <div class="cell-inspected" @click.stop="$emit('cell-click', row)">
                  {{ row.inspectedQuantity }}
                </div>
              </td>
              <td class="col-remaining" style="padding: 0">
                <div class="cell-remaining" @click.stop="$emit('cell-click', row)">
                  {{ row.remainingQuantity }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <div v-else class="empty-table-hint">
        注文をスキャンすると商品一覧が表示されます
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
</style>
