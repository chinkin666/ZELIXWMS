<template>
  <div class="waybill-import">
    <ControlPanel title="配送業者データ取込" :show-search="false" />

    <CarrierSelector
      v-model="selectedCarrierId"
      @change="handleCarrierChange"
      @carriers-loaded="handleCarriersLoaded"
    />

    <!-- Automation import section (Yamato B2) -->
    <div v-if="isAutomationEnabled" class="automation-entry">
      <div class="automation-entry__filter">
        <span class="automation-entry__label">出荷予定日：</span>
        <input
          type="date"
          class="o-input"
          v-model="automationShipmentDateStr"
          style="width: 160px"
        />
      </div>
      <OButton
        variant="success"
        class="automation-entry__btn"
        :disabled="automationImporting"
        @click="handleAutomationImport"
      >
        {{ automationImporting ? '取込中...' : 'B2 Cloud から取込' }}
      </OButton>
      <div class="automation-entry__hint">
        B2 Cloud の発行履歴から追跡番号を自動取得し、注文に紐づけます。
      </div>
    </div>

    <!-- Manual file upload section (non-automation carriers) -->
    <div v-else class="upload-entry">
      <OButton variant="primary" class="upload-entry__btn" @click="dialogVisible = true">
        ファイル選択
      </OButton>
      <div class="upload-entry__hint">
        配送業者から返却された配送実績ファイルを取り込み、注文データに実績データを紐づけます。
      </div>
    </div>

    <!-- Automation import result -->
    <div
      v-if="automationResult"
      class="result-alert"
      :class="automationResult.success ? 'result-alert--success' : 'result-alert--warning'"
    >
      <div class="result-alert__header">
        <strong>B2 Cloud 取込結果</strong>
        <button class="result-alert__close" @click="automationResult = null">&times;</button>
      </div>
      <div class="result-meta">
        <div>処理件数：<strong>{{ automationResult.total }}</strong></div>
        <div>一致更新：<strong>{{ automationResult.matched }}</strong></div>
        <div>未一致：<strong>{{ automationResult.unmatched }}</strong></div>
      </div>
    </div>

    <!-- Manual import result -->
    <div
      v-if="lastResult"
      class="result-alert result-alert--success"
    >
      <div class="result-alert__header">
        <strong>ファイル取込結果</strong>
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
    </div>

    <ODialog :open="dialogVisible" title="配送業者データ取込" @close="dialogVisible = false">
      <div class="dialog-body">
        <div class="card">
          <h3 class="card-title">ファイルをアップロード</h3>

          <div class="file-drop-zone" @click="triggerFileInput" @dragover.prevent @drop.prevent="onFileDrop">
            <div class="file-drop-zone__text">
              ファイルをここにドロップするか <em>クリックして選択</em>
            </div>
            <div class="file-drop-zone__tip">対応形式: CSV, XLSX, XLS</div>
            <input
              ref="fileInputRef"
              type="file"
              accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              style="display:none"
              @change="onNativeFileChange"
            />
          </div>

          <div v-if="fileName" class="file-name">
            選択中: <strong>{{ fileName }}</strong>
          </div>

          <div v-if="isCsvFile" class="encoding-section">
            <div class="encoding-label">文字コード：</div>
            <select class="o-input" v-model="fileEncoding" style="width: 240px">
              <option v-for="enc in encodingOptions" :key="enc.value" :value="enc.value">{{ enc.label }}</option>
            </select>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title">一致条件（キー）</h3>
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

        <div class="card" v-if="parsedRows.length">
          <h3 class="card-title">プレビュー（先頭 {{ previewRows.length }} 件 / 全 {{ parsedRows.length }} 件）</h3>
          <div style="max-height:320px;overflow:auto;">
            <table class="o-list-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th v-for="h in previewHeaders" :key="h" style="min-width:160px;">{{ h }}</th>
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
      </div>

      <template #footer>
        <div class="dialog-footer">
          <OButton variant="secondary" @click="dialogVisible = false">キャンセル</OButton>
          <OButton variant="primary" :disabled="!canImport || importing" @click="runImport">
            {{ importing ? '取込中...' : '取込' }}
          </OButton>
        </div>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import * as XLSX from 'xlsx'
import { importCarrierReceiptRows, type ImportCarrierReceiptRowsResult } from '@/api/shipmentOrders'
import CarrierSelector from '@/components/search/CarrierSelector.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import { yamatoB2Import } from '@/api/carrierAutomation'
import type { Carrier } from '@/types/carrier'
import type { YamatoB2ImportResult } from '@/types/carrierAutomation'

const dialogVisible = ref(false)
const importing = ref(false)

// Carrier selection
const selectedCarrierId = ref<string>('')
const carriers = ref<Carrier[]>([])

const handleCarrierChange = (carrierId: string) => {
  selectedCarrierId.value = carrierId
}

const handleCarriersLoaded = (loadedCarriers: Carrier[]) => {
  carriers.value = loadedCarriers
}

// Check if selected carrier has automation enabled
const isAutomationEnabled = computed(() => {
  if (!selectedCarrierId.value) return false
  const carrier = carriers.value.find((c) => c._id === selectedCarrierId.value)
  return carrier?.automationType === 'yamato-b2'
})

// Automation import
const automationImporting = ref(false)
const automationResult = ref<YamatoB2ImportResult | null>(null)

// Date filter for automation import (default: today)
const getToday = (): Date => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

// Use string for native date input
const formatDateToYMD = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const automationShipmentDateStr = ref<string>(formatDateToYMD(getToday()))

const handleAutomationImport = async () => {
  try {
    automationImporting.value = true
    automationResult.value = null

    // Use selected shipment date as filter (same date for both from and to)
    const shipmentDate = automationShipmentDateStr.value
    const result = await yamatoB2Import({
      shipmentDateFrom: shipmentDate,
      shipmentDateTo: shipmentDate,
    })
    automationResult.value = result

    if (result.success) {
      alert(`${result.matched}件の追跡番号を更新しました`)
    } else {
      alert('取込に問題がありました')
    }
  } catch (e: any) {
    alert(e?.message || 'B2 Cloudからの取込に失敗しました')
  } finally {
    automationImporting.value = false
  }
}

const selectedFile = ref<File | null>(null)
const fileName = ref<string | null>(null)
const fileHeaders = ref<string[]>([])
const parsedRows = ref<Record<string, any>[]>([])

const fileMatchColumn = ref<string>('')
const orderMatchField = ref<'orderNumber' | 'customerManagementNumber' | 'recipient.phone' | 'recipient.postalCode'>('orderNumber')

const lastResult = ref<ImportCarrierReceiptRowsResult | null>(null)

const isCsvFile = computed(() => {
  const f = selectedFile.value
  if (!f) return false
  return f.name.toLowerCase().endsWith('.csv')
})

const encodingOptions = [
  { label: '自動判定 (推奨)', value: 'auto' },
  { label: 'UTF-8', value: 'utf-8' },
  { label: 'UTF-8 (BOM)', value: 'utf-8-sig' },
  { label: 'Shift_JIS', value: 'shift_jis' },
  { label: 'GBK/GB18030', value: 'gbk' },
] as const
const fileEncoding = ref<(typeof encodingOptions)[number]['value']>('auto')

const orderMatchFieldOptions = [
  { label: '出荷管理No（orderNumber）', value: 'orderNumber' },
  { label: 'お客様管理番号（customerManagementNumber）', value: 'customerManagementNumber' },
  { label: '送付先電話（recipient.phone）', value: 'recipient.phone' },
  { label: '送付先郵便番号（recipient.postalCode）', value: 'recipient.postalCode' },
] as const

const canImport = computed(() => {
  return !!selectedFile.value && parsedRows.value.length > 0 && !!fileMatchColumn.value && !!orderMatchField.value
})

const previewRows = computed(() => parsedRows.value.slice(0, 10))
const previewHeaders = computed(() => fileHeaders.value.slice(0, 12))

const detectCsvEncoding = (buf: ArrayBuffer): 'utf-8' | 'utf-8-sig' | 'shift_jis' | 'gbk' => {
  const bytes = new Uint8Array(buf)
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8-sig'
  }
  const decodeWithEnc = (b: ArrayBuffer, enc: string): string => {
    try {
      const decoder = new TextDecoder(enc as any, { fatal: false })
      return decoder.decode(b)
    } catch {
      return new TextDecoder('utf-8').decode(b)
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
  return scores.sort((a, b) => b.val - a.val)[0]?.enc || 'utf-8'
}

const decodeWithEncoding = (buf: ArrayBuffer, enc: string): string => {
  try {
    const decoder = new TextDecoder(enc === 'gbk' ? 'gb18030' : (enc as any), { fatal: false })
    return decoder.decode(buf)
  } catch {
    return new TextDecoder('utf-8').decode(buf)
  }
}

// 使用原始显示值（cell.w），避免 XLSX 自动格式化日期，纯粹根据 transform 配置来转换
const parseSheetToRows = (wb: any): Record<string, any>[] => {
  if (!wb?.SheetNames || wb.SheetNames.length === 0) return []
  const sheetName = wb.SheetNames[0]
  const sheet = sheetName ? wb.Sheets?.[sheetName] : undefined
  if (!sheet) return []

  // 手动读取单元格，使用原始显示值（cell.w），避免 XLSX 自动格式化日期
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headers: string[] = []
  const rows: Record<string, any>[] = []

  // 读取表头（第一行）
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = sheet[cellAddress]
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
      const value = cell?.w != null ? String(cell.w) : (cell?.v != null ? String(cell.v) : '')
      obj[header] = value
    })
    rows.push(obj)
  }

  // remove fully blank rows
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

// Native file input handling
const fileInputRef = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const processFile = async (raw: File) => {
  selectedFile.value = raw
  fileName.value = raw.name
  parsedRows.value = []
  fileHeaders.value = []
  fileMatchColumn.value = ''

  try {
    const rows = await parseFile(raw)
    parsedRows.value = rows
    const headers = rows.length ? Object.keys(rows[0] || {}) : []
    fileHeaders.value = headers
    if (headers.length) fileMatchColumn.value = headers[0] ?? ''
  } catch (e: any) {
    console.error(e)
    alert(e?.message || 'ファイルの解析に失敗しました')
  }
}

const onNativeFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const raw = input.files?.[0]
  if (!raw) return
  await processFile(raw)
}

const onFileDrop = async (event: DragEvent) => {
  const raw = event.dataTransfer?.files?.[0]
  if (!raw) return
  await processFile(raw)
}

watch(
  () => fileEncoding.value,
  async () => {
    if (!selectedFile.value || !isCsvFile.value) return
    try {
      const rows = await parseFile(selectedFile.value)
      parsedRows.value = rows
      const headers = rows.length ? Object.keys(rows[0] || {}) : []
      fileHeaders.value = headers
      if (headers.length && !headers.includes(fileMatchColumn.value)) {
        fileMatchColumn.value = headers[0] ?? ''
      }
    } catch (_e) {
      // ignore
    }
  },
)

const runImport = async () => {
  if (!canImport.value) return
  if (importing.value) return
  try {
    importing.value = true

    const items = parsedRows.value.map((r) => ({
      matchValue: r?.[fileMatchColumn.value],
      carrierRawRow: r,
    }))

    const res = await importCarrierReceiptRows({
      orderMatchField: orderMatchField.value,
      items,
    })

    lastResult.value = res
    alert(res?.message || '取込しました')
    dialogVisible.value = false
  } catch (e: any) {
    console.error(e)
    alert(e?.message || '取込に失敗しました')
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.waybill-import {
  display: flex;
  flex-direction: column;
}



.upload-entry,
.automation-entry {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border: 1px solid #ebeef5;
  background: #fff;
  border-radius: 8px;
  margin-top: 12px;
}

.upload-entry__btn,
.automation-entry__btn {
  width: 100%;
  height: 64px;
  font-size: 16px;
}

.upload-entry__hint,
.automation-entry__hint {
  font-size: 13px;
  color: #606266;
}

.automation-entry {
  border-color: #b3e19d;
  background: #f0f9eb;
}

.automation-entry__filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.automation-entry__label {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.result-alert {
  margin-top: 12px;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: #303133;
}

.result-alert__close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #909399;
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

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 14px;
  background: #fff;
}

.card-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
  color: #303133;
}

.file-drop-zone {
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}

.file-drop-zone:hover {
  border-color: #409eff;
}

.file-drop-zone__text {
  font-size: 14px;
  color: #606266;
}

.file-drop-zone__text em {
  color: #409eff;
  font-style: normal;
}

.file-drop-zone__tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.file-name {
  margin-top: 10px;
  font-size: 13px;
  color: #303133;
}

.encoding-section {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.encoding-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
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
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
