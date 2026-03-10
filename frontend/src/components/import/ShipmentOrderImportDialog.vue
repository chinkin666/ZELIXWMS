<template>
  <el-dialog
    v-model="visible"
    title="一括登録"
    width="960px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="import-dialog-content">
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-position="top"
        class="import-form"
      >
        <!-- 出荷予定日 -->
        <el-form-item prop="shipPlanDate">
          <template #label>
            <span class="form-label">出荷予定日</span>
            <el-tag type="danger" size="small" class="required-tag">必須</el-tag>
          </template>
          <el-date-picker
            v-model="formData.shipPlanDate"
            type="date"
            placeholder="年/月/日"
            format="YYYY/MM/DD"
            value-format="YYYY/MM/DD"
            style="width: 100%"
          />
        </el-form-item>

        <!-- 登録データ形式 -->
        <el-form-item prop="configId">
          <template #label>
            <span class="form-label">登録データ形式</span>
            <el-tag type="danger" size="small" class="required-tag">必須</el-tag>
          </template>
          <el-select
            v-model="formData.configId"
            placeholder="レイアウトを選択"
            style="width: 100%"
            :loading="loadingConfigs"
            filterable
          >
            <el-option
              v-for="config in mappingConfigs"
              :key="config._id"
              :label="config.name"
              :value="config._id"
            />
          </el-select>
        </el-form-item>

        <!-- ご依頼主 -->
        <el-form-item prop="orderSourceCompanyId">
          <template #label>
            <span class="form-label">ご依頼主</span>
          </template>
          <el-select
            v-model="formData.orderSourceCompanyId"
            placeholder="ご依頼主を選択"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="company in orderSourceCompanies"
              :key="company._id"
              :label="company.senderName"
              :value="company._id"
            />
          </el-select>
        </el-form-item>

        <!-- 配送業者 -->
        <el-form-item prop="carrierId">
          <template #label>
            <span class="form-label">配送業者</span>
            <el-tag type="danger" size="small" class="required-tag">必須</el-tag>
          </template>
          <el-select
            v-model="formData.carrierId"
            placeholder="配送業者を選択"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="carrier in carriers"
              :key="carrier._id"
              :label="`${carrier.name} (${carrier.code})`"
              :value="carrier._id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- ファイルアップロード（ドラッグ&ドロップ） -->
      <div class="upload-section">
        <h3>ファイルをアップロード</h3>
        <el-upload
          ref="uploadRef"
          drag
          action="#"
          :auto-upload="false"
          :multiple="false"
          accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          :on-change="handleFileChange"
          :show-file-list="true"
          :file-list="fileList"
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <div class="el-upload__text">
            ファイルをここにドロップするか <em>クリックして選択</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              対応形式: CSV, XLSX, XLS
            </div>
          </template>
        </el-upload>
        <div v-if="fileName" class="file-info">
          <el-text type="success">選択中: {{ fileName }}</el-text>
        </div>
        <!-- 编码选择（仅 CSV 文件时显示） -->
        <div v-if="isCsvFile" class="encoding-section">
          <el-form-item label="文字コード" style="margin-top: 12px; margin-bottom: 0">
            <el-select
              v-model="fileEncoding"
              style="width: 200px"
              @change="handleEncodingChange"
            >
              <el-option
                v-for="enc in encodingOptions"
                :key="enc.value"
                :label="enc.label"
                :value="enc.value"
              />
            </el-select>
          </el-form-item>
        </div>
      </div>

      <!-- 预览区域 -->
      <div v-if="previewRows.length > 0" class="preview-section">
        <h3>プレビュー（最初の5行）</h3>
        <el-table :data="previewRows" max-height="200" border size="small">
          <el-table-column
            v-for="(value, key) in previewRows[0]"
            :key="key"
            :prop="String(key)"
            :label="String(key)"
            min-width="120"
          />
        </el-table>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">キャンセル</el-button>
        <el-button
          type="primary"
          :disabled="!canImport"
          :loading="importing"
          @click="handleImport"
        >
          一括登録
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  ElDialog,
  ElForm,
  ElFormItem,
  ElDatePicker,
  ElSelect,
  ElOption,
  ElUpload,
  ElButton,
  ElTag,
  ElMessage,
  ElIcon,
  ElText,
  ElTable,
  ElTableColumn,
} from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadInstance, UploadFile } from 'element-plus'
import * as XLSX from 'xlsx'
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

const formRef = ref<FormInstance>()
const uploadRef = ref<UploadInstance>()
const fileList = ref<UploadFile[]>([])
const fileName = ref<string>('')
const selectedFile = ref<File | null>(null)
const mappingConfigs = ref<MappingConfig[]>([])
const loadingConfigs = ref(false)
const importing = ref(false)
const fileEncoding = ref<'auto' | 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk'>(props.defaultFileEncoding || 'shift_jis')
const previewRows = ref<Record<string, any>[]>([])

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

const formData = reactive({
  shipPlanDate: '',
  configId: '',
  orderSourceCompanyId: '',
  carrierId: '',
  file: null as File | null,
})

const formRules: FormRules = {
  shipPlanDate: [{ required: true, message: '出荷予定日を選択してください', trigger: 'change' }],
  configId: [{ required: true, message: '登録データ形式を選択してください', trigger: 'change' }],
  carrierId: [{ required: true, message: '配送業者を選択してください', trigger: 'change' }],
}

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
    console.error('Failed to load mapping configs:', error)
    ElMessage.error('レイアウトの読み込みに失敗しました')
  } finally {
    loadingConfigs.value = false
  }
}

// File change handler
const handleFileChange = (file: UploadFile) => {
  const rawFile = file.raw as File
  if (!rawFile) {
    selectedFile.value = null
    fileName.value = ''
    formData.file = null
    previewRows.value = []
    return
  }

  selectedFile.value = rawFile
  fileName.value = rawFile.name
  formData.file = rawFile
  fileList.value = [file]

  // Trigger preview if config is selected
  if (formData.configId) {
    parseAndPreview()
  }
}

// File remove handler
const handleFileRemove = () => {
  selectedFile.value = null
  fileName.value = ''
  formData.file = null
  fileList.value = []
  previewRows.value = []
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
    const mappedRows = []
    for (const row of rows.slice(0, 5)) {
      const mapped = await applyTransformMappings(transformMappings, row)
      mappedRows.push(mapped)
    }
    // Flatten nested objects for preview display
    previewRows.value = mappedRows.map(row => flattenForPreview(row))
  } catch (error) {
    console.error('Failed to parse file:', error)
    previewRows.value = []
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
  const decodeWithEncoding = (buf: ArrayBuffer, enc: string): string => {
    try {
      const decoder = new TextDecoder(enc as any, { fatal: false })
      return decoder.decode(buf)
    } catch {
      return new TextDecoder('utf-8').decode(buf)
    }
  }
  const utf8Text = decodeWithEncoding(buf, 'utf-8')
  const sjisText = decodeWithEncoding(buf, 'shift_jis')
  const gbkText = decodeWithEncoding(buf, 'gb18030')
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
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  return parseSheetToRows(wb)
}

const parseCsvFile = async (file: File): Promise<Record<string, any>[]> => {
  try {
    const buf = await file.arrayBuffer()
    const encoding = fileEncoding.value === 'auto' ? detectCsvEncoding(buf) : fileEncoding.value
    let text = decodeWithEncoding(buf, encoding)
    if (encoding === 'utf-8-sig' && text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1)
    }
    const wb = XLSX.read(text, { type: 'string' })
    return parseSheetToRows(wb)
  } catch (error) {
    console.error('CSV parsing failed:', error)
    ElMessage.error('CSVファイルの解析に失敗しました')
    throw error
  }
}

const parseSheetToRows = (wb: any): Record<string, any>[] => {
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
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
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
        shipPlanDate: formData.shipPlanDate,
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
    ElMessage.success(`${importedRows.length}件のデータを取り込みしました`)
    handleClose()
  } catch (error) {
    console.error('Failed to import:', error)
    ElMessage.error('取り込みに失敗しました')
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
  fileEncoding.value = props.defaultFileEncoding || 'shift_jis'
  formData.shipPlanDate = ''
  formData.configId = ''
  formData.orderSourceCompanyId = ''
  formData.carrierId = ''
  formData.file = null
}

// Load configs when dialog opens
watch(visible, (newVal) => {
  if (newVal) {
    loadMappingConfigs()
    // Set default ship plan date to today
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    formData.shipPlanDate = `${y}/${m}/${d}`
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
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-weight: 500;
  color: #303133;
}

.required-tag {
  margin-left: 8px;
  vertical-align: middle;
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

.upload-icon {
  font-size: 48px;
  color: var(--el-color-primary);
}

.file-info {
  margin-top: 8px;
}

.encoding-section {
  margin-top: 12px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-form-item__label) {
  display: flex;
  align-items: center;
}

:deep(.el-upload-dragger) {
  width: 100%;
}
</style>
