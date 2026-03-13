<template>
  <div class="wms-datatable">
    <el-table
      ref="tableRef"
      :data="data"
      :height="height"
      :max-height="maxHeight"
      :row-class-name="rowClassName"
      :row-key="rowKey"
      v-bind="$attrs"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
    >
      <!-- 選択列 -->
      <el-table-column
        v-if="selectable"
        type="selection"
        width="45"
        fixed="left"
        :selectable="selectableFilter"
      />

      <!-- 動態列渲染 -->
      <template v-for="col in visibleColumns" :key="col.key">
        <el-table-column
          :prop="col.prop"
          :label="col.title"
          :width="col.width"
          :min-width="col.minWidth"
          :fixed="col.fixed"
          :sortable="col.sortable"
          :align="col.align"
          :class-name="col.className"
        >
          <template #default="{ row }">
            <!-- 模式1: Vue 組件 -->
            <component
              v-if="col.component"
              :is="col.component"
              v-bind="col.props ? col.props(row) : { row }"
              v-on="col.events ? col.events(row) : {}"
            />
            <!-- 模式2: 渲染函數 -->
            <WmsRenderCell
              v-else-if="col.render"
              :render="col.render"
              :row="row"
              :column="col"
            />
            <!-- 模式3: 簡單文本 (由 el-table-column prop 自動處理) -->
          </template>
        </el-table-column>
      </template>
    </el-table>

    <!-- 分頁 -->
    <WmsPagination
      v-if="pagination"
      v-model:current-page="currentPageModel"
      v-model:page-size="pageSizeModel"
      :total="total"
      :page-sizes="pageSizes"
      @current-change="$emit('page-change', $event)"
      @size-change="$emit('size-change', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type FunctionalComponent } from 'vue'
import type { WmsColumnDef, WmsSortChangeEvent } from './types/table'
import WmsPagination from './WmsPagination.vue'

export interface WmsDataTableProps {
  /** 列定義 */
  columns: WmsColumnDef[]
  /** 表格數據 */
  data: any[]
  /** 表格高度 */
  height?: number | string
  /** 最大高度 */
  maxHeight?: number | string
  /** 行CSS類名函數 */
  rowClassName?: string | ((data: { row: any; rowIndex: number }) => string)
  /** 行唯一key */
  rowKey?: string | ((row: any) => string)
  /** 是否顯示選擇列 */
  selectable?: boolean
  /** 行是否可選擇過濾函數 */
  selectableFilter?: (row: any, index: number) => boolean
  /** 是否顯示分頁 */
  pagination?: boolean
  /** 總條數（分頁用） */
  total?: number
  /** 每頁條數選項 */
  pageSizes?: number[]
}

const props = withDefaults(defineProps<WmsDataTableProps>(), {
  selectable: false,
  pagination: true,
  total: 0,
  pageSizes: () => [20, 50, 100, 200],
})

const currentPageModel = defineModel<number>('currentPage', { default: 1 })
const pageSizeModel = defineModel<number>('pageSize', { default: 50 })

const emit = defineEmits<{
  'selection-change': [rows: any[]]
  'sort-change': [event: WmsSortChangeEvent]
  'page-change': [page: number]
  'size-change': [size: number]
}>()

const tableRef = ref()

/** 過濾出可見列 */
const visibleColumns = computed(() =>
  props.columns.filter((col) => col.visible !== false),
)

/** 選擇變更 */
const handleSelectionChange = (rows: any[]) => {
  emit('selection-change', rows)
}

/** 排序變更 */
const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  const col = props.columns.find((c) => c.prop === prop || c.key === prop)
  if (col) {
    emit('sort-change', {
      key: col.key,
      order: order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : null,
    })
  }
}

/** 渲染函數 Cell — 用 functional component 包裝 render 函數 */
const WmsRenderCell: FunctionalComponent<{
  render: (row: any, column: WmsColumnDef) => any
  row: any
  column: WmsColumnDef
}> = (props) => {
  return props.render(props.row, props.column)
}

/** 暴露 el-table 方法 */
const clearSelection = () => tableRef.value?.clearSelection()
const toggleRowSelection = (row: any, selected?: boolean) =>
  tableRef.value?.toggleRowSelection(row, selected)

defineExpose({
  tableRef,
  clearSelection,
  toggleRowSelection,
})
</script>

<style scoped>
.wms-datatable {
  width: 100%;
}
</style>
