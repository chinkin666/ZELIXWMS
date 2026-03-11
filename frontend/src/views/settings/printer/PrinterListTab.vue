<template>
  <div class="printer-list-tab">
    <template v-if="printers.length > 0">
      <div class="printer-count">
        {{ printers.length }} 台のプリンターが見つかりました
        <span v-if="lastUpdate" class="last-update">（最終更新: {{ lastUpdate }}）</span>
      </div>

      <details
        v-for="printer in printers"
        :key="printer.name"
        class="printer-details"
        :open="expandedPrinters.includes(printer.name)"
      >
        <summary class="printer-summary" @click.prevent="togglePrinter(printer.name)">
          <span class="printer-name">{{ printer.name }}</span>
          <span
            v-if="printer.name === defaultPrinterOs"
            class="o-badge o-badge-primary"
            style="margin-left: 8px"
          >OSデフォルト</span>
          <span class="o-badge o-badge-info" style="margin-left: 8px">
            {{ printer.paper_sizes.length }} 用紙サイズ
          </span>
        </summary>
        <div class="printer-content">
          <table class="o-table">
            <thead>
              <tr>
                <th>用紙名</th>
                <th style="text-align: right">幅 (mm)</th>
                <th style="text-align: right">高さ (mm)</th>
                <th>サイズ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in printer.paper_sizes" :key="row.name">
                <td>{{ row.name }}</td>
                <td style="text-align: right">{{ row.width_mm.toFixed(1) }}</td>
                <td style="text-align: right">{{ row.height_mm.toFixed(1) }}</td>
                <td>{{ row.width_mm.toFixed(0) }} × {{ row.height_mm.toFixed(0) }} mm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </template>

    <template v-else>
      <div class="o-empty-state">
        <p>プリンター情報がありません</p>
        <p class="o-empty-state__hint">「接続」タブでサービスに接続してプリンター情報を取得してください。</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PrinterInfo } from '@/utils/print/printConfig'

const props = defineProps<{
  printers: PrinterInfo[]
  defaultPrinterOs: string | null
  lastCacheUpdate: string | null
}>()

const expandedPrinters = ref<string[]>([])

const lastUpdate = computed(() => {
  if (!props.lastCacheUpdate) return ''
  try {
    return new Date(props.lastCacheUpdate).toLocaleString('ja-JP')
  } catch {
    return props.lastCacheUpdate
  }
})

// Auto-expand first printer
watch(
  () => props.printers,
  (val) => {
    if (val.length > 0 && expandedPrinters.value.length === 0) {
      expandedPrinters.value = [val[0]!.name]
    }
  },
  { immediate: true },
)

const togglePrinter = (name: string) => {
  const idx = expandedPrinters.value.indexOf(name)
  if (idx >= 0) {
    expandedPrinters.value = expandedPrinters.value.filter(n => n !== name)
  } else {
    expandedPrinters.value = [...expandedPrinters.value, name]
  }
}
</script>

<style scoped>
.printer-list-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.printer-count {
  font-size: 14px;
  color: #606266;
}

.last-update {
  font-size: 12px;
  color: #909399;
}

.printer-name {
  font-weight: 600;
}

/* Collapsible printer sections */
.printer-details {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
}

.printer-details + .printer-details {
  margin-top: 8px;
}

.printer-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  cursor: pointer;
  background-color: #f5f7fa;
  user-select: none;
  list-style: none;
}

.printer-summary::-webkit-details-marker {
  display: none;
}

.printer-summary::before {
  content: '▶';
  font-size: 10px;
  color: #909399;
  transition: transform 0.2s;
  margin-right: 4px;
}

.printer-details[open] > .printer-summary::before {
  transform: rotate(90deg);
}

.printer-summary:hover {
  background-color: #ecf5ff;
}

.printer-content {
  padding: 12px 16px;
  overflow-x: auto;
}

/* Badge styles */
.o-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
}

.o-badge-primary {
  background-color: #ecf5ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.o-badge-info {
  background-color: #f4f4f5;
  color: #909399;
  border: 1px solid #d3d4d6;
}

/* Table styles */
.o-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.o-table th {
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  font-weight: 600;
  color: #606266;
  white-space: nowrap;
}

.o-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  color: #303133;
}

.o-table tbody tr:last-child td {
  border-bottom: none;
}

.o-table tbody tr:nth-child(even) {
  background-color: #fafafa;
}

.o-table tbody tr:hover {
  background-color: #f5f7fa;
}

/* Empty state */
.o-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #909399;
  text-align: center;
}

.o-empty-state p {
  margin: 4px 0;
  font-size: 14px;
}

.o-empty-state__hint {
  font-size: 12px;
  color: #c0c4cc;
}
</style>
