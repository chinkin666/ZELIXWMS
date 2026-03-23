<template>
  <div class="table-card">
    <div class="table-title">{{ t('wms.mapping.source', '入力元') }}</div>
    <div class="source-table-wrap" style="height: 520px; overflow-y: auto;">
      <Table class="source-table">
        <TableHeader>
          <TableRow>
            <TableHead style="min-width: 240px">{{ t('wms.mapping.fieldName', '項目名') }}</TableHead>
            <TableHead style="min-width: 200px">{{ t('wms.mapping.linkedTarget', 'マッピング先') }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="sourceRows.length === 0">
            <TableCell colspan="2" style="text-align: center; color: #999; padding: 20px">
              {{ emptyText }}
            </TableCell>
          </TableRow>
          <TableRow
            v-for="row in sourceRows"
            :key="row.name"
            @click="$emit('select-source', row)"
            :class="{ 'row-selected': isSelected(row) }"
            style="cursor: pointer"
          >
            <TableCell>
              <input
                type="checkbox"
                :checked="isSelected(row)"
                style="margin-right: 8px; pointer-events: none"
              />
              {{ row.label || row.name }}
            </TableCell>
            <TableCell>
              <div class="used-by-targets">
                <span
                  v-for="targetField in getUsedByTargets(row.name)"
                  :key="targetField"
                  class="o-badge o-badge-info"
                  style="margin-right: 4px; margin-bottom: 4px"
                >
                  {{ getTargetDisplayName(targetField) }}
                </span>
                <span v-if="getUsedByTargets(row.name).length === 0" class="empty-text">
                  {{ t('wms.mapping.unused', '未使用') }}
                </span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const { t } = useI18n()

interface SourceRow {
  name: string
  label?: string
}

const props = defineProps<{
  sourceRows: SourceRow[]
  selectedSources: SourceRow[]
  emptyText: string
  getUsedByTargets: (sourceName: string) => string[]
  getTargetDisplayName: (targetField: string) => string
}>()

defineEmits<{
  'select-source': [row: SourceRow]
}>()

function isSelected(row: SourceRow): boolean {
  return props.selectedSources.some((s) => s.name === row.name)
}
</script>

<style scoped>
.table-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  padding: 10px;
  display: flex;
  flex-direction: column;
}
.table-title {
  font-weight: 600;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
/* .o-list-table base styles are defined globally in style.css */
.row-selected {
  background: #ecf5ff !important;
}
.used-by-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.empty-text {
  color: #999;
  font-size: 12px;
}
.o-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}
.o-badge-info {
  background: #f4f4f5;
  color: #909399;
}
</style>
