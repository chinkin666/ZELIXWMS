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
      <!-- 選択列 / 选择列 -->
      <el-table-column
        v-if="selectable"
        type="selection"
        width="45"
        fixed="left"
        :selectable="selectableFilter"
      />

      <!-- 動的列レンダリング / 动态列渲染 -->
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
            <!-- モード1: Vueコンポーネント / 模式1: Vue 组件 -->
            <component
              v-if="col.component"
              :is="col.component"
              v-bind="col.props ? col.props(row) : { row }"
              v-on="col.events ? col.events(row) : {}"
            />
            <!-- モード2: レンダリング関数 / 模式2: 渲染函数 -->
            <WmsRenderCell
              v-else-if="col.render"
              :render="col.render"
              :row="row"
              :column="col"
            />
            <!-- モード3: シンプルテキスト (el-table-column propが自動処理) / 模式3: 简单文本 (由 el-table-column prop 自动处理) -->
          </template>
        </el-table-column>
      </template>
    </el-table>

    <!-- ページネーション / 分页 -->
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
  /** 列定義 / 列定义 */
  columns: WmsColumnDef[]
  /** テーブルデータ / 表格数据 */
  data: any[]
  /** テーブル高さ / 表格高度 */
  height?: number | string
  /** 最大高さ / 最大高度 */
  maxHeight?: number | string
  /** 行CSSクラス名関数 / 行CSS类名函数 */
  rowClassName?: string | ((data: { row: any; rowIndex: number }) => string)
  /** 行の一意キー / 行唯一key */
  rowKey?: string | ((row: any) => string)
  /** 選択列を表示するか / 是否显示选择列 */
  selectable?: boolean
  /** 行の選択可否フィルター関数 / 行是否可选择过滤函数 */
  selectableFilter?: (row: any, index: number) => boolean
  /** ページネーションを表示するか / 是否显示分页 */
  pagination?: boolean
  /** 総件数（ページネーション用） / 总条数（分页用） */
  total?: number
  /** ページサイズ選択肢 / 每页条数选项 */
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

/** 表示可能な列をフィルタリング / 过滤出可见列 */
const visibleColumns = computed(() =>
  props.columns.filter((col) => col.visible !== false),
)

/** 選択変更 / 选择变更 */
const handleSelectionChange = (rows: any[]) => {
  emit('selection-change', rows)
}

/** ソート変更 / 排序变更 */
const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  const col = props.columns.find((c) => c.prop === prop || c.key === prop)
  if (col) {
    emit('sort-change', {
      key: col.key,
      order: order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : null,
    })
  }
}

/** レンダリング関数Cell — functional componentでrender関数をラップ / 渲染函数 Cell — 用 functional component 包装 render 函数 */
const WmsRenderCell: FunctionalComponent<{
  render: (row: any, column: WmsColumnDef) => any
  row: any
  column: WmsColumnDef
}> = (props) => {
  return props.render(props.row, props.column)
}

/** el-tableメソッドを公開 / 暴露 el-table 方法 */
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
