<template>
  <div class="inspection-page">
    <!-- 左侧面板 -->
    <div class="left-panel">
      <div class="left-panel__header">
        <OButton variant="secondary" size="sm" @click="handleGoBack">&larr; 戻る</OButton>
        <h2 class="page-title">出荷検品</h2>
        <OButton variant="danger" size="sm" @click="handleClear">クリア</OButton>
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
            v-model="inputValue"
            type="text"
            class="scan-input"
            placeholder="商品をスキャン..."
            @keyup.enter="handleScan"
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

      <!-- 大数字（当前匹配行号） -->
      <div class="row-number-display">
        <span class="row-number-value">{{ currentMatchedRowNo ?? '-' }}</span>
      </div>

      <!-- 商品画像 -->
      <div class="product-image-section">
        <img
          :src="currentProductImageSrc"
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

    <!-- 右侧面板 -->
    <div class="right-panel">
      <!-- 统计摘要栏 -->
      <div class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">出荷指示数</span>
          <span class="stat-value">{{ allOrders.length }}</span>
        </div>
        <div class="stat-item stat-inspected-block">
          <span class="stat-label">検品済</span>
          <span class="stat-value">{{ inspectedCount }}</span>
        </div>
        <div class="stat-item stat-remaining-block">
          <span class="stat-label">残り</span>
          <span class="stat-value">{{ allOrders.length - inspectedCount }}</span>
        </div>
      </div>

      <!-- 订单表格 -->
      <div class="order-table-section">
        <table ref="orderTableRef" class="o-list-table o-list-table-border" style="width: 100%">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center">No</th>
              <th style="width: 150px">伝票番号</th>
              <th style="width: 120px">配送業者</th>
              <th style="width: 110px">送り状種類</th>
              <th style="min-width: 120px">商品名</th>
              <th style="min-width: 170px">SKU</th>
              <th style="min-width: 220px">検品コード（バーコード）</th>
              <th style="width: 100px; text-align: center">出荷指示数</th>
              <th style="width: 80px; text-align: center">検品数</th>
              <th style="width: 80px; text-align: center">残数</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in tableRows"
              :key="row.orderId"
              :class="getRowClassName({ row })"
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

    <!-- F-key 操作バー -->
    <div class="fkey-bar">
      <button
        v-for="fk in fKeyDefs"
        :key="fk.key"
        class="fkey-btn"
        :class="{ 'fkey-btn--disabled': !fk.label }"
        :disabled="!fk.label"
        @click="fk.action?.()"
      >
        <span class="fkey-btn__key">{{ fk.key }}</span>
        <span class="fkey-btn__label">{{ fk.label || '' }}</span>
      </button>
    </div>

    <!-- 確認取消ダイアログ -->
    <UnconfirmReasonDialog
      v-model="unconfirmDialogVisible"
      :order-number="currentMatchedOrder?.orderNumber || ''"
      :show-b2-warning="true"
      :loading="isUnconfirming"
      @confirm="handleUnconfirmConfirm"
    />

    <!-- 手動印刷確認ダイアログ -->
    <ODialog
      :open="completionDialogVisible"
      title="検品完了"
      size="lg"
      @close="handleCompletionClose"
    >
      <div class="completion-message">
        <p>検品が完了しました。</p>
        <p>出荷管理No: {{ currentMatchedOrder?.orderNumber }}</p>
      </div>

      <div class="print-preview-section">
        <div v-if="printRendering" class="rendering">レンダリング中...</div>
        <div v-else-if="printError" class="error">{{ printError }}</div>
        <div v-else-if="currentPdfSource === 'b2-webapi'" class="preview-b2-cloud">
          <div class="b2-cloud-icon">PDF</div>
          <div class="b2-cloud-text">B2 Cloudから取得</div>
          <div class="b2-cloud-tracking">{{ currentMatchedOrder?.trackingId }}</div>
        </div>
        <div v-else-if="!printImageUrl" class="placeholder">印刷プレビューを生成中...</div>
        <div v-else class="preview">
          <img :src="printImageUrl" class="preview-img" />
        </div>
      </div>

      <template #footer>
        <OButton variant="secondary" @click="handleCompletionConfirmNoPrint">確認（印刷なし）</OButton>
        <OButton
          variant="primary"
          :disabled="(currentPdfSource === 'local' && (!printImageUrl || printRendering)) || (currentPdfSource === 'b2-webapi' && !currentMatchedOrder?.trackingId)"
          @click="handlePrint"
        >
          印刷
        </OButton>
      </template>
    </ODialog>

    <!-- 誤スキャン警告ダイアログ -->
    <ODialog
      :open="wrongScanDialogVisible"
      size="sm"
      @close="closeWrongScanDialog"
    >
      <div class="wrong-scan-content">
        <div class="wrong-scan-icon">!</div>
        <div class="wrong-scan-title">該当する注文が見つかりません</div>
        <div class="wrong-scan-detail">
          スキャン値: <strong>{{ wrongScanValue }}</strong>
        </div>
        <div class="wrong-scan-hint">
          未検品の注文の中に、このバーコード/SKUに一致する商品が見つかりませんでした。
        </div>
        <OButton
          variant="danger"
          class="wrong-scan-close-btn"
          @click="closeWrongScanDialog"
        >
          確認して閉じる（F1）
        </OButton>
      </div>
      <template #footer><span></span></template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import { useRouter, useRoute } from 'vue-router'
import UnconfirmReasonDialog from '@/components/dialogs/UnconfirmReasonDialog.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import type { Product } from '@/types/product'
import type { PrintTemplate } from '@/types/printTemplate'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import { fetchShipmentOrdersByIds, updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import { fetchProducts } from '@/api/product'
import { fetchPrintTemplates, fetchPrintTemplate } from '@/api/printTemplates'
import { fetchOrderSourceCompanyById } from '@/api/orderSourceCompany'
import { renderTemplateToPngBlob } from '@/utils/print/renderTemplateToPng'
import { printImage } from '@/utils/print/printImage'
import { getPrintConfig } from '@/utils/print/printConfig'
import { yamatoB2Unconfirm, isCarrierDeleteError, fetchCarrierAutomationConfig, yamatoB2FetchBatchPdf } from '@/api/carrierAutomation'
import { isBuiltInCarrierId } from '@/utils/carrier'
import { resolvePrintTemplateId, resolvePdfSource } from '@/utils/print/resolvePrintTemplate'
import { printPdfBlob } from '@/utils/print/printImage'
import type { CarrierAutomationConfig } from '@/types/carrierAutomation'
import noImageSrc from '@/assets/images/no_image.png'
import { getApiBaseUrl } from '@/api/base'

const IMAGE_BASE = getApiBaseUrl().replace(/\/api$/, '')

const router = useRouter()
const route = useRoute()

// ─── Interfaces ───────────────────────────────────────────────────────

interface ProductInfo {
  sku: string
  name: string
  barcodes: string[]
  imageUrl?: string
}

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

// ─── State ────────────────────────────────────────────────────────────

// Page params
const orderGroupId = ref<string | null>(null)

// Orders
const allOrders = ref<OrderDocument[]>([])
const inspectedOrderIds = ref<Set<string>>(new Set())

// Current matched
const currentMatchedOrder = ref<OrderDocument | null>(null)
const currentMatchedRowNo = ref<number | null>(null)
const currentMatchedProduct = ref<ProductInfo | null>(null)

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

// Unconfirm
const unconfirmDialogVisible = ref(false)
const isUnconfirming = ref(false)

// Wrong scan warning
const wrongScanDialogVisible = ref(false)
const wrongScanValue = ref('')

// Table ref
const orderTableRef = ref<HTMLTableElement | null>(null)

// ─── Computed ─────────────────────────────────────────────────────────

const inspectedCount = computed(() => inspectedOrderIds.value.size)

const tableRows = computed<TableRow[]>(() => {
  const rows = allOrders.value.map((order, idx) => {
    const prod = (order.products as any[])?.[0]
    const sku = prod?.inputSku || prod?.productSku || ''
    const pd = productCache.get(sku)
    const barcodes: string[] = Array.isArray(prod?.barcode)
      ? prod.barcode.filter(Boolean).map(String)
      : (pd?.barcode ? pd.barcode.filter(Boolean).map(String) : [])
    const carrierHit = carriers.value.find(c => c._id === order.carrierId)

    return {
      no: idx + 1,
      orderId: String(order._id),
      trackingId: order.trackingId || '-',
      carrierName: carrierHit ? carrierHit.name : (order.carrierId || '-'),
      invoiceTypeName: order.invoiceType || '-',
      productName: prod?.productName || prod?.inputSku || '-',
      sku: sku || '-',
      barcode: barcodes.join(', ') || '-',
      isInspected: inspectedOrderIds.value.has(String(order._id)),
      order,
    }
  })
  // Sort: uninspected first, inspected last (preserve original No within each group)
  rows.sort((a, b) => (a.isInspected ? 1 : 0) - (b.isInspected ? 1 : 0))
  return rows
})

const currentProductImageSrc = computed(() => {
  return resolveImageUrl(currentMatchedProduct.value?.imageUrl)
})

// ─── Helper Functions ─────────────────────────────────────────────────

function loadAutoPrintSettingFn(): boolean {
  try {
    const stored = localStorage.getItem('nByOneAutoPrintEnabled')
    if (stored === null) return true
    return stored === 'true'
  } catch {
    return true
  }
}

function saveAutoPrintSetting() {
  try {
    localStorage.setItem('nByOneAutoPrintEnabled', String(autoPrintEnabled.value))
  } catch (e) {
    console.error('Failed to save auto print setting:', e)
  }
}

function resolveImageUrl(url?: string): string {
  if (!url) return noImageSrc
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${IMAGE_BASE}${url}`
}

function focusScanInput() {
  nextTick(() => {
    scanInputRef.value?.focus()
  })
}

// ─── Product Match Logic ──────────────────────────────────────────────

function getProductMatchValues(prod: any): string[] {
  const values: string[] = []
  const sku = prod.inputSku || prod.productSku || prod.sku || ''
  if (sku) values.push(sku)
  if (prod.productSku && prod.productSku !== sku) values.push(prod.productSku)

  // Sub-SKUs from product cache
  const pd = productCache.get(prod.productSku || sku)
  if (pd?.subSkus) {
    for (const sub of pd.subSkus) {
      if (sub?.subSku && sub.isActive !== false) values.push(sub.subSku)
    }
  }

  // Barcodes from order product data or product cache
  if (Array.isArray(prod.barcode)) {
    for (const bc of prod.barcode) { if (bc) values.push(String(bc)) }
  } else if (pd?.barcode) {
    for (const bc of pd.barcode) { if (bc) values.push(String(bc)) }
  }

  return values
}

// ─── Scan Handler ─────────────────────────────────────────────────────

function handleScan() {
  const input = inputValue.value.trim()
  if (!input) return
  inputValue.value = ''

  // Search across all pending (non-inspected) orders
  let matchedOrder: OrderDocument | null = null
  let matchedRowNo: number | null = null

  for (let i = 0; i < allOrders.value.length; i++) {
    const order = allOrders.value[i]!
    if (inspectedOrderIds.value.has(String(order._id))) continue

    const prod = (order.products as any[])?.[0]
    if (!prod) continue

    const matchValues = getProductMatchValues(prod)
    if (matchValues.includes(input)) {
      matchedOrder = order
      matchedRowNo = i + 1
      break
    }
  }

  if (!matchedOrder) {
    // Show wrong scan dialog
    wrongScanValue.value = input
    wrongScanDialogVisible.value = true
    focusScanInput()
    return
  }

  // Match found
  currentMatchedOrder.value = matchedOrder
  currentMatchedRowNo.value = matchedRowNo

  // Update left panel product info
  const prod = (matchedOrder.products as any[])?.[0]
  const sku = prod?.inputSku || prod?.productSku || ''
  const pd = productCache.get(sku)
  const barcodes: string[] = Array.isArray(prod?.barcode)
    ? prod.barcode.filter(Boolean).map(String)
    : (pd?.barcode ? pd.barcode.filter(Boolean).map(String) : [])

  currentMatchedProduct.value = {
    sku,
    name: prod?.productName || sku,
    barcodes,
    imageUrl: prod?.imageUrl || pd?.imageUrl,
  }

  // Scroll table to matched row
  scrollToRow(matchedRowNo! - 1)

  // Process completion
  handleOrderCompletion(matchedOrder)
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

// ─── Order Completion ─────────────────────────────────────────────────

async function handleOrderCompletion(order: OrderDocument) {
  const alreadyPrinted = !!(order as any)?.status?.printed?.isPrinted

  if (alreadyPrinted) {
    if (confirm('この注文は既に印刷済みです。もう一度印刷しますか？')) {
      // User chose to print
      if (autoPrintEnabled.value) {
        await triggerAutoPrint(order)
      } else {
        completionDialogVisible.value = true
      }
    } else {
      // User chose not to print - mark inspected only
      await markOrderInspectedOnly(order)
      markLocallyInspected(String(order._id))
    }
    return
  }

  if (autoPrintEnabled.value) {
    await triggerAutoPrint(order)
  } else {
    completionDialogVisible.value = true
  }
}

function markLocallyInspected(orderId: string) {
  inspectedOrderIds.value = new Set([...inspectedOrderIds.value, orderId])
  saveProcessedToStorage()
  focusScanInput()
}

async function triggerAutoPrint(order: OrderDocument) {
  // Check PDF source for this order
  const pdfSource = resolvePdfSource(order.carrierId, order.invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })
  currentPdfSource.value = pdfSource

  try {
    if (pdfSource === 'b2-webapi') {
      // Use b2-webapi to fetch PDF directly
      if (!order.trackingId) {
        alert('追跡番号がありません（B2 CloudからPDFを取得できません）')
        completionDialogVisible.value = true
        return
      }
      const pdfBlob = await yamatoB2FetchBatchPdf([order.trackingId])
      await printPdfBlob(pdfBlob, { title: `Print ${order.orderNumber || ''}`.trim(), templateType: 'b2-cloud' })
      const config = getPrintConfig()
      if (config.method === 'local-bridge') {
        alert('印刷ジョブを送信しました')
      } else {
        alert('印刷を開始しました')
      }
      await markOrderCompleted(order)
      markLocallyInspected(String(order._id))
    } else {
      // Use local template rendering
      await renderPrintPreviewForOrder(order)
      if (printImageUrl.value && printTemplate.value) {
        await executePrint(order)
        await markOrderCompleted(order)
        markLocallyInspected(String(order._id))
      } else {
        // Fallback to manual dialog
        completionDialogVisible.value = true
      }
    }
  } catch (e: any) {
    console.error('Auto print failed:', e)
    alert(`自動印刷に失敗しました: ${e?.message || String(e)}`)
    completionDialogVisible.value = true
  }
}

// ─── Print Pipeline ───────────────────────────────────────────────────

async function renderPrintPreviewForOrder(order: OrderDocument) {
  printRendering.value = true
  printError.value = ''
  cleanupPrintImage()

  // Check PDF source
  const pdfSource = resolvePdfSource(order.carrierId, order.invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })
  currentPdfSource.value = pdfSource

  // For b2-webapi, we don't render a local preview - just show placeholder
  if (pdfSource === 'b2-webapi') {
    if (!order.trackingId) {
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

    const template = findDefaultTemplate(order, allTemplates)
    if (!template) {
      printError.value = '該当する印刷テンプレートが見つかりません'
      return
    }

    if (order.orderSourceCompanyId) {
      try {
        orderSourceCompany.value = await fetchOrderSourceCompanyById(order.orderSourceCompanyId)
      } catch {
        orderSourceCompany.value = null
      }
    } else {
      orderSourceCompany.value = null
    }

    const fullTemplate = await fetchPrintTemplate(template.id)
    printTemplate.value = fullTemplate

    // 印刷前获取包含 carrierRawRow 的完整数据
    const [fullOrder] = await fetchShipmentOrdersByIds<OrderDocument>(
      [order._id!],
      { includeRawData: true },
    )
    const orderForPrint = fullOrder || order

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

  // Use the new resolution logic
  const templateId = resolvePrintTemplateId(carrierId, invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })

  if (!templateId) return null

  // Find the template in allTemplates by id
  return allTemplates.find((t) => t.id === templateId) || null
}

async function executePrint(order: OrderDocument) {
  if (!printImageUrl.value || !printTemplate.value) return

  await printImage(printImageUrl.value, {
    widthMm: printTemplate.value.canvas.widthMm,
    heightMm: printTemplate.value.canvas.heightMm,
    title: `Print ${order.orderNumber || ''}`.trim(),
  })

  const config = getPrintConfig()
  if (config.method === 'local-bridge') {
    alert('印刷ジョブを送信しました')
  } else {
    alert('印刷を開始しました（印刷ダイアログで100%スケール/余白なしを選択してください）')
  }
}

async function markOrderCompleted(order: OrderDocument) {
  if (!order?._id) return
  const orderId = String(order._id)
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

async function markOrderInspectedOnly(order: OrderDocument) {
  if (!order?._id) return
  const orderId = String(order._id)
  try {
    await updateShipmentOrderStatus(orderId, 'mark-inspected')
  } catch (e: any) {
    console.error('Failed to update order status:', e)
    alert(`ステータス更新に失敗しました: ${e?.message || String(e)}`)
  }
}

function cleanupPrintImage() {
  printError.value = ''
  printImageUrl.value = ''
  if (lastPrintObjectUrl) {
    URL.revokeObjectURL(lastPrintObjectUrl)
    lastPrintObjectUrl = null
  }
}

// ─── Manual Dialog Handlers ───────────────────────────────────────────

function handleCompletionClose() {
  // Do nothing on close - user must use footer buttons
}

async function handlePrint() {
  if (!currentMatchedOrder.value) return

  try {
    if (currentPdfSource.value === 'b2-webapi') {
      // Fetch and print PDF from b2-webapi
      if (!currentMatchedOrder.value.trackingId) {
        alert('追跡番号がありません')
        return
      }
      const pdfBlob = await yamatoB2FetchBatchPdf([currentMatchedOrder.value.trackingId])
      await printPdfBlob(pdfBlob, { title: `Print ${currentMatchedOrder.value.orderNumber || ''}`.trim(), templateType: 'b2-cloud' })
      const config = getPrintConfig()
      if (config.method === 'local-bridge') {
        alert('印刷ジョブを送信しました')
      } else {
        alert('印刷を開始しました')
      }
    } else {
      await executePrint(currentMatchedOrder.value)
    }
    await markOrderCompleted(currentMatchedOrder.value)
    markLocallyInspected(String(currentMatchedOrder.value._id))
    completionDialogVisible.value = false
  } catch (e: any) {
    console.error('Print error:', e)
    alert(`印刷に失敗しました: ${e?.message || String(e)}`)
  }
}

async function handleCompletionConfirmNoPrint() {
  if (!currentMatchedOrder.value) return
  await markOrderInspectedOnly(currentMatchedOrder.value)
  markLocallyInspected(String(currentMatchedOrder.value._id))
  completionDialogVisible.value = false
}

// ─── Watch completion dialog → render preview ────────────────────────

watch(completionDialogVisible, async (v) => {
  if (v && currentMatchedOrder.value) {
    await renderPrintPreviewForOrder(currentMatchedOrder.value)
  } else {
    cleanupPrintImage()
  }
})

// ─── Row Class Name ──────────────────────────────────────────────────

function getRowClassName({ row }: { row: TableRow }) {
  if (row.isInspected) return 'row-inspected'
  if (row.orderId === String(currentMatchedOrder.value?._id)) return 'row-active'
  return ''
}

// ─── Wrong Scan Dialog ───────────────────────────────────────────────

function closeWrongScanDialog() {
  wrongScanDialogVisible.value = false
  focusScanInput()
}

// ─── Unconfirm ────────────────────────────────────────────────────────

function openUnconfirmDialog() {
  if (!currentMatchedOrder.value) return
  unconfirmDialogVisible.value = true
}

async function handleUnconfirmConfirm(reason: string, skipCarrierDelete = false) {
  if (!currentMatchedOrder.value?._id) return

  const orderId = String(currentMatchedOrder.value._id)
  const builtIn = isBuiltInCarrierId(currentMatchedOrder.value.carrierId)

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

    removeOrderAndReset(orderId)
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

function removeOrderAndReset(orderId: string) {
  allOrders.value = allOrders.value.filter(o => String(o._id) !== orderId)
  const next = new Set(inspectedOrderIds.value)
  next.delete(orderId)
  inspectedOrderIds.value = next
  saveAllToStorage()
  currentMatchedOrder.value = null
  currentMatchedRowNo.value = null
  currentMatchedProduct.value = null
  focusScanInput()
}

// ─── F-Key Undo / Reprint ─────────────────────────────────────────────

function fkeyUndoLastScan() {
  if (!currentMatchedOrder.value) return
  const orderId = String(currentMatchedOrder.value._id)
  if (inspectedOrderIds.value.has(orderId)) {
    const next = new Set(inspectedOrderIds.value)
    next.delete(orderId)
    inspectedOrderIds.value = next
    saveProcessedToStorage()
    alert('直前の検品を取り消しました')
  }
  currentMatchedOrder.value = null
  currentMatchedRowNo.value = null
  currentMatchedProduct.value = null
  focusScanInput()
}

async function fkeyReprint() {
  if (!currentMatchedOrder.value) return
  const orderId = String(currentMatchedOrder.value._id)
  if (!inspectedOrderIds.value.has(orderId)) {
    alert('検品済みの注文を選択してください')
    return
  }

  // Check PDF source
  const pdfSource = resolvePdfSource(currentMatchedOrder.value.carrierId, currentMatchedOrder.value.invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })

  try {
    if (pdfSource === 'b2-webapi') {
      // Reprint from b2-webapi
      if (!currentMatchedOrder.value.trackingId) {
        alert('追跡番号がありません')
        return
      }
      const pdfBlob = await yamatoB2FetchBatchPdf([currentMatchedOrder.value.trackingId])
      await printPdfBlob(pdfBlob, { title: `Print ${currentMatchedOrder.value.orderNumber || ''}`.trim(), templateType: 'b2-cloud' })
      const config = getPrintConfig()
      if (config.method === 'local-bridge') {
        alert('印刷ジョブを送信しました')
      } else {
        alert('印刷を開始しました')
      }
    } else {
      // Reprint using local template
      await renderPrintPreviewForOrder(currentMatchedOrder.value)
      if (printImageUrl.value && printTemplate.value) {
        await executePrint(currentMatchedOrder.value)
      } else {
        alert('印刷プレビューの生成に失敗しました')
      }
    }
  } catch (e: any) {
    alert(`再出力に失敗しました: ${e?.message || String(e)}`)
  }
}

function fkeyUnconfirm() {
  if (!currentMatchedOrder.value) return
  openUnconfirmDialog()
}

// ─── LocalStorage ─────────────────────────────────────────────────────

function saveProcessedToStorage() {
  try {
    localStorage.setItem('nByOneProcessedOrderIds', JSON.stringify([...inspectedOrderIds.value]))
  } catch (e) {
    console.error('Failed to save processed IDs:', e)
  }
}

function saveAllToStorage() {
  try {
    const orderIds = allOrders.value.map(o => String(o._id)).filter(Boolean)
    localStorage.setItem('nByOneSelectedOrderIds', JSON.stringify(orderIds))
    saveProcessedToStorage()
  } catch (e) {
    console.error('Failed to save order data:', e)
  }
}

// ─── Navigation ───────────────────────────────────────────────────────

function handleGoBack() {
  router.push('/shipment-operations/tasks')
}

function handleClear() {
  localStorage.removeItem('nByOneSelectedOrderIds')
  localStorage.removeItem('nByOneProcessedOrderIds')
  allOrders.value = []
  inspectedOrderIds.value = new Set()
  currentMatchedOrder.value = null
  currentMatchedRowNo.value = null
  currentMatchedProduct.value = null
  productCache.clear()
  router.push('/shipment-operations/tasks')
}

// ─── F-Key Bar ────────────────────────────────────────────────────────

interface FKeyDef {
  key: string
  code: string
  label: string
  action?: () => void
}

const fKeyDefs: FKeyDef[] = [
  { key: 'ESC', code: 'Escape', label: '戻る', action: handleGoBack },
  { key: 'F1', code: 'F1', label: '直前取消', action: fkeyUndoLastScan },
  { key: 'F2', code: 'F2', label: '' },
  { key: 'F3', code: 'F3', label: '' },
  { key: 'F4', code: 'F4', label: '' },
  { key: 'F5', code: 'F5', label: '' },
  { key: 'F6', code: 'F6', label: '' },
  { key: 'F7', code: 'F7', label: '再出力', action: fkeyReprint },
  { key: 'F8', code: 'F8', label: '' },
  { key: 'F9', code: 'F9', label: '送り状取消', action: fkeyUnconfirm },
  { key: 'F10', code: 'F10', label: '' },
  { key: 'F11', code: 'F11', label: '' },
  { key: 'F12', code: 'F12', label: '終了', action: handleGoBack },
]

function handleFKeyDown(e: KeyboardEvent) {
  // When wrong scan dialog is open, F1 closes it
  if (wrongScanDialogVisible.value) {
    if (e.key === 'F1') {
      e.preventDefault()
      closeWrongScanDialog()
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      closeWrongScanDialog()
      return
    }
    return
  }

  // When completion dialog is open, block all F-keys
  if (completionDialogVisible.value) return

  const def = fKeyDefs.find(fk => fk.code === e.key)
  if (!def || !def.action) return
  e.preventDefault()
  def.action()
}

// ─── Initialize ───────────────────────────────────────────────────────

onMounted(async () => {
  orderGroupId.value = (route.query.orderGroupId as string) || null

  // Load reference data in parallel
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

  // Load orders from localStorage
  let orderIds: string[] = []
  try {
    const stored = localStorage.getItem('nByOneSelectedOrderIds')
    orderIds = stored ? JSON.parse(stored) : []
  } catch {
    orderIds = []
  }

  if (orderIds.length === 0) {
    alert('検品対象の注文がありません。一覧ページに戻ります。')
    router.push('/shipment-operations/tasks')
    return
  }

  try {
    allOrders.value = await fetchShipmentOrdersByIds<OrderDocument>(orderIds)
  } catch (e) {
    console.error('Failed to load orders:', e)
    alert('注文の読み込みに失敗しました')
    return
  }

  // Restore processed IDs
  try {
    const processedStored = localStorage.getItem('nByOneProcessedOrderIds')
    if (processedStored) {
      inspectedOrderIds.value = new Set(JSON.parse(processedStored))
    }
  } catch { /* ignore */ }

  // Register F-key listener
  document.addEventListener('keydown', handleFKeyDown)

  focusScanInput()
})

onBeforeUnmount(() => {
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

/* ─── Large Row Number ───────────────────── */
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

/* ─── Product Info Card ──────────────────── */
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

/* ─── OK Indicator ───────────────────────── */
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

.stat-inspected-block {
  background: #81B337;
}

.stat-inspected-block .stat-label,
.stat-inspected-block .stat-value {
  color: #fff;
}

.stat-remaining-block {
  background: #1F3A5F;
}

.stat-remaining-block .stat-label,
.stat-remaining-block .stat-value {
  color: #fff;
}

/* ─── Order Table ────────────────────────── */
.order-table-section {
  flex: 1;
  overflow: auto;
  max-height: calc(100vh - 200px);
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
.o-list-table td {
  color: #303133;
}

.row-inspected {
  background-color: #81B337 !important;
}

.row-inspected td {
  color: #fff !important;
  background-color: #81B337 !important;
}

.row-inspected:hover td {
  background-color: #6f9e2d !important;
}

.row-active {
  background-color: #ecf5ff !important;
}

.row-active td {
  background-color: #ecf5ff !important;
}

/* ─── Wrong Scan Warning Dialog ──────────── */
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

.wrong-scan-title {
  font-size: 22px;
  font-weight: 700;
  color: #f56c6c;
}

.wrong-scan-detail {
  font-size: 16px;
  color: #303133;
}

.wrong-scan-hint {
  font-size: 13px;
  color: #909399;
  text-align: center;
  max-width: 360px;
}

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

.fkey-btn:last-child {
  border-right: none;
}

.fkey-btn:hover:not(.fkey-btn--disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.fkey-btn:active:not(.fkey-btn--disabled) {
  background: rgba(255, 255, 255, 0.18);
}

.fkey-btn--disabled {
  cursor: default;
  opacity: 0.3;
}

.fkey-btn__key {
  font-size: 10px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1;
}

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

.completion-message p {
  margin: 6px 0;
  font-size: 14px;
  color: #303133;
}

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

.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.rendering,
.placeholder {
  color: #6b7280;
  font-size: 14px;
}

.error {
  color: #b91c1c;
  font-size: 14px;
  text-align: center;
}

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

.b2-cloud-text {
  color: #854d0e;
  font-size: 16px;
  font-weight: 600;
}

.b2-cloud-tracking {
  color: #a16207;
  font-size: 14px;
  font-family: monospace;
}

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
</style>
