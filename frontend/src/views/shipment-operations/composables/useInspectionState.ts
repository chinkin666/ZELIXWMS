import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import type { Product } from '@/types/product'
import type { PrintTemplate } from '@/types/printTemplate'
import type { CarrierAutomationConfig } from '@/types/carrierAutomation'
import { resolveImageUrl } from '@/utils/imageUrl'
import { useI18n } from '@/composables/useI18n'

// ─── インターフェース / 接口定义 ───────────────────────────────────────

/** 検品アイテム / 检品项 */
export interface InspectionItem {
  productIndex: number
  sku: string
  name: string
  barcodes: string[]
  totalQuantity: number
  inspectedQuantity: number
  remainingQuantity: number
  productData?: Product
}

/** スキャンされた商品情報 / 已扫描的商品信息 */
export interface ScannedProductInfo {
  sku: string
  name: string
  barcodes: string[]
  imageUrl?: string
}

/** Fキー定義 / F键定义 */
export interface FKeyDef {
  key: string
  code: string
  label: string
  labelOnly?: string
  action?: () => void
}

/**
 * 検品ページの全リアクティブ状態を管理するComposable
 * 检品页面所有响应式状态管理的Composable
 */
export function useInspectionState() {
  const { t } = useI18n()

  // ─── ページパラメータ / 页面参数 ──────────────────────────────────────
  const orderGroupId = ref<string | null>(null)

  // ─── 注文リスト / 订单列表 ────────────────────────────────────────────
  const pendingOrders = ref<OrderDocument[]>([])
  const processedOrderIds = ref<string[]>([])
  const totalOrderCount = ref(0)

  // ─── 現在の検品 / 当前检品 ────────────────────────────────────────────
  const currentOrder = ref<OrderDocument | null>(null)
  const mode = ref<'order' | 'product'>('order')
  const inspectionItems = ref<InspectionItem[]>([])
  const lastScannedProduct = ref<ScannedProductInfo | null>(null)

  // ─── 入力 / 输入 ──────────────────────────────────────────────────────
  const inputValue = ref('')

  // ─── 商品キャッシュ / 商品缓存 ────────────────────────────────────────
  const productCache = new Map<string, Product>()

  // ─── 配送業者キャッシュ / 配送商缓存 ──────────────────────────────────
  const carriers = ref<Carrier[]>([])

  // ─── 印刷テンプレートキャッシュ / 打印模板缓存 ────────────────────────
  const printTemplatesCache = ref<PrintTemplate[]>([])

  // ─── 配送業者自動化設定キャッシュ / 配送商自动化设置缓存 ──────────────
  const carrierAutomationConfigCache = ref<CarrierAutomationConfig | null>(null)

  // ─── 検品完了ダイアログ / 检品完成对话框 ──────────────────────────────
  const completionDialogVisible = ref(false)

  // ─── 数量調整ダイアログ / 数量调整对话框 ──────────────────────────────
  const adjustDialogVisible = ref(false)
  const adjustTarget = ref<InspectionItem | null>(null)
  const adjustValue = ref(0)
  const adjustInputRef = ref<HTMLInputElement | null>(null)

  // ─── 確認取消 / 确认取消 ──────────────────────────────────────────────
  const unconfirmDialogVisible = ref(false)
  const isUnconfirming = ref(false)

  // ─── 送り状種類変更 / 送货单类型变更 ──────────────────────────────────
  const changeInvoiceTypeDialogVisible = ref(false)
  const changeInvoiceTypeOrders = ref<OrderDocument[]>([])
  const isChangingInvoiceType = ref(false)

  // ─── 注文分割 / 订单分割 ──────────────────────────────────────────────
  const splitOrderDialogVisible = ref(false)
  const splitOrderTarget = ref<OrderDocument | null>(null)
  const isSplittingOrder = ref(false)

  // ─── 誤スキャン警告 / 错误扫描警告 ────────────────────────────────────
  const wrongScanDialogVisible = ref(false)
  const wrongScanValue = ref('')

  // ─── スキャン成功フラッシュ / 扫描成功闪烁 ────────────────────────────
  const scanSuccessFlash = ref(false)

  // ─── 分割注文自動チェーンキュー / 分割订单自动链式队列 ────────────────
  const splitOrderQueue = ref<string[]>([])

  // ─── 注文一覧ダイアログ / 订单列表对话框 ──────────────────────────────
  const orderListDialogVisible = ref(false)
  const processedOrdersData = ref<OrderDocument[]>([])
  const loadingProcessedOrders = ref(false)

  // ─── タイマー / 定时器 ────────────────────────────────────────────────
  let autoPrintTimer: number | null = null
  let autoReturnTimer: number | null = null

  // ─── Computed / 计算属性 ──────────────────────────────────────────────

  /** 合計数量 / 总数量 */
  const totalQuantity = computed(() =>
    inspectionItems.value.reduce((sum, item) => sum + item.totalQuantity, 0),
  )

  /** 検品済み数量 / 已检品数量 */
  const inspectedQuantity = computed(() =>
    inspectionItems.value.reduce((sum, item) => sum + item.inspectedQuantity, 0),
  )

  /** 残り数量 / 剩余数量 */
  const remainingQuantity = computed(() =>
    inspectionItems.value.reduce((sum, item) => sum + item.remainingQuantity, 0),
  )

  /** 検品進捗 / 检品进度 */
  const inspectionProgress = computed(() => {
    const total = totalOrderCount.value
    const done = processedOrderIds.value.length
    return { total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
  })

  /** 誤スキャン時の期待SKU一覧 / 错误扫描时的期望SKU列表 */
  const expectedScanValues = computed(() => {
    if (!currentOrder.value) return []
    const values: string[] = []
    if (Array.isArray(currentOrder.value.products)) {
      for (const prod of currentOrder.value.products as any[]) {
        const sku = prod.inputSku || prod.sku || prod.productSku || ''
        if (sku && !values.includes(sku)) values.push(sku)
      }
    }
    return values
  })

  /** 注文情報表示項目 / 订单信息展示项 */
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

  /** スキャン済み商品画像URL / 已扫描商品图片URL */
  const scannedProductImageSrc = computed(() => {
    return resolveImageUrl(lastScannedProduct.value?.imageUrl)
  })

  // ─── ヘルパー / 辅助函数 ──────────────────────────────────────────────

  /** クール区分フォーマット / 冷链区分格式化 */
  function formatCoolType(v: string | undefined): string {
    if (v === '0') return t('wms.inspection.coolTypeNormal', '通常')
    if (v === '1') return t('wms.inspection.coolTypeFrozen', 'クール冷凍')
    if (v === '2') return t('wms.inspection.coolTypeChilled', 'クール冷蔵')
    return '-'
  }

  /** 印刷コンテキスト取得 / 获取打印上下文 */
  function getPrintContext() {
    return {
      carriers: carriers.value,
      printTemplatesCache: printTemplatesCache.value,
      carrierAutomationConfig: carrierAutomationConfigCache.value,
    }
  }

  /** 現在の注文と検品状態をリセット / 重置当前订单和检品状态 */
  function resetCurrentOrder() {
    currentOrder.value = null
    mode.value = 'order'
    inspectionItems.value = []
    lastScannedProduct.value = null
  }

  return {
    // ページパラメータ / 页面参数
    orderGroupId,

    // 注文リスト / 订单列表
    pendingOrders,
    processedOrderIds,
    totalOrderCount,

    // 現在の検品 / 当前检品
    currentOrder,
    mode,
    inspectionItems,
    lastScannedProduct,

    // 入力 / 输入
    inputValue,

    // キャッシュ / 缓存
    productCache,
    carriers,
    printTemplatesCache,
    carrierAutomationConfigCache,

    // ダイアログ / 对话框
    completionDialogVisible,
    adjustDialogVisible,
    adjustTarget,
    adjustValue,
    adjustInputRef,
    unconfirmDialogVisible,
    isUnconfirming,
    changeInvoiceTypeDialogVisible,
    changeInvoiceTypeOrders,
    isChangingInvoiceType,
    splitOrderDialogVisible,
    splitOrderTarget,
    isSplittingOrder,
    wrongScanDialogVisible,
    wrongScanValue,
    scanSuccessFlash,
    splitOrderQueue,
    orderListDialogVisible,
    processedOrdersData,
    loadingProcessedOrders,

    // タイマー参照用getter/setter / 定时器引用getter/setter
    getAutoPrintTimer: () => autoPrintTimer,
    setAutoPrintTimer: (v: number | null) => { autoPrintTimer = v },
    getAutoReturnTimer: () => autoReturnTimer,
    setAutoReturnTimer: (v: number | null) => { autoReturnTimer = v },

    // Computed
    totalQuantity,
    inspectedQuantity,
    remainingQuantity,
    inspectionProgress,
    expectedScanValues,
    orderInfoItems,
    scannedProductImageSrc,

    // ヘルパー / 辅助函数
    getPrintContext,
    resetCurrentOrder,
  }
}

/** useInspectionState の返り値型 / useInspectionState 返回值类型 */
export type InspectionState = ReturnType<typeof useInspectionState>
