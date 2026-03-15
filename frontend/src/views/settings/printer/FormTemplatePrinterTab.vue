<template>
  <div class="template-printer-tab">
    <div v-if="loading" v-loading="true" style="min-height: 200px" />

    <el-empty v-else-if="templates.length === 0" :description="t('wms.printer.noFormTemplates', '帳票テンプレートがありません')" />

    <template v-else>
      <div v-if="printers.length === 0" style="margin-bottom: 12px">
        <el-alert type="warning" :closable="false" show-icon>
          {{ t('wms.printer.noPrintersConnectHint', 'プリンター情報がありません。「接続」タブでサービスに接続してプリンター情報を取得してください。') }}
        </el-alert>
      </div>

      <el-table :data="templates" stripe size="small" style="width: 100%">
        <el-table-column :label="t('wms.printer.templateName', 'テンプレート名')" min-width="180">
          <template #default="{ row }">
            <div>
              <strong>{{ row.name }}</strong>
              <div class="template-meta">
                {{ row.targetType }} ・ {{ row.pageSize }} {{ row.pageOrientation === 'landscape' ? t('wms.printer.landscape', '横') : t('wms.printer.portrait', '縦') }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.printer', 'プリンター')" width="220">
          <template #default="{ row }">
            <el-select
              :model-value="getParams(row._id).printer || ''"
              :placeholder="t('wms.printer.default', 'デフォルト')"
              clearable
              filterable
              size="small"
              style="width: 100%"
              @change="(val: string) => updateParam(row._id, 'printer', val)"
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
              :model-value="getParams(row._id).paper || 'AUTO'"
              size="small"
              style="width: 100%"
              @change="(val: string) => updateParam(row._id, 'paper', val)"
            >
              <el-option :label="t('wms.printer.autoDefault', 'AUTO（デフォルト）')" value="AUTO" />
              <el-option
                v-for="ps in getPaperSizes(getParams(row._id).printer)"
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
              :model-value="getParams(row._id).orientation || 'portrait'"
              size="small"
              style="width: 100%"
              @change="(val: string) => updateParam(row._id, 'orientation', val)"
            >
              <el-option :label="t('wms.printer.portrait', '縦')" value="portrait" />
              <el-option :label="t('wms.printer.landscape', '横')" value="landscape" />
            </el-select>
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.scale', '縮尺')" width="110">
          <template #default="{ row }">
            <el-select
              :model-value="getParams(row._id).scale || 'fit'"
              size="small"
              style="width: 100%"
              @change="(val: string) => updateParam(row._id, 'scale', val)"
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
              :model-value="getParams(row._id).margin_mm ?? 6"
              :min="0"
              :max="50"
              size="small"
              controls-position="right"
              style="width: 100%"
              @change="(val: number | undefined) => updateParam(row._id, 'margin_mm', val ?? 6)"
            />
          </template>
        </el-table-column>

        <el-table-column :label="t('wms.printer.copies', '部数')" width="90">
          <template #default="{ row }">
            <el-input-number
              :model-value="getParams(row._id).copies ?? 1"
              :min="1"
              :max="50"
              size="small"
              controls-position="right"
              style="width: 100%"
              @change="(val: number | undefined) => updateParam(row._id, 'copies', val ?? 1)"
            />
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { fetchFormTemplates } from '@/api/formTemplate'
import type { FormTemplate } from '@/types/formTemplate'
import type { PrinterInfo, TemplatePrintParams } from '@/utils/print/printConfig'
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
