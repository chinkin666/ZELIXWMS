<template>
  <div class="left-panel">
    <div class="left-panel__header">
      <OButton variant="secondary" size="sm" @click="$emit('go-back')">&larr; {{ t('wms.inspection.back', '戻る') }}</OButton>
      <h2 class="page-title">{{ t('wms.inspection.oneByOneTitle', '1-1検品') }}</h2>
      <OButton variant="danger" size="sm" @click="$emit('clear')">{{ t('wms.inspection.clear', 'クリア') }}</OButton>
    </div>

    <!-- ピッキング指示No -->
    <div v-if="orderGroupId" class="info-row">
      <span class="info-label">{{ t('wms.inspection.pickingNo', 'ピッキング指示No') }}</span>
      <span class="info-value">{{ orderGroupId }}</span>
    </div>

    <!-- 订单信息 -->
    <div class="order-info-section">
      <div v-for="item in orderInfoItems" :key="item.key" class="info-row">
        <span class="info-label">{{ item.label }}</span>
        <span class="info-value">{{ currentOrder ? item.value : '' }}</span>
      </div>
    </div>

    <!-- 扫描输入框 -->
    <div class="scan-input-section">
      <div class="scan-input-wrapper">
        <input
          ref="scanInputRef"
          :value="inputValue"
          type="text"
          class="scan-input"
          :placeholder="mode === 'order' ? t('wms.inspection.scanOrder', '注文をスキャン...') : t('wms.inspection.scanProduct', '商品をスキャン...')"
          @input="$emit('update:inputValue', ($event.target as HTMLInputElement).value)"
          @keyup.enter="$emit('submit')"
        />
        <span class="scan-input-icon">&#128269;</span>
      </div>
    </div>

    <!-- スキャン履歴 / 扫描历史 -->
    <div v-if="scanHistory.length > 0" class="scan-history">
      <div
        v-for="(h, i) in scanHistory"
        :key="i"
        class="scan-history-item"
        :class="{ 'scan-history-item--error': h.result === 'error' }"
      >
        <span class="scan-history-time">{{ h.time }}</span>
        <span class="scan-history-value">{{ h.value }}</span>
        <span class="scan-history-detail">{{ h.detail }}</span>
      </div>
    </div>

    <!-- 自动印刷开关 -->
    <div class="auto-print-section">
      <label class="o-toggle">
        <input type="checkbox" :checked="autoPrintEnabled" @change="$emit('toggle-auto-print')" />
        <span class="o-toggle-slider"></span>
        <span class="o-toggle-label">{{ t('wms.inspection.autoPrintOnComplete', '検品完了時 送り状自動出力') }}</span>
      </label>
    </div>

    <!-- 自動次注文移動開関 / 自动切换下一订单开关 -->
    <div class="auto-print-section">
      <label class="o-toggle">
        <input type="checkbox" :checked="autoAdvanceEnabled" @change="$emit('toggle-auto-advance')" />
        <span class="o-toggle-slider"></span>
        <span class="o-toggle-label">{{ t('wms.inspection.autoAdvanceOnComplete', '検品後 自動で次の注文へ') }}</span>
      </label>
    </div>

    <!-- 商品画像 -->
    <div class="product-image-section">
      <img
        :src="productImageSrc"
        class="product-image"
        @error="(e: Event) => { (e.target as HTMLImageElement).src = noImageSrc }"
      />
    </div>

    <!-- 当前扫描商品信息 -->
    <div class="scanned-product-section">
      <template v-if="lastScannedProduct">
        <div class="scanned-product-card">
          <div class="scanned-product-name">{{ lastScannedProduct.name }}</div>
          <div class="scanned-product-detail">
            <span>SKU: {{ lastScannedProduct.sku }}</span>
          </div>
          <div v-if="lastScannedProduct.barcodes.length > 0" class="scanned-product-detail">
            <span>{{ t('wms.inspection.barcode', 'バーコード') }}: {{ lastScannedProduct.barcodes.join(', ') }}</span>
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">{{ t('wms.inspection.waitingScan', 'スキャン待ち') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import noImageSrc from '@/assets/images/no_image.png'
import type { OrderDocument } from '@/types/order'

interface ScanHistoryEntry {
  time: string
  value: string
  result: 'ok' | 'error'
  detail: string
}

interface ScannedProductInfo {
  sku: string
  name: string
  barcodes: string[]
  imageUrl?: string
}

interface OrderInfoItem {
  key: string
  label: string
  value: string
}

const { t } = useI18n()

const props = defineProps<{
  orderGroupId: string | null
  currentOrder: OrderDocument | null
  orderInfoItems: OrderInfoItem[]
  inputValue: string
  mode: 'order' | 'product'
  autoPrintEnabled: boolean
  autoAdvanceEnabled: boolean
  productImageSrc: string
  lastScannedProduct: ScannedProductInfo | null
  scanHistory: ScanHistoryEntry[]
}>()

defineEmits<{
  'go-back': []
  'clear': []
  'update:inputValue': [value: string]
  'submit': []
  'toggle-auto-print': []
  'toggle-auto-advance': []
}>()

const scanInputRef = ref<HTMLInputElement | null>(null)

function focus() {
  scanInputRef.value?.focus()
}

defineExpose({ focus, scanInputRef })
</script>

<style scoped>
.left-panel {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.left-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #2a3474;
}

.info-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-label {
  min-width: 100px;
  color: #606266;
  font-weight: 500;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
  word-break: break-all;
}

.order-info-section {
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 8px 12px;
  min-height: 60px;
}

.empty-hint {
  color: #909399;
  font-size: 13px;
  text-align: center;
  padding: 16px 0;
}

.scan-input-section {
  padding: 8px 0;
}

.scan-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.scan-input {
  width: 100%;
  font-size: 18px;
  padding: 12px 40px 12px 16px;
  border: 2px solid #e6a23c;
  border-radius: 4px;
  background: #fffef5;
  outline: none;
  box-sizing: border-box;
}

.scan-input:focus {
  border-color: #409eff;
  background: #fff;
}

.scan-input-icon {
  position: absolute;
  right: 12px;
  color: #909399;
  font-size: 16px;
  pointer-events: none;
}

.auto-print-section {
  padding: 8px 0;
  display: flex;
  align-items: center;
}

.o-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}

.o-toggle input { display: none; }

.o-toggle-slider {
  width: 40px;
  height: 20px;
  background: #dcdfe6;
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
  flex-shrink: 0;
}
.o-toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.o-toggle input:checked + .o-toggle-slider {
  background: #409eff;
}
.o-toggle input:checked + .o-toggle-slider::after {
  transform: translateX(20px);
}

.product-image-section {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}

.product-image {
  width: 180px;
  height: 180px;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}

.scanned-product-section {
  min-height: 60px;
}

.scanned-product-card {
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  padding: 12px;
}

.scanned-product-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.scanned-product-detail {
  font-size: 12px;
  color: #606266;
  margin-top: 4px;
}

/* スキャン履歴 / 扫描历史 */
.scan-history { margin-top: 8px; max-height: 120px; overflow-y: auto; }
.scan-history-item { display: flex; gap: 8px; padding: 3px 8px; font-size: 11px; color: #606266; border-left: 3px solid #67c23a; margin-bottom: 2px; }
.scan-history-item--error { border-left-color: #f56c6c; color: #f56c6c; }
.scan-history-time { color: #909399; min-width: 50px; }
.scan-history-value { font-family: monospace; font-weight: 600; min-width: 80px; }
.scan-history-detail { flex: 1; }
</style>
