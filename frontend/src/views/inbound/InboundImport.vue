<template>
  <div class="inbound-import">
    <ControlPanel title="入庫予定CSV取込" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="$router.push('/inbound/orders')">戻る</OButton>
      </template>
    </ControlPanel>

    <!-- ステップ1: ファイル選択 -->
    <div class="o-card">
      <h3 class="card-title">1. CSVファイル選択</h3>
      <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop">
        <input ref="fileInput" type="file" accept=".csv" style="display:none;" @change="handleFileSelect" />
        <div v-if="!csvFile" class="upload-placeholder" @click="fileInput?.click()">
          <span style="font-size:32px;color:var(--o-gray-400);">+</span>
          <p>クリックまたはドラッグ＆ドロップでCSVファイルを選択</p>
          <p class="upload-hint">対応形式: CSV (UTF-8, Shift_JIS)</p>
        </div>
        <div v-else class="upload-selected">
          <span>{{ csvFile.name }} ({{ (csvFile.size / 1024).toFixed(1) }} KB)</span>
          <OButton variant="secondary" size="sm" @click="resetFile">変更</OButton>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;align-items:center;">
        <OButton variant="secondary" size="sm" @click="downloadTemplate">テンプレートダウンロード</OButton>
      </div>
    </div>

    <!-- ステップ2: 列マッピング -->
    <div v-if="csvHeaders.length > 0 && !mappingConfirmed" class="o-card">
      <h3 class="card-title">2. 列マッピング設定</h3>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
        <label class="filter-label">プリセット:</label>
        <select v-model="selectedPreset" class="o-input o-input-sm" style="width:200px;" @change="loadPreset">
          <option value="">自動検出</option>
          <option v-for="p in savedPresets" :key="p.name" :value="p.name">{{ p.name }}</option>
        </select>
        <OButton variant="secondary" size="sm" @click="savePreset">現在の設定を保存</OButton>
        <OButton
          v-if="selectedPreset"
          variant="secondary" size="sm"
          style="border-color:#f56c6c;color:#f56c6c;"
          @click="deletePreset"
        >削除</OButton>
      </div>

      <div class="mapping-grid">
        <div v-for="field in systemFields" :key="field.key" class="mapping-row">
          <div class="mapping-field">
            <span class="mapping-field-label">{{ field.label }}</span>
            <span v-if="field.required" class="required">*</span>
          </div>
          <select v-model="columnMapping[field.key]" class="o-input o-input-sm mapping-select">
            <option value="">-- 未設定 --</option>
            <option v-for="(h, idx) in csvHeaders" :key="idx" :value="idx">
              {{ h }} ({{ csvSampleValues[idx] || '' }})
            </option>
          </select>
        </div>
      </div>

      <div style="margin-top:12px;display:flex;gap:8px;">
        <OButton variant="primary" size="sm" @click="applyMapping">マッピングを適用</OButton>
      </div>
    </div>

    <!-- ステップ3: プレビュー -->
    <div v-if="parsedRows.length > 0 && mappingConfirmed" class="o-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 class="card-title" style="margin:0;">3. データ確認 ({{ parsedRows.length }} 行)</h3>
        <OButton variant="secondary" size="sm" @click="mappingConfirmed = false">マッピング変更</OButton>
      </div>
      <div class="o-table-wrapper" style="max-height:400px;overflow:auto;">
        <table class="o-table">
          <thead>
            <tr>
              <th class="o-table-th" style="width:40px;">#</th>
              <th class="o-table-th">商品コード</th>
              <th class="o-table-th">商品名</th>
              <th class="o-table-th o-table-th--right">数量</th>
              <th class="o-table-th">在庫区分</th>
              <th class="o-table-th">ロット番号</th>
              <th class="o-table-th">賞味期限</th>
              <th class="o-table-th">仕入先</th>
              <th class="o-table-th">注文番号</th>
              <th class="o-table-th">メモ</th>
              <th class="o-table-th">状態</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in parsedRows" :key="idx" class="o-table-row" :class="{ 'row-error': row.error }">
              <td class="o-table-td" style="text-align:center;">{{ idx + 1 }}</td>
              <td class="o-table-td"><span class="sku-text">{{ row.sku }}</span></td>
              <td class="o-table-td">{{ row.productName || '-' }}</td>
              <td class="o-table-td o-table-td--right">{{ row.quantity }}</td>
              <td class="o-table-td">{{ row.stockCategory === 'damaged' ? '仕損' : '新品' }}</td>
              <td class="o-table-td">{{ row.lotNumber || '-' }}</td>
              <td class="o-table-td">{{ row.expiryDate || '-' }}</td>
              <td class="o-table-td">{{ row.supplier || '-' }}</td>
              <td class="o-table-td">{{ row.orderReferenceNumber || '-' }}</td>
              <td class="o-table-td">{{ row.memo || '-' }}</td>
              <td class="o-table-td">
                <span v-if="row.error" class="text-danger">{{ row.error }}</span>
                <span v-else-if="row.matched" class="text-success">OK</span>
                <span v-else class="text-warning">検証中...</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;align-items:center;flex-wrap:wrap;">
        <label style="font-size:13px;color:var(--o-gray-600);">入庫先:</label>
        <select v-model="selectedLocationId" class="o-input o-input-sm" style="width:200px;">
          <option value="">ロケーション選択</option>
          <option v-for="loc in physicalLocations" :key="loc._id" :value="loc._id">
            {{ loc.code }} ({{ loc.name }})
          </option>
        </select>
        <label style="font-size:13px;color:var(--o-gray-600);">入庫予定日:</label>
        <input v-model="expectedDate" type="date" class="o-input o-input-sm" style="width:140px;" />
      </div>
    </div>

    <!-- ステップ4: 実行 -->
    <div v-if="parsedRows.length > 0 && mappingConfirmed" class="o-card">
      <h3 class="card-title">4. 入庫指示作成</h3>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="font-size:13px;color:var(--o-gray-600);">
          有効行: {{ validRows.length }} / {{ parsedRows.length }}
        </span>
        <OButton
          variant="primary"
          :disabled="validRows.length === 0 || !selectedLocationId || isCreating"
          @click="handleCreate"
        >入庫指示を作成 ({{ groupCount }}件)</OButton>
      </div>
      <p v-if="createResult" class="create-result" :class="{ 'text-success': !createError, 'text-danger': createError }">
        {{ createResult }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { createInboundOrder } from '@/api/inboundOrder'
import { fetchLocations } from '@/api/location'
import type { Location } from '@/types/inventory'

interface ParsedRow {
  sku: string
  productName: string
  quantity: number
  stockCategory: 'new' | 'damaged'
  lotNumber: string
  expiryDate: string
  supplier: string
  orderReferenceNumber: string
  memo: string
  matched: boolean
  productId?: string
  error?: string
}

interface ColumnPreset {
  name: string
  mapping: Record<string, number | ''>
}

const STORAGE_KEY = 'zelix_inbound_import_presets'

const systemFields = [
  { key: 'sku', label: '商品コード (SKU)', required: true },
  { key: 'productName', label: '商品名', required: false },
  { key: 'quantity', label: '数量', required: true },
  { key: 'stockCategory', label: '在庫区分 (new/damaged)', required: false },
  { key: 'lotNumber', label: 'ロット番号', required: false },
  { key: 'expiryDate', label: '賞味期限', required: false },
  { key: 'supplier', label: '仕入先', required: false },
  { key: 'orderReferenceNumber', label: '注文番号', required: false },
  { key: 'memo', label: 'メモ', required: false },
]

const router = useRouter()
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)
const csvFile = ref<File | null>(null)
const csvHeaders = ref<string[]>([])
const csvDataLines = ref<string[][]>([])
const csvSampleValues = ref<string[]>([])
const parsedRows = ref<ParsedRow[]>([])
const physicalLocations = ref<Location[]>([])
const selectedLocationId = ref('')
const expectedDate = ref(new Date().toISOString().slice(0, 10))
const isCreating = ref(false)
const createResult = ref('')
const createError = ref(false)
const mappingConfirmed = ref(false)
const selectedPreset = ref('')
const savedPresets = ref<ColumnPreset[]>([])

const columnMapping = reactive<Record<string, number | ''>>({
  sku: '',
  productName: '',
  quantity: '',
  stockCategory: '',
  lotNumber: '',
  expiryDate: '',
  supplier: '',
  orderReferenceNumber: '',
  memo: '',
})

const validRows = computed(() => parsedRows.value.filter(r => r.matched && !r.error))

const groupCount = computed(() => {
  const suppliers = new Set(validRows.value.map(r => r.supplier || '__none__'))
  return suppliers.size
})

// --- Preset management ---
const loadSavedPresets = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    savedPresets.value = raw ? JSON.parse(raw) : []
  } catch {
    savedPresets.value = []
  }
}

const persistPresets = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPresets.value))
}

const loadPreset = () => {
  if (!selectedPreset.value) {
    autoDetectMapping()
    return
  }
  const preset = savedPresets.value.find(p => p.name === selectedPreset.value)
  if (preset) {
    for (const key of Object.keys(columnMapping)) {
      columnMapping[key] = preset.mapping[key] ?? ''
    }
  }
}

const savePreset = () => {
  const name = prompt('プリセット名を入力してください:')
  if (!name) return
  const existing = savedPresets.value.findIndex(p => p.name === name)
  const preset: ColumnPreset = { name, mapping: { ...columnMapping } }
  if (existing >= 0) {
    savedPresets.value = savedPresets.value.map((p, i) => i === existing ? preset : p)
  } else {
    savedPresets.value = [...savedPresets.value, preset]
  }
  persistPresets()
  selectedPreset.value = name
  toast.showSuccess(`プリセット「${name}」を保存しました`)
}

const deletePreset = () => {
  if (!selectedPreset.value) return
  if (!confirm(`プリセット「${selectedPreset.value}」を削除しますか？`)) return
  savedPresets.value = savedPresets.value.filter(p => p.name !== selectedPreset.value)
  persistPresets()
  selectedPreset.value = ''
  autoDetectMapping()
}

// --- Auto detect column mapping ---
const autoDetectMapping = () => {
  const patterns: Record<string, RegExp> = {
    sku: /sku|商品コード|品番/i,
    productName: /商品名|name/i,
    quantity: /数量|quantity|qty/i,
    stockCategory: /在庫区分|区分|stock.?category/i,
    lotNumber: /ロット|lot/i,
    expiryDate: /賞味期限|expiry|有効期限/i,
    supplier: /仕入先|supplier|サプライヤー/i,
    orderReferenceNumber: /注文番号|order.?ref|reference/i,
    memo: /メモ|memo|備考|note/i,
  }
  for (const [key, regex] of Object.entries(patterns)) {
    const idx = csvHeaders.value.findIndex(h => regex.test(h))
    columnMapping[key] = idx >= 0 ? idx : ''
  }
}

// --- File handling ---
const handleFileSelect = (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (files?.[0]) processFile(files[0])
}

const handleDrop = (e: DragEvent) => {
  const files = e.dataTransfer?.files
  if (files?.[0]) processFile(files[0])
}

const resetFile = () => {
  csvFile.value = null
  csvHeaders.value = []
  csvDataLines.value = []
  csvSampleValues.value = []
  parsedRows.value = []
  createResult.value = ''
  mappingConfirmed.value = false
  selectedPreset.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const processFile = async (file: File) => {
  csvFile.value = file
  createResult.value = ''
  mappingConfirmed.value = false

  try {
    const text = await readFileAsText(file)
    const lines = text.split(/\r?\n/).filter(l => l.trim())
    if (lines.length < 2) {
      toast.showError('CSVにデータ行がありません')
      return
    }

    const headers = (lines[0] ?? '').split(',').map(h => h.trim().replace(/^["']|["']$/g, ''))
    csvHeaders.value = headers

    const dataRows: string[][] = []
    for (let i = 1; i < lines.length; i++) {
      dataRows.push((lines[i] ?? '').split(',').map(c => c.trim().replace(/^["']|["']$/g, '')))
    }
    csvDataLines.value = dataRows

    // Sample values for mapping UI
    csvSampleValues.value = headers.map((_, idx) => {
      const sample = dataRows[0]?.[idx] || ''
      return sample.length > 20 ? sample.slice(0, 20) + '...' : sample
    })

    autoDetectMapping()
  } catch (e: any) {
    toast.showError('CSVの解析に失敗しました: ' + (e?.message || ''))
  }
}

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('ファイル読み込みエラー'))
    reader.readAsText(file, 'UTF-8')
  })
}

// --- Apply mapping and build rows ---
const applyMapping = async () => {
  const skuCol = columnMapping.sku
  const qtyCol = columnMapping.quantity
  if (skuCol === '' || qtyCol === '') {
    toast.showError('「商品コード」と「数量」は必須です')
    return
  }

  const getVal = (cols: string[], key: string): string => {
    const idx = columnMapping[key]
    return idx !== '' && idx !== undefined ? cols[idx] || '' : ''
  }

  const rows: ParsedRow[] = []
  for (const cols of csvDataLines.value) {
    const sku = cols[skuCol as number] || ''
    const quantity = parseInt(cols[qtyCol as number] || '0', 10)
    if (!sku || quantity < 1) continue

    const catRaw = getVal(cols, 'stockCategory').toLowerCase()
    const stockCategory: 'new' | 'damaged' =
      catRaw === 'damaged' || catRaw === '仕損' ? 'damaged' : 'new'

    rows.push({
      sku,
      productName: getVal(cols, 'productName'),
      quantity,
      stockCategory,
      lotNumber: getVal(cols, 'lotNumber'),
      expiryDate: getVal(cols, 'expiryDate'),
      supplier: getVal(cols, 'supplier'),
      orderReferenceNumber: getVal(cols, 'orderReferenceNumber'),
      memo: getVal(cols, 'memo'),
      matched: false,
    })
  }

  parsedRows.value = rows
  mappingConfirmed.value = true
  await validateProducts()
}

const validateProducts = async () => {
  try {
    const { getApiBaseUrl } = await import('@/api/base')
    const res = await fetch(`${getApiBaseUrl()}/products?limit=10000`)
    if (!res.ok) throw new Error('商品一覧の取得に失敗')
    const data = await res.json()
    const products = (data.products || data.items || data) as Array<{ _id: string; sku: string; name: string }>
    const skuMap = new Map(products.map(p => [p.sku, p]))

    for (const row of parsedRows.value) {
      const product = skuMap.get(row.sku)
      if (product) {
        row.matched = true
        row.productId = product._id
        if (!row.productName) row.productName = product.name
      } else {
        row.error = '商品が見つかりません'
      }
    }
  } catch (e: any) {
    toast.showError(e?.message || '商品検証に失敗しました')
  }
}

const handleCreate = async () => {
  if (validRows.value.length === 0 || !selectedLocationId.value) return
  if (!confirm(`${groupCount.value}件の入庫指示を作成しますか？`)) return

  isCreating.value = true
  createResult.value = ''
  createError.value = false

  try {
    const groups = new Map<string, ParsedRow[]>()
    for (const row of validRows.value) {
      const key = row.supplier || '__none__'
      const list = groups.get(key) || []
      list.push(row)
      groups.set(key, list)
    }

    let createdCount = 0
    for (const [supplier, groupRows] of groups) {
      await createInboundOrder({
        destinationLocationId: selectedLocationId.value,
        supplier: supplier !== '__none__' ? { name: supplier } : undefined,
        expectedDate: expectedDate.value,
        lines: groupRows.map(r => ({
          productId: r.productId!,
          expectedQuantity: r.quantity,
          stockCategory: r.stockCategory,
          lotNumber: r.lotNumber || undefined,
          expiryDate: r.expiryDate || undefined,
          orderReferenceNumber: r.orderReferenceNumber || undefined,
          memo: r.memo || undefined,
        })),
      })
      createdCount++
    }

    createResult.value = `${createdCount}件の入庫指示を作成しました`
    toast.showSuccess(createResult.value)
    setTimeout(() => router.push('/inbound/orders'), 1500)
  } catch (e: any) {
    createResult.value = e?.message || '作成に失敗しました'
    createError.value = true
    toast.showError(createResult.value)
  } finally {
    isCreating.value = false
  }
}

const downloadTemplate = () => {
  const bom = '\uFEFF'
  const csv = bom + '商品コード,商品名,数量,在庫区分,ロット番号,賞味期限,仕入先,注文番号,メモ\nSKU-001,サンプル商品,100,new,LOT-001,2027-01-01,サンプル仕入先,ORD-001,テスト\n'
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '入庫予定テンプレート.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  loadSavedPresets()
  try {
    const all = await fetchLocations({ isActive: true })
    physicalLocations.value = all.filter(l => !l.type.startsWith('virtual/'))
  } catch {
    // ignore
  }
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.inbound-import {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
  margin: 0 0 12px 0;
}

.upload-area {
  border: 2px dashed var(--o-border-color, #dcdfe6);
  border-radius: 8px;
  overflow: hidden;
}

.upload-placeholder {
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s;
}

.upload-placeholder:hover {
  background: var(--o-gray-50, #fafafa);
}

.upload-placeholder p {
  margin: 4px 0;
  font-size: 14px;
  color: var(--o-gray-500, #909399);
}

.upload-hint {
  font-size: 12px !important;
  color: var(--o-gray-400, #c0c4cc) !important;
}

.upload-selected {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: var(--o-gray-700, #303133);
}

.mapping-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 8px;
}

.mapping-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mapping-field {
  min-width: 160px;
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.mapping-field-label {
  white-space: nowrap;
}

.mapping-select {
  flex: 1;
  min-width: 160px;
}

.required { color: #f56c6c; }
.filter-label { font-size: 13px; font-weight: 600; color: var(--o-gray-600, #606266); }

.sku-text {
  font-family: monospace;
  font-weight: 600;
}

.row-error {
  background: #fef0f0 !important;
}

.text-success { color: #67c23a; font-weight: 600; }
.text-danger { color: #f56c6c; font-weight: 600; }
.text-warning { color: #e6a23c; font-weight: 600; }

.create-result {
  margin-top: 8px;
  font-size: 14px;
}

.o-input {
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 13px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
}

.o-table-td--right { text-align: right; }
.o-table-th--right { text-align: right; }
</style>
