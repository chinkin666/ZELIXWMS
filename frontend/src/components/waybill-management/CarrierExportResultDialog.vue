<template>
  <Dialog :open="visible" @update:open="visible = $event">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>配送業者データ出力</DialogTitle>
      </DialogHeader>
    <div class="meta">
      <div class="meta__row">
        <div class="meta__item"><span class="meta__label">配送業者：</span>{{ carrierLabel || '-' }}</div>
        <div class="meta__item meta__item--select">
          <span class="meta__label">出力レイアウト：</span>
          <select
           
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
        <Table class="o-list-table">
          <TableHeader>
            <TableRow>
              <TableHead v-for="h in headers" :key="h" style="min-width: 160px">{{ h }}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(row, idx) in previewRows" :key="idx">
              <TableCell v-for="h in headers" :key="h">{{ row[h] ?? '' }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <DialogFooter>
      <div class="footer">
        <div class="footer__left">
          <span class="hint">CSV / Excel をダウンロードできます。</span>
        </div>
        <div class="footer__right">
          <Button variant="secondary" :disabled="rows.length === 0" @click="downloadCsv">CSV出力</Button>
          <Button variant="default" :disabled="rows.length === 0" @click="downloadExcel">Excel出力</Button>
          <Button variant="secondary" @click="visible = false">閉じる</Button>
        </div>
      </div>
    </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { computed } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
// XLSX动态导入，减少初始包大小 / XLSXを動的インポートし初期バンドルサイズを削減
const loadXLSX = () => import('xlsx')

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

const buildSheet = async () => {
  const XLSX = await loadXLSX()
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

const downloadCsv = async () => {
  const XLSX = await loadXLSX()
  const ws = await buildSheet()
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',', RS: '\r\n' })
  // Add BOM for Excel (JP environment)
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${props.fileNameBase}.csv`)
}

const downloadExcel = async () => {
  const XLSX = await loadXLSX()
  const ws = await buildSheet()
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
