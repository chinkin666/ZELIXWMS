<template>
  <div class="inspection-page">
    <!-- 左侧面板 -->
    <InspectionLeftPanel
      ref="leftPanelRef"
      :order-group-id="orderGroupId"
      :current-order="currentOrder"
      :order-info-items="orderInfoItems"
      :input-value="inputValue"
      :mode="mode"
      :auto-print-enabled="autoPrintEnabled"
      :product-image-src="scannedProductImageSrc"
      :last-scanned-product="lastScannedProduct"
      @go-back="handleGoBack"
      @clear="handleClear"
      @update:input-value="inputValue = $event"
      @submit="handleInput"
      @toggle-auto-print="toggleAutoPrint"
    />

    <!-- 右侧面板 -->
    <InspectionRightPanel
      :current-order="currentOrder"
      :inspection-items="inspectionItems"
      :total-quantity="totalQuantity"
      :inspected-quantity="inspectedQuantity"
      :remaining-quantity="remainingQuantity"
      :processed-count="processedOrderIds.length"
      :total-order-count="totalOrderCount"
      @open-order-list="openOrderListDialog"
      @cell-click="handleCellClick"
    />

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
      :title="t('wms.inspection.inspectionComplete', '検品完了')"
      size="lg"
      @close="handleCompletionDialogClose"
    >
      <div class="completion-message">
        <p>{{ t('wms.inspection.allItemsInspected', 'すべての商品の検品が完了しました。') }}</p>
        <p>{{ t('wms.inspection.shipmentNumber', '出荷管理No') }}: {{ currentOrder?.orderNumber }}</p>
      </div>

      <div class="print-preview-section">
        <div v-if="inspPrint.printRendering.value" class="rendering">{{ t('wms.inspection.rendering', 'レンダリング中...') }}</div>
        <div v-else-if="inspPrint.printError.value" class="error">{{ inspPrint.printError.value }}</div>
        <div v-else-if="inspPrint.currentPdfSource.value === 'b2-webapi'" class="preview-b2-cloud">
          <div class="b2-cloud-icon">PDF</div>
          <div class="b2-cloud-text">{{ t('wms.inspection.fetchedFromB2Cloud', 'B2 Cloudから取得') }}</div>
          <div class="b2-cloud-tracking">{{ currentOrder?.trackingId }}</div>
        </div>
        <div v-else-if="!inspPrint.printImageUrl.value" class="placeholder">{{ t('wms.inspection.generatingPreview', '印刷プレビューを生成中...') }}</div>
        <div v-else class="preview">
          <img :src="inspPrint.printImageUrl.value" class="preview-img" />
        </div>
      </div>

      <template #footer>
        <OButton variant="secondary" @click="handleCompletionConfirmNoPrint">{{ t('wms.inspection.confirmNoPrint', '確認（印刷なし）') }}</OButton>
        <OButton
          variant="primary"
          :disabled="(inspPrint.currentPdfSource.value === 'local' && (!inspPrint.printImageUrl.value || inspPrint.printRendering.value)) || (inspPrint.currentPdfSource.value === 'b2-webapi' && !currentOrder?.trackingId)"
          @click="handlePrint"
        >
          {{ t('wms.inspection.print', '印刷') }}
        </OButton>
      </template>
    </ODialog>

    <!-- 注文一覧ダイアログ -->
    <ODialog
      :open="orderListDialogVisible"
      :title="t('wms.inspection.orderList', '注文一覧')"
      size="lg"
      @close="orderListDialogVisible = false"
    >
      <div class="order-list-section">
        <h4>{{ t('wms.inspection.uninspected', '未検品') }}（{{ pendingOrders.length }}{{ t('wms.common.items', '件') }}）</h4>
        <div style="max-height: 250px; overflow: auto">
          <table class="o-list-table o-list-table-border" style="width: 100%">
            <thead>
              <tr>
                <th style="width: 200px">{{ t('wms.inspection.shipmentNumber', '出荷管理No') }}</th>
                <th style="min-width: 180px">{{ t('wms.inspection.customerManagementNumber', 'お客様管理番号') }}</th>
                <th style="width: 160px">{{ t('wms.inspection.trackingNumber', '伝票番号') }}</th>
                <th style="width: 80px; text-align: center">{{ t('wms.inspection.productCount', '商品数') }}</th>
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
        <h4>{{ t('wms.inspection.inspected', '検品済') }}（{{ processedOrdersData.length }}{{ t('wms.common.items', '件') }}）</h4>
        <div style="max-height: 250px; overflow: auto">
          <div v-if="loadingProcessedOrders" style="text-align: center; padding: 16px; color: var(--o-gray-500)">{{ t('wms.common.loading', '読み込み中...') }}</div>
          <table v-else class="o-list-table o-list-table-border" style="width: 100%">
            <thead>
              <tr>
                <th style="width: 200px">{{ t('wms.inspection.shipmentNumber', '出荷管理No') }}</th>
                <th style="min-width: 180px">{{ t('wms.inspection.customerManagementNumber', 'お客様管理番号') }}</th>
                <th style="width: 160px">{{ t('wms.inspection.trackingNumber', '伝票番号') }}</th>
                <th style="width: 80px; text-align: center">{{ t('wms.inspection.productCount', '商品数') }}</th>
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
        <OButton variant="secondary" @click="orderListDialogVisible = false">{{ t('wms.common.close', '閉じる') }}</OButton>
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
        <div class="wrong-scan-title">{{ t('wms.inspection.wrongScanTitle', 'この注文に該当しない商品です') }}</div>
        <div class="wrong-scan-detail">
          {{ t('wms.inspection.scanValue', 'スキャン値') }}: <strong>{{ wrongScanValue }}</strong>
        </div>
        <div class="wrong-scan-hint">
          {{ t('wms.inspection.wrongScanHint', '現在の注文に含まれない商品がスキャンされました。') }}
        </div>
        <OButton
          variant="danger"
          class="wrong-scan-close-btn"
          @click="wrongScanDialogVisible = false"
        >
          {{ t('wms.inspection.confirmAndClose', '確認して閉じる') }}
        </OButton>
      </div>
      <template #footer><span></span></template>
    </ODialog>

    <!-- 手動検品数調整ダイアログ -->
    <ODialog
      :open="adjustDialogVisible"
      :title="t('wms.inspection.adjustQuantity', '検品数を調整')"
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
          <span class="adjust-shortcuts">ESC {{ t('wms.common.cancel', 'キャンセル') }} / F1 {{ t('wms.inspection.confirm', '確定') }}</span>
          <div>
            <OButton variant="secondary" @click="adjustDialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
            <OButton variant="primary" @click="handleAdjustConfirm">{{ t('wms.inspection.confirm', '確定') }}</OButton>
          </div>
        </div>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import { useRouter, useRoute } from 'vue-router'
import UnconfirmReasonDialog from '@/components/dialogs/UnconfirmReasonDialog.vue'
import ChangeInvoiceTypeDialog from '@/components/dialogs/ChangeInvoiceTypeDialog.vue'
import SplitOrderDialog from '@/components/dialogs/SplitOrderDialog.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import InspectionLeftPanel from './one-by-one/InspectionLeftPanel.vue'
import InspectionRightPanel from './one-by-one/InspectionRightPanel.vue'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import type { Product } from '@/types/product'
import type { PrintTemplate } from '@/types/printTemplate'
import { fetchShipmentOrdersByIds, fetchShipmentOrdersPage, fetchShipmentOrder, updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import { fetchProducts } from '@/api/product'
import { fetchPrintTemplates } from '@/api/printTemplates'
import { yamatoB2Unconfirm, changeInvoiceType, splitOrder as splitOrderApi, isCarrierDeleteError, fetchCarrierAutomationConfig } from '@/api/carrierAutomation'
import type { SplitOrderRequest, CarrierAutomationConfig } from '@/types/carrierAutomation'
import { isBuiltInCarrierId } from '@/utils/carrier'
import { resolvePdfSource } from '@/utils/print/resolvePrintTemplate'
import { resolveImageUrl } from '@/utils/imageUrl'
import { useAutoPrint } from '@/composables/useAutoPrint'
import { useInspectionPrint } from '@/composables/useInspectionPrint'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

const { show: showToast } = useToast()
const { t } = useI18n()

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

// ─── Composables ──────────────────────────────────────────────────────
const { autoPrintEnabled, saveAutoPrintSetting } = useAutoPrint('orderItemScan_autoPrintEnabled')
const inspPrint = useInspectionPrint()

function toggleAutoPrint() {
  autoPrintEnabled.value = !autoPrintEnabled.value
  saveAutoPrintSetting()
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
const leftPanelRef = ref<InstanceType<typeof InspectionLeftPanel> | null>(null)

// Product cache
const productCache = new Map<string, Product>()

// Carrier cache
const carriers = ref<Carrier[]>([])

// Print templates cache
const printTemplatesCache = ref<PrintTemplate[]>([])

// Carrier automation config cache
const carrierAutomationConfigCache = ref<CarrierAutomationConfig | null>(null)

// Completion dialog
const completionDialogVisible = ref(false)

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
    { key: 'orderNumber', label: t('wms.inspection.shipmentNumber', '出荷管理No'), value: hasOrder ? (o.orderNumber || '-') : '' },
    { key: 'customerManagementNumber', label: t('wms.inspection.customerManagementNumber', 'お客様管理番号'), value: hasOrder ? (o.customerManagementNumber || '-') : '' },
    { key: 'senderName', label: t('wms.inspection.sender', 'ご依頼主'), value: hasOrder ? (o.sender?.name || '-') : '' },
    { key: 'carrier', label: t('wms.inspection.carrier', '配送業者'), value: carrierDisplay },
    { key: 'invoiceType', label: t('wms.inspection.invoiceType', '送り状種別'), value: hasOrder ? (o.invoiceType || '-') : '' },
    { key: 'coolType', label: t('wms.inspection.coolType', 'クール区分'), value: hasOrder ? formatCoolType(o.coolType) : '' },
    { key: 'trackingId', label: t('wms.inspection.trackingNumber', '伝票番号'), value: hasOrder ? (o.trackingId || '-') : '' },
  ]
})

// ─── Helper Functions ─────────────────────────────────────────────────

function formatCoolType(v: string | undefined): string {
  if (v === '0') return t('wms.inspection.coolTypeNormal', '通常')
  if (v === '1') return t('wms.inspection.coolTypeFrozen', 'クール冷凍')
  if (v === '2') return t('wms.inspection.coolTypeChilled', 'クール冷蔵')
  return '-'
}

const scannedProductImageSrc = computed(() => {
  return resolveImageUrl(lastScannedProduct.value?.imageUrl)
})

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

      const productData = productCache.get(p.productSku || sku)
      if (productData && Array.isArray(productData.subSkus)) {
        for (const sub of productData.subSkus) {
          if (sub?.subSku && sub.isActive !== false) values.push(sub.subSku)
        }
      }

      if (Array.isArray(p.barcode)) {
        for (const bc of p.barcode) { if (bc) values.push(String(bc)) }
      } else {
        const pd = productCache.get(p.productSku || sku)
        if (pd && Array.isArray(pd.barcode)) {
          for (const bc of pd.barcode) { if (bc) values.push(String(bc)) }
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
    for (const bc of item.barcodes) { if (bc) values.push(bc) }
  }
  const pd = item.productData
  if (pd) {
    if (Array.isArray(pd.subSkus)) {
      for (const sub of pd.subSkus) {
        if (sub?.subSku && sub.isActive !== false) values.push(sub.subSku)
      }
    }
    if (Array.isArray(pd.barcode)) {
      for (const bc of pd.barcode) { if (bc) values.push(String(bc)) }
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
    showToast(t('wms.inspection.noPendingOrders', '処理待ちの注文がありません'), 'warning')
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
    showToast(t('wms.inspection.noMatchingOrder', 'マッチする注文が見つかりません') + `: ${input}`, 'danger')
    focusScanInput()
    return
  }

  currentOrder.value = matched
  mode.value = 'product'
  lastScannedProduct.value = null
  initializeInspectionItems()
  focusScanInput()

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

  const alreadyPrinted = !!(currentOrder.value as any)?.status?.printed?.isPrinted

  if (alreadyPrinted) {
    if (confirm(t('wms.inspection.alreadyPrintedConfirm', 'この注文は既に印刷済みです。もう一度印刷しますか？'))) {
      if (autoPrintEnabled.value) {
        triggerAutoPrint()
      } else {
        completionDialogVisible.value = true
      }
    } else {
      inspPrint.markOrderInspectedOnly(currentOrder.value!).then(() => {
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

  const pdfSource = resolvePdfSource(currentOrder.value.carrierId, currentOrder.value.invoiceType, {
    carriers: carriers.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })

  try {
    if (pdfSource === 'b2-webapi') {
      if (!currentOrder.value.trackingId) {
        showToast(t('wms.inspection.noTrackingNumber', '追跡番号がありません（B2 CloudからPDFを取得できません）'), 'danger')
        completionDialogVisible.value = true
        return
      }
      await inspPrint.printFromB2WebApi(currentOrder.value)
      await inspPrint.markOrderCompleted(currentOrder.value)
      finishCurrentOrder()
    } else {
      await inspPrint.renderPrintPreview(currentOrder.value, getPrintContext())
      if (inspPrint.printImageUrl.value && inspPrint.printTemplate.value && currentOrder.value) {
        await inspPrint.executePrint(currentOrder.value)
        await inspPrint.markOrderCompleted(currentOrder.value)
        finishCurrentOrder()
      } else {
        completionDialogVisible.value = true
      }
    }
  } catch (e: any) {
    console.error('Auto print failed:', e)
    showToast(t('wms.inspection.autoPrintFailed', '自動印刷に失敗しました') + `: ${e?.message || String(e)}`, 'danger')
    completionDialogVisible.value = true
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

  inspPrint.cleanupPrintImage()
  completionDialogVisible.value = false
  lastScannedProduct.value = null

  if (splitOrderQueue.value.length > 0) {
    const nextId = splitOrderQueue.value.shift()!
    const nextOrder = pendingOrders.value.find(o => String(o._id) === nextId)
    if (nextOrder) {
      currentOrder.value = nextOrder
      mode.value = 'product'
      initializeInspectionItems()
      showToast(t('wms.inspection.autoMovedToSplitOrder', '分割注文に自動移動しました') + `: ${nextOrder.orderNumber || nextId}`, 'info')
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
    if (inspPrint.currentPdfSource.value === 'b2-webapi') {
      await inspPrint.printFromB2WebApi(currentOrder.value)
    } else {
      await inspPrint.executePrint(currentOrder.value)
    }
    await inspPrint.markOrderCompleted(currentOrder.value)
    finishCurrentOrder()
  } catch (e: any) {
    console.error('Print error:', e)
    showToast(t('wms.inspection.printFailed', '印刷に失敗しました') + `: ${e?.message || String(e)}`, 'danger')
  }
}

async function handleCompletionConfirmNoPrint() {
  await inspPrint.markOrderInspectedOnly(currentOrder.value!)
  finishCurrentOrder()
}

function handleCompletionDialogClose() {
  // Do nothing - user must use footer buttons
}

// ─── Row Click → Manual Adjust ───────────────────────────────────────

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
  if (v && currentOrder.value) {
    await inspPrint.renderPrintPreview(currentOrder.value, getPrintContext())
  } else {
    inspPrint.cleanupPrintImage()
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
        let message = t('wms.inspection.confirmCancelled', '確認を取り消しました')
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
      showToast(t('wms.inspection.confirmCancelled', '確認を取り消しました'), 'success')
    }

    removeCurrentOrderAndReset()
    unconfirmDialogVisible.value = false
  } catch (e: any) {
    if (builtIn && isCarrierDeleteError(e)) {
      isUnconfirming.value = false
      if (confirm(t('wms.inspection.b2CloudDeleteFailed', 'B2 Cloudからの履歴削除に失敗しました。') + `\n\n${t('wms.inspection.error', 'エラー')}: ${e.error}\n\n${t('wms.inspection.skipB2CloudDelete', 'B2 Cloud削除をスキップして、ローカルのみ更新しますか？')}`)) {
        await handleUnconfirmConfirm(reason, true)
        return
      }
      return
    }
    showToast(e?.message || t('wms.inspection.unconfirmFailed', '確認取消に失敗しました'), 'danger')
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
      let message = t('wms.inspection.invoiceTypeChanged', '送り状種類を変更しました') + `（${result.updatedCount}${t('wms.common.items', '件')}）`
      if (result.resubmittedCount > 0) message += `、${result.resubmittedCount}件をB2 Cloudに再登録`
      if (result.carrierDeleteSkipped) message += '（B2 Cloud削除スキップ）'

      if (builtIn && result.resubmittedCount > 0) {
        showToast(message, 'success')
        currentOrder.value = await fetchShipmentOrder(orderId)
        initializeInspectionItems()
        changeInvoiceTypeDialogVisible.value = false
        focusScanInput()
        return
      }

      showToast(message, 'success')
      removeCurrentOrderAndReset()
    } else {
      showToast(result.errors?.join(', ') || t('wms.inspection.invoiceTypeChangeFailed', '送り状種類変更に失敗しました'), 'danger')
    }
    changeInvoiceTypeDialogVisible.value = false
  } catch (e: any) {
    if (builtIn && isCarrierDeleteError(e)) {
      isChangingInvoiceType.value = false
      if (confirm(t('wms.inspection.b2CloudDeleteFailed', 'B2 Cloudからの履歴削除に失敗しました。') + `\n\n${t('wms.inspection.error', 'エラー')}: ${e.error}\n\n${t('wms.inspection.skipB2CloudDelete', 'B2 Cloud削除をスキップして、ローカルのみ更新しますか？')}`)) {
        await handleChangeInvoiceTypeConfirm(newInvoiceType, true)
        return
      }
      return
    }
    showToast(e?.message || t('wms.inspection.invoiceTypeChangeFailed', '送り状種類変更に失敗しました'), 'danger')
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
      let message = t('wms.inspection.orderSplit', '注文を分割しました') + `（${result.splitOrders.length}${t('wms.common.items', '件')}）`
      if (result.carrierDeleteSkipped) message += '（B2 Cloud削除スキップ）'
      showToast(message, 'success')

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
      showToast(result.errors?.join(', ') || t('wms.inspection.orderSplitFailed', '注文分割に失敗しました'), 'danger')
    }
    splitOrderDialogVisible.value = false
  } catch (e: any) {
    if (builtIn && isCarrierDeleteError(e)) {
      isSplittingOrder.value = false
      if (confirm(t('wms.inspection.b2CloudDeleteFailed', 'B2 Cloudからの履歴削除に失敗しました。') + `\n\n${t('wms.inspection.error', 'エラー')}: ${e.error}\n\n${t('wms.inspection.skipB2CloudDeleteContinue', 'B2 Cloud削除をスキップして続行しますか？')}`)) {
        await handleSplitOrderConfirm(request, true)
        return
      }
      return
    }
    showToast(e?.message || t('wms.inspection.orderSplitFailed', '注文分割に失敗しました'), 'danger')
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
    showToast(t('wms.inspection.loadOrdersFailed', '保存された注文の読み込みに失敗しました'), 'danger')
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
      showToast(t('wms.inspection.loadOrdersFailed', '注文の読み込みに失敗しました'), 'danger')
    }
  } else {
    await loadOrdersFromStorage()
  }

  totalOrderCount.value = pendingOrders.value.length + processedOrderIds.value.length

  if (pendingOrders.value.length === 0 && processedOrderIds.value.length === 0) {
    showToast(t('wms.inspection.noOrdersToInspect', '検品対象の注文がありません。一覧ページに戻ります。'), 'warning')
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
    showToast(t('wms.inspection.undoScanSuccess', '検品を1つ取り消しました') + `: ${item.name}`, 'info')
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
  showToast(t('wms.inspection.orderCleared', '注文をクリアしました'), 'info')
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
  { key: 'ESC', code: 'Escape', label: t('wms.inspection.goBack', '戻る'), action: handleGoBack },
  { key: 'F1', code: 'F1', label: t('wms.inspection.undoLast', '直前取消'), action: fkeyUndoLastScan },
  { key: 'F2', code: 'F2', label: t('wms.inspection.clearOrder', '注文クリア'), action: fkeyClearCurrentOrder },
  { key: 'F3', code: 'F3', label: '' },
  { key: 'F4', code: 'F4', label: '' },
  { key: 'F5', code: 'F5', label: t('wms.inspection.adjustQty', '数量修正'), action: fkeyAdjustQuantity },
  { key: 'F6', code: 'F6', label: t('wms.inspection.splitOrder', '注文分割'), action: fkeySplitOrder },
  { key: 'F7', code: 'F7', label: '' },
  { key: 'F8', code: 'F8', label: '' },
  { key: 'F9', code: 'F9', label: t('wms.inspection.unconfirm', '確認取消'), action: fkeyUnconfirm },
  { key: 'F10', code: 'F10', label: '', labelOnly: t('wms.inspection.printInvoice', '納品書印刷') },
  { key: 'F11', code: 'F11', label: t('wms.inspection.changeInvoiceType', '送り状種類変更'), action: fkeyChangeInvoiceType },
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

/* ─── Order List Dialog ─────────────────── */
.order-list-section { margin-bottom: 16px; }
.order-list-section h4 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--o-gray-900); }

/* .o-list-table base styles are defined globally in style.css */

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

/* ─── Adjust Dialog ──────────────────────── */
.adjust-dialog-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.adjust-dialog-content p { width: 100%; margin: 0 0 8px; font-weight: 500; }
.adjust-hint { font-size: 13px; color: var(--o-gray-500); }

.adjust-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.adjust-shortcuts { font-size: 12px; color: var(--o-gray-500); }

/* ─── Button / Input styles ──────────────── */
.o-input {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}
.o-input:focus { border-color: var(--o-info); }
</style>
