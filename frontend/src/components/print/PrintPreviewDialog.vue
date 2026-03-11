<template>
  <ODialog :open="visible" title="印刷プレビュー" @close="visible = false" width="980px">
    <div class="toolbar">
      <div class="toolbar-row">
        <div class="toolbar-item">
          <label class="toolbar-label">テンプレート</label>
          <select class="o-input" v-model="selectedTemplateId" style="width: 360px">
            <option value="" disabled>テンプレートを選択</option>
            <option v-for="t in availableTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </div>

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

        <OButton variant="secondary" size="sm" :disabled="!imageUrl || matching" @click="downloadPng">下载PNG</OButton>
        <OButton variant="primary" size="sm" :disabled="!imageUrl || !selectedTemplate || matching" @click="handlePrint">打印</OButton>
      </div>
    </div>

    <div class="preview">
      <div v-if="matching" class="matching">テンプレートを検索中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="rendering" class="rendering">レンダリング中...</div>
      <div v-else-if="!imageUrl" class="placeholder">テンプレートを選択してプレビューを生成してください</div>
      <img v-else :src="imageUrl" class="img" />
    </div>

    <template #footer>
      <OButton variant="secondary" @click="visible = false">关闭</OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import type { OrderDocument } from '@/types/order'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { PrintTemplate } from '@/types/printTemplate'
import { updateShipmentOrderStatus } from '@/api/shipmentOrders'
import { fetchOrderSourceCompanyById } from '@/api/orderSourceCompany'
import { renderTemplateToPngBlob } from '@/utils/print/renderTemplateToPng'
import { printImage } from '@/utils/print/printImage'

const props = defineProps<{
  modelValue: boolean
  order: OrderDocument
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

const selectedTemplateId = ref<string>('')
const exportDpi = ref<number>(203)
const recordPrinted = ref(true)
const rendering = ref(false)
const matching = ref(false)
const error = ref<string>('')

const imageUrl = ref<string>('')
let lastObjectUrl: string | null = null

const orderSourceCompany = ref<OrderSourceCompany | null>(null)

function findMatchingTemplates(order: OrderDocument, allTemplates: PrintTemplate[]): PrintTemplate[] {
  const carrierId = order?.carrierId
  const invoiceType = order?.invoiceType

  if (!carrierId || !invoiceType) {
    return []
  }

  const matched = allTemplates.filter((t) => {
    const carrierMatch = t.carrierId === 'any' || t.carrierId === carrierId
    const invoiceMatch = t.invoiceType === 'any' || t.invoiceType === invoiceType
    return carrierMatch && invoiceMatch
  })

  return matched
}

function selectBestTemplate(matchedTemplates: PrintTemplate[]): PrintTemplate | null {
  if (matchedTemplates.length === 0) {
    return null
  }

  const defaultTemplates = matchedTemplates.filter((t) => t.isDefault === true)
  if (defaultTemplates.length > 0) {
    return defaultTemplates[0] || null
  }

  return matchedTemplates[0] || null
}

async function matchAndSelectTemplate() {
  matching.value = true
  error.value = ''

  try {
    const availTemplates = findMatchingTemplates(props.order, props.templates)

    if (availTemplates.length === 0) {
      error.value = '該当するテンプレートが見つかりません（配送業者と送り状種類に一致するテンプレートが必要です）'
      selectedTemplateId.value = ''
      return
    }

    const bestTemplate = selectBestTemplate(availTemplates)
    if (!bestTemplate) {
      error.value = 'テンプレートの選択に失敗しました'
      selectedTemplateId.value = ''
      return
    }

    selectedTemplateId.value = bestTemplate.id
  } catch (e: any) {
    error.value = e?.message || String(e)
    selectedTemplateId.value = ''
  } finally {
    matching.value = false
  }
}

const availableTemplates = computed(() => {
  return findMatchingTemplates(props.order, props.templates)
})

const selectedTemplate = computed(() => {
  return props.templates.find((t) => t.id === selectedTemplateId.value)
})

watch(
  () => props.modelValue,
  async (v) => {
    if (!v) {
      cleanupImage()
      orderSourceCompany.value = null
      selectedTemplateId.value = ''
      matching.value = false
      error.value = ''
      return
    }

    if (props.order?.orderSourceCompanyId) {
      try {
        orderSourceCompany.value = await fetchOrderSourceCompanyById(props.order.orderSourceCompanyId)
      } catch (e) {
        console.error('Failed to load OrderSourceCompany:', e)
        orderSourceCompany.value = null
      }
    } else {
      orderSourceCompany.value = null
    }

    await matchAndSelectTemplate()
  },
)

watch(
  () => [selectedTemplateId.value, exportDpi.value],
  () => {
    if (!visible.value || !selectedTemplate.value || matching.value) return
    queueAutoRender()
  },
)

onBeforeUnmount(() => cleanupImage())

function cleanupImage() {
  error.value = ''
  imageUrl.value = ''
  if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl)
  lastObjectUrl = null
}

let autoRenderTimer: number | null = null
function queueAutoRender() {
  if (autoRenderTimer) window.clearTimeout(autoRenderTimer)
  autoRenderTimer = window.setTimeout(() => {
    autoRenderTimer = null
    void handleRender()
  }, 50)
}

async function handleRender() {
  if (!selectedTemplate.value) return

  rendering.value = true
  error.value = ''

  try {
    cleanupImage()
    const blob = await renderTemplateToPngBlob(selectedTemplate.value, props.order, {
      exportDpi: exportDpi.value,
      background: 'white',
    }, orderSourceCompany.value)
    const url = URL.createObjectURL(blob)
    lastObjectUrl = url
    imageUrl.value = url
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    rendering.value = false
  }
}

async function downloadPng() {
  if (!imageUrl.value || !props.order) return
  const a = document.createElement('a')
  a.href = imageUrl.value
  a.download = `waybill-${props.order?.orderNumber || props.order?._id || 'print'}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()

  if (recordPrinted.value) {
    try {
      const id = props.order?._id
      if (id) await updateShipmentOrderStatus(String(id), 'mark-printed')
      emit('printed')
    } catch (e: any) {
      alert(e?.message || '印刷済み登録失败')
    }
  }
}

async function handlePrint() {
  if (!imageUrl.value || !selectedTemplate.value || !props.order) return
  try {
    await printImage(imageUrl.value, {
      widthMm: selectedTemplate.value.canvas.widthMm,
      heightMm: selectedTemplate.value.canvas.heightMm,
      title: `Print ${props.order?.orderNumber || ''}`.trim(),
    })
    alert('已触发打印（请在打印对话框选择100%缩放/无边距）')
  } catch (error: any) {
    console.error('Print error:', error)
    alert(`打印失败: ${error?.message || String(error)}`)
  }

  if (recordPrinted.value) {
    try {
      const id = props.order?._id
      if (id) await updateShipmentOrderStatus(String(id), 'mark-printed')
      emit('printed')
    } catch (e: any) {
      alert(e?.message || '印刷済み登録失败')
    }
  }
}
</script>

<style scoped>
.toolbar { margin-bottom: 10px; }
.toolbar-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar-item { display: flex; align-items: center; gap: 6px; }
.toolbar-label { font-size: 13px; color: #606266; white-space: nowrap; }
.preview {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  height: 520px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder { color: #6b7280; }
.matching { color: #3b82f6; padding: 12px; }
.rendering { color: #3b82f6; padding: 12px; }
.error { color: #b91c1c; padding: 12px; }
.img { max-width: 100%; max-height: 100%; object-fit: contain; }
.o-toggle { position:relative; display:inline-block; width:40px; height:20px; cursor:pointer; }
.o-toggle input { opacity:0; width:0; height:0; }
.o-toggle-slider { position:absolute; inset:0; background:#ccc; border-radius:20px; transition:background .2s; }
.o-toggle-slider::before { content:''; position:absolute; left:2px; top:2px; width:16px; height:16px; background:#fff; border-radius:50%; transition:transform .2s; }
.o-toggle input:checked + .o-toggle-slider { background:#714b67; }
.o-toggle input:checked + .o-toggle-slider::before { transform:translateX(20px); }
</style>
