<template>
  <div class="table-card">
    <div class="table-title">入力元（Source）</div>
    <div class="source-table-wrap" style="height: 520px; overflow-y: auto;">
      <table class="o-list-table source-table">
        <thead>
          <tr>
            <th style="min-width: 240px">項目名</th>
            <th style="min-width: 200px">使用中の出力先</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="sourceRows.length === 0">
            <td colspan="2" style="text-align: center; color: #999; padding: 20px">
              {{ emptyText }}
            </td>
          </tr>
          <tr
            v-for="row in sourceRows"
            :key="row.name"
            @click="$emit('select-source', row)"
            :class="{ 'row-selected': isSelected(row) }"
            style="cursor: pointer"
          >
            <td>
              <input
                type="checkbox"
                :checked="isSelected(row)"
                style="margin-right: 8px; pointer-events: none"
              />
              {{ row.label || row.name }}
            </td>
            <td>
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
                  未使用
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
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
.o-list-table {
  width: 100%;
  border-collapse: collapse;
}
.o-list-table th,
.o-list-table td {
  border: 1px solid var(--o-border-color, #dee2e6);
  padding: 8px 10px;
  text-align: left;
  font-size: 13px;
}
.o-list-table th {
  background: var(--o-gray-100, #f8f9fa);
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}
.o-list-table tbody tr:hover {
  background: #f5f7fa;
}
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
