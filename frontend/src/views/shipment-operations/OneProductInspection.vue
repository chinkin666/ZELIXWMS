<template>
  <div class="inspection-page">
    <!-- 左侧面板 -->
    <ProductInspectionLeftPanel
      ref="leftPanelRef"
      :order-group-id="orderGroupId"
      :input-value="inputValue"
      :auto-print-enabled="autoPrintEnabled"
      :current-matched-row-no="currentMatchedRowNo"
      :product-image-src="currentProductImageSrc"
      :current-matched-product="currentMatchedProduct"
      @go-back="handleGoBack"
      @clear="handleClear"
      @update:input-value="inputValue = $event"
      @submit="handleScan"
      @toggle-auto-print="toggleAutoPrint"
    />

    <!-- 右侧面板 -->
    <ProductInspectionRightPanel
      ref="rightPanelRef"
      :table-rows="tableRows"
      :total-count="allOrders.length"
      :inspected-count="inspectedCount"
      :current-matched-order-id="currentMatchedOrder ? String(currentMatchedOrder._id) : null"
    />

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
        <div v-if="inspPrint.printRendering.value" class="rendering">レンダリング中...</div>
        <div v-else-if="inspPrint.printError.value" class="error">{{ inspPrint.printError.value }}</div>
        <div v-else-if="inspPrint.currentPdfSource.value === 'b2-webapi'" class="preview-b2-cloud">
          <div class="b2-cloud-icon">PDF</div>
          <div class="b2-cloud-text">B2 Cloudから取得</div>
          <div class="b2-cloud-tracking">{{ currentMatchedOrder?.trackingId }}</div>
        </div>
        <div v-else-if="!inspPrint.printImageUrl.value" class="placeholder">印刷プレビューを生成中...</div>
        <div v-else class="preview">
          <img :src="inspPrint.printImageUrl.value" class="preview-img" />
        </div>
      </div>

      <template #footer>
        <OButton variant="secondary" @click="handleCompletionConfirmNoPrint">確認（印刷なし）</OButton>
        <OButton
          variant="primary"
          :disabled="(inspPrint.currentPdfSource.value === 'local' && (!inspPrint.printImageUrl.value || inspPrint.printRendering.value)) || (inspPrint.currentPdfSource.value === 'b2-webapi' && !currentMatchedOrder?.trackingId)"
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
import ProductInspectionLeftPanel from './one-product/ProductInspectionLeftPanel.vue'
import ProductInspectionRightPanel from './one-product/ProductInspectionRightPanel.vue'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import type { Product } from '@/types/product'
import type { PrintTemplate } from '@/types/printTemplate'
import { fetchShipmentOrdersByIds, updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import { fetchProducts } from '@/api/product'
import { fetchPrintTemplates } from '@/api/printTemplates'
import { yamatoB2Unconfirm, isCarrierDeleteError, fetchCarrierAutomationConfig } from '@/api/carrierAutomation'
import { isBuiltInCarrierId } from '@/utils/carrier'
import { resolvePdfSource } from '@/utils/print/resolvePrintTemplate'
import type { CarrierAutomationConfig } from '@/types/carrierAutomation'
import noImageSrc from '@/assets/images/no_image.png'
import { getApiBaseUrl } from '@/api/base'
import { useAutoPrint } from '@/composables/useAutoPrint'
import { useInspectionPrint } from '@/composables/useInspectionPrint'

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

// ─── Composables ──────────────────────────────────────────────────────
const { autoPrintEnabled, saveAutoPrintSetting } = useAutoPrint('nByOneAutoPrintEnabled')
const inspPrint = useInspectionPrint()

function toggleAutoPrint() {
  autoPrintEnabled.value = !autoPrintEnabled.value
  saveAutoPrintSetting()
}

// ─── State ────────────────────────────────────────────────────────────

const orderGroupId = ref<string | null>(null)
const allOrders = ref<OrderDocument[]>([])
const inspectedOrderIds = ref<Set<string>>(new Set())

const currentMatchedOrder = ref<OrderDocument | null>(null)
const currentMatchedRowNo = ref<number | null>(null)
const currentMatchedProduct = ref<ProductInfo | null>(null)

const inputValue = ref('')
const leftPanelRef = ref<InstanceType<typeof ProductInspectionLeftPanel> | null>(null)
const rightPanelRef = ref<InstanceType<typeof ProductInspectionRightPanel> | null>(null)

const productCache = new Map<string, Product>()
const carriers = ref<Carrier[]>([])
const printTemplatesCache = ref<PrintTemplate[]>([])
const carrierAutomationConfigCache = ref<CarrierAutomationConfig | null>(null)

const completionDialogVisible = ref(false)

const unconfirmDialogVisible = ref(false)
const isUnconfirming = ref(false)

const wrongScanDialogVisible = ref(false)
const wrongScanValue = ref('')

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
  rows.sort((a, b) => (a.isInspected ? 1 : 0) - (b.isInspected ? 1 : 0))
  return rows
})

const currentProductImageSrc = computed(() => {
  return resolveImageUrl(currentMatchedProduct.value?.imageUrl)
})

// ─── Helper Functions ─────────────────────────────────────────────────

function resolveImageUrl(url?: string): string {
  if (!url) return noImageSrc
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${IMAGE_BASE}${url}`
}

function focusScanInput() {
  nextTick(() => {
    leftPanelRef.value?.focus()
  })
}

function getPrintContext() {
  return {
    carriers: carriers.value,
    printTemplatesCache: printTemplatesCache.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  }
}

// ─── Product Match Logic ──────────────────────────────────────────────

function getProductMatchValues(prod: any): string[] {
  const values: string[] = []
  const sku = prod.inputSku || prod.productSku || prod.sku || ''
  if (sku) values.push(sku)
  if (prod.productSku && prod.productSku !== sku) values.push(prod.productSku)

  const pd = productCache.get(prod.productSku || sku)
  if (pd?.subSkus) {
    for (const sub of pd.subSkus) {
      if (sub?.subSku && sub.isActive !== false) values.push(sub.subSku)
    }
  }

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
    wrongScanValue.value = input
    wrongScanDialogVisible.value = true
    focusScanInput()
    return
  }

  currentMatchedOrder.value = matchedOrder
  currentMatchedRowNo.value = matchedRowNo

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

  rightPanelRef.value?.scrollToRow(matchedRowNo! - 1)
  handleOrderCompletion(matchedOrder)
}

// ─── Order Completion ─────────────────────────────────────────────────

async function handleOrderCompletion(order: OrderDocument) {
  const alreadyPrinted = !!(order as any)?.status?.printed?.isPrinted

  if (alreadyPrinted) {
    if (confirm('この注文は既に印刷済みです。もう一度印刷しますか？')) {
      if (autoPrintEnabled.value) {
        await triggerAutoPrint(order)
      } else {
        completionDialogVisible.value = true
      }
    } else {
      await inspPrint.markOrderInspectedOnly(order)
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
  const pdfSource = resolvePdfSource(order.carrierId, order.invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })
  inspPrint.currentPdfSource.value = pdfSource

  try {
    if (pdfSource === 'b2-webapi') {
      if (!order.trackingId) {
        alert('追跡番号がありません（B2 CloudからPDFを取得できません）')
        completionDialogVisible.value = true
        return
      }
      await inspPrint.printFromB2WebApi(order)
      await inspPrint.markOrderCompleted(order)
      markLocallyInspected(String(order._id))
    } else {
      await inspPrint.renderPrintPreview(order, getPrintContext())
      if (inspPrint.printImageUrl.value && inspPrint.printTemplate.value) {
        await inspPrint.executePrint(order)
        await inspPrint.markOrderCompleted(order)
        markLocallyInspected(String(order._id))
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

// ─── Manual Dialog Handlers ───────────────────────────────────────────

function handleCompletionClose() {
  // Do nothing on close - user must use footer buttons
}

async function handlePrint() {
  if (!currentMatchedOrder.value) return

  try {
    if (inspPrint.currentPdfSource.value === 'b2-webapi') {
      await inspPrint.printFromB2WebApi(currentMatchedOrder.value)
    } else {
      await inspPrint.executePrint(currentMatchedOrder.value)
    }
    await inspPrint.markOrderCompleted(currentMatchedOrder.value)
    markLocallyInspected(String(currentMatchedOrder.value._id))
    completionDialogVisible.value = false
  } catch (e: any) {
    console.error('Print error:', e)
    alert(`印刷に失敗しました: ${e?.message || String(e)}`)
  }
}

async function handleCompletionConfirmNoPrint() {
  if (!currentMatchedOrder.value) return
  await inspPrint.markOrderInspectedOnly(currentMatchedOrder.value)
  markLocallyInspected(String(currentMatchedOrder.value._id))
  completionDialogVisible.value = false
}

// ─── Watch completion dialog → render preview ────────────────────────

watch(completionDialogVisible, async (v) => {
  if (v && currentMatchedOrder.value) {
    await inspPrint.renderPrintPreview(currentMatchedOrder.value, getPrintContext())
  } else {
    inspPrint.cleanupPrintImage()
  }
})

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

  const pdfSource = resolvePdfSource(currentMatchedOrder.value.carrierId, currentMatchedOrder.value.invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })

  try {
    if (pdfSource === 'b2-webapi') {
      await inspPrint.printFromB2WebApi(currentMatchedOrder.value)
    } else {
      await inspPrint.renderPrintPreview(currentMatchedOrder.value, getPrintContext())
      if (inspPrint.printImageUrl.value && inspPrint.printTemplate.value) {
        await inspPrint.executePrint(currentMatchedOrder.value)
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

  if (completionDialogVisible.value) return

  const def = fKeyDefs.find(fk => fk.code === e.key)
  if (!def || !def.action) return
  e.preventDefault()
  def.action()
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

  try {
    const processedStored = localStorage.getItem('nByOneProcessedOrderIds')
    if (processedStored) {
      inspectedOrderIds.value = new Set(JSON.parse(processedStored))
    }
  } catch { /* ignore */ }

  document.addEventListener('keydown', handleFKeyDown)
  focusScanInput()
})

onBeforeUnmount(() => {
  inspPrint.cleanupPrintImage()
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
</style>
