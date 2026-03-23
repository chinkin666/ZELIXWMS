<template>
  <div class="order-item-scan">
    <PageHeader :title="t('wms.inspection.productScanInspection', '商品スキャン検品')" :show-search="false">
      <template #actions>
        <label class="o-toggle">
          <input type="checkbox" v-model="autoPrintEnabled" @change="saveAutoPrintSetting" />
          <span class="o-toggle__slider"></span>
          <span class="toggle-label">{{ autoPrintEnabled ? t('wms.inspection.autoPrint', '自動印刷') : t('wms.inspection.manualPrint', '手動印刷') }}</span>
        </label>
        <Button variant="secondary" @click="handleBack">{{ t('wms.inspection.goBack', '戻る') }}</Button>
      </template>
    </PageHeader>

    <!-- 订单信息区域 -->
    <div class="order-info-section">
      <div class="order-info-grid">
        <template v-for="item in summaryItems" :key="item.key">
          <div class="info-label">{{ item.label }}</div>
          <div class="info-value">{{ item.value }}</div>
        </template>
      </div>
    </div>

    <!-- 検品進捗バー / 检品进度条 -->
    <div class="inspection-progress" v-if="order">
      <div class="progress-text">
        <span>検品進捗: {{ scannedItems.length }} / {{ scannedItems.length + pendingItems.length }}</span>
        <span>{{ Math.round(scannedItems.length / (scannedItems.length + pendingItems.length || 1) * 100) }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-bar-fill" :style="{ width: `${scannedItems.length / (scannedItems.length + pendingItems.length || 1) * 100}%` }"></div>
      </div>
    </div>

    <!-- 中间输入区域 -->
    <div class="input-section" :class="{ 'scan-success-flash': lastScanSuccess }">
      <input
        class="main-input"
        v-model="inputValue"
        :placeholder="t('wms.inspection.scanOrEnter', 'スキャンまたは入力してください')"
        @keyup.enter="handleInput"
        @input="handleInputChange"
        ref="mainInputRef"
      />
    </div>

    <!-- 上方表格：待扫描商品 -->
    <div class="table-section top-table">
      <div class="table-header">
        <span class="table-title">{{ t('wms.inspection.pendingItems', 'スキャン待ち商品') }} ({{ pendingItems.length }})</span>
      </div>
      <DataTable
        :columns="tableColumns"
        :data="pendingItems"
        :height="200"
        row-key="id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="10"
      />
    </div>

    <!-- 下方表格：已扫描商品 -->
    <div class="table-section bottom-table">
      <div class="table-header">
        <span class="table-title">{{ t('wms.inspection.scannedItems', 'スキャン済み商品') }} ({{ scannedItems.length }})</span>
      </div>
      <DataTable
        :columns="tableColumns"
        :data="scannedItems"
        :height="200"
        row-key="id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="10"
      />
    </div>

    <!-- 下部操作バー / 底部操作栏 -->
    <ScanBottomBar
      :order-number="order?.orderNumber || '-'"
      :pending-count="pendingItems.length"
      :scanned-count="scannedItems.length"
      :is-unconfirming="isUnconfirming"
      :is-changing-invoice-type="isChangingInvoiceType"
      @open-unconfirm="openUnconfirmDialog"
      @open-change-invoice-type="openChangeInvoiceTypeDialog"
    />

    <!-- 確認取消ダイアログ -->
    <UnconfirmReasonDialog
      v-model="unconfirmDialogVisible"
      :order-number="order?.orderNumber || ''"
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

    <!-- 扫描完成提示弹窗 -->
    <ScanCompletionDialog
      :open="completionDialogVisible"
      :order-number="order?.orderNumber || ''"
      :print-rendering="inspPrint.printRendering.value"
      :print-error="inspPrint.printError.value"
      :print-image-url="inspPrint.printImageUrl.value"
      @confirm-no-print="handleCompletionConfirm"
      @print="handlePrint"
    />
  </div>
</template>

<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { useRouter, useRoute } from 'vue-router'
import { DataTable } from '@/components/data-table'
import UnconfirmReasonDialog from '@/components/dialogs/UnconfirmReasonDialog.vue'
import ChangeInvoiceTypeDialog from '@/components/dialogs/ChangeInvoiceTypeDialog.vue'
import ScanCompletionDialog from './order-item-scan/ScanCompletionDialog.vue'
import ScanBottomBar from './order-item-scan/ScanBottomBar.vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useAutoPrint } from '@/composables/useAutoPrint'
import { useInspectionPrint } from '@/composables/useInspectionPrint'
import { useOrderItemScanLogic } from './composables/useOrderItemScanLogic'
import type { ProductItem } from './composables/useOrderItemScanLogic'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import type { TableColumn } from '@/types/table'
import { fetchCarriers } from '@/api/carrier'
import { fetchShipmentOrder, updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { getPrintConfig } from '@/utils/print/printConfig'
import { yamatoB2Unconfirm, changeInvoiceType, isCarrierDeleteError } from '@/api/carrierAutomation'

const router = useRouter()
const route = useRoute()

// Toast helpers
const _toast = useToast()
const toast = {
  success: (msg: string) => _toast.show(msg, 'success'),
  error: (msg: string) => _toast.show(msg, 'danger'),
  warning: (msg: string) => _toast.show(msg, 'warning'),
  info: (msg: string) => _toast.show(msg, 'info'),
}

const { t } = useI18n()
const { confirm } = useConfirmDialog()

// Composables
const { autoPrintEnabled, saveAutoPrintSetting } = useAutoPrint('orderItemScan_autoPrintEnabled')
const inspPrint = useInspectionPrint()
const scanLogic = useOrderItemScanLogic()
const { pendingItems, scannedItems, lastScanSuccess } = scanLogic

// 订单数据
const order = ref<OrderDocument | null>(null)

const carriers = ref<Carrier[]>([])

// 输入框
const inputValue = ref('')
const mainInputRef = ref<HTMLInputElement | null>(null)

// 完成弹窗
const completionDialogVisible = ref(false)

// 確認取消相关
const unconfirmDialogVisible = ref(false)
const isUnconfirming = ref(false)

// 送り状種類変更相关
const changeInvoiceTypeDialogVisible = ref(false)
const changeInvoiceTypeOrders = ref<OrderDocument[]>([])
const isChangingInvoiceType = ref(false)

// 打开确认取消对话框
const openUnconfirmDialog = () => {
  unconfirmDialogVisible.value = true
}

// 处理确认取消
const handleUnconfirmConfirm = async (reason: string, skipCarrierDelete = false) => {
  if (!order.value?._id) return

  isUnconfirming.value = true
  try {
    const orderId = String(order.value._id)
    const result = await yamatoB2Unconfirm([orderId], reason, { skipCarrierDelete })
    if (result.success) {
      let message = t('wms.inspection.confirmCancelled', '確認を取り消しました')
      if (result.carrierDeleteSkipped) {
        message += t('wms.inspection.b2CloudDeleteSkipped', '（B2 Cloud削除スキップ）')
      } else if (result.b2DeleteResult) {
        if (result.b2DeleteResult.success) {
          message += `（B2 Cloudから${result.b2DeleteResult.deleted}件削除）`
        } else {
          message += `（B2 Cloud削除失敗: ${result.b2DeleteResult.error}）`
        }
      }
      toast.success(message)

      try {
        const storedIds = localStorage.getItem('oneByOneSelectedOrderIds')
        if (storedIds) {
          const orderIds = JSON.parse(storedIds) as string[]
          const filteredIds = orderIds.filter(id => id !== orderId)
          localStorage.setItem('oneByOneSelectedOrderIds', JSON.stringify(filteredIds))
        }

        const processedStoredIds = localStorage.getItem('oneByOneProcessedOrderIds')
        if (processedStoredIds) {
          const processedIds = JSON.parse(processedStoredIds) as string[]
          const filteredIds = processedIds.filter(id => id !== orderId)
          localStorage.setItem('oneByOneProcessedOrderIds', JSON.stringify(filteredIds))
        }
      } catch (e) {
        // localStorage更新失敗 / Failed to update localStorage
      }

      router.push('/shipment-operations/one-by-one/scan')
    }
    unconfirmDialogVisible.value = false
  } catch (e: any) {
    if (isCarrierDeleteError(e)) {
      isUnconfirming.value = false
      if (await confirm(`この操作を実行しますか？\n\n${t('wms.inspection.error', 'エラー')}: ${e.error}\n\n${t('wms.inspection.skipB2CloudDeleteManual', 'B2 Cloud削除をスキップして、ローカルのみ更新しますか？')}`)) {
        await handleUnconfirmConfirm(reason, true)
      }
      return
    }
    toast.error(e?.message || t('wms.inspection.unconfirmFailed', '確認取消に失敗しました'))
    unconfirmDialogVisible.value = false
  } finally {
    isUnconfirming.value = false
  }
}

// 打开送り状種類変更对话框
const openChangeInvoiceTypeDialog = () => {
  if (!order.value) return
  changeInvoiceTypeOrders.value = [order.value]
  changeInvoiceTypeDialogVisible.value = true
}

// 处理送り状種類変更确认
const handleChangeInvoiceTypeConfirm = async (newInvoiceType: string, skipCarrierDelete = false) => {
  if (!order.value?._id) return

  isChangingInvoiceType.value = true
  try {
    const orderId = String(order.value._id)
    const result = await changeInvoiceType([orderId], newInvoiceType, { skipCarrierDelete })

    if (result.success) {
      let message = t('wms.inspection.invoiceTypeChanged', '送り状種類を変更しました') + `（${result.updatedCount}${t('wms.common.items', '件')}）`
      if (result.resubmittedCount > 0) {
        message += `、${result.resubmittedCount}件をB2 Cloudに再登録`
      }
      if (result.carrierDeleteSkipped) {
        message += '（B2 Cloud削除スキップ）'
      }
      if (result.requiresManualUpload) {
        message += '。手動連携の注文は運送会社への再登録が必要です。'
        toast.warning(message)
      } else {
        toast.success(message)
      }

      if (result.isBuiltInCarrier && result.resubmittedCount > 0) {
        try {
          const processedStoredIds = localStorage.getItem('oneByOneProcessedOrderIds')
          if (processedStoredIds) {
            const processedIds = JSON.parse(processedStoredIds) as string[]
            const filteredIds = processedIds.filter(id => id !== orderId)
            localStorage.setItem('oneByOneProcessedOrderIds', JSON.stringify(filteredIds))
          }
        } catch (e) {
          // localStorage更新失敗 / Failed to update localStorage
        }
        order.value = await fetchShipmentOrder(orderId)
        initializeItems()
        changeInvoiceTypeDialogVisible.value = false
        return
      }

      try {
        const storedIds = localStorage.getItem('oneByOneSelectedOrderIds')
        if (storedIds) {
          const orderIds = JSON.parse(storedIds) as string[]
          const filteredIds = orderIds.filter(id => id !== orderId)
          localStorage.setItem('oneByOneSelectedOrderIds', JSON.stringify(filteredIds))
        }

        const processedStoredIds = localStorage.getItem('oneByOneProcessedOrderIds')
        if (processedStoredIds) {
          const processedIds = JSON.parse(processedStoredIds) as string[]
          const filteredIds = processedIds.filter(id => id !== orderId)
          localStorage.setItem('oneByOneProcessedOrderIds', JSON.stringify(filteredIds))
        }
      } catch (e) {
        // localStorage更新失敗 / Failed to update localStorage
      }

      router.push('/shipment-operations/one-by-one/scan')
    } else {
      const errorMsg = result.errors?.join(', ') || t('wms.inspection.invoiceTypeChangeFailed', '送り状種類変更に失敗しました')
      toast.error(errorMsg)
    }
    changeInvoiceTypeDialogVisible.value = false
  } catch (e: any) {
    if (isCarrierDeleteError(e)) {
      isChangingInvoiceType.value = false
      if (await confirm(`この操作を実行しますか？\n\n${t('wms.inspection.error', 'エラー')}: ${e.error}\n\n${t('wms.inspection.skipB2CloudDeleteManual', 'B2 Cloud削除をスキップして、ローカルのみ更新しますか？')}`)) {
        await handleChangeInvoiceTypeConfirm(newInvoiceType, true)
      }
      return
    }
    toast.error(e?.message || t('wms.inspection.invoiceTypeChangeFailed', '送り状種類変更に失敗しました'))
    changeInvoiceTypeDialogVisible.value = false
  } finally {
    isChangingInvoiceType.value = false
  }
}

// 配送業者名称
const carrierName = computed(() => {
  const id = order.value?.carrierId
  if (!id) return '-'
  const hit = carriers.value.find((c) => c._id === id)
  return hit ? `${hit.name} (${hit.code})` : String(id)
})

// 订单摘要信息
const summaryItems = computed(() => {
  const o: any = order.value || {}
  return [
    { key: 'orderNumber', label: t('wms.inspection.shipmentNumber', '出荷管理No'), value: o.orderNumber || '-' },
    { key: 'trackingId', label: t('wms.inspection.trackingNumber', '伝票番号'), value: o.trackingId || '-' },
    { key: 'carrierId', label: t('wms.inspection.carrier', '配送業者'), value: carrierName.value },
    { key: 'shipPlanDate', label: t('wms.inspection.shipPlanDate', '出荷予定日'), value: o.shipPlanDate || '-' },
    { key: 'invoiceType', label: t('wms.inspection.invoiceType', '送り状種類'), value: o.invoiceType || '-' },
    { key: 'recipientName', label: t('wms.inspection.recipientName', 'お届け先名'), value: o.recipient?.name || '-' },
    { key: 'recipientPhone', label: t('wms.inspection.recipientPhone', 'お届け先電話番号'), value: o.recipient?.phone || '-' },
    { key: 'recipientAddress', label: t('wms.inspection.recipientAddress', 'お届け先住所'), value: [o.recipient?.prefecture, o.recipient?.city, o.recipient?.street, (o.recipient as any)?.building].filter(Boolean).join(' ') || '-' },
  ]
})

// 表格列
const tableColumns = computed<TableColumn[]>(() => {
  return [
    {
      key: 'quantity',
      dataKey: 'quantity',
      title: t('wms.inspection.quantity', '数量'),
      width: 80,
      fieldType: 'number',
      align: 'center',
    },
    {
      key: 'sku',
      dataKey: 'sku',
      title: 'SKU',
      width: 180,
      fieldType: 'string',
    },
    {
      key: 'name',
      dataKey: 'name',
      title: t('wms.inspection.printProductName', '印刷用商品名'),
      width: 200,
      fieldType: 'string',
    },
    {
      key: 'barcode',
      dataKey: 'barcode',
      title: t('wms.inspection.barcode', 'バーコード'),
      width: 200,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: ProductItem }) => {
        const productData = rowData.productData
        if (productData && Array.isArray(productData.barcode)) {
          return productData.barcode.join(', ')
        }
        return '-'
      },
    },
    {
      key: 'coolType',
      dataKey: 'coolType',
      title: t('wms.inspection.coolType', 'クール区分'),
      width: 120,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: ProductItem }) => {
        const coolType = rowData.productData?.coolType
        if (coolType === '0') return t('wms.inspection.coolTypeNormal', '通常')
        if (coolType === '1') return t('wms.inspection.coolTypeFrozen', 'クール冷凍')
        if (coolType === '2') return t('wms.inspection.coolTypeChilled', 'クール冷蔵')
        return '-'
      },
    },
    {
      key: 'mailCalcEnabled',
      dataKey: 'mailCalcEnabled',
      title: t('wms.inspection.mailCalc', 'メール便計算'),
      width: 140,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: ProductItem }) => {
        const enabled = rowData.productData?.mailCalcEnabled
        if (enabled === true) {
          const maxQty = rowData.productData?.mailCalcMaxQuantity
          return maxQty ? `${t('wms.inspection.mailCalcYes', 'する')}(${maxQty})` : t('wms.inspection.mailCalcYes', 'する')
        }
        if (enabled === false) return t('wms.inspection.mailCalcNo', 'しない')
        return '-'
      },
    },
  ]
})

// スキャン入力処理 / 扫描输入处理
const handleInput = () => {
  const input = inputValue.value.trim()
  const result = scanLogic.processScan(input)

  switch (result.status) {
    case 'empty':
      toast.warning(t('wms.inspection.pleaseEnter', '入力してください'))
      return
    case 'no-pending':
      toast.info(t('wms.inspection.noPendingProducts', 'スキャン待ちの商品がありません'))
      return
    case 'already-scanned':
      toast.warning('この商品は既にスキャン済みです / 该商品已扫描完成')
      inputValue.value = ''
      return
    case 'no-match':
      toast.warning(t('wms.inspection.noMatchingProduct', 'マッチする商品が見つかりません') + `: ${input}`)
      inputValue.value = ''
      return
    case 'completed':
      completionDialogVisible.value = true
      inputValue.value = ''
      return
    case 'matched':
      inputValue.value = ''
      return
  }
}

// 输入框变化时的处理
const handleInputChange = () => {
  // 可以在这里实现实时搜索提示等功能 / リアルタイム検索ヒント等の機能を実装可能
}

// 初期スキャン処理（前ページから引き継ぎ） / 初始扫描处理（从上一页面传递）
const processInitialScan = (scanValue: string) => {
  const result = scanLogic.processInitialScan(scanValue)
  if (!result) return

  if (result.status === 'completed') {
    completionDialogVisible.value = true
  }

  if (result.matchedItem) {
    toast.success(t('wms.inspection.autoInspection', '自動検品') + `: ${result.matchedItem.name} (${scanValue})`)
  }
}

// 商品リスト初期化 / 初始化商品列表
const initializeItems = () => {
  if (!order.value) return
  scanLogic.initializeItems(order.value)
}

// 更新上一级页面的订单状态
const updateParentPageOrderState = () => {
  if (!order.value?._id) return

  try {
    const orderId = String(order.value._id)

    const storedIds = localStorage.getItem('oneByOneSelectedOrderIds')
    if (storedIds) {
      const orderIds = JSON.parse(storedIds) as string[]

      const orderIndex = orderIds.findIndex((id) => id === orderId)
      if (orderIndex !== -1) {
        orderIds.splice(orderIndex, 1)

        const processedStoredIds = localStorage.getItem('oneByOneProcessedOrderIds')
        const processedIds = processedStoredIds ? JSON.parse(processedStoredIds) : []

        if (!processedIds.includes(orderId)) {
          processedIds.push(orderId)
          localStorage.setItem('oneByOneProcessedOrderIds', JSON.stringify(processedIds))
        }

        localStorage.setItem('oneByOneSelectedOrderIds', JSON.stringify(orderIds))
      }
    }
  } catch (e) {
    // 親ページの注文状態更新失敗 / Failed to update parent page order state
  }
}

// 打印订单
const handlePrint = async () => {
  if (!inspPrint.printImageUrl.value || !inspPrint.printTemplate.value || !order.value) {
    toast.warning(t('wms.inspection.printPreviewNotReady', '印刷プレビューが準備できていません'))
    return
  }

  try {
    await inspPrint.executePrint(order.value)

    const orderId = order.value._id
    if (orderId) {
      try {
        await Promise.all([
          updateShipmentOrderStatus(String(orderId), 'mark-printed'),
          updateShipmentOrderStatus(String(orderId), 'mark-inspected'),
        ])
      } catch (statusError: any) {
        // 注文ステータス更新失敗 / Failed to update order status
        toast.warning(t('wms.inspection.statusUpdateFailed', 'ステータス更新に失敗しました') + `: ${statusError?.message || String(statusError)}`)
      }
    }

    const config = getPrintConfig()
    if (config.method === 'local-bridge') {
      toast.success(t('wms.inspection.printJobSent', '印刷ジョブを送信しました'))
    } else {
      toast.success(t('wms.inspection.printStarted', '印刷を開始しました（印刷ダイアログで100%スケール/余白なしを選択してください）'))
    }

    if (autoPrintEnabled.value) {
      if (autoReturnTimer) {
        clearTimeout(autoReturnTimer)
      }

      autoReturnTimer = window.setTimeout(() => {
        autoReturnTimer = null
        handleCompletionConfirm()
      }, 10)
    }
  } catch (e: any) {
    // 印刷エラー / Print error
    toast.error(t('wms.inspection.printFailed', '印刷に失敗しました') + `: ${e?.message || String(e)}`)
  }
}

// 完成确认
const handleCompletionConfirm = () => {
  completionDialogVisible.value = false
  inspPrint.cleanupPrintImage()

  updateParentPageOrderState()

  router.push('/shipment-operations/one-by-one/scan')
}

// 返回上一级
const handleBack = () => {
  router.push('/shipment-operations/one-by-one/scan')
}

// 自动打印定时器
let autoPrintTimer: number | null = null
let autoReturnTimer: number | null = null

// 监听弹窗打开，自动渲染打印预览
watch(
  () => completionDialogVisible.value,
  async (v) => {
    if (v) {
      if (autoPrintTimer) {
        clearTimeout(autoPrintTimer)
        autoPrintTimer = null
      }

      if (order.value) {
        await inspPrint.renderPrintPreviewLegacy(order.value)
      }
    } else {
      if (autoPrintTimer) {
        clearTimeout(autoPrintTimer)
        autoPrintTimer = null
      }
      inspPrint.cleanupPrintImage()
    }
  },
)

// 监听打印预览渲染完成，如果自动打印开启则延迟打印
watch(
  () => inspPrint.printImageUrl.value,
  (newUrl) => {
    if (newUrl && autoPrintEnabled.value && completionDialogVisible.value) {
      if (autoPrintTimer) {
        clearTimeout(autoPrintTimer)
      }

      autoPrintTimer = window.setTimeout(() => {
        autoPrintTimer = null
        if (inspPrint.printImageUrl.value && inspPrint.printTemplate.value && order.value && completionDialogVisible.value) {
          handlePrint()
        }
      }, 10)
    }
  },
)

onBeforeUnmount(() => {
  if (autoPrintTimer) {
    clearTimeout(autoPrintTimer)
    autoPrintTimer = null
  }
  if (autoReturnTimer) {
    clearTimeout(autoReturnTimer)
    autoReturnTimer = null
  }
  inspPrint.cleanupPrintImage()
})

// 初始化
onMounted(async () => {
  const orderId = route.params.orderId as string
  if (!orderId) {
    toast.error(t('wms.inspection.orderNotFound', '注文が見つかりません'))
    router.push('/shipment-operations/one-by-one/scan')
    return
  }

  try {
    order.value = await fetchShipmentOrder(orderId)

    carriers.value = await fetchCarriers()

    await scanLogic.loadAllProducts()

    initializeItems()

    const initialScan = route.query.scan as string
    if (initialScan) {
      setTimeout(() => {
        processInitialScan(initialScan)
      }, 50)
    }

    setTimeout(() => {
      if (mainInputRef.value) {
        mainInputRef.value.focus()
      }
    }, 100)
  } catch (e: any) {
    // 注文読み込み失敗 / Failed to load order
    toast.error(e?.message || t('wms.inspection.loadOrderFailed', '注文の読み込みに失敗しました'))
    router.push('/shipment-operations/one-by-one/scan')
  }
})
</script>

<style scoped>
.o-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
}

.o-toggle input {
  display: none;
}

.o-toggle__slider {
  width: 40px;
  height: 20px;
  background: var(--o-toggle-off, #c0c4cc);
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
}

.o-toggle__slider::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.o-toggle input:checked + .o-toggle__slider {
  background: var(--o-brand-primary, #875a7b);
}

.o-toggle input:checked + .o-toggle__slider::after {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 13px;
  color: var(--o-gray-600);
}

.order-info-grid {
  display: grid;
  grid-template-columns: 180px 1fr 180px 1fr;
  gap: 0;
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 4px);
  overflow: hidden;
}

.info-label {
  padding: 8px 12px;
  background: var(--o-gray-100, #f5f7fa);
  font-weight: 500;
  font-size: 13px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  border-right: 1px solid var(--o-border-color, #e4e7ed);
}

.info-value {
  padding: 8px 12px;
  font-size: 13px;
  border-bottom: 1px solid var(--o-border-color, #e4e7ed);
  border-right: 1px solid var(--o-border-color, #e4e7ed);
}

.order-item-scan {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.order-info-section {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--o-gray-100);
  border-radius: 8px;
}

.table-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--o-gray-100);
  border-radius: 4px;
}

.table-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--o-gray-900);
}

.input-section {
  display: flex;
  align-items: center;
  padding: 20px;
  background: var(--o-view-background);
  border: 2px solid var(--o-info);
  border-radius: 8px;
  margin-bottom: 20px;
}

.main-input {
  flex: 1;
  font-size: 20px;
  padding: 16px;
  height: auto;
}

.top-table {
  flex: 0 0 auto;
}

.bottom-table {
  flex: 0 0 auto;
}

/* 検品進捗バー / 检品进度条 */
.inspection-progress {
  padding: 8px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  border-radius: var(--o-border-radius, 4px);
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #606266;
  margin-bottom: 4px;
}

.progress-bar {
  height: 6px;
  background: #ebeef5;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #67c23a;
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* スキャン成功フラッシュ / 扫描成功闪烁 */
.scan-success-flash {
  animation: successFlash 0.6s ease;
}

@keyframes successFlash {
  0% { background-color: inherit; }
  30% { background-color: #f0f9eb; border-color: #67c23a; }
  100% { background-color: inherit; }
}

/* モバイルレスポンシブ対応 / 移动端响应式适配 */
@media (max-width: 768px) {
  /* 全体パディング縮小 / 整体内边距缩小 */
  .order-item-scan { padding: 0 8px 12px; gap: 10px; }

  /* 注文情報グリッド1列化 / 订单信息网格单列化 */
  .order-info-grid { grid-template-columns: 120px 1fr; }
  .order-info-section { padding: 10px; margin-bottom: 12px; }

  /* スキャン入力エリア全幅・目立たせる / 扫描输入区域全宽・突出显示 */
  .input-section { padding: 12px; margin-bottom: 12px; }
  .main-input { font-size: 18px; padding: 12px; }

  /* テーブルセクション縮小 / 表格区域缩小 */
  .table-section { margin-bottom: 12px; }
  .table-header { padding: 6px 8px; }

  /* 検品進捗バー縮小 / 检品进度条缩小 */
  .inspection-progress { padding: 6px 10px; }

  /* 注文情報グリッド縦積み / 订单信息网格纵向排列 */
  .order-info-grid { grid-template-columns: 100px 1fr; }

  /* テーブル横スクロール / 表格横向滚动 */
  .table-section { overflow-x: auto; -webkit-overflow-scrolling: touch; }

  /* タッチターゲット拡大 / 触摸目标放大 */
  button, .o-btn, .el-button { min-height: 44px; min-width: 44px; }

  /* バーコードスキャン入力常時表示 / 条码扫描输入始终可见 */
  .input-section { position: sticky; top: 0; z-index: 10; }
}
</style>
