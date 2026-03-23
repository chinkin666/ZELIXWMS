<template>
  <div class="template-printer-tab">
    <div v-if="loading" class="space-y-3 p-4">
      <Skeleton class="h-4 w-[250px]" />
      <Skeleton class="h-4 w-[200px]" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>

    <div v-else-if="templates.length === 0" class="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <p>{{ t('wms.printer.noFormTemplates', '帳票テンプレートがありません') }}</p>
    </div>

    <template v-else>
      <div v-if="printers.length === 0" style="margin-bottom: 12px">
        <div class="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          {{ t('wms.printer.noPrintersConnectHint', 'プリンター情報がありません。「接続」タブでサービスに接続してプリンター情報を取得してください。') }}
        </div>
      </div>

      <div class="rounded-md border overflow-auto">
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
            <TableRow v-for="row in templates" :key="row._id" class="border-b hover:bg-muted/50">
              <TableCell class="p-2">
                <div>
                  <strong>{{ row.name }}</strong>
                  <div class="template-meta">
                    {{ row.targetType }} ・ {{ row.pageSize }} {{ row.pageOrientation === 'landscape' ? t('wms.printer.landscape', '横') : t('wms.printer.portrait', '縦') }}
                  </div>
                </div>
              </TableCell>
              <TableCell class="p-2">
                <select
                  :value="getParams(row._id).printer || ''"
                  class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                  @change="(e: any) => updateParam(row._id, 'printer', e.target.value)"
                >
                  <option value="">{{ t('wms.printer.default', 'デフォルト') }}</option>
                  <option v-for="p in printers" :key="p.name" :value="p.name">{{ p.name }}</option>
                </select>
              </TableCell>
              <TableCell class="p-2">
                <select
                  :value="getParams(row._id).paper || 'AUTO'"
                  class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                  @change="(e: any) => updateParam(row._id, 'paper', e.target.value)"
                >
                  <option value="AUTO">{{ t('wms.printer.autoDefault', 'AUTO（デフォルト）') }}</option>
                  <option v-for="ps in getPaperSizes(getParams(row._id).printer)" :key="ps.name" :value="ps.name">{{ ps.name }} ({{ ps.width_mm }}×{{ ps.height_mm }})</option>
                </select>
              </TableCell>
              <TableCell class="p-2">
                <select
                  :value="getParams(row._id).orientation || 'portrait'"
                  class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                  @change="(e: any) => updateParam(row._id, 'orientation', e.target.value)"
                >
                  <option value="portrait">{{ t('wms.printer.portrait', '縦') }}</option>
                  <option value="landscape">{{ t('wms.printer.landscape', '横') }}</option>
                </select>
              </TableCell>
              <TableCell class="p-2">
                <select
                  :value="getParams(row._id).scale || 'fit'"
                  class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                  @change="(e: any) => updateParam(row._id, 'scale', e.target.value)"
                >
                  <option value="fit">Fit</option>
                  <option value="fill">Fill</option>
                  <option value="actual">{{ t('wms.printer.actualSize', '実寸') }}</option>
                </select>
              </TableCell>
              <TableCell class="p-2">
                <input
                  type="number"
                  :value="getParams(row._id).margin_mm ?? 6"
                  min="0"
                  max="50"
                  class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                  @change="(e: any) => updateParam(row._id, 'margin_mm', Number(e.target.value) || 6)"
                />
              </TableCell>
              <TableCell class="p-2">
                <input
                  type="number"
                  :value="getParams(row._id).copies ?? 1"
                  min="1"
                  max="50"
                  class="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm"
                  @change="(e: any) => updateParam(row._id, 'copies', Number(e.target.value) || 1)"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { fetchFormTemplates } from '@/api/formTemplate'
import type { FormTemplate } from '@/types/formTemplate'
import type { PrinterInfo, TemplatePrintParams } from '@/utils/print/printConfig'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  getPrintParamsForFormTemplate,
  saveFormTemplateParams,
} from '@/utils/print/printConfig'

const { t } = useI18n()

const props = defineProps<{
  printers: PrinterInfo[]
}>()

const loading = ref(false)
const templates = ref<FormTemplate[]>([])
const paramsMap = ref<Record<string, Required<TemplatePrintParams>>>({})

function getParams(templateId: string): Required<TemplatePrintParams> {
  if (!paramsMap.value[templateId]) {
    paramsMap.value[templateId] = getPrintParamsForFormTemplate(templateId)
  }
  return paramsMap.value[templateId]
}

function updateParam(templateId: string, key: keyof TemplatePrintParams, value: any) {
  const current = getParams(templateId)
  const updated = { ...current, [key]: value }

  if (key === 'printer') {
    updated.paper = 'AUTO'
  }

  paramsMap.value[templateId] = updated as Required<TemplatePrintParams>
  saveFormTemplateParams(templateId, updated)
}

function getPaperSizes(printerName: string | undefined) {
  if (!printerName) return []
  const printer = props.printers.find((p) => p.name === printerName)
  return printer?.paper_sizes || []
}

onMounted(async () => {
  loading.value = true
  try {
    templates.value = await fetchFormTemplates()
  } catch (error) {
    // フォームテンプレート取得失敗 / Failed to fetch form templates
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.template-printer-tab {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-meta {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
</style>
