<template>
  <div class="left-panel">
    <div class="left-panel__header">
      <OButton variant="secondary" size="sm" @click="$emit('go-back')">&larr; 戻る</OButton>
      <h2 class="page-title">出荷検品</h2>
      <OButton variant="danger" size="sm" @click="$emit('clear')">クリア</OButton>
    </div>

    <!-- ピッキング指示No -->
    <div v-if="orderGroupId" class="info-row">
      <span class="info-label">ピッキング指示No</span>
      <span class="info-value">{{ orderGroupId }}</span>
    </div>

    <!-- 扫描输入框 -->
    <div class="scan-input-section">
      <div class="scan-input-wrapper">
        <input
          ref="scanInputRef"
          :value="inputValue"
          type="text"
          class="scan-input"
          placeholder="商品をスキャン..."
          @input="$emit('update:inputValue', ($event.target as HTMLInputElement).value)"
          @keyup.enter="$emit('submit')"
        />
        <span class="scan-input-icon">&#128269;</span>
      </div>
    </div>

    <!-- 自动印刷开关 -->
    <div class="auto-print-section">
      <label class="o-toggle">
        <input type="checkbox" :checked="autoPrintEnabled" @change="$emit('toggle-auto-print')" />
        <span class="o-toggle-slider"></span>
        <span class="o-toggle-label">検品完了時 送り状自動出力</span>
      </label>
    </div>

    <!-- 大数字（当前匹配行号） -->
    <div class="row-number-display">
      <span class="row-number-value">{{ currentMatchedRowNo ?? '-' }}</span>
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
    <div class="product-info-section">
      <template v-if="currentMatchedProduct">
        <div class="product-info-card">
          <div class="product-info-row">
            <span class="product-info-label">商品名</span>
            <span class="product-info-value">{{ currentMatchedProduct.name }}</span>
          </div>
          <div class="product-info-row">
            <span class="product-info-label">商品コード(SKU)</span>
            <span class="product-info-value">{{ currentMatchedProduct.sku }}</span>
          </div>
          <div class="product-info-row">
            <span class="product-info-label">検品コード</span>
            <span class="product-info-value">{{ currentMatchedProduct.barcodes.join(', ') || '-' }}</span>
          </div>
        </div>
      </template>
      <div v-else class="empty-hint">スキャン待ち</div>
    </div>

    <!-- OK 表示 -->
    <div v-if="currentMatchedProduct" class="ok-indicator">
      <span class="ok-dot" />
      <span class="ok-text">OK</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import noImageSrc from '@/assets/images/no_image.png'

interface ProductInfo {
  sku: string
  name: string
  barcodes: string[]
  imageUrl?: string
}

defineProps<{
  orderGroupId: string | null
  inputValue: string
  autoPrintEnabled: boolean
  currentMatchedRowNo: number | null
  productImageSrc: string
  currentMatchedProduct: ProductInfo | null
}>()

defineEmits<{
  'go-back': []
  'clear': []
  'update:inputValue': [value: string]
  'submit': []
  'toggle-auto-print': []
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

.row-number-display {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
}

.row-number-value {
  font-size: 96px;
  font-weight: 900;
  color: #2a3474;
  line-height: 1;
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

.product-info-section {
  min-height: 60px;
}

.product-info-card {
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  padding: 12px;
}

.product-info-row {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
}

.product-info-label {
  min-width: 110px;
  color: #606266;
  font-weight: 500;
  flex-shrink: 0;
}

.product-info-value {
  color: #303133;
  word-break: break-all;
}

.ok-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
}

.ok-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #81B337;
}

.ok-text {
  font-size: 18px;
  font-weight: 700;
  color: #81B337;
}
</style>
