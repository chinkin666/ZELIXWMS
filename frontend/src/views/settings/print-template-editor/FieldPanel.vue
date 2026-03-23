<template>
  <div class="panel left">
    <div class="panel-title">データフィールド</div>

    <Input v-model="localFieldFilter" :placeholder="t('wms.printTemplate.searchKey')" style="width: 100%" />
    <div class="fields">
      <div
        v-for="k in filteredFieldKeys"
        :key="k"
        class="field-item"
        @click="$emit('insert-field', k)"
        :title="String(getFieldValue(k) ?? '')"
      >
        <div class="k">{{ k }}</div>
        <div class="v">{{ String(getFieldValue(k) ?? '') }}</div>
      </div>
    </div>

    <div class="panel-title" style="margin-top: 12px">{{ t('wms.printTemplate.uploadTable') }}</div>
    <input ref="tableFileInput" type="file" accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="hidden-input" @change="onTableFileChange" />
    <div class="row">
      <Button variant="secondary" @click="triggerTableUpload">{{ t('wms.printTemplate.selectFile') }}</Button>
      <Button variant="secondary" :disabled="!uploadedTableData.length" @click="$emit('clear-table-data')">{{ t('wms.search.clear') }}</Button>
    </div>
    <div v-if="uploadedTableData && uploadedTableData.length > 0" class="meta" style="margin-top: 8px">
      <div>{{ t('wms.printTemplate.rowsLoaded', { count: uploadedTableData.length }) }}</div>
      <div style="margin-top: 8px">
        <Select :model-value="String(selectedRowIndex)" @update:model-value="$emit('update:selectedRowIndex', Number($event))">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="(row, idx) in uploadedTableData" :key="idx" :value="String(idx)">{{ t('wms.printTemplate.rowN', { n: idx + 2 }) }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
    <div style="margin-bottom: 8px">
      <label class="o-toggle">
        <input type="checkbox" :checked="requiresYamatoSortCode" @change="$emit('update:requiresYamatoSortCode', ($event.target as HTMLInputElement).checked)" />
        <span class="o-toggle-slider"></span>
        <span style="margin-left: 8px; font-size: 12px">ヤマト仕分けコード必要</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/composables/useI18n'
import { Input } from '@/components/ui/input'

const { t } = useI18n()

const props = defineProps<{
  uploadedTableData: Record<string, any>[]
  tableHeaders: string[]
  selectedRowIndex: number
  requiresYamatoSortCode: boolean
}>()

const emit = defineEmits<{
  'insert-field': [key: string]
  'clear-table-data': []
  'table-file-change': [file: File]
  'update:selectedRowIndex': [value: number]
  'update:requiresYamatoSortCode': [value: boolean]
}>()

const tableFileInput = ref<HTMLInputElement | null>(null)
const localFieldFilter = ref('')

const filteredFieldKeys = computed(() => {
  let keys = [...props.tableHeaders]

  if (props.requiresYamatoSortCode) {
    const yamatoFields = ['仕分けコード', '発ベースNo-1', '発ベースNo-2']
    for (const field of yamatoFields) {
      if (!keys.includes(field)) {
        keys = [field, ...keys]
      }
    }
  }

  const q = localFieldFilter.value.trim().toLowerCase()
  return q ? keys.filter((k) => k.toLowerCase().includes(q)) : keys
})

function getFieldValue(key: string): any {
  if (key === '仕分けコード') return '999999'
  if (key === '発ベースNo-1' || key === '発ベースNo-2') return '000'

  if (!props.uploadedTableData || props.uploadedTableData.length === 0) return ''
  const rowIndex = props.selectedRowIndex
  if (rowIndex < 0 || rowIndex >= props.uploadedTableData.length) return ''
  return props.uploadedTableData[rowIndex]?.[key] ?? ''
}

function triggerTableUpload() {
  tableFileInput.value?.click()
}

function onTableFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  emit('table-file-change', file)
}
</script>

<style scoped>
.panel {
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: 8px;
  background: #fff;
  padding: 10px;
}
.panel-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.left .fields {
  height: 360px;
  overflow: auto;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 6px;
  margin-top: 8px;
}
.field-item {
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
}
.field-item:hover {
  background: #f9fafb;
}
.field-item .k {
  font-size: 12px;
  font-weight: 600;
}
.field-item .v {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--o-gray-700);
}
.hidden-input {
  display: none;
}
.{
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.o-input:focus { border-color: var(--o-brand-primary, #0052A3); }
.o-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.o-toggle input { display: none; }
.o-toggle-slider {
  width: 36px;
  height: 20px;
  background: #ccc;
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
}
.o-toggle-slider::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}
.o-toggle input:checked + .o-toggle-slider {
  background: var(--o-brand-primary, #0052A3);
}
.o-toggle input:checked + .o-toggle-slider::after {
  transform: translateX(16px);
}
</style>
