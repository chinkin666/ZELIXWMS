<template>
  <ODialog
    :open="visible"
    title="ファイル登録"
    size="lg"
    @close="handleClose"
  >
    <div class="import-dialog-content">
      <!-- 上半部分：文件上传 -->
      <div class="upload-section">
        <h3>ファイルをアップロード</h3>
        <div
          class="upload-drop-zone"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="handleDrop"
          :class="{ 'drag-over': dragOver }"
          @click="triggerFileInput"
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--o-brand-primary, #714b67)" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div class="upload-text">
            ファイルをここにドロップするか <em>クリックして選択</em>
          </div>
          <div class="upload-tip">対応形式: CSV, XLSX, XLS</div>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          style="display: none"
          @change="handleNativeFileChange"
        />
        <div v-if="fileName" class="file-info">
          <span style="color: var(--o-success, #28a745)">選択中: {{ fileName }}</span>
        </div>
        <!-- 编码选择（仅 CSV 文件时显示） -->
        <div v-if="isCsvFile" class="encoding-section">
          <div class="o-form-group" style="margin-top: 12px; margin-bottom: 0">
            <label class="o-form-label">文字コード</label>
            <select
              class="o-input"
              v-model="fileEncoding"
              style="width: 200px"
              @change="handleEncodingChange"
            >
              <option
                v-for="enc in encodingOptions"
                :key="enc.value"
                :value="enc.value"
              >{{ enc.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 下半部分：Mapping Config 选择 -->
      <div class="mapping-section">
        <h3>レイアウトを選択</h3>
        <select
          class="o-input"
          v-model="selectedConfigId"
          style="width: 100%"
        >
          <option value="" disabled>レイアウトを選択してください</option>
          <option
            v-for="config in mappingConfigs"
            :key="config._id"
            :value="config._id"
          >{{ config.name }}{{ config.isDefault ? ' (デフォルト)' : '' }}</option>
        </select>
        <div v-if="selectedConfig" class="config-info">
          <span style="color: var(--o-gray-500, #6c757d); font-size: var(--o-font-size-small, 13px)">
            {{ selectedConfig.description || '説明なし' }}
          </span>
        </div>
      </div>

      <!-- 重複処理オプション -->
      <div v-if="props.showDuplicateStrategy" class="duplicate-strategy-section">
        <h3>重複処理</h3>
        <div class="strategy-radio-group">
          <label class="strategy-option" :class="{ selected: duplicateStrategy === 'error' }">
            <input type="radio" v-model="duplicateStrategy" value="error" />
            <span class="strategy-label">エラーとして報告</span>
            <span class="strategy-desc">重複があれば取込を中止します</span>
          </label>
          <label class="strategy-option" :class="{ selected: duplicateStrategy === 'skip' }">
            <input type="radio" v-model="duplicateStrategy" value="skip" />
            <span class="strategy-label">スキップ</span>
            <span class="strategy-desc">既存SKUを無視し、新規のみ取込みます</span>
          </label>
          <label class="strategy-option" :class="{ selected: duplicateStrategy === 'overwrite' }">
            <input type="radio" v-model="duplicateStrategy" value="overwrite" />
            <span class="strategy-label">上書き更新</span>
            <span class="strategy-desc">既存SKUを更新し、新規は追加します</span>
          </label>
        </div>
      </div>

      <!-- 预览区域 -->
      <div v-if="previewRows.length > 0" class="preview-section">
        <h3>プレビュー（最初の5行）</h3>
        <div style="max-height: 200px; overflow: auto; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px">
          <table class="o-list-table" style="font-size: 12px">
            <thead>
              <tr>
                <th v-for="key in Object.keys(previewRows[0] || {})" :key="key" style="min-width: 120px">{{ key }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in previewRows" :key="idx">
                <td v-for="key in Object.keys(previewRows[0] || {})" :key="key">{{ row[key] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <button type="button" class="o-btn o-btn-secondary" @click="handleClose">キャンセル</button>
        <button
          type="button"
          class="o-btn o-btn-primary"
          :disabled="!canImport || importing"
          @click="handleImport"
        >
          <span v-if="importing" class="spinner"></span>
          取り込み
        </button>
      </div>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import * as XLSX from 'xlsx'
import { getAllMappingConfigs, type MappingConfig, type TransformMapping } from '@/api/mappingConfig'
import { generateTempId } from '@/types/orderRow'
import { applyTransformMappings } from '@/utils/transformRunner'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import { getNestedValue } from '@/utils/nestedObject'

/**
 * 从 mapped row 中获取值，支持嵌套键和扁平键两种格式
 * 例如：getRowValue(row, 'orderer.postalCode') 会尝试：
 * 1. row.orderer?.postalCode（嵌套结构）
 * 2. row['orderer.postalCode']（扁平键）
 */
function getRowValue(row: Record<string, any>, path: string, defaultValue: any = ''): any {
  const val = getNestedValue(row, path)
  return val !== undefined ? val : defaultValue
}

/**
 * 将嵌套对象平铺为扁平键格式，用于预览显示
 * 例如: { recipient: { postalCode: '123' } } => { 'recipient.postalCode': '123' }
 */
function flattenForPreview(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // 递归平铺嵌套对象
      Object.assign(result, flattenForPreview(value, newKey))
    } else if (Array.isArray(value)) {
      // 数组显示为 JSON 字符串或简单格式
      result[newKey] = value.length > 0 ? JSON.stringify(value) : ''
    } else {
      result[newKey] = value
    }
  }

  return result
}

export type ImportStrategy = 'error' | 'skip' | 'overwrite'

const props = defineProps<{
  modelValue: boolean
  /** mapping-config type to load; default ec-company-to-order */
  configType?: string
  /** emit raw mapped rows without order-specific normalization */
  passthrough?: boolean
  /** default encoding selection for CSV files */
  defaultFileEncoding?: 'auto' | 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk'
  /** show duplicate handling strategy options */
  showDuplicateStrategy?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'import': [rows: any[], strategy?: ImportStrategy]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const fileInputRef = ref<HTMLInputElement>()
const dragOver = ref(false)
const fileList = ref<any[]>([])
const fileName = ref<string | null>(null)
const selectedFile = ref<File | null>(null)
const selectedConfigId = ref<string>('')
const mappingConfigs = ref<MappingConfig[]>([])
const loadingConfigs = ref(false)
const importing = ref(false)
const previewRows = ref<Record<string, any>[]>([])
const fileEncoding = ref<'auto' | 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk'>(props.defaultFileEncoding || 'auto')
const duplicateStrategy = ref<ImportStrategy>('error')

const encodingOptions = [
  { label: '自動判定 (推奨)', value: 'auto' },
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'UTF-8 (BOM)', value: 'utf-8-sig' },
  { label: 'Shift_JIS', value: 'shift_jis' },
  { label: 'GBK/GB18030', value: 'gbk' },
]

const isCsvFile = computed(() => {
  if (!selectedFile.value) return false
  const name = selectedFile.value.name.toLowerCase()
  return name.endsWith('.csv')
})

const selectedConfig = computed(() => {
  return mappingConfigs.value.find((c) => c._id === selectedConfigId.value)
})

const canImport = computed(() => {
  return selectedFile.value !== null && selectedConfigId.value !== ''
})

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleNativeFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  processFile(file)
}

const handleDrop = (e: DragEvent) => {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  processFile(file)
}

const processFile = (file: File) => {
  selectedFile.value = file
  fileName.value = file.name

  // 如果已选择 mapping config，立即解析预览
  if (selectedConfigId.value) {
    parseAndPreview()
  }
}

// 加载 mapping configs
const loadMappingConfigs = async () => {
  loadingConfigs.value = true
  try {
    const configs = await getAllMappingConfigs(props.configType || 'ec-company-to-order')
    mappingConfigs.value = configs
    // 如果有默认配置，自动选择
    const defaultConfig = configs.find((c) => c.isDefault)
    if (defaultConfig) {
      selectedConfigId.value = defaultConfig._id
    }
  } catch (error) {
    console.error('Failed to load mapping configs:', error)
    alert('レイアウトの読み込みに失敗しました')
  } finally {
    loadingConfigs.value = false
  }
}

// 监听 mapping config 变化，重新解析
watch(selectedConfigId, () => {
  if (selectedFile.value && selectedConfigId.value) {
    parseAndPreview()
  }
})

// 解析文件并预览
const parseAndPreview = async () => {
  if (!selectedFile.value || !selectedConfig.value) {
    return
  }

  try {
    const rows = await parseFile(selectedFile.value)
    const config = selectedConfig.value

    // Use transform mappings
      const transformMappings = config.mappings as TransformMapping[]
      const mappedRows = []
      for (const row of rows.slice(0, 5)) {
        const mapped = await applyTransformMappings(transformMappings, row)
        mappedRows.push(mapped)
      }
      // 平铺嵌套对象用于预览显示
      previewRows.value = mappedRows.map(row => flattenForPreview(row))
  } catch (error) {
    console.error('Failed to parse file:', error)
    alert('ファイルの解析に失敗しました')
    previewRows.value = []
  }
}

// 解析文件
const parseFile = async (file: File): Promise<Record<string, any>[]> => {
  const isExcel = file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

  if (isExcel) {
    return parseExcelFile(file)
  } else {
    return parseCsvFile(file)
  }
}

// 解析 Excel 文件
const parseExcelFile = async (file: File): Promise<Record<string, any>[]> => {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseSheetToRows(wb)
}

// 编码检测函数（与 wizard 保持一致）
const detectCsvEncoding = (buf: ArrayBuffer): 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk' => {
  const bytes = new Uint8Array(buf)
  // 检测 BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8-sig'
  }
  // 尝试解码并评分
  const decodeWithEnc = (buf: ArrayBuffer, enc: string): string => {
    try {
      const decoder = new TextDecoder(enc as any, { fatal: false })
      return decoder.decode(buf)
    } catch {
      return new TextDecoder('utf-8').decode(buf)
    }
  }
  const utf8Text = decodeWithEnc(buf, 'utf-8')
  const sjisText = decodeWithEnc(buf, 'shift_jis')
  const gbkText = decodeWithEnc(buf, 'gb18030')
  const score = (text: string) => {
    const invalid = (text.match(/\uFFFD/g) || []).length
    const cjk = (text.match(/[\u3040-\u30ff\u4e00-\u9fa5]/g) || []).length
    return cjk - invalid * 5
  }
  const scores = [
    { enc: 'utf-8' as const, val: score(utf8Text) },
    { enc: 'shift_jis' as const, val: score(sjisText) },
    { enc: 'gbk' as const, val: score(gbkText) },
  ]
  const best = scores.sort((a, b) => b.val - a.val)[0]
  return best?.enc ?? 'utf-8'
}

// 解码函数（与 wizard 保持一致）
const decodeWithEncoding = (buf: ArrayBuffer, enc: string): string => {
  try {
    const decoder = new TextDecoder(enc === 'gbk' ? 'gb18030' : (enc as any), { fatal: false })
    return decoder.decode(buf)
  } catch {
    return new TextDecoder('utf-8').decode(buf)
  }
}

// 解析 CSV 文件（使用与 wizard 相同的方法）
const parseCsvFile = async (file: File): Promise<Record<string, any>[]> => {
  try {
    const buf = await file.arrayBuffer()
    // 使用用户选择的编码，如果是 'auto' 则自动检测
    const encoding = fileEncoding.value === 'auto' ? detectCsvEncoding(buf) : fileEncoding.value
    // 解码为文本
    let text = decodeWithEncoding(buf, encoding)
    // 移除 BOM（如果有）
    if (encoding === 'utf-8-sig' && text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1)
    }
    // 使用 XLSX 解析 CSV 文本
    const wb = XLSX.read(text, { type: 'string' })
    return parseSheetToRows(wb)
  } catch (error) {
    console.error('CSV parsing failed:', error)
    alert('CSVファイルの解析に失敗しました。エンコーディング（UTF-8 または Shift-JIS）を確定してください。')
    throw error
  }
}

// 编码变化处理
const handleEncodingChange = () => {
  // 如果已选择文件且是 CSV，重新解析预览
  if (selectedFile.value && isCsvFile.value && selectedConfigId.value) {
    parseAndPreview()
  }
}

// 辅助函数：将 XLSX sheet 转换为行数组
// NOTE: some xlsx typings don't expose WorkBook type consistently; keep it permissive here.
// 使用原始显示值（cell.w），避免 XLSX 自动格式化日期，纯粹根据 transform 配置来转换
const parseSheetToRows = (wb: any): Record<string, any>[] => {
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    return []
  }

  const sheet = wb.Sheets[wb.SheetNames[0]]

  // 手动读取单元格，使用原始显示值（cell.w），避免 XLSX 自动格式化日期
  // 这样保持 Excel/CSV 中实际显示的值，不进行任何转换，纯粹根据 transform 配置来转换
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headers: string[] = []
  const rows: Record<string, any>[] = []

  // 读取表头（第一行）
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = sheet[cellAddress]
    // 使用 cell.w（显示值）如果存在，否则使用原始值转换为字符串
    const value = cell?.w != null ? String(cell.w) : (cell?.v != null ? String(cell.v) : '')
    headers.push(value.trim())
  }

  // 过滤空表头
  const validHeaders = headers.filter((h) => h)
  if (validHeaders.length === 0) return []

  // 读取数据行（从第二行开始）
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const obj: Record<string, any> = {}
    validHeaders.forEach((header, colIndex) => {
      const col = range.s.c + colIndex
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = sheet[cellAddress]
      // 使用 cell.w（显示值）如果存在，否则使用原始值转换为字符串
      // 这样保持 Excel/CSV 中实际显示的值，不进行任何转换
      const value = cell?.w != null ? String(cell.w) : (cell?.v != null ? String(cell.v) : '')
      obj[header] = value
    })
    // 完全空白行をスキップ（すべてのセルが空文字列の行）
    const isBlank = validHeaders.every((header) => {
      const v = obj[header]
      return v === undefined || v === null || String(v).trim() === ''
    })
    if (!isBlank) {
      rows.push(obj)
    }
  }

  return rows
}

// 导入处理
const handleImport = async () => {
  if (!selectedFile.value || !selectedConfig.value) {
    return
  }

  importing.value = true
  try {
    const rows = await parseFile(selectedFile.value)
    const config = selectedConfig.value!

    // Use transform mappings
      const transformMappings = config.mappings as TransformMapping[]
    const mappedRows = []
      for (const row of rows) {
        const mapped = await applyTransformMappings(transformMappings, row)
        // 从 mapping-config 中读取 ecCompanyId（如果是 ec-company-to-order 类型）
        if (config.configType === 'ec-company-to-order' && (config as any).ecCompanyId) {
          mapped.ecCompanyId = (config as any).ecCompanyId
        }
        mappedRows.push(mapped)
    }

    // passthrough mode: emit mapped rows directly (used for product import)
    if (props.passthrough) {
      // Pass strategy if duplicate strategy option is enabled
      emit('import', mappedRows, props.showDuplicateStrategy ? duplicateStrategy.value : undefined)
      alert(`${mappedRows.length}件のデータを取り込みしました`)
      handleClose()
      return
    }

    // 辅助函数：解析 handlingTags（支持字符串和数组格式）
    const parseHandlingTags = (value: any): string[] => {
      if (Array.isArray(value)) {
        return value.filter((tag) => tag && typeof tag === 'string' && tag.trim())
      }
      if (typeof value === 'string' && value.trim()) {
        // 支持逗号、分号、空格分隔的字符串
        return value
          .split(/[,;，；\s]+/)
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      }
      return []
    }

    // 辅助函数：导入时规范化 boolean（"0"/"1" 等字符串要正确处理）
    const coerceImportBoolean = (val: any, defaultValue = false): boolean => {
      if (val === undefined || val === null) return defaultValue
      if (typeof val === 'boolean') return val
      if (typeof val === 'number') return val !== 0
      if (typeof val === 'string') {
        const toHalfWidthDigits = (input: string) =>
          input.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))

        const s = toHalfWidthDigits(val).trim().toLowerCase()
        if (!s || s === '-') return defaultValue
        if (s === 'true' || s === 'yes' || s === 'y' || s === 'はい') return true
        if (s === 'false' || s === 'no' || s === 'n' || s === 'いいえ') return false

        // numeric string: treat 0 as false, non-zero as true
        if (/^[+-]?\d+(?:\.\d+)?$/.test(s)) {
          const n = Number(s)
          if (Number.isFinite(n)) return n !== 0
        }

        return Boolean(s)
      }
      return Boolean(val)
    }

    // 转换为 UserOrderRow 格式（默认行为）
    const now = new Date().toISOString()
    const importedRows = mappedRows.map((row, idx) => {
      const sourceRow = rows[idx] || {}
      // 处理 products：使用 getRowValue 支持嵌套结构（setNestedValue 创建的是 { products: { '0': { sku: ... } } }）
      let products: { sku: string; quantity: number; name: string }[] = []
      const productSku = getRowValue(row, 'products.0.sku', undefined)
      const productQty = getRowValue(row, 'products.0.quantity', undefined)
      const productName = getRowValue(row, 'products.0.name', undefined)
      const productBarcode = getRowValue(row, 'products.0.barcode', undefined)

      if (productSku !== undefined || productQty !== undefined) {
        // 从 products.0.sku、products.0.quantity、products.0.name 和 products.0.barcode 构建 products 数组
        products = [{
          sku: productSku || '',
          quantity: productQty ? Number(productQty) : 1,
          name: productName || '',
          ...(productBarcode ? { barcode: [String(productBarcode)] } : {}),
        }]
      } else if (Array.isArray(row.products) && row.products.length > 0) {
        // 如果已经是 products 数组格式，直接使用
        products = row.products.map((p: any) => ({
          sku: p.sku || '',
          quantity: p.quantity ? Number(p.quantity) : 1,
          name: p.name || '',
          ...(p.barcode ? { barcode: Array.isArray(p.barcode) ? p.barcode : [String(p.barcode)] } : {}),
        }))
      }

      const normalizedCoolType =
        row.coolType === undefined || row.coolType === null || row.coolType === ''
          ? undefined
          : String(row.coolType)

      const normalizedCarrierId = (() => {
        const v = (row as any).carrierId
        if (typeof v === 'string') return v.trim()
        return ''
      })()

      const normalizedECCompanyId = (() => {
        const v = (row as any).ecCompanyId
        if (typeof v === 'string') return v.trim()
        return ''
      })()

      const tempId = generateTempId()
      const result: any = {
        id: tempId,
        orderNumber: '', // システム自動生成（バックエンドで生成される）
        // ECモール（mapping-config から注入される想定）
        ...(normalizedECCompanyId && { ecCompanyId: normalizedECCompanyId }),
        ...(row.sourceOrderAt && { sourceOrderAt: row.sourceOrderAt }),
        carrierId: normalizedCarrierId,
        customerManagementNumber: row.customerManagementNumber || '',
        orderer: {
          postalCode: getRowValue(row, 'orderer.postalCode'),
          prefecture: getRowValue(row, 'orderer.prefecture'),
          city: getRowValue(row, 'orderer.city'),
          street: getRowValue(row, 'orderer.street'),
          name: getRowValue(row, 'orderer.name'),
          phone: getRowValue(row, 'orderer.phone'),
        },
        recipient: {
          postalCode: getRowValue(row, 'recipient.postalCode'),
          prefecture: getRowValue(row, 'recipient.prefecture'),
          city: getRowValue(row, 'recipient.city'),
          street: getRowValue(row, 'recipient.street'),
          name: getRowValue(row, 'recipient.name'),
          phone: getRowValue(row, 'recipient.phone'),
        },
        honorific: row.honorific ?? '様',
        products,
        shipPlanDate: row.shipPlanDate || normalizeDateOnly(new Date()),
        deliveryTimeSlot: row.deliveryTimeSlot || '',
        deliveryDatePreference: row.deliveryDatePreference ? normalizeDateOnly(row.deliveryDatePreference) : undefined,
        invoiceType: row.invoiceType || '',
        coolType: normalizedCoolType,
        sender: {
          postalCode: getRowValue(row, 'sender.postalCode'),
          prefecture: getRowValue(row, 'sender.prefecture'),
          city: getRowValue(row, 'sender.city'),
          street: getRowValue(row, 'sender.street'),
          name: getRowValue(row, 'sender.name'),
          phone: getRowValue(row, 'sender.phone'),
        },
        // 配送会社固有データ（嵌套结构）
        carrierData: {
          yamato: {
            sortingCode: getRowValue(row, 'carrierData.yamato.sortingCode', undefined),
            hatsuBaseNo1: getRowValue(row, 'carrierData.yamato.hatsuBaseNo1', undefined),
            hatsuBaseNo2: getRowValue(row, 'carrierData.yamato.hatsuBaseNo2', undefined),
          },
        },
        handlingTags: parseHandlingTags(row.handlingTags),
        sourceRawRows: [sourceRow],
        createdAt: now,
        updatedAt: now,
      }
      return result
    })

    emit('import', importedRows)
    alert(`${importedRows.length}件のデータを取り込みしました`)
    handleClose()
  } catch (error) {
    console.error('Failed to import:', error)
    alert('取り込みに失敗しました')
  } finally {
    importing.value = false
  }
}

// 关闭处理
const handleClose = () => {
  visible.value = false
  selectedFile.value = null
  fileName.value = null
  fileList.value = []
  selectedConfigId.value = ''
  previewRows.value = []
  fileEncoding.value = props.defaultFileEncoding || 'auto' // 重置编码选择
  duplicateStrategy.value = 'error' // 重置重複処理オプション
  // Reset file input
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// 打开时加载配置
watch(visible, (newVal) => {
  if (newVal) {
    // initialize encoding each time dialog opens
    fileEncoding.value = props.defaultFileEncoding || 'auto'
    loadMappingConfigs()
  }
})
</script>

<style scoped>
.import-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.upload-section,
.mapping-section,
.preview-section,
.duplicate-strategy-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-section h3,
.mapping-section h3,
.preview-section h3,
.duplicate-strategy-section h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.upload-drop-zone {
  border: 2px dashed var(--o-border-color, #dee2e6);
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-drop-zone:hover,
.upload-drop-zone.drag-over {
  border-color: var(--o-brand-primary, #714b67);
  background: var(--o-brand-primary-light, rgba(113, 75, 103, 0.05));
}

.upload-text {
  font-size: 14px;
  color: #606266;
}

.upload-text em {
  color: var(--o-brand-primary, #714b67);
  font-style: normal;
  cursor: pointer;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
}

.file-info {
  margin-top: 8px;
}

.encoding-section {
  margin-top: 12px;
}

.config-info {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.o-form-group {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.o-form-label {
  font-size: var(--o-font-size-small, 13px);
  font-weight: 500;
  color: var(--o-gray-700, #495057);
  flex-shrink: 0;
}

.strategy-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strategy-option {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  transition: border-color 0.2s;
  cursor: pointer;
}

.strategy-option.selected {
  border-color: var(--o-brand-primary, #714b67);
  background-color: rgba(113, 75, 103, 0.05);
}

.strategy-option input[type="radio"] {
  accent-color: var(--o-brand-primary, #714b67);
}

.strategy-label {
  font-weight: 500;
}

.strategy-desc {
  margin-left: 24px;
  margin-top: 2px;
  font-size: var(--o-font-size-small, 13px);
  color: var(--o-gray-500, #6c757d);
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 6px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
