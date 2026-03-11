<template>
  <ODialog :open="visible" title="印刷プレビュー" @close="visible = false" width="1200px">
    <div class="toolbar">
      <div class="toolbar-row">
        <div class="toolbar-item">
          <label class="toolbar-label">DPI</label>
          <select class="o-input" v-model.number="exportDpi" style="width: 120px">
            <option :value="203">203</option>
            <option :value="300">300</option>
          </select>
        </div>

        <div class="toolbar-item">
          <label class="toolbar-label">印刷済み登録</label>
          <label class="o-toggle">
            <input type="checkbox" v-model="recordPrinted" />
            <span class="o-toggle-slider"></span>
          </label>
        </div>

        <button class="o-btn o-btn-secondary o-btn-sm" :disabled="loading || previewItems.length === 0" @click="handlePrintAll">
          すべて印刷
        </button>
      </div>
    </div>

    <div class="preview-container">
      <div v-if="loading" class="loading-container">
        <div class="progress-bar-container">
          <div class="progress-bar" :class="{ exception: loadingError }" :style="{ width: loadingProgress + '%' }"></div>
        </div>
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
            <span v-if="item.error" class="o-badge o-badge-danger" style="font-size:11px">エラー</span>
            <span v-else-if="item.pdfSource === 'b2-webapi'" class="o-badge" style="font-size:11px; background:#fef9c3; color:#854d0e; border:1px solid #ca8a04">B2 Cloud</span>
            <span v-else-if="item.template" class="o-badge o-badge-success" style="font-size:11px">{{ item.template.name }}</span>
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
              <div class="backend-rendered-icon">&#10003;</div>
              <div class="backend-rendered-text">サーバーでレンダリング済み</div>
            </div>
            <div v-else class="preview-placeholder">待機中...</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="o-btn o-btn-secondary" @click="visible = false">キャンセル</button>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
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
const templateCache = ref<Map<string, PrintTemplate>>(new Map())
const carriersCache = ref<Carrier[]>([])
const carrierAutomationConfigCache = ref<CarrierAutomationConfig | null>(null)

// Backend rendering state
const backendPdfBlob = ref<Blob | null>(null)
const backendPdfUrl = ref<string | null>(null)
const useBackendRendering = ref(false)

function findDefaultTemplate(order: OrderDocument, allTemplates: PrintTemplate[]): PrintTemplate | null {
  const carrierId = order?.carrierId
  const invoiceType = order?.invoiceType

  if (!carrierId || !invoiceType) {
    return null
  }

  const templateId = resolvePrintTemplateId(carrierId, invoiceType, {
    carriers: carriersCache.value,
    carrierAutomationConfig: carrierAutomationConfigCache.value,
  })

  if (!templateId) {
    return null
  }

  return allTemplates.find((t) => t.id === templateId) || null
}

async function initializePreviewItems() {
  if (!props.orders.length || !props.templates.length) {
    previewItems.value = []
    return
  }

  loading.value = true
  loadingProgress.value = 0
  loadingText.value = 'プレビューを準備しています...'
  loadingError.value = false

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

  for (let i = 0; i < props.orders.length; i++) {
    const order = props.orders[i]
    if (!order) continue

    const pdfSource = resolvePdfSource(order.carrierId, order.invoiceType, {
      carriers: carriersCache.value,
      carrierAutomationConfig: carrierAutomationConfigCache.value,
    })

    const template = pdfSource === 'b2-webapi' ? null : findDefaultTemplate(order, props.templates)

    if (template && pdfSource === 'local') {
      templateIdSet.add(template.id)
    }

    const carrier = carriersCache.value.find((c) => c._id === order.carrierId)
    const carrierName = carrier?.name || order.carrierId || '不明'

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
      orderSourceCompany: null,
      pdfSource,
    })

    loadingProgress.value = Math.round((i + 1) / props.orders.length * 15 + 10)
  }

  previewItems.value = items

  loadingText.value = 'ご依頼主情報を読み込んでいます...'
  const orderSourceCompanyIds = new Set<string>()
  for (const order of props.orders) {
    if (order.orderSourceCompanyId) {
      orderSourceCompanyIds.add(order.orderSourceCompanyId)
    }
  }

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

  for (const item of items) {
    if (item.order.orderSourceCompanyId) {
      item.orderSourceCompany = orderSourceCompanyMap.get(item.order.orderSourceCompanyId) || null
    }
  }

  loadingProgress.value = 35

  loadingText.value = 'テンプレートを読み込んでいます...'
  templateCache.value.clear()

  const templatePromises = Array.from(templateIdSet).map(async (templateId) => {
    try {
      const fullTemplate = await fetchPrintTemplate(templateId)
      templateCache.value.set(templateId, fullTemplate)
    } catch (e: any) {
      console.error(`Failed to load template ${templateId}:`, e)
    }
  })

  await Promise.all(templatePromises)
  loadingProgress.value = 50

  const localItemsToRender = items.filter(
    (item) => !item.error && item.pdfSource === 'local' && item.template
  )

  if (localItemsToRender.length > BACKEND_RENDER_THRESHOLD) {
    await renderWithBackend(localItemsToRender)
  } else {
    await renderWithFrontend(localItemsToRender)
  }

  loading.value = false
  loadingProgress.value = 100
}

async function renderWithBackend(localItems: PreviewItem[]) {
  loadingText.value = 'サーバーでレンダリング中...'
  useBackendRendering.value = true

  const backendAvailable = await checkRenderHealth()
  if (!backendAvailable) {
    console.warn('Backend render service unavailable, falling back to frontend rendering')
    await renderWithFrontend(localItems)
    return
  }

  try {
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

    const pdfBlob = await renderKonvaOnBackend(renderItems, {
      exportDpi: exportDpi.value,
      background: 'white',
    })

    backendPdfBlob.value = pdfBlob
    backendPdfUrl.value = URL.createObjectURL(pdfBlob)

    for (const item of localItems) {
      item.rendering = false
      item.imageUrl = null
    }

    loadingProgress.value = 100
  } catch (error: any) {
    console.error('Backend render failed, falling back to frontend:', error)
    alert('サーバーレンダリングに失敗しました。フロントエンドで再試行します...')
    useBackendRendering.value = false
    await renderWithFrontend(localItems)
  }
}

async function renderWithFrontend(localItems: PreviewItem[]) {
  loadingText.value = '画像を生成しています...'
  useBackendRendering.value = false

  for (let i = 0; i < localItems.length; i++) {
    const item = localItems[i]
    if (!item || !item.template) continue

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

function cleanupBlobUrls() {
  previewItems.value.forEach((item) => {
    if (item.blobUrl) {
      URL.revokeObjectURL(item.blobUrl)
      item.blobUrl = null
      item.imageUrl = null
    }
  })

  if (backendPdfUrl.value) {
    URL.revokeObjectURL(backendPdfUrl.value)
    backendPdfUrl.value = null
  }
  backendPdfBlob.value = null
  useBackendRendering.value = false
}

async function handlePrintAll() {
  const localItems = previewItems.value.filter(
    (item) => !item.error && item.pdfSource === 'local' && item.template
  )
  const b2WebapiItems = previewItems.value.filter(
    (item) => !item.error && item.pdfSource === 'b2-webapi' && item.order.trackingId
  )

  const totalItems = localItems.length + b2WebapiItems.length
  if (totalItems === 0) {
    alert('印刷可能な項目がありません')
    return
  }

  const printConfig = getPrintConfig()
  let successCount = 0
  let failCount = 0

  alert(`${totalItems}件の印刷を開始しています...`)

  // 1. Print b2-webapi items
  if (b2WebapiItems.length > 0) {
    try {
      const trackingNumbers = b2WebapiItems.map((item) => item.order.trackingId!).filter(Boolean)
      if (trackingNumbers.length > 0) {
        const pdfBlob = await yamatoB2FetchBatchPdf(trackingNumbers)
        await printPdfBlob(pdfBlob, { title: 'B2 Cloud Labels', templateType: 'b2-cloud' })
        successCount += b2WebapiItems.length

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
      alert(`B2 Cloud PDF取得エラー: ${e?.message || e}`)
      failCount += b2WebapiItems.length
    }
  }

  // 2. Print local template items
  if (localItems.length > 0) {
    if (useBackendRendering.value && backendPdfBlob.value) {
      try {
        const firstTemplateId = localItems[0]?.template?.id
        await printPdfBlob(backendPdfBlob.value, {
          title: 'Print Labels',
          templateId: firstTemplateId,
          templateType: 'print',
        })
        successCount += localItems.length

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
        alert(`印刷エラー: ${e?.message || e}`)
        failCount += localItems.length
      }
    } else {
      for (const item of localItems) {
        if (!item.blobUrl || !item.template) continue

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

          if (recordPrinted.value) {
            try {
              await updateShipmentOrderStatus(String(item.order._id), 'mark-printed')
            } catch (e: any) {
              console.error(`Failed to mark order as printed: ${item.order._id}`, e)
            }
          }

          if (printConfig.method !== 'local-bridge') {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        } catch (e: any) {
          console.error(`Failed to print order ${item.order.orderNumber || item.order._id}:`, e)
          alert(`注文 ${item.order.orderNumber || item.order._id} の印刷に失敗しました`)
          failCount++
        }
      }
    }
  }

  if (printConfig.method === 'local-bridge') {
    if (successCount > 0) {
      alert(`${successCount}件の印刷ジョブを送信しました${failCount > 0 ? `（${failCount}件失敗）` : ''}`)
    } else {
      alert('印刷に失敗しました')
    }
  } else {
    if (successCount > 0) {
      alert(`${successCount}件の印刷を開始しました（印刷ダイアログで100%スケール/余白なしを選択してください）${failCount > 0 ? `（${failCount}件失敗）` : ''}`)
    } else {
      alert('印刷に失敗しました')
    }
  }

  if (successCount > 0) {
    emit('printed')
  }
}

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
.toolbar { margin-bottom: 16px; }
.toolbar-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar-item { display: flex; align-items: center; gap: 6px; }
.toolbar-label { font-size: 13px; color: #606266; white-space: nowrap; }
.preview-container { min-height: 400px; max-height: 600px; overflow-y: auto; border: 1px solid #e5e7eb; background: #f9fafb; padding: 16px; }
.loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; }
.progress-bar-container { width: 200px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
.progress-bar { height: 100%; background: #409eff; border-radius: 3px; transition: width 0.3s ease; }
.progress-bar.exception { background: #f56c6c; }
.loading-text { margin-top: 16px; color: #6b7280; font-size: 14px; }
.empty-container { display: flex; align-items: center; justify-content: center; padding: 40px; }
.empty-text { color: #6b7280; font-size: 14px; }
.preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.preview-item { border: 1px solid #e5e7eb; background: white; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
.preview-item-error { border-color: #fca5a5; background: #fef2f2; }
.preview-item-header { padding: 8px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; font-size: 12px; }
.preview-item-number { color: #6b7280; font-weight: 500; }
.preview-item-title { flex: 1; color: #111827; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-item-content { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 200px; padding: 12px; }
.preview-error { color: #dc2626; font-size: 12px; text-align: center; padding: 8px; }
.preview-rendering { color: #3b82f6; font-size: 12px; text-align: center; padding: 8px; }
.preview-placeholder { color: #9ca3af; font-size: 12px; text-align: center; }
.preview-image { max-width: 100%; max-height: 100%; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 4px; }
.preview-b2-cloud { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px; background: #fef9c3; border: 1px dashed #ca8a04; border-radius: 8px; width: 100%; }
.b2-cloud-icon { font-size: 24px; font-weight: bold; color: #ca8a04; background: white; padding: 8px 16px; border-radius: 4px; border: 2px solid #ca8a04; }
.b2-cloud-text { color: #854d0e; font-size: 12px; font-weight: 500; }
.b2-cloud-tracking { color: #a16207; font-size: 11px; font-family: monospace; }
.preview-backend-rendered { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 16px; background: #dcfce7; border: 1px dashed #16a34a; border-radius: 8px; width: 100%; }
.backend-rendered-icon { font-size: 24px; font-weight: bold; color: #16a34a; background: white; padding: 8px 16px; border-radius: 50%; border: 2px solid #16a34a; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
.backend-rendered-text { color: #166534; font-size: 12px; font-weight: 500; }
.o-toggle { position:relative; display:inline-block; width:40px; height:20px; cursor:pointer; }
.o-toggle input { opacity:0; width:0; height:0; }
.o-toggle-slider { position:absolute; inset:0; background:#ccc; border-radius:20px; transition:background .2s; }
.o-toggle-slider::before { content:''; position:absolute; left:2px; top:2px; width:16px; height:16px; background:#fff; border-radius:50%; transition:transform .2s; }
.o-toggle input:checked + .o-toggle-slider { background:#714b67; }
.o-toggle input:checked + .o-toggle-slider::before { transform:translateX(20px); }
</style>
