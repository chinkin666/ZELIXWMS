<template>
  <div class="inspection-page">
    <!-- 左侧面板 -->
    <div class="left-panel">
      <div class="left-panel__header">
        <button class="o-btn o-btn-secondary o-btn-sm" @click="handleGoBack">&larr; 戻る</button>
        <h2 class="page-title">1-1検品</h2>
        <button class="o-btn o-btn-danger o-btn-sm" @click="handleClear">クリア</button>
      </div>

      <!-- ピッキング指示No -->
      <div v-if="orderGroupId" class="info-row">
        <span class="info-label">ピッキング指示No</span>
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
            v-model="inputValue"
            type="text"
            class="scan-input"
            :placeholder="mode === 'order' ? '注文をスキャン...' : '商品をスキャン...'"
            @keyup.enter="handleInput"
          />
          <span class="scan-input-icon">&#128269;</span>
        </div>
      </div>

      <!-- 自动印刷开关 -->
      <div class="auto-print-section">
        <label class="o-toggle">
          <input type="checkbox" v-model="autoPrintEnabled" @change="saveAutoPrintSetting" />
          <span class="o-toggle-slider"></span>
          <span class="o-toggle-label">検品完了時 送り状自動出力</span>
        </label>
      </div>

      <!-- 商品画像 -->
      <div class="product-image-section">
        <img
          :src="scannedProductImageSrc"
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
              <span>バーコード: {{ lastScannedProduct.barcodes.join(', ') }}</span>
            </div>
          </div>
        </template>
        <div v-else class="empty-hint">スキャン待ち</div>
      </div>
    </div>

    <!-- 右侧面板 -->
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
        <div class="stat-item stat-orders stat-clickable" @click="openOrderListDialog">
          <span class="stat-label">注文</span>
          <span class="stat-value">{{ processedOrderIds.length }} / {{ totalOrderCount }}</span>
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
                :class="getRowClassName({ row })"
              >
                <td>{{ row.name }}</td>
                <td>{{ row.sku }}</td>
                <td>{{ row.barcodes.join(', ') || '-' }}</td>
                <td style="text-align: center">{{ row.totalQuantity }}</td>
                <td class="col-inspected" style="padding: 0">
                  <div class="cell-inspected" @click.stop="handleCellClick(row)">
                    {{ row.inspectedQuantity }}
                  </div>
                </td>
                <td class="col-remaining" style="padding: 0">
                  <div class="cell-remaining" @click.stop="handleCellClick(row)">
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

    <!-- F-key 操作バー -->
    <div class="fkey-bar">
      <button
        v-for="fk in fKeyDefs"
        :key="fk.key"
        class="fkey-btn"
        :class="{ 'fkey-btn--disabled': !fk.label && !fk.labelOnly }"
        :disabled="!fk.label && !fk.labelOnly"
        @click="fk.action?.()"
      >
        <span class="fkey-btn__key">{{ fk.key }}</span>
        <span class="fkey-btn__label">{{ fk.label || fk.labelOnly || '' }}</span>
      </button>
    </div>

    <!-- 確認取消ダイアログ -->
    <UnconfirmReasonDialog
      v-model="unconfirmDialogVisible"
      :order-number="currentOrder?.orderNumber || ''"
      :show-b2-warning="true"
      :loading="isUnconfirming"
      @confirm="handleUnconfirmConfirm"
    />

    <!-- 送り状種類変更ダイアログ -->
    <ChangeInvoiceTypeDialog
      v-model="changeInvoiceTypeDialogVisible"
      :orders="changeInvoiceTypeOrders"
      :loading="isChangingInvoiceType"
      @confirm="handleChangeInvoiceTypeConfirm"
    />

    <!-- 注文分割ダイアログ -->
    <SplitOrderDialog
      v-model="splitOrderDialogVisible"
      :order="splitOrderTarget"
      :loading="isSplittingOrder"
      @confirm="(splitGroups: any) => handleSplitOrderConfirm({ orderId: String(splitOrderTarget?._id || ''), splitGroups })"
    />

    <!-- 手動印刷確認ダイアログ -->
    <ODialog
      :open="completionDialogVisible"
      title="検品完了"
      size="lg"
      @close="handleCompletionDialogClose"
    >
      <div class="completion-message">
        <p>すべての商品の検品が完了しました。</p>
        <p>出荷管理No: {{ currentOrder?.orderNumber }}</p>
      </div>

      <div class="print-preview-section">
        <div v-if="printRendering" class="rendering">レンダリング中...</div>
        <div v-else-if="printError" class="error">{{ printError }}</div>
        <div v-else-if="currentPdfSource === 'b2-webapi'" class="preview-b2-cloud">
          <div class="b2-cloud-icon">PDF</div>
          <div class="b2-cloud-text">B2 Cloudから取得</div>
          <div class="b2-cloud-tracking">{{ currentOrder?.trackingId }}</div>
        </div>
        <div v-else-if="!printImageUrl" class="placeholder">印刷プレビューを生成中...</div>
        <div v-else class="preview">
          <img :src="printImageUrl" class="preview-img" />
        </div>
      </div>

      <template #footer>
        <button class="o-btn o-btn-secondary" @click="handleCompletionConfirmNoPrint">確認（印刷なし）</button>
        <button
          class="o-btn o-btn-primary"
          :disabled="(currentPdfSource === 'local' && (!printImageUrl || printRendering)) || (currentPdfSource === 'b2-webapi' && !currentOrder?.trackingId)"
          @click="handlePrint"
        >
          印刷
        </button>
      </template>
    </ODialog>

    <!-- 注文一覧ダイアログ -->
    <ODialog
      :open="orderListDialogVisible"
      title="注文一覧"
      size="lg"
      @close="orderListDialogVisible = false"
    >
      <div class="order-list-section">
        <h4>未検品（{{ pendingOrders.length }}件）</h4>
        <div style="max-height: 250px; overflow: auto">
          <table class="o-list-table o-list-table-border" style="width: 100%">
            <thead>
              <tr>
                <th style="width: 200px">出荷管理No</th>
                <th style="min-width: 180px">お客様管理番号</th>
                <th style="width: 160px">伝票番号</th>
                <th style="width: 80px; text-align: center">商品数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pendingOrders" :key="String(row._id)">
                <td>{{ row.orderNumber }}</td>
                <td>{{ row.customerManagementNumber }}</td>
                <td>{{ row.trackingId }}</td>
                <td style="text-align: center">
                  {{ Array.isArray(row.products) ? row.products.reduce((s: number, p: any) => s + (p.quantity || 1), 0) : 0 }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="order-list-section">
        <h4>検品済（{{ processedOrdersData.length }}件）</h4>
        <div style="max-height: 250px; overflow: auto">
          <div v-if="loadingProcessedOrders" style="text-align: center; padding: 16px; color: #909399">読み込み中...</div>
          <table v-else class="o-list-table o-list-table-border" style="width: 100%">
            <thead>
              <tr>
                <th style="width: 200px">出荷管理No</th>
                <th style="min-width: 180px">お客様管理番号</th>
                <th style="width: 160px">伝票番号</th>
                <th style="width: 80px; text-align: center">商品数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in processedOrdersData" :key="String(row._id)">
                <td>{{ row.orderNumber }}</td>
                <td>{{ row.customerManagementNumber }}</td>
                <td>{{ row.trackingId }}</td>
                <td style="text-align: center">
                  {{ Array.isArray(row.products) ? row.products.reduce((s: number, p: any) => s + (p.quantity || 1), 0) : 0 }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <button class="o-btn o-btn-secondary" @click="orderListDialogVisible = false">閉じる</button>
      </template>
    </ODialog>

    <!-- 誤スキャン警告ダイアログ -->
    <ODialog
      :open="wrongScanDialogVisible"
      size="sm"
      @close="wrongScanDialogVisible = false"
    >
      <div class="wrong-scan-content">
        <div class="wrong-scan-icon">!</div>
        <div class="wrong-scan-title">この注文に該当しない商品です</div>
        <div class="wrong-scan-detail">
          スキャン値: <strong>{{ wrongScanValue }}</strong>
        </div>
        <div class="wrong-scan-hint">
          現在の注文（{{ currentOrder?.orderNumber }}）に含まれない商品がスキャンされました。
        </div>
        <button
          class="o-btn o-btn-danger wrong-scan-close-btn"
          @click="wrongScanDialogVisible = false"
        >
          確認して閉じる
        </button>
      </div>
      <template #footer><span></span></template>
    </ODialog>

    <!-- 手動検品数調整ダイアログ -->
    <ODialog
      :open="adjustDialogVisible"
      title="検品数を調整"
      size="sm"
      @close="adjustDialogVisible = false"
    >
      <div v-if="adjustTarget" class="adjust-dialog-content">
        <p>{{ adjustTarget.name }}</p>
        <input
          ref="adjustInputRef"
          v-model.number="adjustValue"
          type="number"
          class="o-input"
          :min="0"
          :max="adjustTarget.totalQuantity"
          style="width: 120px"
        />
        <span class="adjust-hint"> / {{ adjustTarget.totalQuantity }}</span>
      </div>
      <template #footer>
        <div class="adjust-dialog-footer">
          <span class="adjust-shortcuts">ESC キャンセル / F1 確定</span>
          <div>
            <button class="o-btn o-btn-secondary" @click="adjustDialogVisible = false">キャンセル</button>
            <button class="o-btn o-btn-primary" @click="handleAdjustConfirm">確定</button>
          </div>
        </div>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import UnconfirmReasonDialog from '@/components/dialogs/UnconfirmReasonDialog.vue'
import ChangeInvoiceTypeDialog from '@/components/dialogs/ChangeInvoiceTypeDialog.vue'
import SplitOrderDialog from '@/components/dialogs/SplitOrderDialog.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import type { Product } from '@/types/product'
import type { PrintTemplate } from '@/types/printTemplate'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import { fetchShipmentOrdersByIds, fetchShipmentOrdersPage, fetchShipmentOrder, updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import { fetchProducts } from '@/api/product'
import { fetchPrintTemplates, fetchPrintTemplate } from '@/api/printTemplates'
import { fetchOrderSourceCompanyById } from '@/api/orderSourceCompany'
import { renderTemplateToPngBlob } from '@/utils/print/renderTemplateToPng'
import { printImage } from '@/utils/print/printImage'
import { getPrintConfig } from '@/utils/print/printConfig'
import { yamatoB2Unconfirm, changeInvoiceType, splitOrder as splitOrderApi, isCarrierDeleteError, fetchCarrierAutomationConfig, yamatoB2FetchBatchPdf } from '@/api/carrierAutomation'
import type { SplitOrderRequest, CarrierAutomationConfig } from '@/types/carrierAutomation'
import { isBuiltInCarrierId } from '@/utils/carrier'
import { resolvePrintTemplateId, resolvePdfSource } from '@/utils/print/resolvePrintTemplate'
import { printPdfBlob } from '@/utils/print/printImage'
import noImageSrc from '@/assets/images/no_image.png'
import { getApiBaseUrl } from '@/api/base'

const IMAGE_BASE = getApiBaseUrl().replace(/\/api$/, '')

const router = useRouter()
const route = useRoute()

// ─── Interfaces ───────────────────────────────────────────────────────
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

interface ScannedProductInfo {
  sku: string
  name: string
  barcodes: string[]
  imageUrl?: string
}

// ─── State ────────────────────────────────────────────────────────────

// Page params
const orderGroupId = ref<string | null>(null)

// Order lists
const pendingOrders = ref<OrderDocument[]>([])
const processedOrderIds = ref<string[]>([])
const totalOrderCount = ref(0)

// Current inspection
const currentOrder = ref<OrderDocument | null>(null)
const mode = ref<'order' | 'product'>('order')
const inspectionItems = ref<InspectionItem[]>([])
const lastScannedProduct = ref<ScannedProductInfo | null>(null)

// Input
const inputValue = ref('')
const scanInputRef = ref<HTMLInputElement | null>(null)

// Product cache
const productCache = new Map<string, Product>()

// Carrier cache
const carriers = ref<Carrier[]>([])

// Print templates cache
const printTemplatesCache = ref<PrintTemplate[]>([])

// Carrier automation config cache (for built-in carrier template resolution)
const carrierAutomationConfigCache = ref<CarrierAutomationConfig | null>(null)

// Auto-print
const autoPrintEnabled = ref<boolean>(loadAutoPrintSettingFn())

// Completion dialog
const completionDialogVisible = ref(false)
const printRendering = ref(false)
const printError = ref('')
const printImageUrl = ref('')
const printTemplate = ref<PrintTemplate | null>(null)
const orderSourceCompany = ref<OrderSourceCompany | null>(null)
const currentPdfSource = ref<'local' | 'b2-webapi'>('local')
let lastPrintObjectUrl: string | null = null

// Adjust dialog
const adjustDialogVisible = ref(false)
const adjustTarget = ref<InspectionItem | null>(null)
const adjustValue = ref(0)
const adjustInputRef = ref<HTMLInputElement | null>(null)

// Unconfirm
const unconfirmDialogVisible = ref(false)
const isUnconfirming = ref(false)

// Change invoice type
const changeInvoiceTypeDialogVisible = ref(false)
const changeInvoiceTypeOrders = ref<OrderDocument[]>([])
const isChangingInvoiceType = ref(false)

// Split order
const splitOrderDialogVisible = ref(false)
const splitOrderTarget = ref<OrderDocument | null>(null)
const isSplittingOrder = ref(false)

// Wrong scan warning
const wrongScanDialogVisible = ref(false)
const wrongScanValue = ref('')

// Split order auto-chain queue
const splitOrderQueue = ref<string[]>([])

// Order list dialog
const orderListDialogVisible = ref(false)
const processedOrdersData = ref<OrderDocument[]>([])
const loadingProcessedOrders = ref(false)

// Timers
let autoPrintTimer: number | null = null
let autoReturnTimer: number | null = null

// ─── Order List Dialog ────────────────────────────────────────────────

async function openOrderListDialog() {
  orderListDialogVisible.value = true
  if (processedOrderIds.value.length > 0) {
    loadingProcessedOrders.value = true
    try {
      processedOrdersData.value = await fetchShipmentOrdersByIds<OrderDocument>(processedOrderIds.value)
    } catch (e) {
      console.error('Failed to load processed orders:', e)
      processedOrdersData.value = []
    } finally {
      loadingProcessedOrders.value = false
    }
  } else {
    processedOrdersData.value = []
  }
}

// ─── Computed ─────────────────────────────────────────────────────────

const totalQuantity = computed(() =>
  inspectionItems.value.reduce((sum, item) => sum + item.totalQuantity, 0),
)

const inspectedQuantity = computed(() =>
  inspectionItems.value.reduce((sum, item) => sum + item.inspectedQuantity, 0),
)

const remainingQuantity = computed(() =>
  inspectionItems.value.reduce((sum, item) => sum + item.remainingQuantity, 0),
)

const orderInfoItems = computed(() => {
  const o: any = currentOrder.value || {}
  const hasOrder = !!currentOrder.value
  const carrierHit = hasOrder ? carriers.value.find((c) => c._id === o.carrierId) : null
  const carrierDisplay = carrierHit ? carrierHit.name : (hasOrder ? (o.carrierId || '-') : '')
  return [
    { key: 'orderNumber', label: '出荷管理No', value: hasOrder ? (o.orderNumber || '-') : '' },
    { key: 'customerManagementNumber', label: 'お客様管理番号', value: hasOrder ? (o.customerManagementNumber || '-') : '' },
    { key: 'senderName', label: 'ご依頼主', value: hasOrder ? (o.sender?.name || '-') : '' },
    { key: 'carrier', label: '配送業者', value: carrierDisplay },
    { key: 'invoiceType', label: '送り状種別', value: hasOrder ? (o.invoiceType || '-') : '' },
    { key: 'coolType', label: 'クール区分', value: hasOrder ? formatCoolType(o.coolType) : '' },
    { key: 'trackingId', label: '伝票番号', value: hasOrder ? (o.trackingId || '-') : '' },
  ]
})

// ─── Helper Functions ─────────────────────────────────────────────────

function loadAutoPrintSettingFn(): boolean {
  try {
    const stored = localStorage.getItem('orderItemScan_autoPrintEnabled')
    if (stored === null) return true
    return stored === 'true'
  } catch {
    return true
  }
}

function saveAutoPrintSetting() {
  try {
    localStorage.setItem('orderItemScan_autoPrintEnabled', String(autoPrintEnabled.value))
  } catch (e) {
    console.error('Failed to save auto print setting:', e)
  }
}

function formatCoolType(v: string | undefined): string {
  if (v === '0') return '通常'
  if (v === '1') return 'クール冷凍'
  if (v === '2') return 'クール冷蔵'
  return '-'
}

function resolveImageUrl(url?: string): string {
  if (!url) return noImageSrc
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${IMAGE_BASE}${url}`
}

const scannedProductImageSrc = computed(() => {
  return resolveImageUrl(lastScannedProduct.value?.imageUrl)
})

function focusScanInput() {
  nextTick(() => {
    scanInputRef.value?.focus()
  })
}

// ─── Order Matching ───────────────────────────────────────────────────

function getOrderMatchingValues(order: OrderDocument): string[] {
  const values: string[] = []

  if (order.orderNumber) values.push(order.orderNumber)
  if (order.customerManagementNumber) values.push(order.customerManagementNumber)
  if (order.trackingId) values.push(String(order.trackingId))

  if (Array.isArray(order.products)) {
    for (const prod of order.products) {
      const p = prod as any
      const sku = p.inputSku || p.sku || ''
      if (sku) values.push(sku)
      if (p.productSku && p.productSku !== sku) values.push(p.productSku)

      // Sub-SKUs from cache
      const productData = productCache.get(p.productSku || sku)
      if (productData && Array.isArray(productData.subSkus)) {
        for (const sub of productData.subSkus) {
          if (sub?.subSku && sub.isActive !== false) values.push(sub.subSku)
        }
      }

      // Barcodes
      if (Array.isArray(p.barcode)) {
        for (const bc of p.barcode) {
          if (bc) values.push(String(bc))
        }
      } else {
        const pd = productCache.get(p.productSku || sku)
        if (pd && Array.isArray(pd.barcode)) {
          for (const bc of pd.barcode) {
            if (bc) values.push(String(bc))
          }
        }
      }
    }
  }

  return values
}

// ─── Product Matching ─────────────────────────────────────────────────

function getItemMatchingValues(item: InspectionItem): string[] {
  const values: string[] = []
  if (item.sku) values.push(item.sku)
  if (item.barcodes.length > 0) {
    for (const bc of item.barcodes) {
      if (bc) values.push(bc)
    }
  }
  const pd = item.productData
  if (pd) {
    if (Array.isArray(pd.subSkus)) {
      for (const sub of pd.subSkus) {
        if (sub?.subSku && sub.isActive !== false) values.push(sub.subSku)
      }
    }
    if (Array.isArray(pd.barcode)) {
      for (const bc of pd.barcode) {
        if (bc) values.push(String(bc))
      }
    }
  }
  return values
}

// ─── Initialize Inspection Items ──────────────────────────────────────

function initializeInspectionItems() {
  if (!currentOrder.value) return
  const items: InspectionItem[] = []
  if (Array.isArray(currentOrder.value.products)) {
    currentOrder.value.products.forEach((prod: any, idx: number) => {
      const sku = prod.inputSku || prod.sku || ''
      const pd = productCache.get(sku)
      const barcodes: string[] = []
      if (Array.isArray(prod.barcode)) {
        for (const bc of prod.barcode) { if (bc) barcodes.push(String(bc)) }
      } else if (pd && Array.isArray(pd.barcode)) {
        for (const bc of pd.barcode) { if (bc) barcodes.push(String(bc)) }
      }
      const qty = prod.quantity || 1
      items.push({
        productIndex: idx,
        sku,
        name: prod.productName || prod.name || sku,
        barcodes,
        totalQuantity: qty,
        inspectedQuantity: 0,
        remainingQuantity: qty,
        productData: pd || undefined,
      })
    })
  }
  inspectionItems.value = items
}

// ─── Input Handler ────────────────────────────────────────────────────

function handleInput() {
  const input = inputValue.value.trim()
  if (!input) return
  inputValue.value = ''

  if (mode.value === 'order') {
    handleOrderMatch(input)
  } else {
    handleProductMatch(input)
  }
}

function handleOrderMatch(input: string) {
  if (pendingOrders.value.length === 0) {
    alert('処理待ちの注文がありません')
    return
  }

  let matched: OrderDocument | null = null
  for (const order of pendingOrders.value) {
    const vals = getOrderMatchingValues(order)
    if (vals.includes(input)) {
      matched = order
      break
    }
  }

  if (!matched) {
    alert(`マッチする注文が見つかりません: ${input}`)
    focusScanInput()
    return
  }

  // Set current order and switch to product mode
  currentOrder.value = matched
  mode.value = 'product'
  lastScannedProduct.value = null
  initializeInspectionItems()
  focusScanInput()

  // Try to auto-match a product if the scan was a SKU/barcode
  tryAutoProductMatch(input)
}

function tryAutoProductMatch(input: string) {
  for (const item of inspectionItems.value) {
    if (item.remainingQuantity <= 0) continue
    const vals = getItemMatchingValues(item)
    if (vals.includes(input)) {
      item.inspectedQuantity++
      item.remainingQuantity--
      lastScannedProduct.value = { sku: item.sku, name: item.name, barcodes: item.barcodes, imageUrl: item.productData?.imageUrl }
      checkCompletion()
      return
    }
  }
}

function handleProductMatch(input: string) {
  let matched: InspectionItem | null = null
  for (const item of inspectionItems.value) {
    if (item.remainingQuantity <= 0) continue
    const vals = getItemMatchingValues(item)
    if (vals.includes(input)) {
      matched = item
      break
    }
  }

  if (!matched) {
    // Show prominent warning dialog - scanned something that doesn't belong to this order
    wrongScanValue.value = input
    wrongScanDialogVisible.value = true
    focusScanInput()
    return
  }

  matched.inspectedQuantity++
  matched.remainingQuantity--
  lastScannedProduct.value = { sku: matched.sku, name: matched.name, barcodes: matched.barcodes, imageUrl: matched.productData?.imageUrl }
  focusScanInput()
  checkCompletion()
}

// ─── Completion ───────────────────────────────────────────────────────

function checkCompletion() {
  const allDone = inspectionItems.value.every(item => item.remainingQuantity === 0)
  if (!allDone) return

  // Check if order was already printed
  const alreadyPrinted = !!(currentOrder.value as any)?.status?.printed?.isPrinted

  if (alreadyPrinted) {
    if (confirm('この注文は既に印刷済みです。もう一度印刷しますか？')) {
      // User chose to print again
      if (autoPrintEnabled.value) {
        triggerAutoPrint()
      } else {
        completionDialogVisible.value = true
      }
    } else {
      // User chose not to print - mark inspected only and finish
      markOrderInspectedOnly().then(() => {
        finishCurrentOrder()
      })
    }
    return
  }

  if (autoPrintEnabled.value) {
    triggerAutoPrint()
  } else {
    completionDialogVisible.value = true
  }
}

async function triggerAutoPrint() {
  if (!currentOrder.value) return

  // Check PDF source for this order
  const pdfSource = resolvePdfSource(currentOrder.value.carrierId, currentOrder.value.invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })

  try {
    if (pdfSource === 'b2-webapi') {
      if (!currentOrder.value.trackingId) {
        alert('追跡番号がありません（B2 CloudからPDFを取得できません）')
        completionDialogVisible.value = true
        return
      }
      const pdfBlob = await yamatoB2FetchBatchPdf([currentOrder.value.trackingId])
      await printPdfBlob(pdfBlob, { title: `Print ${currentOrder.value.orderNumber || ''}`.trim(), templateType: 'b2-cloud' })
      const config = getPrintConfig()
      if (config.method === 'local-bridge') {
        alert('印刷ジョブを送信しました')
      } else {
        alert('印刷を開始しました')
      }
      await markOrderCompleted()
      finishCurrentOrder()
    } else {
      await renderPrintPreview()
      if (printImageUrl.value && printTemplate.value && currentOrder.value) {
        await executePrint()
        await markOrderCompleted()
        finishCurrentOrder()
      } else {
        completionDialogVisible.value = true
      }
    }
  } catch (e: any) {
    console.error('Auto print failed:', e)
    alert(`自動印刷に失敗しました: ${e?.message || String(e)}`)
    completionDialogVisible.value = true
  }
}

async function renderPrintPreview() {
  if (!currentOrder.value) {
    printError.value = '注文情報が見つかりません'
    return
  }

  printRendering.value = true
  printError.value = ''
  cleanupPrintImage()

  const pdfSource = resolvePdfSource(currentOrder.value.carrierId, currentOrder.value.invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })
  currentPdfSource.value = pdfSource

  if (pdfSource === 'b2-webapi') {
    if (!currentOrder.value.trackingId) {
      printError.value = '追跡番号がありません（B2 CloudからPDFを取得できません）'
    }
    printRendering.value = false
    return
  }

  try {
    const allTemplates = printTemplatesCache.value
    if (allTemplates.length === 0) {
      printError.value = '印刷テンプレートが読み込まれていません'
      return
    }

    const template = findDefaultTemplate(currentOrder.value, allTemplates)
    if (!template) {
      printError.value = '該当する印刷テンプレートが見つかりません'
      return
    }

    if (currentOrder.value.orderSourceCompanyId) {
      try {
        orderSourceCompany.value = await fetchOrderSourceCompanyById(currentOrder.value.orderSourceCompanyId)
      } catch {
        orderSourceCompany.value = null
      }
    } else {
      orderSourceCompany.value = null
    }

    const fullTemplate = await fetchPrintTemplate(template.id)
    printTemplate.value = fullTemplate

    const [fullOrder] = await fetchShipmentOrdersByIds<OrderDocument>(
      [currentOrder.value._id!],
      { includeRawData: true },
    )
    const orderForPrint = fullOrder || currentOrder.value

    const blob = await renderTemplateToPngBlob(
      fullTemplate,
      orderForPrint,
      { exportDpi: 203, background: 'white' },
      orderSourceCompany.value,
    )

    const url = URL.createObjectURL(blob)
    lastPrintObjectUrl = url
    printImageUrl.value = url
  } catch (e: any) {
    console.error('Print preview render error:', e)
    printError.value = e?.message || String(e)
  } finally {
    printRendering.value = false
  }
}

function findDefaultTemplate(order: OrderDocument, allTemplates: PrintTemplate[]): PrintTemplate | null {
  const carrierId = order?.carrierId
  const invoiceType = order?.invoiceType
  if (!carrierId || !invoiceType) return null

  const templateId = resolvePrintTemplateId(carrierId, invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })

  if (!templateId) return null
  return allTemplates.find((t) => t.id === templateId) || null
}

async function executePrint() {
  if (!printImageUrl.value || !printTemplate.value || !currentOrder.value) return

  await printImage(printImageUrl.value, {
    widthMm: printTemplate.value.canvas.widthMm,
    heightMm: printTemplate.value.canvas.heightMm,
    title: `Print ${currentOrder.value.orderNumber || ''}`.trim(),
  })

  const config = getPrintConfig()
  if (config.method === 'local-bridge') {
    alert('印刷ジョブを送信しました')
  } else {
    alert('印刷を開始しました（印刷ダイアログで100%スケール/余白なしを選択してください）')
  }
}

async function markOrderCompleted() {
  if (!currentOrder.value?._id) return
  const orderId = String(currentOrder.value._id)
  try {
    await Promise.all([
      updateShipmentOrderStatus(orderId, 'mark-printed'),
      updateShipmentOrderStatus(orderId, 'mark-inspected'),
    ])
  } catch (e: any) {
    console.error('Failed to update order status:', e)
    alert(`ステータス更新に失敗しました: ${e?.message || String(e)}`)
  }
}

async function markOrderInspectedOnly() {
  if (!currentOrder.value?._id) return
  const orderId = String(currentOrder.value._id)
  try {
    await updateShipmentOrderStatus(orderId, 'mark-inspected')
  } catch (e: any) {
    console.error('Failed to update order status:', e)
    alert(`ステータス更新に失敗しました: ${e?.message || String(e)}`)
  }
}

function finishCurrentOrder() {
  if (currentOrder.value?._id) {
    const orderId = String(currentOrder.value._id)
    pendingOrders.value = pendingOrders.value.filter(o => String(o._id) !== orderId)
    if (!processedOrderIds.value.includes(orderId)) {
      processedOrderIds.value.push(orderId)
    }
    saveOrdersToStorage()
  }

  cleanupPrintImage()
  completionDialogVisible.value = false
  lastScannedProduct.value = null

  if (splitOrderQueue.value.length > 0) {
    const nextId = splitOrderQueue.value.shift()!
    const nextOrder = pendingOrders.value.find(o => String(o._id) === nextId)
    if (nextOrder) {
      currentOrder.value = nextOrder
      mode.value = 'product'
      initializeInspectionItems()
      alert(`分割注文 ${nextOrder.orderNumber || nextId} に自動移動しました`)
      focusScanInput()
      return
    }
  }

  currentOrder.value = null
  mode.value = 'order'
  inspectionItems.value = []
  focusScanInput()
}

// Manual dialog handlers
async function handlePrint() {
  if (!currentOrder.value) return

  try {
    if (currentPdfSource.value === 'b2-webapi') {
      if (!currentOrder.value.trackingId) {
        alert('追跡番号がありません')
        return
      }
      const pdfBlob = await yamatoB2FetchBatchPdf([currentOrder.value.trackingId])
      await printPdfBlob(pdfBlob, { title: `Print ${currentOrder.value.orderNumber || ''}`.trim(), templateType: 'b2-cloud' })
      const config = getPrintConfig()
      if (config.method === 'local-bridge') {
        alert('印刷ジョブを送信しました')
      } else {
        alert('印刷を開始しました')
      }
    } else {
      await executePrint()
    }
    await markOrderCompleted()
    finishCurrentOrder()
  } catch (e: any) {
    console.error('Print error:', e)
    alert(`印刷に失敗しました: ${e?.message || String(e)}`)
  }
}

async function handleCompletionConfirmNoPrint() {
  await markOrderInspectedOnly()
  finishCurrentOrder()
}

function handleCompletionDialogClose() {
  // Do nothing - user must use footer buttons
}

function cleanupPrintImage() {
  printError.value = ''
  printImageUrl.value = ''
  if (lastPrintObjectUrl) {
    URL.revokeObjectURL(lastPrintObjectUrl)
    lastPrintObjectUrl = null
  }
}

// ─── Row Click → Manual Adjust ───────────────────────────────────────

function getRowClassName({ row }: { row: InspectionItem }) {
  if (row.remainingQuantity === 0) return 'row-completed'
  return ''
}

function handleCellClick(row: InspectionItem) {
  adjustTarget.value = row
  adjustValue.value = row.inspectedQuantity
  adjustDialogVisible.value = true
}

function handleAdjustConfirm() {
  if (!adjustTarget.value) return
  const item = adjustTarget.value
  const newInspected = adjustValue.value
  item.inspectedQuantity = newInspected
  item.remainingQuantity = item.totalQuantity - newInspected
  adjustDialogVisible.value = false
  adjustTarget.value = null
  checkCompletion()
}

// ─── Watch adjust dialog → auto focus ─────────────────────────────────

watch(adjustDialogVisible, (v) => {
  if (v) {
    nextTick(() => {
      adjustInputRef.value?.focus()
      adjustInputRef.value?.select()
    })
  } else {
    focusScanInput()
  }
})

// ─── Watch completion dialog → render preview ────────────────────────

watch(completionDialogVisible, async (v) => {
  if (v) {
    await renderPrintPreview()
  } else {
    cleanupPrintImage()
  }
})

// ─── Unconfirm ────────────────────────────────────────────────────────

function openUnconfirmDialog() {
  unconfirmDialogVisible.value = true
}

function removeCurrentOrderAndReset() {
  if (currentOrder.value?._id) {
    const orderId = String(currentOrder.value._id)
    pendingOrders.value = pendingOrders.value.filter(o => String(o._id) !== orderId)
    processedOrderIds.value = processedOrderIds.value.filter(id => id !== orderId)
    totalOrderCount.value = pendingOrders.value.length + processedOrderIds.value.length
    saveOrdersToStorage()
  }
  currentOrder.value = null
  mode.value = 'order'
  inspectionItems.value = []
  lastScannedProduct.value = null
  focusScanInput()
}

async function handleUnconfirmConfirm(reason: string, skipCarrierDelete = false) {
  if (!currentOrder.value?._id) return

  const orderId = String(currentOrder.value._id)
  const builtIn = isBuiltInCarrierId(currentOrder.value.carrierId)

  isUnconfirming.value = true
  try {
    if (builtIn) {
      const result = await yamatoB2Unconfirm([orderId], reason, { skipCarrierDelete })
      if (result.success) {
        let message = '確認を取り消しました'
        if (result.carrierDeleteSkipped) {
          message += '（B2 Cloud削除スキップ）'
        } else if (result.b2DeleteResult) {
          message += result.b2DeleteResult.success
            ? `（B2 Cloudから${result.b2DeleteResult.deleted}件削除）`
            : `（B2 Cloud削除失敗: ${result.b2DeleteResult.error}）`
        }
        alert(message)
      }
    } else {
      await updateShipmentOrderStatus(orderId, 'unconfirm', 'confirm')
      alert('確認を取り消しました')
    }

    removeCurrentOrderAndReset()
    unconfirmDialogVisible.value = false
  } catch (e: any) {
    if (builtIn && isCarrierDeleteError(e)) {
      isUnconfirming.value = false
      if (confirm(`B2 Cloudからの履歴削除に失敗しました。\n\nエラー: ${e.error}\n\nB2 Cloud削除をスキップして、ローカルのみ更新しますか？`)) {
        await handleUnconfirmConfirm(reason, true)
        return
      }
      return
    }
    alert(e?.message || '確認取消に失敗しました')
    unconfirmDialogVisible.value = false
  } finally {
    isUnconfirming.value = false
  }
}

// ─── Change Invoice Type ──────────────────────────────────────────────

function openChangeInvoiceTypeDialogFn() {
  if (!currentOrder.value) return
  changeInvoiceTypeOrders.value = [currentOrder.value]
  changeInvoiceTypeDialogVisible.value = true
}

async function handleChangeInvoiceTypeConfirm(newInvoiceType: string, skipCarrierDelete = false) {
  if (!currentOrder.value?._id) return

  const orderId = String(currentOrder.value._id)
  const builtIn = isBuiltInCarrierId(currentOrder.value.carrierId)

  isChangingInvoiceType.value = true
  try {
    const result = await changeInvoiceType([orderId], newInvoiceType, { skipCarrierDelete })

    if (result.success) {
      let message = `送り状種類を変更しました（${result.updatedCount}件更新）`
      if (result.resubmittedCount > 0) message += `、${result.resubmittedCount}件をB2 Cloudに再登録`
      if (result.carrierDeleteSkipped) message += '（B2 Cloud削除スキップ）'

      if (builtIn && result.resubmittedCount > 0) {
        alert(message)
        currentOrder.value = await fetchShipmentOrder(orderId)
        initializeInspectionItems()
        changeInvoiceTypeDialogVisible.value = false
        focusScanInput()
        return
      }

      alert(message)
      removeCurrentOrderAndReset()
    } else {
      alert(result.errors?.join(', ') || '送り状種類変更に失敗しました')
    }
    changeInvoiceTypeDialogVisible.value = false
  } catch (e: any) {
    if (builtIn && isCarrierDeleteError(e)) {
      isChangingInvoiceType.value = false
      if (confirm(`B2 Cloudからの履歴削除に失敗しました。\n\nエラー: ${e.error}\n\nB2 Cloud削除をスキップして、ローカルのみ更新しますか？`)) {
        await handleChangeInvoiceTypeConfirm(newInvoiceType, true)
        return
      }
      return
    }
    alert(e?.message || '送り状種類変更に失敗しました')
    changeInvoiceTypeDialogVisible.value = false
  } finally {
    isChangingInvoiceType.value = false
  }
}

// ─── Split Order ──────────────────────────────────────────────────────

function openSplitOrderDialogFn() {
  if (!currentOrder.value) return
  splitOrderTarget.value = currentOrder.value
  splitOrderDialogVisible.value = true
}

async function handleSplitOrderConfirm(request: SplitOrderRequest, skipCarrierDelete = false) {
  const builtIn = isBuiltInCarrierId(currentOrder.value?.carrierId)

  isSplittingOrder.value = true
  try {
    const result = await splitOrderApi({ ...request, skipCarrierDelete })
    if (result.success) {
      let message = `注文を${result.splitOrders.length}件に分割しました`
      if (result.carrierDeleteSkipped) message += '（B2 Cloud削除スキップ）'
      alert(message)

      const originalId = String(currentOrder.value?._id)
      pendingOrders.value = pendingOrders.value.filter(o => String(o._id) !== originalId)

      if (builtIn) {
        const newOrderIds = result.splitOrders.map(so => so.orderId)
        let newOrders: OrderDocument[] = []
        if (newOrderIds.length > 0) {
          newOrders = await fetchShipmentOrdersByIds<OrderDocument>(newOrderIds)
          pendingOrders.value.push(...newOrders)
        }
        totalOrderCount.value = pendingOrders.value.length + processedOrderIds.value.length
        saveOrdersToStorage()

        if (newOrders.length > 0) {
          currentOrder.value = newOrders[0]!
          mode.value = 'product'
          lastScannedProduct.value = null
          initializeInspectionItems()
          splitOrderQueue.value = newOrders.slice(1).map(o => String(o._id))
          focusScanInput()
        } else {
          currentOrder.value = null
          mode.value = 'order'
          inspectionItems.value = []
          lastScannedProduct.value = null
        }
      } else {
        totalOrderCount.value = pendingOrders.value.length + processedOrderIds.value.length
        saveOrdersToStorage()
        currentOrder.value = null
        mode.value = 'order'
        inspectionItems.value = []
        lastScannedProduct.value = null
        focusScanInput()
      }
    } else {
      alert(result.errors?.join(', ') || '注文分割に失敗しました')
    }
    splitOrderDialogVisible.value = false
  } catch (e: any) {
    if (builtIn && isCarrierDeleteError(e)) {
      isSplittingOrder.value = false
      if (confirm(`B2 Cloudからの履歴削除に失敗しました。\n\nエラー: ${e.error}\n\nB2 Cloud削除をスキップして続行しますか？`)) {
        await handleSplitOrderConfirm(request, true)
        return
      }
      return
    }
    alert(e?.message || '注文分割に失敗しました')
    splitOrderDialogVisible.value = false
  } finally {
    isSplittingOrder.value = false
  }
}

// ─── LocalStorage ─────────────────────────────────────────────────────

function saveOrdersToStorage() {
  try {
    const pendingIds = pendingOrders.value.map(o => String(o._id)).filter(Boolean)
    localStorage.setItem('oneByOneSelectedOrderIds', JSON.stringify(pendingIds))
    localStorage.setItem('oneByOneProcessedOrderIds', JSON.stringify(processedOrderIds.value))
  } catch (e) {
    console.error('Failed to save order IDs to storage:', e)
  }
}

async function loadOrdersFromStorage(): Promise<void> {
  try {
    const storedIds = localStorage.getItem('oneByOneSelectedOrderIds')
    const processedStoredIds = localStorage.getItem('oneByOneProcessedOrderIds')

    if (storedIds) {
      const orderIds = JSON.parse(storedIds) as string[]
      if (orderIds.length > 0) {
        pendingOrders.value = await fetchShipmentOrdersByIds<OrderDocument>(orderIds)
      }
    }

    if (processedStoredIds) {
      processedOrderIds.value = JSON.parse(processedStoredIds) as string[]
    }
  } catch (e) {
    console.error('Failed to load orders from storage:', e)
    alert('保存された注文の読み込みに失敗しました')
  }
}

// ─── Navigation ───────────────────────────────────────────────────────

function handleGoBack() {
  router.push('/shipment-operations/tasks')
}

function handleClear() {
  localStorage.removeItem('oneByOneSelectedOrderIds')
  localStorage.removeItem('oneByOneProcessedOrderIds')
  pendingOrders.value = []
  processedOrderIds.value = []
  currentOrder.value = null
  mode.value = 'order'
  inspectionItems.value = []
  lastScannedProduct.value = null
  productCache.clear()
  router.push('/shipment-operations/tasks')
}

// ─── Initialize ───────────────────────────────────────────────────────

onMounted(async () => {
  orderGroupId.value = (route.query.orderGroupId as string) || null

  try {
    await Promise.all([
      fetchCarriers().then((data) => { carriers.value = data }),
      fetchProducts().then((data) => {
        for (const p of data) {
          if (p.sku) productCache.set(p.sku, p)
        }
      }),
      fetchPrintTemplates().then((data) => {
        printTemplatesCache.value = data
      }),
      fetchCarrierAutomationConfig('yamato-b2')
        .then((data) => { carrierAutomationConfigCache.value = data })
        .catch(() => { carrierAutomationConfigCache.value = null }),
    ])
  } catch (e) {
    console.error('Failed to load initial data:', e)
  }

  if (orderGroupId.value) {
    try {
      const q: Record<string, any> = {
        'status.confirm.isConfirmed': { operator: 'is', value: true },
        'status.carrierReceipt.isReceived': { operator: 'is', value: true },
        'status.shipped.isShipped': { operator: 'is', value: false },
        'status.inspected.isInspected': { operator: 'is', value: false },
      }
      if (orderGroupId.value !== '__all__') {
        q['orderGroupId'] = { operator: 'is', value: orderGroupId.value }
      }
      const result = await fetchShipmentOrdersPage<OrderDocument>({
        page: 1,
        limit: 1000,
        q,
      })
      pendingOrders.value = result.items
    } catch (e) {
      console.error('Failed to load orders by group:', e)
      alert('注文の読み込みに失敗しました')
    }
  } else {
    await loadOrdersFromStorage()
  }

  totalOrderCount.value = pendingOrders.value.length + processedOrderIds.value.length

  if (pendingOrders.value.length === 0 && processedOrderIds.value.length === 0) {
    alert('検品対象の注文がありません。一覧ページに戻ります。')
    router.push('/shipment-operations/tasks')
    return
  }

  document.addEventListener('keydown', handleFKeyDown)
  focusScanInput()
})

// ─── F-Key Bar ────────────────────────────────────────────────────────

interface FKeyDef {
  key: string
  code: string
  label: string
  labelOnly?: string
  action?: () => void
}

function fkeyUndoLastScan() {
  if (!lastScannedProduct.value || mode.value !== 'product') return
  const lastSku = lastScannedProduct.value.sku
  const item = inspectionItems.value.find(i => i.sku === lastSku && i.inspectedQuantity > 0)
  if (item) {
    item.inspectedQuantity--
    item.remainingQuantity++
    alert(`${item.name} の検品を1つ取り消しました`)
  }
  lastScannedProduct.value = null
  focusScanInput()
}

function fkeyClearCurrentOrder() {
  if (!currentOrder.value) return
  currentOrder.value = null
  mode.value = 'order'
  inspectionItems.value = []
  lastScannedProduct.value = null
  focusScanInput()
  alert('注文をクリアしました')
}

function fkeyAdjustQuantity() {
  if (!lastScannedProduct.value || mode.value !== 'product') return
  const item = inspectionItems.value.find(i => i.sku === lastScannedProduct.value!.sku)
  if (!item) return
  adjustTarget.value = item
  adjustValue.value = item.inspectedQuantity
  adjustDialogVisible.value = true
}

function fkeySplitOrder() {
  if (!currentOrder.value) return
  openSplitOrderDialogFn()
}

function fkeyUnconfirm() {
  if (!currentOrder.value) return
  openUnconfirmDialog()
}

function fkeyChangeInvoiceType() {
  if (!currentOrder.value) return
  openChangeInvoiceTypeDialogFn()
}

const fKeyDefs: FKeyDef[] = [
  { key: 'ESC', code: 'Escape', label: '戻る', action: handleGoBack },
  { key: 'F1', code: 'F1', label: '直前取消', action: fkeyUndoLastScan },
  { key: 'F2', code: 'F2', label: '注文クリア', action: fkeyClearCurrentOrder },
  { key: 'F3', code: 'F3', label: '' },
  { key: 'F4', code: 'F4', label: '' },
  { key: 'F5', code: 'F5', label: '数量修正', action: fkeyAdjustQuantity },
  { key: 'F6', code: 'F6', label: '注文分割', action: fkeySplitOrder },
  { key: 'F7', code: 'F7', label: '' },
  { key: 'F8', code: 'F8', label: '' },
  { key: 'F9', code: 'F9', label: '確認取消', action: fkeyUnconfirm },
  { key: 'F10', code: 'F10', label: '', labelOnly: '納品書印刷' },
  { key: 'F11', code: 'F11', label: '送り状種類変更', action: fkeyChangeInvoiceType },
  { key: 'F12', code: 'F12', label: '' },
]

function handleFKeyDown(e: KeyboardEvent) {
  if (adjustDialogVisible.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      adjustDialogVisible.value = false
      focusScanInput()
      return
    }
    if (e.key === 'F1') {
      e.preventDefault()
      handleAdjustConfirm()
      return
    }
    return
  }

  const def = fKeyDefs.find(fk => fk.code === e.key)
  if (!def || !def.action) return
  e.preventDefault()
  def.action()
}

onBeforeUnmount(() => {
  if (autoPrintTimer) { clearTimeout(autoPrintTimer); autoPrintTimer = null }
  if (autoReturnTimer) { clearTimeout(autoReturnTimer); autoReturnTimer = null }
  cleanupPrintImage()
  document.removeEventListener('keydown', handleFKeyDown)
})
</script>

<style scoped>
.inspection-page {
  display: flex;
  height: 100%;
  gap: 0;
  position: relative;
  padding-bottom: 56px;
}

/* ─── Left Panel ─────────────────────────── */
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

/* ─── Info Rows ──────────────────────────── */
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

/* ─── Scan Input ─────────────────────────── */
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

/* ─── Auto Print Toggle ──────────────────── */
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

/* ─── Product Image ──────────────────────── */
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

/* ─── Scanned Product Card ───────────────── */
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

/* ─── Right Panel ────────────────────────── */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px;
  overflow-y: auto;
}

/* ─── Stats Bar ──────────────────────────── */
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

/* ─── Order List Dialog ─────────────────── */
.order-list-section { margin-bottom: 16px; }
.order-list-section h4 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #303133; }

/* ─── Product Table ──────────────────────── */
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

/* ─── Table styles ───────────────────────── */
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

/* ─── Inspected / Remaining cell blocks ── */
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

/* ─── Wrong scan warning dialog ──────────── */
.wrong-scan-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.wrong-scan-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #f56c6c;
  color: #fff;
  font-size: 40px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wrong-scan-title { font-size: 22px; font-weight: 700; color: #f56c6c; }
.wrong-scan-detail { font-size: 16px; color: #303133; }
.wrong-scan-hint { font-size: 13px; color: #909399; text-align: center; max-width: 360px; }

.wrong-scan-close-btn {
  width: 240px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
}

/* ─── F-Key Bar ──────────────────────────── */
.fkey-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  height: 44px;
  background: #102040;
  border-top: 1px solid #0a1630;
  z-index: 100;
}

.fkey-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: transparent;
  color: #c8d6e5;
  border: none;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  padding: 2px 0;
  transition: background 0.15s;
  font-family: inherit;
}

.fkey-btn:last-child { border-right: none; }
.fkey-btn:hover:not(.fkey-btn--disabled) { background: rgba(255, 255, 255, 0.1); }
.fkey-btn:active:not(.fkey-btn--disabled) { background: rgba(255, 255, 255, 0.18); }
.fkey-btn--disabled { cursor: default; opacity: 0.3; }
.fkey-btn__key { font-size: 10px; font-weight: 700; color: rgba(255, 255, 255, 0.5); line-height: 1; }

.fkey-btn__label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  padding: 0 4px;
  color: #e0e8f0;
}

/* ─── Completion Dialog ──────────────────── */
.completion-message {
  text-align: center;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 16px;
}

.completion-message p { margin: 6px 0; font-size: 14px; color: #303133; }

.print-preview-section {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  height: 520px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

.print-preview-section .preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.rendering, .placeholder { color: #6b7280; font-size: 14px; }
.error { color: #b91c1c; font-size: 14px; text-align: center; }

.preview-b2-cloud {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  background: #fef9c3;
  border: 2px dashed #ca8a04;
  border-radius: 12px;
}

.b2-cloud-icon {
  font-size: 32px;
  font-weight: bold;
  color: #ca8a04;
  background: white;
  padding: 12px 24px;
  border-radius: 6px;
  border: 2px solid #ca8a04;
}

.b2-cloud-text { color: #854d0e; font-size: 16px; font-weight: 600; }
.b2-cloud-tracking { color: #a16207; font-size: 14px; font-family: monospace; }

/* ─── Adjust Dialog ──────────────────────── */
.adjust-dialog-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.adjust-dialog-content p { width: 100%; margin: 0 0 8px; font-weight: 500; }
.adjust-hint { font-size: 13px; color: #909399; }

.adjust-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.adjust-shortcuts { font-size: 12px; color: #909399; }

/* ─── Button styles ──────────────────────── */
.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  background: #fff;
  color: #606266;
  line-height: 1.5;
  transition: all 0.15s;
  white-space: nowrap;
}
.o-btn:hover { border-color: #409eff; color: #409eff; }
.o-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.o-btn-sm { padding: 4px 10px; font-size: 12px; }

.o-btn-primary { background: #409eff; color: #fff; border-color: #409eff; }
.o-btn-primary:hover { background: #66b1ff; border-color: #66b1ff; }

.o-btn-danger { background: #f56c6c; color: #fff; border-color: #f56c6c; }
.o-btn-danger:hover { background: #f78989; border-color: #f78989; }

.o-btn-secondary { background: #fff; color: #606266; border-color: #dcdfe6; }
.o-btn-secondary:hover { border-color: #409eff; color: #409eff; }

.o-input {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}
.o-input:focus { border-color: #409eff; }
</style>
