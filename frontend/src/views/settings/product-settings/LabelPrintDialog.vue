<template>
  <ODialog :open="visible" :title="t('wms.product.labelPrint', 'ラベル印刷')" @close="visible = false" width="720px">
    <div class="toolbar">
      <div class="toolbar-row">
        <div class="toolbar-item">
          <label class="toolbar-label">{{ t('wms.product.labelTemplate', 'テンプレート') }}</label>
          <select class="o-input" v-model="selectedTemplateId" style="width: 320px">
            <option value="" disabled>{{ t('wms.product.selectTemplate', 'テンプレートを選択') }}</option>
            <option v-for="tpl in labelTemplates" :key="tpl.id" :value="tpl.id">
              {{ tpl.name }} ({{ tpl.canvas.widthMm }}x{{ tpl.canvas.heightMm }}mm)
            </option>
          </select>
        </div>

        <div class="toolbar-item">
          <label class="toolbar-label">DPI</label>
          <select class="o-input" v-model.number="exportDpi" style="width: 100px">
            <option :value="203">203</option>
            <option :value="300">300</option>
          </select>
        </div>

        <OButton
          variant="primary"
          size="sm"
          :disabled="!imageUrl || rendering"
          @click="handlePrint"
        >
          {{ t('wms.product.print', '印刷') }}
        </OButton>
      </div>
    </div>

    <!-- 商品情報 / 商品信息 -->
    <div class="product-info">
      <span class="product-info-label">SKU:</span>
      <span class="product-info-value">{{ product?.sku || '-' }}</span>
      <span class="product-info-label">{{ t('wms.product.printName', '商品名') }}:</span>
      <span class="product-info-value">{{ product?.name || '-' }}</span>
    </div>

    <div class="preview">
      <div v-if="loadingTemplates" class="status-text">{{ t('wms.product.loadingTemplates', 'テンプレートを読み込み中...') }}</div>
      <div v-else-if="labelTemplates.length === 0" class="status-text error-text">{{ t('wms.product.noLabelTemplates', 'ラベル用テンプレートが見つかりません（キャンバス幅 110mm 以下のテンプレートが必要です）') }}</div>
      <div v-else-if="rendering" class="status-text">{{ t('wms.product.rendering', 'レンダリング中...') }}</div>
      <div v-else-if="error" class="status-text error-text">{{ error }}</div>
      <div v-else-if="!imageUrl" class="status-text">{{ t('wms.product.selectTemplateToPreview', 'テンプレートを選択してプレビューを生成してください') }}</div>
      <img v-else :src="imageUrl" class="preview-img" />
    </div>

    <template #footer>
      <OButton variant="secondary" @click="visible = false">{{ t('wms.common.close', '閉じる') }}</OButton>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import type { Product } from '@/types/product'
import type { PrintTemplate } from '@/types/printTemplate'
import { fetchPrintTemplates, type PrintTemplateApiModel } from '@/api/printTemplates'
import { renderTemplateWithContextToPngBlob } from '@/utils/print/renderTemplateToPng'
import { printImage } from '@/utils/print/printImage'

const { t } = useI18n()
const toast = useToast()

const props = defineProps<{
  modelValue: boolean
  product: Product | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// ラベルテンプレートの最大キャンバス幅 (mm)
// 标签模板的最大画布宽度 (mm)
const LABEL_MAX_WIDTH_MM = 110

const selectedTemplateId = ref('')
const exportDpi = ref(203)
const rendering = ref(false)
const loadingTemplates = ref(false)
const error = ref('')
const imageUrl = ref('')
let lastObjectUrl: string | null = null

const allTemplates = ref<PrintTemplateApiModel[]>([])

// ラベルサイズのテンプレートのみフィルタ
// 只筛选标签尺寸的模板
const labelTemplates = computed(() =>
  allTemplates.value.filter((tpl) => tpl.canvas.widthMm <= LABEL_MAX_WIDTH_MM),
)

const selectedTemplate = computed(() =>
  labelTemplates.value.find((tpl) => tpl.id === selectedTemplateId.value) || null,
)

/**
 * 商品データをテンプレートのコンテキストに変換する
 * 将商品数据转换为模板的上下文
 */
function buildProductContext(product: Product): Record<string, any> {
  return {
    // 基本フィールド / 基本字段
    SKU: product.sku,
    sku: product.sku,
    '商品名': product.name,
    '印刷用商品名': product.name,
    name: product.name,
    nameFull: product.nameFull || '',
    '商品名フル': product.nameFull || '',
    // バーコード / 条形码
    'バーコード': product.barcode?.[0] || product.sku,
    barcode: product.barcode?.[0] || product.sku,
    // 価格 / 价格
    '商品金額': product.price != null ? String(product.price) : '',
    price: product.price != null ? String(product.price) : '',
    // カテゴリ / 分类
    'カテゴリ': product.category || '',
    category: product.category || '',
    // サイズ / 尺寸
    '幅': product.width != null ? String(product.width) : '',
    '奥行': product.depth != null ? String(product.depth) : '',
    '高さ': product.height != null ? String(product.height) : '',
    '重量': product.weight != null ? String(product.weight) : '',
    width: product.width != null ? String(product.width) : '',
    depth: product.depth != null ? String(product.depth) : '',
    height: product.height != null ? String(product.height) : '',
    weight: product.weight != null ? String(product.weight) : '',
    // その他 / 其他
    'メモ': product.memo || '',
    memo: product.memo || '',
    '英語商品名': product.nameEn || '',
    nameEn: product.nameEn || '',
    '原産国': product.countryOfOrigin || '',
    countryOfOrigin: product.countryOfOrigin || '',
    // カスタムフィールド / 自定义字段
    customField1: product.customField1 || '',
    customField2: product.customField2 || '',
    customField3: product.customField3 || '',
    customField4: product.customField4 || '',
    '独自1': product.customField1 || '',
    '独自2': product.customField2 || '',
    '独自3': product.customField3 || '',
    '独自4': product.customField4 || '',
    // ロケーション（商品一覧からは取得不可）/ 位置（商品列表中不可用）
    'ロケーション': '',
    location: '',
  }
}

async function loadTemplates() {
  loadingTemplates.value = true
  try {
    allTemplates.value = await fetchPrintTemplates()
  } catch (e: any) {
    // 印刷テンプレート読み込み失敗 / Failed to load print templates
    allTemplates.value = []
  } finally {
    loadingTemplates.value = false
  }
}

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
  const tpl = selectedTemplate.value
  if (!tpl || !props.product) return

  rendering.value = true
  error.value = ''

  try {
    cleanupImage()
    const ctx = buildProductContext(props.product)
    // PrintTemplateApiModel → PrintTemplate への変換（型互換）
    // PrintTemplateApiModel 到 PrintTemplate 的转换（类型兼容）
    const printTemplate = tpl as unknown as PrintTemplate
    const blob = await renderTemplateWithContextToPngBlob(printTemplate, ctx, {
      exportDpi: exportDpi.value,
      background: 'white',
    })
    const url = URL.createObjectURL(blob)
    lastObjectUrl = url
    imageUrl.value = url
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    rendering.value = false
  }
}

async function handlePrint() {
  const tpl = selectedTemplate.value
  if (!imageUrl.value || !tpl || !props.product) return

  try {
    await printImage(imageUrl.value, {
      widthMm: tpl.canvas.widthMm,
      heightMm: tpl.canvas.heightMm,
      title: `Label ${props.product.sku}`,
      templateId: tpl.id,
      templateType: 'print',
    })
    toast.showSuccess(t('wms.product.printTriggered', '印刷を実行しました'))
  } catch (e: any) {
    // 印刷エラー / Print error
    toast.showError(`${t('wms.product.printFailed', '印刷に失敗しました')}: ${e?.message || String(e)}`)
  }
}

// ダイアログが開いたらテンプレートを読み込む / 打开对话框时加载模板
watch(
  () => props.modelValue,
  async (v) => {
    if (!v) {
      cleanupImage()
      selectedTemplateId.value = ''
      error.value = ''
      return
    }
    await loadTemplates()
    // テンプレートが1つだけなら自動選択 / 如果只有一个模板则自动选择
    if (labelTemplates.value.length === 1) {
      selectedTemplateId.value = labelTemplates.value[0]!.id
    }
  },
)

// テンプレートやDPIが変わったら自動レンダリング / 模板或 DPI 变更时自动渲染
watch(
  () => [selectedTemplateId.value, exportDpi.value],
  () => {
    if (!visible.value || !selectedTemplate.value) return
    queueAutoRender()
  },
)

onBeforeUnmount(() => cleanupImage())
</script>

<style scoped>
.toolbar {
  margin-bottom: 10px;
}
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.toolbar-label {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}
.product-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 13px;
}
.product-info-label {
  color: #909399;
  font-weight: 600;
}
.product-info-value {
  color: #303133;
  margin-right: 12px;
}
.preview {
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  height: 400px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-text {
  color: #6b7280;
  padding: 12px;
  text-align: center;
}
.error-text {
  color: #b91c1c;
}
.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
