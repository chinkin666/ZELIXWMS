<template>
  <el-dialog v-model="visible" title="印刷プレビュー" width="980px">
    <div class="toolbar">
      <el-form inline>
        <el-form-item label="テンプレート">
          <el-select v-model="selectedTemplateId" placeholder="テンプレートを選択" style="width: 360px">
            <el-option v-for="t in availableTemplates" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>

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
          <el-button :disabled="!imageUrl || matching" @click="downloadPng">下载PNG</el-button>
        </el-form-item>

        <el-form-item>
          <el-button type="success" :disabled="!imageUrl || !selectedTemplate || matching" @click="handlePrint">打印</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="preview">
      <div v-if="matching" class="matching">テンプレートを検索中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="rendering" class="rendering">レンダリング中...</div>
      <div v-else-if="!imageUrl" class="placeholder">テンプレートを選択してプレビューを生成してください</div>
      <img v-else :src="imageUrl" class="img" />
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
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

/**
 * 根据订单的 carrierId 和 invoiceType 匹配可用的模板
 * 匹配规则：
 * 1. 如果都匹配得上，优先选默认的（isDefault）
 * 2. 多个默认选第一个
 * 3. 如果没有默认，选匹配上的第一个
 */
function findMatchingTemplates(order: OrderDocument, allTemplates: PrintTemplate[]): PrintTemplate[] {
  const carrierId = order?.carrierId
  const invoiceType = order?.invoiceType

  if (!carrierId || !invoiceType) {
    return []
  }

  // 找出所有匹配的模板（carrierId 和 invoiceType 都匹配）
  // 匹配规则：
  // - 模板的 carrierId 为 'any' 或与订单的 carrierId 完全匹配
  // - 模板的 invoiceType 为 'any' 或与订单的 invoiceType 完全匹配
  const matched = allTemplates.filter((t) => {
    const carrierMatch = t.carrierId === 'any' || t.carrierId === carrierId
    const invoiceMatch = t.invoiceType === 'any' || t.invoiceType === invoiceType
    return carrierMatch && invoiceMatch
  })

  return matched
}

/**
 * 从匹配的模板中选择第一个（优先默认模板）
 */
function selectBestTemplate(matchedTemplates: PrintTemplate[]): PrintTemplate | null {
  if (matchedTemplates.length === 0) {
    return null
  }

  // 优先选择默认模板
  const defaultTemplates = matchedTemplates.filter((t) => t.isDefault === true)
  if (defaultTemplates.length > 0) {
    return defaultTemplates[0] || null
  }

  // 如果没有默认模板，返回第一个匹配的
  return matchedTemplates[0] || null
}

/**
 * 异步阻塞：找出所有可用模板 → 选择第一个 → 开始渲染
 */
async function matchAndSelectTemplate() {
  matching.value = true
  error.value = ''

  try {
    // 1. 找出所有可用模板
    const availableTemplates = findMatchingTemplates(props.order, props.templates)
    
    if (availableTemplates.length === 0) {
      error.value = '該当するテンプレートが見つかりません（配送会社と送り状種類に一致するテンプレートが必要です）'
      selectedTemplateId.value = ''
      return
    }

    // 2. 选择第一个（优先默认）
    const bestTemplate = selectBestTemplate(availableTemplates)
    if (!bestTemplate) {
      error.value = 'テンプレートの選択に失敗しました'
      selectedTemplateId.value = ''
      return
    }

    // 3. 设置选中的模板ID
    selectedTemplateId.value = bestTemplate.id

    // 4. 自动触发渲染（通过 watch 监听 selectedTemplateId 变化）
  } catch (e: any) {
    error.value = e?.message || String(e)
    selectedTemplateId.value = ''
  } finally {
    matching.value = false
  }
}

const availableTemplates = computed(() => {
  // 显示所有匹配的模板供用户选择
  return findMatchingTemplates(props.order, props.templates)
})

const selectedTemplate = computed(() => {
  return props.templates.find((t) => t.id === selectedTemplateId.value)
})

// 当弹窗打开时，异步匹配并选择模板
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

    // 加载 OrderSourceCompany
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

    // 异步阻塞：匹配并选择模板
    await matchAndSelectTemplate()
  },
)

// 当模板或DPI变化时，重新渲染
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
      ElMessage.error(e?.message || '印刷済み登録失败')
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
    ElMessage.success('已触发打印（请在打印对话框选择100%缩放/无边距）')
  } catch (error: any) {
    console.error('Print error:', error)
    ElMessage.error(`打印失败: ${error?.message || String(error)}`)
  }

  if (recordPrinted.value) {
    try {
      const id = props.order?._id
      if (id) await updateShipmentOrderStatus(String(id), 'mark-printed')
      emit('printed')
    } catch (e: any) {
      ElMessage.error(e?.message || '印刷済み登録失败')
    }
  }
}
</script>

<style scoped>
.toolbar {
  margin-bottom: 10px;
}
.preview {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  height: 520px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.placeholder {
  color: #6b7280;
}
.matching {
  color: #3b82f6;
  padding: 12px;
}
.rendering {
  color: #3b82f6;
  padding: 12px;
}
.error {
  color: #b91c1c;
  padding: 12px;
}
.img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
