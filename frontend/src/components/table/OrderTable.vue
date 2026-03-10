<template>
  <div ref="tableContainerRef" class="nex-table" @click="handleTableClick">
    <div class="nex-table__wrapper">
      <el-table
        ref="tableRef"
        :data="displayData"
        :row-key="(row: any) => String(row[rowKey as string] ?? row.id ?? '')"
        :highlight-current-row="false"
        :border="true"
        :cell-class-name="getCellClassName"
        :row-class-name="getRowClassName"
        :reserve-selection="paginationEnabled"
        v-bind="tableProps"
      >
        <!-- 选择列 -->
        <el-table-column
          v-if="rowSelectionEnabled"
          type="selection"
          width="40"
          fixed="left"
          align="center"
          class-name="selection-column"
        />

        <!-- 同梱列 -->
        <el-table-column
          v-if="hasBundleColumn"
          :label="bundleColumn?.title || '同梱'"
          :width="bundleColumn?.width || 110"
          fixed="left"
          align="center"
        >
          <template #default="{ row }">
            <BundleCell
              v-if="bundleColumn?.cellRenderer"
              :renderer="bundleColumn.cellRenderer"
              :row-data="row"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 根据 headerGroupingConfig 生成分类列 -->
        <template v-for="(group, groupIndex) in categoryGroups" :key="`category-${groupIndex}`">
          <!-- 出荷情報：特殊处理，使用多级表头，一个表头横跨3列 -->
          <el-table-column
            v-if="group.title === '出荷情報'"
            :min-width="group.minWidth || 200"
          >
            <template #header>
              <div class="category-header">
                <span class="category-header-title">{{ group.title }}</span>
                <el-popover
                  v-model:visible="sortPopoverVisible[group.title]"
                  placement="bottom"
                  :width="200"
                  :trigger="[]"
                  :hide-after="0"
                  :popper-options="{ strategy: 'fixed' }"
                >
                  <template #reference>
                    <el-button
                      :icon="getSortIcon(group.title)"
                      size="small"
                      text
                      class="sort-button"
                      @click.stop="toggleSortPopover(group.title)"
                    />
                  </template>
                  <div class="sort-popover-content" @click.stop>
                    <div class="sort-order-buttons">
                      <el-button
                        :type="getSortOrderForGroup(group.title) === 'asc' ? 'primary' : 'default'"
                        size="small"
                        :icon="ArrowUp"
                        @click="setSortOrderForGroup(group.title, 'asc')"
                      >
                        昇順
                      </el-button>
                      <el-button
                        :type="getSortOrderForGroup(group.title) === 'desc' ? 'primary' : 'default'"
                        size="small"
                        :icon="ArrowDown"
                        @click="setSortOrderForGroup(group.title, 'desc')"
                      >
                        降順
                      </el-button>
                    </div>
                    <el-select
                      v-model="sortFieldForGroup[group.title]"
                      placeholder="並べ替え列を選択"
                      size="small"
                      style="width: 100%; margin-top: 8px;"
                      @change="handleSortFieldChange(group.title)"
                    >
                      <el-option
                        v-for="field in group.fields"
                        :key="field.key"
                        :label="field.label"
                        :value="field.dataKey"
                      />
                    </el-select>
                    <el-button
                      v-if="getSortInfoForGroup(group.title)"
                      class="clear-sort-button"
                      size="small"
                      plain
                      style="width: 100%; margin-top: 8px;"
                      @click="clearSortForGroup(group.title)"
                    >
                      クリア
                    </el-button>
                  </div>
                </el-popover>
              </div>
              <div v-if="getSortInfoForGroup(group.title)" class="sort-info">
                並べ替え: {{ getSortInfoForGroup(group.title) }}
              </div>
            </template>
            <!-- 第一列：出荷管理No、お客様管理番号 -->
            <el-table-column
              :min-width="290"
              class-name="shipment-sub-column-1"
              fixed="left"
            >
              <template #header>
                <span style="display: none;"></span>
              </template>
              <template #default="{ row }">
                <div class="category-cell">
                  <div
                    v-for="field in getShipmentFieldsByGroup(group.fields, 1)"
                    :key="field.key"
                    class="category-field"
                    :class="{ 'field-error': hasFieldError(row, field) }"
                  >
                    <span class="field-label">{{ field.label }}: </span>
                    <span class="field-value">{{ formatFieldValue(row, field) }}</span>
                  </div>
                  <!-- 同梱相关 tag -->
                  <div v-if="shouldShowBundleTags(row)" class="bundle-tags">
                    <InfoTag
                      v-if="isBundled(row)"
                      content="同梱済"
                      :width="50"
                      :height="18"
                      backgroundColor="#e3f2fd"
                      borderColor="#2196f3"
                      textColor="#1565c0"
                      :borderRadius="2"
                      :borderWidth="1"
                      :absolute="false"
                    />
                    <InfoTag
                      v-else-if="canBundle(row)"
                      content="同梱可能"
                      :width="60"
                      :height="18"
                      backgroundColor="#e3f2fd"
                      borderColor="#2196f3"
                      textColor="#1565c0"
                      :borderRadius="2"
                      :borderWidth="1"
                      :absolute="false"
                    />
                  </div>
                  <!-- 状态标签 -->
                  <div v-if="shouldShowStatusTags(row)" class="status-tags">
                    <template v-if="getStatusTag(row, 'carrierReceipt')">
                      <InfoTag
                        :content="getStatusTag(row, 'carrierReceipt')!"
                        :width="80"
                        :height="18"
                        backgroundColor="#f0f9ff"
                        borderColor="#409eff"
                        textColor="#409eff"
                        :borderRadius="2"
                        :borderWidth="1"
                        :absolute="false"
                      />
                    </template>
                    <template v-if="getStatusTag(row, 'confirm')">
                      <InfoTag
                        :content="getStatusTag(row, 'confirm')!"
                        :width="60"
                        :height="18"
                        backgroundColor="#f4f4f5"
                        borderColor="#909399"
                        textColor="#606266"
                        :borderRadius="2"
                        :borderWidth="1"
                        :absolute="false"
                      />
                    </template>
                    <template v-if="getStatusTag(row, 'inspected')">
                      <InfoTag
                        :content="getStatusTag(row, 'inspected')!"
                        :width="60"
                        :height="18"
                        backgroundColor="#f0f9eb"
                        borderColor="#67c23a"
                        textColor="#67c23a"
                        :borderRadius="2"
                        :borderWidth="1"
                        :absolute="false"
                      />
                    </template>
                    <template v-if="getStatusTag(row, 'printed')">
                      <InfoTag
                        :content="getStatusTag(row, 'printed')!"
                        :width="60"
                        :height="18"
                        backgroundColor="#fdf6ec"
                        borderColor="#e6a23c"
                        textColor="#e6a23c"
                        :borderRadius="2"
                        :borderWidth="1"
                        :absolute="false"
                      />
                    </template>
                    <template v-if="getStatusTag(row, 'shipped')">
                      <InfoTag
                        :content="getStatusTag(row, 'shipped')!"
                        :width="60"
                        :height="18"
                        backgroundColor="#f0f9ff"
                        borderColor="#67c23a"
                        textColor="#67c23a"
                        :borderRadius="2"
                        :borderWidth="1"
                        :absolute="false"
                      />
                    </template>
                    <template v-if="getStatusTag(row, 'ecExported')">
                      <InfoTag
                        :content="getStatusTag(row, 'ecExported')!"
                        :width="80"
                        :height="18"
                        backgroundColor="#fef0f0"
                        borderColor="#f56c6c"
                        textColor="#f56c6c"
                        :borderRadius="2"
                        :borderWidth="1"
                        :absolute="false"
                      />
                    </template>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <!-- 第二列：配送会社、送り状種類、クール区分 -->
            <el-table-column
              :min-width="180"
              class-name="shipment-sub-column-2"
            >
              <template #header>
                <span style="display: none;"></span>
              </template>
              <template #default="{ row }">
                <div class="category-cell">
                  <div
                    v-for="field in getShipmentFieldsByGroup(group.fields, 2)"
                    :key="field.key"
                    class="category-field"
                    :class="{ 'field-error': hasFieldError(row, field) }"
                  >
                    <span class="field-label">{{ field.label }}: </span>
                    <template v-if="field.key === 'coolType'">
                      <InfoTag
                        v-if="getCoolTypeValue(row, field)"
                        :content="getCoolTypeLabel(row, field)"
                        :width="getCoolTypeTagWidth(row, field)"
                        :height="18"
                        :backgroundColor="getCoolTypeColor(row, field).bg"
                        :borderColor="getCoolTypeColor(row, field).border"
                        :textColor="getCoolTypeColor(row, field).text"
                        :borderRadius="2"
                        :borderWidth="1"
                        :absolute="false"
                      />
                      <span v-else class="field-value">-</span>
                    </template>
                    <span v-else class="field-value">{{ formatFieldValue(row, field) }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <!-- 第三列：出荷予定日、お届け日指定、お届け時間帯、荷扱い -->
            <el-table-column
              :min-width="170"
              class-name="shipment-sub-column-3"
            >
              <template #header>
                <span style="display: none;"></span>
              </template>
              <template #default="{ row }">
                <div class="category-cell">
                  <div
                    v-for="field in getShipmentFieldsByGroup(group.fields, 3)"
                    :key="field.key"
                    class="category-field"
                    :class="{ 'field-error': hasFieldError(row, field) }"
                  >
                    <span class="field-label">{{ field.label }}: </span>
                    <span class="field-value">{{ formatFieldValue(row, field) }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table-column>
          
          <!-- 商品情報：特殊处理，一个订单多个商品时，在单元格内显示多行 -->
          <el-table-column
            v-else-if="group.title === '商品情報'"
            :min-width="340"
          >
            <template #header>
              <div class="category-header">
                <span class="category-header-title">{{ group.title }}</span>
                <el-popover
                  v-model:visible="sortPopoverVisible[group.title]"
                  placement="bottom"
                  :width="200"
                  :trigger="[]"
                  :hide-after="0"
                  :popper-options="{ strategy: 'fixed' }"
                >
                  <template #reference>
                    <el-button
                      :icon="getSortIcon(group.title)"
                      size="small"
                      text
                      class="sort-button"
                      @click.stop="toggleSortPopover(group.title)"
                    />
                  </template>
                  <div class="sort-popover-content" @click.stop>
                    <div class="sort-order-buttons">
                      <el-button
                        :type="getSortOrderForGroup(group.title) === 'asc' ? 'primary' : 'default'"
                        size="small"
                        :icon="ArrowUp"
                        @click="setSortOrderForGroup(group.title, 'asc')"
                      >
                        昇順
                      </el-button>
                      <el-button
                        :type="getSortOrderForGroup(group.title) === 'desc' ? 'primary' : 'default'"
                        size="small"
                        :icon="ArrowDown"
                        @click="setSortOrderForGroup(group.title, 'desc')"
                      >
                        降順
                      </el-button>
                    </div>
                    <el-select
                      v-model="sortFieldForGroup[group.title]"
                      placeholder="並べ替え列を選択"
                      size="small"
                      style="width: 100%; margin-top: 8px;"
                      @change="handleSortFieldChange(group.title)"
                    >
                      <el-option
                        v-for="field in group.fields"
                        :key="field.key"
                        :label="field.label"
                        :value="field.dataKey"
                      />
                    </el-select>
                    <el-button
                      v-if="getSortInfoForGroup(group.title)"
                      class="clear-sort-button"
                      size="small"
                      plain
                      style="width: 100%; margin-top: 8px;"
                      @click="clearSortForGroup(group.title)"
                    >
                      クリア
                    </el-button>
                  </div>
                </el-popover>
              </div>
              <div v-if="getSortInfoForGroup(group.title)" class="sort-info">
                並べ替え: {{ getSortInfoForGroup(group.title) }}
              </div>
            </template>
            <template #default="{ row }">
              <div class="product-cell">
                <template v-if="getOrderProducts(row).length > 0">
                  <div
                    v-for="(product, productIndex) in getOrderProducts(row)"
                    :key="`product-${productIndex}`"
                    class="product-item"
                  >
                    <img
                      :src="resolveProductImageUrl(getProductImageUrl(product))"
                      class="product-image"
                      @error="(e: Event) => { (e.target as HTMLImageElement).src = noImageSrc }"
                    />
                    <div class="product-info">
                      <div class="product-field">
                        <span class="product-label">商品名: </span>
                        <span class="product-value">{{ getProductNameFromProduct(product) }}</span>
                      </div>
                      <div class="product-field">
                        <span class="product-label">SKU管理番号: </span>
                        <span class="product-value">{{ product.inputSku || product.sku || '-' }}</span>
                      </div>
                      <div class="product-field">
                        <span class="product-label">検品コード: </span>
                        <span class="product-value">{{ getProductInspectionCodeFromProduct(product) }}</span>
                      </div>
                      <div v-if="product.subtotal !== undefined && product.subtotal !== null" class="product-field">
                        <span class="product-label">金額: </span>
                        <span class="product-value">{{ formatPrice(product.subtotal) }}</span>
                      </div>
                    </div>
                    <InfoTag
                      v-if="product.quantity"
                      :content="`${product.quantity}個`"
                      class="product-quantity-tag"
                    />
                  </div>
                  <!-- 合計金額 -->
                  <div v-if="getOrderTotalPrice(row)" class="product-total">
                    <span class="product-total-label">合計金額: </span>
                    <span class="product-total-value">{{ formatPrice(getOrderTotalPrice(row)) }}</span>
                  </div>
                </template>
                <div v-else class="product-empty">-</div>
              </div>
            </template>
          </el-table-column>
          
          <!-- 其他分类：正常显示 -->
          <el-table-column
            v-else
            :min-width="group.minWidth || 200"
            :fixed="groupIndex === 0 && rowSelectionEnabled ? 'left' : false"
          >
            <template #header>
              <div class="category-header">
                <span class="category-header-title">{{ group.title }}</span>
                <el-popover
                  v-model:visible="sortPopoverVisible[group.title]"
                  placement="bottom"
                  :width="200"
                  :trigger="[]"
                  :hide-after="0"
                  :popper-options="{ strategy: 'fixed' }"
                >
                  <template #reference>
                    <el-button
                      :icon="getSortIcon(group.title)"
                      size="small"
                      text
                      class="sort-button"
                      @click.stop="toggleSortPopover(group.title)"
                    />
                  </template>
                  <div class="sort-popover-content" @click.stop>
                    <div class="sort-order-buttons">
                      <el-button
                        :type="getSortOrderForGroup(group.title) === 'asc' ? 'primary' : 'default'"
                        size="small"
                        :icon="ArrowUp"
                        @click="setSortOrderForGroup(group.title, 'asc')"
                      >
                        昇順
                      </el-button>
                      <el-button
                        :type="getSortOrderForGroup(group.title) === 'desc' ? 'primary' : 'default'"
                        size="small"
                        :icon="ArrowDown"
                        @click="setSortOrderForGroup(group.title, 'desc')"
                      >
                        降順
                      </el-button>
                    </div>
                    <el-select
                      v-model="sortFieldForGroup[group.title]"
                      placeholder="並べ替え列を選択"
                      size="small"
                      style="width: 100%; margin-top: 8px;"
                      @change="handleSortFieldChange(group.title)"
                    >
                      <el-option
                        v-for="field in group.fields"
                        :key="field.key"
                        :label="field.label"
                        :value="field.dataKey"
                      />
                    </el-select>
                    <el-button
                      v-if="getSortInfoForGroup(group.title)"
                      class="clear-sort-button"
                      size="small"
                      plain
                      style="width: 100%; margin-top: 8px;"
                      @click="clearSortForGroup(group.title)"
                    >
                      クリア
                    </el-button>
                  </div>
                </el-popover>
              </div>
              <div v-if="getSortInfoForGroup(group.title)" class="sort-info">
                並べ替え: {{ getSortInfoForGroup(group.title) }}
              </div>
            </template>
            <template #default="{ row }">
              <div class="category-cell">
                <div
                  v-for="field in group.fields"
                  :key="field.key"
                  class="category-field"
                  :class="{ 'field-error': hasFieldError(row, field) }"
                >
                  <span class="field-label">{{ field.label }}: </span>
                  <span class="field-value">{{ formatFieldValue(row, field) }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
        </template>

        <!-- 操作列 -->
        <el-table-column
          v-if="hasActionColumn"
          label="操作"
          width="120"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <ActionCell
              v-if="actionColumn?.cellRenderer"
              :renderer="actionColumn.cellRenderer"
              :row-data="row"
            />
            <div v-else class="action-buttons">
              <el-button
                type="primary"
                size="small"
                plain
                @click="handleEdit(row)"
              >
                編集
              </el-button>
              <el-button
                type="danger"
                size="small"
                plain
                @click="handleDelete(row)"
              >
                削除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div
      v-if="paginationEnabled"
      class="nex-table__pagination"
    >
      <el-pagination
        background
        layout="total, sizes, prev, pager, next, jumper"
        :total="totalItems"
        :page-size="innerPageSize"
        :page-sizes="pageSizes"
        :current-page="innerCurrentPage"
        :pager-count="paginationMode === 'server' ? 7 : 7"
        @current-change="handlePageChange"
        @size-change="handlePageSizeChange"
      />
    </div>

    <BulkEditDialog
      v-if="bulkEditEnabled"
      v-model="bulkEditVisible"
      :columns="bulkEditableColumns"
      :selected-count="innerSelectedKeys.length"
      @confirm="applyBulkEdit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h, ref, toRefs, watch, onMounted, onUnmounted, defineComponent, nextTick } from 'vue'
import {
  ElCheckbox,
  ElTable,
  ElTableColumn,
  ElButton,
  ElSpace,
  ElMessage,
  ElSelect,
  ElOption,
  ElPopover,
} from 'element-plus'
import { ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import type { CheckboxValueType } from 'element-plus'
import type { HeaderGroupingConfig } from './tableHeaderGroup'
import { getNestedValue, setNestedValue } from '@/utils/nestedObject'
import { naturalSort } from '@/utils/naturalSort'
import { mergeBarcodesWithSku } from '@/utils/barcode'
import BulkEditDialog from './BulkEditDialog.vue'
import { LINK_COLOR } from '@/theme/config'
import type { Product } from '@/types/product'
import InfoTag from './InfoTag.vue'
import noImageSrc from '@/assets/images/no_image.png'
import { getApiBaseUrl } from '@/api/base'

const ORDER_TABLE_API_BASE = getApiBaseUrl().replace(/\/api$/, '')

const resolveProductImageUrl = (url?: string): string => {
  if (!url) return noImageSrc
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${ORDER_TABLE_API_BASE}${url}`
}


// 操作列渲染组件
const ActionCell = defineComponent({
  name: 'ActionCell',
  props: {
    renderer: {
      type: Function,
      required: true,
    },
    rowData: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    return () => {
      try {
        const result = props.renderer({ rowData: props.rowData })
        // 包装结果，使其垂直排列
        return h('div', { class: 'action-cell-wrapper' }, [result])
      } catch (e) {
        console.error('Error rendering action cell:', e)
        return null
      }
    }
  },
})

// 同梱列渲染组件
const BundleCell = defineComponent({
  name: 'BundleCell',
  props: {
    renderer: {
      type: Function,
      required: true,
    },
    rowData: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    return () => {
      try {
        const result = props.renderer({ rowData: props.rowData })
        return result
      } catch (e) {
        console.error('Error rendering bundle cell:', e)
        return null
      }
    }
  },
})

type RowData = Record<string, unknown>
type RowKey = string | number

type PaginationMode = 'client' | 'server'
type SortMode = 'client' | 'server'
type SortOrder = 'asc' | 'desc' | null

type CategoryGroup = {
  title: string
  fields: Array<{
    key: string
    dataKey: string
    label: string
    column: any
  }>
  minWidth?: number
}

const props = withDefaults(
  defineProps<{
    columns: Array<any>
    data: RowData[]
    rowKey?: RowKey
    height?: number
    paginationEnabled?: boolean
    paginationMode?: PaginationMode
    pageSize?: number
    pageSizes?: number[]
    total?: number
    currentPage?: number
    tableProps?: Record<string, unknown>
    // 行选择
    rowSelectionEnabled?: boolean
    selectedKeys?: Array<RowKey>
    // 表头分组相关
    headerGroupingEnabled?: boolean
    headerGroupingConfig?: HeaderGroupingConfig
    // 排序相关
    sortEnabled?: boolean
    sortMode?: SortMode
    sortBy?: string | null
    sortOrder?: SortOrder
    // 表头批量编辑（统一编辑）
    bulkEditEnabled?: boolean
    // 批量删除
    batchDeleteEnabled?: boolean
    // 商品信息（用于显示検品コード等）
    products?: Product[] | Map<string, Product>
    // 是否显示同梱相关 tag（仅用于 /shipment-orders/create 页面）
    showBundleTags?: boolean
    // 是否显示状态标签（用于 /shipment-orders/history 页面）
    showStatusTags?: boolean
    // 同梱判断字段（用于计算同梱可能性）
    bundleFilterKeys?: string[]
    // 页面标识（用于缓存排序配置，如 'shipment-orders-create'）
    pageKey?: string
    // SearchForm quick global search text (client-side, matches visible text)
    globalSearchText?: string
    // 自定义行类名函数（用于行级别的样式控制）
    rowClassName?: (row: RowData) => string
  }>(),
  {
    height: 400,
    rowKey: 'id',
    paginationEnabled: false,
    paginationMode: 'client' as PaginationMode,
    pageSize: 10,
    pageSizes: () => [10, 20, 50, 100],
    total: undefined,
    currentPage: 1,
    tableProps: () => ({}),
    rowSelectionEnabled: false,
    selectedKeys: () => [],
    headerGroupingEnabled: false,
    headerGroupingConfig: undefined,
    sortEnabled: false,
    sortMode: 'client' as SortMode,
    sortBy: null,
    sortOrder: null,
    bulkEditEnabled: false,
    batchDeleteEnabled: false,
    products: undefined,
    showBundleTags: false,
    showStatusTags: false,
    bundleFilterKeys: undefined,
    pageKey: undefined,
    globalSearchText: '',
    rowClassName: undefined,
  },
)

const emits = defineEmits<{
  (e: 'update:currentPage', value: number): void
  (e: 'update:pageSize', value: number): void
  (e: 'page-change', payload: { page: number; pageSize: number; mode: PaginationMode }): void
  (e: 'update:selectedKeys', value: Array<RowKey>): void
  (e: 'selection-change', payload: { selectedKeys: Array<RowKey>; selectedRows: RowData[]; isSelectAllTriggered?: boolean }): void
  (e: 'update:sortBy', value: string | null): void
  (e: 'update:sortOrder', value: SortOrder): void
  (e: 'sort-change', payload: { sortBy: string | null; sortOrder: SortOrder; mode: SortMode }): void
  (e: 'bulk-edit', payload: { columnKey: string; dataKey: string; fieldType?: string; value: any; overwrite: boolean; selectedKeys: Array<RowKey>; selectedRows: RowData[] }): void
  (e: 'batch-delete', payload: { selectedKeys: Array<RowKey>; selectedRows: RowData[] }): void
}>()

const {
  rowKey,
  height,
  columns,
  data,
  paginationEnabled,
  paginationMode,
  pageSizes,
  rowSelectionEnabled,
  headerGroupingConfig,
  sortEnabled,
  sortMode,
  sortBy,
  sortOrder,
  bulkEditEnabled,
  batchDeleteEnabled,
  tableProps: rawTableProps,
  products: productsProp,
  showBundleTags,
  showStatusTags,
  bundleFilterKeys: bundleFilterKeysProp,
  pageKey: pageKeyProp,
} = toRefs(props)

const innerPageSize = ref(props.pageSize)
const innerCurrentPage = ref(props.currentPage)

// 行选择内部状态
const innerSelectedKeys = ref<Array<RowKey>>([...(props.selectedKeys ?? [])])

watch(
  () => props.selectedKeys,
  (val) => {
    if (!val) return
    const next = Array.isArray(val) ? [...val] : []
    if (next.length !== innerSelectedKeys.value.length) {
      innerSelectedKeys.value = next
      return
    }
    const currentSet = new Set(innerSelectedKeys.value)
    let changed = false
    for (const key of next) {
      if (!currentSet.has(key)) {
        changed = true
        break
      }
    }
    if (changed) {
      innerSelectedKeys.value = next
    }
  },
)

// 根据字段 key 判断所属分类（直接使用 order.ts 中的分类定义）
const getFieldCategory = (key: string): string | null => {
  // 根据 order.ts 中的注释定义分类
  // (出荷情報) ECモール, 出荷管理No, お客様管理番号, 配送会社, 送り状種類, クール区分, 出荷予定日, お届け日指定, お届け時間帯, 荷扱い
  const shipmentKeys = new Set([
    'ecCompanyId',
    'orderNumber',
    'customerManagementNumber',
    'carrierId',
    'invoiceType',
    'coolType',
    'shipPlanDate',
    'deliveryDatePreference',
    'deliveryTimeSlot',
    'handlingTags',
    'trackingId',
  ])
  
  // (商品情報) 商品
  const productKeys = new Set(['products'])
  
  // (送付先情報) 送付先郵便番号, 送付先住所, 送付先名, 送付先電話番号, 敬称
  const recipientKeys = new Set([
    'recipient.postalCode',
    'recipient.prefecture',
    'recipient.city',
    'recipient.street',
    'recipientAddress', // 組合せ表示用
    'recipient.name',
    'recipient.phone',
    'honorific',
  ])

  // (ご依頼主情報) 依頼主郵便番号, 依頼主住所, 依頼主名, 依頼主電話番号
  const senderKeys = new Set([
    'sender.postalCode',
    'sender.prefecture',
    'sender.city',
    'sender.street',
    'senderAddress', // 組合せ表示用
    'sender.name',
    'sender.phone',
  ])

  // (注文者情報) 注文者郵便番号, 注文者住所, 注文者名, 注文者電話番号
  const ordererKeys = new Set([
    'orderer.postalCode',
    'orderer.prefecture',
    'orderer.city',
    'orderer.street',
    'ordererAddress', // 組合せ表示用
    'orderer.name',
    'orderer.phone',
  ])
  
  // (その他) 作成日時, 更新日時, 印刷日時, 取り込み日時等
  const otherKeys = new Set([
    'createdAt',
    'updatedAt',
    'statusPrinted',
    'statusCarrierReceipt',
    'statusPrintReady',
    'statusShipped',
    'statusConfirm',
    'statusCarrierReceiptIsReceived',
    'statusConfirmIsConfirmed',
    'statusPrintedIsPrinted',
    'statusShippedIsShipped',
  ])
  
  if (shipmentKeys.has(key)) return '出荷情報'
  if (productKeys.has(key)) return '商品情報'
  if (recipientKeys.has(key)) return '送付先情報'
  if (senderKeys.has(key)) return 'ご依頼主情報'
  if (ordererKeys.has(key)) return '注文者情報'
  if (otherKeys.has(key)) return 'その他'
  
  // 如果字段不在预定义列表中，根据 key 的前缀判断
  if (key.startsWith('status')) return 'その他'
  
  return null
}

// 地址拆分字段（需要合并显示的字段）
const addressSplitFields = new Set([
  'recipient.prefecture',
  'recipient.city',
  'recipient.street',
  'sender.prefecture',
  'sender.city',
  'sender.street',
  'orderer.prefecture',
  'orderer.city',
  'orderer.street',
])

// 地址合并字段映射（拆分字段前缀 -> 合并后显示的 key 和 label）
const addressCombinedFieldMap: Record<string, { key: string; label: string }> = {
  'recipient': { key: 'recipientAddress', label: '送付先住所' },
  'sender': { key: 'senderAddress', label: 'ご依頼主住所' },
  'orderer': { key: 'ordererAddress', label: '注文者住所' },
}

// 不在表格中显示的字段（完全排除）
const excludedFields = new Set([
  'carrierData.yamato.hatsuBaseNo1',
  'carrierData.yamato.hatsuBaseNo2',
])

// 从 columns 直接构建分类组（不依赖 headerGroupingConfig 的计数）
const categoryGroups = computed<CategoryGroup[]>(() => {
  if (!columns.value) {
    return []
  }

  const cols = columns.value || []

  // 按分类分组字段
  const categoryMap = new Map<string, CategoryGroup['fields']>()
  // 追踪已添加的地址合并字段（避免重复添加）
  const addedAddressFields = new Set<string>()

  // 按照 columns 的顺序处理字段
  for (const col of cols) {
    const key = col.key || col.dataKey
    if (!key || key === 'actions' || key === '__selection__' || key === '__bundle__') {
      continue
    }

    // 跳过排除的字段
    if (excludedFields.has(String(key))) {
      continue
    }

    const keyStr = String(key)

    // 跳过地址拆分字段，替换为合并字段
    if (addressSplitFields.has(keyStr)) {
      // 确定地址前缀（recipient, sender, orderer）
      let prefix = ''
      if (keyStr.startsWith('recipient')) prefix = 'recipient'
      else if (keyStr.startsWith('sender')) prefix = 'sender'
      else if (keyStr.startsWith('orderer')) prefix = 'orderer'

      if (prefix && !addedAddressFields.has(prefix)) {
        addedAddressFields.add(prefix)
        const combined = addressCombinedFieldMap[prefix]
        if (combined) {
          const category = getFieldCategory(combined.key)
          if (category) {
            if (!categoryMap.has(category)) {
              categoryMap.set(category, [])
            }
            categoryMap.get(category)!.push({
              key: combined.key,
              dataKey: combined.key,
              label: combined.label,
              column: {
                ...col,
                key: combined.key,
                dataKey: combined.key,
                title: combined.label,
                // 标记为合并地址字段，供 formatFieldValue 使用
                _isCombinedAddress: true,
                _addressPrefix: prefix,
              },
            })
          }
        }
      }
      continue
    }

    // 跳过旧的合并地址字段（如果 columns 中有的话）
    if (keyStr === 'recipientAddress' || keyStr === 'senderAddress' || keyStr === 'ordererAddress') {
      continue
    }

    const category = getFieldCategory(keyStr)
    if (!category) {
      // 未知字段归类到"その他"
      if (!categoryMap.has('その他')) {
        categoryMap.set('その他', [])
      }
      const dataKey = col.dataKey || col.key
      categoryMap.get('その他')!.push({
        key: keyStr,
        dataKey: String(dataKey),
        label: col.title || keyStr,
        column: col,
      })
    } else {
      if (!categoryMap.has(category)) {
        categoryMap.set(category, [])
      }
      const dataKey = col.dataKey || col.key
      categoryMap.get(category)!.push({
        key: keyStr,
        dataKey: String(dataKey),
        label: col.title || keyStr,
        column: col,
      })
    }
  }

  // 按照固定顺序构建 groups
  const categoryOrder = ['出荷情報', '商品情報', '送付先情報', 'ご依頼主情報', 'その他']
  const groups: CategoryGroup[] = []

  for (const category of categoryOrder) {
    const fields = categoryMap.get(category)
    if (fields && fields.length > 0) {
      groups.push({
        title: category,
        fields,
        minWidth: 220,
      })
    }
  }

  return groups
})

// 构建商品信息 Map（从 products prop）
const productMap = computed<Map<string, Product>>(() => {
  const map = new Map<string, Product>()
  if (!productsProp.value) return map
  
  if (Array.isArray(productsProp.value)) {
    for (const product of productsProp.value) {
      if (product.sku) {
        map.set(product.sku, product)
      }
    }
  } else if (productsProp.value instanceof Map) {
    return productsProp.value
  }
  
  return map
})

// 获取商品图片URL：优先使用订单快照，回退到 productMap 查找
const getProductImageUrl = (product: any): string | undefined => {
  if (product.imageUrl) return product.imageUrl
  const sku = product.productSku || product.inputSku
  if (sku) {
    const master = productMap.value.get(sku)
    if (master?.imageUrl) return master.imageUrl
  }
  return undefined
}

// 获取订单的所有商品
const getOrderProducts = (row: RowData): any[] => {
  const products = (row as any).products
  if (!Array.isArray(products)) {
    return []
  }
  return products
}

// 从商品对象获取商品名
const getProductNameFromProduct = (product: any): string => {
  if (!product) return '-'
  return product.productName || product.inputSku || product.sku || '-'
}

// 从商品对象获取検品コード
const getProductInspectionCodeFromProduct = (product: any): string => {
  if (!product) return '-'
  if (!Array.isArray(product.barcode) || product.barcode.length === 0) return '-'
  const productSku = product.productSku || product.inputSku || product.sku
  const merged = mergeBarcodesWithSku(product.barcode, productSku)
  return merged.length > 0 ? merged.join(', ') : '-'
}

// 価格フォーマット
const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null) return '-'
  return `¥${price.toLocaleString()}`
}

// 注文の合計金額を取得
const getOrderTotalPrice = (row: RowData): number | null => {
  // _productsMeta.totalPrice から取得
  const totalPrice = (row as any)?._productsMeta?.totalPrice
  if (typeof totalPrice === 'number' && totalPrice > 0) {
    return totalPrice
  }
  // フォールバック：products から計算
  const products = getOrderProducts(row)
  if (!products || products.length === 0) return null
  const sum = products.reduce((acc: number, p: any) => acc + (p.subtotal || 0), 0)
  return sum > 0 ? sum : null
}

// クール区分相关函数
const coolTypeMap: Record<string, string> = {
  '0': '通常',
  '1': '冷凍',
  '2': '冷蔵',
}

const getCoolTypeValue = (row: RowData, field: CategoryGroup['fields'][0]): string | null => {
  const value = getNestedValue(row, field.dataKey)
  if (value === undefined || value === null || value === '') {
    return null
  }
  return String(value)
}

const getCoolTypeLabel = (row: RowData, field: CategoryGroup['fields'][0]): string => {
  const value = getCoolTypeValue(row, field)
  if (!value) return '-'
  return coolTypeMap[value] || value
}

const getCoolTypeTagWidth = (row: RowData, field: CategoryGroup['fields'][0]): number => {
  const label = getCoolTypeLabel(row, field)
  // 根据文字长度动态计算宽度：通常=40, 冷蔵=40, 冷凍=40
  if (label === '通常') return 40
  if (label === '冷蔵') return 40
  if (label === '冷凍') return 40
  return 50 // 默认宽度
}

const getCoolTypeColor = (row: RowData, field: CategoryGroup['fields'][0]): { bg: string; border: string; text: string } => {
  const value = getCoolTypeValue(row, field)
  if (!value) {
    return { bg: '#f5f5f5', border: '#cecece', text: '#909399' }
  }
  
  // 根据不同的クール区分值设置不同的颜色
  switch (value) {
    case '0': // 通常
      return { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' }
    case '1': // 冷凍
      return { bg: '#e3f2fd', border: '#2196f3', text: '#1565c0' }
    case '2': // 冷蔵
      return { bg: '#e1f5fe', border: '#03a9f4', text: '#0277bd' }
    default:
      return { bg: '#f5f5f5', border: '#cecece', text: '#909399' }
  }
}

// 排序相关状态
const sortPopoverVisible = ref<Record<string, boolean>>({})
const sortFieldForGroup = ref<Record<string, string>>({})
const sortOrderForGroup = ref<Record<string, 'asc' | 'desc' | null>>({})

// 获取排序配置的 localStorage key
const getSortConfigKey = (): string => {
  const pageKey = pageKeyProp.value
  return pageKey ? `order-table-sort-${pageKey}` : 'order-table-sort-default'
}

// 从 localStorage 加载排序配置
const loadSortConfig = () => {
  if (!pageKeyProp.value) return
  
  try {
    const key = getSortConfigKey()
    const saved = localStorage.getItem(key)
    if (saved) {
      const config = JSON.parse(saved)
      if (config.sortFieldForGroup) {
        sortFieldForGroup.value = config.sortFieldForGroup
      }
      if (config.sortOrderForGroup) {
        sortOrderForGroup.value = config.sortOrderForGroup
      }
      // 如果有保存的配置，应用排序
      if (Object.keys(sortFieldForGroup.value).length > 0) {
        nextTick(() => {
          applySorting()
        })
      }
    }
  } catch (e) {
    console.error('Failed to load sort config:', e)
  }
}

// 保存排序配置到 localStorage
const saveSortConfig = () => {
  if (!pageKeyProp.value) return
  
  try {
    const key = getSortConfigKey()
    const config = {
      sortFieldForGroup: sortFieldForGroup.value,
      sortOrderForGroup: sortOrderForGroup.value,
    }
    localStorage.setItem(key, JSON.stringify(config))
  } catch (e) {
    console.error('Failed to save sort config:', e)
  }
}

// 监听排序配置变化并保存
watch(
  [sortFieldForGroup, sortOrderForGroup],
  () => {
    saveSortConfig()
  },
  { deep: true }
)

// 组件挂载时加载排序配置
onMounted(() => {
  loadSortConfig()
})

// 切换排序弹窗
const toggleSortPopover = (groupTitle: string) => {
  // 关闭其他弹窗
  for (const [title, visible] of Object.entries(sortPopoverVisible.value)) {
    if (title !== groupTitle && visible) {
      sortPopoverVisible.value[title] = false
    }
  }
  // 切换当前弹窗
  sortPopoverVisible.value[groupTitle] = !sortPopoverVisible.value[groupTitle]
}

// 点击表格外部时关闭所有弹窗
const handleTableClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  // 如果点击的是弹窗内部或按钮，不关闭
  if (
    target.closest('.el-popover') ||
    target.closest('.sort-button') ||
    target.closest('.el-select-dropdown') ||
    target.closest('.sort-popover-content')
  ) {
    return
  }
  // 关闭所有弹窗
  for (const title in sortPopoverVisible.value) {
    sortPopoverVisible.value[title] = false
  }
}

// 获取排序图标
const getSortIcon = (groupTitle: string): any => {
  const order = sortOrderForGroup.value[groupTitle]
  if (order === 'asc') return ArrowUp
  if (order === 'desc') return ArrowDown
  return ArrowUp
}

// 设置排序顺序
const setSortOrderForGroup = (groupTitle: string, order: 'asc' | 'desc') => {
  sortOrderForGroup.value[groupTitle] = order
  applySorting()
}

// 处理排序字段变化
const handleSortFieldChange = (groupTitle: string) => {
  // 清除其他分类的排序字段（每个分类只能选择一个）
  for (const [title, field] of Object.entries(sortFieldForGroup.value)) {
    if (title !== groupTitle && field) {
      sortFieldForGroup.value[title] = ''
      sortOrderForGroup.value[title] = null
    }
  }
  applySorting()
  // 保持弹窗打开
  nextTick(() => {
    sortPopoverVisible.value[groupTitle] = true
  })
}

// 清除排序规则
const clearSortForGroup = (groupTitle: string) => {
  sortFieldForGroup.value[groupTitle] = ''
  sortOrderForGroup.value[groupTitle] = null
  applySorting()
  // 关闭弹窗
  sortPopoverVisible.value[groupTitle] = false
}

// 获取分类的排序顺序
const getSortOrderForGroup = (groupTitle: string): 'asc' | 'desc' | null => {
  return sortOrderForGroup.value[groupTitle] || null
}

// 获取分类的排序信息（用于显示）
const getSortInfoForGroup = (groupTitle: string): string => {
  const field = sortFieldForGroup.value[groupTitle]
  const order = sortOrderForGroup.value[groupTitle]
  if (!field || !order) return ''
  
  // 找到字段的标签
  const group = categoryGroups.value.find(g => g.title === groupTitle)
  if (!group) return ''
  const fieldInfo = group.fields.find(f => f.dataKey === field)
  if (!fieldInfo) return ''
  
  const orderSymbol = order === 'asc' ? '↑' : '↓'
  return `${fieldInfo.label} ${orderSymbol}`
}

// 应用排序
const applySorting = () => {
  // 收集所有分类的排序规则
  const sortRules: Array<{ field: string; order: 'asc' | 'desc' }> = []
  for (const [groupTitle, field] of Object.entries(sortFieldForGroup.value)) {
    if (field && sortOrderForGroup.value[groupTitle]) {
      sortRules.push({
        field,
        order: sortOrderForGroup.value[groupTitle] as 'asc' | 'desc',
      })
    }
  }
  
  // 如果有排序规则，更新 sortBy 和 sortOrder
  if (sortRules.length > 0) {
    // 使用第一个排序规则作为主要排序
    const primarySort = sortRules[0]
    if (primarySort) {
      emits('update:sortBy', primarySort.field)
      emits('update:sortOrder', primarySort.order)
      emits('sort-change', {
        sortBy: primarySort.field,
        sortOrder: primarySort.order,
        mode: sortMode.value,
      })
    }
  } else {
    emits('update:sortBy', null)
    emits('update:sortOrder', null)
  }
}

// 同梱相关函数
const isBundled = (row: RowData): boolean => {
  const sourceRawRows = (row as any).sourceRawRows
  return Array.isArray(sourceRawRows) && sourceRawRows.length > 1
}

const canBundle = (row: RowData): boolean => {
  // 优先使用 _bundleGroupSize（如果存在）
  const bundleGroupSize = (row as any)._bundleGroupSize
  if (typeof bundleGroupSize === 'number' && bundleGroupSize >= 2) {
    return true
  }

  // 如果没有 _bundleGroupSize，但有 bundleFilterKeys，则计算同梱可能性
  if (bundleFilterKeysProp.value && bundleFilterKeysProp.value.length > 0) {
    const keys = bundleFilterKeysProp.value
    // 计算当前行的同梱 key (use getNestedValue for nested paths like 'recipient.postalCode')
    const keyParts = keys.map((k) => getNestedValue(row as any, k) ?? '')
    const currentKey = JSON.stringify(keyParts)

    // 检查是否有其他行具有相同的 key
    let count = 0
    for (const otherRow of data.value) {
      const otherKeyParts = keys.map((k) => getNestedValue(otherRow as any, k) ?? '')
      const otherKey = JSON.stringify(otherKeyParts)
      if (otherKey === currentKey) {
        count++
        if (count >= 2) return true
      }
    }
  }

  return false
}

const shouldShowBundleTags = (row: RowData): boolean => {
  if (!showBundleTags.value) return false
  return isBundled(row) || canBundle(row)
}

// 状态标签相关函数
const shouldShowStatusTags = (row: RowData): boolean => {
  if (!showStatusTags.value) return false
  const status = (row as any)?.status || {}
  return !!(
    status.carrierReceipt?.isReceived ||
    status.confirm?.isConfirmed ||
    status.inspected?.isInspected ||
    status.printed?.isPrinted ||
    status.shipped?.isShipped ||
    status.ecExported?.isExported
  )
}

const getStatusTag = (row: RowData, type: 'carrierReceipt' | 'confirm' | 'inspected' | 'printed' | 'shipped' | 'ecExported'): string | null => {
  const status = (row as any)?.status || {}
  if (type === 'carrierReceipt' && status.carrierReceipt?.isReceived) {
    return '配送会社受付'
  }
  if (type === 'confirm' && status.confirm?.isConfirmed) {
    return '確認済み'
  }
  if (type === 'inspected' && status.inspected?.isInspected) {
    return '検品済み'
  }
  if (type === 'printed' && status.printed?.isPrinted) {
    return '印刷済み'
  }
  if (type === 'shipped' && status.shipped?.isShipped) {
    return '出荷済み'
  }
  if (type === 'ecExported' && status.ecExported?.isExported) {
    return 'EC連携済み'
  }
  return null
}

// 检查是否有操作列
const hasActionColumn = computed(() => {
  return columns.value?.some((col) => col.key === 'actions' || col.dataKey === 'actions')
})

// 获取操作列配置
const actionColumn = computed(() => {
  return columns.value?.find((col) => col.key === 'actions' || col.dataKey === 'actions')
})

// 检查是否有同梱列
const hasBundleColumn = computed(() => {
  return columns.value?.some((col) => col.key === '__bundle__' || col.dataKey === '__bundle__')
})

// 获取同梱列配置
const bundleColumn = computed(() => {
  return columns.value?.find((col) => col.key === '__bundle__' || col.dataKey === '__bundle__')
})

// 获取出荷情報字段的分组（用于多级表头）
const getShipmentFieldsByGroup = (fields: CategoryGroup['fields'], group: number): CategoryGroup['fields'] => {
  // group 1: 出荷管理No、お客様管理番号、伝票番号（最下面）
  // group 2: 配送会社、送り状種類、クール区分
  // group 3: 出荷予定日、お届け日指定、お届け時間帯、荷扱い
  
  const group1Keys = new Set(['orderNumber', 'customerManagementNumber', 'ecCompanyId', 'trackingId'])
  const group2Keys = new Set(['carrierId', 'invoiceType', 'coolType'])
  const group3Keys = new Set(['shipPlanDate', 'deliveryDatePreference', 'deliveryTimeSlot', 'handlingTags'])
  
  if (group === 1) {
    // 确保 trackingId 在最后
    const filtered = fields.filter(f => group1Keys.has(f.key))
    return filtered.sort((a, b) => {
      if (a.key === 'trackingId') return 1
      if (b.key === 'trackingId') return -1
      return 0
    })
  } else if (group === 2) {
    return fields.filter(f => group2Keys.has(f.key))
  } else if (group === 3) {
    return fields.filter(f => group3Keys.has(f.key))
  }
  return []
}

// 格式化日期时间为 YYYYMMDD HH:MM:SS 格式（如果只精确到日，则不显示时分秒）
const formatDateTime = (dateValue: any): string => {
  if (!dateValue) return '-'
  
  let date: Date
  if (typeof dateValue === 'string') {
    date = new Date(dateValue)
  } else if (dateValue instanceof Date) {
    date = dateValue
  } else {
    return String(dateValue)
  }
  
  if (isNaN(date.getTime())) {
    return String(dateValue)
  }
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  
  // 如果时分秒都是0，说明只精确到日，不显示时分秒
  if (hours === 0 && minutes === 0 && seconds === 0) {
    return `${year}${month}${day}`
  }
  
  // 否则显示完整的日期时间
  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(minutes).padStart(2, '0')
  const secondsStr = String(seconds).padStart(2, '0')
  
  return `${year}${month}${day} ${hoursStr}:${minutesStr}:${secondsStr}`
}

// 判断字段是否为时间字段
const isDateTimeField = (fieldKey: string): boolean => {
  const dateTimeKeys = new Set([
    'createdAt',
    'updatedAt',
    'statusPrinted',
    'statusCarrierReceipt',
    'statusPrintReady',
    'statusShipped',
    'statusConfirm',
    'statusCarrierReceiptIsReceived',
    'statusConfirmIsConfirmed',
    'statusPrintedIsPrinted',
    'statusShippedIsShipped',
  ])
  return dateTimeKeys.has(fieldKey) || fieldKey.includes('At') || fieldKey.includes('Date')
}

// 组合地址字段（用空格连接）
const combineAddressFields = (row: RowData, prefix: string): string => {
  const addressObj = (row as any)[prefix]
  const parts = [
    addressObj?.prefecture,
    addressObj?.city,
    addressObj?.street,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '-'
}

// 格式化字段值
const formatFieldValue = (row: RowData, field: CategoryGroup['fields'][0]): string => {
  // 如果是合并地址字段，组合拆分字段的值
  if (field.column?._isCombinedAddress && field.column?._addressPrefix) {
    return combineAddressFields(row, field.column._addressPrefix)
  }

  // 如果字段有 cellRenderer，优先使用 cellRenderer
  if (field.column?.cellRenderer && typeof field.column.cellRenderer === 'function') {
    try {
      const rendered = field.column.cellRenderer({ rowData: row })
      if (rendered !== undefined && rendered !== null) {
        return String(rendered)
      }
    } catch (e) {
      // 如果 cellRenderer 出错，继续使用默认格式化
      console.warn('cellRenderer error:', e)
    }
  }

  const value = getNestedValue(row as any, field.dataKey)
  if (value === undefined || value === null || value === '') {
    return '-'
  }

  // 如果是时间字段，格式化时间
  if (isDateTimeField(field.key)) {
    return formatDateTime(value)
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(String).join(', ') : '-'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

// 检查字段是否有错误
const hasFieldError = (row: RowData, field: CategoryGroup['fields'][0]): boolean => {
  // 如果是组合地址字段，检查对应的拆分字段是否为空（必填字段）
  if (field.column?._isCombinedAddress && field.column?._addressPrefix) {
    const prefix = field.column._addressPrefix as string
    // 注文者地址是可选的，不检查错误
    if (prefix === 'orderer') {
      return false
    }
    // recipient 和 sender 地址是必填的
    const addressObj = (row as any)[prefix]
    const prefecture = addressObj?.prefecture
    const city = addressObj?.city
    const street = addressObj?.street
    // 检查是否有任何拆分字段为空
    const isEmpty = (val: any) => val === undefined || val === null || val === '' || val === '-'
    if (isEmpty(prefecture) || isEmpty(city) || isEmpty(street)) {
      return true
    }
    return false
  }

  // 从 tableProps 中获取 cellProps 函数
  const cellProps = (rawTableProps.value as any)?.cellProps
  if (typeof cellProps === 'function') {
    try {
      const props = cellProps({ rowData: row, column: field.column })
      return props?.class === 'error-cell' || !!props?.style?.backgroundColor
    } catch (e) {
      // ignore
    }
  }
  return false
}

// 获取单元格类名
const getCellClassName = ({ row, column }: { row: RowData; column: any }) => {
  const cellProps = (rawTableProps.value as any)?.cellProps
  if (typeof cellProps === 'function') {
    try {
      const props = cellProps({ rowData: row, column })
      return props?.class || ''
    } catch (e) {
      // ignore
    }
  }
  return ''
}

// 获取行类名
const getRowClassName = ({ row }: { row: RowData }) => {
  if (props.rowClassName) {
    return props.rowClassName(row)
  }
  return ''
}

// 从操作列的 cellRenderer 中提取按钮的 onClick 处理函数
const getActionHandlers = (row: RowData) => {
  const col = actionColumn.value
  if (!col?.cellRenderer) {
    return { onEdit: null, onDelete: null }
  }

  // 尝试从 cellRenderer 中提取处理函数
  // 由于 cellRenderer 返回的是 VNode，我们需要通过其他方式获取
  // 这里我们通过分析 cellRenderer 的代码结构来提取
  // 实际上，更好的方式是让外部通过 props 传入处理函数
  // 暂时返回 null，由模板中的按钮直接调用 cellRenderer
  return { onEdit: null, onDelete: null }
}

// 处理编辑 - 通过渲染操作列的 cellRenderer 来获取按钮
const handleEdit = (row: RowData) => {
  // 这个方法不会被直接调用，因为按钮在模板中已经通过 cellRenderer 渲染
  // 如果需要，可以通过 emit 事件
}

// 处理删除
const handleDelete = (row: RowData) => {
  // 同上
}

// 批量编辑相关
const bulkEditVisible = ref(false)

const isEmptyForBulkEdit = (val: any): boolean => {
  if (val === undefined || val === null) return true
  if (typeof val === 'string') {
    const s = val.trim()
    return s === '' || s === '-'
  }
  if (Array.isArray(val)) return val.length === 0
  if (typeof val === 'number') return Number.isNaN(val)
  if (typeof val === 'object') return Object.keys(val).length === 0
  return false
}

const getColumnDataKey = (col: any): string | null => {
  const k = col?.dataKey ?? col?.key
  return typeof k === 'string' && k.trim() ? k : null
}

const canBulkEditColumn = (col: any): boolean => {
  if (!col) return false
  if (col.key === '__selection__' || col.key === 'selection') return false
  if (col.key === 'actions' || col.key === '__actions__') return false
  if (col.key === '__bundle__') return false
  if (col.bulkEditDisabled === true || col.disableBulkEdit === true) return false
  const dataKey = getColumnDataKey(col)
  if (!dataKey) return false
  const ft = col.fieldType
  if (ft === 'array') return false
  return true
}

const bulkEditableColumns = computed<any[]>(() => {
  if (!bulkEditEnabled.value) return []
  if (!rowSelectionEnabled.value) return []
  return (columns.value || []).filter((c: any) => canBulkEditColumn(c))
})

const showBulkEditButton = computed(() => {
  if (!paginationEnabled.value) return false
  if (!bulkEditEnabled.value) return false
  if (!rowSelectionEnabled.value) return false
  return bulkEditableColumns.value.length > 0
})

const applyBulkEdit = (payload: {
  columnKey: string
  dataKey: string
  fieldType?: string
  value: any
  overwrite: boolean
}) => {
  const { columnKey, dataKey, fieldType, value, overwrite } = payload
  if (!dataKey) return

  if (!rowSelectionEnabled.value) {
    ElMessage.warning('行選択が有効ではありません')
    return
  }

  if (!innerSelectedKeys.value.length) {
    ElMessage.warning('左側のチェックで編集対象の行を選択してください')
    return
  }

  const keyField = rowKey.value as string
  const keySet = new Set(innerSelectedKeys.value)
  const selectedRows = data.value.filter((row) => keySet.has((row as any)?.[keyField]))

  let changed = 0
  for (const row of selectedRows) {
    const current = getNestedValue(row as any, dataKey)
    if (!overwrite && !isEmptyForBulkEdit(current)) {
      continue
    }
    setNestedValue(row as any, dataKey, value)
    changed += 1
  }

  emits('bulk-edit', {
    columnKey,
    dataKey,
    fieldType,
    value,
    overwrite,
    selectedKeys: [...innerSelectedKeys.value],
    selectedRows,
  })

  ElMessage.success(`一括編集：${changed}件更新しました`)
}

const handleBatchDeleteClick = () => {
  if (!batchDeleteEnabled.value) return
  if (!rowSelectionEnabled.value) {
    ElMessage.warning('行選択が有効ではありません')
    return
  }
  if (!innerSelectedKeys.value.length) {
    ElMessage.warning('削除する行を選択してください')
    return
  }

  const keySet = new Set(innerSelectedKeys.value)
  const selectedRows = data.value.filter((row) => keySet.has((row as any)?.[rowKey.value as string]))
  
  emits('batch-delete', {
    selectedKeys: [...innerSelectedKeys.value],
    selectedRows,
  })
}

// 分页相关
const totalItems = computed(() => {
  if (!paginationEnabled.value) {
    return filteredData.value.length
  }
  // 服务器端分页：必须使用 props.total，如果没有传递则使用 0 或 data.length 作为后备
  if (paginationMode.value === 'server') {
    // 服务器端分页时，total 应该由外部提供
    // 如果没有提供，可能是数据还没加载，使用 0 或者 data.length
    return props.total !== undefined ? props.total : (data.value.length || 0)
  }
  // 客户端分页：使用实际数据长度
  return filteredData.value.length
})

// 前端排序函数
const sortData = (dataToSort: RowData[]): RowData[] => {
  if (!sortEnabled.value || !sortBy.value || !sortOrder.value) {
    return dataToSort
  }

  if (sortMode.value === 'server') {
    return dataToSort
  }

  const sorted = [...dataToSort]
  const sortField = sortBy.value

  sorted.sort((a, b) => {
    // Use getNestedValue to support nested keys like 'recipient.postalCode'
    const aValue = getNestedValue(a as any, sortField)
    const bValue = getNestedValue(b as any, sortField)

    const column = columns.value.find((col: any) => {
      const colDataKey = col.dataKey ?? col.key
      return colDataKey === sortField
    })

    if (column?.sortMethod) {
      const result = column.sortMethod(aValue, bValue)
      return sortOrder.value === 'asc' ? result : -result
    }

    if (aValue === null || aValue === undefined) {
      return sortOrder.value === 'asc' ? -1 : 1
    }
    if (bValue === null || bValue === undefined) {
      return sortOrder.value === 'asc' ? 1 : -1
    }

    if (aValue === '' || aValue === '-') {
      return sortOrder.value === 'asc' ? -1 : 1
    }
    if (bValue === '' || bValue === '-') {
      return sortOrder.value === 'asc' ? 1 : -1
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder.value === 'asc' ? aValue - bValue : bValue - aValue
    }

    if (column?.fieldType === 'date' || (typeof aValue === 'string' && !isNaN(Date.parse(aValue)))) {
      const aDate = new Date(aValue).getTime()
      const bDate = new Date(bValue).getTime()
      if (!isNaN(aDate) && !isNaN(bDate)) {
        return sortOrder.value === 'asc' ? aDate - bDate : bDate - aDate
      }
    }

    if (sortField === 'orderNumber') {
      const result = naturalSort(aValue, bValue)
      return sortOrder.value === 'asc' ? result : -result
    }

    const aStr = String(aValue).toLowerCase()
    const bStr = String(bValue).toLowerCase()
    if (aStr < bStr) {
      return sortOrder.value === 'asc' ? -1 : 1
    }
    if (aStr > bStr) {
      return sortOrder.value === 'asc' ? 1 : -1
    }
    return 0
  })

  return sorted
}

const normalizedGlobalSearchText = computed(() => String(props.globalSearchText || '').trim().toLowerCase())

const rowMatchesGlobalSearch = (row: RowData, queryLower: string): boolean => {
  if (!queryLower) return true
  try {
    // Search through all visible fields (derived from `columns` via `categoryGroups`)
    const allFields = categoryGroups.value.flatMap((g) => g.fields)
    for (const field of allFields) {
      const text = formatFieldValue(row, field)
      if (text && text !== '-' && String(text).toLowerCase().includes(queryLower)) return true
    }

    // Also check product metadata fields (even if tableVisible: false)
    const productMeta = row._productsMeta as { names?: string[]; skus?: string[]; barcodes?: string[] } | undefined
    if (productMeta) {
      // Check product names
      if (productMeta.names?.some((n) => n.toLowerCase().includes(queryLower))) return true
      // Check product SKUs
      if (productMeta.skus?.some((s) => s.toLowerCase().includes(queryLower))) return true
      // Check product barcodes
      if (productMeta.barcodes?.some((b) => b.toLowerCase().includes(queryLower))) return true
    }
  } catch (e) {
    // fallback: do not filter out on error
    return true
  }
  return false
}

const filteredData = computed(() => {
  const q = normalizedGlobalSearchText.value
  if (!q) return data.value
  return data.value.filter((row) => rowMatchesGlobalSearch(row, q))
})

const displayData = computed(() => {
  let result = filteredData.value

  if (sortEnabled.value && sortMode.value === 'client') {
    result = sortData(result)
  }

  if (!paginationEnabled.value) {
    return result
  }

  if (paginationMode.value === 'server') {
    return result
  }

  const start = (innerCurrentPage.value - 1) * innerPageSize.value
  return result.slice(start, start + innerPageSize.value)
})

// 移除固定高度，让表格根据内容自动调整

const tableContainerRef = ref<HTMLElement | null>(null)
const tableRef = ref<InstanceType<typeof ElTable> | null>(null)

// 防止循环触发的标志
const isUpdatingSelection = ref(false)

// 跟踪上一次的数据 ID 列表（用于检测数据变化）
const lastDataIds = ref<Set<RowKey>>(new Set())

// 数据变化保护标志 - 当数据正在变化时，忽略 el-table 触发的 selection-change 事件
const isDataChanging = ref(false)

// 同步当前页的选中状态（当页面切换或数据变化时）
watch(
  [displayData, innerSelectedKeys],
  () => {
    if (!rowSelectionEnabled.value || !tableRef.value) return
    if (isUpdatingSelection.value) return // 防止循环触发

    const keyField = rowKey.value as string
    const selectedKeySet = new Set(innerSelectedKeys.value)

    isUpdatingSelection.value = true
    // 同时设置数据变化标志，防止 selection-change 事件干扰
    isDataChanging.value = true

    // 不使用 clearSelection()，而是精确设置每行的选中状态
    // 这样可以避免触发不必要的 selection-change 事件
    nextTick(() => {
      if (!tableRef.value) {
        isUpdatingSelection.value = false
        isDataChanging.value = false
        return
      }

      // 遍历当前页的所有行，设置正确的选中状态
      for (const row of displayData.value) {
        const key = (row as any)?.[keyField]
        if (key !== undefined && key !== null) {
          const shouldBeSelected = selectedKeySet.has(key)
          tableRef.value.toggleRowSelection(row, shouldBeSelected)
        }
      }

      // 延迟重置标志，确保所有 selection-change 事件都被忽略
      setTimeout(() => {
        isUpdatingSelection.value = false
        isDataChanging.value = false
      }, 100)
    })
  },
  { immediate: true, flush: 'post' },
)

// 监听 data 变化，当数据完全重新加载时（例如 loadOrders），需要恢复选中状态
// 这个 watch 需要在 handleSelectionChange 之前处理，防止数据变化导致的选中状态被误清除
watch(
  () => data.value,
  (newData, oldData) => {
    if (!rowSelectionEnabled.value) return

    // 设置数据变化保护标志，防止 el-table 的 selection-change 事件清除选中状态
    isDataChanging.value = true

    // 更新数据 ID 集合
    const keyField = rowKey.value as string
    const newIds = new Set(
      newData.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null)
    )

    // 如果是数据刷新（数据长度相近或有重叠），保持选中状态
    // 只清除不再存在的选中项
    if (innerSelectedKeys.value.length > 0) {
      const validKeys = innerSelectedKeys.value.filter(key => newIds.has(key))
      if (validKeys.length !== innerSelectedKeys.value.length) {
        // 只保留仍然存在于新数据中的选中项
        innerSelectedKeys.value = validKeys
        emits('update:selectedKeys', validKeys)
      }
    }

    lastDataIds.value = newIds

    // 延迟重置数据变化保护标志，确保 el-table 的 selection-change 事件被忽略
    nextTick(() => {
      setTimeout(() => {
        isDataChanging.value = false
      }, 100)
    })
  },
  { deep: false }
)

const handlePageChange = (page: number) => {
  // 设置数据变化保护标志，防止翻页时 el-table 的 selection-change 事件清除选中状态
  isDataChanging.value = true
  innerCurrentPage.value = page
  emits('update:currentPage', page)
  emits('page-change', { page, pageSize: innerPageSize.value, mode: paginationMode.value })
  // 翻页后的选中状态恢复由 displayData watch 处理
}

const handlePageSizeChange = (size: number) => {
  // 设置数据变化保护标志，防止改变页大小时 el-table 的 selection-change 事件清除选中状态
  isDataChanging.value = true
  innerPageSize.value = size
  innerCurrentPage.value = 1
  emits('update:pageSize', size)
  emits('update:currentPage', 1)
  emits('page-change', { page: 1, pageSize: size, mode: paginationMode.value })
  // 翻页后的选中状态恢复由 displayData watch 处理
}

watch(
  () => props.pageSize,
  (val) => {
    if (typeof val === 'number' && val > 0 && val !== innerPageSize.value) {
      innerPageSize.value = val
    }
  },
)

watch(
  () => props.currentPage,
  (val) => {
    if (typeof val === 'number' && val > 0 && val !== innerCurrentPage.value) {
      innerCurrentPage.value = val
    }
  },
)

watch(
  [totalItems, innerPageSize],
  () => {
    if (!paginationEnabled.value) return
    const maxPage = Math.max(1, Math.ceil(totalItems.value / innerPageSize.value))
    if (innerCurrentPage.value > maxPage) {
      handlePageChange(maxPage)
    }
  },
  { immediate: true },
)

// 处理行选择变化（支持跨页选择）
const handleSelectionChange = (selection: RowData[]) => {
  // 如果正在更新选中状态，忽略此次变化（防止循环触发）
  if (isUpdatingSelection.value) return

  // 如果数据正在变化（例如编辑行、加载数据），忽略此次变化
  // 这是为了防止 el-table 在数据变化时触发的空选择事件清除用户的选中状态
  if (isDataChanging.value) return

  const keyField = rowKey.value as string

  // 获取当前页的所有行的 key
  const currentPageKeys = new Set(
    displayData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null)
  )

  // 获取当前页被选中的行的 key
  const selectedKeysInCurrentPage = new Set(
    selection.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null)
  )

  // 判断是否是全选操作（当前页所有行都被选中）
  const isSelectAllCurrentPage = currentPageKeys.size > 0 &&
    currentPageKeys.size === selectedKeysInCurrentPage.size &&
    Array.from(currentPageKeys).every(key => selectedKeysInCurrentPage.has(key))

  // 判断是否是取消全选操作（当前页所有行都被取消选中）
  const isDeselectAllCurrentPage = currentPageKeys.size > 0 &&
    selectedKeysInCurrentPage.size === 0
  
  // 判断之前是否已经全选了所有数据（使用 filteredData 而不是 data，以便在有过滤时只选择显示的数据）
  const allDataKeys = new Set(
    filteredData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null)
  )
  const wasAllSelected = allDataKeys.size > 0 &&
    allDataKeys.size === innerSelectedKeys.value.length &&
    Array.from(allDataKeys).every(key => innerSelectedKeys.value.includes(key))
  
  let finalKeys: Array<RowKey>
  
  // 如果是全选操作，且之前没有全选所有数据，则选择所有数据
  if (isSelectAllCurrentPage && !wasAllSelected && paginationEnabled.value && paginationMode.value === 'client') {
    // 选择所有数据
    finalKeys = Array.from(allDataKeys)
  } 
  // 如果是取消全选操作，且之前已经全选了所有数据，则取消所有页的选择
  else if (isDeselectAllCurrentPage && wasAllSelected && paginationEnabled.value && paginationMode.value === 'client') {
    // 取消全选：清空所有选择
    finalKeys = []
  }
  // 如果当前页全选，且之前已经全选了所有数据，则取消全选（只取消当前页）
  else if (isSelectAllCurrentPage && wasAllSelected) {
    // 取消全选：移除当前页的所有 key
    const newSelectedKeys = new Set(innerSelectedKeys.value)
    for (const key of currentPageKeys) {
      newSelectedKeys.delete(key)
    }
    finalKeys = Array.from(newSelectedKeys)
  }
  // 否则，正常处理当前页的选择变化
  else {
    // 合并全局选择状态：
    // 1. 移除当前页的所有 key（无论之前是否选中）
    // 2. 添加当前页新选中的 key
    const newSelectedKeys = new Set(innerSelectedKeys.value)
    
    // 移除当前页的所有 key
    for (const key of currentPageKeys) {
      newSelectedKeys.delete(key)
    }
    
    // 添加当前页新选中的 key
    for (const key of selectedKeysInCurrentPage) {
      newSelectedKeys.add(key)
    }
    
    finalKeys = Array.from(newSelectedKeys)
  }
  
  innerSelectedKeys.value = finalKeys
  
  // 获取所有选中的行数据（包括不在当前页的，但限于过滤后的数据）
  const keySet = new Set(finalKeys)
  const allSelectedRows = filteredData.value.filter((row) => keySet.has((row as any)?.[keyField]))
  
  emits('update:selectedKeys', finalKeys)
  emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows, isSelectAllTriggered: isSelectAllCurrentPage })
}

// 合并 tableProps（排除 cellProps，因为已经在 getCellClassName 中处理）
const tableProps = computed(() => {
  const { cellProps, ...rest } = rawTableProps.value ?? {}
  return {
    ...rest,
    onSelectionChange: handleSelectionChange,
  }
})

// 暴露方法和状态给父组件
defineExpose({
  // 打开一括修正对话框
  openBulkEdit: () => {
    if (!showBulkEditButton.value) {
      ElMessage.warning('一括修正は利用できません')
      return
    }
    bulkEditVisible.value = true
  },
  // 触发一括删除
  triggerBatchDelete: handleBatchDeleteClick,
  // 当前选中的行 keys
  selectedKeys: innerSelectedKeys,
  // 是否显示一括修正按钮
  showBulkEditButton,
  // 是否启用一括删除
  batchDeleteEnabled,
  // 可一括编辑的列
  bulkEditableColumns,
})
</script>

<style scoped>
.nex-table {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.nex-table__wrapper {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: visible;
}

/* 确保表格不产生滚动条，根据内容自动调整高度 */
:deep(.el-table) {
  overflow: visible !important;
}

:deep(.el-table__body-wrapper) {
  overflow: visible !important;
  max-height: none !important;
}

:deep(.el-table__inner-wrapper) {
  overflow: visible !important;
}

.nex-table__pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.nex-table__pagination--with-left {
  justify-content: space-between;
}

.nex-table__pagination-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 表头样式：使用 LINK_COLOR，13px */
:deep(.el-table__header) {
  font-size: 13px;
}

:deep(.el-table__header th) {
  background-color: transparent;
  color: v-bind('LINK_COLOR');
  font-size: 13px;
  font-weight: normal;
  vertical-align: top;
  text-align: left;
  padding: 10px;
}

/* 隐藏空白表头单元格（子列的空表头） */
/* 隐藏出荷情報子列的表头单元格 - 通过查找包含隐藏 span 的表头单元格 */
:deep(.el-table__header th:has(span[style*="display: none"])) {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
  border: none !important;
  min-width: 0 !important;
  max-width: 0 !important;
  visibility: hidden !important;
  height: 0 !important;
  line-height: 0 !important;
  overflow: hidden !important;
}

/* 如果 :has() 不支持，使用备用方案：隐藏空的表头单元格 */
:deep(.el-table__header th .cell:empty),
:deep(.el-table__header th .cell:has(span[style*="display: none"])) {
  display: none !important;
}

/* 对于多级表头的第二行（子表头行），隐藏空白单元格 */
:deep(.el-table__header tr:last-child th:has(.cell:empty)),
:deep(.el-table__header tr:last-child th:has(span[style*="display: none"])) {
  display: none !important;
  width: 0 !important;
  padding: 0 !important;
  border: none !important;
}

/* 表格内容：12px */
:deep(.el-table__body) {
  font-size: 12px;
}

:deep(.el-table__body td) {
  font-size: 12px;

  vertical-align: top;
}

/* 分类单元格样式 */
.category-cell {
  flex-direction: column;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
}

.category-field {
  gap: 8px;
  line-height: 1.5;
}

.category-field.field-error {
  background-color: #ffebee;
}

.field-label {
  font-weight: 500;
  color: #606266;
  flex-shrink: 0;
  min-width: 80px;
}

.field-value {
  color: #303133;
  word-break: break-word;
  flex: 1;
}

.category-field.field-error .field-value {
  color: #f56c6c;
}

/* 状态标签容器 */
.status-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

/* 同梱 tag 容器 */
.bundle-tags {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
}

/* 分类表头样式 */
.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.category-header-title {
  flex: 1;
}

.sort-button {
  padding: 0;
  min-height: auto;
  margin-left: 8px;
  color: #00798F;
}

.sort-popover-content {
  padding: 4px 0;
}

.sort-order-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.clear-sort-button {
  color: v-bind('LINK_COLOR');
  border-color: v-bind('LINK_COLOR');
}

.clear-sort-button:hover {
  color: v-bind('LINK_COLOR');
  border-color: v-bind('LINK_COLOR');
  background-color: rgba(0, 121, 143, 0.1);
}

.sort-info {
  font-size: 12px;
  color: #000000;
  text-align: left;
}

/* 商品单元格样式 - 与其他列保持一致 */
.product-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  box-sizing: border-box;
}

.product-item {
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #ebeef5;
}

.product-quantity-tag {
  position: absolute;
  right: 0;
  bottom: 4px;
}

.product-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.product-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  object-position: center;
  border-radius: 4px;
  flex-shrink: 0;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.product-empty {
  color: #909399;
  font-size: 12px;
}

.product-field {
  gap: 8px;
  line-height: 1.2;
  font-size: 12px;
}

.product-total {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid #dcdfe6;
  font-size: 13px;
  font-weight: 600;
}

.product-total-label {
  color: #606266;
}

.product-total-value {
  color: #409eff;
}

.product-label {
  font-weight: 500;
  color: #606266;
  flex-shrink: 0;
  min-width: 80px;
}

.product-value {
  color: #303133;
  word-break: break-word;
  flex: 1;
}


/* 错误单元格样式 */
:deep(.error-cell) {
  background-color: #ffebee !important;
}

/* 表格边框 */
:deep(.el-table) {
  border: 1px solid #ebeef5;
}

:deep(.el-table th),
:deep(.el-table td) {
  border-right: 1px solid #ebeef5;
}

:deep(.el-table th:last-child),
:deep(.el-table td:last-child) {
  border-right: none;
}

/* 操作列包装器 */
.action-cell-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

/* 强制 ElSpace 垂直排列 */
.action-cell-wrapper :deep(.el-space) {
  display: flex;
  flex-direction: column !important;
  align-items: center;
  gap: 12px;
}

/* 操作按钮容器 */
.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 8px;
  padding: 4px;
}

/* 操作列按钮样式 */
.action-cell-wrapper .el-button,
.action-buttons .el-button {
  margin: 0;
  min-width: 54px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  border-width: 1px;
}

/* 操作列按钮 - 描边颜色与文字颜色一致 */
.action-cell-wrapper .el-button--primary.is-plain,
.action-buttons .el-button--primary.is-plain {
  border-color: var(--el-color-primary);
}

.action-cell-wrapper .el-button--danger.is-plain,
.action-buttons .el-button--danger.is-plain {
  border-color: var(--el-color-danger);
}

.action-cell-wrapper :deep(.el-space .el-button) {
  margin: 2px;
  min-width: 54px;
  border-width: 1px;
}

.action-cell-wrapper :deep(.el-space .el-button--primary.is-plain) {
  border-color: var(--el-color-primary);
}

.action-cell-wrapper :deep(.el-space .el-button--danger.is-plain) {
  border-color: var(--el-color-danger);
}

/* 操作列单元格样式 */
:deep(.el-table__body td:has(.action-buttons)),
:deep(.el-table__body td:has(.action-cell-wrapper)) {
  vertical-align: top;
}

/* 选择列样式 */
:deep(.selection-column) {
  text-align: center;
}

:deep(.selection-column .cell) {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 10px 0;
}

:deep(.selection-column th),
:deep(.selection-column td) {
  text-align: center;
  vertical-align: top;
  padding: 10px 0;
}

:deep(.selection-column .el-checkbox) {
  margin: 0;
}

/* 滚动条样式 - 一直显示水平滚动条 */
:deep(.el-scrollbar__bar.is-horizontal) {
  opacity: 1 !important;
  height: 8px;
}

:deep(.el-scrollbar__thumb) {
  background-color: rgba(144, 147, 153, 0.5);
}

:deep(.el-scrollbar__thumb:hover) {
  background-color: rgba(144, 147, 153, 0.7);
}

:deep(.el-table__body-wrapper) {
  overflow-x: auto !important;
}

:deep(.el-table__body-wrapper .el-scrollbar__bar.is-horizontal) {
  opacity: 1 !important;
  display: block !important;
}
</style>
