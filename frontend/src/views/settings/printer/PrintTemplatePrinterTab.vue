<template>
  <div class="template-printer-tab">
    <div v-if="printers.length === 0" style="margin-bottom: 12px">
      <el-alert type="warning" :closable="false" show-icon>
        {{ t('wms.printer.noPrintersConnectHint', 'プリンター情報がありません。「接続」タブでサービスに接続してプリンター情報を取得してください。') }}
      </el-alert>
    </div>

    <!-- B2 Cloud PDF Section -->
    <el-card shadow="never">
      <template #header>
        <span class="section-title">{{ t('wms.printer.b2CloudPdfTitle', 'B2 Cloud PDF（ヤマトB2 WebAPIから取得したPDF）') }}</span>
      </template>
      <el-table :data="b2InvoiceTypes" stripe size="small" style="width: 100%">
        <el-table-column :label="t('wms.printer.invoiceType', '送り状種類')" width="200">
          <template #default="{ row }">
            <strong>{{ row.value }}: {{ row.label }}</strong>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.printer', 'プリンター')" width="220">
          <template #default="{ row }">
            <el-select
              :model-value="getB2Params(row.value).printer || ''"
              :placeholder="t('wms.printer.default', 'デフォルト')"
              clearable
              filterable
              size="small"
              style="width: 100%"
              @change="(val: string) => updateB2Param(row.value, 'printer', val)"
            >
              <el-option v-for="p in printers" :key="p.name" :label="p.name" :value="p.name" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.paper', '用紙')" width="160">
          <template #default="{ row }">
            <el-select
              :model-value="getB2Params(row.value).paper || 'AUTO'"
              size="small"
              style="width: 100%"
              @change="(val: string) => updateB2Param(row.value, 'paper', val)"
            >
              <el-option :label="t('wms.printer.autoDefault', 'AUTO（デフォルト）')" value="AUTO" />
              <el-option
                v-for="ps in getPaperSizes(getB2Params(row.value).printer)"
                :key="ps.name"
                :label="`${ps.name} (${ps.width_mm}×${ps.height_mm})`"
                :value="ps.name"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.orientation', '方向')" width="120">
          <template #default="{ row }">
            <el-select
              :model-value="getB2Params(row.value).orientation || 'portrait'"
              size="small"
              style="width: 100%"
              @change="(val: string) => updateB2Param(row.value, 'orientation', val)"
            >
              <el-option :label="t('wms.printer.portrait', '縦')" value="portrait" />
              <el-option :label="t('wms.printer.landscape', '横')" value="landscape" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.scale', '縮尺')" width="110">
          <template #default="{ row }">
            <el-select
              :model-value="getB2Params(row.value).scale || 'fit'"
              size="small"
              style="width: 100%"
              @change="(val: string) => updateB2Param(row.value, 'scale', val)"
            >
              <el-option label="Fit" value="fit" />
              <el-option label="Fill" value="fill" />
              <el-option :label="t('wms.printer.actualSize', '実寸')" value="actual" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.marginMm', '余白(mm)')" width="100">
          <template #default="{ row }">
            <el-input-number
              :model-value="getB2Params(row.value).margin_mm ?? 6"
              :min="0"
              :max="50"
              size="small"
              controls-position="right"
              style="width: 100%"
              @change="(val: number | undefined) => updateB2Param(row.value, 'margin_mm', val ?? 6)"
            />
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.copies', '部数')" width="90">
          <template #default="{ row }">
            <el-input-number
              :model-value="getB2Params(row.value).copies ?? 1"
              :min="1"
              :max="50"
              size="small"
              controls-position="right"
              style="width: 100%"
              @change="(val: number | undefined) => updateB2Param(row.value, 'copies', val ?? 1)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Print Templates Section -->
    <el-card shadow="never">
      <template #header>
        <span class="section-title">{{ t('wms.printer.printTemplates', '印刷テンプレート') }}</span>
      </template>
      <div v-if="loading" v-loading="true" style="min-height: 200px" />
      <el-empty v-else-if="templates.length === 0" :description="t('wms.printer.noPrintTemplates', '印刷テンプレートがありません')" />
      <el-table v-else :data="templates" stripe size="small" style="width: 100%">
        <el-table-column :label="t('wms.printer.templateName', 'テンプレート名')" min-width="180">
          <template #default="{ row }">
            <div>
              <strong>{{ row.name }}</strong>
              <div class="template-meta">
                {{ row.canvas.widthMm }} × {{ row.canvas.heightMm }} mm
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.printer', 'プリンター')" width="220">
          <template #default="{ row }">
            <el-select
              :model-value="getParams(row.id).printer || ''"
              :placeholder="t('wms.printer.default', 'デフォルト')"
              clearable
              filterable
              size="small"
              style="width: 100%"
              @change="(val: string) => updateParam(row.id, 'printer', val)"
            >
              <el-option
                v-for="p in printers"
                :key="p.name"
                :label="p.name"
                :value="p.name"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.paper', '用紙')" width="160">
          <template #default="{ row }">
            <el-select
              :model-value="getParams(row.id).paper || 'AUTO'"
              size="small"
              style="width: 100%"
              @change="(val: string) => updateParam(row.id, 'paper', val)"
            >
              <el-option :label="t('wms.printer.autoDefault', 'AUTO（デフォルト）')" value="AUTO" />
              <el-option
                v-for="ps in getPaperSizes(getParams(row.id).printer)"
                :key="ps.name"
                :label="`${ps.name} (${ps.width_mm}×${ps.height_mm})`"
                :value="ps.name"
              />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.orientation', '方向')" width="120">
          <template #default="{ row }">
            <el-select
              :model-value="getParams(row.id).orientation || 'portrait'"
              size="small"
              style="width: 100%"
              @change="(val: string) => updateParam(row.id, 'orientation', val)"
            >
              <el-option :label="t('wms.printer.portrait', '縦')" value="portrait" />
              <el-option :label="t('wms.printer.landscape', '横')" value="landscape" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.scale', '縮尺')" width="110">
          <template #default="{ row }">
            <el-select
              :model-value="getParams(row.id).scale || 'fit'"
              size="small"
              style="width: 100%"
              @change="(val: string) => updateParam(row.id, 'scale', val)"
            >
              <el-option label="Fit" value="fit" />
              <el-option label="Fill" value="fill" />
              <el-option :label="t('wms.printer.actualSize', '実寸')" value="actual" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.marginMm', '余白(mm)')" width="100">
          <template #default="{ row }">
            <el-input-number
              :model-value="getParams(row.id).margin_mm ?? 6"
              :min="0"
              :max="50"
              size="small"
              controls-position="right"
              style="width: 100%"
              @change="(val: number | undefined) => updateParam(row.id, 'margin_mm', val ?? 6)"
            />
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.copies', '部数')" width="90">
          <template #default="{ row }">
            <el-input-number
              :model-value="getParams(row.id).copies ?? 1"
              :min="1"
              :max="50"
              size="small"
              controls-position="right"
              style="width: 100%"
              @change="(val: number | undefined) => updateParam(row.id, 'copies', val ?? 1)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { fetchPrintTemplates, type PrintTemplateApiModel } from '@/api/printTemplates'
import type { PrinterInfo, TemplatePrintParams } from '@/utils/print/printConfig'
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
    console.error('Failed to fetch print templates:', error)
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
