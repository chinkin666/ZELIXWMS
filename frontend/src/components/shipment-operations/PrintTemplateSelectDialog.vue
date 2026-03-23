<template>
  <Dialog :open="visible" @update:open="visible = $event">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>印刷テンプレートを選択</DialogTitle>
      </DialogHeader>
    <div class="dialog-content">
      <div class="template-selector">
        <div class="o-form-group">
          <label class="o-form-label">テンプレート</label>
          <select
           
            v-model="selectedTemplateId"
            style="width: 100%"
          >
            <option value="" disabled>印刷テンプレートを選択してください</option>
            <option
              v-for="template in templates"
              :key="template.id"
              :value="template.id"
            >
              {{ template.name }} ({{ template.canvas.widthMm }}mm x {{ template.canvas.heightMm }}mm)
            </option>
          </select>
        </div>
      </div>

      <div class="preview-section">
        <div class="preview-header">
          <div class="preview-title">
            <span>プレビュー</span>
            <span v-if="orders.length > 0" class="page-info">
              （{{ currentIndex + 1 }} / {{ orders.length }}）
            </span>
          </div>
          <div class="preview-actions">
            <div v-if="orders.length > 1" class="btn-group">
              <Button variant="secondary" size="sm" :disabled="currentIndex === 0" @click="goToPrevious">前へ</Button>
              <Button variant="secondary" size="sm" :disabled="currentIndex >= orders.length - 1" @click="goToNext">次へ</Button>
            </div>
            <Button v-if="imageUrl" variant="secondary" size="sm" style="margin-left: 8px" @click="downloadPreviewPng">プレビューをダウンロード</Button>
          </div>
        </div>
        <div class="preview">
          <div v-if="rendering" class="loading">プレビューを生成中...</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else-if="!imageUrl && selectedTemplateId && orders.length > 0" class="placeholder">
            プレビュー生成までお待ちください
          </div>
          <div v-else-if="!selectedTemplateId" class="placeholder">
            テンプレートを選択してプレビューを表示
          </div>
          <div v-else-if="orders.length === 0" class="placeholder">
            プレビュー可能な注文がありません
          </div>
          <img v-else :src="imageUrl" class="preview-img" />
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="secondary" @click="visible = false">キャンセル</Button>
      <Button variant="default" :disabled="!selectedTemplateId" @click="handleConfirm">確定</Button>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { fetchPrintTemplates, fetchPrintTemplate } from '@/api/printTemplates'
import type { PrintTemplate } from '@/types/printTemplate'
import type { OrderDocument } from '@/types/order'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import { fetchOrderSourceCompanyById } from '@/api/orderSourceCompany'
import { renderTemplateToPngBlob } from '@/utils/print/renderTemplateToPng'

const props = defineProps<{
  modelValue: boolean
  carrierId?: string
  orders?: OrderDocument[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', template: PrintTemplate): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const templates = ref<PrintTemplate[]>([])
const selectedTemplateId = ref<string>('')
const loading = ref(false)
const rendering = ref(false)
const error = ref<string>('')
const imageUrl = ref<string>('')
let lastObjectUrl: string | null = null
const orderSourceCompany = ref<OrderSourceCompany | null>(null)
const currentIndex = ref(0)
const orders = computed(() => props.orders || [])
const currentOrder = computed(() => orders.value[currentIndex.value] || null)

watch(
  () => props.modelValue,
  async (v) => {
    if (v) {
      currentIndex.value = 0
      await loadTemplates()
      await loadOrderSourceCompany()
    } else {
      selectedTemplateId.value = ''
      cleanupImage()
      orderSourceCompany.value = null
      currentIndex.value = 0
    }
  },
)

watch(
  () => [selectedTemplateId.value, currentIndex.value],
  () => {
    if (visible.value && selectedTemplateId.value && currentOrder.value) {
      queueAutoRender()
    } else {
      cleanupImage()
    }
  },
)

onBeforeUnmount(() => cleanupImage())

function cleanupImage() {
  error.value = ''
  imageUrl.value = ''
  if (lastObjectUrl) {
    URL.revokeObjectURL(lastObjectUrl)
    lastObjectUrl = null
  }
}

let autoRenderTimer: number | null = null
function queueAutoRender() {
  if (autoRenderTimer) window.clearTimeout(autoRenderTimer)
  autoRenderTimer = window.setTimeout(() => {
    autoRenderTimer = null
    void handleRender()
  }, 300)
}

async function handleRender() {
  if (!selectedTemplateId.value || !currentOrder.value) return

  rendering.value = true
  error.value = ''

  try {
    cleanupImage()

    // Load OrderSourceCompany for current order
    await loadOrderSourceCompany()

    // Fetch full template details
    const template = await fetchPrintTemplate(selectedTemplateId.value)

    const blob = await renderTemplateToPngBlob(
      template,
      currentOrder.value,
      { exportDpi: 203, background: 'white' },
      orderSourceCompany.value,
    )
    const url = URL.createObjectURL(blob)
    lastObjectUrl = url
    imageUrl.value = url
  } catch (e: any) {
    error.value = e?.message || String(e)
    // プレビューレンダリングエラー / Preview render error
  } finally {
    rendering.value = false
  }
}

async function loadOrderSourceCompany() {
  if (!currentOrder.value?.orderSourceCompanyId) {
    orderSourceCompany.value = null
    return
  }
  try {
    orderSourceCompany.value = await fetchOrderSourceCompanyById(currentOrder.value.orderSourceCompanyId)
  } catch (e) {
    // ご依頼主情報読み込み失敗 / Failed to load OrderSourceCompany
    orderSourceCompany.value = null
  }
}

const goToPrevious = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

const goToNext = () => {
  if (currentIndex.value < orders.value.length - 1) {
    currentIndex.value++
  }
}

const loadTemplates = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const params: { carrierId?: string } = {}
    if (props.carrierId) {
      params.carrierId = props.carrierId
    }
    const fetched = await fetchPrintTemplates(params)
    templates.value = fetched
  } catch (e: any) {
    // 印刷テンプレート読み込み失敗 / Failed to load print templates
    alert(e?.message || 'テンプレートの読み込みに失敗しました')
    templates.value = []
  } finally {
    loading.value = false
  }
}

const downloadPreviewPng = () => {
  if (!imageUrl.value || !currentOrder.value) return
  const a = document.createElement('a')
  a.href = imageUrl.value
  a.download = `preview-${currentOrder.value?.orderNumber || currentOrder.value?._id || 'print'}.png`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const handleConfirm = () => {
  const template = templates.value.find((t) => t.id === selectedTemplateId.value)
  if (!template) {
    alert('テンプレートを選択してください')
    return
  }
  emit('confirm', template)
  visible.value = false
}
</script>

<style scoped>
.dialog-content { display: flex; gap: 20px; min-height: 500px; }
.template-selector { flex: 0 0 300px; }
.preview-section { flex: 1; display: flex; flex-direction: column; }
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: 600;
  color: #303133;
}
.preview-title { display: flex; align-items: center; gap: 8px; }
.page-info { font-weight: normal; color: #909399; font-size: 14px; }
.preview-actions { display: flex; align-items: center; gap: 8px; }
.btn-group { display: flex; gap: 4px; }
.preview {
  flex: 1;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 4px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 450px;
}
.loading, .placeholder { color: #6b7280; font-size: 14px; }
.error { color: #b91c1c; padding: 12px; text-align: center; }
.preview-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.o-form-group { margin-bottom:1rem; }
.o-form-label { display:block; font-size:13px; font-weight:500; color:#374151; margin-bottom:0.25rem; }
</style>
