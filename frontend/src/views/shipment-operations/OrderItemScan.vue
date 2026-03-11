<template>
  <div class="order-item-scan">
    <div class="page-header">
      <h1 class="page-title">商品スキャン検品</h1>
      <div class="header-actions">
        <label class="o-toggle">
          <input type="checkbox" v-model="autoPrintEnabled" @change="saveAutoPrintSetting" />
          <span class="o-toggle__slider"></span>
          <span class="toggle-label">{{ autoPrintEnabled ? '自動印刷' : '手動印刷' }}</span>
        </label>
        <button class="o-btn o-btn-secondary" @click="handleBack">戻る</button>
      </div>
    </div>

    <!-- 订单信息区域 -->
    <div class="order-info-section">
      <div class="order-info-grid">
        <template v-for="item in summaryItems" :key="item.key">
          <div class="info-label">{{ item.label }}</div>
          <div class="info-value">{{ item.value }}</div>
        </template>
      </div>
    </div>

    <!-- 中间输入区域 -->
    <div class="input-section">
      <input
        class="o-input main-input"
        v-model="inputValue"
        placeholder="スキャンまたは入力してください"
        @keyup.enter="handleInput"
        @input="handleInputChange"
        ref="mainInputRef"
      />
    </div>

    <!-- 上方表格：待扫描商品 -->
    <div class="table-section top-table">
      <div class="table-header">
        <span class="table-title">スキャン待ち商品 ({{ pendingItems.length }})</span>
      </div>
      <Table
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
        <span class="table-title">スキャン済み商品 ({{ scannedItems.length }})</span>
      </div>
      <Table
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

    <!-- 底部操作栏 -->
    <div class="bottom-bar">
      <div class="bottom-bar__left">
        <div class="bottom-bar__meta">
          出荷管理No: <strong>{{ order?.orderNumber || '-' }}</strong>
          <span class="meta-separator">|</span>
          スキャン待ち: <strong>{{ pendingItems.length }}</strong>件
          <span class="meta-separator">|</span>
          スキャン済み: <strong>{{ scannedItems.length }}</strong>件
        </div>
      </div>
      <div class="bottom-bar__right">
        <button
          class="o-btn o-btn-warning"
          :disabled="isUnconfirming"
          @click="openUnconfirmDialog"
        >
          {{ isUnconfirming ? '処理中...' : '確認取消' }}
        </button>
        <button
          class="o-btn o-btn-info"
          :disabled="isChangingInvoiceType"
          @click="openChangeInvoiceTypeDialog"
        >
          {{ isChangingInvoiceType ? '処理中...' : '送り状種類変更' }}
        </button>
      </div>
    </div>

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
    <ODialog
      :open="completionDialogVisible"
      title="スキャン完了"
      size="lg"
    >
      <div class="completion-message">
        <p>すべての商品のスキャンが完了しました。</p>
        <p>出荷管理No: {{ order?.orderNumber }}</p>
      </div>

      <div class="print-preview-section">
        <div v-if="printRendering" class="rendering">レンダリング中...</div>
        <div v-else-if="printError" class="error">{{ printError }}</div>
        <div v-else-if="!printImageUrl" class="placeholder">印刷プレビューを生成中...</div>
        <div v-else class="preview">
          <img :src="printImageUrl" class="preview-img" />
        </div>
      </div>

      <template #footer>
        <button class="o-btn o-btn-secondary" @click="handleCompletionConfirm">確認（印刷なし）</button>
        <button
          class="o-btn o-btn-primary"
          :disabled="!printImageUrl || printRendering"
          @click="handlePrint"
        >
          印刷
        </button>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Table from '@/components/table/Table.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import UnconfirmReasonDialog from '@/components/dialogs/UnconfirmReasonDialog.vue'
import ChangeInvoiceTypeDialog from '@/components/dialogs/ChangeInvoiceTypeDialog.vue'
import { useToast } from '@/composables/useToast'
import type { OrderDocument } from '@/types/order'
import type { Carrier } from '@/types/carrier'
import type { Product } from '@/types/product'
import type { TableColumn } from '@/types/table'
import { fetchCarriers } from '@/api/carrier'
import { fetchProducts } from '@/api/product'
import { fetchShipmentOrder, updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { fetchPrintTemplate } from '@/api/printTemplates'
import { fetchOrderSourceCompanyById } from '@/api/orderSourceCompany'
import type { PrintTemplate } from '@/types/printTemplate'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import { renderTemplateToPngBlob } from '@/utils/print/renderTemplateToPng'
import { printImage } from '@/utils/print/printImage'
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

// 订单数据
const order = ref<OrderDocument | null>(null)

// 打印相关状态
const printRendering = ref(false)
const printError = ref<string>('')
const printImageUrl = ref<string>('')
const printTemplate = ref<PrintTemplate | null>(null)
const orderSourceCompany = ref<OrderSourceCompany | null>(null)
let lastPrintObjectUrl: string | null = null

// 自动打印开关（从 localStorage 加载，默认开启）
const loadAutoPrintSetting = (): boolean => {
  try {
    const stored = localStorage.getItem('orderItemScan_autoPrintEnabled')
    // 如果 localStorage 中没有设置，默认返回 true（开启）
    if (stored === null) {
      return true
    }
    return stored === 'true'
  } catch (e) {
    return true // 默认开启
  }
}
const autoPrintEnabled = ref<boolean>(loadAutoPrintSetting())

// 保存自动打印设置到 localStorage
const saveAutoPrintSetting = () => {
  try {
    localStorage.setItem('orderItemScan_autoPrintEnabled', String(autoPrintEnabled.value))
  } catch (e) {
    console.error('Failed to save auto print setting:', e)
  }
}
const carriers = ref<Carrier[]>([])

// 商品缓存
const productCache = new Map<string, Product>()

// 商品项类型
interface ProductItem {
  id: string
  sku: string
  name: string
  quantity: number
  productData?: Product // 商品详细信息
}

// 待扫描和已扫描的商品
const pendingItems = ref<ProductItem[]>([])
const scannedItems = ref<ProductItem[]>([])

// 输入框
const inputValue = ref('')

// 输入框 ref（用于自动聚焦）
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
      let message = '確認を取り消しました'
      if (result.carrierDeleteSkipped) {
        message += '（B2 Cloud削除スキップ）'
      } else if (result.b2DeleteResult) {
        if (result.b2DeleteResult.success) {
          message += `（B2 Cloudから${result.b2DeleteResult.deleted}件削除）`
        } else {
          message += `（B2 Cloud削除失敗: ${result.b2DeleteResult.error}）`
        }
      }
      toast.success(message)

      // 从上级页面的列表中移除该订单
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
        console.error('Failed to update localStorage:', e)
      }

      // 返回上一级页面
      router.push('/shipment-operations/one-by-one/scan')
    }
    unconfirmDialogVisible.value = false
  } catch (e: any) {
    // B2削除エラーの場合はスキップ確認ダイアログを表示
    if (isCarrierDeleteError(e)) {
      isUnconfirming.value = false
      const confirmed = confirm(
        `B2 Cloudからの履歴削除に失敗しました。\n\nエラー: ${e.error}\n\nB2 Cloud削除をスキップして、ローカルのみ更新しますか？\n（B2 Cloud側は手動で削除してください）`
      )
      if (confirmed) {
        // スキップして再実行
        await handleUnconfirmConfirm(reason, true)
      }
      return
    }
    toast.error(e?.message || '確認取消に失敗しました')
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
      let message = `送り状種類を変更しました（${result.updatedCount}件更新）`
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

      // 内蔵Carrier（自動API対応）の場合：注文は自動再提出済み、商品スキャンページに留まる
      if (result.isBuiltInCarrier && result.resubmittedCount > 0) {
        // processedOrderIdsからは削除（再スキャンが必要）
        try {
          const processedStoredIds = localStorage.getItem('oneByOneProcessedOrderIds')
          if (processedStoredIds) {
            const processedIds = JSON.parse(processedStoredIds) as string[]
            const filteredIds = processedIds.filter(id => id !== orderId)
            localStorage.setItem('oneByOneProcessedOrderIds', JSON.stringify(filteredIds))
          }
        } catch (e) {
          console.error('Failed to update localStorage:', e)
        }
        // 注文データを再読み込み
        order.value = await fetchShipmentOrder(orderId)
        // 商品リストを再初期化
        initializeItems()
        changeInvoiceTypeDialogVisible.value = false
        return
      }

      // 手動Carrierの場合：1-1リストから削除し、スキャンリストページへ戻る
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
        console.error('Failed to update localStorage:', e)
      }

      // スキャンリストページへ戻る
      router.push('/shipment-operations/one-by-one/scan')
    } else {
      const errorMsg = result.errors?.join(', ') || '送り状種類変更に失敗しました'
      toast.error(errorMsg)
    }
    changeInvoiceTypeDialogVisible.value = false
  } catch (e: any) {
    // B2削除エラーの場合はスキップ確認ダイアログを表示
    if (isCarrierDeleteError(e)) {
      isChangingInvoiceType.value = false
      const confirmed = confirm(
        `B2 Cloudからの履歴削除に失敗しました。\n\nエラー: ${e.error}\n\nB2 Cloud削除をスキップして、ローカルのみ更新しますか？\n（B2 Cloud側は手動で削除してください）`
      )
      if (confirmed) {
        // スキップして再実行
        await handleChangeInvoiceTypeConfirm(newInvoiceType, true)
      }
      return
    }
    toast.error(e?.message || '送り状種類変更に失敗しました')
    changeInvoiceTypeDialogVisible.value = false
  } finally {
    isChangingInvoiceType.value = false
  }
}

// 加载商品信息
const loadProductBySku = (sku: string): Product | null => {
  return productCache.get(sku) || null
}

// 格式化日期时间
const fmtDateTime = (v: any) => {
  if (!v) return ''
  const d = new Date(v)
  return isNaN(d.getTime()) ? String(v) : d.toLocaleString('ja-JP')
}

// 配送会社名称
const carrierName = computed(() => {
  const id = order.value?.carrierId
  if (!id) return '-'
  const hit = carriers.value.find((c) => c._id === id)
  return hit ? `${hit.name} (${hit.code})` : String(id)
})

// 订单摘要信息
const summaryItems = computed(() => {
  const o: any = order.value || {}
  const fmt = (v: any) => (v ? fmtDateTime(v) : '-')
  return [
    { key: 'orderNumber', label: '出荷管理No', value: o.orderNumber || '-' },
    { key: 'trackingId', label: '伝票番号', value: o.trackingId || '-' },
    { key: 'carrierId', label: '配送会社', value: carrierName.value },
    { key: 'shipPlanDate', label: '出荷予定日', value: o.shipPlanDate || '-' },
    { key: 'invoiceType', label: '送り状種類', value: o.invoiceType || '-' },
    { key: 'recipientName', label: '送付先名', value: o.recipient?.name || '-' },
    { key: 'recipientPhone', label: '送付先電話番号', value: o.recipient?.phone || '-' },
    { key: 'recipientAddress', label: '送付先住所', value: [o.recipient?.prefecture, o.recipient?.city, o.recipient?.street].filter(Boolean).join(' ') || '-' },
  ]
})

// 表格列
const tableColumns = computed<TableColumn[]>(() => {
  return [
    {
      key: 'quantity',
      dataKey: 'quantity',
      title: '数量',
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
      title: '印刷用商品名',
      width: 200,
      fieldType: 'string',
    },
    {
      key: 'barcode',
      dataKey: 'barcode',
      title: 'バーコード',
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
      title: 'クール区分',
      width: 120,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: ProductItem }) => {
        const coolType = rowData.productData?.coolType
        if (coolType === '0') return '常温'
        if (coolType === '1') return 'クール冷蔵'
        if (coolType === '2') return 'クール冷凍'
        return '-'
      },
    },
    {
      key: 'mailCalcEnabled',
      dataKey: 'mailCalcEnabled',
      title: 'メール便計算',
      width: 140,
      fieldType: 'string',
      cellRenderer: ({ rowData }: { rowData: ProductItem }) => {
        const enabled = rowData.productData?.mailCalcEnabled
        if (enabled === true) {
          const maxQty = rowData.productData?.mailCalcMaxQuantity
          return maxQty ? `する(${maxQty})` : 'する'
        }
        if (enabled === false) return 'しない'
        return '-'
      },
    },
  ]
})

// 获取商品的所有匹配值（SKU、子SKU 和 barcode）
const getProductMatchingValues = (item: ProductItem): string[] => {
  const values: string[] = []

  // 主SKU
  if (item.sku) {
    values.push(item.sku)
  }

  const productData = item.productData
  if (productData) {
    // 子SKU
    if (Array.isArray(productData.subSkus)) {
      for (const sub of productData.subSkus) {
        if (sub?.subSku && sub.isActive !== false) {
          values.push(sub.subSku)
        }
      }
    }

    // Barcode
    if (Array.isArray(productData.barcode)) {
      for (const barcode of productData.barcode) {
        if (barcode) {
          values.push(String(barcode))
        }
      }
    }
  }

  return values
}

// 处理输入
const handleInput = () => {
  const input = inputValue.value.trim()
  if (!input) {
    toast.warning('入力してください')
    return
  }

  if (pendingItems.value.length === 0) {
    toast.info('スキャン待ちの商品がありません')
    return
  }

  // 在待扫描商品中查找匹配
  let matchedItem: ProductItem | null = null
  let matchedIndex = -1

  for (let i = 0; i < pendingItems.value.length; i++) {
    const item = pendingItems.value[i]
    if (!item) continue
    const matchingValues = getProductMatchingValues(item)
    if (matchingValues.includes(input)) {
      matchedItem = item
      matchedIndex = i
      break
    }
  }

  if (!matchedItem || matchedIndex === -1) {
    toast.warning(`マッチする商品が見つかりません: ${input}`)
    // 清空输入框，避免影响后续的自动输入
    inputValue.value = ''
    return
  }

  // 找到匹配的商品，创建一个已扫描项（数量为1），然后原商品数量-1
  const scannedItem: ProductItem = {
    id: `${matchedItem.sku}_scanned_${Date.now()}_${Math.random()}`,
    sku: matchedItem.sku,
    name: matchedItem.name,
    quantity: 1,
    productData: matchedItem.productData,
  }
  scannedItems.value.push(scannedItem)

  // 原商品数量-1
  matchedItem.quantity -= 1

  // 如果数量为0，从上方表格移除
  if (matchedItem.quantity === 0) {
    pendingItems.value.splice(matchedIndex, 1)

    // 检查是否所有商品都已扫描完成
    if (pendingItems.value.length === 0) {
      completionDialogVisible.value = true
    }
  }

  // 清空输入框
  inputValue.value = ''
}

// 输入框变化时的处理
const handleInputChange = () => {
  // 可以在这里实现实时搜索提示等功能
}

// 自动处理从上一页面传递的扫描值（通过SKU/barcode进入时自动检品一个商品）
const processInitialScan = (scanValue: string) => {
  if (!scanValue || pendingItems.value.length === 0) return

  // 在待扫描商品中查找匹配
  let matchedItem: ProductItem | null = null
  let matchedIndex = -1

  for (let i = 0; i < pendingItems.value.length; i++) {
    const item = pendingItems.value[i]
    if (!item) continue
    const matchingValues = getProductMatchingValues(item)
    if (matchingValues.includes(scanValue)) {
      matchedItem = item
      matchedIndex = i
      break
    }
  }

  if (!matchedItem || matchedIndex === -1) {
    // 没有匹配到商品，可能是通过其他方式（如orderNumber）进入的
    return
  }

  // 找到匹配的商品，自动添加到已扫描列表
  const scannedItem: ProductItem = {
    id: `${matchedItem.sku}_scanned_${Date.now()}_${Math.random()}`,
    sku: matchedItem.sku,
    name: matchedItem.name,
    quantity: 1,
    productData: matchedItem.productData,
  }
  scannedItems.value.push(scannedItem)

  // 原商品数量-1
  matchedItem.quantity -= 1

  // 如果数量为0，从上方表格移除
  if (matchedItem.quantity === 0) {
    pendingItems.value.splice(matchedIndex, 1)

    // 检查是否所有商品都已扫描完成
    if (pendingItems.value.length === 0) {
      completionDialogVisible.value = true
    }
  }

  toast.success(`自動検品: ${matchedItem.name} (${scanValue})`)
}

// 初始化商品列表（每次都是全新状态，不加载缓存）
const initializeItems = () => {
  if (!order.value) return

  // 清除该订单的扫描状态缓存（如果存在）
  try {
    const orderId = String(order.value._id)
    localStorage.removeItem(`orderItemScan_${orderId}`)
  } catch (e) {
    console.error('Failed to clear scan state cache:', e)
  }

  // 从订单原始数据初始化，总是全新状态
  const items: ProductItem[] = []
  if (Array.isArray(order.value.products)) {
    for (const prod of order.value.products) {
      const p = prod as any
      // 兼容新旧结构：inputSku 或 sku
      const sku = p.inputSku || p.sku || ''
      if (sku) {
        const productData = loadProductBySku(sku)
        items.push({
          id: `${sku}_${Date.now()}_${Math.random()}`,
          sku: sku,
          name: p.productName || p.name || sku,
          quantity: p.quantity || 1,
          productData: productData || undefined,
        })
      }
    }
  }
  pendingItems.value = items
  scannedItems.value = []
}

// 更新上一级页面的订单状态（将订单 ID 从待处理移到已处理）
const updateParentPageOrderState = () => {
  if (!order.value?._id) return

  try {
    const orderId = String(order.value._id)

    // 从 localStorage 读取待处理订单 ID 列表
    const storedIds = localStorage.getItem('oneByOneSelectedOrderIds')
    if (storedIds) {
      const orderIds = JSON.parse(storedIds) as string[]

      // 查找订单 ID 并移动到已处理列表
      const orderIndex = orderIds.findIndex((id) => id === orderId)
      if (orderIndex !== -1) {
        orderIds.splice(orderIndex, 1)

        // 读取已处理订单 ID 列表
        const processedStoredIds = localStorage.getItem('oneByOneProcessedOrderIds')
        const processedIds = processedStoredIds ? JSON.parse(processedStoredIds) : []

        // 检查是否已存在
        if (!processedIds.includes(orderId)) {
          processedIds.push(orderId)
          localStorage.setItem('oneByOneProcessedOrderIds', JSON.stringify(processedIds))
        }

        // 更新待处理订单 ID 列表
        localStorage.setItem('oneByOneSelectedOrderIds', JSON.stringify(orderIds))
      }
    }
  } catch (e) {
    console.error('Failed to update parent page order state:', e)
  }
}

// 根据订单查找匹配的默认模板
const findDefaultTemplate = (order: OrderDocument, allTemplates: PrintTemplate[]): PrintTemplate | null => {
  const carrierId = order?.carrierId
  const invoiceType = order?.invoiceType

  if (!carrierId || !invoiceType) {
    return null
  }

  // 找出所有匹配的模板（carrierId 和 invoiceType 都匹配）
  const matched = allTemplates.filter((t) => {
    const carrierMatch = t.carrierId === 'any' || t.carrierId === carrierId
    const invoiceMatch = t.invoiceType === 'any' || t.invoiceType === invoiceType
    return carrierMatch && invoiceMatch
  })

  if (matched.length === 0) {
    return null
  }

  // 优先选择默认模板
  const defaultTemplates = matched.filter((t) => t.isDefault === true)
  if (defaultTemplates.length > 0) {
    return defaultTemplates[0] || null
  }

  // 如果没有默认模板，返回第一个匹配的
  return matched[0] || null
}

// 清理打印图片URL
const cleanupPrintImage = () => {
  printError.value = ''
  printImageUrl.value = ''
  if (lastPrintObjectUrl) {
    URL.revokeObjectURL(lastPrintObjectUrl)
    lastPrintObjectUrl = null
  }
}

// 渲染打印预览
const renderPrintPreview = async () => {
  if (!order.value) {
    printError.value = '注文情報が見つかりません'
    return
  }

  printRendering.value = true
  printError.value = ''
  cleanupPrintImage()

  try {
    // 从 localStorage 加载模板缓存
    const storedTemplates = localStorage.getItem('allPrintTemplatesCache')
    if (!storedTemplates) {
      printError.value = '印刷テンプレートが読み込まれていません'
      return
    }

    const allTemplates = JSON.parse(storedTemplates) as PrintTemplate[]
    const template = findDefaultTemplate(order.value, allTemplates)

    if (!template) {
      printError.value = '該当する印刷テンプレートが見つかりません（配送会社と送り状種類に一致するテンプレートが必要です）'
      return
    }

    // 加载 OrderSourceCompany（如果需要）
    if (order.value.orderSourceCompanyId) {
      try {
        orderSourceCompany.value = await fetchOrderSourceCompanyById(order.value.orderSourceCompanyId)
      } catch (e) {
        console.error('Failed to load OrderSourceCompany:', e)
        orderSourceCompany.value = null
      }
    } else {
      orderSourceCompany.value = null
    }

    // 获取完整的模板数据（包含所有元素）
    const fullTemplate = await fetchPrintTemplate(template.id)
    printTemplate.value = fullTemplate

    // 渲染模板为 PNG
    const blob = await renderTemplateToPngBlob(
      fullTemplate,
      order.value,
      { exportDpi: 203, background: 'white' },
      orderSourceCompany.value,
    )

    // 创建图片URL
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

// 打印订单
const handlePrint = async () => {
  if (!printImageUrl.value || !printTemplate.value || !order.value) {
    toast.warning('印刷プレビューが準備できていません')
    return
  }

  try {
    await printImage(printImageUrl.value, {
      widthMm: printTemplate.value.canvas.widthMm,
      heightMm: printTemplate.value.canvas.heightMm,
      title: `Print ${order.value.orderNumber || ''}`.trim(),
    })

    // 向后端提交订单状态（标记已打印 + 已检品）
    const orderId = order.value._id
    if (orderId) {
      try {
        await Promise.all([
          updateShipmentOrderStatus(String(orderId), 'mark-printed'),
          updateShipmentOrderStatus(String(orderId), 'mark-inspected'),
        ])
      } catch (statusError: any) {
        console.error('Failed to update order status:', statusError)
        // 状态更新失败不阻断打印流程，但显示警告
        toast.warning(`ステータス更新に失敗しました: ${statusError?.message || String(statusError)}`)
      }
    }

    // 根据打印方式显示不同的消息（本地打印桥接不会显示打印对话框）
    const config = getPrintConfig()
    if (config.method === 'local-bridge') {
      toast.success('印刷ジョブを送信しました')
    } else {
      toast.success('印刷を開始しました（印刷ダイアログで100%スケール/余白なしを選択してください）')
    }

    // 如果自动打印开关开启，打印后延迟10ms自动返回上一页
    if (autoPrintEnabled.value) {
      // 清除之前的自动返回定时器
      if (autoReturnTimer) {
        clearTimeout(autoReturnTimer)
      }

      autoReturnTimer = window.setTimeout(() => {
        autoReturnTimer = null
        handleCompletionConfirm()
      }, 10)
    }
  } catch (e: any) {
    console.error('Print error:', e)
    toast.error(`印刷に失敗しました: ${e?.message || String(e)}`)
  }
}

// 完成确认
const handleCompletionConfirm = () => {
  completionDialogVisible.value = false
  cleanupPrintImage()

  // 更新上一级页面的订单状态
  updateParentPageOrderState()

  // 返回上一级页面
  router.push('/shipment-operations/one-by-one/scan')
}

// 返回上一级
const handleBack = () => {
  // 返回上一级页面（不保存扫描状态，每次进入都是全新状态）
  router.push('/shipment-operations/one-by-one/scan')
}

// 自动打印定时器（用于避免重复触发）
let autoPrintTimer: number | null = null
// 自动返回定时器
let autoReturnTimer: number | null = null

// 监听弹窗打开，自动渲染打印预览
watch(
  () => completionDialogVisible.value,
  async (v) => {
    if (v) {
      // 清除之前的自动打印定时器
      if (autoPrintTimer) {
        clearTimeout(autoPrintTimer)
        autoPrintTimer = null
      }

      // 弹窗打开时，自动渲染打印预览
      await renderPrintPreview()
    } else {
      // 弹窗关闭时，清理资源
      if (autoPrintTimer) {
        clearTimeout(autoPrintTimer)
        autoPrintTimer = null
      }
      cleanupPrintImage()
    }
  },
)

// 监听打印预览渲染完成，如果自动打印开启则延迟打印
watch(
  () => printImageUrl.value,
  (newUrl) => {
    if (newUrl && autoPrintEnabled.value && completionDialogVisible.value) {
      // 清除之前的自动打印定时器
      if (autoPrintTimer) {
        clearTimeout(autoPrintTimer)
      }

      // 如果预览已渲染且自动打印开启，延迟10ms后自动打印
      autoPrintTimer = window.setTimeout(() => {
        autoPrintTimer = null
        if (printImageUrl.value && printTemplate.value && order.value && completionDialogVisible.value) {
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
  cleanupPrintImage()
})

// 初始化
onMounted(async () => {
  // 从路由参数获取订单ID
  const orderId = route.params.orderId as string
  if (!orderId) {
    toast.error('注文が見つかりません')
    router.push('/shipment-operations/one-by-one/scan')
    return
  }

  try {
    // 加载订单
    order.value = await fetchShipmentOrder(orderId)

    // 加载配送会社
    carriers.value = await fetchCarriers()

    // 预加载所有商品信息
    const allProducts = await fetchProducts()
    for (const product of allProducts) {
      if (product.sku) {
        productCache.set(product.sku, product)
      }
    }

    // 初始化商品列表
    initializeItems()

    // 检查是否有从上一页面传递的扫描值（通过SKU/barcode匹配进入时）
    const initialScan = route.query.scan as string
    if (initialScan) {
      // 延迟处理，确保商品列表已初始化
      setTimeout(() => {
        processInitialScan(initialScan)
      }, 50)
    }

    // 自动聚焦到输入框
    setTimeout(() => {
      if (mainInputRef.value) {
        mainInputRef.value.focus()
      }
    }, 100)
  } catch (e: any) {
    console.error('Failed to load order:', e)
    toast.error(e?.message || '注文の読み込みに失敗しました')
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
  color: #606266;
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

.completion-message {
  margin-bottom: 20px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.completion-message p {
  margin: 8px 0;
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
  margin-top: 20px;
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
  padding: 12px;
  font-size: 14px;
}

.error {
  color: #b91c1c;
  padding: 12px;
  font-size: 14px;
  text-align: center;
}

.order-item-scan {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #2a3474;
}

.order-info-section {
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
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
  background: #f5f7fa;
  border-radius: 4px;
}

.table-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.input-section {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #ffffff;
  border: 2px solid #409eff;
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

.bottom-bar {
  position: sticky;
  bottom: 0;
  margin-top: 16px;
  padding: 12px 14px;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 10;
}

.bottom-bar__left {
  color: #303133;
  font-size: 13px;
}

.bottom-bar__meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-separator {
  margin: 0 8px;
  color: #c0c4cc;
}

.bottom-bar__right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.o-btn-warning {
  background-color: #e6a23c;
  color: #fff;
  border: 1px solid #e6a23c;
}

.o-btn-warning:hover:not(:disabled) {
  background-color: #ebb563;
  border-color: #ebb563;
}

.o-btn-info {
  background-color: #909399;
  color: #fff;
  border: 1px solid #909399;
}

.o-btn-info:hover:not(:disabled) {
  background-color: #a6a9ad;
  border-color: #a6a9ad;
}
</style>
