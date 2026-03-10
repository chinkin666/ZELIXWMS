<template>
  <el-dialog v-model="visible" title="出荷明細リスト出力(csv)" width="980px" :close-on-click-modal="false">
    <div class="meta">
      <div class="meta__row">
        <div class="meta__item meta__item--select">
          <span class="meta__label">出力レイアウト：</span>
          <el-select
            v-model="selectedConfigId"
            filterable
            :disabled="configOptions.length === 0"
            placeholder="出力レイアウトを選択"
            style="width: 340px"
            @change="handleConfigChange"
          >
            <el-option v-for="opt in configOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </div>
        <div class="meta__item"><span class="meta__label">選択件数：</span><strong>{{ orders.length }}</strong></div>
      </div>
    </div>

    <!-- Output preview -->
    <div class="preview">
      <div class="preview__title">出力プレビュー（先頭 {{ previewRows.length }} 件）</div>
      <el-table v-if="outputRows.length > 0" :data="previewRows" height="280" border size="small">
        <el-table-column v-for="h in outputHeaders" :key="h" :prop="h" :label="h" min-width="160" />
      </el-table>
      <el-empty v-else description="出力レイアウトを選択してください" />
    </div>

    <template #footer>
      <div class="footer">
        <div class="footer__left">
          <span class="hint">CSV / Excel をダウンロードできます。</span>
        </div>
        <div class="footer__right">
          <el-button :disabled="outputRows.length === 0" @click="downloadCsv">CSV出力</el-button>
          <el-button type="primary" :disabled="outputRows.length === 0" @click="downloadExcel">Excel出力</el-button>
          <el-button @click="visible = false">閉じる</el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { getAllMappingConfigs, type MappingConfig } from '@/api/mappingConfig'
import { applyTransformMappings } from '@/utils/transformRunner'

const props = defineProps<{
  modelValue: boolean
  orders: Array<Record<string, any>>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'exported'): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// Mapping configs
const mappingConfigs = ref<MappingConfig[]>([])
const selectedConfigId = ref<string>('')
const selectedConfig = computed(() => mappingConfigs.value.find((c) => c._id === selectedConfigId.value))

const configOptions = computed(() => {
  return mappingConfigs.value.map((c) => ({
    label: c.name,
    value: c._id,
  }))
})

// Output data
const outputHeaders = ref<string[]>([])
const outputRows = ref<Array<Record<string, any>>>([])
const previewRows = computed(() => outputRows.value.slice(0, 20))

// Load mapping configs when dialog opens
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      try {
        const configs = await getAllMappingConfigs('order-to-sheet')
        mappingConfigs.value = configs
        // Auto-select first config if available
        if (configs.length > 0 && !selectedConfigId.value && configs[0]?._id) {
          selectedConfigId.value = configs[0]._id
          await handleConfigChange()
        } else if (selectedConfigId.value) {
          await handleConfigChange()
        }
      } catch (e: any) {
        console.error('Failed to load mapping configs:', e)
        ElMessage.error('出力レイアウトの読み込みに失敗しました')
      }
    }
  },
)

// Re-transform when orders change
watch(
  () => props.orders,
  async () => {
    if (props.modelValue && selectedConfigId.value) {
      await handleConfigChange()
    }
  },
  { deep: true },
)

const handleConfigChange = async () => {
  if (!selectedConfig.value || !props.orders.length) {
    outputHeaders.value = []
    outputRows.value = []
    return
  }

  try {
    const mappings = selectedConfig.value.mappings
    // Extract headers from mapping target fields
    outputHeaders.value = mappings.map((m) => m.targetField)

    // Transform each order
    const transformed: Array<Record<string, any>> = []
    for (const order of props.orders) {
      const row = await applyTransformMappings(mappings, order)
      transformed.push(row)
    }
    outputRows.value = transformed
  } catch (e: any) {
    console.error('Failed to transform orders:', e)
    ElMessage.error('データの変換に失敗しました')
  }
}

const buildSheet = () => {
  const headers = outputHeaders.value
  const aoa = [
    headers,
    ...outputRows.value.map((r) =>
      headers.map((h) => (r && r[h] !== undefined && r[h] !== null ? String(r[h]) : '')),
    ),
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

const getFileName = () => {
  const configName = selectedConfig.value?.name || 'custom-export'
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `${configName}_${date}`
}

const downloadCsv = () => {
  const ws = buildSheet()
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: ',', RS: '\r\n' })
  // Add BOM for Excel (JP environment)
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `${getFileName()}.csv`)
  emit('exported')
}

const downloadExcel = () => {
  const ws = buildSheet()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'export')
  XLSX.writeFile(wb, `${getFileName()}.xlsx`)
  emit('exported')
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
