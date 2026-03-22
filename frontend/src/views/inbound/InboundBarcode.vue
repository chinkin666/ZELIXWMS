<template>
  <div class="print-page">
    <div class="no-print toolbar">
      <button class="toolbar-btn" @click="handlePrint">{{ t('wms.inbound.print', '印刷') }}</button>
      <button class="toolbar-btn" @click="$router.back()">{{ t('wms.inbound.back', '戻る') }}</button>
      <div class="toolbar-options">
        <label class="toolbar-label">
          <input type="checkbox" v-model="showOrderBarcode" /> {{ t('wms.inbound.orderNumberBarcode', '指示番号バーコード') }}
        </label>
        <label class="toolbar-label">
          <input type="checkbox" v-model="showSkuBarcode" /> {{ t('wms.inbound.skuBarcode', '品番バーコード') }}
        </label>
        <label class="toolbar-label">
          {{ t('wms.inbound.labelSize', 'サイズ') }}:
          <select v-model="labelSize" class="toolbar-select">
            <option value="small">{{ t('wms.inbound.sizeSmall', '小') }}</option>
            <option value="medium">{{ t('wms.inbound.sizeMedium', '中') }}</option>
            <option value="large">{{ t('wms.inbound.sizeLarge', '大') }}</option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="isLoading" class="loading">{{ t('wms.ui.loading', '読み込み中...') }}</div>

    <template v-else-if="order">
      <div class="barcode-grid" :class="`barcode-grid--${labelSize}`">
        <div v-for="line in order.lines" :key="line.lineNumber" class="barcode-label">
          <!-- 指示番号バーコード -->
          <div v-if="showOrderBarcode" class="barcode-section">
            <svg :ref="(el) => registerBarcode(el as SVGElement | null, order!.orderNumber, `order-${line.lineNumber}`)"></svg>
          </div>

          <!-- 品番バーコード -->
          <div v-if="showSkuBarcode" class="barcode-section">
            <svg :ref="(el) => registerBarcode(el as SVGElement | null, line.productSku, `sku-${line.lineNumber}`)"></svg>
          </div>

          <!-- ラベル情報 -->
          <div class="label-info">
            <div class="label-sku">{{ line.productSku }}</div>
            <div class="label-name">{{ line.productName || '' }}</div>
            <div class="label-meta">
              <span>{{ t('wms.inbound.quantity', '数量') }}: {{ line.expectedQuantity }}</span>
              <span v-if="line.lotNumber">LOT: {{ line.lotNumber }}</span>
            </div>
            <div v-if="line.expiryDate" class="label-meta">
              {{ t('wms.inbound.expiryDate', '賞味期限') }}: {{ formatDate(line.expiryDate) }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { fetchInboundOrder } from '@/api/inboundOrder'
import type { InboundOrder } from '@/types/inventory'
// JsBarcode动态导入，减少初始包大小 / JsBarcodeを動的インポートし初期バンドルサイズを削減
const loadJsBarcode = () => import('jsbarcode')

const { t } = useI18n()
const route = useRoute()
const toast = useToast()
const isLoading = ref(true)
const order = ref<InboundOrder | null>(null)
const showOrderBarcode = ref(true)
const showSkuBarcode = ref(true)
const labelSize = ref<'small' | 'medium' | 'large'>('medium')

const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')

const handlePrint = () => window.print()

const pendingBarcodes = new Map<string, { el: SVGElement; value: string }>()

const registerBarcode = (el: SVGElement | null, value: string, key: string) => {
  if (!el) {
    pendingBarcodes.delete(key)
    return
  }
  pendingBarcodes.set(key, { el, value })
  renderBarcode(el, value)
}

const barcodeHeight = () => {
  const map = { small: 30, medium: 40, large: 60 }
  return map[labelSize.value]
}

const barcodeFontSize = () => {
  const map = { small: 10, medium: 12, large: 14 }
  return map[labelSize.value]
}

const renderBarcode = async (el: SVGElement, value: string) => {
  try {
    const JsBarcode = (await loadJsBarcode()).default
    JsBarcode(el, value, {
      format: 'CODE128',
      width: 1.5,
      height: barcodeHeight(),
      displayValue: true,
      fontSize: barcodeFontSize(),
      margin: 2,
      background: '#fff',
      lineColor: '#000',
    })
  } catch {
    // invalid barcode value, ignore
  }
}

const rerenderAll = () => {
  nextTick(() => {
    for (const { el, value } of pendingBarcodes.values()) {
      renderBarcode(el, value)
    }
  })
}

watch([showOrderBarcode, showSkuBarcode, labelSize], () => {
  nextTick(rerenderAll)
})

onMounted(async () => {
  try {
    order.value = await fetchInboundOrder(route.params.id as string)
    await nextTick()
    rerenderAll()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.fetchOrderFailed', '入庫指示の取得に失敗しました'))
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
  background: var(--o-gray-100);
  border-radius: 4px;
  align-items: center;
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: 6px 16px;
  border: 1px solid var(--o-border-color);
  border-radius: 4px;
  background: var(--o-view-background);
  cursor: pointer;
  font-size: 13px;
}

.toolbar-btn:first-child {
  background: #0052A3;
  color: #fff;
  border-color: #0052A3;
}

.toolbar-options {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-left: auto;
}

.toolbar-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
}

.toolbar-select {
  padding: 2px 6px;
  border: 1px solid var(--o-border-color);
  border-radius: 3px;
  font-size: 12px;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--o-gray-500);
}

.barcode-grid {
  display: grid;
  gap: 10px;
  max-width: 210mm;
  margin: 0 auto;
}

.barcode-grid--small {
  grid-template-columns: repeat(3, 1fr);
}

.barcode-grid--medium {
  grid-template-columns: repeat(2, 1fr);
}

.barcode-grid--large {
  grid-template-columns: 1fr;
}

.barcode-label {
  border: 1px solid var(--o-gray-500);
  border-radius: 3px;
  padding: 8px;
  page-break-inside: avoid;
  break-inside: avoid;
}

.barcode-section {
  text-align: center;
  margin-bottom: 4px;
}

.barcode-section svg {
  max-width: 100%;
  height: auto;
}

.label-info {
  text-align: center;
}

.label-sku {
  font-family: monospace;
  font-weight: 700;
  font-size: 13px;
}

.label-name {
  font-size: 11px;
  color: #333;
  margin-bottom: 2px;
}

.label-meta {
  font-size: 10px;
  color: #666;
  display: flex;
  justify-content: center;
  gap: 8px;
}

@media print {
  .no-print { display: none !important; }
  .print-page { padding: 0; }
  .barcode-grid { max-width: none; }
  .barcode-label { border-width: 0.5px; }
}
</style>
