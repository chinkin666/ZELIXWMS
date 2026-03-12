<template>
  <div class="print-page">
    <div class="no-print toolbar">
      <button class="toolbar-btn" @click="handlePrint">印刷</button>
      <button class="toolbar-btn" @click="$router.back()">戻る</button>
    </div>

    <div v-if="isLoading" class="loading">読み込み中...</div>

    <template v-else-if="order">
      <div class="kanban-grid">
        <div v-for="line in order.lines" :key="line.lineNumber" class="kanban-card">
          <!-- カードヘッダー -->
          <div class="card-header">
            <span class="card-order">{{ order.orderNumber }}</span>
            <span class="card-line">行 {{ line.lineNumber }}</span>
          </div>

          <!-- 商品情報 -->
          <div class="card-product">
            <div class="card-sku">{{ line.productSku }}</div>
            <div class="card-name">{{ line.productName || '' }}</div>
          </div>

          <!-- 数量 -->
          <div class="card-qty-row">
            <div class="card-qty-box">
              <div class="card-qty-label">入荷予定数</div>
              <div class="card-qty-value">{{ line.expectedQuantity }}</div>
            </div>
            <div class="card-qty-box card-qty-box--confirm">
              <div class="card-qty-label">確認数</div>
              <div class="card-qty-value">&nbsp;</div>
            </div>
          </div>

          <!-- タリーボックス（正の字記入欄） -->
          <div class="card-tally">
            <div class="tally-label">検数欄</div>
            <div class="tally-area"></div>
          </div>

          <!-- 詳細情報 -->
          <div class="card-details">
            <div class="detail-row">
              <span class="detail-label">在庫区分</span>
              <span class="detail-value">{{ line.stockCategory === 'damaged' ? '仕損' : '新品' }}</span>
            </div>
            <div v-if="order.supplier?.name" class="detail-row">
              <span class="detail-label">仕入先</span>
              <span class="detail-value">{{ order.supplier.name }}</span>
            </div>
            <div v-if="line.lotNumber" class="detail-row">
              <span class="detail-label">ロット</span>
              <span class="detail-value">{{ line.lotNumber }}</span>
            </div>
            <div v-if="line.expiryDate" class="detail-row">
              <span class="detail-label">賞味期限</span>
              <span class="detail-value">{{ formatDate(line.expiryDate) }}</span>
            </div>
            <div v-if="order.expectedDate" class="detail-row">
              <span class="detail-label">入荷予定日</span>
              <span class="detail-value">{{ formatDate(order.expectedDate) }}</span>
            </div>
          </div>

          <!-- メモ -->
          <div v-if="line.memo" class="card-memo">
            <span class="detail-label">メモ:</span> {{ line.memo }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchInboundOrder } from '@/api/inboundOrder'
import type { InboundOrder } from '@/types/inventory'

const route = useRoute()
const isLoading = ref(true)
const order = ref<InboundOrder | null>(null)

const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')

const handlePrint = () => window.print()

onMounted(async () => {
  try {
    order.value = await fetchInboundOrder(route.params.id as string)
  } catch {
    // ignore
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.print-page {
  font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
  font-size: 12px;
  color: #000;
  background: #fff;
  padding: 10px;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.toolbar-btn {
  padding: 6px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

.toolbar-btn:first-child {
  background: #D97756;
  color: #fff;
  border-color: #D97756;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #999;
}

.kanban-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 210mm;
  margin: 0 auto;
}

.kanban-card {
  border: 2px solid #333;
  border-radius: 4px;
  padding: 10px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #999;
  padding-bottom: 6px;
  margin-bottom: 8px;
}

.card-order {
  font-family: monospace;
  font-weight: 700;
  font-size: 11px;
}

.card-line {
  font-size: 10px;
  color: #666;
}

.card-product {
  margin-bottom: 8px;
}

.card-sku {
  font-family: monospace;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 2px;
}

.card-name {
  font-size: 11px;
  color: #333;
}

.card-qty-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.card-qty-box {
  flex: 1;
  border: 1px solid #333;
  text-align: center;
}

.card-qty-box--confirm {
  background: #fffde7;
}

.card-qty-label {
  font-size: 9px;
  font-weight: 600;
  background: #f0f0f0;
  border-bottom: 1px solid #333;
  padding: 2px;
}

.card-qty-value {
  font-size: 18px;
  font-weight: 700;
  padding: 4px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-tally {
  margin-bottom: 8px;
}

.tally-label {
  font-size: 9px;
  font-weight: 600;
  color: #666;
  margin-bottom: 2px;
}

.tally-area {
  border: 1px solid #ccc;
  height: 36px;
  background: #fafafa;
}

.card-details {
  font-size: 10px;
}

.detail-row {
  display: flex;
  gap: 6px;
  margin-bottom: 2px;
}

.detail-label {
  font-weight: 600;
  color: #666;
  white-space: nowrap;
}

.detail-value {
  color: #000;
}

.card-memo {
  font-size: 10px;
  color: #666;
  border-top: 1px dashed #ccc;
  padding-top: 4px;
  margin-top: 4px;
}

@media print {
  .no-print { display: none !important; }
  .print-page { padding: 0; }
  .kanban-grid { max-width: none; }
  .kanban-card { border-width: 1.5px; }
}
</style>
