<template>
  <div class="template-printer-tab">
    <div v-if="printers.length === 0" style="margin-bottom: 12px">
      <div class="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
        {{ t('wms.printer.noPrintersConnectHint', 'プリンター情報がありません。「接続」タブでサービスに接続してプリンター情報を取得してください。') }}
      </div>
    </div>

    <!-- B2 Cloud PDF Section -->
    <div class="rounded-lg border bg-card shadow-sm">
      <div class="border-b px-4 py-3">
        <span class="section-title">{{ t('wms.printer.b2CloudPdfTitle', 'B2 Cloud PDF（ヤマトB2 WebAPIから取得したPDF）') }}</span>
      </div>
      <div class="p-4">
        <div class="rounded-md border overflow-auto">
          <Table class="w-full text-sm">
            <TableHeader>
              <TableRow class="border-b bg-muted/50">
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 200px">{{ t('wms.printer.invoiceType', '送り状種類') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 220px">{{ t('wms.printer.printer', 'プリンター') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 160px">{{ t('wms.printer.paper', '用紙') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 120px">{{ t('wms.printer.orientation', '方向') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 110px">{{ t('wms.printer.scale', '縮尺') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 100px">{{ t('wms.printer.marginMm', '余白(mm)') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 90px">{{ t('wms.printer.copies', '部数') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in b2InvoiceTypes" :key="row.value" class="border-b hover:bg-muted/50">
                <TableCell class="p-2"><strong>{{ row.value }}: {{ row.label }}</strong></TableCell>
                <TableCell class="p-2">
                  <Select :model-value="getB2Params(row.value).printer || '__default__'" @update:model-value="updateB2Param(row.value, 'printer', $event === '__default__' ? '' : $event)">
                    <SelectTrigger class="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">{{ t('wms.printer.default', 'デフォルト') }}</SelectItem>
                      <SelectItem v-for="p in printers" :key="p.name" :value="p.name">{{ p.name }}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="p-2">
                  <Select :model-value="getB2Params(row.value).paper || 'AUTO'" @update:model-value="updateB2Param(row.value, 'paper', $event)">
                    <SelectTrigger class="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">{{ t('wms.printer.autoDefault', 'AUTO（デフォルト）') }}</SelectItem>
                      <SelectItem v-for="ps in getPaperSizes(getB2Params(row.value).printer)" :key="ps.name" :value="ps.name">{{ ps.name }} ({{ ps.width_mm }}×{{ ps.height_mm }})</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="p-2">
                  <Select :model-value="getB2Params(row.value).orientation || 'portrait'" @update:model-value="updateB2Param(row.value, 'orientation', $event)">
                    <SelectTrigger class="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">{{ t('wms.printer.portrait', '縦') }}</SelectItem>
                      <SelectItem value="landscape">{{ t('wms.printer.landscape', '横') }}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="p-2">
                  <Select :model-value="getB2Params(row.value).scale || 'fit'" @update:model-value="updateB2Param(row.value, 'scale', $event)">
                    <SelectTrigger class="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fit">Fit</SelectItem>
                      <SelectItem value="fill">Fill</SelectItem>
                      <SelectItem value="actual">{{ t('wms.printer.actualSize', '実寸') }}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="p-2">
                  <Input type="number" :model-value="getB2Params(row.value).margin_mm ?? 6" min="0" max="50" class="h-8" @update:model-value="updateB2Param(row.value, 'margin_mm', Number($event) || 6)" />
                </TableCell>
                <TableCell class="p-2">
                  <Input type="number" :model-value="getB2Params(row.value).copies ?? 1" min="1" max="50" class="h-8" @update:model-value="updateB2Param(row.value, 'copies', Number($event) || 1)" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>

    <!-- Print Templates Section -->
    <div class="rounded-lg border bg-card shadow-sm">
      <div class="border-b px-4 py-3">
        <span class="section-title">{{ t('wms.printer.printTemplates', '印刷テンプレート') }}</span>
      </div>
      <div class="p-4">
        <div v-if="loading" class="space-y-3 p-4">
          <Skeleton class="h-4 w-[250px]" />
          <Skeleton class="h-4 w-[200px]" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
        </div>
        <div v-else-if="templates.length === 0" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>{{ t('wms.printer.noPrintTemplates', '印刷テンプレートがありません') }}</p>
        </div>
        <div v-else class="rounded-md border overflow-auto">
          <Table class="w-full text-sm">
            <TableHeader>
              <TableRow class="border-b bg-muted/50">
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="min-width: 180px">{{ t('wms.printer.templateName', 'テンプレート名') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 220px">{{ t('wms.printer.printer', 'プリンター') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 160px">{{ t('wms.printer.paper', '用紙') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 120px">{{ t('wms.printer.orientation', '方向') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 110px">{{ t('wms.printer.scale', '縮尺') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 100px">{{ t('wms.printer.marginMm', '余白(mm)') }}</TableHead>
                <TableHead class="h-10 px-2 text-left font-medium text-muted-foreground" style="width: 90px">{{ t('wms.printer.copies', '部数') }}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in templates" :key="row.id" class="border-b hover:bg-muted/50">
                <TableCell class="p-2">
                  <div>
                    <strong>{{ row.name }}</strong>
                    <div class="template-meta">{{ row.canvas.widthMm }} × {{ row.canvas.heightMm }} mm</div>
                  </div>
                </TableCell>
                <TableCell class="p-2">
                  <Select :model-value="getParams(row.id).printer || '__default__'" @update:model-value="updateParam(row.id, 'printer', $event === '__default__' ? '' : $event)">
                    <SelectTrigger class="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">{{ t('wms.printer.default', 'デフォルト') }}</SelectItem>
                      <SelectItem v-for="p in printers" :key="p.name" :value="p.name">{{ p.name }}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="p-2">
                  <Select :model-value="getParams(row.id).paper || 'AUTO'" @update:model-value="updateParam(row.id, 'paper', $event)">
                    <SelectTrigger class="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">{{ t('wms.printer.autoDefault', 'AUTO（デフォルト）') }}</SelectItem>
                      <SelectItem v-for="ps in getPaperSizes(getParams(row.id).printer)" :key="ps.name" :value="ps.name">{{ ps.name }} ({{ ps.width_mm }}×{{ ps.height_mm }})</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="p-2">
                  <Select :model-value="getParams(row.id).orientation || 'portrait'" @update:model-value="updateParam(row.id, 'orientation', $event)">
                    <SelectTrigger class="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">{{ t('wms.printer.portrait', '縦') }}</SelectItem>
                      <SelectItem value="landscape">{{ t('wms.printer.landscape', '横') }}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="p-2">
                  <Select :model-value="getParams(row.id).scale || 'fit'" @update:model-value="updateParam(row.id, 'scale', $event)">
                    <SelectTrigger class="h-8 w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fit">Fit</SelectItem>
                      <SelectItem value="fill">Fill</SelectItem>
                      <SelectItem value="actual">{{ t('wms.printer.actualSize', '実寸') }}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell class="p-2">
                  <Input type="number" :model-value="getParams(row.id).margin_mm ?? 6" min="0" max="50" class="h-8" @update:model-value="updateParam(row.id, 'margin_mm', Number($event) || 6)" />
                </TableCell>
                <TableCell class="p-2">
                  <Input type="number" :model-value="getParams(row.id).copies ?? 1" min="1" max="50" class="h-8" @update:model-value="updateParam(row.id, 'copies', Number($event) || 1)" />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/composables/useI18n'
import { fetchPrintTemplates, type PrintTemplateApiModel } from '@/api/printTemplates'
import type { PrinterInfo, TemplatePrintParams } from '@/utils/print/printConfig'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  getPrintParamsForPrintTemplate,
  savePrintTemplateParams,
  getPrintParamsForB2Cloud,
  saveB2CloudPrintParams,
} from '@/utils/print/printConfig'

const { t } = useI18n()

const b2InvoiceTypes = computed(() => [
  { label: t('wms.printer.invoiceTypePrepaid', '発払い'), value: '0' },
  { label: 'EAZY', value: '1' },
  { label: t('wms.printer.invoiceTypeCollect', 'コレクト'), value: '2' },
  { label: t('wms.printer.invoiceTypeDmMail', 'クロネコゆうメール（DM便）'), value: '3' },
  { label: t('wms.printer.invoiceTypeTime', 'タイム'), value: '4' },
  { label: t('wms.printer.invoiceTypeCod', '着払い'), value: '5' },
  { label: t('wms.printer.invoiceTypeMultiPrepaid', '発払い複数口'), value: '6' },
  { label: t('wms.printer.invoiceTypeYuPacket', 'クロネコゆうパケット'), value: '7' },
  { label: t('wms.printer.invoiceTypeCompact', '宅急便コンパクト'), value: '8' },
  { label: t('wms.printer.invoiceTypeCompactCollect', 'コンパクトコレクト'), value: '9' },
  { label: t('wms.printer.invoiceTypeNekopos', 'ネコポス'), value: 'A' },
])

const props = defineProps<{
  printers: PrinterInfo[]
}>()

const loading = ref(false)
const templates = ref<PrintTemplateApiModel[]>([])
// Reactive local cache of params per template
const paramsMap = ref<Record<string, Required<TemplatePrintParams>>>({})
// B2 Cloud params per invoice type (reactive cache)
const b2ParamsMap = ref<Record<string, Required<TemplatePrintParams>>>({})

function getParams(templateId: string): Required<TemplatePrintParams> {
  if (!paramsMap.value[templateId]) {
    paramsMap.value[templateId] = getPrintParamsForPrintTemplate(templateId)
  }
  return paramsMap.value[templateId]
}

function getB2Params(invoiceType: string): Required<TemplatePrintParams> {
  if (!b2ParamsMap.value[invoiceType]) {
    b2ParamsMap.value[invoiceType] = getPrintParamsForB2Cloud(invoiceType)
  }
  return b2ParamsMap.value[invoiceType]
}

function updateParam(templateId: string, key: keyof TemplatePrintParams, value: any) {
  const current = getParams(templateId)
  const updated = { ...current, [key]: value }

  if (key === 'printer') {
    updated.paper = 'AUTO'
  }

  paramsMap.value[templateId] = updated as Required<TemplatePrintParams>
  savePrintTemplateParams(templateId, updated)
}

function updateB2Param(invoiceType: string, key: keyof TemplatePrintParams, value: any) {
  const current = getB2Params(invoiceType)
  const updated = { ...current, [key]: value }

  if (key === 'printer') {
    updated.paper = 'AUTO'
  }

  b2ParamsMap.value[invoiceType] = updated as Required<TemplatePrintParams>
  saveB2CloudPrintParams(invoiceType, updated)
}

function getPaperSizes(printerName: string | undefined) {
  if (!printerName) return []
  const printer = props.printers.find((p) => p.name === printerName)
  return printer?.paper_sizes || []
}

onMounted(async () => {
  loading.value = true
  try {
    templates.value = await fetchPrintTemplates()
  } catch (error) {
    // 印刷テンプレート取得失敗 / Failed to fetch print templates
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.template-printer-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.template-meta {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
}
</style>
