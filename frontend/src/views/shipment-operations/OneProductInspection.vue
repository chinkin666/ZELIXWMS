<template>
  <div>
    <!-- 検品進捗バー / 检品进度条 -->
    <div class="inspection-progress-bar">
      <div class="progress-info">
        <span>検品進捗: {{ inspectionProgress.done }} / {{ inspectionProgress.total }}</span>
        <span>{{ inspectionProgress.percent }}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: inspectionProgress.percent + '%' }"></div>
      </div>
    </div>
  <div class="inspection-page">
    <!-- 左侧面板 -->
    <ProductInspectionLeftPanel
      ref="leftPanelRef"
      :class="{ 'scan-success-flash': scanSuccessFlash }"
      :order-group-id="orderGroupId"
      :input-value="inputValue"
      :auto-print-enabled="autoPrintEnabled"
      :current-matched-row-no="currentMatchedRowNo"
      :product-image-src="currentProductImageSrc"
      :current-matched-product="currentMatchedProduct"
      :scan-history="scanHistory"
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

    <!-- F-key 操作バー / Fキー操作バー -->
    <div class="fkey-bar">
      <Button
        v-for="fk in fKeyDefs"
        :key="fk.key"
        v-show="!!fk.label"
        :variant="fk.key === 'F9' ? 'destructive' : 'outline'"
        class="fkey-btn"
        :class="{ 'fkey-btn--danger': fk.key === 'F9' }"
        @click="fk.action?.()"
      >
        <span class="fkey-key">{{ fk.key }}</span>
        <span class="fkey-label">{{ fk.label }}</span>
      </Button>
    </div>

    <!-- Unconfirm dialog -->
    <UnconfirmReasonDialog
      v-model="unconfirmDialogVisible"
      :order-number="currentMatchedOrder?.orderNumber || ''"
      :show-b2-warning="true"
      :loading="isUnconfirming"
      @confirm="handleUnconfirmConfirm"
    />

    <!-- Completion dialog -->
    <Dialog :open="completionDialogVisible" @update:open="(v) => { if (!v) handleCompletionClose() }">
      <DialogContent class="sm:max-w-[800px]">
        <DialogHeader><DialogTitle>{{ t('wms.inspection.completionTitle', '検品完了') }}</DialogTitle></DialogHeader>
      <div class="completion-message">
        <p>{{ t('wms.inspection.completionMessage', '検品が完了しました。') }}</p>
        <p>{{ t('wms.inspection.orderNo', '出荷管理No') }}: {{ currentMatchedOrder?.orderNumber }}</p>
      </div>

      <div class="print-preview-section">
        <div v-if="inspPrint.printRendering.value" class="rendering">{{ t('wms.inspection.rendering', 'レンダリング中...') }}</div>
        <div v-else-if="inspPrint.printError.value" class="error">{{ inspPrint.printError.value }}</div>
        <div v-else-if="inspPrint.currentPdfSource.value === 'b2-webapi'" class="preview-b2-cloud">
          <div class="b2-cloud-icon">PDF</div>
          <div class="b2-cloud-text">{{ t('wms.inspection.b2CloudFetch', 'B2 Cloudから取得') }}</div>
          <div class="b2-cloud-tracking">{{ currentMatchedOrder?.trackingId }}</div>
        </div>
        <div v-else-if="!inspPrint.printImageUrl.value" class="placeholder">{{ t('wms.inspection.generatingPreview', '印刷プレビューを生成中...') }}</div>
        <div v-else class="preview">
          <img :src="inspPrint.printImageUrl.value" class="preview-img" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="handleCompletionConfirmNoPrint">{{ t('wms.inspection.confirmNoPrint', '確認（印刷なし）') }}</Button>
        <Button
          variant="default"
          :disabled="(inspPrint.currentPdfSource.value === 'local' && (!inspPrint.printImageUrl.value || inspPrint.printRendering.value)) || (inspPrint.currentPdfSource.value === 'b2-webapi' && !currentMatchedOrder?.trackingId)"
          @click="handlePrint"
        >
          {{ t('wms.inspection.print', '印刷') }}
        </Button>
      </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Wrong scan warning dialog -->
    <Dialog :open="wrongScanDialogVisible" @update:open="(v) => { if (!v) closeWrongScanDialog() }">
      <DialogContent class="sm:max-w-[400px]">
      <div class="wrong-scan-content">
        <div class="wrong-scan-icon">!</div>
        <div class="wrong-scan-title">{{ t('wms.inspection.noMatchingOrder', '該当する注文が見つかりません') }}</div>
        <div class="wrong-scan-detail">
          {{ t('wms.inspection.scanValue', 'スキャン値') }}: <strong>{{ wrongScanValue }}</strong>
        </div>
        <div class="wrong-scan-hint">
          {{ t('wms.inspection.noMatchHint', '未検品の注文の中に、このバーコード/SKUに一致する商品が見つかりませんでした。') }}
        </div>
        <div v-if="expectedSkus.length > 0" class="wrong-scan-expected">
          <div class="wrong-scan-expected-label">スキャン可能なSKU:</div>
          <div class="wrong-scan-expected-list">
            <span v-for="sku in expectedSkus.slice(0, 5)" :key="sku" class="expected-sku-tag">{{ sku }}</span>
            <span v-if="expectedSkus.length > 5" class="expected-sku-more">...他{{ expectedSkus.length - 5 }}件</span>
          </div>
        </div>
        <Button
          variant="destructive"
          class="wrong-scan-close-btn"
          @click="closeWrongScanDialog"
        >
          {{ t('wms.inspection.confirmAndClose', '確認して閉じる（F1）') }}
        </Button>
      </div>
      <DialogFooter><span></span></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { useRouter, useRoute } from 'vue-router'
import UnconfirmReasonDialog from '@/components/dialogs/UnconfirmReasonDialog.vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useI18n } from '@/composables/useI18n'
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
import { resolveImageUrl } from '@/utils/imageUrl'
import { useAutoPrint } from '@/composables/useAutoPrint'
import { useInspectionPrint } from '@/composables/useInspectionPrint'
import { useToast } from '@/composables/useToast'
import { useInspectionScanHistory } from './composables/useInspectionScanHistory'
import { beepSuccess, beepError, beepComplete } from '@/utils/scanBeep'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()

const { show: showToast } = useToast()
const { t } = useI18n()

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
const scanSuccessFlash = ref(false)

// スキャン履歴 / 扫描历史
const { scanHistory, addScanHistory } = useInspectionScanHistory()

// ─── Computed ─────────────────────────────────────────────────────────

const inspectedCount = computed(() => inspectedOrderIds.value.size)

// 検品進捗 / 検品進捗
const inspectionProgress = computed(() => {
  const total = allOrders.value.length
  const done = inspectedOrderIds.value.size
  return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
})

// 未検品注文の期待SKU一覧 / 未検品注文の期待SKU一覧
const expectedSkus = computed(() => {
  const skus = new Set<string>()
  for (const order of allOrders.value) {
    if (inspectedOrderIds.value.has(String(order._id))) continue
    const prod = (order.products as any[])?.[0]
    if (prod) {
      const sku = prod.inputSku || prod.productSku || ''
      if (sku) skus.add(sku)
    }
  }
  return [...skus]
})

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
    addScanHistory(input, 'error', 'not found')
    beepError()
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

  addScanHistory(input, 'ok', `${prod?.productName || sku} #${matchedRowNo}`)
  beepSuccess()

  rightPanelRef.value?.scrollToRow(matchedRowNo! - 1)
  handleOrderCompletion(matchedOrder)

  // スキャン成功フラッシュ / スキャン成功フラッシュ
  scanSuccessFlash.value = true
  setTimeout(() => { scanSuccessFlash.value = false }, 600)
}

// ─── Order Completion ─────────────────────────────────────────────────

async function handleOrderCompletion(order: OrderDocument) {
  beepComplete()
  const alreadyPrinted = !!(order as any)?.statusPrinted

  if (alreadyPrinted) {
    let reprintConfirmed = false
    if (!(await confirm('この操作を実行しますか？'))) return
    reprintConfirmed = true
    if (reprintConfirmed) {
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
        showToast('追跡番号がありません（B2 CloudからPDFを取得できません）', 'danger')
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
    // 自動印刷失敗 / Auto print failed
    showToast(`自動印刷に失敗しました: ${e?.message || String(e)}`, 'danger')
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
    // 印刷エラー / Print error
    showToast(`印刷に失敗しました: ${e?.message || String(e)}`, 'danger')
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
        showToast(message, 'success')
      }
    } else {
      await updateShipmentOrderStatus(orderId, 'unconfirm', 'confirm')
      showToast('確認を取り消しました', 'success')
    }

    removeOrderAndReset(orderId)
    unconfirmDialogVisible.value = false
  } catch (e: any) {
    if (builtIn && isCarrierDeleteError(e)) {
      isUnconfirming.value = false
      if (await confirm('この操作を実行しますか？')) {
        await handleUnconfirmConfirm(reason, true)
        return
      }
    }
    showToast(e?.message || '確認取消に失敗しました', 'danger')
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
    showToast('直前の検品を取り消しました', 'info')
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
    showToast('検品済みの注文を選択してください', 'warning')
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
        showToast('印刷プレビューの生成に失敗しました', 'danger')
      }
    }
  } catch (e: any) {
    showToast(`再出力に失敗しました: ${e?.message || String(e)}`, 'danger')
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
    // 処理済みID保存失敗 / Failed to save processed IDs
  }
}

function saveAllToStorage() {
  try {
    const orderIds = allOrders.value.map(o => String(o._id)).filter(Boolean)
    localStorage.setItem('nByOneSelectedOrderIds', JSON.stringify(orderIds))
    saveProcessedToStorage()
  } catch (e) {
    // 注文データ保存失敗 / Failed to save order data
  }
}

// ─── Navigation ───────────────────────────────────────────────────────

function handleGoBack() {
  router.push('/shipment/operations/tasks')
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
  router.push('/shipment/operations/tasks')
}

// ─── F-Key Bar ────────────────────────────────────────────────────────

interface FKeyDef {
  key: string
  code: string
  label: string
  action?: () => void
}

const fKeyDefs = computed<FKeyDef[]>(() => [
  { key: 'ESC', code: 'Escape', label: t('wms.inspection.goBack', '戻る'), action: handleGoBack },
  { key: 'F1', code: 'F1', label: t('wms.inspection.undoLast', '直前取消'), action: fkeyUndoLastScan },
  { key: 'F2', code: 'F2', label: '' },
  { key: 'F3', code: 'F3', label: '' },
  { key: 'F4', code: 'F4', label: '' },
  { key: 'F5', code: 'F5', label: '' },
  { key: 'F6', code: 'F6', label: '' },
  { key: 'F7', code: 'F7', label: t('wms.inspection.reprint', '再出力'), action: fkeyReprint },
  { key: 'F8', code: 'F8', label: '' },
  { key: 'F9', code: 'F9', label: t('wms.inspection.cancelInvoice', '送り状取消'), action: fkeyUnconfirm },
  { key: 'F10', code: 'F10', label: '' },
  { key: 'F11', code: 'F11', label: '' },
  { key: 'F12', code: 'F12', label: t('wms.inspection.exit', '終了'), action: handleGoBack },
])

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

  const def = fKeyDefs.value.find(fk => fk.code === e.key)
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
    // 初期データ読み込み失敗 / Failed to load initial data
  }

  let orderIds: string[] = []
  try {
    const stored = localStorage.getItem('nByOneSelectedOrderIds')
    orderIds = stored ? JSON.parse(stored) : []
  } catch {
    orderIds = []
  }

  if (orderIds.length === 0) {
    showToast('検品対象の注文がありません。一覧ページに戻ります。', 'warning')
    router.push('/shipment/operations/tasks')
    return
  }

  try {
    allOrders.value = await fetchShipmentOrdersByIds<OrderDocument>(orderIds)
  } catch (e) {
    // 注文読み込み失敗 / Failed to load orders
    showToast('注文の読み込みに失敗しました', 'danger')
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

/* ─── Progress Bar ───────────────────────── */
.inspection-progress-bar { width: 100%; padding: 8px 16px; background: #f5f7fa; border-radius: 4px; margin-bottom: 8px; }
.progress-info { display: flex; justify-content: space-between; font-size: 12px; color: #606266; margin-bottom: 4px; }
.progress-track { height: 6px; background: #ebeef5; border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: #67c23a; border-radius: 3px; transition: width 0.3s ease; }

/* ─── Scan Success Flash ─────────────────── */
.scan-success-flash { animation: successFlash 0.6s ease; }
@keyframes successFlash {
  0% { background-color: inherit; }
  30% { background-color: #f0f9eb; border-color: #67c23a; }
  100% { background-color: inherit; }
}

/* ─── F-Key Bar ──────────────────────────── */
.fkey-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: #1a1a2e;
  z-index: 100;
  flex-wrap: wrap;
  justify-content: center;
}
.fkey-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #3a3a5c;
  border-radius: 6px;
  background: #2a2a4a;
  color: #e0e0e0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.fkey-btn:hover { background: #3a3a6a; border-color: #5a5a8c; }
.fkey-btn:active { background: #4a4a7a; }
.fkey-btn .fkey-key {
  background: #4a4a7a;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  min-width: 28px;
  text-align: center;
}
.fkey-btn .fkey-label {
  font-size: 13px;
}
.fkey-btn--danger { border-color: #f56c6c; }
.fkey-btn--danger .fkey-key { background: #f56c6c; }
.fkey-btn--danger:hover { background: #4a2a2a; }

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
  background: var(--o-danger);
  color: #fff;
  font-size: 40px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wrong-scan-title { font-size: 22px; font-weight: 700; color: var(--o-danger); }
.wrong-scan-detail { font-size: 16px; color: var(--o-gray-900); }
.wrong-scan-hint { font-size: 13px; color: var(--o-gray-500); text-align: center; max-width: 360px; }

.wrong-scan-close-btn {
  width: 240px;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
}

.wrong-scan-expected { margin-top: 12px; padding: 8px 12px; background: #f5f7fa; border-radius: 4px; }
.wrong-scan-expected-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.wrong-scan-expected-list { display: flex; flex-wrap: wrap; gap: 4px; }
.expected-sku-tag { font-family: monospace; font-size: 12px; padding: 2px 8px; background: #fff; border: 1px solid #dcdfe6; border-radius: 3px; color: #303133; }
.expected-sku-more { font-size: 12px; color: #909399; padding: 2px 4px; }

/* ─── Completion Dialog ──────────────────── */
.completion-message {
  text-align: center;
  padding: 12px;
  background: var(--o-gray-100);
  border-radius: 4px;
  margin-bottom: 16px;
}

.completion-message p { margin: 6px 0; font-size: 14px; color: var(--o-gray-900); }

.print-preview-section {
  border: 1px solid #e5e7eb;
  background: var(--o-gray-100);
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
  background: var(--o-warning-bg);
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

/* ─── タブレット対応 / 平板适配 (768-1024px) ─────── */
@media (max-width: 1024px) {
  .inspection-page {
    flex-direction: column;
    height: auto;
    padding-bottom: 64px;
  }

  .inspection-page :deep(.left-panel) {
    width: 100% !important;
    min-width: 0 !important;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    max-height: none;
    overflow: visible;
  }

  .inspection-page :deep(.right-panel) {
    width: 100%;
    overflow-x: auto;
  }

  .fkey-bar { gap: 3px; padding: 6px 8px; }
  .fkey-btn { padding: 6px 10px; font-size: 12px; }
  .fkey-btn .fkey-key { font-size: 10px; padding: 2px 6px; min-width: 24px; }
}

/* ─── モバイル対応 / 手机适配 (<768px) ─────────────── */
@media (max-width: 768px) {
  .inspection-page { padding-bottom: 56px; }

  .inspection-page :deep(.left-panel) { padding: 12px; gap: 8px; }

  .inspection-page :deep(.scan-input) {
    font-size: 18px;
    padding: 12px 40px 12px 14px;
  }

  .inspection-page :deep(.product-image-section) { display: none; }

  .fkey-bar { gap: 2px; padding: 4px 6px; }
  .fkey-btn { padding: 8px 8px; font-size: 11px; }
  .fkey-btn .fkey-label { display: none; }
  .fkey-btn .fkey-key { font-size: 11px; min-width: 32px; }

  .wrong-scan-icon { width: 56px; height: 56px; font-size: 32px; }
  .wrong-scan-title { font-size: 18px; }
  .print-preview-section { height: 300px; }

  /* タッチターゲット拡大 / 触摸目标放大 */
  button, .o-btn, .el-button { min-height: 44px; min-width: 44px; }
}
</style>
