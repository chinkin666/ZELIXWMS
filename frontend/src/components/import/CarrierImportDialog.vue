<template>
  <ODialog
    :open="visible"
    title="送り状データ取込"
    size="lg"
    @close="handleClose"
  >
    <div class="import-dialog-content">
      <!-- 一致条件 -->
      <div class="match-section">
        <h3>一致条件（キー）</h3>
        <div class="match-row">
          <div class="match-item">
            <div class="match-label">注文の項目</div>
            <select class="o-input" v-model="orderMatchField" style="width: 100%">
              <option v-for="opt in orderMatchFieldOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="match-eq">=</div>
          <div class="match-item">
            <div class="match-label">ファイルの列</div>
            <select class="o-input" v-model="fileMatchColumn" style="width: 100%">
              <option value="">列を選択</option>
              <option v-for="h in fileHeaders" :key="h" :value="h">{{ h }}</option>
            </select>
          </div>
        </div>
        <div class="match-hint">
          例: 注文の「出荷管理No（orderNumber）」= ファイルの「注文番号」列
        </div>
      </div>

      <!-- ファイルアップロード -->
      <div class="upload-section">
        <h3>ファイルをアップロード</h3>
        <div
          class="upload-drop-zone"
          :class="{ 'drag-over': dragOver }"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
          @drop.prevent="handleDrop"
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
        <!-- CSV 编码选择 -->
        <div v-if="isCsvFile" class="encoding-section">
          <div class="o-form-group" style="margin-top: 12px; margin-bottom: 0">
            <label class="o-form-label">文字コード</label>
            <select class="o-input" v-model="fileEncoding" style="width: 200px">
              <option v-for="enc in encodingOptions" :key="enc.value" :value="enc.value">{{ enc.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- プレビュー -->
      <div v-if="previewRows.length > 0" class="preview-section">
        <h3>
          プレビュー（先頭 {{ previewRows.length }} 件 / 全 {{ parsedRows.length }} 件）
          <span v-if="fileHeaders.length > 12" style="color: #e6a23c; font-size: 12px; font-weight: normal;">
            ※列は先頭12列のみ表示（全{{ fileHeaders.length }}列）
          </span>
        </h3>
        <div style="max-height: 200px; overflow: auto; border: 1px solid var(--o-border-color, #dee2e6); border-radius: 4px">
          <table class="o-list-table" style="font-size: 12px">
            <thead>
              <tr>
                <th v-for="h in previewHeaders" :key="h" style="min-width: 120px">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in previewRows" :key="idx">
                <td v-for="h in previewHeaders" :key="h">{{ row[h] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 导入结果 -->
      <div
        v-if="lastResult"
        class="result-alert"
        :class="lastResult.data ? 'result-alert--success' : 'result-alert--warning'"
      >
        <div class="result-alert__header">
          <strong>取込結果</strong>
        </div>
        <div class="result-meta">
          <div>行数：<strong>{{ lastResult.data?.totalRows ?? 0 }}</strong></div>
          <div>空キー行スキップ：<strong>{{ lastResult.data?.skippedEmpty ?? 0 }}</strong></div>
          <div>一致（注文）：<strong>{{ lastResult.data?.matchedOrders ?? 0 }}</strong></div>
          <div>更新（注文）：<strong>{{ lastResult.data?.updatedOrders ?? 0 }}</strong></div>
        </div>
        <div v-if="(lastResult.data?.unmatched?.length || 0) > 0" class="result-sub">
          未一致：<strong>{{ lastResult.data?.unmatched.length }}</strong>（先頭5件: {{ lastResult.data?.unmatched.slice(0, 5).join(', ') }}）
        </div>
        <div v-if="(lastResult.data?.ambiguous?.length || 0) > 0" class="result-sub">
          複数一致：<strong>{{ lastResult.data?.ambiguous.length }}</strong>（先頭5件: {{ lastResult.data?.ambiguous.slice(0, 5).join(', ') }}）
        </div>
        <div v-if="(lastResult.data?.duplicatedInFile?.length || 0) > 0" class="result-sub">
          ファイル内重複：<strong>{{ lastResult.data?.duplicatedInFile.length }}</strong>（先頭5件: {{ lastResult.data?.duplicatedInFile.slice(0, 5).join(', ') }}）
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <OButton type="button" variant="secondary" @click="handleClose">キャンセル</OButton>
        <OButton
          type="button"
          variant="primary"
          :disabled="!canImport || importing"
          @click="handleImport"
        >
          <span v-if="importing" class="spinner"></span>
          {{ importing ? '取込中...' : '取込' }}
        </OButton>
      </div>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import { importCarrierReceiptRows, type ImportCarrierReceiptRowsResult } from '@/api/shipmentOrders'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'imported': []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const fileInputRef = ref<HTMLInputElement>()
const dragOver = ref(false)
const selectedFile = ref<File | null>(null)
const fileName = ref('')
const fileHeaders = ref<string[]>([])
const parsedRows = ref<Record<string, any>[]>([])
const importing = ref(false)
const lastResult = ref<ImportCarrierReceiptRowsResult | null>(null)

const fileMatchColumn = ref('')
const orderMatchField = ref<'orderNumber' | 'customerManagementNumber' | 'recipient.phone' | 'recipient.postalCode'>('orderNumber')
const fileEncoding = ref<'auto' | 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk'>('auto')

const orderMatchFieldOptions = [
  { label: '出荷管理No（orderNumber）', value: 'orderNumber' },
  { label: 'お客様管理番号（customerManagementNumber）', value: 'customerManagementNumber' },
  { label: 'お届け先電話（recipient.phone）', value: 'recipient.phone' },
  { label: 'お届け先郵便番号（recipient.postalCode）', value: 'recipient.postalCode' },
] as const

const encodingOptions = [
  { label: '自動判定 (推奨)', value: 'auto' },
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'UTF-8 (BOM)', value: 'utf-8-sig' },
  { label: 'Shift_JIS', value: 'shift_jis' },
  { label: 'GBK/GB18030', value: 'gbk' },
]

const isCsvFile = computed(() => {
  if (!selectedFile.value) return false
  return selectedFile.value.name.toLowerCase().endsWith('.csv')
})

const canImport = computed(() => {
  return !!selectedFile.value && parsedRows.value.length > 0 && !!fileMatchColumn.value && !!orderMatchField.value
})

const previewRows = computed(() => parsedRows.value.slice(0, 10))
const previewHeaders = computed(() => fileHeaders.value.slice(0, 12))

// --- File parsing ---

const detectCsvEncoding = (buf: ArrayBuffer): 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk' => {
  const bytes = new Uint8Array(buf)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8-sig'
  }
  const decodeWith = (b: ArrayBuffer, enc: string): string => {
    try {
      return new TextDecoder(enc as any, { fatal: false }).decode(b)
    } catch {
      return new TextDecoder('utf-8').decode(b)
    }
  }
  const utf8Text = decodeWith(buf, 'utf-8')
  const sjisText = decodeWith(buf, 'shift_jis')
  const gbkText = decodeWith(buf, 'gb18030')
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
  return scores.sort((a, b) => b.val - a.val)[0]?.enc ?? 'utf-8'
}

const decodeWithEncoding = (buf: ArrayBuffer, enc: string): string => {
  try {
    return new TextDecoder(enc === 'gbk' ? 'gb18030' : (enc as any), { fatal: false }).decode(buf)
  } catch {
    return new TextDecoder('utf-8').decode(buf)
  }
}

const parseSheetToRows = (wb: any): Record<string, any>[] => {
  if (!wb?.SheetNames || wb.SheetNames.length === 0) return []
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []

  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headers: string[] = []

  for (let col = range.s.c; col <= range.e.c; col++) {
    const addr = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = sheet[addr]
    const value = cell?.w != null ? String(cell.w) : (cell?.v != null ? String(cell.v) : '')
    headers.push(value.trim())
  }

  // 列ヘッダーと元の列インデックスを保持（空ヘッダーによるインデックスずれ防止）
  const headerMap: Array<{ name: string; col: number }> = []
  for (let col = range.s.c; col <= range.e.c; col++) {
    const h = headers[col - range.s.c]
    if (h) headerMap.push({ name: h, col })
  }
  if (headerMap.length === 0) return []

  const rows: Record<string, any>[] = []
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const obj: Record<string, any> = {}
    for (const { name, col } of headerMap) {
      const addr = XLSX.utils.encode_cell({ r: row, c: col })
      const cell = sheet[addr]
      obj[name] = cell?.w != null ? String(cell.w) : (cell?.v != null ? String(cell.v) : '')
    }
    rows.push(obj)
  }

  return rows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''))
}

const parseFile = async (file: File): Promise<Record<string, any>[]> => {
  const isExcel = file.type.includes('sheet') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')
  if (isExcel) {
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    return parseSheetToRows(wb)
  }
  const buf = await file.arrayBuffer()
  const enc = fileEncoding.value === 'auto' ? detectCsvEncoding(buf) : (fileEncoding.value as any)
  let text = decodeWithEncoding(buf, enc)
  if (enc === 'utf-8-sig' && text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1)
  }
  const wb = XLSX.read(text, { type: 'string' })
  return parseSheetToRows(wb)
}

const MAX_FILE_SIZE_MB = 10

const processFile = async (file: File) => {
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    toast.showWarning(`ファイルサイズが大きすぎます（上限 ${MAX_FILE_SIZE_MB}MB）`)
    return
  }
  selectedFile.value = file
  fileName.value = file.name
  parsedRows.value = []
  fileHeaders.value = []
  fileMatchColumn.value = ''

  try {
    const rows = await parseFile(file)
    parsedRows.value = rows
    const headers = rows.length ? Object.keys(rows[0] || {}) : []
    fileHeaders.value = headers
    if (headers.length) fileMatchColumn.value = headers[0] ?? ''
  } catch (e: any) {
    toast.showError(e?.message || 'ファイルの解析に失敗しました')
  }
}

// --- Event handlers ---

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleNativeFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) processFile(file)
}

const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls']

const handleDrop = (e: DragEvent) => {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const name = file.name.toLowerCase()
  if (!ALLOWED_EXTENSIONS.some(ext => name.endsWith(ext))) {
    toast.showWarning('CSV、XLSX、XLS ファイルのみ対応しています')
    return
  }
  processFile(file)
}

// Re-parse on encoding change
watch(fileEncoding, async () => {
  if (!selectedFile.value || !isCsvFile.value) return
  try {
    const rows = await parseFile(selectedFile.value)
    parsedRows.value = rows
    const headers = rows.length ? Object.keys(rows[0] || {}) : []
    fileHeaders.value = headers
    if (headers.length && !headers.includes(fileMatchColumn.value)) {
      fileMatchColumn.value = headers[0] ?? ''
    }
  } catch (e: any) {
    parsedRows.value = []
    fileHeaders.value = []
    fileMatchColumn.value = ''
    toast.showError(e?.message || 'ファイルの再解析に失敗しました')
  }
})

// --- Import ---

const handleImport = async () => {
  if (!canImport.value || importing.value) return

  const items = parsedRows.value.map((r) => ({
    matchValue: r?.[fileMatchColumn.value],
    carrierRawRow: r,
  }))

  const emptyCount = items.filter(i => i.matchValue == null || String(i.matchValue).trim() === '').length
  if (emptyCount === items.length) {
    toast.showWarning(`選択した列「${fileMatchColumn.value}」の値がすべて空です。列の選択を確認してください。`)
    return
  }

  importing.value = true
  try {
    const res = await importCarrierReceiptRows({
      orderMatchField: orderMatchField.value,
      items,
    })
    lastResult.value = res
    toast.showSuccess(res?.message || '取込しました')
    emit('imported')
  } catch (e: any) {
    toast.showError(e?.message || '取込に失敗しました')
  } finally {
    importing.value = false
  }
}

// --- Close / Reset ---

const handleClose = () => {
  visible.value = false
  selectedFile.value = null
  fileName.value = ''
  fileHeaders.value = []
  parsedRows.value = []
  fileMatchColumn.value = ''
  fileEncoding.value = 'auto'
  orderMatchField.value = 'orderNumber'
  importing.value = false
  lastResult.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}
</script>

<style scoped>
.import-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.match-section,
.upload-section,
.preview-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match-section h3,
.upload-section h3,
.preview-section h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.match-row {
  display: grid;
  grid-template-columns: 1fr 40px 1fr;
  gap: 12px;
  align-items: end;
}

.match-label {
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
}

.match-eq {
  text-align: center;
  font-weight: 700;
  color: #909399;
  padding-bottom: 12px;
}

.match-hint {
  font-size: 12px;
  color: #909399;
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

.o-form-group {
  margin-bottom: 1rem;
}

.o-form-label {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #495057);
  margin-bottom: 0.25rem;
}

.result-alert {
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid;
}

.result-alert--success {
  background: #f0f9eb;
  border-color: #b3e19d;
  color: #67c23a;
}

.result-alert--warning {
  background: #fdf6ec;
  border-color: #f5dab1;
  color: #e6a23c;
}

.result-alert__header {
  margin-bottom: 8px;
  color: #303133;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 13px;
  color: #303133;
}

.result-sub {
  margin-top: 6px;
  font-size: 13px;
  color: #606266;
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
</style>
