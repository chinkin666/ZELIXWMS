<template>
  <div class="editor-root">
    <ControlPanel :title="$t('wms.printTemplate.editTitle', '印刷テンプレート編集')" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="goBack">{{ $t('wms.settings.back', '戻る') }}</OButton>
        <OButton variant="primary" :disabled="saving" @click="save">
          {{ saving ? $t('wms.settings.saving', '保存中...') : $t('wms.common.save', '保存') }}
        </OButton>
      </template>
    </ControlPanel>

    <div class="layout">
      <!-- Left: carrierRawRow fields -->
      <FieldPanel
        :uploaded-table-data="uploadedTableData"
        :table-headers="tableHeaders"
        :selected-row-index="selectedRowIndex"
        :requires-yamato-sort-code="template.requiresYamatoSortCode ?? false"
        @insert-field="insertField"
        @clear-table-data="clearTableData"
        @table-file-change="parseTableFile"
        @update:selected-row-index="selectedRowIndex = $event"
        @update:requires-yamato-sort-code="template.requiresYamatoSortCode = $event"
      />

      <!-- Center: canvas -->
      <CanvasPreview
        ref="canvasPreviewRef"
        :canvas="template.canvas"
        :bg-image-url="bgImageUrl"
        :bg-opacity="bgOpacity"
        @add-text="addText"
        @add-barcode="addBarcode"
        @add-image="addImage"
        @clear-bg-image="clearBgImage"
        @bg-file-change="setBgImageFromFile"
        @update-canvas="onUpdateCanvas"
        @update:bg-opacity="bgOpacity = $event"
      />

      <!-- Right: properties + layers -->
      <div class="right-col">
        <ElementEditor
          :selected-el="selectedEl"
          :text-preview-value="textPreviewValue"
          :barcode-preview-value="barcodePreviewValue"
          :barcode-options-json="barcodeOptionsJson"
          :codabar-start-char="codabarStartChar"
          :codabar-stop-char="codabarStopChar"
          @update-prop="onUpdateElementProp"
          @open-transform-mapping="openTransformMappingDialog"
          @remove-selected="removeSelected"
          @clear-image="clearImage"
          @image-file-change="onImageFileChange"
          @update:codabar-start-char="codabarStartChar = $event"
          @update:codabar-stop-char="codabarStopChar = $event"
          @update:barcode-options-json="barcodeOptionsJson = $event"
        />

        <ElementList
          :elements="template.elements"
          :selected-id="selectedId"
          @select="select"
          @toggle-visible="toggleVisible"
          @toggle-locked="toggleLocked"
          @duplicate-layer="duplicateLayer"
          @move-layer="moveLayer"
        />
      </div>
    </div>

    <!-- Transform Mapping Dialog -->
    <MappingDetailDialog
      v-model="transformMappingDialogVisible"
      :target="{ field: transformMappingDialogType === 'text' ? 'text' : 'barcode', required: false }"
      :mapping="currentTransformMapping"
      :sample-row="getCurrentSampleRow()"
      :pre-selected-sources="[]"
      config-type="order-to-carrier"
      @submit="handleTransformMappingSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import Konva from 'konva'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import type { PrintBarcodeElement, PrintElement, PrintImageElement, PrintTemplate, PrintTextElement } from '@/types/printTemplate'
import { fetchPrintTemplate, updatePrintTemplate } from '@/api/printTemplates'
import { renderBarcodePngDataUrl } from '@/utils/print/renderBarcodeDataUrl'
import { createEmptyPrintTemplate } from '@/utils/print/templateStorage'
import { ptToMm } from '@/utils/printUnits'
import * as XLSX from 'xlsx'
import MappingDetailDialog from '@/components/mapping/MappingDetailDialog.vue'
import type { TransformMapping } from '@/api/mappingConfig'
import { runTransformMapping } from '@/utils/transformRunner'
import FieldPanel from './print-template-editor/FieldPanel.vue'
import CanvasPreview from './print-template-editor/CanvasPreview.vue'
import ElementEditor from './print-template-editor/ElementEditor.vue'
import ElementList from './print-template-editor/ElementList.vue'
import { useElementManagement } from './print-template-editor/useElementManagement'

const route = useRoute()
const router = useRouter()
const { show: _showToast } = useToast()
const showToast = (msg: string, type: string) => _showToast(msg, type as 'success' | 'warning' | 'danger' | 'info')
const { t: $t } = useI18n()

const templateId = String(route.params.id || '')

const canvasPreviewRef = ref<InstanceType<typeof CanvasPreview> | null>(null)
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let transformer: Konva.Transformer | null = null

const template = ref<PrintTemplate>(createEmptyPrintTemplate({ id: templateId }))
const saving = ref(false)

// Temporary background reference image (editor-only, not persisted)
const bgImageUrl = ref<string>('')
const bgImageEl = ref<HTMLImageElement | null>(null)
const bgOpacity = ref<number>(0.35)

// Table upload for carrierRawRow fields
const uploadedTableData = ref<Record<string, any>[]>([])
const tableHeaders = ref<string[]>([])
const selectedRowIndex = ref<number>(0)

const selectedId = ref<string>('')
const selectedEl = computed<PrintElement | null>(() => template.value.elements.find((e) => e.id === selectedId.value) || null)

// 要素管理コンポーザブル / 元素管理组合式函数
const {
  select,
  toggleVisible,
  toggleLocked,
  moveLayer,
  duplicateLayer,
  removeSelected,
  addText,
  addBarcode,
  addImage,
  insertField,
  clearImage: clearImageBase,
  onImageFileChange: onImageFileChangeBase,
} = useElementManagement({
  template,
  selectedId,
  scheduleRender,
  showToast,
  t: $t,
  syncTransformer,
})

/** clearImage ラッパー: selectedEl を自動注入 / clearImage wrapper: 自动注入 selectedEl */
function clearImage() {
  clearImageBase(selectedEl.value)
}

/** onImageFileChange ラッパー: selectedEl を自動注入 / onImageFileChange wrapper: 自动注入 selectedEl */
function onImageFileChange(e: Event) {
  onImageFileChangeBase(e, selectedEl.value)
}

const barcodeOptionsJson = ref<string>('{}')

// Codabar start/stop characters
const codabarStartChar = computed({
  get: () => {
    const el = selectedEl.value
    if (el?.type === 'barcode' && (el as PrintBarcodeElement).format === 'codabar') {
      return (el as PrintBarcodeElement).options?.codabarStart || 'A'
    }
    return 'A'
  },
  set: (value: string) => {
    const el = selectedEl.value
    if (el?.type === 'barcode' && (el as PrintBarcodeElement).format === 'codabar') {
      if (!(el as PrintBarcodeElement).options) {
        ;(el as PrintBarcodeElement).options = {}
      }
      ;(el as PrintBarcodeElement).options!.codabarStart = value
      barcodeOptionsJson.value = JSON.stringify((el as PrintBarcodeElement).options ?? {}, null, 2)
      scheduleRender()
    }
  },
})

const codabarStopChar = computed({
  get: () => {
    const el = selectedEl.value
    if (el?.type === 'barcode' && (el as PrintBarcodeElement).format === 'codabar') {
      return (el as PrintBarcodeElement).options?.codabarStop || 'A'
    }
    return 'A'
  },
  set: (value: string) => {
    const el = selectedEl.value
    if (el?.type === 'barcode' && (el as PrintBarcodeElement).format === 'codabar') {
      if (!(el as PrintBarcodeElement).options) {
        ;(el as PrintBarcodeElement).options = {}
      }
      ;(el as PrintBarcodeElement).options!.codabarStop = value
      barcodeOptionsJson.value = JSON.stringify((el as PrintBarcodeElement).options ?? {}, null, 2)
      scheduleRender()
    }
  },
})

// Transform mapping dialog
const transformMappingDialogVisible = ref(false)
const transformMappingDialogType = ref<'text' | 'barcode'>('text')
const currentTransformMapping = ref<TransformMapping | null>(null)

watch(
  () => selectedEl.value,
  (el) => {
    if (el?.type === 'barcode') {
      const barcodeEl = el as PrintBarcodeElement
      if (barcodeEl.format === 'codabar') {
        if (!barcodeEl.options) {
          barcodeEl.options = {}
        }
        if (!barcodeEl.options.codabarStart) {
          barcodeEl.options.codabarStart = 'A'
        }
        if (!barcodeEl.options.codabarStop) {
          barcodeEl.options.codabarStop = 'A'
        }
      }
      barcodeOptionsJson.value = JSON.stringify(barcodeEl.options ?? {}, null, 2)
    } else {
      barcodeOptionsJson.value = '{}'
    }
  },
  { immediate: true },
)

watch(
  () => (selectedEl.value as PrintBarcodeElement)?.format,
  (format) => {
    const el = selectedEl.value
    if (el?.type === 'barcode' && format === 'codabar') {
      const barcodeEl = el as PrintBarcodeElement
      if (!barcodeEl.options) {
        barcodeEl.options = {}
      }
      if (!barcodeEl.options.codabarStart) {
        barcodeEl.options.codabarStart = 'A'
      }
      if (!barcodeEl.options.codabarStop) {
        barcodeEl.options.codabarStop = 'A'
      }
      barcodeOptionsJson.value = JSON.stringify(barcodeEl.options ?? {}, null, 2)
      scheduleRender()
    }
  },
)

// Preview values from transform mapping
const textPreviewValue = ref<string>('')
const barcodePreviewValue = ref<string>('')

async function updatePreviewValues() {
  const el = selectedEl.value

  if (el?.type === 'text') {
    const textEl = el as PrintTextElement
    if (textEl.transformMapping) {
      const sampleRow = getCurrentSampleRow()
      if (sampleRow) {
        try {
          const result = await runTransformMapping(textEl.transformMapping, sampleRow, {})
          textPreviewValue.value = String(result ?? '')
        } catch (e) {
          textPreviewValue.value = `Error: ${e instanceof Error ? e.message : String(e)}`
        }
      } else {
        textPreviewValue.value = $t('wms.printTemplate.needSampleData', '(サンプルデータをアップロードしてください)')
      }
    } else {
      textPreviewValue.value = ''
    }
  } else if (el?.type === 'barcode') {
    const barcodeEl = el as PrintBarcodeElement
    if (barcodeEl.transformMapping) {
      const sampleRow = getCurrentSampleRow()
      if (sampleRow) {
        try {
          const result = await runTransformMapping(barcodeEl.transformMapping, sampleRow, {})
          let previewText = String(result ?? '')

          if (barcodeEl.format === 'codabar') {
            const startChar = barcodeEl.options?.codabarStart || 'A'
            const stopChar = barcodeEl.options?.codabarStop || 'A'
            if (/^[A-D]/.test(previewText)) {
              previewText = previewText.substring(1)
            }
            if (/[A-D]$/.test(previewText)) {
              previewText = previewText.substring(0, previewText.length - 1)
            }
            previewText = `${startChar}${previewText}${stopChar}`
          }

          barcodePreviewValue.value = previewText
        } catch (e) {
          barcodePreviewValue.value = `Error: ${e instanceof Error ? e.message : String(e)}`
        }
      } else {
        barcodePreviewValue.value = $t('wms.printTemplate.needSampleData', '(サンプルデータをアップロードしてください)')
      }
    } else {
      barcodePreviewValue.value = ''
    }
  }
}

watch([selectedEl, uploadedTableData, selectedRowIndex], () => {
  updatePreviewValues()
}, { deep: true, immediate: true })

watch(
  () => selectedEl.value?.type === 'text' ? (selectedEl.value as PrintTextElement).transformMapping : null,
  () => updatePreviewValues(),
  { deep: true },
)
watch(
  () => selectedEl.value?.type === 'barcode' ? (selectedEl.value as PrintBarcodeElement).transformMapping : null,
  () => updatePreviewValues(),
  { deep: true },
)

function getCurrentSampleRow(): Record<string, any> | null {
  if (uploadedTableData.value.length > 0 && selectedRowIndex.value >= 0 && selectedRowIndex.value < uploadedTableData.value.length) {
    const originalRow = uploadedTableData.value[selectedRowIndex.value]
    if (!originalRow) return null
    const row = { ...originalRow }
    if (template.value.requiresYamatoSortCode) {
      row['仕分けコード'] = '999999'
      row['発ベースNo-1'] = '000'
      row['発ベースNo-2'] = '000'
    }
    return row
  }
  if (template.value.requiresYamatoSortCode) {
    return {
      '仕分けコード': '999999',
      '発ベースNo-1': '000',
      '発ベースNo-2': '000',
    }
  }
  return null
}

function openTransformMappingDialog(type: 'text' | 'barcode') {
  transformMappingDialogType.value = type
  const el = selectedEl.value
  if (!el) return

  if (type === 'text' && el.type === 'text') {
    currentTransformMapping.value = (el as PrintTextElement).transformMapping || null
  } else if (type === 'barcode' && el.type === 'barcode') {
    currentTransformMapping.value = (el as PrintBarcodeElement).transformMapping || null
  }

  transformMappingDialogVisible.value = true
}

function handleTransformMappingSubmit(mapping: TransformMapping) {
  const el = selectedEl.value
  if (!el) return

  if (transformMappingDialogType.value === 'text' && el.type === 'text') {
    (el as PrintTextElement).transformMapping = mapping
  } else if (transformMappingDialogType.value === 'barcode' && el.type === 'barcode') {
    (el as PrintBarcodeElement).transformMapping = mapping
  }

  transformMappingDialogVisible.value = false
  scheduleRender()
}

// Handle element property updates from ElementEditor
function onUpdateElementProp(key: string, value: any) {
  const el = selectedEl.value
  if (!el) return
  ;(el as any)[key] = value
  scheduleRender()
}

// Handle canvas property updates from CanvasPreview
function onUpdateCanvas(key: string, value: number) {
  ;(template.value.canvas as any)[key] = value
}

// Debounced re-render
let renderTimer: number | null = null
let renderSeq = 0
function scheduleRender() {
  if (renderTimer) window.clearTimeout(renderTimer)
  renderTimer = window.setTimeout(() => {
    renderTimer = null
    const seq = ++renderSeq
    void render(seq)
  }, 30)
}

watch(
  () => bgOpacity.value,
  () => scheduleRender(),
)

function clearBgImage() {
  if (bgImageUrl.value && !bgImageUrl.value.startsWith('data:')) {
    URL.revokeObjectURL(bgImageUrl.value)
  }
  bgImageUrl.value = ''
  bgImageEl.value = null
  scheduleRender()
}

function setBgImageFromFile(file: File) {
  clearBgImage()
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target?.result as string
    if (!base64) {
      showToast($t('wms.printTemplate.refImageReadFailed', '参考画像の読み込みに失敗しました'), 'danger')
      return
    }
    bgImageUrl.value = base64
    const img = new Image()
    img.onload = () => {
      bgImageEl.value = img
      scheduleRender()
    }
    img.onerror = () => {
      clearBgImage()
      showToast($t('wms.printTemplate.refImageLoadFailed', '参考画像の読み込みに失敗しました'), 'danger')
    }
    img.src = base64
  }
  reader.onerror = () => {
    showToast('参考画像の読み込みに失敗しました', 'danger')
  }
  reader.readAsDataURL(file)
}

watch(
  () => barcodeOptionsJson.value,
  () => {
    const el = selectedEl.value
    if (!el || el.type !== 'barcode') return
    try {
      ;(el as PrintBarcodeElement).options = JSON.parse(barcodeOptionsJson.value || '{}')
    } catch {
      // Keep previous options if JSON is invalid
    }
  },
)

function goBack() {
  router.push('/settings/print-templates')
}

function loadTemplate() {
  fetchPrintTemplate(templateId, true)
    .then((hit: any) => {
      template.value = JSON.parse(JSON.stringify(hit)) as PrintTemplate
      if (!Array.isArray(template.value.elements)) template.value.elements = []

      if (hit.sampleData && Array.isArray(hit.sampleData) && hit.sampleData.length > 0) {
        uploadedTableData.value = hit.sampleData
        if (uploadedTableData.value.length > 0) {
          const firstRow = uploadedTableData.value[0]
          if (firstRow && typeof firstRow === 'object') {
            tableHeaders.value = Object.keys(firstRow)
            selectedRowIndex.value = 0
          }
        }
      }

      if (hit.referenceImageData && typeof hit.referenceImageData === 'string') {
        clearBgImage()
        const img = new Image()
        img.onload = () => {
          bgImageEl.value = img
          bgImageUrl.value = hit.referenceImageData
          scheduleRender()
        }
        img.onerror = () => {
          showToast($t('wms.printTemplate.refImageLoadFailed', '参考画像の読み込みに失敗しました'), 'danger')
        }
        img.src = hit.referenceImageData
      }

      scheduleRender()
    })
    .catch(() => {
      template.value = createEmptyPrintTemplate({ id: templateId })
      if (template.value.id !== templateId) template.value.id = templateId
      if (!Array.isArray(template.value.elements)) template.value.elements = []
      scheduleRender()
    })
}

async function save() {
  saving.value = true
  try {
    if (selectedEl.value?.type === 'barcode') {
      try {
        ;(selectedEl.value as PrintBarcodeElement).options = JSON.parse(barcodeOptionsJson.value || '{}')
      } catch {
        // ignore invalid json
      }
    }

    const payload: any = { ...template.value }
    if (uploadedTableData.value && uploadedTableData.value.length > 0) {
      payload.sampleData = uploadedTableData.value
    } else {
      payload.sampleData = null
    }

    if (bgImageUrl.value && bgImageUrl.value.startsWith('data:')) {
      payload.referenceImageData = bgImageUrl.value
    } else {
      payload.referenceImageData = null
    }

    await updatePrintTemplate(template.value.id, payload)
    showToast($t('wms.settings.saved', '保存しました'), 'success')
  } catch (e: any) {
    showToast(e?.message || $t('wms.settings.saveFailed', '保存に失敗しました'), 'danger')
  } finally {
    saving.value = false
  }
}


function clearTableData() {
  uploadedTableData.value = []
  tableHeaders.value = []
  selectedRowIndex.value = 0
  scheduleRender()
}

async function parseTableFile(file: File) {
  try {
    const isExcel = file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    let result: { headers: string[]; rows: Record<string, any>[] }

    if (isExcel) {
      result = await parseExcelFileInternal(file)
    } else {
      result = await parseCsvFileInternal(file)
    }

    if (result.rows.length === 0) {
      showToast($t('wms.printTemplate.emptyTable', 'テーブルが空か解析できません'), 'warning')
      return
    }

    if (result.headers.length === 0) {
      showToast($t('wms.printTemplate.noHeaders', '有効なヘッダーがありません'), 'warning')
      return
    }

    tableHeaders.value = result.headers
    uploadedTableData.value = result.rows
    selectedRowIndex.value = 0
    showToast($t('wms.printTemplate.dataLoaded', `${result.rows.length}行のデータ、${result.headers.length}フィールドを読み込みました`), 'success')
    scheduleRender()
  } catch (e: any) {
    showToast(e?.message || $t('wms.printTemplate.parseFileFailed', 'ファイル解析に失敗しました'), 'danger')
    // テーブル解析エラー / Table parsing error
  }
}

async function parseExcelFileInternal(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseSheetToRows(wb)
}

async function parseCsvFileInternal(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const buf = await file.arrayBuffer()
  const detectEncoding = (buf: ArrayBuffer): string => {
    const bytes = new Uint8Array(buf)
    if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
      return 'utf-8-sig'
    }
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true })
      decoder.decode(buf.slice(0, Math.min(1024, buf.byteLength)))
      return 'utf-8'
    } catch {
      try {
        const decoder = new TextDecoder('shift_jis', { fatal: false })
        decoder.decode(buf.slice(0, Math.min(1024, buf.byteLength)))
        return 'shift_jis'
      } catch {
        return 'utf-8'
      }
    }
  }

  const encoding = detectEncoding(buf)
  const decoder = new TextDecoder(encoding === 'utf-8-sig' ? 'utf-8' : encoding, { fatal: false })
  let text = decoder.decode(buf)

  if (encoding === 'utf-8-sig' && text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }

  const wb = XLSX.read(text, { type: 'string' })
  return parseSheetToRows(wb)
}

function parseSheetToRows(wb: any): { headers: string[]; rows: Record<string, any>[] } {
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    return { headers: [], rows: [] }
  }

  const sheet = wb.Sheets[wb.SheetNames[0]]
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')

  if (range.s.r >= range.e.r) {
    return { headers: [], rows: [] }
  }

  const headers: string[] = []
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = sheet[cellAddress]
    const header = cell?.w || cell?.v || ''
    headers.push(String(header).trim() || `Column${col + 1}`)
  }

  const rows: Record<string, any>[] = []
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const rowData: Record<string, any> = {}
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = sheet[cellAddress]
      const value = cell?.w !== undefined ? cell.w : (cell?.v !== undefined ? cell.v : '')
      const headerIndex = col - range.s.c
      if (headerIndex >= 0 && headerIndex < headers.length) {
        const header = headers[headerIndex]
        if (header) {
          rowData[header] = value
        }
      }
    }
    rows.push(rowData)
  }

  return { headers, rows }
}

// ===== Konva rendering =====
function mmToPx(mm: number): number {
  const pxPerMm = template.value.canvas.pxPerMm || 1
  return mm * pxPerMm
}

function pxToMm(px: number): number {
  const pxPerMm = template.value.canvas.pxPerMm || 1
  return px / pxPerMm
}

async function barcodeToImage(b: PrintBarcodeElement, value: string): Promise<HTMLImageElement> {
  const widthPx = mmToPx(b.widthMm)
  const heightPx = mmToPx(b.heightMm)

  let dataUrl: string
  try {
    dataUrl = renderBarcodePngDataUrl({
      bcid: b.format,
      text: value,
      width: widthPx,
      height: heightPx,
      options: b.options,
    })
  } catch (error) {
    // バーコード生成エラー / Barcode generation error
    throw error
  }

  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => {
      // 画像読み込みエラー / Image load error
      reject(new Error(`Failed to load barcode image for format ${b.format}`))
    }
    img.src = dataUrl
  })
}

function ensureStage() {
  const stageEl = canvasPreviewRef.value?.stageEl
  if (stage || !stageEl) return
  stage = new Konva.Stage({ container: stageEl, width: 10, height: 10 })
  layer = new Konva.Layer()
  stage.add(layer)
  transformer = new Konva.Transformer({
    rotateEnabled: false,
    ignoreStroke: true,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  })
  layer.add(transformer)

  stage.on('click', (evt) => {
    const target = evt.target
    if (!target || target === stage) {
      selectedId.value = ''
      syncTransformer()
      return
    }
    const getAttr = (target as any)?.getAttr
    const id = typeof getAttr === 'function' ? getAttr.call(target, '__elementId') : undefined
    if (id) {
      selectedId.value = String(id)
      syncTransformer()
    }
  })
}

function syncTransformer() {
  if (!transformer || !layer) return
  if (!selectedId.value) {
    transformer.nodes([])
    layer.draw()
    return
  }
  const node = layer.findOne((n: any) => n?.getAttr?.('__elementId') === selectedId.value) as any
  if (!node) {
    transformer.nodes([])
    layer.draw()
    return
  }
  const el = selectedEl.value
  if (el?.type === 'barcode' || el?.type === 'image') {
    transformer.nodes([node])
  } else {
    transformer.nodes([])
  }
  layer.draw()
}

async function render(seq?: number) {
  ensureStage()
  if (!stage || !layer) return
  const mySeq = seq ?? ++renderSeq

  const widthPx = Math.max(1, Math.round(mmToPx(template.value.canvas.widthMm)))
  const heightPx = Math.max(1, Math.round(mmToPx(template.value.canvas.heightMm)))
  stage.width(widthPx)
  stage.height(heightPx)

  const keepTransformer = transformer
  if (keepTransformer) keepTransformer.remove()
  layer.destroyChildren()

  layer.add(new Konva.Rect({ x: 0, y: 0, width: widthPx, height: heightPx, fill: 'white', listening: false }))

  if (bgImageEl.value) {
    layer.add(
      new Konva.Image({
        x: 0,
        y: 0,
        width: widthPx,
        height: heightPx,
        image: bgImageEl.value,
        opacity: bgOpacity.value,
        listening: false,
      }),
    )
  }

  for (const el of template.value.elements) {
    if (el.visible === false) continue

    if (el.type === 'text') {
      const t = el as PrintTextElement
      let text = ''
      if (t.transformMapping && uploadedTableData.value.length > 0) {
        try {
          const sampleRow = getCurrentSampleRow()
          if (sampleRow) {
            text = String(await runTransformMapping(t.transformMapping, sampleRow, {}) ?? '')
          }
        } catch (e) {
          text = `Error: ${e instanceof Error ? e.message : String(e)}`
        }
      }

      const node = new Konva.Text({
        x: mmToPx(t.xMm),
        y: mmToPx(t.yMm),
        text,
        fontFamily: t.fontFamily || 'sans-serif',
        fontSize: mmToPx(ptToMm((t as any).fontSizePt ?? 12)),
        fill: 'black',
        wrap: 'none',
        draggable: !t.locked,
      })
      if (typeof t.letterSpacingPx === 'number') node.letterSpacing(t.letterSpacingPx)
      if (t.align === 'right') node.x(mmToPx(t.xMm) - node.width())

      node.setAttr('__elementId', t.id)
      node.on('dragend', () => {
        const x = node.x()
        const y = node.y()
        t.xMm = pxToMm(x)
        t.yMm = pxToMm(y)
      })
      layer.add(node)
    } else if (el.type === 'barcode') {
      const b = el as PrintBarcodeElement
      let value = ''
      if (b.transformMapping && uploadedTableData.value.length > 0) {
        try {
          const sampleRow = getCurrentSampleRow()
          if (sampleRow) {
            value = String(await runTransformMapping(b.transformMapping, sampleRow, {}) ?? '')
          }
        } catch (e) {
          value = `Error: ${e instanceof Error ? e.message : String(e)}`
        }
      }
      let img: HTMLImageElement | null = null
      try {
        img = await barcodeToImage(b, value)
      } catch {
        img = null
      }
      if (seq !== undefined && mySeq !== renderSeq) {
        return
      }

      const node = new Konva.Image({
        x: mmToPx(b.xMm),
        y: mmToPx(b.yMm),
        width: mmToPx(b.widthMm),
        height: mmToPx(b.heightMm),
        image: img || undefined,
        draggable: !b.locked,
      })
      node.setAttr('__elementId', b.id)

      node.on('dragend', () => {
        b.xMm = pxToMm(node.x())
        b.yMm = pxToMm(node.y())
      })

      node.on('transformend', () => {
        const newW = node.width() * node.scaleX()
        const newH = node.height() * node.scaleY()
        node.scaleX(1)
        node.scaleY(1)
        node.width(newW)
        node.height(newH)

        b.widthMm = pxToMm(newW)
        b.heightMm = pxToMm(newH)
      })

      layer.add(node)
    } else if (el.type === 'image') {
      const imgEl = el as PrintImageElement
      if (!imgEl.imageData) {
        continue
      }

      const img = new Image()

      img.onload = () => {
        if (seq !== undefined && mySeq !== renderSeq) {
          return
        }

        if (!layer) return

        const node = new Konva.Image({
          x: mmToPx(imgEl.xMm),
          y: mmToPx(imgEl.yMm),
          width: mmToPx(imgEl.widthMm),
          height: mmToPx(imgEl.heightMm),
          image: img,
          draggable: !imgEl.locked,
        })
        node.setAttr('__elementId', imgEl.id)

        node.on('dragend', () => {
          imgEl.xMm = pxToMm(node.x())
          imgEl.yMm = pxToMm(node.y())
        })

        node.on('transformend', () => {
          const newW = node.width() * node.scaleX()
          const newH = node.height() * node.scaleY()
          node.scaleX(1)
          node.scaleY(1)
          node.width(newW)
          node.height(newH)

          imgEl.widthMm = pxToMm(newW)
          imgEl.heightMm = pxToMm(newH)
        })

        layer.add(node)
        if (seq === undefined || mySeq === renderSeq) {
          syncTransformer()
          layer.draw()
        }
      }
      img.onerror = () => {
        // Image load failed, skip
      }
      img.src = imgEl.imageData

      if (img.complete && img.naturalWidth > 0) {
        img.onload(new Event('load') as any)
      }
    }
  }

  if (keepTransformer) {
    layer.add(keepTransformer)
    keepTransformer.moveToTop()
  }
  syncTransformer()
  layer.draw()
}


watch(
  () => [template.value.canvas.widthMm, template.value.canvas.heightMm, template.value.canvas.pxPerMm],
  () => scheduleRender(),
)

watch(
  () => template.value.elements,
  () => scheduleRender(),
  { deep: true },
)

watch(
  () => barcodeOptionsJson.value,
  () => {
    if (!selectedEl.value || selectedEl.value.type !== 'barcode') return
    scheduleRender()
  },
)

watch(
  () => selectedRowIndex.value,
  () => {
    scheduleRender()
  },
)

onMounted(() => {
  loadTemplate()
  selectedId.value = template.value.elements[0]?.id || ''
  scheduleRender()
})

onBeforeUnmount(() => {
  if (renderTimer) window.clearTimeout(renderTimer)
  if (bgImageUrl.value && !bgImageUrl.value.startsWith('data:')) {
    URL.revokeObjectURL(bgImageUrl.value)
  }
  stage?.destroy()
  stage = null
  layer = null
  transformer = null
})
</script>

<style scoped>
.editor-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 20px 20px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.layout {
  display: grid;
  grid-template-columns: 300px 1fr 360px;
  gap: 12px;
  align-items: start;
}
.right-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
