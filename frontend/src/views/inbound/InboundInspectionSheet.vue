<template>
  <div class="print-page">
    <div class="no-print toolbar">
      <button class="toolbar-btn" @click="handlePrint">印刷</button>
      <button class="toolbar-btn" @click="$router.back()">戻る</button>
    </div>

    <div v-if="isLoading" class="loading">読み込み中...</div>

    <template v-else-if="order">
      <div class="sheet">
        <!-- ヘッダー -->
        <div class="sheet-header">
          <div class="sheet-date">{{ formatDate(order.expectedDate || order.createdAt) }} 入荷品</div>
          <h1 class="sheet-title">入荷検品表</h1>
          <div class="sheet-meta">
            <span>入庫指示: {{ order.orderNumber }}</span>
            <span v-if="order.supplier?.name">仕入先: {{ order.supplier.name }}</span>
          </div>
        </div>

        <!-- 検品テーブル -->
        <table class="sheet-table">
          <thead>
            <tr>
              <th style="width:40px;">No</th>
              <th style="width:110px;">品番</th>
              <th style="width:60px;">在庫区分</th>
              <th style="width:70px;">入荷予定数</th>
              <th style="width:70px;">確認数</th>
              <th style="width:80px;">仕入先</th>
              <th>商品名</th>
              <th style="width:80px;">ロット</th>
              <th style="width:80px;">賞味期限</th>
              <th style="width:100px;">メモ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in order.lines" :key="line.lineNumber">
              <td style="text-align:center;">{{ line.lineNumber }}</td>
              <td class="mono">{{ line.productSku }}</td>
              <td style="text-align:center;">{{ line.stockCategory === 'damaged' ? '仕損' : '新品' }}</td>
              <td style="text-align:right;">{{ line.expectedQuantity }}</td>
              <td class="confirm-cell"></td>
              <td>{{ order.supplier?.name || '' }}</td>
              <td>{{ line.productName || '' }}</td>
              <td>{{ line.lotNumber || '' }}</td>
              <td>{{ line.expiryDate ? formatDate(line.expiryDate) : '' }}</td>
              <td>{{ line.memo || '' }}</td>
            </tr>
            <!-- 合計行 -->
            <tr class="total-row">
              <td colspan="3" style="text-align:right;font-weight:700;">合計</td>
              <td style="text-align:right;font-weight:700;">{{ totalExpected }}</td>
              <td class="confirm-cell"></td>
              <td colspan="5"></td>
            </tr>
          </tbody>
        </table>

        <!-- フッター（署名欄） -->
        <div class="sheet-footer">
          <div class="sign-box">
            <div class="sign-label">搬入数</div>
            <div class="sign-value"></div>
          </div>
          <div class="sign-box">
            <div class="sign-label">作業開始</div>
            <div class="sign-value">　/　</div>
          </div>
          <div class="sign-box">
            <div class="sign-label">日付確認</div>
            <div class="sign-value">　/　</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fetchInboundOrder } from '@/api/inboundOrder'
import type { InboundOrder } from '@/types/inventory'

const route = useRoute()
const isLoading = ref(true)
const order = ref<InboundOrder | null>(null)

const totalExpected = computed(() =>
  order.value?.lines.reduce((s, l) => s + l.expectedQuantity, 0) ?? 0,
)

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

.sheet {
  max-width: 210mm;
  margin: 0 auto;
}

.sheet-header {
  text-align: center;
  margin-bottom: 16px;
  border-bottom: 2px solid #000;
  padding-bottom: 8px;
}

.sheet-date {
  font-size: 11px;
  color: #666;
}

.sheet-title {
  font-size: 20px;
  font-weight: 700;
  margin: 4px 0;
}

.sheet-meta {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 11px;
  color: #333;
}

.sheet-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
  font-size: 11px;
}

.sheet-table th,
.sheet-table td {
  border: 1px solid #333;
  padding: 4px 6px;
}

.sheet-table th {
  background: #f0f0f0;
  font-weight: 600;
  text-align: center;
  font-size: 10px;
}

.mono {
  font-family: monospace;
  font-weight: 600;
}

.confirm-cell {
  background: #fffde7;
  min-width: 60px;
}

.total-row {
  background: #f5f5f5;
}

.sheet-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0;
  margin-top: 20px;
}

.sign-box {
  border: 1px solid #333;
  width: 80px;
  text-align: center;
}

.sign-box + .sign-box {
  border-left: none;
}

.sign-label {
  font-size: 9px;
  font-weight: 600;
  background: #f0f0f0;
  border-bottom: 1px solid #333;
  padding: 2px;
}

.sign-value {
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #999;
}

@media print {
  .no-print { display: none !important; }
  .print-page { padding: 0; }
  .sheet { max-width: none; }
}
</style>
