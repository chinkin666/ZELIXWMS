<template>
  <div class="mapping-pattern-new">
    <ControlPanel :title="route.params.id ? 'レイアウト編集' : 'レイアウト新規作成'" :show-search="false" />

    <MappingTopBar
      :config-type="configType"
      :carrier-id="carrierId"
      :carrier-options="carrierOptions"
      :config-name="configName"
      :config-description="configDescription"
      :encoding="encoding"
      :is-locked="isLocked"
      :can-save="canSave"
      @update:config-type="onConfigTypeUpdate"
      @update:carrier-id="onCarrierIdUpdate"
      @update:encoding="encoding = $event"
      @update:config-name="configName = $event"
      @update:config-description="configDescription = $event"
      @load-sample-orders="loadSampleOrders"
      @save="handleSave"
      @load="handleLoad"
      @file-select="onFileSelect"
    />

    <div class="tables-row">
      <MappingTargetTable
        :target-rows="targetRowsComputed"
        :selected-target="selectedTarget"
        :mappings="mappings"
        :config-type="configType"
        :custom-target-fields="customTargetFields"
        :summary-for-mapping="summaryForMapping"
        :get-field-hint="getFieldHint"
        @select-target="onSelectTarget"
        @add-custom-field="addCustomTargetField"
        @remove-custom-field="removeSelectedCustomTargetField"
      />

      <MappingActionButtons
        :selected-target="selectedTarget"
        :selected-sources="selectedSources"
        :config-type="configType"
        @clear-selected="clearSelected"
        @clear-all="clearAll"
        @direct-link="handleDirectLink"
        @add-literal="handleAddLiteral"
        @open-transform-dialog="openTransformDialog"
        @open-detail-dialog="openDetailDialog"
        @open-barcode-mapping="openBarcodeMappingDialog"
        @open-handling-tags-mapping="openHandlingTagsMappingDialog"
        @open-handling-tags-index="openHandlingTagsIndexDialog"
        @open-product-to-string="openProductToStringTransform"
        @quick-add-from-source="handleQuickAddFromSource"
      />

      <MappingSourceTable
        :source-rows="sourceRowsComputed"
        :selected-sources="selectedSources"
        :empty-text="sourceTableEmptyText"
        :get-used-by-targets="getUsedByTargets"
        :get-target-display-name="getTargetDisplayName"
        @select-source="onSelectSource"
      />
    </div>

    <!-- Target 字段说明（左下角） -->
    <div v-if="selectedTarget" class="target-description-box">
      <div class="target-description-title">フィールド説明</div>
      <div class="target-description-content">
        {{ getTargetDescription(selectedTarget.field) || '（説明なし）' }}
      </div>
    </div>

    <mapping-detail-dialog
      v-model="detailDialogVisible"
      :target="selectedTarget"
      :mapping="selectedTarget ? (mappings[selectedTarget.field] ?? null) : null"
      :pre-selected-sources="preSelectedSources"
      :sample-row="resolvedSampleRow"
      :config-type="configType"
      :carrier-id="carrierId"
      :carrier-options="carrierOptions"
      @submit="applyDetailMapping"
    />

    <handling-tags-mapping-dialog
      v-model="handlingTagsMappingDialogVisible"
      :available-columns="availableSourceColumns"
      :sample-row="resolvedSampleRow"
      :target-field="selectedTarget?.field || ''"
      @submit="applyHandlingTagsMapping"
    />

    <handling-tags-index-dialog
      v-model="handlingTagsIndexDialogVisible"
      :target="selectedTarget"
      :sample-row="resolvedSampleRow"
      @submit="applyHandlingTagsIndex"
    />

    <barcode-mapping-dialog
      v-model="barcodeMappingDialogVisible"
      :available-columns="availableSourceColumns"
      :sample-row="resolvedSampleRow"
      :target-field="selectedTarget?.field || ''"
      @submit="applyBarcodeMapping"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { useRoute } from 'vue-router'
import { fetchShipmentOrders } from '@/api/shipmentOrders'
import { getOrderFieldDefinitions } from '@/types/order'
import { getProductFieldDefinitions } from '@/types/product'
import { fetchCarriers } from '@/api/carrier'
import * as XLSX from 'xlsx'
import {
  createMappingConfig,
  getMappingConfigById,
  updateMappingConfig,
  getAllMappingConfigs,
  type TransformMapping as ApiTransformMapping,
  type MappingConfig,
} from '@/api/mappingConfig'
import MappingDetailDialog from '@/components/mapping/MappingDetailDialog.vue'
import HandlingTagsMappingDialog from '@/components/mapping/HandlingTagsMappingDialog.vue'
import HandlingTagsIndexDialog from '@/components/mapping/HandlingTagsIndexDialog.vue'
import BarcodeMappingDialog from '@/components/mapping/BarcodeMappingDialog.vue'
import MappingTopBar from './mapping-pattern/MappingTopBar.vue'
import MappingTargetTable from './mapping-pattern/MappingTargetTable.vue'
import MappingSourceTable from './mapping-pattern/MappingSourceTable.vue'
import MappingActionButtons from './mapping-pattern/MappingActionButtons.vue'

interface TransformStep {
  id: string
  plugin: string
  params?: any
  enabled?: boolean
  onError?: { mode: 'fail' | 'fallback' | 'skip'; value?: any }
}

interface TransformPipeline {
  steps: TransformStep[]
}

type InputSource =
  | { id: string; type: 'column'; column: string; pipeline?: TransformPipeline }
  | { id: string; type: 'literal'; value: any; pipeline?: TransformPipeline }
  | { id: string; type: 'generated'; generator: 'now' | 'uuid' | string; generatorParams?: any; pipeline?: TransformPipeline }

interface CombineConfig {
  plugin: string
  params?: any
}

interface TransformMapping {
  targetField: string
  inputs: InputSource[]
  combine: CombineConfig
  outputPipeline?: TransformPipeline
  required?: boolean
  defaultValue?: any
}

interface TargetRow {
  field: string
  required: boolean
  label?: string
  children?: TargetRow[]
  isExpandable?: boolean
}

interface SourceRow {
  name: string
  label?: string
}

const route = useRoute()
const encoding = ref<'shift_jis' | 'utf-8' | 'utf-8-sig' | 'gbk'>('shift_jis')
const configType = ref<string>('ec-company-to-order')
const carrierId = ref<string | null>(null)
const carrierOptions = ref<any[]>([])
const configName = ref<string>('')
const configDescription = ref<string>('')
const currentConfigId = ref<string | null>(null)

// Locked mode - when navigating from carrier automation settings
const isLocked = ref(false)

// 从 order.ts 获取字段定义
const orderFieldDefinitions = getOrderFieldDefinitions()
const orderFieldLabels: Record<string, string> = {}
orderFieldDefinitions.forEach((def) => {
  if (def.title && def.dataKey) {
    orderFieldLabels[def.dataKey] = def.title
  }
})

// product 字段定义
const productFieldDefinitions = getProductFieldDefinitions()
const productFieldLabels: Record<string, string> = {}
productFieldDefinitions.forEach((def) => {
  if (def.title && def.dataKey) {
    productFieldLabels[def.dataKey] = def.title
  }
})

const getUploadableOrderFields = (): TargetRow[] => {
  return orderFieldDefinitions
    .filter((def) => {
      if (!def.dataKey) return false
      if (def.tableVisible === false) return false
      if (def.dataKey.startsWith('__mappingExample_')) return false
      if (def.formEditable === false) return false
      if (['orderNumber', 'createdAt', 'updatedAt', 'sourceRawRows', 'carrierRawRow'].includes(def.dataKey)) {
        return false
      }
      return true
    })
    .map((def) => ({
      field: def.dataKey!,
      required: def.required ?? false,
      label: def.title || def.dataKey!,
    }))
}

const targetOrderFields: TargetRow[] = getUploadableOrderFields()

const isExcludedOrderSourceField = (fieldName: string): boolean => {
  if (!fieldName) return true
  const excluded = new Set(['status', 'sourceRawRows', 'carrierRawRow', 'createdAt', 'updatedAt'])
  if (excluded.has(fieldName)) return true
  if (fieldName.startsWith('status.')) return true
  return false
}

const getAllOrderSourceFields = (): SourceRow[] => {
  const fields = orderFieldDefinitions
    .filter((def) => {
      if (!def.dataKey) return false
      if (def.dataKey.startsWith('__mappingExample_')) return false
      if (isExcludedOrderSourceField(def.dataKey)) return false
      return true
    })
    .map((def) => ({
      name: def.dataKey!,
      label: def.title || def.dataKey!,
    }))

  const productsIndex = fields.findIndex((f) => f.name === 'products')
  if (productsIndex !== -1) {
    const productsField = fields[productsIndex]
    if (productsField) {
      fields.splice(productsIndex, 1)
      fields.push(productsField)
    }
  }

  return fields
}

const getUploadableProductFields = (): TargetRow[] => {
  return productFieldDefinitions
    .filter((def: any) => {
      if (!def.dataKey) return false
      if (def.tableVisible === false) return false
      if (def.formEditable === false) return false
      if (['createdAt', 'updatedAt', '_id'].includes(def.dataKey)) return false
      return true
    })
    .map((def: any) => ({
      field: def.dataKey!,
      required: def.required ?? false,
      label: def.title || def.dataKey!,
    }))
}

const targetProductFields: TargetRow[] = getUploadableProductFields()

const sourceUploadRows = ref<SourceRow[]>([])
const sourceOrderRows = ref<SourceRow[]>([])

// order-to-sheet 自定义 Target 字段
const customTargetFields = ref<string[]>([])

const addCustomTargetField = (fieldName: string) => {
  if (customTargetFields.value.includes(fieldName)) {
    alert('この項目名は既に存在します')
    return
  }
  customTargetFields.value = [...customTargetFields.value, fieldName]
  alert('項目を追加しました')
}

const removeSelectedCustomTargetField = () => {
  if (!selectedTarget.value) return
  const fieldToRemove = selectedTarget.value.field
  if (!customTargetFields.value.includes(fieldToRemove)) {
    alert('この項目は削除できません')
    return
  }
  customTargetFields.value = customTargetFields.value.filter((f) => f !== fieldToRemove)
  const next = { ...mappings.value }
  delete next[fieldToRemove]
  mappings.value = next
  selectedTarget.value = null
  alert('項目を削除しました')
}

const handleQuickAddFromSource = () => {
  if (configType.value !== 'order-to-sheet') return
  if (selectedSources.value.length !== 1) return

  const source = selectedSources.value[0]
  if (!source) return

  const fieldName = source.label || source.name

  if (customTargetFields.value.includes(fieldName)) {
    alert(`「${fieldName}」は既に存在します`)
    return
  }

  customTargetFields.value = [...customTargetFields.value, fieldName]

  const mapping: TransformMapping = {
    targetField: fieldName,
    inputs: [{
      id: 'src-0',
      type: 'column',
      column: source.name,
      pipeline: { steps: [] },
    }],
    combine: { plugin: 'combine.first' },
    outputPipeline: { steps: [] },
    required: false,
  }
  mappings.value = { ...mappings.value, [fieldName]: mapping }

  selectedSources.value = []
  alert(`「${fieldName}」を追加しました`)
}

const sampleRows = ref<Record<string, any>[]>([])
const mappings = ref<Record<string, TransformMapping>>({})
const selectedTarget = ref<TargetRow | null>(null)
const selectedSources = ref<SourceRow[]>([])

const detailDialogVisible = ref(false)
const handlingTagsMappingDialogVisible = ref(false)
const handlingTagsIndexDialogVisible = ref(false)
const barcodeMappingDialogVisible = ref(false)
const preSelectedSources = ref<SourceRow[]>([])

const currentSampleRow = computed<Record<string, any> | null>(() => sampleRows.value[0] ?? null)

const resolvedSampleRow = computed<Record<string, any> | null>(() => {
  const row = currentSampleRow.value
  if (!row) return null

  const resolved = { ...row }

  if (resolved.carrierId) {
    const carrier = carrierOptions.value.find((c: any) => c._id === resolved.carrierId)
    if (carrier) {
      resolved.carrierId = carrier.name
    }
  }

  return resolved
})

const availableSourceColumns = computed<string[]>(() => {
  return sourceRowsComputed.value.map((r) => r.name)
})

const getFieldHint = (field: string): string | null => {
  const hints: Record<string, string> = {
    carrierId: 'この項目はCSVから取得する必要はありません。システム設定やデフォルト値から自動的に設定されます。',
    coolType: 'この項目はCSVから取得する必要はありません。システム設定やデフォルト値から自動的に設定されます。',
    'sender.postalCode': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.prefecture': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.city': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.street': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.name': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    'sender.phone': 'この項目はCSVから取得する必要はありません。システム設定（依頼主情報）から自動的に設定されます。',
    handlingTags: 'この項目はCSVから取得する必要はありません。システム設定やデフォルト値から自動的に設定されます。',
  }
  return hints[field] || null
}

const getTargetDescription = (field: string): string | null => {
  if (!field) return null

  if (configType.value === 'order-to-carrier' && selectedCarrier.value?.formatDefinition?.columns) {
    const col = selectedCarrier.value.formatDefinition.columns.find((c: any) => c.name === field)
    return col?.description || null
  }

  if (configType.value === 'ec-company-to-order') {
    const def = orderFieldDefinitions.find((d) => d.dataKey === field)
    return def?.description || null
  }

  if (configType.value === 'product') {
    const def = productFieldDefinitions.find((d: any) => d.dataKey === field)
    return (def as any)?.description || null
  }

  return null
}

const selectedCarrier = computed(() => carrierOptions.value.find((c) => c._id === carrierId.value))

const targetRowsComputed = computed<TargetRow[]>(() => {
  if (configType.value === 'order-to-carrier') {
    const cols: any[] | undefined = selectedCarrier.value?.formatDefinition?.columns
    if (cols && cols.length) {
      const rows = cols.map((c) => ({ field: c.name, required: !!c.required }))

      const productsIndex = rows.findIndex((r) => r.field === 'products')
      if (productsIndex !== -1) {
        const productsRow: TargetRow = rows[productsIndex] as TargetRow
        productsRow.label = '商品'
        productsRow.isExpandable = true
        productsRow.children = [
          { field: 'products.0.sku', required: true, label: '商品SKU管理番号（1件目）' },
          { field: 'products.0.quantity', required: true, label: '数量（1件目）' },
          { field: 'products.0.name', required: false, label: '商品名（1件目）' },
          { field: 'products.0.barcode', required: false, label: '商品バーコード（1件目）' },
        ]
        rows.splice(productsIndex, 1)
        rows.push(productsRow)
      }

      return rows
    }
    return []
  }
  if (configType.value === 'product') {
    return targetProductFields
  }
  if (configType.value === 'order-to-sheet') {
    return customTargetFields.value.map((fieldName) => ({
      field: fieldName,
      required: false,
      label: fieldName,
    }))
  }
  if (configType.value === 'order-source-company') {
    return [
      { field: 'senderName', required: true, label: '名' },
      { field: 'senderPostalCode', required: true, label: '郵便番号' },
      { field: 'senderAddressPrefecture', required: false, label: '住所（都道府県）' },
      { field: 'senderAddressCity', required: false, label: '住所（郡市区）' },
      { field: 'senderAddressStreet', required: false, label: '住所（それ以降）' },
      { field: 'senderPhone', required: true, label: '電話' },
    ]
  }

  const rows: TargetRow[] = [...targetOrderFields]
  const productsIndex = rows.findIndex((r) => r.field === 'products')
  if (productsIndex !== -1 && rows[productsIndex]) {
    const productsRow = rows[productsIndex]!
    productsRow.label = '商品'
    productsRow.isExpandable = true
    productsRow.children = [
      { field: 'products.0.sku', required: true, label: '商品SKU管理番号（1件目）' },
      { field: 'products.0.quantity', required: true, label: '数量（1件目）' },
      { field: 'products.0.name', required: false, label: '商品名（1件目）' },
      { field: 'products.0.barcode', required: false, label: '商品バーコード（1件目）' },
    ]
    rows.splice(productsIndex, 1)
    rows.push(productsRow)
  }

  return rows
})

const sourceRowsComputed = computed<SourceRow[]>(() => {
  if (configType.value === 'order-to-carrier') {
    if (sourceOrderRows.value.length) {
      return sourceOrderRows.value.filter((r) => !isExcludedOrderSourceField(r.name))
    }
    return getAllOrderSourceFields()
  }

  if (configType.value === 'order-to-sheet') {
    return getAllOrderSourceFields()
  }

  return sourceUploadRows.value
})

const sourceTableEmptyText = computed(() => {
  if (
    configType.value === 'ec-company-to-order' ||
    configType.value === 'product' ||
    configType.value === 'order-source-company'
  ) {
    return 'ファイルをアップロードしてください'
  }
  return 'データがありません'
})

// Handle config type update from top bar
function onConfigTypeUpdate(value: string) {
  configType.value = value
}

// Handle carrier ID update from top bar
function onCarrierIdUpdate(value: string) {
  carrierId.value = value
  onCarrierChange()
}

// Handle file select from top bar
async function onFileSelect(file: File) {
  try {
    const rows = await parseFileForPreview(file)
    const headers = rows.length && rows[0] ? Object.keys(rows[0]) : []
    sourceUploadRows.value = headers.map((h) => ({ name: h }))
    sampleRows.value = rows.slice(0, 5)
    alert('アップロード済みのヘッダーを読み込みました')
  } catch (e: any) {
    console.error(e)
    alert(e?.message || 'ファイルの解析に失敗しました')
  }
}

const loadConfigForEdit = async (configId: string) => {
  try {
    const config = await getMappingConfigById(configId)
    if (!config) {
      alert('設定が見つかりませんでした')
      return
    }

    const mappingsObj: Record<string, TransformMapping> = {}
    if (config.mappings && Array.isArray(config.mappings)) {
      for (const mapping of config.mappings as ApiTransformMapping[]) {
        mappingsObj[mapping.targetField] = mapping as TransformMapping
      }
    }

    if (config.configType === 'order-to-sheet') {
      const targetFields = (config.mappings as ApiTransformMapping[]).map((m) => m.targetField)
      customTargetFields.value = targetFields
    } else if (config.configType !== 'order-to-carrier') {
      const sourceFields = new Set<string>()
      for (const mapping of config.mappings as ApiTransformMapping[]) {
        if (mapping.inputs && Array.isArray(mapping.inputs)) {
          for (const input of mapping.inputs) {
            if (input.type === 'column' && input.column) {
              sourceFields.add(input.column)
            }
          }
        }
      }
      sourceUploadRows.value = Array.from(sourceFields).map((field) => ({
        name: field,
        label: field,
      }))
    }

    currentConfigId.value = config._id
    configName.value = config.name || ''
    configDescription.value = config.description || ''

    if (config.configType === 'order-to-carrier' && config.carrierId) {
      carrierId.value = config.carrierId
    }

    console.log('[loadConfigForEdit] Setting configType to:', config.configType, 'current:', configType.value)
    configType.value = config.configType || 'ec-company-to-order'
    await nextTick()
    console.log('[loadConfigForEdit] Restoring mappings, keys:', Object.keys(mappingsObj))
    mappings.value = mappingsObj
    console.log('[loadConfigForEdit] After restore, mappings keys:', Object.keys(mappings.value))

    if (config.configType === 'order-to-carrier' || config.configType === 'order-to-sheet') {
      await loadSampleOrders()
    }

    alert('設定を読み込みました')
  } catch (e: any) {
    console.error(e)
    alert(e?.message || '設定の読み込みに失敗しました')
  }
}

onMounted(async () => {
  await loadCarriers()

  const lockedParam = route.query.locked as string | undefined
  const configTypeParam = route.query.configType as string | undefined
  const carrierIdParam = route.query.carrierId as string | undefined

  if (lockedParam === 'true') {
    isLocked.value = true

    if (configTypeParam) {
      configType.value = configTypeParam
    }

    if (carrierIdParam) {
      let actualCarrierId = carrierIdParam

      if (carrierIdParam.startsWith('__builtin_')) {
        const carrierCode = carrierIdParam.replace('__builtin_', '').replace(/__$/, '')
        console.log('[MappingPatternNew] Looking for carrier with code:', carrierCode)
        const realCarrier = carrierOptions.value.find((c: any) => c.code === carrierCode && !c._id.startsWith('__builtin_'))
        const builtinCarrier = carrierOptions.value.find((c: any) => c.code === carrierCode && c._id.startsWith('__builtin_'))
        const carrier = realCarrier || builtinCarrier
        if (carrier) {
          actualCarrierId = carrier._id
          console.log('[MappingPatternNew] Found carrier:', carrier._id, carrier.name, realCarrier ? '(real)' : '(builtin)')
        } else {
          console.warn('[MappingPatternNew] Carrier not found for code:', carrierCode)
        }
      }

      carrierId.value = actualCarrierId

      if (configType.value === 'order-to-carrier' && actualCarrierId) {
        try {
          const existingConfigs = await getAllMappingConfigs('order-to-carrier')
          const existingConfig = existingConfigs.find((c: MappingConfig) => c.carrierId === actualCarrierId)
          if (existingConfig) {
            await loadConfigForEdit(existingConfig._id)
          }
        } catch (e) {
          console.error('Failed to load existing mapping config:', e)
        }
      }
    }

    if (configType.value === 'order-to-carrier') {
      await loadSampleOrders()
    }
  }

  const editId = (route.params.id as string | undefined) || (route.query.id as string | undefined)
  if (editId) {
    await loadConfigForEdit(editId)
  }
})

const loadCarriers = async () => {
  try {
    carrierOptions.value = await fetchCarriers()
  } catch (e: any) {
    console.error(e)
    alert(e?.message || '配送業者一覧の取得に失敗しました')
  }
}

watch(
  () => configType.value,
  (val) => {
    selectedTarget.value = null
    selectedSources.value = []
    mappings.value = {}
    if (val !== 'order-to-sheet') {
      customTargetFields.value = []
    }
    if (val === 'order-to-carrier') {
      sourceUploadRows.value = []
      sampleRows.value = []
      if (!sampleRows.value.length) {
        loadSampleOrders()
      }
    } else if (val === 'order-to-sheet') {
      sourceUploadRows.value = []
      sourceOrderRows.value = []
      carrierId.value = null
      if (!sampleRows.value.length) {
        loadSampleOrders()
      }
    } else if (val === 'ec-company-to-order') {
      carrierId.value = null
      sourceOrderRows.value = []
      sampleRows.value = []
    } else {
      carrierId.value = null
      sourceOrderRows.value = []
      sampleRows.value = []
    }
  },
)

// --- File parsing ---

const parseSheetToRows = (wb: any): Record<string, any>[] => {
  if (!wb.SheetNames || wb.SheetNames.length === 0) return []
  const sheet = wb.Sheets[wb.SheetNames[0]]

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headers: string[] = []
  const rows: Record<string, any>[] = []

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = sheet[cellAddress]
    const value = cell?.w != null ? String(cell.w) : (cell?.v != null ? String(cell.v) : '')
    headers.push(value.trim())
  }

  const validHeaders = headers.filter((h) => h)
  if (validHeaders.length === 0) return []

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const obj: Record<string, any> = {}
    validHeaders.forEach((header, colIndex) => {
      const col = range.s.c + colIndex
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = sheet[cellAddress]
      const value = cell?.w != null ? String(cell.w) : (cell?.v != null ? String(cell.v) : '')
      obj[header] = value
    })
    rows.push(obj)
  }

  return rows
}

const decodeWithEncoding = (buf: ArrayBuffer, enc: string): string => {
  try {
    const decoder = new TextDecoder(enc === 'gbk' ? 'gb18030' : (enc as any), { fatal: false })
    return decoder.decode(buf)
  } catch {
    return new TextDecoder('utf-8').decode(buf)
  }
}

const parseExcelFile = async (file: File): Promise<Record<string, any>[]> => {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseSheetToRows(wb)
}

const parseCsvFile = async (file: File): Promise<Record<string, any>[]> => {
  const buf = await file.arrayBuffer()
  let text = decodeWithEncoding(buf, encoding.value)
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const wb = XLSX.read(text, { type: 'string' })
  return parseSheetToRows(wb)
}

const parseFileForPreview = async (file: File): Promise<Record<string, any>[]> => {
  const name = file.name.toLowerCase()
  const isExcel =
    file.type.includes('sheet') || name.endsWith('.xlsx') || name.endsWith('.xls')
  return isExcel ? parseExcelFile(file) : parseCsvFile(file)
}

const loadSampleOrders = async () => {
  try {
    const orders = await fetchShipmentOrders({ limit: 5 })
    const first = orders[0]
    if (!first) {
      alert('サンプル注文が取得できませんでした')
      return
    }
    sampleRows.value = orders.slice(0, 5).map((o: any) => o)
    alert('注文サンプルを読み込みました')
  } catch (e: any) {
    console.error(e)
    alert(e?.message || 'サンプル取得に失敗しました')
  }
}

const onSelectTarget = (row: TargetRow | null) => {
  if (row && row.isExpandable && row.field === 'products') {
    selectedTarget.value = null
    selectedSources.value = []
    return
  }

  if (selectedTarget.value?.field !== row?.field) {
    selectedSources.value = []
  }
  selectedTarget.value = row
}

const onSelectSource = (row: SourceRow | null) => {
  if (!row) return
  toggleSource(row)
}

const toggleSource = (row: SourceRow) => {
  const exists = selectedSources.value.some((s) => s.name === row.name)
  if (exists) {
    selectedSources.value = selectedSources.value.filter((s) => s.name !== row.name)
  } else {
    selectedSources.value = [...selectedSources.value, row]
  }
}

const handleDirectLink = () => {
  if (!selectedTarget.value || !selectedSources.value.length) return
  const mapping: TransformMapping = {
    targetField: selectedTarget.value.field,
    inputs: selectedSources.value.map((s, idx) => ({
      id: `src-${idx}`,
      type: 'column',
      column: s.name,
      pipeline: { steps: [] },
    })),
    combine: { plugin: selectedSources.value.length > 1 ? 'combine.concat' : 'combine.first' },
    outputPipeline: { steps: [] },
    required: selectedTarget.value.required,
  }
  mappings.value = { ...mappings.value, [selectedTarget.value.field]: mapping }
  alert('紐付けました')
}

const handleAddLiteral = async () => {
  if (!selectedTarget.value) return
  const literal = await promptLiteral()
  if (literal === null) return
  const mapping: TransformMapping = {
    targetField: selectedTarget.value.field,
    inputs: [{ id: 'lit-1', type: 'literal', value: literal, pipeline: { steps: [] } }],
    combine: { plugin: 'combine.first' },
    outputPipeline: { steps: [] },
    required: selectedTarget.value.required,
  }
  mappings.value = { ...mappings.value, [selectedTarget.value.field]: mapping }
  alert('固定値を設定しました')
}

const promptLiteral = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const value = prompt('固定値を入力してください')
    resolve(value)
  })
}

const openTransformDialog = () => {
  if (!selectedTarget.value) return
  preSelectedSources.value = [...selectedSources.value]
  detailDialogVisible.value = true
}

const openDetailDialog = () => {
  if (!selectedTarget.value) return
  preSelectedSources.value = []
  detailDialogVisible.value = true
}

const applyDetailMapping = (mapping: TransformMapping) => {
  mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
  detailDialogVisible.value = false
  preSelectedSources.value = []
  alert('詳細設定を更新しました')
}

const openHandlingTagsMappingDialog = () => {
  if (!selectedTarget.value || selectedTarget.value.field !== 'handlingTags') return
  handlingTagsMappingDialogVisible.value = true
}

const applyHandlingTagsMapping = (mapping: TransformMapping) => {
  mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
  handlingTagsMappingDialogVisible.value = false
  alert('荷扱いタグレイアウトを設定しました')
}

const openProductToStringTransform = () => {
  if (!selectedTarget.value || selectedSources.value.length !== 1 || selectedSources.value[0]?.name !== 'products') {
    return
  }

  const mapping: TransformMapping = {
    targetField: selectedTarget.value.field,
    inputs: [
      {
        id: 'products-input',
        type: 'column',
        column: 'products',
        pipeline: undefined,
      },
    ],
    combine: {
      plugin: 'combine.first',
      params: {},
    },
    outputPipeline: {
      steps: [
        {
          id: 'product-to-string',
          plugin: 'product.toString',
          params: {
            separator: ' / ',
          },
          enabled: true,
        },
      ],
    },
    required: selectedTarget.value.required,
    defaultValue: undefined,
  }

  mappings.value = { ...mappings.value, [selectedTarget.value.field]: mapping }
  alert('商品を文字列に変換するレイアウトを設定しました')
}

const openHandlingTagsIndexDialog = () => {
  if (!selectedTarget.value || selectedSources.value.length !== 1 || selectedSources.value[0]?.name !== 'handlingTags') {
    return
  }
  handlingTagsIndexDialogVisible.value = true
}

const applyHandlingTagsIndex = (mapping: TransformMapping) => {
  mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
  handlingTagsIndexDialogVisible.value = false
  alert('配列要素を取得するレイアウトを設定しました')
}

const openBarcodeMappingDialog = () => {
  if (configType.value !== 'product') return
  if (!selectedTarget.value || selectedTarget.value.field !== 'barcode') return
  barcodeMappingDialogVisible.value = true
}

const applyBarcodeMapping = (mapping: TransformMapping) => {
  mappings.value = { ...mappings.value, [mapping.targetField]: mapping }
  barcodeMappingDialogVisible.value = false
  alert('バーコードレイアウトを設定しました')
}

const onCarrierChange = () => {
  mappings.value = {}
  selectedTarget.value = null
  selectedSources.value = []
}

const clearSelected = () => {
  if (!selectedTarget.value) return
  const next = { ...mappings.value }
  delete next[selectedTarget.value.field]
  mappings.value = next
  alert('クリアしました')
}

const clearAll = () => {
  mappings.value = {}
  alert('全てクリアしました')
}

const summaryForMapping = (mapping?: TransformMapping) => {
  if (!mapping) return '未設定'
  if (!mapping.inputs || mapping.inputs.length === 0) return '未設定'

  const parts: string[] = []

  mapping.inputs.forEach((input, idx) => {
    let inputLabel = ''
    if (input.type === 'column') {
      inputLabel = getDisplayName(input.column || '')
    } else if (input.type === 'literal') {
      inputLabel = '固定値'
    } else if (input.type === 'generated') {
      inputLabel = `生成(${input.generator || ''})`
    }

    const inputSteps = input.pipeline?.steps?.length || 0
    if (inputSteps > 0) {
      inputLabel += `[${inputSteps}]`
    }

    if (mapping.inputs.length > 1) {
      parts.push(`${idx + 1}.${inputLabel}`)
    } else {
      parts.push(inputLabel)
    }
  })

  if (mapping.inputs.length > 1) {
    const combinePlugin = mapping.combine?.plugin || 'combine.first'
    parts.push(`→${combinePlugin.replace('combine.', '')}`)
  }

  const outputSteps = mapping.outputPipeline?.steps?.length || 0
  if (outputSteps > 0) {
    parts.push(`→出力[${outputSteps}]`)
  }

  return parts.join(' ')
}

const getDisplayName = (field: string) => {
  if (field.startsWith('sourceRawRows.0.')) {
    const csvFieldName = field.replace('sourceRawRows.0.', '')
    return `sourceRawRows.${csvFieldName}`
  }

  const labels = configType.value === 'product' ? productFieldLabels : orderFieldLabels
  const directMatch = labels[field]
  if (directMatch) return directMatch

  const baseField = field.split('.')[0]
  if (baseField && baseField !== 'sourceRawRows') {
    const baseMatch = labels[baseField]
    if (baseMatch) return baseMatch
  }

  return field
}

const getUsedByTargets = (sourceName: string): string[] => {
  const usedBy: string[] = []
  for (const [targetField, mapping] of Object.entries(mappings.value)) {
    if (mapping.inputs.some((inp) => inp.type === 'column' && inp.column === sourceName)) {
      usedBy.push(targetField)
    }
  }
  return usedBy
}

const getTargetDisplayName = (targetField: string): string => {
  const target = targetRowsComputed.value.find((t) => t.field === targetField)
  return target?.label || targetField
}

const canSave = computed(() => {
  return configName.value.trim().length > 0 && Object.keys(mappings.value).length > 0
})

const handleSave = async () => {
  if (!canSave.value) {
    alert('レイアウト名を入力し、少なくとも1つのマッピングを設定してください')
    return
  }

  try {
    const mappingList: TransformMapping[] = Object.values(mappings.value)

    const dto = {
      schemaVersion: 2,
      configType: configType.value,
      name: configName.value.trim(),
      description: configDescription.value.trim() || undefined,
      carrierId: configType.value === 'order-to-carrier' && carrierId.value ? carrierId.value : undefined,
      mappings: mappingList,
    }

    if (currentConfigId.value) {
      await updateMappingConfig(currentConfigId.value, dto)
      alert('設定を更新しました')
    } else {
      const result = await createMappingConfig(dto)
      currentConfigId.value = result._id
      alert('設定を保存しました')
    }
  } catch (e: any) {
    console.error(e)
    alert(e?.message || '保存に失敗しました')
  }
}

const handleLoad = async () => {
  try {
    const configs = await getAllMappingConfigs(configType.value)
    if (configs.length === 0) {
      alert('読み込める設定がありません')
      return
    }

    const options = configs.map((c: MappingConfig) => ({
      label: `${c.name}${c.description ? ` - ${c.description}` : ''}`,
      value: c._id,
      config: c,
    }))

    const labels = options.map((o) => o.label)
    const selectedIndexStr = prompt(
      '設定を選択してください\n\n' + labels.map((l, i) => `${i}: ${l}`).join('\n') + '\n\n番号を入力:'
    )

    if (selectedIndexStr === null) return

    const selectedIndex = parseInt(selectedIndexStr || '0', 10)
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= options.length) {
      alert('無効な選択です')
      return
    }

    const selected = options[selectedIndex]
    if (!selected) return

    const config = selected.config
    if (config.schemaVersion !== 2) {
      alert('この設定は v2 形式ではありません。v2 形式の設定を選択してください。')
      return
    }

    configName.value = config.name
    configDescription.value = config.description || ''
    currentConfigId.value = config._id
    configType.value = config.configType || 'ec-company-to-order'
    carrierId.value = config.carrierId || null

    const loadedMappings: Record<string, TransformMapping> = {}
    if (Array.isArray(config.mappings)) {
      for (const m of config.mappings as ApiTransformMapping[]) {
        loadedMappings[m.targetField] = m as TransformMapping
      }
    }
    mappings.value = loadedMappings

    if (config.configType !== 'order-to-carrier') {
      const sourceFields = new Set<string>()
      for (const m of config.mappings as ApiTransformMapping[]) {
        if (m.inputs && Array.isArray(m.inputs)) {
          for (const input of m.inputs) {
            if (input.type === 'column' && input.column) {
              sourceFields.add(input.column)
            }
          }
        }
      }
      sourceUploadRows.value = Array.from(sourceFields).map((field) => ({
        name: field,
        label: field,
      }))
    }

    alert('設定を読み込みました')
  } catch (e: any) {
    if (e !== 'cancel') {
      console.error(e)
      alert(e?.message || '読み込みに失敗しました')
    }
  }
}
</script>

<style scoped>
.mapping-pattern-new {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0 16px 16px;
}

.tables-row {
  display: grid;
  grid-template-columns: 1.2fr 160px 1fr;
  gap: 12px;
}

.target-description-box {
  grid-column: 1;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 12px;
  margin-top: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.target-description-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  color: #303133;
}

.target-description-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
