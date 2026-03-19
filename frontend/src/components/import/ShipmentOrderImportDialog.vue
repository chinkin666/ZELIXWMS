<template>
  <ODialog
    :open="visible"
    title="出荷指示一括登録"
    size="lg"
    @close="handleClose"
  >
    <div class="import-dialog-content">
      <form class="import-form">
        <!-- 出荷予定日 -->
        <div class="o-form-group">
          <label class="o-form-label">
            <span class="form-label">出荷予定日</span>
            <span class="required-badge">必須</span>
          </label>
          <ODatePicker
            v-model="formData.shipPlanDate"
            :min="todayStr"
          />
        </div>

        <!-- 登録データ形式 -->
        <div class="o-form-group">
          <label class="o-form-label">
            <span class="form-label">取込レイアウト</span>
            <span class="required-badge">必須</span>
          </label>
          <select
            class="o-input"
            v-model="formData.configId"
            style="width: 100%"
          >
            <option value="" disabled>レイアウトを選択してください</option>
            <option
              v-for="config in mappingConfigs"
              :key="config._id"
              :value="config._id"
            >{{ config.name }}</option>
          </select>
        </div>

        <!-- ご依頼主 -->
        <div class="o-form-group">
          <label class="o-form-label">
            <span class="form-label">ご依頼主</span>
          </label>
          <select
            class="o-input"
            v-model="formData.orderSourceCompanyId"
            style="width: 100%"
          >
            <option value="">ご依頼主を選択</option>
            <option
              v-for="company in orderSourceCompanies"
              :key="company._id"
              :value="company._id"
            >{{ company.senderName }}</option>
          </select>
        </div>

        <!-- 配送業者 -->
        <div class="o-form-group">
          <label class="o-form-label">
            <span class="form-label">配送業者</span>
            <span class="required-badge">必須</span>
          </label>
          <select
            class="o-input"
            v-model="formData.carrierId"
            style="width: 100%"
          >
            <option value="" disabled>配送業者を選択</option>
            <option
              v-for="carrier in carriers"
              :key="carrier._id"
              :value="carrier._id"
            >{{ `${carrier.name} (${carrier.code})` }}</option>
          </select>
        </div>
      </form>

      <!-- ファイルアップロード（ドラッグ&ドロップ） -->
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
            ここにファイルをドラッグ＆ドロップするか、<em>クリックして選択してください</em>
          </div>
          <div class="upload-tip">取込可能形式：CSV、XLSX、XLS</div>
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

      <!-- 验证结果摘要 / バリデーション結果サマリー -->
      <div v-if="previewRows.length > 0 && validationSummary.total > 0" class="validation-summary" :class="{ 'has-errors': validationSummary.errorCount > 0 }">
        <span v-if="validationSummary.errorCount > 0" class="summary-error">
          {{ validationSummary.errorCount }}件エラー
        </span>
        <span v-if="validationSummary.errorCount > 0 && validationSummary.validCount > 0"> / </span>
        <span class="summary-valid">{{ validationSummary.validCount }}件正常</span>
        <span class="summary-total">（全{{ validationSummary.total }}件）</span>
      </div>

      <!-- 预览区域 / プレビューエリア -->
      <div v-if="previewRows.length > 0" class="preview-section">
        <h3>プレビュー（最初の5行）</h3>
        <div style="max-height: 240px; overflow: auto; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px">
          <table class="o-list-table" style="font-size: 12px">
            <thead>
              <tr>
                <th style="min-width: 60px">#</th>
                <th v-for="key in Object.keys(previewRows[0] || {})" :key="key" style="min-width: 120px">{{ key }}</th>
                <th style="min-width: 200px">検証結果</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in previewRows"
                :key="idx"
                :class="{ 'row-error': rowValidationErrors[idx] && rowValidationErrors[idx].length > 0 }"
              >
                <td>{{ idx + 1 }}</td>
                <td v-for="key in Object.keys(previewRows[0] || {})" :key="key">{{ row[key] }}</td>
                <td class="validation-cell">
                  <template v-if="rowValidationErrors[idx] && rowValidationErrors[idx].length > 0">
                    <span
                      v-for="(err, errIdx) in rowValidationErrors[idx]"
                      :key="errIdx"
                      class="validation-error-tag"
                    >{{ err }}</span>
                  </template>
                  <span v-else class="validation-ok">OK</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <OButton type="button" variant="secondary" @click="handleClose">キャンセル</OButton>
        <OButton
          type="button"
          variant="primary"
          :disabled="!canImport || importing || hasCriticalErrors"
          @click="handleImport"
        >
          <span v-if="importing" class="spinner"></span>
          一括登録
        </OButton>
      </div>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import ODatePicker from '@/components/odoo/ODatePicker.vue'
// XLSX动态导入，减少初始包大小 / XLSXを動的インポートし初期バンドルサイズを削減
const loadXLSX = () => import('xlsx')
import { getAllMappingConfigs, type MappingConfig, type TransformMapping } from '@/api/mappingConfig'
import { generateTempId } from '@/types/orderRow'
import { applyTransformMappings } from '@/utils/transformRunner'
import { normalizeDateOnly } from '@/utils/dateNormalize'
import { getNestedValue } from '@/utils/nestedObject'
import type { OrderSourceCompany } from '@/types/orderSourceCompany'
import type { Carrier } from '@/types/carrier'

/**
 * 从 mapped row 中获取值，支持嵌套键和扁平键两种格式
 */
function getRowValue(row: Record<string, any>, path: string, defaultValue: any = ''): any {
  const val = getNestedValue(row, path)
  return val !== undefined ? val : defaultValue
}

const props = defineProps<{
  modelValue: boolean
  orderSourceCompanies: OrderSourceCompany[]
  carriers: Carrier[]
  defaultFileEncoding?: 'auto' | 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'import': [rows: any[]]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const fileInputRef = ref<HTMLInputElement>()
const dragOver = ref(false)
const fileList = ref<any[]>([])
const fileName = ref<string>('')
const selectedFile = ref<File | null>(null)
const mappingConfigs = ref<MappingConfig[]>([])
const loadingConfigs = ref(false)
const importing = ref(false)
const fileEncoding = ref<'auto' | 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk'>(props.defaultFileEncoding || 'shift_jis')
const previewRows = ref<Record<string, any>[]>([])
/** 各行のバリデーションエラーリスト / 每行的验证错误列表 */
const rowValidationErrors = ref<string[][]>([])
/** 全行数のバリデーション結果（プレビュー外含む） / 全行验证结果（包括预览外的行） */
const allRowValidationErrors = ref<string[][]>([])

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

/**
 * 将嵌套对象平铺为扁平键格式，用于预览显示
 */
function flattenForPreview(obj: Record<string, any>, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenForPreview(value, newKey))
    } else if (Array.isArray(value)) {
      result[newKey] = value.length > 0 ? JSON.stringify(value) : ''
    } else {
      result[newKey] = value
    }
  }
  return result
}

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const formData = reactive({
  shipPlanDate: '',
  configId: '',
  orderSourceCompanyId: '',
  carrierId: '',
  file: null as File | null,
})

const selectedConfig = computed(() => {
  return mappingConfigs.value.find((c) => c._id === formData.configId)
})

const canImport = computed(() => {
  return (
    formData.shipPlanDate !== '' &&
    formData.configId !== '' &&
    formData.carrierId !== '' &&
    selectedFile.value !== null
  )
})

/**
 * 行バリデーション：必須フィールド・数量・日付をチェック
 * 行验证：检查必填字段、数量、日期
 */
const validateRow = (row: Record<string, any>): string[] => {
  const errors: string[] = []

  // 必須: 顧客管理番号またはSKU / 必填：客户管理编号或SKU
  const customerManagementNumber = getRowValue(row, 'customerManagementNumber', '')
  const sku = getRowValue(row, 'products.0.sku', '')
  const hasProducts = Array.isArray(row.products) && row.products.length > 0 && row.products[0]?.sku
  if (!customerManagementNumber && !sku && !hasProducts) {
    errors.push('顧客管理番号またはSKUが必要です')
  }

  // 数量チェック / 数量检查
  const qty = getRowValue(row, 'products.0.quantity', undefined)
  const productsArray = Array.isArray(row.products) ? row.products : []
  if (qty !== undefined) {
    const numQty = Number(qty)
    if (isNaN(numQty) || numQty <= 0) {
      errors.push('数量が不正です')
    }
  }
  for (const p of productsArray) {
    if (p?.quantity !== undefined) {
      const numQty = Number(p.quantity)
      if (isNaN(numQty) || numQty <= 0) {
        errors.push('数量が不正です')
        break
      }
    }
  }

  // 配送希望日の形式チェック / 配送希望日格式检查
  const deliveryDate = getRowValue(row, 'deliveryDatePreference', '')
  if (deliveryDate) {
    const normalized = normalizeDateOnly(String(deliveryDate))
    if (!normalized) {
      errors.push('配送希望日の形式が不正です')
    }
  }

  return errors
}

/** バリデーション結果サマリー / 验证结果摘要 */
const validationSummary = computed(() => {
  const total = allRowValidationErrors.value.length
  const errorCount = allRowValidationErrors.value.filter(errs => errs.length > 0).length
  const validCount = total - errorCount
  return { total, errorCount, validCount }
})

/** 重大エラーがあるか（全行エラーの場合） / 是否有严重错误（全行都有错误时） */
const hasCriticalErrors = computed(() => {
  if (allRowValidationErrors.value.length === 0) return false
  return allRowValidationErrors.value.every(errs => errs.length > 0)
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
  formData.file = file

  // Trigger preview if config is selected
  if (formData.configId) {
    parseAndPreview()
  }
}

// Load mapping configs
const loadMappingConfigs = async () => {
  loadingConfigs.value = true
  try {
    const configs = await getAllMappingConfigs('ec-company-to-order')
    mappingConfigs.value = configs
    // Auto-select default config
    const defaultConfig = configs.find((c) => c.isDefault)
    if (defaultConfig) {
      formData.configId = defaultConfig._id
    }
  } catch (error) {
    // マッピング設定読み込み失敗 / Failed to load mapping configs
    alert('レイアウトの読み込みに失敗しました')
  } finally {
    loadingConfigs.value = false
  }
}

// Encoding change handler
const handleEncodingChange = () => {
  if (selectedFile.value && isCsvFile.value && formData.configId) {
    parseAndPreview()
  }
}

// Parse file and generate preview
const parseAndPreview = async () => {
  if (!selectedFile.value || !selectedConfig.value) {
    return
  }

  try {
    const rows = await parseFile(selectedFile.value)
    const config = selectedConfig.value
    const transformMappings = config.mappings as TransformMapping[]

    // 全行をマッピングしてバリデーション / 映射全部行并验证
    const allMappedRows = []
    for (const row of rows) {
      const mapped = await applyTransformMappings(transformMappings, row)
      allMappedRows.push(mapped)
    }
    allRowValidationErrors.value = allMappedRows.map(row => validateRow(row))

    // プレビューは最初の5行のみ / 预览仅显示前5行
    const previewMapped = allMappedRows.slice(0, 5)
    previewRows.value = previewMapped.map(row => flattenForPreview(row))
    rowValidationErrors.value = allRowValidationErrors.value.slice(0, 5)
  } catch (error) {
    // ファイル解析失敗 / Failed to parse file
    previewRows.value = []
    rowValidationErrors.value = []
    allRowValidationErrors.value = []
  }
}

// Watch config changes to re-preview
watch(() => formData.configId, () => {
  if (selectedFile.value && formData.configId) {
    parseAndPreview()
  }
})

// Encoding detection
const detectCsvEncoding = (buf: ArrayBuffer): 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk' => {
  const bytes = new Uint8Array(buf)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8-sig'
  }
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

const decodeWithEncoding = (buf: ArrayBuffer, enc: string): string => {
  try {
    const decoder = new TextDecoder(enc === 'gbk' ? 'gb18030' : (enc as any), { fatal: false })
    return decoder.decode(buf)
  } catch {
    return new TextDecoder('utf-8').decode(buf)
  }
}

// Parse file
const parseFile = async (file: File): Promise<Record<string, any>[]> => {
  const isExcel = file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

  if (isExcel) {
    return parseExcelFile(file)
  } else {
    return parseCsvFile(file)
  }
}

const parseExcelFile = async (file: File): Promise<Record<string, any>[]> => {
  const XLSX = await loadXLSX()
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseSheetToRows(XLSX, wb)
}

const parseCsvFile = async (file: File): Promise<Record<string, any>[]> => {
  try {
    const XLSX = await loadXLSX()
    const buf = await file.arrayBuffer()
    const encoding = fileEncoding.value === 'auto' ? detectCsvEncoding(buf) : fileEncoding.value
    let text = decodeWithEncoding(buf, encoding)
    if (encoding === 'utf-8-sig' && text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1)
    }
    const wb = XLSX.read(text, { type: 'string' })
    return parseSheetToRows(XLSX, wb)
  } catch (error) {
    // CSV解析失敗 / CSV parsing failed
    alert('CSVファイルの解析に失敗しました')
    throw error
  }
}

const parseSheetToRows = (XLSX: any, wb: any): Record<string, any>[] => {
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    return []
  }

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

// Parse handlingTags
const parseHandlingTags = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.filter((tag) => tag && typeof tag === 'string' && tag.trim())
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,;，；\s]+/)
      .map((tag) => tag.trim())
      .filter((tag) => tag)
  }
  return []
}

// Import handler
const handleImport = async () => {
  if (!selectedFile.value || !selectedConfig.value) {
    return
  }

  // Validate form
  const errors: string[] = []
  if (!formData.shipPlanDate) errors.push('出荷予定日を選択してください')
  if (!formData.configId) errors.push('登録データ形式を選択してください')
  if (!formData.carrierId) errors.push('配送業者を選択してください')
  if (errors.length > 0) {
    alert(errors.join('\n'))
    return
  }

  importing.value = true
  try {
    const rows = await parseFile(selectedFile.value)
    const config = selectedConfig.value!
    const transformMappings = config.mappings as TransformMapping[]
    const mappedRows = []

    for (const row of rows) {
      const mapped = await applyTransformMappings(transformMappings, row)
      if (config.configType === 'ec-company-to-order' && (config as any).ecCompanyId) {
        mapped.ecCompanyId = (config as any).ecCompanyId
      }
      mappedRows.push(mapped)
    }

    // Get selected company for sender info
    const selectedCompany = props.orderSourceCompanies.find((c) => c._id === formData.orderSourceCompanyId)

    // Convert to UserOrderRow format
    const now = new Date().toISOString()
    // Normalize shipPlanDate from date input (YYYY-MM-DD) to YYYY/MM/DD
    const normalizedShipPlanDate = formData.shipPlanDate.replace(/-/g, '/')
    const importedRows = mappedRows.map((row, idx) => {
      const sourceRow = rows[idx] || {}

      let products: { sku: string; quantity: number; name: string }[] = []
      const productSku = getRowValue(row, 'products.0.sku', undefined)
      const productQty = getRowValue(row, 'products.0.quantity', undefined)
      const productName = getRowValue(row, 'products.0.name', undefined)
      const productBarcode = getRowValue(row, 'products.0.barcode', undefined)

      if (productSku !== undefined || productQty !== undefined) {
        products = [{
          sku: productSku || '',
          quantity: productQty ? Number(productQty) : 1,
          name: productName || '',
          ...(productBarcode ? { barcode: [String(productBarcode)] } : {}),
        }]
      } else if (Array.isArray(row.products) && row.products.length > 0) {
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

      const tempId = generateTempId()
      const result: any = {
        id: tempId,
        orderNumber: '',
        ...(row.ecCompanyId && { ecCompanyId: row.ecCompanyId }),
        ...(row.sourceOrderAt && { sourceOrderAt: row.sourceOrderAt }),
        // Apply selected settings
        carrierId: formData.carrierId,
        orderSourceCompanyId: formData.orderSourceCompanyId,
        shipPlanDate: normalizedShipPlanDate,
        // Sender info from selected company
        sender: selectedCompany ? {
          postalCode: selectedCompany.senderPostalCode || '',
          prefecture: selectedCompany.senderAddressPrefecture || '',
          city: selectedCompany.senderAddressCity || '',
          street: selectedCompany.senderAddressStreet || '',
          name: selectedCompany.senderName || '',
          phone: selectedCompany.senderPhone || '',
        } : {
          postalCode: getRowValue(row, 'sender.postalCode'),
          prefecture: getRowValue(row, 'sender.prefecture'),
          city: getRowValue(row, 'sender.city'),
          street: getRowValue(row, 'sender.street'),
          name: getRowValue(row, 'sender.name'),
          phone: getRowValue(row, 'sender.phone'),
        },
        // Other fields from file
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
        deliveryTimeSlot: row.deliveryTimeSlot || '',
        deliveryDatePreference: row.deliveryDatePreference ? normalizeDateOnly(row.deliveryDatePreference) : undefined,
        invoiceType: row.invoiceType || '',
        coolType: normalizedCoolType,
        carrierData: {
          yamato: {
            sortingCode: getRowValue(row, 'carrierData.yamato.sortingCode', undefined),
            hatsuBaseNo1: selectedCompany?.hatsuBaseNo1 || getRowValue(row, 'carrierData.yamato.hatsuBaseNo1', undefined),
            hatsuBaseNo2: selectedCompany?.hatsuBaseNo2 || getRowValue(row, 'carrierData.yamato.hatsuBaseNo2', undefined),
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
    // インポート失敗 / Failed to import
    alert('取り込みに失敗しました')
  } finally {
    importing.value = false
  }
}

// Close handler
const handleClose = () => {
  visible.value = false
  selectedFile.value = null
  fileName.value = ''
  fileList.value = []
  previewRows.value = []
  rowValidationErrors.value = []
  allRowValidationErrors.value = []
  fileEncoding.value = props.defaultFileEncoding || 'shift_jis'
  formData.shipPlanDate = ''
  formData.configId = ''
  formData.orderSourceCompanyId = ''
  formData.carrierId = ''
  formData.file = null
  // Reset file input
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// Load configs when dialog opens
watch(visible, (newVal) => {
  if (newVal) {
    loadMappingConfigs()
    // Set default ship plan date to today (YYYY-MM-DD for date input)
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    formData.shipPlanDate = `${y}-${m}-${d}`
  }
})
</script>

<style scoped>
.import-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.import-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 1rem;
}

.o-form-group {
  margin-bottom: 1rem;
}

.o-form-label {
  display: flex;
  align-items: center;
  font-size: var(--o-font-size-small, 13px);
  font-weight: 500;
  color: var(--o-gray-700, #495057);
  margin-bottom: 0.25rem;
}

.form-label {
  font-weight: 500;
  color: #303133;
}

.required-badge {
  display: inline-block;
  background: #dc3545;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  padding: 2px 5px;
  border-radius: 3px;
  margin-left: 6px;
  white-space: nowrap;
}

.upload-section,
.preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-section h3,
.preview-section h3 {
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

.dialog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
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

/* バリデーション結果サマリー / 验证结果摘要 */
.validation-summary {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.validation-summary.has-errors {
  background: #fff3cd;
  border-color: #ffc107;
  color: #856404;
}

.summary-error {
  color: #dc3545;
  font-weight: 700;
}

.summary-valid {
  color: #28a745;
  font-weight: 600;
}

.summary-total {
  color: #6c757d;
  font-weight: 400;
}

/* エラー行ハイライト / 错误行高亮 */
.row-error {
  background: #fff5f5 !important;
}

.row-error td {
  border-bottom-color: #f5c6cb !important;
}

/* バリデーション結果セル / 验证结果单元格 */
.validation-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: flex-start;
}

.validation-error-tag {
  display: inline-block;
  background: #dc3545;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  line-height: 1.4;
}

.validation-ok {
  color: #28a745;
  font-weight: 600;
  font-size: 11px;
}
</style>
