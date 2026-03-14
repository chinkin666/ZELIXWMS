<template>
  <div ref="tableContainerRef" class="nex-table" @click="handleTableClick">
    <div class="nex-table__wrapper">
      <table class="o-list-table">
        <thead>
          <tr>
            <!-- Selection column header -->
            <th
              v-if="rowSelectionEnabled"
              class="selection-column"
              style="width: 40px; text-align: center;"
            >
              <input
                type="checkbox"
                :checked="isAllCurrentPageSelected"
                :indeterminate="isIndeterminate"
                @change="handleSelectAllToggle"
              />
            </th>

            <!-- Bundle column header -->
            <th
              v-if="hasBundleColumn"
              :style="{ width: (bundleColumn?.width || 110) + 'px', textAlign: 'center' }"
            >
              {{ bundleColumn?.title || '同梱' }}
            </th>

            <!-- Category group headers -->
            <th
              v-for="(group, groupIndex) in categoryGroups"
              :key="`category-header-${groupIndex}`"
              :style="{
                minWidth: (group.title === '商品情報' ? 340 : (group.title === '出荷情報' ? 640 : (group.minWidth || 200))) + 'px',
              }"
            >
              <div class="category-header">
                <span class="category-header-title">{{ group.title }}</span>
                <div class="sort-dropdown-wrapper">
                  <button
                    class="sort-button"
                    title="並べ替え"
                    @click.stop="toggleSortPopover(group.title)"
                  >
                    <span v-if="getSortOrderForGroup(group.title) === 'asc'">&#9650;</span>
                    <span v-else-if="getSortOrderForGroup(group.title) === 'desc'">&#9660;</span>
                    <span v-else>&#9650;</span>
                  </button>
                  <div
                    v-if="sortPopoverVisible[group.title]"
                    class="sort-dropdown"
                    @click.stop
                  >
                    <div class="sort-order-buttons">
                      <button
                        :class="['o-btn', 'o-btn-sm', getSortOrderForGroup(group.title) === 'asc' ? 'o-btn-primary' : 'o-btn-secondary']"
                        @click="setSortOrderForGroup(group.title, 'asc')"
                      >
                        &#9650; 昇順
                      </button>
                      <button
                        :class="['o-btn', 'o-btn-sm', getSortOrderForGroup(group.title) === 'desc' ? 'o-btn-primary' : 'o-btn-secondary']"
                        @click="setSortOrderForGroup(group.title, 'desc')"
                      >
                        &#9660; 降順
                      </button>
                    </div>
                    <select
                      class="o-input sort-field-select"
                      :value="sortFieldForGroup[group.title] || ''"
                      @change="handleSortFieldSelectChange(group.title, $event)"
                    >
                      <option value="" disabled>並べ替え列を選択</option>
                      <option
                        v-for="field in group.fields"
                        :key="field.key"
                        :value="field.dataKey"
                      >
                        {{ field.label }}
                      </option>
                    </select>
                    <button
                      v-if="getSortInfoForGroup(group.title)"
                      class="o-btn o-btn-sm clear-sort-button"
                      style="width: 100%; margin-top: 8px;"
                      @click="clearSortForGroup(group.title)"
                    >
                      クリア
                    </button>
                  </div>
                </div>
              </div>
              <div v-if="getSortInfoForGroup(group.title)" class="sort-info">
                並べ替え: {{ getSortInfoForGroup(group.title) }}
              </div>
            </th>

            <!-- Action column header -->
            <th
              v-if="hasActionColumn"
              style="width: 120px; text-align: center;"
            >
              {{ t('wms.common.actions', '操作') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in displayData"
            :key="String((row as any)[rowKey as string] ?? (row as any).id ?? rowIndex)"
            :class="getRowClassName({ row })"
          >
            <!-- Selection column -->
            <td
              v-if="rowSelectionEnabled"
              class="selection-column"
              style="text-align: center; vertical-align: top;"
            >
              <input
                type="checkbox"
                :checked="isRowSelected(row)"
                @change="handleRowCheckboxChange(row, $event)"
              />
            </td>

            <!-- Bundle column -->
            <td
              v-if="hasBundleColumn"
              style="text-align: center; vertical-align: top;"
            >
              <BundleCell
                v-if="bundleColumn?.cellRenderer"
                :renderer="bundleColumn.cellRenderer"
                :row-data="row"
              />
              <span v-else>-</span>
            </td>

            <!-- Category group cells -->
            <td
              v-for="(group, groupIndex) in categoryGroups"
              :key="`category-cell-${groupIndex}`"
              style="vertical-align: top;"
            >
              <!-- 出荷情報: special 3-sub-column layout -->
              <template v-if="group.title === '出荷情報'">
                <div class="shipment-cell-layout">
                  <!-- Sub-column 1: orderNumber, customerManagementNumber, ecCompanyId, trackingId -->
                  <div class="shipment-sub-col">
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
                      <!-- 同梱相関 tag -->
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
                      <!-- 状態標籤 -->
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
                  </div>
                  <!-- Sub-column 2: carrierId, invoiceType, coolType -->
                  <div class="shipment-sub-col">
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
                  </div>
                  <!-- Sub-column 3: shipPlanDate, deliveryDatePreference, deliveryTimeSlot, handlingTags -->
                  <div class="shipment-sub-col">
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
                  </div>
                </div>
              </template>

              <!-- 商品情報: product display -->
              <template v-else-if="group.title === '商品情報'">
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

              <!-- Other categories: normal display -->
              <template v-else>
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
            </td>

            <!-- Action column -->
            <td
              v-if="hasActionColumn"
              style="text-align: center; vertical-align: top;"
            >
              <ActionCell
                v-if="actionColumn?.cellRenderer"
                :renderer="actionColumn.cellRenderer"
                :row-data="row"
              />
              <div v-else class="action-buttons">
                <OButton variant="primary" size="sm" @click="handleEdit(row)">編集</OButton>
                <OButton variant="danger" size="sm" @click="handleDelete(row)">削除</OButton>
              </div>
            </td>
          </tr>
          <tr v-if="displayData.length === 0">
            <td
              :colspan="totalColumnCount"
              style="text-align: center; padding: 2rem; color: var(--o-gray-400, #c0c4cc);"
            >
              <div style="display:flex;flex-direction:column;align-items:center;gap:8px;font-size:13px;">
                <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.3">
                  <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM9.5 3A1.5 1.5 0 0 1 8 1.5V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2.5z"/>
                </svg>
                <span>データがありません</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="paginationEnabled"
      class="nex-table__pagination"
    >
      <OPager
        :total="totalItems"
        :offset="pagerOffset"
        :limit="innerPageSize"
        @update:offset="handlePagerOffsetChange"
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
import { computed, h, ref, toRefs, watch, onMounted, defineComponent, nextTick } from 'vue'
import type { HeaderGroupingConfig } from './tableHeaderGroup'
import { getNestedValue, setNestedValue } from '@/utils/nestedObject'
import { naturalSort } from '@/utils/naturalSort'
import { mergeBarcodesWithSku } from '@/utils/barcode'
import BulkEditDialog from './BulkEditDialog.vue'
import OPager from '@/components/odoo/OPager.vue'
import OButton from '@/components/odoo/OButton.vue'
import { LINK_COLOR } from '@/theme/config'
import { useI18n } from '@/composables/useI18n'
import type { Product } from '@/types/product'
import InfoTag from './InfoTag.vue'
import noImageSrc from '@/assets/images/no_image.png'
import { resolveImageUrl } from '@/utils/imageUrl'

const resolveProductImageUrl = (url?: string): string => resolveImageUrl(url)

const { t } = useI18n()

// 操作列渲染組件
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
        return h('div', { class: 'action-cell-wrapper' }, [result])
      } catch (e) {
        console.error('Error rendering action cell:', e)
        return null
      }
    }
  },
})

// 同梱列渲染組件
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
    // 行選択
    rowSelectionEnabled?: boolean
    selectedKeys?: Array<RowKey>
    // 表頭分組相関
    headerGroupingEnabled?: boolean
    headerGroupingConfig?: HeaderGroupingConfig
    // 排序相関
    sortEnabled?: boolean
    sortMode?: SortMode
    sortBy?: string | null
    sortOrder?: SortOrder
    // 表頭批量編集（統一編集）
    bulkEditEnabled?: boolean
    // 批量削除
    batchDeleteEnabled?: boolean
    // 商品情報（用于显示検品コード等）
    products?: Product[] | Map<string, Product>
    // 是否显示同梱相関 tag（仅用于 /shipment-orders/create 页面）
    showBundleTags?: boolean
    // 是否显示状態標籤（用于 /shipment-orders/history 页面）
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
  columns,
  data,
  paginationEnabled,
  paginationMode,
  rowSelectionEnabled,
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

// 行選択内部状態
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

// Row selection helpers
const isRowSelected = (row: RowData): boolean => {
  const keyField = rowKey.value as string
  const key = (row as any)?.[keyField]
  return key !== undefined && key !== null && innerSelectedKeys.value.includes(key)
}

const isAllCurrentPageSelected = computed(() => {
  if (displayData.value.length === 0) return false
  const keyField = rowKey.value as string
  return displayData.value.every((row) => {
    const key = (row as any)?.[keyField]
    return key !== undefined && key !== null && innerSelectedKeys.value.includes(key)
  })
})

const isIndeterminate = computed(() => {
  if (displayData.value.length === 0) return false
  const keyField = rowKey.value as string
  const selectedCount = displayData.value.filter((row) => {
    const key = (row as any)?.[keyField]
    return key !== undefined && key !== null && innerSelectedKeys.value.includes(key)
  }).length
  return selectedCount > 0 && selectedCount < displayData.value.length
})

const handleSelectAllToggle = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  const keyField = rowKey.value as string

  if (checked) {
    // Select all - when client pagination, select ALL filtered data rows (cross-page)
    if (paginationEnabled.value && paginationMode.value === 'client') {
      const allDataKeys = new Set(
        filteredData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
      )
      const finalKeys = Array.from(allDataKeys)
      innerSelectedKeys.value = finalKeys
      const allSelectedRows = filteredData.value.filter((row) => allDataKeys.has((row as any)?.[keyField]))
      emits('update:selectedKeys', finalKeys)
      emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows, isSelectAllTriggered: true })
    } else {
      const currentPageKeys = displayData.value
        .map((row) => (row as any)?.[keyField])
        .filter((k: any) => k !== undefined && k !== null)
      const newKeys = new Set([...innerSelectedKeys.value, ...currentPageKeys])
      const finalKeys = Array.from(newKeys)
      innerSelectedKeys.value = finalKeys
      const keySet = new Set(finalKeys)
      const allSelectedRows = filteredData.value.filter((row) => keySet.has((row as any)?.[keyField]))
      emits('update:selectedKeys', finalKeys)
      emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows, isSelectAllTriggered: true })
    }
  } else {
    // Deselect
    const allDataKeys = new Set(
      filteredData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
    )
    const wasAllSelected =
      allDataKeys.size > 0 &&
      allDataKeys.size === innerSelectedKeys.value.length &&
      Array.from(allDataKeys).every((key) => innerSelectedKeys.value.includes(key))

    if (wasAllSelected && paginationEnabled.value && paginationMode.value === 'client') {
      innerSelectedKeys.value = []
      emits('update:selectedKeys', [])
      emits('selection-change', { selectedKeys: [], selectedRows: [], isSelectAllTriggered: false })
    } else {
      const currentPageKeys = new Set(
        displayData.value.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null),
      )
      const finalKeys = innerSelectedKeys.value.filter((key) => !currentPageKeys.has(key))
      innerSelectedKeys.value = finalKeys
      const keySet = new Set(finalKeys)
      const allSelectedRows = filteredData.value.filter((row) => keySet.has((row as any)?.[keyField]))
      emits('update:selectedKeys', finalKeys)
      emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows, isSelectAllTriggered: false })
    }
  }
}

const handleRowCheckboxChange = (row: RowData, event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  const keyField = rowKey.value as string
  const key = (row as any)?.[keyField]
  if (key === undefined || key === null) return

  let finalKeys: Array<RowKey>
  if (checked) {
    finalKeys = [...innerSelectedKeys.value, key]
  } else {
    finalKeys = innerSelectedKeys.value.filter((k) => k !== key)
  }
  innerSelectedKeys.value = finalKeys

  const keySet = new Set(finalKeys)
  const allSelectedRows = filteredData.value.filter((r) => keySet.has((r as any)?.[keyField]))
  emits('update:selectedKeys', finalKeys)
  emits('selection-change', { selectedKeys: finalKeys, selectedRows: allSelectedRows })
}

// Total column count for empty-row colspan
const totalColumnCount = computed(() => {
  let count = categoryGroups.value.length
  if (rowSelectionEnabled.value) count++
  if (hasBundleColumn.value) count++
  if (hasActionColumn.value) count++
  return count
})

// 根据字段 key 判断所属分類
const getFieldCategory = (key: string): string | null => {
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

  const productKeys = new Set(['products'])

  const recipientKeys = new Set([
    'recipient.postalCode',
    'recipient.prefecture',
    'recipient.city',
    'recipient.street',
    'recipientAddress',
    'recipient.name',
    'recipient.phone',
    'honorific',
  ])

  const senderKeys = new Set([
    'sender.postalCode',
    'sender.prefecture',
    'sender.city',
    'sender.street',
    'senderAddress',
    'sender.name',
    'sender.phone',
  ])

  const ordererKeys = new Set([
    'orderer.postalCode',
    'orderer.prefecture',
    'orderer.city',
    'orderer.street',
    'ordererAddress',
    'orderer.name',
    'orderer.phone',
  ])

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
  if (recipientKeys.has(key)) return 'お届け先情報'
  if (senderKeys.has(key)) return 'ご依頼主情報'
  if (ordererKeys.has(key)) return '注文者情報'
  if (otherKeys.has(key)) return 'その他'

  if (key.startsWith('status')) return 'その他'

  return null
}

// 地址拆分字段
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

// 地址合併字段映射
const addressCombinedFieldMap: Record<string, { key: string; label: string }> = {
  'recipient': { key: 'recipientAddress', label: 'お届け先住所' },
  'sender': { key: 'senderAddress', label: 'ご依頼主住所' },
  'orderer': { key: 'ordererAddress', label: '注文者住所' },
}

// 不在表格中显示的字段
const excludedFields = new Set([
  'carrierData.yamato.hatsuBaseNo1',
  'carrierData.yamato.hatsuBaseNo2',
])

// 从 columns 直接构建分類組
const categoryGroups = computed<CategoryGroup[]>(() => {
  if (!columns.value) {
    return []
  }

  const cols = columns.value || []

  const categoryMap = new Map<string, CategoryGroup['fields']>()
  const addedAddressFields = new Set<string>()

  for (const col of cols) {
    const key = col.key || col.dataKey
    if (!key || key === 'actions' || key === '__selection__' || key === '__bundle__') {
      continue
    }

    if (excludedFields.has(String(key))) {
      continue
    }

    const keyStr = String(key)

    if (addressSplitFields.has(keyStr)) {
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
                _isCombinedAddress: true,
                _addressPrefix: prefix,
              },
            })
          }
        }
      }
      continue
    }

    if (keyStr === 'recipientAddress' || keyStr === 'senderAddress' || keyStr === 'ordererAddress') {
      continue
    }

    const category = getFieldCategory(keyStr)
    if (!category) {
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

  const categoryOrder = ['出荷情報', '商品情報', 'お届け先情報', 'ご依頼主情報', 'その他']
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

// 构建商品情報 Map
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

// 获取商品图片URL
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
  const totalPrice = (row as any)?._productsMeta?.totalPrice
  if (typeof totalPrice === 'number' && totalPrice > 0) {
    return totalPrice
  }
  const products = getOrderProducts(row)
  if (!products || products.length === 0) return null
  const sum = products.reduce((acc: number, p: any) => acc + (p.subtotal || 0), 0)
  return sum > 0 ? sum : null
}

// クール区分相関函数
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
  if (label === '通常') return 40
  if (label === '冷蔵') return 40
  if (label === '冷凍') return 40
  return 50
}

const getCoolTypeColor = (row: RowData, field: CategoryGroup['fields'][0]): { bg: string; border: string; text: string } => {
  const value = getCoolTypeValue(row, field)
  if (!value) {
    return { bg: '#f5f5f5', border: '#cecece', text: '#909399' }
  }

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

// 排序相関状態
const sortPopoverVisible = ref<Record<string, boolean>>({})
const sortFieldForGroup = ref<Record<string, string>>({})
const sortOrderForGroup = ref<Record<string, 'asc' | 'desc' | null>>({})

// 获取排序配置的 localStorage key
const getSortConfigKey = (): string => {
  const pageKey = pageKeyProp.value
  return pageKey ? `order-table-sort-${pageKey}` : 'order-table-sort-default'
}

// 从 localStorage 加載排序配置
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

// 監聴排序配置変化并保存
watch(
  [sortFieldForGroup, sortOrderForGroup],
  () => {
    saveSortConfig()
  },
  { deep: true }
)

// 組件挂載時加載排序配置
onMounted(() => {
  loadSortConfig()
})

// 切换排序弹窗
const toggleSortPopover = (groupTitle: string) => {
  for (const [title, visible] of Object.entries(sortPopoverVisible.value)) {
    if (title !== groupTitle && visible) {
      sortPopoverVisible.value[title] = false
    }
  }
  sortPopoverVisible.value[groupTitle] = !sortPopoverVisible.value[groupTitle]
}

// 点击表格外部時関閉所有弹窗
const handleTableClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (
    target.closest('.sort-dropdown') ||
    target.closest('.sort-button') ||
    target.closest('.sort-dropdown-wrapper')
  ) {
    return
  }
  for (const title in sortPopoverVisible.value) {
    sortPopoverVisible.value[title] = false
  }
}

// 获取排序图标 - no longer returns component, handled in template with unicode
// 设置排序顺序
const setSortOrderForGroup = (groupTitle: string, order: 'asc' | 'desc') => {
  sortOrderForGroup.value[groupTitle] = order
  applySorting()
}

// 处理排序字段変化
const handleSortFieldChange = (groupTitle: string) => {
  for (const [title, field] of Object.entries(sortFieldForGroup.value)) {
    if (title !== groupTitle && field) {
      sortFieldForGroup.value[title] = ''
      sortOrderForGroup.value[title] = null
    }
  }
  applySorting()
  nextTick(() => {
    sortPopoverVisible.value[groupTitle] = true
  })
}

// Handle native select change for sort field
const handleSortFieldSelectChange = (groupTitle: string, event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  sortFieldForGroup.value[groupTitle] = value
  handleSortFieldChange(groupTitle)
}

// 清除排序规则
const clearSortForGroup = (groupTitle: string) => {
  sortFieldForGroup.value[groupTitle] = ''
  sortOrderForGroup.value[groupTitle] = null
  applySorting()
  sortPopoverVisible.value[groupTitle] = false
}

// 获取分類的排序顺序
const getSortOrderForGroup = (groupTitle: string): 'asc' | 'desc' | null => {
  return sortOrderForGroup.value[groupTitle] || null
}

// 获取分類的排序情報（用于显示）
const getSortInfoForGroup = (groupTitle: string): string => {
  const field = sortFieldForGroup.value[groupTitle]
  const order = sortOrderForGroup.value[groupTitle]
  if (!field || !order) return ''

  const group = categoryGroups.value.find(g => g.title === groupTitle)
  if (!group) return ''
  const fieldInfo = group.fields.find(f => f.dataKey === field)
  if (!fieldInfo) return ''

  const orderSymbol = order === 'asc' ? '↑' : '↓'
  return `${fieldInfo.label} ${orderSymbol}`
}

// 応用排序
const applySorting = () => {
  const sortRules: Array<{ field: string; order: 'asc' | 'desc' }> = []
  for (const [groupTitle, field] of Object.entries(sortFieldForGroup.value)) {
    if (field && sortOrderForGroup.value[groupTitle]) {
      sortRules.push({
        field,
        order: sortOrderForGroup.value[groupTitle] as 'asc' | 'desc',
      })
    }
  }

  if (sortRules.length > 0) {
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

// 同梱相関函数
const isBundled = (row: RowData): boolean => {
  const sourceRawRows = (row as any).sourceRawRows
  return Array.isArray(sourceRawRows) && sourceRawRows.length > 1
}

const canBundle = (row: RowData): boolean => {
  const bundleGroupSize = (row as any)._bundleGroupSize
  if (typeof bundleGroupSize === 'number' && bundleGroupSize >= 2) {
    return true
  }

  if (bundleFilterKeysProp.value && bundleFilterKeysProp.value.length > 0) {
    const keys = bundleFilterKeysProp.value
    const keyParts = keys.map((k) => getNestedValue(row as any, k) ?? '')
    const currentKey = JSON.stringify(keyParts)

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

// 状態標籤相関函数
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
    return '配送業者受付'
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

// 获取出荷情報字段的分組（用于多级表頭）
const getShipmentFieldsByGroup = (fields: CategoryGroup['fields'], group: number): CategoryGroup['fields'] => {
  const group1Keys = new Set(['orderNumber', 'customerManagementNumber', 'ecCompanyId', 'trackingId'])
  const group2Keys = new Set(['carrierId', 'invoiceType', 'coolType'])
  const group3Keys = new Set(['shipPlanDate', 'deliveryDatePreference', 'deliveryTimeSlot', 'handlingTags'])

  if (group === 1) {
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

// 格式化日期時間
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

  if (hours === 0 && minutes === 0 && seconds === 0) {
    return `${year}${month}${day}`
  }

  const hoursStr = String(hours).padStart(2, '0')
  const minutesStr = String(minutes).padStart(2, '0')
  const secondsStr = String(seconds).padStart(2, '0')

  return `${year}${month}${day} ${hoursStr}:${minutesStr}:${secondsStr}`
}

// 判断字段是否為時間字段
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

// 組合地址字段
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
  if (field.column?._isCombinedAddress && field.column?._addressPrefix) {
    return combineAddressFields(row, field.column._addressPrefix)
  }

  if (field.column?.cellRenderer && typeof field.column.cellRenderer === 'function') {
    try {
      const rendered = field.column.cellRenderer({ rowData: row })
      if (rendered !== undefined && rendered !== null) {
        return String(rendered)
      }
    } catch (e) {
      console.warn('cellRenderer error:', e)
    }
  }

  const value = getNestedValue(row as any, field.dataKey)
  if (value === undefined || value === null || value === '') {
    return '-'
  }

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
  if (field.column?._isCombinedAddress && field.column?._addressPrefix) {
    const prefix = field.column._addressPrefix as string
    if (prefix === 'orderer') {
      return false
    }
    const addressObj = (row as any)[prefix]
    const prefecture = addressObj?.prefecture
    const city = addressObj?.city
    const street = addressObj?.street
    const isEmpty = (val: any) => val === undefined || val === null || val === '' || val === '-'
    if (isEmpty(prefecture) || isEmpty(city) || isEmpty(street)) {
      return true
    }
    return false
  }

  const cellProps = (rawTableProps.value as any)?.cellProps
  if (typeof cellProps === 'function') {
    try {
      const props = cellProps({ rowData: row, column: field.column })
      return props?.class === 'error-cell' || !!props?.style?.backgroundColor
    } catch (_e) {
      // ignore
    }
  }
  return false
}


// 获取行類名
const getRowClassName = ({ row }: { row: RowData }) => {
  if (props.rowClassName) {
    return props.rowClassName(row)
  }
  return ''
}

// 处理編集
const handleEdit = (_row: RowData) => {
  // placeholder - handled by cellRenderer
}

// 处理削除
const handleDelete = (_row: RowData) => {
  // placeholder - handled by cellRenderer
}

// 批量編集相関
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
    console.warn('行選択が有効ではありません')
    return
  }

  if (!innerSelectedKeys.value.length) {
    console.warn('左側のチェックで編集対象の行を選択してください')
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
}

const handleBatchDeleteClick = () => {
  if (!batchDeleteEnabled.value) return
  if (!rowSelectionEnabled.value) {
    console.warn('行選択が有効ではありません')
    return
  }
  if (!innerSelectedKeys.value.length) {
    console.warn('削除する行を選択してください')
    return
  }

  const keySet = new Set(innerSelectedKeys.value)
  const selectedRows = data.value.filter((row) => keySet.has((row as any)?.[rowKey.value as string]))

  emits('batch-delete', {
    selectedKeys: [...innerSelectedKeys.value],
    selectedRows,
  })
}

// 分頁相関
const totalItems = computed(() => {
  if (!paginationEnabled.value) {
    return filteredData.value.length
  }
  if (paginationMode.value === 'server') {
    return props.total !== undefined ? props.total : (data.value.length || 0)
  }
  return filteredData.value.length
})

// OPager offset (0-based)
const pagerOffset = computed(() => (innerCurrentPage.value - 1) * innerPageSize.value)

const handlePagerOffsetChange = (newOffset: number) => {
  const newPage = Math.floor(newOffset / innerPageSize.value) + 1
  handlePageChange(newPage)
}

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
    const allFields = categoryGroups.value.flatMap((g) => g.fields)
    for (const field of allFields) {
      const text = formatFieldValue(row, field)
      if (text && text !== '-' && String(text).toLowerCase().includes(queryLower)) return true
    }

    const productMeta = row._productsMeta as { names?: string[]; skus?: string[]; barcodes?: string[] } | undefined
    if (productMeta) {
      if (productMeta.names?.some((n) => n.toLowerCase().includes(queryLower))) return true
      if (productMeta.skus?.some((s) => s.toLowerCase().includes(queryLower))) return true
      if (productMeta.barcodes?.some((b) => b.toLowerCase().includes(queryLower))) return true
    }
  } catch (_e) {
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

const tableContainerRef = ref<HTMLElement | null>(null)

// 監聴 data 変化，当数据完全重新加載時，需要恢复選中状態
watch(
  () => data.value,
  (newData, _oldData) => {
    if (!rowSelectionEnabled.value) return

    const keyField = rowKey.value as string
    const newIds = new Set(
      newData.map((row) => (row as any)?.[keyField]).filter((k: any) => k !== undefined && k !== null)
    )

    if (innerSelectedKeys.value.length > 0) {
      const validKeys = innerSelectedKeys.value.filter(key => newIds.has(key))
      if (validKeys.length !== innerSelectedKeys.value.length) {
        innerSelectedKeys.value = validKeys
        emits('update:selectedKeys', validKeys)
      }
    }
  },
  { deep: false }
)

const handlePageChange = (page: number) => {
  innerCurrentPage.value = page
  emits('update:currentPage', page)
  emits('page-change', { page, pageSize: innerPageSize.value, mode: paginationMode.value })
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

// 暴露方法和状態给父組件
defineExpose({
  openBulkEdit: () => {
    if (!showBulkEditButton.value) {
      console.warn('一括修正は利用できません')
      return
    }
    bulkEditVisible.value = true
  },
  triggerBatchDelete: handleBatchDeleteClick,
  selectedKeys: innerSelectedKeys,
  showBulkEditButton,
  batchDeleteEnabled,
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
  overflow: auto;
  border: 1px solid var(--o-border-color, #d6d6d6);
  background: var(--o-view-background, #fff);
}

/* .o-list-table base styles are defined globally in style.css */

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

/* Selection column */
.selection-column {
  width: 40px;
}

.selection-column input[type="checkbox"] {
  cursor: pointer;
}

/* 分類单元格様式 */
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

/* 状態標籤容器 */
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

/* 分類表頭様式 */
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
  padding: 2px 6px;
  min-height: auto;
  margin-left: 8px;
  color: #00798F;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
}

.sort-button:hover {
  color: #005a6b;
}

.sort-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.sort-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
}

.sort-order-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.sort-field-select {
  width: 100%;
  margin-top: 8px;
  font-size: 13px;
  padding: 4px 8px;
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

/* Shipment 3-column layout within a single td */
.shipment-cell-layout {
  display: flex;
  gap: 0;
  width: 100%;
}

.shipment-sub-col {
  flex: 1;
  min-width: 0;
  padding: 0 8px;
  border-right: 1px solid #ebeef5;
}

.shipment-sub-col:first-child {
  padding-left: 0;
}

.shipment-sub-col:last-child {
  border-right: none;
  padding-right: 0;
}

/* 商品单元格様式 */
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

/* 错误单元格様式 */
.error-cell {
  background-color: #ffebee !important;
}

/* 操作列包装器 */
.action-cell-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
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

/* Button styles */
.o-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  background: #fff;
  color: #303133;
  white-space: nowrap;
  transition: background-color 0.2s, border-color 0.2s;
}

.o-btn:hover {
  background-color: #f5f7fa;
}

.o-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.o-btn-primary {
  background-color: #00798F;
  border-color: #00798F;
  color: #fff;
}

.o-btn-primary:hover {
  background-color: #006577;
}

.o-btn-danger {
  background-color: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}

.o-btn-danger:hover {
  background-color: #e04848;
}

.o-btn-secondary {
  background-color: #fff;
  border-color: #dee2e6;
  color: #303133;
}

.o-btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}

.o-input {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.o-input:focus {
  border-color: #00798F;
}
</style>
