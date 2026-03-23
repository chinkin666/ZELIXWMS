<script setup lang="ts">
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ref, computed, watch } from 'vue'
import OButton from './OButton.vue'

interface FieldDef {
  key: string
  label: string
  required?: boolean
}

interface Props {
  open: boolean
  modelName: string
  availableFields: FieldDef[]
  /** CSV file encoding (default: auto-detect, falls back to shift_jis then utf-8) */
  defaultFileEncoding?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  import: [data: Record<string, any>[]]
}>()

// --- Step management ---
const currentStep = ref(1)
const steps = ['Upload File', 'Column Mapping', 'Preview & Validate', 'Import']

// --- Step 1: File upload ---
const uploadedFile = ref<File | null>(null)
const isDragOver = ref(false)
const parsedHeaders = ref<string[]>([])
const parsedRows = ref<string[][]>([])

// --- Step 2: Column mapping ---
const columnMapping = ref<Record<number, string>>({})

// --- Step 3: Validation ---
type RowStatus = 'valid' | 'warning' | 'error'
interface ValidationRow {
  data: Record<string, any>
  status: RowStatus
  errors: string[]
}
const validatedRows = ref<ValidationRow[]>([])
const expandedErrors = ref<Set<number>>(new Set())

// --- Step 4: Import ---
const duplicateHandling = ref<'skip' | 'update' | 'create'>('skip')
const onFailure = ref<'stop' | 'continue'>('continue')
const isImporting = ref(false)
const importProgress = ref(0)
const importComplete = ref(false)
const importResult = ref({ success: 0, failed: 0, skipped: 0 })

// --- Demo data ---
const DEMO_HEADERS = ['Name', 'Email', 'Phone', 'Type', 'City', 'Country', 'Tags']
const DEMO_ROWS: string[][] = [
  ['Azure Interior', 'azure@example.com', '+1 456-789-0123', 'Company', 'San Francisco', 'United States', 'Furniture'],
  ['Deco Addict', 'deco@example.com', '+33 1 42 68 93 00', 'Company', 'Paris', 'France', 'Decoration'],
  ['Gemini Furniture', 'info@gemini.com', '+1 555-234-5678', 'Company', 'New York', 'United States', 'Furniture'],
  ['Ready Mat', 'mat@ready.com', '+44 20 7946 0958', 'Company', 'London', 'United Kingdom', 'Office'],
  ['The Jackson Group', 'jackson@group.com', '+1 555-345-6789', 'Company', 'Chicago', 'United States', 'Furniture'],
  ['Wood Corner', 'wood@corner.com', '+49 30 1234567', 'Company', 'Berlin', 'Germany', 'Furniture'],
  ['', 'missing@name.com', '+1 555-000-1111', 'Individual', 'Boston', 'United States', 'VIP'],
  ['Lumber Inc', 'lumber@inc.com', '+1 555-222-3333', 'Company', 'Portland', 'United States', 'Premium'],
  ['Office Plus', '', '+1 555-444-5555', 'Company', 'Denver', 'United States', 'Office'],
  ['Green Living', 'green@living.com', '', 'Company', 'Austin', 'United States', 'Eco'],
  ['Metro Design', 'metro@design.com', '+1 555-666-7777', 'Individual', 'Miami', 'United States', 'Decoration'],
  ['Alpha Supply', 'alpha@supply.com', '+44 20 1111 2222', 'Company', 'Manchester', 'United Kingdom', 'Wholesale'],
  ['Quick Parts', 'quick@parts.com', '+1 555-888-9999', 'Company', 'Seattle', 'United States', ''],
  ['Prime Goods', 'prime@goods.com', '+61 2 1234 5678', 'Company', 'Sydney', 'Australia', 'Premium'],
  ['Nova Interiors', 'nova@interiors.com', '+1 555-111-0000', 'Company', 'Los Angeles', 'United States', 'Furniture'],
]

// --- Reset on open ---
watch(() => props.open, (val) => {
  if (val) {
    currentStep.value = 1
    uploadedFile.value = null
    isDragOver.value = false
    parsedHeaders.value = []
    parsedRows.value = []
    columnMapping.value = {}
    validatedRows.value = []
    expandedErrors.value = new Set()
    duplicateHandling.value = 'skip'
    onFailure.value = 'continue'
    isImporting.value = false
    importProgress.value = 0
    importComplete.value = false
    importResult.value = { success: 0, failed: 0, skipped: 0 }
  }
})

// --- CSV parsing ---
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (ch === '"') {
          inQuotes = false
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          result.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseLine(lines[0] ?? '')
  const rows = lines.slice(1).map(parseLine)
  return { headers, rows }
}

function readFileWithEncoding(file: File, encoding: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, encoding)
  })
}

function looksLikeGarbled(text: string): boolean {
  // Check first 500 chars for common mojibake patterns (replacement char, high ratio of CJK-like garble)
  const sample = text.slice(0, 500)
  const replacementCount = (sample.match(/\uFFFD/g) || []).length
  if (replacementCount > 2) return true
  // High ratio of characters in problematic ranges often indicates wrong encoding
  const suspiciousCount = (sample.match(/[\u0080-\u00FF]/g) || []).length
  return suspiciousCount > sample.length * 0.15
}

async function handleFile(file: File) {
  uploadedFile.value = file

  let text: string
  const encoding = props.defaultFileEncoding

  if (encoding) {
    // Explicit encoding specified — use it directly
    text = await readFileWithEncoding(file, encoding)
  } else {
    // Auto-detect: try UTF-8 first, fall back to Shift_JIS if garbled
    text = await readFileWithEncoding(file, 'utf-8')
    if (looksLikeGarbled(text)) {
      text = await readFileWithEncoding(file, 'shift_jis')
    }
  }

  const { headers, rows } = parseCSV(text)
  parsedHeaders.value = headers
  parsedRows.value = rows
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) handleFile(file)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

function useDemoData() {
  uploadedFile.value = new File([''], 'demo_contacts.csv', { type: 'text/csv' })
  parsedHeaders.value = [...DEMO_HEADERS]
  parsedRows.value = DEMO_ROWS.map((r) => [...r])
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function downloadTemplate() {
  const header = props.availableFields.map((f) => f.label).join(',')
  const blob = new Blob([header + '\n'], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.modelName.toLowerCase()}_template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function removeFile() {
  uploadedFile.value = null
  parsedHeaders.value = []
  parsedRows.value = []
  columnMapping.value = {}
}

// --- Step 2: Auto-mapping ---
function initMapping() {
  const mapping: Record<number, string> = {}
  parsedHeaders.value.forEach((header, idx) => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '')
    const match = props.availableFields.find((f) => {
      const fNorm = f.label.toLowerCase().replace(/[^a-z0-9]/g, '')
      const kNorm = f.key.toLowerCase().replace(/[^a-z0-9]/g, '')
      return fNorm === normalized || kNorm === normalized || fNorm.includes(normalized) || normalized.includes(fNorm)
    })
    mapping[idx] = match ? match.key : '__skip__'
  })
  columnMapping.value = mapping
}

const previewRows = computed(() => parsedRows.value.slice(0, 3))

function updateMapping(colIdx: number, fieldKey: string) {
  columnMapping.value = { ...columnMapping.value, [colIdx]: fieldKey }
}

const unmappedRequiredFields = computed(() => {
  const mappedKeys = new Set(Object.values(columnMapping.value))
  return props.availableFields.filter((f) => f.required && !mappedKeys.has(f.key))
})

// --- Step 3: Validation ---
function runValidation() {
  const rows: ValidationRow[] = parsedRows.value.map((row) => {
    const data: Record<string, any> = {}
    const errors: string[] = []

    parsedHeaders.value.forEach((_, colIdx) => {
      const fieldKey = columnMapping.value[colIdx]
      if (fieldKey && fieldKey !== '__skip__') {
        data[fieldKey] = row[colIdx] ?? ''
      }
    })

    // Check required fields
    props.availableFields.forEach((field) => {
      if (field.required) {
        const val = data[field.key]
        if (val === undefined || val === null || String(val).trim() === '') {
          errors.push(`Required field "${field.label}" is empty`)
        }
      }
    })

    // Check email format
    if (data['email'] && data['email'].trim() !== '') {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(data['email'])) {
        errors.push(`Invalid email format: "${data['email']}"`)
      }
    }

    let status: RowStatus = 'valid'
    if (errors.length > 0) {
      const hasMissingRequired = errors.some((e) => e.startsWith('Required'))
      status = hasMissingRequired ? 'error' : 'warning'
    }

    // Heuristic: empty optional fields produce a warning
    const filledCount = Object.values(data).filter((v) => String(v).trim() !== '').length
    const totalCount = Object.keys(data).length
    if (status === 'valid' && totalCount > 0 && filledCount < totalCount * 0.5) {
      status = 'warning'
      errors.push('More than half of the fields are empty')
    }

    return { data, status, errors }
  })

  validatedRows.value = rows
}

const validationSummary = computed(() => {
  const total = validatedRows.value.length
  const valid = validatedRows.value.filter((r) => r.status === 'valid').length
  const warnings = validatedRows.value.filter((r) => r.status === 'warning').length
  const errored = validatedRows.value.filter((r) => r.status === 'error').length
  return { total, valid, warnings, errored }
})

const previewValidatedRows = computed(() => validatedRows.value.slice(0, 10))

const mappedFields = computed(() => {
  const keys = new Set(Object.values(columnMapping.value).filter((k) => k !== '__skip__'))
  return props.availableFields.filter((f) => keys.has(f.key))
})

function toggleErrorDetail(idx: number) {
  const next = new Set(expandedErrors.value)
  if (next.has(idx)) {
    next.delete(idx)
  } else {
    next.add(idx)
  }
  expandedErrors.value = next
}

// --- Step 4: Import ---
async function performImport() {
  isImporting.value = true
  importProgress.value = 0
  importComplete.value = false

  const importable = validatedRows.value.filter((r) => r.status !== 'error')
  const errorCount = validatedRows.value.filter((r) => r.status === 'error').length
  const total = importable.length

  // Simulate import with progress
  for (let i = 0; i <= total; i++) {
    await new Promise((resolve) => setTimeout(resolve, 40))
    importProgress.value = total > 0 ? Math.round((i / total) * 100) : 100
  }

  const skipped = Math.floor(total * 0.05)
  const success = total - skipped

  importResult.value = {
    success,
    failed: errorCount,
    skipped,
  }

  importComplete.value = true
  isImporting.value = false

  // Emit the mapped data
  const data = importable.map((r) => ({ ...r.data }))
  emit('import', data)
}

// --- Navigation ---
function canProceed(step: number): boolean {
  switch (step) {
    case 1:
      return parsedHeaders.value.length > 0 && parsedRows.value.length > 0
    case 2:
      return unmappedRequiredFields.value.length === 0
    case 3:
      return validatedRows.value.length > 0
    default:
      return true
  }
}

function goNext() {
  if (currentStep.value === 1 && canProceed(1)) {
    initMapping()
    currentStep.value = 2
  } else if (currentStep.value === 2 && canProceed(2)) {
    runValidation()
    currentStep.value = 3
  } else if (currentStep.value === 3) {
    currentStep.value = 4
  }
}

function goPrev() {
  if (currentStep.value > 1) {
    currentStep.value = currentStep.value - 1
  }
}

function closeWizard() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="o-dialog">
      <div v-if="open" class="o-wizard-backdrop" @click.self="closeWizard">
        <div class="o-wizard">
          <!-- Header -->
          <div class="o-wizard-header">
            <h4 class="o-wizard-title">Import {{ modelName }}</h4>
            <Button class="o-wizard-close" @click="closeWizard">&times;</Button>
          </div>

          <!-- Step indicator -->
          <div class="o-wizard-steps">
            <div
              v-for="(label, idx) in steps"
              :key="idx"
              class="o-step"
              :class="{
                active: currentStep === idx + 1,
                completed: currentStep > idx + 1,
              }"
            >
              <div class="o-step-circle">
                <svg v-if="currentStep > idx + 1" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                </svg>
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <span class="o-step-label">{{ label }}</span>
              <div v-if="idx < steps.length - 1" class="o-step-line" />
            </div>
          </div>

          <!-- Body -->
          <div class="o-wizard-body">
            <!-- Step 1: Upload -->
            <div v-if="currentStep === 1" class="o-wizard-step-content">
              <div v-if="!uploadedFile" class="o-upload-area" :class="{ dragover: isDragOver }" @dragover="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
                <svg class="o-upload-icon" width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                  <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                </svg>
                <p class="o-upload-text">Drag and drop your file here</p>
                <p class="o-upload-hint">Supported formats: CSV, XLSX</p>
                <div class="o-upload-actions">
                  <label class="o-btn o-btn-primary o-upload-btn">
                    Choose File
                    <input type="file" accept=".csv,.xlsx" hidden @change="onFileSelect" />
                  </label>
                  <Button variant="secondary" @click="useDemoData">Use Demo Data</Button>
                </div>
              </div>

              <div v-else class="o-file-info">
                <div class="o-file-card">
                  <svg class="o-file-icon" width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/>
                  </svg>
                  <div class="o-file-details">
                    <span class="o-file-name">{{ uploadedFile.name }}</span>
                    <span class="o-file-size">{{ formatFileSize(uploadedFile.size) }} &mdash; {{ parsedRows.length }} rows, {{ parsedHeaders.length }} columns</span>
                  </div>
                  <Button class="o-file-remove" @click="removeFile" title="Remove file">&times;</Button>
                </div>
              </div>

              <div class="o-template-download">
                <Button class="o-btn o-btn-link" @click="downloadTemplate">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                  </svg>
                  Download Template
                </button>
              </div>
            </div>

            <!-- Step 2: Column mapping -->
            <div v-if="currentStep === 2" class="o-wizard-step-content">
              <div v-if="unmappedRequiredFields.length > 0" class="o-mapping-warning">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
                Required fields not mapped: {{ unmappedRequiredFields.map(f => f.label).join(', ') }}
              </div>

              <div class="o-mapping-table-wrap">
                <Table class="o-mapping-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Column</TableHead>
                      <TableHead>System Field</TableHead>
                      <TableHead>Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="(header, colIdx) in parsedHeaders" :key="colIdx">
                      <TableCell class="o-mapping-source">{{ header }}</TableCell>
                      <TableCell>
                        <select
                          class="o-mapping-select"
                          :value="columnMapping[colIdx] || '__skip__'"
                          @change="updateMapping(colIdx, ($event.target as HTMLSelectElement).value)"
                        >
                          <option value="__skip__">-- Skip --</option>
                          <option
                            v-for="field in availableFields"
                            :key="field.key"
                            :value="field.key"
                          >
                            {{ field.label }}{{ field.required ? ' *' : '' }}
                          </option>
                        </select>
                      </TableCell>
                      <TableCell class="o-mapping-preview">
                        <span v-for="(row, rIdx) in previewRows" :key="rIdx" class="o-preview-cell">
                          {{ row[colIdx] || '(empty)' }}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <!-- Step 3: Preview & Validate -->
            <div v-if="currentStep === 3" class="o-wizard-step-content">
              <div class="o-validation-summary">
                <div class="o-validation-stat">
                  <span class="o-stat-value">{{ validationSummary.total }}</span>
                  <span class="o-stat-label">Total Rows</span>
                </div>
                <div class="o-validation-stat o-stat-valid">
                  <span class="o-stat-value">{{ validationSummary.valid }}</span>
                  <span class="o-stat-label">Valid</span>
                </div>
                <div class="o-validation-stat o-stat-warning">
                  <span class="o-stat-value">{{ validationSummary.warnings }}</span>
                  <span class="o-stat-label">Warnings</span>
                </div>
                <div class="o-validation-stat o-stat-error">
                  <span class="o-stat-value">{{ validationSummary.errored }}</span>
                  <span class="o-stat-label">Errors</span>
                </div>
              </div>

              <div class="o-preview-table-wrap">
                <Table class="o-preview-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead class="o-col-status">Status</TableHead>
                      <TableHead v-for="field in mappedFields" :key="field.key">{{ field.label }}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="(row, rIdx) in previewValidatedRows"
                      :key="rIdx"
                      :class="`o-row-${row.status}`"
                    >
                      <TableCell class="o-col-status">
                        <Button
                          v-if="row.errors.length > 0"
                          class="o-status-icon-btn"
                          @click="toggleErrorDetail(rIdx)"
                          :title="row.errors.join('; ')"
                        >
                          <span v-if="row.status === 'warning'" class="o-status-icon o-icon-warn">!</span>
                          <span v-else class="o-status-icon o-icon-error">X</span>
                        </button>
                        <span v-else class="o-status-icon o-icon-ok">&#10003;</span>
                      </TableCell>
                      <TableCell v-for="field in mappedFields" :key="field.key">
                        {{ row.data[field.key] || '' }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <!-- Expanded error details -->
              <div v-for="(row, rIdx) in previewValidatedRows" :key="`err-${rIdx}`">
                <div v-if="expandedErrors.has(rIdx) && row.errors.length > 0" class="o-error-detail">
                  <strong>Row {{ rIdx + 1 }}:</strong>
                  <ul>
                    <li v-for="(err, eIdx) in row.errors" :key="eIdx">{{ err }}</li>
                  </ul>
                </div>
              </div>

              <p v-if="validatedRows.length > 10" class="o-preview-note">
                Showing first 10 of {{ validatedRows.length }} rows.
              </p>
            </div>

            <!-- Step 4: Import -->
            <div v-if="currentStep === 4" class="o-wizard-step-content">
              <div v-if="!isImporting && !importComplete" class="o-import-config">
                <div class="o-import-summary-card">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" class="o-import-summary-icon">
                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V0H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5H9.5z"/>
                  </svg>
                  <p>
                    Import <strong>{{ validationSummary.valid + validationSummary.warnings }}</strong> records into <strong>{{ modelName }}</strong>.
                    <span v-if="validationSummary.errored > 0" class="o-import-err-note">
                      {{ validationSummary.errored }} rows with errors will be skipped.
                    </span>
                  </p>
                </div>

                <div class="o-import-options">
                  <div class="o-import-option-group">
                    <label class="o-option-label">Duplicate Handling</label>
                    <div class="o-radio-group">
                      <label class="o-radio"><input type="radio" v-model="duplicateHandling" value="skip" /> Skip duplicates</label>
                      <label class="o-radio"><input type="radio" v-model="duplicateHandling" value="update" /> Update existing</label>
                      <label class="o-radio"><input type="radio" v-model="duplicateHandling" value="create" /> Create new</label>
                    </div>
                  </div>
                  <div class="o-import-option-group">
                    <label class="o-option-label">On Import Failure</label>
                    <div class="o-radio-group">
                      <label class="o-radio"><input type="radio" v-model="onFailure" value="stop" /> Stop import</label>
                      <label class="o-radio"><input type="radio" v-model="onFailure" value="continue" /> Continue importing</label>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="isImporting" class="o-import-progress">
                <p class="o-progress-label">Importing records...</p>
                <div class="o-progress-bar-track">
                  <div class="o-progress-bar-fill" :style="{ width: importProgress + '%' }" />
                </div>
                <p class="o-progress-pct">{{ importProgress }}%</p>
              </div>

              <div v-if="importComplete" class="o-import-result">
                <div class="o-result-icon">
                  <svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                  </svg>
                </div>
                <h3 class="o-result-title">Import Complete</h3>
                <div class="o-result-stats">
                  <div class="o-result-stat o-stat-valid">
                    <span class="o-stat-value">{{ importResult.success }}</span>
                    <span class="o-stat-label">Imported</span>
                  </div>
                  <div class="o-result-stat o-stat-error">
                    <span class="o-stat-value">{{ importResult.failed }}</span>
                    <span class="o-stat-label">Failed</span>
                  </div>
                  <div class="o-result-stat o-stat-warning">
                    <span class="o-stat-value">{{ importResult.skipped }}</span>
                    <span class="o-stat-label">Skipped</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="o-wizard-footer">
            <Button v-if="importComplete" variant="primary" @click="closeWizard">Done</Button>
            <template v-else>
              <Button variant="secondary" @click="closeWizard">Cancel</Button>
              <div class="o-wizard-footer-right">
                <Button v-if="currentStep > 1 && !isImporting" variant="secondary" @click="goPrev">Previous</Button>
                <Button
                  v-if="currentStep < 4"
                  variant="primary"
                  :disabled="!canProceed(currentStep)"
                  @click="goNext"
                >
                  Next
                </Button>
                <Button
                  v-if="currentStep === 4 && !isImporting && !importComplete"
                  variant="primary"
                  @click="performImport"
                >
                  Import
                </Button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Backdrop & wizard shell */
.o-wizard-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}
.o-wizard {
  background: var(--o-view-background, #fff);
  border-radius: var(--o-border-radius, 4px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  width: 900px;
  max-width: 95vw;
  max-height: 90vh;
}

/* Header */
.o-wizard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
}
.o-wizard-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}
.o-wizard-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--o-gray-500, #adb5bd);
  cursor: pointer;
  padding: 0;
}
.o-wizard-close:hover { color: var(--o-gray-900, #212529); }

/* Step indicator */
.o-wizard-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid var(--o-border-color, #dee2e6);
  gap: 0;
}
.o-step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
}
.o-step-circle {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid var(--o-gray-300, #dee2e6);
  background: var(--o-view-background, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--o-gray-500, #adb5bd);
  transition: all 0.3s ease;
  flex-shrink: 0;
}
.o-step.active .o-step-circle {
  border-color: var(--o-brand-primary, #0052A3);
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
  box-shadow: 0 0 0 4px rgba(0, 82, 163, 0.15);
}
.o-step.completed .o-step-circle {
  border-color: var(--o-success, #28a745);
  background: var(--o-success, #28a745);
  color: #fff;
}
.o-step-label {
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-500, #adb5bd);
  white-space: nowrap;
  transition: color 0.3s ease;
}
.o-step.active .o-step-label { color: var(--o-brand-primary, #0052A3); font-weight: 600; }
.o-step.completed .o-step-label { color: var(--o-success, #28a745); }
.o-step-line {
  width: 3rem;
  height: 2px;
  background: var(--o-gray-300, #dee2e6);
  margin: 0 0.5rem;
  transition: background 0.3s ease;
}
.o-step.completed .o-step-line {
  background: var(--o-success, #28a745);
}

/* Body */
.o-wizard-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}
.o-wizard-step-content {
  animation: o-fade-in 0.2s ease;
}
@keyframes o-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Step 1: Upload */
.o-upload-area {
  border: 2px dashed var(--o-gray-300, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.2s ease;
  background: var(--o-view-background, #fff);
}
.o-upload-area.dragover {
  border-color: var(--o-brand-primary, #0052A3);
  background: rgba(0, 82, 163, 0.04);
}
.o-upload-icon {
  color: var(--o-gray-400, #ced4da);
  margin-bottom: 1rem;
}
.o-upload-area.dragover .o-upload-icon {
  color: var(--o-brand-primary, #0052A3);
}
.o-upload-text {
  font-size: 1rem;
  font-weight: 500;
  color: var(--o-gray-700, #495057);
  margin: 0 0 0.375rem;
}
.o-upload-hint {
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-500, #adb5bd);
  margin: 0 0 1.25rem;
}
.o-upload-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}
.o-upload-btn { cursor: pointer; }

.o-file-info { margin-bottom: 1rem; }
.o-file-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-gray-100, #f8f9fa);
}
.o-file-icon { color: var(--o-brand-primary, #0052A3); flex-shrink: 0; }
.o-file-details { flex: 1; display: flex; flex-direction: column; }
.o-file-name { font-weight: 600; font-size: var(--o-font-size-base, 0.875rem); }
.o-file-size { font-size: var(--o-font-size-smaller, 0.75rem); color: var(--o-gray-500, #adb5bd); }
.o-file-remove {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--o-gray-500, #adb5bd);
  cursor: pointer;
  padding: 0 0.25rem;
}
.o-file-remove:hover { color: var(--o-danger, #dc3545); }

.o-template-download { margin-top: 1rem; text-align: center; }
.o-btn-link {
  background: none;
  border: none;
  color: var(--o-brand-primary, #0052A3);
  font-size: var(--o-font-size-base, 0.875rem);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0;
}
.o-btn-link:hover { text-decoration: underline; }

/* Step 2: Mapping */
.o-mapping-warning {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: var(--o-warning-bg, #fff3cd);
  color: var(--o-warning-text, #856404);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-small, 0.8125rem);
  margin-bottom: 1rem;
}
.o-mapping-table-wrap { overflow-x: auto; }
.o-mapping-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--o-font-size-base, 0.875rem);
}
.o-mapping-table th {
  text-align: left;
  padding: 0.625rem 0.75rem;
  background: var(--o-gray-100, #f8f9fa);
  border-bottom: 2px solid var(--o-border-color, #dee2e6);
  font-weight: 600;
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-600, #6c757d);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.o-mapping-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--o-gray-200, #e9ecef);
  vertical-align: middle;
}
.o-mapping-source { font-weight: 500; white-space: nowrap; }
.o-mapping-select {
  width: 100%;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--o-gray-300, #dee2e6);
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 0.875rem);
  outline: none;
  background: var(--o-view-background, #fff);
}
.o-mapping-select:focus { border-color: var(--o-brand-primary, #0052A3); }
.o-mapping-preview {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.o-preview-cell {
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-gray-500, #adb5bd);
  background: var(--o-gray-100, #f8f9fa);
  padding: 0.125rem 0.5rem;
  border-radius: 3px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Step 3: Preview & Validate */
.o-validation-summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.o-validation-stat {
  flex: 1;
  text-align: center;
  padding: 0.75rem;
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-gray-100, #f8f9fa);
  border: 1px solid var(--o-gray-200, #e9ecef);
}
.o-validation-stat .o-stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
}
.o-validation-stat .o-stat-label {
  font-size: var(--o-font-size-smaller, 0.75rem);
  color: var(--o-gray-600, #6c757d);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.o-stat-valid { border-color: var(--o-success-border, #c3e6cb); background: var(--o-success-bg, #d4edda); }
.o-stat-valid .o-stat-value { color: var(--o-success-text, #155724); }
.o-stat-warning { border-color: var(--o-warning-bg, #fff3cd); background: var(--o-warning-bg, #fff3cd); }
.o-stat-warning .o-stat-value { color: var(--o-warning-text, #856404); }
.o-stat-error { border-color: var(--o-danger-border, #f5c6cb); background: var(--o-danger-bg, #f8d7da); }
.o-stat-error .o-stat-value { color: var(--o-danger-text, #721c24); }

.o-preview-table-wrap { overflow-x: auto; margin-bottom: 0.75rem; }
.o-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--o-font-size-base, 0.875rem);
}
.o-preview-table th {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background: var(--o-gray-100, #f8f9fa);
  border-bottom: 2px solid var(--o-border-color, #dee2e6);
  font-weight: 600;
  font-size: var(--o-font-size-small, 0.8125rem);
  white-space: nowrap;
}
.o-preview-table td {
  padding: 0.375rem 0.75rem;
  border-bottom: 1px solid var(--o-gray-200, #e9ecef);
}
.o-col-status { width: 3rem; text-align: center; }
.o-row-valid {}
.o-row-warning { background: var(--o-warning-note-bg, #fffdf5); }
.o-row-error { background: var(--o-danger-light, #fdf0f1); }

.o-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
}
.o-status-icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.o-icon-ok { background: var(--o-success, #28a745); color: #fff; }
.o-icon-warn { background: var(--o-warning, #ffac00); color: #fff; }
.o-icon-error { background: var(--o-danger, #dc3545); color: #fff; }

.o-error-detail {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.375rem;
  background: var(--o-danger-light, #fdf0f1);
  border-left: 3px solid var(--o-danger, #dc3545);
  border-radius: 0 var(--o-border-radius, 4px) var(--o-border-radius, 4px) 0;
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-danger-text, #721c24);
}
.o-error-detail ul { margin: 0.25rem 0 0 1rem; padding: 0; }
.o-error-detail li { margin-bottom: 0.125rem; }

.o-preview-note {
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-500, #adb5bd);
  text-align: center;
  margin-top: 0.5rem;
}

/* Step 4: Import */
.o-import-config { display: flex; flex-direction: column; gap: 1.5rem; }
.o-import-summary-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--o-info-bg, #d1ecf1);
  border-radius: var(--o-border-radius, 4px);
  color: var(--o-info-text, #0c5460);
  font-size: var(--o-font-size-base, 0.875rem);
}
.o-import-summary-card p { margin: 0; }
.o-import-summary-icon { flex-shrink: 0; margin-top: 0.125rem; }
.o-import-err-note { color: var(--o-danger, #dc3545); }

.o-import-options { display: flex; flex-direction: column; gap: 1.25rem; }
.o-import-option-group { display: flex; flex-direction: column; gap: 0.5rem; }
.o-option-label {
  font-size: var(--o-font-size-small, 0.8125rem);
  font-weight: 600;
  color: var(--o-gray-600, #6c757d);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.o-radio-group { display: flex; gap: 1.25rem; flex-wrap: wrap; }
.o-radio {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--o-font-size-base, 0.875rem);
  color: var(--o-gray-700, #495057);
  cursor: pointer;
}
.o-radio input[type="radio"] { accent-color: var(--o-brand-primary, #0052A3); }

.o-import-progress { text-align: center; padding: 2rem 0; }
.o-progress-label {
  font-size: 1rem;
  color: var(--o-gray-700, #495057);
  margin-bottom: 1rem;
}
.o-progress-bar-track {
  width: 100%;
  height: 8px;
  background: var(--o-gray-200, #e9ecef);
  border-radius: 4px;
  overflow: hidden;
}
.o-progress-bar-fill {
  height: 100%;
  background: var(--o-brand-primary, #0052A3);
  border-radius: 4px;
  transition: width 0.15s ease;
}
.o-progress-pct {
  margin-top: 0.5rem;
  font-size: var(--o-font-size-small, 0.8125rem);
  color: var(--o-gray-500, #adb5bd);
}

.o-import-result { text-align: center; padding: 1.5rem 0; }
.o-result-icon { color: var(--o-success, #28a745); margin-bottom: 0.75rem; }
.o-result-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1.25rem;
  color: var(--o-gray-900, #212529);
}
.o-result-stats { display: flex; gap: 1rem; justify-content: center; }
.o-result-stat {
  text-align: center;
  padding: 0.75rem 1.5rem;
  border-radius: var(--o-border-radius, 4px);
  min-width: 100px;
}
.o-result-stat .o-stat-value { display: block; font-size: 1.5rem; font-weight: 700; }
.o-result-stat .o-stat-label {
  font-size: var(--o-font-size-smaller, 0.75rem);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Footer */
.o-wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--o-border-color, #dee2e6);
}
.o-wizard-footer-right {
  display: flex;
  gap: 0.5rem;
}

/* Shared button styles */
.o-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.875rem;
  border-radius: var(--o-border-radius, 4px);
  font-size: var(--o-font-size-base, 0.875rem);
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.o-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.o-btn-primary {
  background: var(--o-brand-primary, #0052A3);
  color: #fff;
  border-color: var(--o-brand-primary, #0052A3);
}
.o-btn-primary:hover:not(:disabled) { opacity: 0.9; }
.o-btn-secondary {
  background: var(--o-view-background, #fff);
  color: var(--o-gray-700, #495057);
  border-color: var(--o-gray-300, #dee2e6);
}
.o-btn-secondary:hover:not(:disabled) { background: var(--o-gray-100, #f8f9fa); }

/* Transition */
.o-dialog-enter-active,
.o-dialog-leave-active {
  transition: opacity 0.15s ease;
}
.o-dialog-enter-active .o-wizard,
.o-dialog-leave-active .o-wizard {
  transition: transform 0.15s ease;
}
.o-dialog-enter-from,
.o-dialog-leave-to {
  opacity: 0;
}
.o-dialog-enter-from .o-wizard {
  transform: scale(0.95) translateY(-10px);
}
.o-dialog-leave-to .o-wizard {
  transform: scale(0.95) translateY(-10px);
}

/* Responsive */
@media (max-width: 640px) {
  .o-wizard-steps { padding: 1rem; gap: 0; flex-wrap: wrap; }
  .o-step-label { display: none; }
  .o-step-line { width: 1.5rem; }
  .o-validation-summary { flex-wrap: wrap; }
  .o-validation-stat { min-width: calc(50% - 0.5rem); }
  .o-radio-group { flex-direction: column; }
  .o-result-stats { flex-direction: column; align-items: center; }
}
</style>
