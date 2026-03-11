<template>
  <Teleport to="body">
    <Transition name="slide-in">
      <div v-if="visible" class="batch-print-panel">
        <div class="panel-header">
          <span class="panel-title">一括印刷</span>
          <button class="o-btn o-btn-sm" style="border:none; background:none; font-size:18px; cursor:pointer" @click="handleClose" :disabled="printing">✕</button>
        </div>

        <div class="panel-content">
          <!-- Settings -->
          <div class="settings-section">
            <div class="setting-row">
              <span class="setting-label">DPI</span>
              <select class="o-input" v-model.number="exportDpi" style="width: 80px" :disabled="printing">
                <option :value="203">203</option>
                <option :value="300">300</option>
              </select>
            </div>
            <div class="setting-row">
              <span class="setting-label">印刷済み登録</span>
              <label class="o-toggle">
                <input type="checkbox" v-model="recordPrinted" :disabled="printing" />
                <span class="o-toggle-slider"></span>
              </label>
            </div>
          </div>

          <!-- Status -->
          <div class="status-section">
            <div class="status-counts">
              <div class="count-item">
                <span class="count-value">{{ totalCount }}</span>
                <span class="count-label">合計</span>
              </div>
              <div class="count-item count-local">
                <span class="count-value">{{ localCount }}</span>
                <span class="count-label">ローカル</span>
              </div>
              <div class="count-item count-b2">
                <span class="count-value">{{ b2Count }}</span>
                <span class="count-label">B2 Cloud</span>
              </div>
              <div v-if="errorCount > 0" class="count-item count-error">
                <span class="count-value">{{ errorCount }}</span>
                <span class="count-label">エラー</span>
              </div>
            </div>

            <!-- Progress -->
            <div v-if="printing" class="progress-section">
              <div class="progress-bar-container">
                <div class="progress-bar" :class="progressStatus" :style="{ width: progressPercent + '%' }"></div>
              </div>
              <div class="progress-text">{{ progressText }}</div>
            </div>

            <!-- Result -->
            <div v-if="printResult" class="result-section" :class="printResult.type">
              <span v-if="printResult.type === 'success'">&#10003;</span>
              <span v-else>&#10007;</span>
              <span>{{ printResult.message }}</span>
            </div>
          </div>

          <!-- Error List (collapsed by default) -->
          <div v-if="errorItems.length > 0" class="error-section">
            <div class="error-header" @click="showErrors = !showErrors">
              <span>エラー詳細 ({{ errorItems.length }}件)</span>
              <span class="arrow-icon" :class="{ rotated: showErrors }">&#9660;</span>
            </div>
            <Transition name="expand">
              <div v-if="showErrors" class="error-list">
                <div v-for="(item, index) in errorItems" :key="index" class="error-item">
                  <span class="error-order">{{ item.order.orderNumber || item.order._id }}</span>
                  <span class="error-message">{{ item.error }}</span>
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="panel-footer">
          <OButton variant="secondary" @click="handleClose" :disabled="printing || saving">キャンセル</OButton>
          <OButton variant="secondary" @click="handleSavePdf" :disabled="totalCount === 0 || printing || saving">
            {{ saving ? '保存中...' : 'PDFを保存' }}
          </OButton>
          <OButton variant="primary" @click="handlePrint" :disabled="totalCount === 0 || saving || printing">
            {{ printing ? '印刷中...' : '印刷開始' }}
          </OButton>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import type { OrderDocument } from '@/types/order'
import type { PrintTemplate } from '@/types/printTemplate'
import type { Carrier } from '@/types/carrier'
import type { CarrierAutomationConfig, PdfSource } from '@/types/carrierAutomation'
import { updateShipmentOrderStatusBulk } from '@/api/shipmentOrders'
import { fetchCarriers } from '@/api/carrier'
import { fetchCarrierAutomationConfig, yamatoB2FetchBatchPdf } from '@/api/carrierAutomation'
import { renderKonvaOnBackend } from '@/api/render'
import { printPdfBlob } from '@/utils/print/printImage'
import { resolvePrintTemplateId, resolvePdfSource } from '@/utils/print/resolvePrintTemplate'

interface PrintItem {
  order: OrderDocument
  templateId: string | null
  pdfSource: PdfSource
  error: string | null
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

// Settings
const exportDpi = ref<number>(203)
const recordPrinted = ref(true)

// State
const printing = ref(false)
const saving = ref(false)
const progressPercent = ref(0)
const progressText = ref('')
const progressStatus = ref<'' | 'success' | 'exception'>('')
const printResult = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const showErrors = ref(false)

// Data
const printItems = ref<PrintItem[]>([])
const carriersCache = ref<Carrier[]>([])
const carrierAutomationConfigCache = ref<CarrierAutomationConfig | null>(null)

// Computed counts
const localItems = computed(() => printItems.value.filter((i) => !i.error && i.pdfSource === 'local' && i.templateId))
const b2Items = computed(() => printItems.value.filter((i) => !i.error && i.pdfSource === 'b2-webapi' && i.order.trackingId))
const errorItems = computed(() => printItems.value.filter((i) => i.error))

const localCount = computed(() => localItems.value.length)
const b2Count = computed(() => b2Items.value.length)
const errorCount = computed(() => errorItems.value.length)
const totalCount = computed(() => localCount.value + b2Count.value)

// Initialize on open
watch(
  () => props.modelValue,
  async (v) => {
    if (v) {
      await initialize()
    } else {
      reset()
    }
  },
)

async function initialize() {
  printResult.value = null
  progressPercent.value = 0
  progressText.value = '準備中...'

  // Load carrier data
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

  // Build print items
  const items: PrintItem[] = []
  for (const order of props.orders) {
    const pdfSource = resolvePdfSource(order.carrierId, order.invoiceType, {
      carriers: carriersCache.value,
      carrierAutomationConfig: carrierAutomationConfigCache.value,
    })

    let templateId: string | null = null
    let error: string | null = null

    if (pdfSource === 'local') {
      templateId = resolvePrintTemplateId(order.carrierId, order.invoiceType, {
        carriers: carriersCache.value,
        carrierAutomationConfig: carrierAutomationConfigCache.value,
      }) ?? null
      if (!templateId) {
        const carrier = carriersCache.value.find((c) => c._id === order.carrierId)
        error = `テンプレートが見つかりません（配送業者: ${carrier?.name || order.carrierId}）`
      }
    } else if (pdfSource === 'b2-webapi' && !order.trackingId) {
      error = '追跡番号がありません'
    }

    items.push({ order, templateId, pdfSource, error })
  }

  printItems.value = items
  progressText.value = ''
}

function reset() {
  printItems.value = []
  printing.value = false
  progressPercent.value = 0
  progressText.value = ''
  progressStatus.value = ''
  printResult.value = null
  showErrors.value = false
}

function handleClose() {
  if (!printing.value && !saving.value) {
    visible.value = false
  }
}

async function handlePrint() {
  if (printing.value || totalCount.value === 0) return

  printing.value = true
  printResult.value = null
  progressStatus.value = ''

  let successCount = 0
  let failCount = 0
  const printedOrderIds: string[] = []

  try {
    // Step 1: Render and print local items (backend rendering)
    if (localItems.value.length > 0) {
      progressText.value = `サーバーでレンダリング中... (${localItems.value.length}件)`
      progressPercent.value = 10

      try {
        // Prepare render items
        const renderItems = localItems.value.map((item) => ({
          templateId: item.templateId!,
          orderId: String(item.order._id),
          orderSourceCompanyId: item.order.orderSourceCompanyId,
        }))

        // Render on backend
        console.log(`[BatchPrint] Requesting backend render for ${renderItems.length} items...`)
        const pdfBlob = await renderKonvaOnBackend(renderItems, {
          exportDpi: exportDpi.value,
          background: 'white',
        })

        console.log(`[BatchPrint] Received PDF blob: ${(pdfBlob.size / 1024 / 1024).toFixed(2)}MB`)
        progressPercent.value = 60
        progressText.value = '印刷中...'

        // Print (use first template's printer settings)
        console.log('[BatchPrint] Sending PDF to printer...')
        const firstTemplateId = localItems.value[0]?.templateId ?? undefined
        await printPdfBlob(pdfBlob, {
          title: 'Print Labels',
          templateId: firstTemplateId ?? undefined,
          templateType: 'print',
        })

        console.log('[BatchPrint] Print completed successfully')
        successCount += localItems.value.length
        printedOrderIds.push(...localItems.value.map((i) => String(i.order._id)))
      } catch (e: any) {
        console.error('[BatchPrint] Failed to print local items:', e)
        alert(`印刷エラー: ${e?.message || e}`)
        failCount += localItems.value.length
      }
    }

    // Step 2: Fetch and print B2 Cloud items (grouped by invoiceType for per-type printer settings)
    if (b2Items.value.length > 0) {
      progressPercent.value = 70

      // Group by invoiceType
      const b2Groups = new Map<string, PrintItem[]>()
      for (const item of b2Items.value) {
        const key = item.order.invoiceType || '0'
        if (!b2Groups.has(key)) b2Groups.set(key, [])
        b2Groups.get(key)!.push(item)
      }

      let groupIdx = 0
      for (const [invoiceType, groupItems] of b2Groups) {
        groupIdx++
        progressText.value = `B2 CloudからPDFを取得中... (${groupIdx}/${b2Groups.size}グループ, ${groupItems.length}件)`

        try {
          const trackingNumbers = groupItems.map((i) => i.order.trackingId!).filter(Boolean)
          const pdfBlob = await yamatoB2FetchBatchPdf(trackingNumbers)

          progressPercent.value = 70 + Math.round((groupIdx / b2Groups.size) * 20)
          progressText.value = '印刷中...'

          await printPdfBlob(pdfBlob, {
            title: 'B2 Cloud Labels',
            templateType: 'b2-cloud',
            invoiceType,
          })

          successCount += groupItems.length
          printedOrderIds.push(...groupItems.map((i) => String(i.order._id)))
        } catch (e: any) {
          console.error(`Failed to print B2 items (invoiceType=${invoiceType}):`, e)
          failCount += groupItems.length
        }
      }
    }

    // Step 3: Mark as printed (batch)
    if (recordPrinted.value && printedOrderIds.length > 0) {
      progressPercent.value = 95
      progressText.value = '印刷済みを登録中...'

      try {
        await updateShipmentOrderStatusBulk(printedOrderIds, 'mark-printed')
      } catch (e: any) {
        console.error('Failed to mark orders as printed:', e)
        // Don't count as fail - printing succeeded
      }
    }

    // Done
    progressPercent.value = 100

    if (successCount > 0 && failCount === 0) {
      progressStatus.value = 'success'
      printResult.value = {
        type: 'success',
        message: `${successCount}件の印刷が完了しました`,
      }
      emit('printed')
    } else if (successCount > 0 && failCount > 0) {
      progressStatus.value = ''
      printResult.value = {
        type: 'success',
        message: `${successCount}件成功、${failCount}件失敗`,
      }
      emit('printed')
    } else {
      progressStatus.value = 'exception'
      printResult.value = {
        type: 'error',
        message: '印刷に失敗しました',
      }
    }
  } catch (e: any) {
    console.error('Print error:', e)
    progressStatus.value = 'exception'
    printResult.value = {
      type: 'error',
      message: e?.message || '印刷に失敗しました',
    }
  } finally {
    printing.value = false
    progressText.value = ''
  }
}

async function handleSavePdf() {
  if (saving.value || totalCount.value === 0) return

  saving.value = true
  printResult.value = null
  progressStatus.value = ''

  try {
    // Step 1: Render local items to PDF
    if (localItems.value.length > 0) {
      progressText.value = `サーバーでレンダリング中... (${localItems.value.length}件)`
      progressPercent.value = 30

      const renderItems = localItems.value.map((item) => ({
        templateId: item.templateId!,
        orderId: String(item.order._id),
        orderSourceCompanyId: item.order.orderSourceCompanyId,
      }))

      console.log(`[BatchPrint] Requesting backend render for ${renderItems.length} items...`)
      const pdfBlob = await renderKonvaOnBackend(renderItems, {
        exportDpi: exportDpi.value,
        background: 'white',
      })

      console.log(`[BatchPrint] Received PDF blob: ${(pdfBlob.size / 1024 / 1024).toFixed(2)}MB`)
      progressPercent.value = 80
      progressText.value = 'ダウンロード中...'

      // Download PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `labels_${new Date().toISOString().slice(0, 10)}_${localItems.value.length}件.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    // Step 2: Fetch and save B2 Cloud items
    if (b2Items.value.length > 0) {
      progressPercent.value = 85
      progressText.value = `B2 CloudからPDFを取得中... (${b2Items.value.length}件)`

      const trackingNumbers = b2Items.value.map((i) => i.order.trackingId!).filter(Boolean)
      const pdfBlob = await yamatoB2FetchBatchPdf(trackingNumbers)

      progressPercent.value = 95
      progressText.value = 'ダウンロード中...'

      // Download B2 PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `b2_labels_${new Date().toISOString().slice(0, 10)}_${b2Items.value.length}件.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    progressPercent.value = 100
    progressStatus.value = 'success'
    printResult.value = {
      type: 'success',
      message: `${totalCount.value}件のPDFを保存しました`,
    }
  } catch (e: any) {
    console.error('Save PDF error:', e)
    progressStatus.value = 'exception'
    printResult.value = {
      type: 'error',
      message: e?.message || 'PDF保存に失敗しました',
    }
  } finally {
    saving.value = false
    progressText.value = ''
  }
}

onBeforeUnmount(() => {
  reset()
})
</script>

<style scoped>
.batch-print-panel {
  position: fixed;
  top: 60px;
  right: 0;
  bottom: 0;
  width: 400px;
  background: white;
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}
.panel-title { font-size: 16px; font-weight: 600; color: #111827; }
.panel-content { flex: 1; overflow-y: auto; padding: 16px; }
.settings-section { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
.setting-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.setting-row:last-child { margin-bottom: 0; }
.setting-label { font-size: 14px; color: #374151; }
.status-section { margin-bottom: 16px; }
.status-counts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
.count-item { background: #f3f4f6; border-radius: 8px; padding: 12px; text-align: center; }
.count-item.count-local { background: #dcfce7; }
.count-item.count-b2 { background: #fef9c3; }
.count-item.count-error { background: #fee2e2; }
.count-value { display: block; font-size: 24px; font-weight: 700; color: #111827; }
.count-label { font-size: 12px; color: #6b7280; }
.progress-section { margin-bottom: 12px; }
.progress-bar-container { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
.progress-bar { height: 100%; background: #409eff; border-radius: 3px; transition: width 0.3s ease; }
.progress-bar.success { background: #67c23a; }
.progress-bar.exception { background: #f56c6c; }
.progress-text { margin-top: 8px; font-size: 13px; color: #6b7280; text-align: center; }
.result-section { display: flex; align-items: center; gap: 8px; padding: 12px; border-radius: 8px; font-size: 14px; }
.result-section.success { background: #dcfce7; color: #166534; }
.result-section.error { background: #fee2e2; color: #991b1b; }
.error-section { border-top: 1px solid #e5e7eb; padding-top: 16px; }
.error-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 14px; color: #dc2626; padding: 8px 0; }
.arrow-icon { transition: transform 0.2s; font-size: 10px; }
.arrow-icon.rotated { transform: rotate(180deg); }
.error-list { max-height: 200px; overflow-y: auto; margin-top: 8px; }
.error-item { display: flex; flex-direction: column; padding: 8px; background: #fef2f2; border-radius: 4px; margin-bottom: 8px; font-size: 12px; }
.error-order { font-weight: 500; color: #991b1b; }
.error-message { color: #dc2626; margin-top: 2px; }
.panel-footer { display: flex; justify-content: flex-end; gap: 12px; padding: 12px 16px; border-top: 1px solid #e5e7eb; background: #f9fafb; }
/* Toggle */
.o-toggle { position:relative; display:inline-block; width:40px; height:20px; cursor:pointer; }
.o-toggle input { opacity:0; width:0; height:0; }
.o-toggle-slider { position:absolute; inset:0; background:#ccc; border-radius:20px; transition:background .2s; }
.o-toggle-slider::before { content:''; position:absolute; left:2px; top:2px; width:16px; height:16px; background:#fff; border-radius:50%; transition:transform .2s; }
.o-toggle input:checked + .o-toggle-slider { background:#714b67; }
.o-toggle input:checked + .o-toggle-slider::before { transform:translateX(20px); }
/* Animations */
.slide-in-enter-active, .slide-in-leave-active { transition: transform 0.3s ease; }
.slide-in-enter-from, .slide-in-leave-to { transform: translateX(100%); }
.expand-enter-active, .expand-leave-active { transition: all 0.2s ease; overflow: hidden; }
.expand-enter-from, .expand-leave-to { max-height: 0; opacity: 0; }
.expand-enter-to, .expand-leave-from { max-height: 200px; opacity: 1; }
</style>
