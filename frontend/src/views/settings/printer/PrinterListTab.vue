<template>
  <div class="printer-list-tab">
    <template v-if="printers.length > 0">
      <div class="printer-count">
        {{ printers.length }} 台のプリンターが見つかりました
        <span v-if="lastUpdate" class="last-update">（最終更新: {{ lastUpdate }}）</span>
      </div>

      <el-collapse v-model="expandedPrinters">
        <el-collapse-item
          v-for="printer in printers"
          :key="printer.name"
          :name="printer.name"
        >
          <template #title>
            <div class="printer-title">
              <el-icon class="printer-icon"><Printer /></el-icon>
              <span class="printer-name">{{ printer.name }}</span>
              <el-tag
                v-if="printer.name === defaultPrinterOs"
                type="primary"
                size="small"
                style="margin-left: 8px"
              >
                OSデフォルト
              </el-tag>
              <el-tag size="small" type="info" style="margin-left: 8px">
                {{ printer.paper_sizes.length }} 用紙サイズ
              </el-tag>
            </div>
          </template>

          <el-table
            :data="printer.paper_sizes"
            size="small"
            stripe
            style="width: 100%"
            max-height="400"
          >
            <el-table-column prop="name" label="用紙名" width="200" />
            <el-table-column label="幅 (mm)" width="120" align="right">
              <template #default="{ row }">{{ row.width_mm.toFixed(1) }}</template>
            </el-table-column>
            <el-table-column label="高さ (mm)" width="120" align="right">
              <template #default="{ row }">{{ row.height_mm.toFixed(1) }}</template>
            </el-table-column>
            <el-table-column label="サイズ" min-width="150">
              <template #default="{ row }">
                {{ row.width_mm.toFixed(0) }} × {{ row.height_mm.toFixed(0) }} mm
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </template>

    <template v-else>
      <el-empty description="プリンター情報がありません">
        <template #description>
          <p>「接続」タブでサービスに接続してプリンター情報を取得してください。</p>
        </template>
      </el-empty>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Printer } from '@element-plus/icons-vue'
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

.printer-title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.printer-icon {
  font-size: 16px;
  color: #409eff;
}

.printer-name {
  font-weight: 600;
}
</style>
