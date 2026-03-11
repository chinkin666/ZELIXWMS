<template>
  <div class="editor-root">
    <ControlPanel title="印刷テンプレート編集" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="goBack">戻る</OButton>
        <OButton variant="primary" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : '保存' }}
        </OButton>
      </template>
    </ControlPanel>

    <div class="layout">
      <!-- Left: carrierRawRow fields -->
      <div class="panel left">
        <div class="panel-title">carrierRawRow 字段</div>

        <input v-model="fieldFilter" class="o-input" placeholder="搜索 key" style="width: 100%" />
        <div class="fields">
          <div
            v-for="k in filteredFieldKeys"
            :key="k"
            class="field-item"
            @click="insertField(k)"
            :title="String(getFieldValue(k) ?? '')"
          >
            <div class="k">{{ k }}</div>
            <div class="v">{{ String(getFieldValue(k) ?? '') }}</div>
          </div>
        </div>

        <div class="panel-title" style="margin-top: 12px">上传表格</div>
        <input ref="tableFileInput" type="file" accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="hidden-input" @change="onTableFileChange" />
        <div class="row">
          <OButton variant="secondary" @click="triggerTableUpload">选择文件</OButton>
          <OButton variant="secondary" :disabled="!uploadedTableData" @click="clearTableData">清空</OButton>
        </div>
        <div v-if="uploadedTableData && uploadedTableData.length > 0" class="meta" style="margin-top: 8px">
          <div>已加载 {{ uploadedTableData.length }} 行数据（第1行为表头）</div>
          <div style="margin-top: 8px">
            <select v-model="selectedRowIndex" class="o-input" style="width: 100%">
              <option
                v-for="(row, idx) in uploadedTableData"
                :key="idx"
                :value="idx"
              >第 {{ idx + 2 }} 行</option>
            </select>
          </div>
        </div>
        <div style="margin-bottom: 8px">
          <label class="o-toggle">
            <input type="checkbox" v-model="template.requiresYamatoSortCode" />
            <span class="o-toggle-slider"></span>
            <span style="margin-left: 8px; font-size: 12px">yamato仕分けコードが必要</span>
          </label>
        </div>
      </div>

      <!-- Center: canvas -->
      <div class="panel center">
        <div class="panel-title">画布（Konva）</div>
        <div class="canvas-toolbar">
          <div class="toolbar-form">
            <div class="form-group-inline">
              <label>宽(mm)</label>
              <input v-model.number="template.canvas.widthMm" type="number" min="1" class="o-input" style="width: 110px" />
            </div>
            <div class="form-group-inline">
              <label>高(mm)</label>
              <input v-model.number="template.canvas.heightMm" type="number" min="1" class="o-input" style="width: 110px" />
            </div>
            <div class="form-group-inline">
              <label>pxPerMm</label>
              <input v-model.number="template.canvas.pxPerMm" type="number" min="1" step="0.5" class="o-input" style="width: 110px" />
            </div>
          </div>
          <div class="row">
            <OButton variant="secondary" @click="addText">+ Text</OButton>
            <OButton variant="secondary" @click="addBarcode">+ Barcode</OButton>
            <OButton variant="secondary" @click="addImage">+ Image</OButton>
          </div>
        </div>

        <div class="canvas-toolbar" style="margin-top: 8px">
          <div class="row">
            <input ref="bgFileInput" type="file" accept="image/*" class="hidden-input" @change="onBgFileChange" />
            <OButton variant="secondary" @click="triggerBgUpload">上传参考图</OButton>
            <OButton variant="secondary" :disabled="!bgImageUrl" @click="clearBgImage">清除参考图</OButton>
          </div>
          <div class="row" style="align-items: center">
            <div class="opacity-label">透明度</div>
            <input type="range" v-model.number="bgOpacity" min="0" max="1" step="0.05" style="width: 220px" />
            <span style="font-size: 12px; color: #6b7280; margin-left: 4px">{{ bgOpacity.toFixed(2) }}</span>
          </div>
        </div>

        <div class="canvas-wrap">
          <div ref="stageEl" class="stage-host"></div>
        </div>
      </div>

      <!-- Right: properties + layers -->
      <div class="right-col">
        <div class="panel right-top">
          <div class="panel-title">属性</div>
          <div v-if="!selectedEl" class="placeholder">请选择一个元素</div>
          <div v-else class="props">
            <div class="o-form-group">
              <label>name</label>
              <input v-model="selectedEl.name" class="o-input" />
            </div>
            <div class="o-form-group">
              <label>x(mm)</label>
              <input v-model.number="selectedEl.xMm" type="number" step="1" class="o-input" />
            </div>
            <div class="o-form-group">
              <label>y(mm)</label>
              <input v-model.number="selectedEl.yMm" type="number" step="1" class="o-input" />
            </div>
            <div class="o-form-group">
              <label>visible</label>
              <label class="o-toggle">
                <input type="checkbox" v-model="selectedEl.visible" />
                <span class="o-toggle-slider"></span>
              </label>
            </div>
            <div class="o-form-group">
              <label>locked</label>
              <label class="o-toggle">
                <input type="checkbox" v-model="selectedEl.locked" />
                <span class="o-toggle-slider"></span>
              </label>
            </div>

            <template v-if="selectedEl.type === 'text'">
              <div class="o-form-group">
                <label>fontFamily</label>
                <input v-model="(selectedEl as any).fontFamily" class="o-input" placeholder="例: sans-serif / NotoSansJP" />
              </div>
              <div class="o-form-group">
                <label>fontSize(pt)</label>
                <input v-model.number="(selectedEl as any).fontSizePt" type="number" step="1" class="o-input" />
              </div>
              <div class="o-form-group">
                <label>letterSpacing(px)</label>
                <input v-model.number="(selectedEl as any).letterSpacingPx" type="number" step="0.5" class="o-input" />
              </div>
              <div class="o-form-group">
                <label>align</label>
                <select v-model="(selectedEl as any).align" class="o-input" style="width: 100%">
                  <option value="left">left</option>
                  <option value="right">right</option>
                </select>
              </div>
              <div class="o-form-group">
                <label>内容转换</label>
                <OButton variant="primary" @click="openTransformMappingDialog('text')">
                  {{ (selectedEl as PrintTextElement).transformMapping ? '编辑转换' : '配置转换' }}
                </OButton>
              </div>
              <div class="o-form-group">
                <label>预览</label>
                <textarea :value="textPreviewValue" readonly rows="2" class="o-input" style="width: 100%; resize: vertical"></textarea>
              </div>
            </template>

            <template v-else-if="selectedEl.type === 'barcode'">
              <div class="o-form-group">
                <label>format</label>
                <select v-model="(selectedEl as any).format" class="o-input" style="width: 100%">
                  <option value="code128">Code 128</option>
                  <option value="qrcode">QR Code</option>
                  <option value="codabar">Codabar (NW-7)</option>
                  <option value="ean13">EAN-13</option>
                  <option value="ean8">EAN-8</option>
                  <option value="code39">Code 39</option>
                  <option value="code93">Code 93</option>
                  <option value="interleaved2of5">Interleaved 2 of 5 (ITF)</option>
                  <option value="datamatrix">Data Matrix</option>
                  <option value="pdf417">PDF417</option>
                </select>
              </div>
              <div class="o-form-group">
                <label>width(mm)</label>
                <input v-model.number="(selectedEl as any).widthMm" type="number" step="1" class="o-input" />
              </div>
              <div class="o-form-group">
                <label>height(mm)</label>
                <input v-model.number="(selectedEl as any).heightMm" type="number" step="1" class="o-input" />
              </div>
              <div class="o-form-group">
                <label>内容转换</label>
                <OButton variant="primary" @click="openTransformMappingDialog('barcode')">
                  {{ (selectedEl as PrintBarcodeElement).transformMapping ? '编辑转换' : '配置转換' }}
                </OButton>
              </div>
              <div class="o-form-group">
                <label>预览</label>
                <textarea :value="barcodePreviewValue" readonly rows="2" class="o-input" style="width: 100%; resize: vertical"></textarea>
              </div>
              <template v-if="(selectedEl as PrintBarcodeElement).format === 'codabar'">
                <div class="o-form-group">
                  <label>起始字符</label>
                  <select v-model="codabarStartChar" class="o-input" style="width: 100%">
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
                <div class="o-form-group">
                  <label>终止字符</label>
                  <select v-model="codabarStopChar" class="o-input" style="width: 100%">
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              </template>
              <div class="o-form-group">
                <label>options(JSON)</label>
                <textarea v-model="barcodeOptionsJson" rows="4" class="o-input" style="width: 100%; resize: vertical"></textarea>
              </div>
            </template>

            <template v-else-if="selectedEl.type === 'image'">
              <div class="o-form-group">
                <label>图片</label>
                <div style="display: flex; gap: 8px">
                  <input ref="imageFileInput" type="file" accept="image/*" class="hidden-input" @change="onImageFileChange" />
                  <OButton variant="secondary" @click="triggerImageUpload">上传图片</OButton>
                  <OButton variant="secondary" :disabled="!((selectedEl as any).imageData)" @click="clearImage">清除图片</OButton>
                </div>
              </div>
              <div class="o-form-group" v-if="(selectedEl as any).imageData">
                <label>预览</label>
                <img :src="(selectedEl as any).imageData" style="max-width: 200px; max-height: 200px; border: 1px solid #ddd;" />
              </div>
              <div class="o-form-group">
                <label>width(mm)</label>
                <input v-model.number="(selectedEl as any).widthMm" type="number" step="1" class="o-input" />
              </div>
              <div class="o-form-group">
                <label>height(mm)</label>
                <input v-model.number="(selectedEl as any).heightMm" type="number" step="1" class="o-input" />
              </div>
            </template>

            <div class="row">
              <OButton variant="danger" @click="removeSelected">删除</OButton>
            </div>
          </div>
        </div>

        <div class="panel right-bottom">
          <div class="panel-title">图层</div>
          <div class="layers">
            <div
              v-for="(e, idx) in template.elements"
              :key="e.id"
              class="layer"
              :class="{ active: e.id === selectedId }"
              @click="select(e.id)"
            >
              <div class="name">{{ idx + 1 }}. {{ e.name }} <span class="type">({{ e.type }})</span></div>
              <div class="ops">
                <button class="o-btn-text" @click.stop="toggleVisible(e)">{{ e.visible === false ? '显示' : '隐藏' }}</button>
                <button class="o-btn-text" @click.stop="toggleLocked(e)">{{ e.locked ? '解锁' : '锁定' }}</button>
                <button class="o-btn-text" @click.stop="duplicateLayer(idx)">复制</button>
                <button class="o-btn-text" :disabled="idx === 0" @click.stop="moveLayer(idx, -1)">上移</button>
                <button class="o-btn-text" :disabled="idx === template.elements.length - 1" @click.stop="moveLayer(idx, 1)">
                  下移
                </button>
              </div>
            </div>
          </div>
        </div>
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
import type { PrintBarcodeElement, PrintElement, PrintImageElement, PrintTemplate, PrintTextElement } from '@/types/printTemplate'
import { fetchPrintTemplate, updatePrintTemplate } from '@/api/printTemplates'
import { renderBarcodePngDataUrl } from '@/utils/print/renderBarcodeDataUrl'
import { createEmptyPrintTemplate } from '@/utils/print/templateStorage'
import { ptToMm } from '@/utils/printUnits'
import * as XLSX from 'xlsx'
import MappingDetailDialog from '@/components/mapping/MappingDetailDialog.vue'
import type { TransformMapping } from '@/api/mappingConfig'
import { runTransformMapping } from '@/utils/transformRunner'

const route = useRoute()
const router = useRouter()

const templateId = String(route.params.id || '')

const stageEl = ref<HTMLDivElement | null>(null)
let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let transformer: Konva.Transformer | null = null

const template = ref<PrintTemplate>(createEmptyPrintTemplate({ id: templateId }))
const saving = ref(false)

// Temporary background reference image (editor-only, not persisted)
const bgFileInput = ref<HTMLInputElement | null>(null)
const bgImageUrl = ref<string>('')
const bgImageEl = ref<HTMLImageElement | null>(null)
const bgOpacity = ref<number>(0.35)

// Image element file input
const imageFileInput = ref<HTMLInputElement | null>(null)

// Table upload for carrierRawRow fields
const tableFileInput = ref<HTMLInputElement | null>(null)
const uploadedTableData = ref<Record<string, any>[]>([])
const tableHeaders = ref<string[]>([])
const selectedRowIndex = ref<number>(0)

const selectedId = ref<string>('')
const selectedEl = computed<PrintElement | null>(() => template.value.elements.find((e) => e.id === selectedId.value) || null)

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
        textPreviewValue.value = '(需要上传示例数据)'
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
        barcodePreviewValue.value = '(需要上传示例数据)'
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

function triggerBgUpload() {
  bgFileInput.value?.click()
}

function clearBgImage() {
  if (bgImageUrl.value && !bgImageUrl.value.startsWith('data:')) {
    URL.revokeObjectURL(bgImageUrl.value)
  }
  bgImageUrl.value = ''
  bgImageEl.value = null
  if (bgFileInput.value) bgFileInput.value.value = ''
  scheduleRender()
}

function onBgFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input?.files?.[0]
  if (!f) return
  setBgImageFromFile(f)
}

function setBgImageFromFile(file: File) {
  clearBgImage()
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target?.result as string
    if (!base64) {
      alert('参考图读取失败')
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
      alert('参考图加载失败')
    }
    img.src = base64
  }
  reader.onerror = () => {
    alert('参考图读取失败')
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

// carrierRawRow fields from uploaded table
const fieldFilter = ref('')
const filteredFieldKeys = computed(() => {
  let keys = [...tableHeaders.value]

  if (template.value.requiresYamatoSortCode) {
    const yamatoFields = ['仕分けコード', '発ベースNo-1', '発ベースNo-2']
    for (const field of yamatoFields) {
      if (!keys.includes(field)) {
        keys = [field, ...keys]
      }
    }
  }

  const q = fieldFilter.value.trim().toLowerCase()
  return q ? keys.filter((k) => k.toLowerCase().includes(q)) : keys
})

function getFieldValue(key: string): any {
  if (key === '仕分けコード') {
    return '999999'
  }
  if (key === '発ベースNo-1' || key === '発ベースNo-2') {
    return '000'
  }

  if (!uploadedTableData.value || uploadedTableData.value.length === 0) return ''
  const rowIndex = selectedRowIndex.value
  if (rowIndex < 0 || rowIndex >= uploadedTableData.value.length) return ''
  return uploadedTableData.value[rowIndex]?.[key] ?? ''
}

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
          alert('参考图加载失败')
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
    alert('保存しました')
  } catch (e: any) {
    alert(e?.message || '保存に失敗しました')
  } finally {
    saving.value = false
  }
}

function select(id: string) {
  selectedId.value = id
  syncTransformer()
}

function toggleVisible(e: PrintElement) {
  e.visible = e.visible === false ? true : false
  scheduleRender()
}

function toggleLocked(e: PrintElement) {
  e.locked = !e.locked
  scheduleRender()
}

function moveLayer(idx: number, delta: -1 | 1) {
  const list = template.value.elements
  const to = idx + delta
  if (to < 0 || to >= list.length) return
  const [it] = list.splice(idx, 1)
  if (!it) return
  list.splice(to, 0, it)
  scheduleRender()
}

function duplicateLayer(idx: number) {
  const src = template.value.elements[idx]
  if (!src) return
  const cloned = JSON.parse(JSON.stringify(src)) as PrintElement
  cloned.id = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
  cloned.name = `${src.name} copy`
  cloned.xMm = (cloned.xMm ?? 0) + 2
  cloned.yMm = (cloned.yMm ?? 0) + 2
  template.value.elements.splice(idx + 1, 0, cloned)
  selectedId.value = cloned.id
  scheduleRender()
}

function removeSelected() {
  if (!selectedId.value) return
  template.value.elements = template.value.elements.filter((e) => e.id !== selectedId.value)
  selectedId.value = ''
  scheduleRender()
}

function insertField(key: string) {
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2)

  const transformMapping: TransformMapping = {
    targetField: 'text',
    inputs: [
      {
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        type: 'column',
        column: key,
      },
    ],
    combine: {
      plugin: 'combine.first',
    },
  }

  const newElement: PrintTextElement = {
    id,
    name: `Text: ${key}`,
    type: 'text',
    xMm: 10,
    yMm: 10 + template.value.elements.length * 15,
    visible: true,
    locked: false,
    transformMapping,
    fontFamily: 'sans-serif',
    fontSizePt: 12,
    align: 'left',
    letterSpacingPx: 0,
  }

  template.value.elements.push(newElement)
  selectedId.value = id
  scheduleRender()
  alert(`已添加文字图层: ${key}`)
}

function triggerTableUpload() {
  tableFileInput.value?.click()
}

function clearTableData() {
  uploadedTableData.value = []
  tableHeaders.value = []
  selectedRowIndex.value = 0
  if (tableFileInput.value) tableFileInput.value.value = ''
  scheduleRender()
}

function onTableFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  parseTableFile(file)
}

async function parseTableFile(file: File) {
  try {
    const isExcel = file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    let result: { headers: string[]; rows: Record<string, any>[] }

    if (isExcel) {
      result = await parseExcelFile(file)
    } else {
      result = await parseCsvFile(file)
    }

    if (result.rows.length === 0) {
      alert('表格为空或无法解析')
      return
    }

    if (result.headers.length === 0) {
      alert('表格没有有效的表头')
      return
    }

    tableHeaders.value = result.headers
    uploadedTableData.value = result.rows
    selectedRowIndex.value = 0
    alert(`已加载 ${result.rows.length} 行数据，${result.headers.length} 个字段`)
    scheduleRender()
  } catch (e: any) {
    alert(e?.message || '文件解析失败')
    console.error('Table parsing error:', e)
  }
}

async function parseExcelFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseSheetToRows(wb)
}

async function parseCsvFile(file: File): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
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
    console.error('Barcode generation error:', error)
    throw error
  }

  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => {
      console.error('Image load error:', e)
      reject(new Error(`Failed to load barcode image for format ${b.format}`))
    }
    img.src = dataUrl
  })
}

function ensureStage() {
  if (stage || !stageEl.value) return
  stage = new Konva.Stage({ container: stageEl.value, width: 10, height: 10 })
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

function addText() {
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
  template.value.elements.push({
    id,
    name: 'Text',
    type: 'text',
    xMm: 10,
    yMm: 10,
    visible: true,
    locked: false,
    fontFamily: 'sans-serif',
    fontSizePt: 12,
    align: 'left',
    letterSpacingPx: 0,
  } as any)
  selectedId.value = id
  scheduleRender()
}

function addBarcode() {
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
  template.value.elements.push({
    id,
    name: 'Barcode',
    type: 'barcode',
    xMm: 10,
    yMm: 20,
    visible: true,
    locked: false,
    format: 'code128',
    widthMm: 60,
    heightMm: 18,
    options: { includetext: false },
  } as any)
  selectedId.value = id
  scheduleRender()
}

function addImage() {
  const id = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
  template.value.elements.push({
    id,
    name: 'Image',
    type: 'image',
    xMm: 10,
    yMm: 30,
    visible: true,
    locked: false,
    imageData: '',
    widthMm: 50,
    heightMm: 50,
  } as any)
  selectedId.value = id
  scheduleRender()
  setTimeout(() => {
    imageFileInput.value?.click()
  }, 100)
}

function triggerImageUpload() {
  imageFileInput.value?.click()
}

function clearImage() {
  const el = selectedEl.value
  if (el && el.type === 'image') {
    (el as PrintImageElement).imageData = ''
    scheduleRender()
  }
}

function onImageFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return

  const el = selectedEl.value
  if (!el || el.type !== 'image') {
    alert('请先选择一个图片元素')
    return
  }

  const reader = new FileReader()
  reader.onload = (event) => {
    const result = event.target?.result
    if (typeof result === 'string') {
      (el as PrintImageElement).imageData = result
      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.width / img.height
        const currentWidth = (el as PrintImageElement).widthMm || 50
        const currentHeight = (el as PrintImageElement).heightMm || 50
        if (currentWidth > 0) {
          (el as PrintImageElement).heightMm = currentWidth / aspectRatio
        } else if (currentHeight > 0) {
          (el as PrintImageElement).widthMm = currentHeight * aspectRatio
        }
        scheduleRender()
      }
      img.onerror = () => {
        alert('图片加载失败')
      }
      img.src = result
    }
  }
  reader.onerror = () => {
    alert('文件读取失败')
  }
  reader.readAsDataURL(file)

  if (input) input.value = ''
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
.panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 10px;
}
.panel-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.left .fields {
  height: 360px;
  overflow: auto;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 6px;
  margin-top: 8px;
}
.field-item {
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
}
.field-item:hover {
  background: #f9fafb;
}
.field-item .k {
  font-size: 12px;
  font-weight: 600;
}
.field-item .v {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.meta {
  margin-top: 8px;
  font-size: 12px;
  color: #374151;
}
.center .canvas-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar-form {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.form-group-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.form-group-inline label {
  white-space: nowrap;
  font-size: 12px;
  color: #374151;
}
.canvas-wrap {
  margin-top: 10px;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  border-radius: 8px;
  padding: 10px;
  overflow: auto;
  height: 560px;
}
.stage-host {
  display: inline-block;
}
.hidden-input {
  display: none;
}
.opacity-label {
  font-size: 12px;
  color: #374151;
  width: 48px;
}
.right .placeholder {
  color: #6b7280;
  font-size: 12px;
}
.right-top {
  max-height: 520px;
  overflow: auto;
}
.right-bottom {
  max-height: 360px;
  overflow: auto;
}
.layers {
  max-height: 320px;
  overflow: auto;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 6px;
}
.layer {
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
}
.layer.active {
  background: #eef2ff;
}
.layer .name {
  font-size: 12px;
  font-weight: 600;
}
.layer .type {
  color: #6b7280;
  font-weight: 400;
}
.layer .ops {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* o-btn styles */
.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: #fff;
  color: #606266;
  transition: all 0.15s;
  white-space: nowrap;
}
.o-btn:hover { background: #f5f7fa; border-color: #c0c4cc; }
.o-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.o-btn-primary {
  background: var(--o-primary, #714B67);
  color: #fff;
  border-color: var(--o-primary, #714B67);
}
.o-btn-primary:hover { opacity: 0.85; }

.o-btn-secondary {
  background: #fff;
  color: #606266;
  border-color: #dcdfe6;
}

.o-btn-danger {
  background: #fff;
  color: #f56c6c;
  border-color: #fbc4c4;
}
.o-btn-danger:hover { background: #fef0f0; }

.o-btn-text {
  background: none;
  border: none;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  color: var(--o-primary, #714B67);
}
.o-btn-text:hover { text-decoration: underline; }
.o-btn-text:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }

/* o-input */
.o-input {
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.o-input:focus { border-color: var(--o-primary, #714B67); }

/* o-form-group */
.o-form-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 10px;
}
.o-form-group > label {
  width: 120px;
  flex-shrink: 0;
  font-size: 12px;
  color: #374151;
  padding-top: 6px;
}
.o-form-group > input,
.o-form-group > select,
.o-form-group > textarea {
  flex: 1;
  min-width: 0;
}

/* o-toggle */
.o-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.o-toggle input { display: none; }
.o-toggle-slider {
  width: 36px;
  height: 20px;
  background: #ccc;
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
}
.o-toggle-slider::after {
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
.o-toggle input:checked + .o-toggle-slider {
  background: var(--o-primary, #714B67);
}
.o-toggle input:checked + .o-toggle-slider::after {
  transform: translateX(16px);
}
</style>
