<template>
  <el-dialog v-model="visible" title="印刷プレビュー" width="1200px" :close-on-click-modal="false">
    <div class="toolbar">
      <el-form inline>
        <el-form-item label="DPI">
          <el-select v-model="exportDpi" style="width: 120px">
            <el-option label="203" :value="203" />
            <el-option label="300" :value="300" />
          </el-select>
        </el-form-item>

        <el-form-item label="印刷済み登録">
          <el-switch v-model="recordPrinted" />
        </el-form-item>

        <el-form-item>
          <el-button :disabled="loading || previewItems.length === 0" @click="handlePrintAll">
            すべて印刷
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="preview-container">
      <div v-if="loading" class="loading-container">
        <el-progress :percentage="loadingProgress" :status="loadingError ? 'exception' : undefined" />
        <div class="loading-text">
          {{ loadingText }}
        </div>
      </div>
      <div v-else-if="previewItems.length === 0" class="empty-container">
        <div class="empty-text">プレビューする項目がありません</div>
      </div>
      <div v-else class="preview-grid">
        <div
          v-for="(item, index) in previewItems"
          :key="index"
          class="preview-item"
          :class="{ 'preview-item-error': item.error }"
        >
          <div class="preview-item-header">
            <span class="preview-item-number">{{ index + 1 }} / {{ previewItems.length }}</span>
            <span class="preview-item-title">
              {{ item.order?.orderNumber || item.order?._id || `注文 ${index + 1}` }}
            </span>
            <el-tag v-if="item.error" type="danger" size="small">エラー</el-tag>
            <el-tag v-else-if="item.pdfSource === 'b2-webapi'" type="warning" size="small">B2 Cloud</el-tag>
            <el-tag v-else-if="item.template" type="success" size="small">{{ item.template.name }}</el-tag>
          </div>
          <div class="preview-item-content">
            <div v-if="item.error" class="preview-error">{{ item.error }}</div>
            <div v-else-if="item.pdfSource === 'b2-webapi'" class="preview-b2-cloud">
              <div class="b2-cloud-icon">PDF</div>
              <div class="b2-cloud-text">B2 Cloudから取得</div>
              <div class="b2-cloud-tracking">{{ item.order.trackingId }}</div>
            </div>
            <div v-else-if="item.rendering" class="preview-rendering">レンダリング中...</div>
            <img v-else-if="item.imageUrl" :src="item.imageUrl" class="preview-image" />
            <div v-else-if="useBackendRendering && item.pdfSource === 'local'" class="preview-backend-rendered">
              <div class="backend-rendered-icon">✓</div>
              <div class="backend-rendered-text">サーバーでレンダリング済み</div>
            </div>
            <div v-else class="preview-placeholder">待機中...</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">キャンセル</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { OrderDocument } from '@/types/order'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { PrintTemplate } from '@/types/printTemplate'
import type { Carrier } from '@/types/carrier'
import type { CarrierAutomationConfig } from '@/types/carrierAutomation'
import { updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { fetchOrderSourceCompanyById } from '@/api/orderSourceCompany'
import { fetchPrintTemplate } from '@/api/printTemplates'
import { fetchCarriers } from '@/api/carrier'
import { fetchCarrierAutomationConfig, yamatoB2FetchBatchPdf } from '@/api/carrierAutomation'
import { renderKonvaOnBackend, checkRenderHealth } from '@/api/render'
import { renderTemplateToPngBlob } from '@/utils/print/renderTemplateToPng'
import { printImage, printPdfBlob } from '@/utils/print/printImage'
import { getPrintConfig } from '@/utils/print/printConfig'
import { resolvePrintTemplateId, resolvePdfSource } from '@/utils/print/resolvePrintTemplate'
import type { PdfSource } from '@/types/carrierAutomation'

// Threshold for using backend rendering (use backend for more than this many items)
const BACKEND_RENDER_THRESHOLD = 1

interface PreviewItem {
  order: OrderDocument
  template: PrintTemplate | null
  imageUrl: string | null
  blobUrl: string | null
  error: string | null
  rendering: boolean
  orderSourceCompany: OrderSourceCompany | null
  pdfSource: PdfSource
}

const props = defineProps<{
  modelValue: boolean
  orders: OrderDocument[]
  templates: PrintTemplate[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'printed'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const exportDpi = ref<number>(203)
const recordPrinted = ref(true)
const loading = ref(false)
const loadingProgress = ref(0)
const loadingText = ref('')
const loadingError = ref(false)

const previewItems = ref<PreviewItem[]>([])
// 模板缓存：存储完整的模板数据（包含所有元素）
const templateCache = ref<Map<string, PrintTemplate>>(new Map())
// Carrier data for template resolution
const carriersCache = ref<Carrier[]>([])
const carrierAutomationConfigCache = ref<CarrierAutomationConfig | null>(null)

// Backend rendering state
const backendPdfBlob = ref<Blob | null>(null)
const backendPdfUrl = ref<string | null>(null)
const useBackendRendering = ref(false)

/**
 * 根据订单的 carrierId 和 invoiceType 解析出印刷テンプレートID，然后从 allTemplates 中找到对应模板
 */
function findDefaultTemplate(order: OrderDocument, allTemplates: PrintTemplate[]): PrintTemplate | null {
  const carrierId = order?.carrierId
  const invoiceType = order?.invoiceType

  if (!carrierId || !invoiceType) {
    return null
  }

  // Use the new resolution logic
  const templateId = resolvePrintTemplateId(carrierId, invoiceType, {
    carriers: carriersCache.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })

  if (!templateId) {
    return null
  }

  // Find the template in allTemplates by id
  return allTemplates.find((t) => t.id === templateId) || null
}

/**
 * 初始化预览项
 */
async function initializePreviewItems() {
  if (!props.orders.length || !props.templates.length) {
    previewItems.value = []
    return
  }

  loading.value = true
  loadingProgress.value = 0
  loadingText.value = 'プレビューを準備しています...'
  loadingError.value = false

  // Step 0: Load carrier data for template resolution
  loadingText.value = '配送会社情報を読み込んでいます...'
  try {
    const [carriers, automationConfig] = await Promise.all([
      fetchCarriers(),
      fetchCarrierAutomationConfig('yamato-b2').catch(() => null),
    ])
    carriersCache.value = carriers
    carrierAutomationConfigCache.value = automationConfig
  } catch (e) {
    console.error('Failed to load carrier data:', e)
    carriersCache.value = []
    carrierAutomationConfigCache.value = null
  }
  loadingProgress.value = 10

  const items: PreviewItem[] = []
  const orderSourceCompanyMap = new Map<string, OrderSourceCompany | null>()
  const templateIdSet = new Set<string>()

  // 第一步：初始化所有项，收集模板ID和OrderSourceCompany ID
  for (let i = 0; i < props.orders.length; i++) {
    const order = props.orders[i]
    if (!order) continue

    // Determine PDF source for this order
    const pdfSource = resolvePdfSource(order.carrierId, order.invoiceType, {
      carriers: carriersCache.value,
      carrierAutomationConfig: carrierAutomationConfigCache.value,
    })

    // For b2-webapi source, we don't need a local template
    const template = pdfSource === 'b2-webapi' ? null : findDefaultTemplate(order, props.templates)

    // 收集模板ID（去重）- only for local templates
    if (template && pdfSource === 'local') {
      templateIdSet.add(template.id)
    }

    // Find carrier name for error message
    const carrier = carriersCache.value.find((c) => c._id === order.carrierId)
    const carrierName = carrier?.name || order.carrierId || '不明'

    // Determine error message
    let error: string | null = null
    if (pdfSource === 'local' && !template) {
      error = `テンプレートが見つかりません（配送会社: ${carrierName}, 送り状種類: ${order.invoiceType}）`
    } else if (pdfSource === 'b2-webapi' && !order.trackingId) {
      error = `追跡番号がありません（B2 CloudからPDFを取得できません）`
    }

    items.push({
      order,
      template,
      imageUrl: null,
      blobUrl: null,
      error,
      rendering: false,
      orderSourceCompany: null, // 稍后设置
      pdfSource,
    })

    loadingProgress.value = Math.round((i + 1) / props.orders.length * 15 + 10)
  }

  previewItems.value = items

  // 第二步：批量加载 OrderSourceCompany
  loadingText.value = 'ご依頼主情報を読み込んでいます...'
  const orderSourceCompanyIds = new Set<string>()
  for (const order of props.orders) {
    if (order.orderSourceCompanyId) {
      orderSourceCompanyIds.add(order.orderSourceCompanyId)
    }
  }

  // 并行获取所有 OrderSourceCompany（使用 Promise.all 代替顺序循环）
  await Promise.all(
    Array.from(orderSourceCompanyIds).map(async (oscId) => {
      try {
        const osc = await fetchOrderSourceCompanyById(oscId)
        orderSourceCompanyMap.set(oscId, osc)
      } catch (e) {
        console.error('Failed to load OrderSourceCompany:', e)
        orderSourceCompanyMap.set(oscId, null)
      }
    })
  )

  // 更新 items 中的 orderSourceCompany
  for (const item of items) {
    if (item.order.orderSourceCompanyId) {
      item.orderSourceCompany = orderSourceCompanyMap.get(item.order.orderSourceCompanyId) || null
    }
  }

  loadingProgress.value = 35

  // 第三步：批量加载所有模板（一次性获取）
  loadingText.value = 'テンプレートを読み込んでいます...'
  templateCache.value.clear()
  
  // 并行获取所有模板
  const templatePromises = Array.from(templateIdSet).map(async (templateId) => {
    try {
      const fullTemplate = await fetchPrintTemplate(templateId)
      templateCache.value.set(templateId, fullTemplate)
    } catch (e: any) {
      console.error(`Failed to load template ${templateId}:`, e)
      // 如果获取失败，不缓存，后续渲染时会报错
    }
  })

  await Promise.all(templatePromises)
  loadingProgress.value = 50

  // 第四步：渲染所有预览图
  // Filter local items that need rendering
  const localItemsToRender = items.filter(
    (item) => !item.error && item.pdfSource === 'local' && item.template
  )

  // Decide whether to use backend rendering
  if (localItemsToRender.length > BACKEND_RENDER_THRESHOLD) {
    // Use backend rendering for multiple items
    await renderWithBackend(localItemsToRender)
  } else {
    // Use frontend rendering for single item
    await renderWithFrontend(localItemsToRender)
  }

  loading.value = false
  loadingProgress.value = 100
}

/**
 * Render items using backend service (for multiple items)
 */
async function renderWithBackend(localItems: PreviewItem[]) {
  loadingText.value = 'サーバーでレンダリング中...'
  useBackendRendering.value = true

  // Check if backend is available
  const backendAvailable = await checkRenderHealth()
  if (!backendAvailable) {
    console.warn('Backend render service unavailable, falling back to frontend rendering')
    await renderWithFrontend(localItems)
    return
  }

  try {
    // Prepare render items
    const renderItems = localItems
      .filter((item) => item.template && templateCache.value.has(item.template.id))
      .map((item) => ({
        templateId: item.template!.id,
        orderId: String(item.order._id),
        orderSourceCompanyId: item.order.orderSourceCompanyId,
      }))

    if (renderItems.length === 0) {
      console.warn('No valid items to render on backend')
      return
    }

    // Call backend render API
    const pdfBlob = await renderKonvaOnBackend(renderItems, {
      exportDpi: exportDpi.value,
      background: 'white',
    })

    // Store the PDF for printing
    backendPdfBlob.value = pdfBlob
    backendPdfUrl.value = URL.createObjectURL(pdfBlob)

    // Mark all local items as rendered (show placeholder in preview)
    for (const item of localItems) {
      item.rendering = false
      item.imageUrl = null // Will show "サーバーでレンダリング済み" placeholder
    }

    loadingProgress.value = 100
  } catch (error: any) {
    console.error('Backend render failed, falling back to frontend:', error)
    ElMessage.warning('サーバーレンダリングに失敗しました。フロントエンドで再試行します...')
    useBackendRendering.value = false
    await renderWithFrontend(localItems)
  }
}

/**
 * Render items using frontend Konva (for single item or fallback)
 */
async function renderWithFrontend(localItems: PreviewItem[]) {
  loadingText.value = '画像を生成しています...'
  useBackendRendering.value = false

  for (let i = 0; i < localItems.length; i++) {
    const item = localItems[i]
    if (!item || !item.template) continue

    // 从缓存中获取完整模板
    const fullTemplate = templateCache.value.get(item.template.id)
    if (!fullTemplate) {
      item.error = `テンプレート ${item.template.name || item.template.id} の読み込みに失敗しました`
      loadingProgress.value = Math.round((i + 1) / localItems.length * 50 + 50)
      continue
    }

    try {
      item.rendering = true
      const blob = await renderTemplateToPngBlob(
        fullTemplate,
        item.order,
        { exportDpi: exportDpi.value, background: 'white' },
        item.orderSourceCompany,
      )

      const blobUrl = URL.createObjectURL(blob)
      item.blobUrl = blobUrl
      item.imageUrl = blobUrl
      item.rendering = false
    } catch (e: any) {
      item.rendering = false
      item.error = e?.message || String(e)
      console.error(`Failed to render preview for order ${item.order.orderNumber || item.order._id}:`, e)
    }

    loadingProgress.value = Math.round((i + 1) / localItems.length * 50 + 50)
  }
}

/**
 * 清理所有 blob URLs
 */
function cleanupBlobUrls() {
  previewItems.value.forEach((item) => {
    if (item.blobUrl) {
      URL.revokeObjectURL(item.blobUrl)
      item.blobUrl = null
      item.imageUrl = null
    }
  })

  // Clean up backend PDF URL
  if (backendPdfUrl.value) {
    URL.revokeObjectURL(backendPdfUrl.value)
    backendPdfUrl.value = null
  }
  backendPdfBlob.value = null
  useBackendRendering.value = false
}

/**
 * 打印所有预览项
 */
async function handlePrintAll() {
  // Separate items by PDF source
  const localItems = previewItems.value.filter(
    (item) => !item.error && item.pdfSource === 'local' && item.template
  )
  const b2WebapiItems = previewItems.value.filter(
    (item) => !item.error && item.pdfSource === 'b2-webapi' && item.order.trackingId
  )

  const totalItems = localItems.length + b2WebapiItems.length
  if (totalItems === 0) {
    ElMessage.warning('印刷可能な項目がありません')
    return
  }

  const printConfig = getPrintConfig()
  let successCount = 0
  let failCount = 0

  ElMessage.info(`${totalItems}件の印刷を開始しています...`)

  // 1. Print b2-webapi items (batch fetch merged PDF)
  if (b2WebapiItems.length > 0) {
    try {
      const trackingNumbers = b2WebapiItems.map((item) => item.order.trackingId!).filter(Boolean)
      if (trackingNumbers.length > 0) {
        ElMessage.info(`B2 CloudからPDFを取得しています（${trackingNumbers.length}件）...`)
        const pdfBlob = await yamatoB2FetchBatchPdf(trackingNumbers)
        await printPdfBlob(pdfBlob, { title: 'B2 Cloud Labels', templateType: 'b2-cloud' })
        successCount += b2WebapiItems.length

        // Mark as printed
        if (recordPrinted.value) {
          for (const item of b2WebapiItems) {
            try {
              await updateShipmentOrderStatus(String(item.order._id), 'mark-printed')
            } catch (e: any) {
              console.error(`Failed to mark order as printed: ${item.order._id}`, e)
            }
          }
        }
      }
    } catch (e: any) {
      console.error('Failed to print b2-webapi items:', e)
      ElMessage.error(`B2 Cloud PDF取得エラー: ${e?.message || e}`)
      failCount += b2WebapiItems.length
    }
  }

  // 2. Print local template items
  if (localItems.length > 0) {
    // If backend rendering was used, print the combined PDF
    if (useBackendRendering.value && backendPdfBlob.value) {
      try {
        const firstTemplateId = localItems[0]?.template?.id
        await printPdfBlob(backendPdfBlob.value, {
          title: 'Print Labels',
          templateId: firstTemplateId,
          templateType: 'print',
        })
        successCount += localItems.length

        // Mark all as printed
        if (recordPrinted.value) {
          for (const item of localItems) {
            try {
              await updateShipmentOrderStatus(String(item.order._id), 'mark-printed')
            } catch (e: any) {
              console.error(`Failed to mark order as printed: ${item.order._id}`, e)
            }
          }
        }
      } catch (e: any) {
        console.error('Failed to print backend-rendered PDF:', e)
        ElMessage.error(`印刷エラー: ${e?.message || e}`)
        failCount += localItems.length
      }
    } else {
      // Frontend rendering: print each item individually
      for (const item of localItems) {
        if (!item.blobUrl || !item.template) continue

        // 从缓存中获取完整的模板数据（包含 canvas 信息）
        const fullTemplate = templateCache.value.get(item.template.id)
        if (!fullTemplate) {
          console.error(`Template ${item.template.id} not found in cache`)
          failCount++
          continue
        }

        try {
          await printImage(item.blobUrl, {
            widthMm: fullTemplate.canvas.widthMm,
            heightMm: fullTemplate.canvas.heightMm,
            title: `Print ${item.order.orderNumber || item.order._id}`.trim(),
          })

          successCount++

          // 印刷済み登録状态
          if (recordPrinted.value) {
            try {
              await updateShipmentOrderStatus(String(item.order._id), 'mark-printed')
            } catch (e: any) {
              console.error(`Failed to mark order as printed: ${item.order._id}`, e)
            }
          }

          // 对于浏览器打印，需要等待一下避免对话框冲突
          if (printConfig.method !== 'local-bridge') {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        } catch (e: any) {
          console.error(`Failed to print order ${item.order.orderNumber || item.order._id}:`, e)
          ElMessage.warning(`注文 ${item.order.orderNumber || item.order._id} の印刷に失敗しました`)
          failCount++
        }
      }
    }
  }

  // 显示结果消息
  if (printConfig.method === 'local-bridge') {
    if (successCount > 0) {
      ElMessage.success(`${successCount}件の印刷ジョブを送信しました${failCount > 0 ? `（${failCount}件失敗）` : ''}`)
    } else {
      ElMessage.error('印刷に失敗しました')
    }
  } else {
    if (successCount > 0) {
      ElMessage.success(`${successCount}件の印刷を開始しました（印刷ダイアログで100%スケール/余白なしを選択してください）${failCount > 0 ? `（${failCount}件失敗）` : ''}`)
    } else {
      ElMessage.error('印刷に失敗しました')
    }
  }

  if (successCount > 0) {
    emit('printed')
  }
}

// 当对话框打开时，初始化预览
watch(
  () => props.modelValue,
  async (v) => {
    if (!v) {
      cleanupBlobUrls()
      previewItems.value = []
      templateCache.value.clear()
      loading.value = false
      return
    }

    await initializePreviewItems()
  },
)

// 当 DPI 变化时，重新渲染
watch(
  () => exportDpi.value,
  async () => {
    if (!visible.value || previewItems.value.length === 0) return
    await initializePreviewItems()
  },
)

onBeforeUnmount(() => {
  cleanupBlobUrls()
})
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
}

.preview-container {
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 16px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.loading-text {
  margin-top: 16px;
  color: #6b7280;
  font-size: 14px;
}

.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.empty-text {
  color: #6b7280;
  font-size: 14px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.preview-item {
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-item-error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.preview-item-header {
  padding: 8px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.preview-item-number {
  color: #6b7280;
  font-weight: 500;
}

.preview-item-title {
  flex: 1;
  color: #111827;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-item-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 12px;
}

.preview-error {
  color: #dc2626;
  font-size: 12px;
  text-align: center;
  padding: 8px;
}

.preview-rendering {
  color: #3b82f6;
  font-size: 12px;
  text-align: center;
  padding: 8px;
}

.preview-placeholder {
  color: #9ca3af;
  font-size: 12px;
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
}

.preview-b2-cloud {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #fef9c3;
  border: 1px dashed #ca8a04;
  border-radius: 8px;
  width: 100%;
}

.b2-cloud-icon {
  font-size: 24px;
  font-weight: bold;
  color: #ca8a04;
  background: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: 2px solid #ca8a04;
}

.b2-cloud-text {
  color: #854d0e;
  font-size: 12px;
  font-weight: 500;
}

.b2-cloud-tracking {
  color: #a16207;
  font-size: 11px;
  font-family: monospace;
}

.preview-backend-rendered {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #dcfce7;
  border: 1px dashed #16a34a;
  border-radius: 8px;
  width: 100%;
}

.backend-rendered-icon {
  font-size: 24px;
  font-weight: bold;
  color: #16a34a;
  background: white;
  padding: 8px 16px;
  border-radius: 50%;
  border: 2px solid #16a34a;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.backend-rendered-text {
  color: #166534;
  font-size: 12px;
  font-weight: 500;
}
</style>

