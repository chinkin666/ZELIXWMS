<template>
  <div class="panel left">
    <div class="panel-title">carrierRawRow 字段</div>

    <input v-model="localFieldFilter" class="o-input" placeholder="搜索 key" style="width: 100%" />
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

    <div class="panel-title" style="margin-top: 12px">上传表格</div>
    <input ref="tableFileInput" type="file" accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="hidden-input" @change="onTableFileChange" />
    <div class="row">
      <OButton variant="secondary" @click="triggerTableUpload">选择文件</OButton>
      <OButton variant="secondary" :disabled="!uploadedTableData.length" @click="$emit('clear-table-data')">清空</OButton>
    </div>
    <div v-if="uploadedTableData && uploadedTableData.length > 0" class="meta" style="margin-top: 8px">
      <div>已加载 {{ uploadedTableData.length }} 行数据（第1行为表头）</div>
      <div style="margin-top: 8px">
        <select :value="selectedRowIndex" class="o-input" style="width: 100%" @change="$emit('update:selectedRowIndex', Number(($event.target as HTMLSelectElement).value))">
          <option
            v-for="(row, idx) in uploadedTableData"
            :key="idx"
            :value="idx"
          >第 {{ idx + 2 }} 行</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom: 8px">
      <label class="o-toggle">
        <input type="checkbox" :checked="requiresYamatoSortCode" @change="$emit('update:requiresYamatoSortCode', ($event.target as HTMLInputElement).checked)" />
        <span class="o-toggle-slider"></span>
        <span style="margin-left: 8px; font-size: 12px">yamato仕分けコードが必要</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import OButton from '@/components/odoo/OButton.vue'

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
  border: 1px solid #e5e7eb;
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
  color: #374151;
}
.hidden-input {
  display: none;
}
.o-input {
  padding: 6px 10px;
  border: 1px solid var(--o-border-color, #dee2e6);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.o-input:focus { border-color: var(--o-primary, #714B67); }
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
  background: var(--o-primary, #714B67);
}
.o-toggle input:checked + .o-toggle-slider::after {
  transform: translateX(16px);
}
</style>
