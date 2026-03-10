<template>
  <el-dialog v-model="visible" title="配送会社データ出力" width="980px" :close-on-click-modal="false">
    <div class="meta">
      <div class="meta__row">
        <div class="meta__item"><span class="meta__label">配送会社：</span>{{ carrierLabel || '-' }}</div>
        <div class="meta__item meta__item--select">
          <span class="meta__label">出力レイアウト：</span>
          <el-select
            v-model="selectedMappingIdProxy"
            filterable
            :disabled="(mappingOptions?.length || 0) === 0"
            placeholder="出力レイアウトを選択"
            style="width: 340px"
          >
            <el-option v-for="opt in mappingOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
        <div class="meta__item"><span class="meta__label">件数：</span><strong>{{ rows.length }}</strong></div>
      </div>
    </div>

    <div class="preview">
      <div class="preview__title">プレビュー（先頭 {{ previewRows.length }} 件）</div>
      <el-table :data="previewRows" height="420" border size="small">
        <el-table-column v-for="h in headers" :key="h" :prop="h" :label="h" min-width="160" />
      </el-table>
    </div>

    <template #footer>
      <div class="footer">
        <div class="footer__left">
          <span class="hint">CSV / Excel をダウンロードできます。</span>
        </div>
        <div class="footer__right">
          <el-button :disabled="rows.length === 0" @click="downloadCsv">CSV出力</el-button>
          <el-button type="primary" :disabled="rows.length === 0" @click="downloadExcel">Excel出力</el-button>
          <el-button @click="visible = false">閉じる</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElButton, ElDialog, ElTable, ElTableColumn } from 'element-plus'
import * as XLSX from 'xlsx'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    carrierLabel?: string
    mappingOptions?: Array<{ label: string; value: string }>
    selectedMappingId?: string
    headers: string[]
    rows: Array<Record<string, any>>
    fileNameBase?: string
  }>(),
  {
    carrierLabel: '',
    fileNameBase: 'carrier-export',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:selectedMappingId', value: string): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const selectedMappingIdProxy = computed({
  get: () => props.selectedMappingId || '',
  set: (val) => emit('update:selectedMappingId', String(val || '')),
})

const previewRows = computed(() => props.rows.slice(0, 20))

const buildSheet = () => {
  const headers = props.headers || []
  const aoa = [
    headers,
    ...(props.rows || []).map((r) => headers.map((h) => (r && r[h] !== undefined && r[h] !== null ? String(r[h]) : ''))),
  ]
  return XLSX.utils.aoa_to_sheet(aoa)
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const downloadCsv = () => {
  const ws = buildSheet()
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',', RS: '\r\n' })
  // Add BOM for Excel (JP environment)
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${props.fileNameBase}.csv`)
}

const downloadExcel = () => {
  const ws = buildSheet()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'export')
  XLSX.writeFile(wb, `${props.fileNameBase}.xlsx`)
}
</script>

<style scoped>
.meta {
  margin-bottom: 12px;
}

.meta__row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  font-size: 13px;
  color: #303133;
}

.meta__item--select {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.meta__label {
  font-weight: 600;
  color: #606266;
}

.preview__title {
  margin: 8px 0 8px;
  font-size: 13px;
  color: #606266;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.footer__right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hint {
  color: #909399;
  font-size: 12px;
}
</style>

