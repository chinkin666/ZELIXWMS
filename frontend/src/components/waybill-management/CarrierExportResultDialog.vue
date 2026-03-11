<template>
  <ODialog :open="visible" title="配送会社データ出力" @close="visible = false" width="980px">
    <div class="meta">
      <div class="meta__row">
        <div class="meta__item"><span class="meta__label">配送会社：</span>{{ carrierLabel || '-' }}</div>
        <div class="meta__item meta__item--select">
          <span class="meta__label">出力レイアウト：</span>
          <select
            class="o-input"
            v-model="selectedMappingIdProxy"
            :disabled="(mappingOptions?.length || 0) === 0"
            style="width: 340px"
          >
            <option value="" disabled>出力レイアウトを選択</option>
            <option v-for="opt in mappingOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="meta__item"><span class="meta__label">件数：</span><strong>{{ rows.length }}</strong></div>
      </div>
    </div>

    <div class="preview">
      <div class="preview__title">プレビュー（先頭 {{ previewRows.length }} 件）</div>
      <div style="max-height: 420px; overflow: auto">
        <table class="o-list-table">
          <thead>
            <tr>
              <th v-for="h in headers" :key="h" style="min-width: 160px">{{ h }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in previewRows" :key="idx">
              <td v-for="h in headers" :key="h">{{ row[h] ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #footer>
      <div class="footer">
        <div class="footer__left">
          <span class="hint">CSV / Excel をダウンロードできます。</span>
        </div>
        <div class="footer__right">
          <button class="o-btn o-btn-secondary" :disabled="rows.length === 0" @click="downloadCsv">CSV出力</button>
          <button class="o-btn o-btn-primary" :disabled="rows.length === 0" @click="downloadExcel">Excel出力</button>
          <button class="o-btn o-btn-secondary" @click="visible = false">閉じる</button>
        </div>
      </div>
    </template>
  </ODialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ODialog from '@/components/odoo/ODialog.vue'
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
.meta { margin-bottom: 12px; }
.meta__row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; font-size: 13px; color: #303133; }
.meta__item--select { display: inline-flex; align-items: center; gap: 8px; }
.meta__label { font-weight: 600; color: #606266; }
.preview__title { margin: 8px 0 8px; font-size: 13px; color: #606266; }
.footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.footer__right { display: flex; align-items: center; gap: 10px; }
.hint { color: #909399; font-size: 12px; }
</style>
