<template>
    <section class="search-form">
        <div class="search-bar">
            <!-- 上半部分：过滤器分类选项 -->
            <div class="filter-categories-row">
                <span class="filter-categories-label">フィルター</span>
                <div class="filter-categories-list">
                    <template v-for="(fields, categoryKey) in fieldsByCategory" :key="categoryKey">
                        <template v-if="fields.length > 0">
                            <el-popover 
                                v-model:visible="categoryPopovers[categoryKey]"
                                placement="bottom-start"
                                trigger="click"
                                :width="540"
                                :teleported="false"
                                :close-on-click-outside="true"
                            >
                    <template #reference>
                                    <div class="filter-category-header">
                                        <span class="filter-category-name">{{ categoryLabels[categoryKey as keyof typeof categoryLabels] }}</span>
                                        <el-icon class="filter-category-icon">
                                            <ArrowDown />
                            </el-icon>
                        </div>
                                </template>
                                <div class="filter-category-menu-content">
                                    <div class="filter-category-items">
                                        <div 
                                            v-for="field in fields" 
                                            :key="field.key" 
                                            class="filter-category-item"
                                    :class="{ active: selectedField?.key === field.key }"
                                            @click="selectField(field, categoryKey)"
                                        >
                                    {{ field.label }}
                                </div>
                                </div>
                                    <div class="filter-editor" v-if="selectedField && getFieldCategory(selectedField.key) === categoryKey">
                                <div class="filter-editor-label">{{ selectedField?.label }}</div>
                                <div class="filter-editor-content">
                                    <!-- 非日期类型的操作符选择器（boolean は値選択のみ表示する） -->
                                    <div class="filter-operator-selector"
                                        v-if="selectedField?.type !== 'date' && selectedField?.type !== 'daterange' && selectedField?.type !== 'boolean'">
                                        <el-select v-model="editingFilter.operator" style="width: 100%"
                                            :popper-append-to-body="false" :teleported="false"
                                            @change="handleOperatorChange" @click.stop @mousedown.stop>
                                            <el-option v-for="op in getOperatorOptions(selectedField?.type || 'string')"
                                                :key="op.value" :label="op.label" :value="op.value" />
                                        </el-select>
                                    </div>

                                    <!-- 字符串 -->
                                    <template v-if="selectedField?.type === 'string'">
                                        <el-input v-model="editingFilter.value" @input="updateEditingFilter"
                                            :disabled="isValueDisabled(editingFilter.operator)" />
                                    </template>

                                    <!-- 数字 -->
                                    <template v-else-if="selectedField?.type === 'number'">
                                        <template v-if="isBetweenOperatorValue(editingFilter.operator)">
                                            <div class="number-range-input">
                                                <el-input-number v-model="editingFilter.value[0]"
                                                    :min="selectedField?.min" :max="selectedField?.max"
                                                    :precision="selectedField?.precision || 0" style="width: 48%"
                                                    @input="updateEditingFilter" />
                                                <span class="range-separator">-</span>
                                                <el-input-number v-model="editingFilter.value[1]"
                                                    :min="selectedField?.min" :max="selectedField?.max"
                                                    :precision="selectedField?.precision || 0" style="width: 48%"
                                                    @input="updateEditingFilter" />
                                            </div>
                                        </template>
                                        <el-input-number v-else v-model="editingFilter.value"
                                            :min="selectedField?.min" :max="selectedField?.max"
                                            :precision="selectedField?.precision || 0" style="width: 100%"
                                            @input="updateEditingFilter"
                                            :disabled="isValueDisabled(editingFilter.operator)" />
                                    </template>

                                    <!-- 选择器 -->
                                    <template v-else-if="selectedField?.type === 'select'">
                                        <el-select v-model="editingFilter.value" style="width: 100%"
                                            :popper-append-to-body="false" :teleported="false"
                                            @change="updateEditingFilter" @click.stop @mousedown.stop
                                            :disabled="isValueDisabled(editingFilter.operator)">
                                            <el-option v-for="option in selectedField?.options || []"
                                                :key="String(option.value)" :label="option.label"
                                                :value="option.value" />
                                        </el-select>
                                    </template>

                                    <!-- 日期（支持相对日期） -->
                                    <template v-else-if="selectedField?.type === 'date'">
                                        <div class="filter-operator-selector">
                                            <el-select v-model="editingFilter.operator" style="width: 100%"
                                                :popper-append-to-body="false" :teleported="false"
                                                @change="onDateOperatorChange" @click.stop @mousedown.stop>
                                                <el-option-group label="相対日付">
                                                    <el-option v-for="op in relativeDateOperators" :key="op.value"
                                                        :label="op.label" :value="op.value" />
                                                </el-option-group>
                                                <el-option-group label="固定日付/範囲">
                                                    <el-option v-for="op in absoluteDateOperators" :key="op.value"
                                                        :label="op.label" :value="op.value" />
                                                </el-option-group>
                                            </el-select>
                                        </div>
                                        <div v-if="isRelativeDateOperator(editingFilter.operator)"
                                            class="relative-date-display">
                                            {{ getRelativeDateDisplay(editingFilter.operator) }}
                                        </div>
                                        <template v-else>
                                            <el-date-picker v-if="isBetweenOperatorValue(editingFilter.operator)"
                                                v-model="editingFilter.value" type="daterange"
                                                :format="selectedField?.dateFormat || 'YYYY/MM/DD'"
                                                :value-format="selectedField?.dateFormat || 'YYYY/MM/DD'" range-separator="-"
                                                style="width: 100%" :teleported="false"
                                                @change="updateEditingFilter" @click.stop @mousedown.stop />
                                            <el-date-picker v-else v-model="editingFilter.value" type="date"
                                                :format="selectedField?.dateFormat || 'YYYY/MM/DD'"
                                                :value-format="selectedField?.dateFormat || 'YYYY/MM/DD'" style="width: 100%" :teleported="false"
                                                @change="updateEditingFilter" @click.stop @mousedown.stop />
                                        </template>
                                    </template>

                                    <!-- 日期范围 -->
                                    <template v-else-if="selectedField?.type === 'daterange'">
                                        <el-date-picker v-model="editingFilter.value" type="daterange"
                                            :format="selectedField?.dateFormat || 'YYYY/MM/DD'"
                                            :value-format="selectedField?.dateFormat || 'YYYY/MM/DD'" range-separator="-"
                                            style="width: 100%" :teleported="false"
                                            @change="updateEditingFilter" @click.stop @mousedown.stop />
                                    </template>

                                    <!-- 布尔 -->
                                    <template v-else-if="selectedField?.type === 'boolean'">
                                        <el-select v-model="editingFilter.value" style="width: 100%"
                                            :popper-append-to-body="false" :teleported="false"
                                            @change="onBooleanValueChange" @click.stop @mousedown.stop>
                                            <el-option label="はい" :value="true" />
                                            <el-option label="いいえ" :value="false" />
                                        </el-select>
                                    </template>
                                </div>
                                <div class="filter-editor-actions">
                                    <el-button @click.stop="cancelAddFilter">キャンセル</el-button>
                                    <el-button type="primary" @click.stop="applyFilter">適用</el-button>
                            </div>
                        </div>
                    </div>
                </el-popover>
                            <div class="filter-category-divider" v-if="hasFieldsAfter(categoryKey)"></div>
                        </template>
                    </template>
            </div>
            </div>
            
            <!-- 下半部分：已选择的过滤器卡片 -->
            <div class="selected-filters-row">
                <span class="selected-filters-label">選択したフィルター</span>
                <div class="selected-filters-list">
                    <div v-for="filter in activeFilters" :key="filter.id" class="filter-card">
                        <span class="filter-category-tag">{{ getCategoryLabelForFilter(filter.fieldKey) }}</span>
                        <span class="filter-text" v-html="formatFilterDisplay(filter)"></span>
                        <el-button text type="primary" class="filter-remove" @click="removeFilter(filter.id)">
                            <el-icon>
                                <Close />
                            </el-icon>
                        </el-button>
                    </div>
                    <div class="filter-actions-right">
                        <el-button text type="primary" class="clear-filters-link" v-if="activeFilters.length > 0" @click="handleClear">
                            絞り込みを解除する
                        </el-button>
                        <el-button v-if="showSave" class="save-filter-button" @click="handleSave">保存</el-button>
                    </div>
                </div>
            </div>
            
            <!-- 検索グループ -->
            <div class="saved-section-row">
                <span class="saved-section-label">検索グループ</span>
                <div class="saved-cards-list">
                    <div v-for="item in savedSearches" :key="item.id" class="saved-card saved-card-item"
                        @click="applySavedSearch(item)">
                        <span class="saved-card-name">{{ item.name }}</span>
                        <el-button text class="saved-card-remove" @click.stop="confirmDeleteSaved(item.id)">
                            <el-icon>
                                <Close />
                            </el-icon>
                        </el-button>
                    </div>
                </div>
            </div>
            
            <!-- 操作按钮 -->
            <div v-if="showGlobalSearch" class="search-actions">
                <div class="quick-search">
                    <el-input
                        v-model="globalSearchText"
                        class="quick-search-input"
                        placeholder="全体検索"
                        clearable
                        @keyup.enter="handleSearch"
                        @clear="handleSearch"
                    />
                    <el-button type="primary" class="quick-search-button" @click="handleSearch">検索</el-button>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Plus, Close, ArrowDown } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { LINK_COLOR, PRIMARY_COLOR } from '@/theme/config'
import type {
    TableColumn,
    FilterItem,
    SearchOption,
    SearchType,
    Operator,
    DateOperator,
} from '@/types/table'

const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
}

const getStartOfWeek = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
}

const getEndOfWeek = (date: Date): Date => {
    const start = getStartOfWeek(date)
    return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
}

const getStartOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
}

const getEndOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

const relativeDateOperators: Array<{ label: string; value: DateOperator }> = [
    { label: '今日', value: 'today' },
    { label: '昨日', value: 'yesterday' },
    { label: '今週', value: 'thisWeek' },
    { label: '今月', value: 'thisMonth' },
    { label: '過去7日間', value: 'last7Days' },
    { label: '過去30日間', value: 'last30Days' },
    { label: '今後7日間', value: 'next7Days' },
    { label: '今後30日間', value: 'next30Days' },
]

const absoluteDateOperators: Array<{ label: string; value: DateOperator }> = [
    { label: '等しい', value: 'equals' },
    { label: '等しくない', value: 'notEquals' },
    { label: '以前', value: 'before' },
    { label: '以降', value: 'after' },
    { label: '範囲', value: 'between' },
]

const stringOperators: Array<{ label: string; value: Operator }> = [
    { label: '等しい', value: 'is' },
    { label: '等しくない', value: 'isNot' },
    { label: '含む', value: 'contains' },
    { label: '含まない', value: 'notContains' },
    { label: '値あり', value: 'hasAnyValue' },
    { label: '空', value: 'isEmpty' },
]

const numberOperators: Array<{ label: string; value: Operator }> = [
    { label: '等しい', value: 'equals' },
    { label: '等しくない', value: 'notEquals' },
    { label: 'より小さい', value: 'lessThan' },
    { label: '以下', value: 'lessThanOrEqual' },
    { label: 'より大きい', value: 'greaterThan' },
    { label: '以上', value: 'greaterThanOrEqual' },
    { label: '範囲', value: 'between' },
    { label: '値あり', value: 'hasAnyValue' },
]

const selectOperators: Array<{ label: string; value: Operator }> = [
    { label: '等しい', value: 'is' },
    { label: '等しくない', value: 'isNot' },
    { label: '値あり', value: 'hasAnyValue' },
]

const booleanOperators: Array<{ label: string; value: Operator }> = [
    { label: '等しい', value: 'is' },
    { label: '等しくない', value: 'isNot' },
]

const noValueOperators: Operator[] = ['hasAnyValue', 'isEmpty']
const isBetweenOperatorValue = (operator?: Operator) => operator === 'between'
const dateOperatorValues = [
    ...relativeDateOperators.map((op) => op.value),
    ...absoluteDateOperators.map((op) => op.value),
] as DateOperator[]
const dateOperatorSet = new Set(dateOperatorValues)

interface AvailableField {
    key: string
    label: string
    type: SearchType
    options?: SearchOption[]
    dateFormat?: string
    min?: number
    max?: number
    precision?: number
    column?: TableColumn
}

const props = withDefaults(
    defineProps<{
        columns: TableColumn[]
        showSave?: boolean
        initialValues?: Record<string, any>
        // 用于区分不同页面的搜索框，保存到本地存储时作为命名空间
        storageKey?: string
        // 是否显示全局搜索（纯客户端搜索，仅适用于前端分页）
        showGlobalSearch?: boolean
    }>(),
    {
        showSave: true,
        initialValues: () => ({}),
        storageKey: 'search_form_default',
        showGlobalSearch: true,
    },
)

const emits = defineEmits<{
    (e: 'search', payload: Record<string, { operator: Operator; value: any }>): void
    (e: 'save', payload: Record<string, { operator: Operator; value: any }>): void
}>()

const activeFilters = ref<FilterItem[]>([])
const globalSearchText = ref<string>('')
const selectedField = ref<AvailableField | null>(null)
const editingFilter = ref<{ value: any; operator: Operator | undefined }>({ value: null, operator: undefined })
const categoryPopovers = ref<Record<string, boolean>>({
    shipping: false,
    product: false,
    recipient: false,
    sender: false,
    orderer: false,
    other: false
})
const linkColor = LINK_COLOR
const primaryColor = PRIMARY_COLOR

// 保存的搜索记录
interface SavedFilter {
    fieldKey: string
    operator: Operator
    value: any
}

interface SavedSearch {
    id: string
    name: string
    filters: SavedFilter[]
}

const savedSearches = ref<SavedSearch[]>([])
const storageNamespace = computed(() => `searchForm:${props.storageKey}`)
const activeFiltersStorageKey = computed(() => `searchForm:${props.storageKey}:activeFilters`)

const persistSavedSearches = () => {
    if (typeof window === 'undefined') return
    localStorage.setItem(storageNamespace.value, JSON.stringify(savedSearches.value))
}

const loadSavedSearches = () => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(storageNamespace.value)
    if (!raw) return
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
            savedSearches.value = parsed
        }
    } catch (e) {
        console.error('Failed to parse saved searches', e)
    }
}

// 保存当前激活的过滤器到 localStorage
const persistActiveFilters = () => {
    if (typeof window === 'undefined') return
    try {
        // 只保存必要的字段，避免保存 column 引用等复杂对象
        const filtersToSave = activeFilters.value.map((f) => ({
            id: f.id,
            fieldKey: f.fieldKey,
            fieldLabel: f.fieldLabel,
            type: f.type,
            value: f.value,
            operator: f.operator,
        }))
        localStorage.setItem(activeFiltersStorageKey.value, JSON.stringify(filtersToSave))
    } catch (e) {
        console.error('Failed to persist active filters', e)
    }
}

// 从 localStorage 恢复当前激活的过滤器
const loadActiveFilters = () => {
    if (typeof window === 'undefined') return
    const raw = localStorage.getItem(activeFiltersStorageKey.value)
    if (!raw) return
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
            // 将保存的过滤器转换为 FilterItem，需要找到对应的 field 和 column
            const filters: FilterItem[] = []
            parsed.forEach((savedFilter) => {
                const field = availableFields.value.find((f) => f.key === savedFilter.fieldKey)
                if (!field) return // 如果字段不存在，跳过这个过滤器
                
                filters.push({
                    id: savedFilter.id || `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    fieldKey: savedFilter.fieldKey,
                    fieldLabel: savedFilter.fieldLabel || field.label,
                    type: savedFilter.type || field.type,
                    value: savedFilter.value,
                    operator: savedFilter.operator,
                    column: field.column,
                })
            })
            activeFilters.value = filters
            // 恢复后触发搜索，以便应用这些过滤器
            if (filters.length > 0) {
                emits('search', buildPayload())
            }
        }
    } catch (e) {
        console.error('Failed to parse active filters', e)
    }
}

// 根据 fieldType 推断 searchType
const inferSearchType = (col: TableColumn): SearchType | null => {
    // 如果已经设置了 searchType，直接使用
    if (col.searchType) {
        return col.searchType
    }
    
    // 根据 fieldType 推断
    if (col.fieldType === 'string') {
        return 'string'
    } else if (col.fieldType === 'number') {
        return 'number'
    } else if (col.fieldType === 'boolean') {
        return 'boolean'
    } else if (col.fieldType === 'date' || col.fieldType === 'dateOnly') {
        return 'date'
    }
    
    // 如果有 searchOptions，推断为 select
    if (col.searchOptions && col.searchOptions.length > 0) {
        return 'select'
    }
    
    return null
}

// 字段分类函数 - 按照order.ts中的分类
const getFieldCategory = (fieldKey: string): string => {
    // 出荷情報
    const shippingKeys = [
        'orderNumber', 'customerManagementNumber', 'carrierId', 'invoiceType', 'coolType',
        'shipPlanDate', 'deliveryDatePreference', 'deliveryTimeSlot', 'handlingTags'
    ]
    // 商品
    const productKeys = [
        '_productsMeta.totalQuantity', '_productsMeta.skuCount', '_productsMeta.names', '_productsMeta.skus', '_productsMeta.barcodes'
    ]
    // 送付先情報
    const recipientKeys = [
        'recipient.postalCode', 'recipient.prefecture', 'recipient.city', 'recipient.street', 'recipient.name', 'recipient.phone', 'honorific'
    ]
    // ご依頼主情報
    const senderKeys = [
        'sender.postalCode', 'sender.prefecture', 'sender.city', 'sender.street', 'sender.name', 'sender.phone', 'carrierData.yamato.hatsuBaseNo1', 'carrierData.yamato.hatsuBaseNo2'
    ]
    // 注文者情報
    const ordererKeys = [
        'orderer.postalCode', 'orderer.prefecture', 'orderer.city', 'orderer.street', 'orderer.name', 'orderer.phone'
    ]
    
    if (shippingKeys.includes(fieldKey)) return 'shipping'
    if (productKeys.includes(fieldKey)) return 'product'
    if (recipientKeys.includes(fieldKey)) return 'recipient'
    if (senderKeys.includes(fieldKey)) return 'sender'
    if (ordererKeys.includes(fieldKey)) return 'orderer'
    return 'other'
}

const categoryLabels = {
    shipping: '出荷情報',
    product: '商品',
    recipient: '送付先情報',
    sender: 'ご依頼主情報',
    orderer: '注文者情報',
    other: 'その他'
}

const availableFields = computed<AvailableField[]>(() => {
    return props.columns
        .filter((col) => {
            // 必须有搜索类型或者可以搜索
            // 注意：tableVisible: false 的字段仍然可以用于搜索（例如商品相关的细分字段）
            const inferredType = inferSearchType(col)
            return col.searchType || col.searchable === true || inferredType
        })
        .map((col) => {
            // 推断搜索类型
            const inferredType = inferSearchType(col)
            
                const type = col.searchType || inferredType || 'string'
                const field: AvailableField = {
                    key: col.key,
                    label: col.title,
                    type,
                    column: col,
                }

                if (type === 'select' && col.searchOptions) {
                    field.options = col.searchOptions
                }

                if (type === 'date' || type === 'daterange') {
                    field.dateFormat = col.dateFormat || 'YYYY-MM-DD'
                }

                if (type === 'number') {
                    if (col.min !== undefined) field.min = col.min
                    if (col.max !== undefined) field.max = col.max
                    field.precision = 0
                }

                return field
        })
})

// 按分类分组的字段
const fieldsByCategory = computed(() => {
    const categories: Record<string, AvailableField[]> = {
        shipping: [],
        product: [],
        recipient: [],
        sender: [],
        orderer: [],
        other: []
    }
    
    remainingFields.value.forEach(field => {
        const category = getFieldCategory(field.key)
        if (categories[category]) {
        categories[category].push(field)
        }
    })
    
    return categories
})

const remainingFields = computed(() => {
    const usedKeys = new Set(activeFilters.value.map((f) => f.fieldKey))
    return availableFields.value.filter((field) => !usedKeys.has(field.key))
})

// 检查某个分类之后是否还有其他分类有字段
const hasFieldsAfter = (categoryKey: string): boolean => {
    const categoryOrder = ['shipping', 'product', 'recipient', 'sender', 'orderer', 'other']
    const currentIndex = categoryOrder.indexOf(categoryKey)
    if (currentIndex === -1 || currentIndex === categoryOrder.length - 1) return false
    
    for (let i = currentIndex + 1; i < categoryOrder.length; i++) {
        const cat = categoryOrder[i]
        if (!cat) continue
        const fields = fieldsByCategory.value[cat]
        if (fields && fields.length > 0) {
            return true
        }
    }
    return false
}

// 获取过滤器的分类标签
const getCategoryLabelForFilter = (fieldKey: string): string => {
    const category = getFieldCategory(fieldKey)
    return categoryLabels[category as keyof typeof categoryLabels] + ':'
}

const isRelativeDateOperator = (operator?: Operator): operator is DateOperator => {
    if (!operator) return false
    return relativeDateOperators.some((op) => op.value === (operator as DateOperator))
}

const getRelativeDateDisplay = (operator?: Operator): string => {
    if (!operator) return ''
    const today = new Date()
    switch (operator) {
        case 'today':
            return `今日 (${formatDate(today)})`
        case 'yesterday': {
            const y = new Date(today)
            y.setDate(y.getDate() - 1)
            return `昨日 (${formatDate(y)})`
        }
        case 'thisWeek': {
            const start = getStartOfWeek(today)
            const end = getEndOfWeek(today)
            return `今週 (${formatDate(start)} - ${formatDate(end)})`
        }
        case 'thisMonth': {
            const start = getStartOfMonth(today)
            const end = getEndOfMonth(today)
            return `今月 (${formatDate(start)} - ${formatDate(end)})`
        }
        case 'last7Days': {
            const start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return `過去7日間 (${formatDate(start)} - ${formatDate(today)})`
        }
        case 'last30Days': {
            const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            return `過去30日間 (${formatDate(start)} - ${formatDate(today)})`
        }
        case 'next7Days': {
            const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
            return `今後7日間 (${formatDate(today)} - ${formatDate(end)})`
        }
        case 'next30Days': {
            const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
            return `今後30日間 (${formatDate(today)} - ${formatDate(end)})`
        }
        default:
            return ''
    }
}

const computeRelativeDateValue = (operator: DateOperator): string | [string, string] => {
    const today = new Date()
    switch (operator) {
        case 'today':
            return formatDate(today)
        case 'yesterday': {
            const y = new Date(today)
            y.setDate(y.getDate() - 1)
            return formatDate(y)
        }
        case 'thisWeek': {
            const start = getStartOfWeek(today)
            const end = getEndOfWeek(today)
            return [formatDate(start), formatDate(end)]
        }
        case 'thisMonth': {
            const start = getStartOfMonth(today)
            const end = getEndOfMonth(today)
            return [formatDate(start), formatDate(end)]
        }
        case 'last7Days': {
            const start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return [formatDate(start), formatDate(today)]
        }
        case 'last30Days': {
            const start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            return [formatDate(start), formatDate(today)]
        }
        case 'next7Days': {
            const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
            return [formatDate(today), formatDate(end)]
        }
        case 'next30Days': {
            const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
            return [formatDate(today), formatDate(end)]
        }
        default:
            return formatDate(today)
    }
}

const getOperatorOptions = (type: SearchType): Array<{ label: string; value: Operator }> => {
    switch (type) {
        case 'string':
            return stringOperators
        case 'number':
            return numberOperators
        case 'select':
            return selectOperators
        case 'boolean':
            return booleanOperators
        default:
            return []
    }
}

const isValueDisabled = (operator?: Operator) => {
    if (!operator) return false
    return noValueOperators.includes(operator)
}

const getDefaultOperatorForType = (type: SearchType): Operator | undefined => {
    switch (type) {
        case 'string':
            return 'contains' // 默认使用"含む"而不是"等しい"
        case 'number':
            return numberOperators[0]?.value
        case 'select':
            return selectOperators[0]?.value
        case 'boolean':
            return booleanOperators[0]?.value
        default:
            return undefined
    }
}

const selectField = (field: AvailableField, categoryKey?: string) => {
    selectedField.value = field
    // 保持分类弹窗打开（不关闭）
    
    const defaultOperator =
        field.type === 'date' ? relativeDateOperators[0]?.value : getDefaultOperatorForType(field.type)

    if (field.type === 'date' && defaultOperator && isDateOperatorValue(defaultOperator)) {
        editingFilter.value = { operator: defaultOperator, value: computeRelativeDateValue(defaultOperator) }
    } else if (field.type === 'daterange') {
        editingFilter.value = { operator: undefined, value: [] }
    } else if (field.type === 'boolean') {
        // 布尔值默认设置为 'is' 操作符和 true 值
        editingFilter.value = { operator: 'is', value: true }
    } else if (field.type === 'number' && defaultOperator === 'between') {
        editingFilter.value = { operator: defaultOperator, value: [null, null] }
    } else {
        editingFilter.value = { operator: defaultOperator, value: null }
    }
}

const updateEditingFilter = () => {
    // 占位函数：如需实时联动可扩展
}

const handleOperatorChange = (operator: Operator) => {
    if (!selectedField.value) return
    editingFilter.value.operator = operator

    if (selectedField.value.type === 'number') {
        if (operator === 'between') {
            editingFilter.value.value = [null, null]
        } else if (operator === 'hasAnyValue') {
            editingFilter.value.value = null
        }
    } else if (selectedField.value.type === 'string') {
        if (isValueDisabled(operator)) {
            editingFilter.value.value = null
        }
    } else if (selectedField.value.type === 'select') {
        if (operator === 'hasAnyValue') {
            editingFilter.value.value = null
        }
    } else if (selectedField.value.type === 'boolean') {
        editingFilter.value.value = true
    }
}

const isDateOperatorValue = (operator?: Operator): operator is DateOperator => {
    if (!operator) return false
    return dateOperatorSet.has(operator as DateOperator)
}

const handleDateOperatorChange = (operator: Operator | undefined) => {
    if (!selectedField.value) return
    if (!isDateOperatorValue(operator)) return
    editingFilter.value.operator = operator
    if (isRelativeDateOperator(operator)) {
        editingFilter.value.value = computeRelativeDateValue(operator)
    } else if (isBetweenOperatorValue(operator)) {
        editingFilter.value.value = []
    } else {
        editingFilter.value.value = null
    }
}

const onDateOperatorChange = (operator: Operator | string) => {
    handleDateOperatorChange(operator as Operator)
}

const onBooleanValueChange = (value: boolean) => {
    if (!selectedField.value) return
    // boolean は値そのものを比較する（operator は常に 'is'）
    editingFilter.value.operator = 'is'
    editingFilter.value.value = value
}

const applyFilter = () => {
    const field = selectedField.value
    if (!field) return

    const operator: Operator | undefined =
        field.type === 'daterange'
            ? 'between'
            : field.type === 'date'
                ? editingFilter.value.operator
                : editingFilter.value.operator || getDefaultOperatorForType(field.type)
    if (!operator) return

    // 对于相对日期操作符，保存操作符本身，值可以设为 null 或操作符（用于标识）
    // 实际值会在 buildPayload 时动态计算
    let value = editingFilter.value.value
    if (isRelativeDateOperator(operator)) {
        // 对于相对日期，保存操作符作为标识，实际值在搜索时动态计算
        value = null // 或者可以保存操作符本身作为标识
    } else if (noValueOperators.includes(operator)) {
        // 允许空值
    } else if (value === null || value === undefined || value === '') {
        return
    } else if (Array.isArray(value) && value.some((item) => item === null || item === undefined || item === '')) {
        return
    }

    const newFilter: FilterItem = {
        id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fieldKey: field.key,
        fieldLabel: field.label,
        type: field.type,
        value: isRelativeDateOperator(operator) ? null : value, // 相对日期保存 null，实际值在搜索时计算
        operator,
        column: field.column,
    }

    activeFilters.value.push(newFilter)
    selectedField.value = null
    editingFilter.value = { value: null, operator: undefined }
    // 关闭所有分类弹窗
    Object.keys(categoryPopovers.value).forEach(key => {
        categoryPopovers.value[key] = false
    })
    // 保存到 localStorage
    persistActiveFilters()
    // 立即触发搜索
    emits('search', buildPayload())
}

const cancelAddFilter = () => {
    selectedField.value = null
    editingFilter.value = { value: null, operator: undefined }
    // 关闭所有分类弹窗
    Object.keys(categoryPopovers.value).forEach(key => {
        categoryPopovers.value[key] = false
    })
}

const removeFilter = (id: string) => {
    const index = activeFilters.value.findIndex((f) => f.id === id)
    if (index > -1) {
        activeFilters.value.splice(index, 1)
        // 保存到 localStorage
        persistActiveFilters()
        // 移除后也触发搜索刷新
        emits('search', buildPayload())
    }
}

const formatFilterValue = (filter: FilterItem): string => {
    if (noValueOperators.includes(filter.operator)) {
        return ''
    }

    if (isRelativeDateOperator(filter.operator)) {
        return getRelativeDateDisplay(filter.operator)
    }

    if (filter.value === null || filter.value === undefined) return ''

    if (Array.isArray(filter.value)) {
        if (filter.value.length === 2) {
            return `${filter.value[0]} - ${filter.value[1]}`
        }
        return filter.value.join(', ')
    }

    if (filter.type === 'boolean') {
        return filter.value ? 'はい' : 'いいえ'
    }

    if (filter.type === 'select' && filter.column?.searchOptions) {
        const option = filter.column.searchOptions.find((opt) => opt.value === filter.value)
        return option ? option.label : String(filter.value)
    }

    return String(filter.value)
}

// 格式化过滤器显示文本（符合日语语序）
// 转义HTML特殊字符
const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, (m) => map[m] || m)
}

const formatFilterDisplay = (filter: FilterItem): string => {
    const fieldLabel = filter.fieldLabel
    const operator = filter.operator
    const operatorLabel = getOperatorLabel(operator)
    
    // 获取值的显示文本
    const getValueText = (): string => {
        if (filter.value === null || filter.value === undefined) {
            return ''
        } else if (Array.isArray(filter.value)) {
            if (filter.value.length === 2) {
                return `${filter.value[0]} - ${filter.value[1]}`
            }
            return filter.value.join(', ')
        } else if (filter.type === 'boolean') {
            return filter.value ? 'はい' : 'いいえ'
        } else if (filter.type === 'select' && filter.column?.searchOptions) {
            const option = filter.column.searchOptions.find((opt) => opt.value === filter.value)
            return option ? option.label : String(filter.value)
        }
        return String(filter.value)
    }

    const valueText = getValueText()
    const escapedFieldLabel = escapeHtml(fieldLabel)
    const escapedValueText = escapeHtml(valueText)
    const escapedOperatorLabel = escapeHtml(operatorLabel)

    // 不需要值的操作符（値あり、空）
    if (operator === 'hasAnyValue' || operator === 'isEmpty') {
        return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedOperatorLabel}`
    }

    // 相对日期操作符
    if (isRelativeDateOperator(operator)) {
        return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedOperatorLabel}`
    }

    // 布尔值：只显示值本身，不显示操作符
    if (filter.type === 'boolean') {
        return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedValueText}`
    }

    // 根据操作符类型决定显示格式（使用 as Operator 来避免类型缩小问题）
    const op = operator as Operator
    switch (op) {
        case 'equals':
        case 'is':
            // 等值：字段名: 值（布尔值已经在上面单独处理）
            return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedValueText}`
        case 'notEquals':
        case 'isNot':
            // 不等值：字段名: 值以外（布尔值已经在上面单独处理）
            return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedValueText}以外`
        case 'contains':
            // 包含：字段名: 值を含む
            return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedValueText}を含む`
        case 'notContains':
            // 不包含：字段名: 値を含まない
            return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedValueText}を含まない`
        case 'lessThan':
        case 'lessThanOrEqual':
        case 'greaterThan':
        case 'greaterThanOrEqual':
            // 数字比较：字段名: 值 + 操作符
            return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedValueText}${escapedOperatorLabel}`
        case 'between':
            // 范围：字段名: 値1 - 値2
            return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedValueText}`
        case 'before':
        case 'after':
            // 日期比较：字段名: 值 + 操作符
            return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedValueText}${escapedOperatorLabel}`
        case 'today':
        case 'yesterday':
        case 'thisWeek':
        case 'thisMonth':
        case 'last7Days':
        case 'last30Days':
        case 'next7Days':
        case 'next30Days':
            // 相对日期已经在上面处理了，这里不应该到达
            return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedOperatorLabel}`
        default:
            // 默认格式：字段名: 操作符 值
            return `<span class="filter-field-label">${escapedFieldLabel}</span>: ${escapedOperatorLabel} ${escapedValueText}`
    }
}

const getOperatorLabel = (operator: Operator): string => {
    const map: Partial<Record<Operator, string>> = {
        contains: '含む',
        notContains: '含まない',
        is: '等しい',
        isNot: '等しくない',
        equals: '等しい',
        notEquals: '等しくない',
        greaterThan: 'より大きい',
        greaterThanOrEqual: '以上',
        lessThan: 'より小さい',
        lessThanOrEqual: '以下',
        between: '範囲',
        hasAnyValue: '値あり',
        isEmpty: '空',
        before: '以前',
        after: '以降',
        today: '今日',
        yesterday: '昨日',
        thisWeek: '今週',
        thisMonth: '今月',
        last7Days: '過去7日間',
        last30Days: '過去30日間',
        next7Days: '今後7日間',
        next30Days: '今後30日間',
    }
    return map[operator] || operator
}

const buildPayload = () => {
    const payload: Record<string, { operator: Operator; value: any }> = {}
    activeFilters.value.forEach((filter) => {
        // 对于相对日期操作符，在构建 payload 时动态计算日期值
        let value = filter.value
        if (isRelativeDateOperator(filter.operator)) {
            value = computeRelativeDateValue(filter.operator)
        }
        
        payload[filter.fieldKey] = {
            operator: filter.operator,
            value,
        }
    })

    const keyword = globalSearchText.value.trim()
    if (keyword) {
        // NOTE: client-only quick search keyword (parent should strip this before sending to backend)
        payload.__global = { operator: 'contains', value: keyword }
    }
    return payload
}

const handleSearch = () => {
    emits('search', buildPayload())
}

// 清空所有搜索过滤条件
const handleClear = () => {
    activeFilters.value = []
    globalSearchText.value = ''
    // 清除 localStorage 中的保存
    if (typeof window !== 'undefined') {
        try {
            localStorage.removeItem(activeFiltersStorageKey.value)
        } catch (e) {
            console.error('Failed to clear active filters from localStorage', e)
        }
    }
    // 触发搜索事件，使用空的 payload
    emits('search', {})
}

// 将保存的过滤器应用到当前搜索
const applySavedSearch = (item: SavedSearch) => {
    const filters: FilterItem[] = []
    item.filters.forEach((sf) => {
        const field = availableFields.value.find((f) => f.key === sf.fieldKey)
        if (!field) return
        filters.push({
            id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            fieldKey: field.key,
            fieldLabel: field.label,
            type: field.type,
            value: sf.value,
            operator: sf.operator,
            column: field.column,
        })
    })
    activeFilters.value = filters
    // 关闭所有分类弹窗
    Object.keys(categoryPopovers.value).forEach(key => {
        categoryPopovers.value[key] = false
    })
    // 保存到 localStorage（watch 会自动触发，但为了确保，这里也显式调用）
    persistActiveFilters()
    emits('search', buildPayload())
}

// 保存搜索条件
const handleSave = async () => {
    if (activeFilters.value.length === 0) return

    const defaultName = `検索条件 ${new Date().toLocaleString('ja-JP')}`
    try {
        const { value } = await ElMessageBox.prompt('保存名を入力してください', '検索条件を保存', {
            confirmButtonText: '保存',
            cancelButtonText: 'キャンセル',
            inputValue: defaultName,
        })
        const name = value && value.trim() ? value.trim() : defaultName
        const filtersToSave: SavedFilter[] = activeFilters.value.map((f) => ({
            fieldKey: f.fieldKey,
            operator: f.operator,
            value: f.value,
        }))
        const newItem: SavedSearch = {
            id: `saved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            filters: filtersToSave,
        }
        savedSearches.value.push(newItem)
        persistSavedSearches()
        emits('save', buildPayload())
    } catch (e) {
        // 用户取消
    }
}

// 删除保存的搜索条件
const confirmDeleteSaved = async (id: string) => {
    try {
        await ElMessageBox.confirm('この検索条件を削除しますか？', '確認', {
            confirmButtonText: '削除',
            cancelButtonText: 'キャンセル',
            type: 'warning',
        })
        const idx = savedSearches.value.findIndex((s) => s.id === id)
        if (idx !== -1) {
            savedSearches.value.splice(idx, 1)
            persistSavedSearches()
            ElMessage.success('削除しました')
        }
    } catch (e) {
        // 取消
    }
}

// 监听 activeFilters 的变化，自动保存到 localStorage
watch(
    activeFilters,
    () => {
        persistActiveFilters()
    },
    { deep: true },
)

watch(
    () => props.initialValues,
    (newValues) => {
        if (newValues && Object.keys(newValues).length > 0) {
            activeFilters.value = []
            Object.keys(newValues).forEach((key) => {
                const field = availableFields.value.find((f) => f.key === key)
                if (!field) return

                let operator: Operator | undefined
                let value: any = newValues[key]

                if (
                    typeof newValues[key] === 'object' &&
                    newValues[key] !== null &&
                    !Array.isArray(newValues[key]) &&
                    'operator' in newValues[key]
                ) {
                    operator = newValues[key].operator
                    value = newValues[key].value
                } else {
                    if (field.type === 'date') {
                        operator = 'equals'
                    } else if (field.type === 'daterange') {
                        operator = 'between'
                    } else {
                        operator = getDefaultOperatorForType(field.type)
                    }
                }

                const allowEmpty = operator ? noValueOperators.includes(operator) : false
                if (operator && (allowEmpty || (value !== null && value !== undefined))) {
                    activeFilters.value.push({
                        id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        fieldKey: key,
                        fieldLabel: field.label,
                        type: field.type,
                        value,
                        operator,
                        column: field.column,
                    })
                }
            })
            // 如果通过 initialValues 设置了过滤器，保存它们
            persistActiveFilters()
        }
    },
    { immediate: true },
)

onMounted(() => {
    loadSavedSearches()
    // 延迟加载 activeFilters，确保 availableFields 已经准备好
    // 使用 nextTick 确保 computed 属性已经计算完成
    nextTick(() => {
        // 只有在没有通过 initialValues 设置过滤器时才从 localStorage 恢复
        // 这样可以避免 initialValues 被 localStorage 覆盖
        if (!props.initialValues || Object.keys(props.initialValues).length === 0) {
            loadActiveFilters()
        }
    })
})

/**
 * 外部から呼び出せるフィルター追加メソッド
 * スキーマ分析などから直接フィルターを追加するために使用
 */
const addFilter = (fieldKey: string, value: any, operator?: Operator) => {
    // フィールド定義を検索（key または dataKey でマッチ）
    const field = availableFields.value.find((f) => f.key === fieldKey || f.column?.dataKey === fieldKey)
    if (!field) {
        console.warn(`Field not found: ${fieldKey}`)
        return false
    }

    // 既存の同じフィールドのフィルターを削除（重複を避ける）
    const existingIndex = activeFilters.value.findIndex((f) => f.fieldKey === fieldKey)
    if (existingIndex > -1) {
        activeFilters.value.splice(existingIndex, 1)
    }

    // デフォルトのオペレータを決定
    let defaultOperator: Operator | undefined = operator
    if (!defaultOperator) {
        if (field.type === 'string' || field.type === 'date') {
            defaultOperator = 'is'
        } else {
            defaultOperator = getDefaultOperatorForType(field.type)
        }
    }
    if (!defaultOperator) return false

    // 新しいフィルターを作成
    const newFilter: FilterItem = {
        id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fieldKey: field.key,
        fieldLabel: field.label,
        type: field.type,
        value,
        operator: defaultOperator,
        column: field.column,
    }

    activeFilters.value.push(newFilter)

    // localStorage に保存
    persistActiveFilters()

    // 検索を実行
    emits('search', buildPayload())

    return true
}

// 外部からアクセスできるようにメソッドを公開
defineExpose({
    addFilter,
})
</script>

<style scoped>
.search-form {
    padding: 12px 0;
}

.search-bar {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 0;
    background: white;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
}

/* 上半部分：过滤器分类选项 */
.filter-categories-row {
    display: flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    font-size: 12px;
    border-bottom: 1px solid #e4e7ed;
}

.filter-categories-label {
    font-size: 12px;
    color: #303133;
    margin-right: 12px;
    flex-shrink: 0;
}

.filter-categories-list {
    display: flex;
    align-items: center;
    flex: 1;
    gap: 0;
}

.filter-category-header {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    padding: 0 8px;
    color: v-bind('linkColor');
    font-size: 12px;
    transition: color 0.2s;
}

.filter-category-header:hover {
    color: #66b1ff;
}

.filter-category-name {
    font-size: 12px;
}

.filter-category-icon {
    font-size: 12px;
}

.filter-category-divider {
    width: 1px;
    height: 16px;
    background: #e4e7ed;
    margin: 0 4px;
}

.filter-category-menu-content {
    display: flex;
    max-height: 400px;
}

.filter-category-items {
    width: 160px;
    border-right: 1px solid #e4e7ed;
    overflow-y: auto;
    padding: 8px 0;
}

.filter-category-item {
    padding: 8px 16px;
    cursor: pointer;
    font-size: 12px;
    color: #606266;
    transition: background-color 0.2s;
}

.filter-category-item:hover {
    background-color: #f5f7fa;
}

.filter-category-item.active {
    background-color: #ecf5ff;
    color: v-bind('linkColor');
    font-weight: 600;
}

/* 下半部分：已选择的过滤器卡片 */
.selected-filters-row {
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 12px;
    min-height: 30px;
}

.selected-filters-label {
    font-size: 12px;
    color: #303133;
    margin-right: 12px;
    flex-shrink: 0;
    line-height: 30px;
    height: 30px;
    display: flex;
    align-items: center;
}

.selected-filters-list {
    display: flex;
    flex: 1;
    gap: 3px 8px;
    flex-wrap: wrap;
    align-content: flex-start;
    padding-top: 3px;
    padding-bottom: 3px;
    box-sizing: border-box;
}

.filter-card {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    background: transparent;
    color: #303133;
    border-radius: 12px;
    font-size: 12px;
    height: 24px;
    line-height: 24px;
    white-space: nowrap;
    border: 1px solid #e4e7ed;
    box-sizing: border-box;
}

.filter-category-tag {
    color: v-bind('linkColor');
    font-size: 12px;
    line-height: 24px;
}

.filter-text {
    color: #303133;
    font-size: 12px;
    line-height: 24px;
}

.filter-field-label {
    color: v-bind('linkColor');
}

.filter-actions-right {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
}

.clear-filters-link {
    font-size: 12px;
    padding: 0;
    height: 24px;
    line-height: 24px;
}

.save-filter-button {
    font-size: 12px;
    height: 24px;
    line-height: 24px;
    padding: 0 8px;
    border: 1px solid #e4e7ed;
    border-radius: 12px;
    background: transparent;
    color: #303133;
}

.save-filter-button:hover {
    background: #f5f7fa;
    border-color: #c0c4cc;
}

.filter-remove {
    padding: 0;
    margin-left: 2px;
    color: #909399;
    opacity: 0.8;
    font-size: 10px;
    height: auto;
    line-height: 1;
    width: 10px;
    min-width: 10px;
}

.filter-remove :deep(.el-icon) {
    font-size: 10px;
}

.filter-remove:hover {
    opacity: 1;
    color: #f56c6c;
}

.search-actions {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 4px;
    flex-shrink: 0;
    height: 30px;
    padding: 0 12px;
    border-top: 1px solid #e4e7ed;
}

.quick-search {
    display: flex;
    align-items: center;
    gap: 0;
}

.quick-search-input {
    width: 300px;
}

.quick-search-input :deep(.el-input__wrapper) {
    height: 20px;
    padding: 0 8px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

.quick-search-input :deep(.el-input__inner) {
    height: 20px;
    line-height: 20px;
    font-size: 12px;
}

.quick-search-button {
    width: 40px;
    height: 20px;
    padding: 0;
    font-size: 12px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
}

.saved-section-row {
    display: flex;
    align-items: center;
    padding: 0 12px;
    font-size: 12px;
    min-height: 30px;
    border-top: 1px solid #e4e7ed;
}

.saved-section-label {
    font-size: 12px;
    color: #303133;
    margin-right: 12px;
    flex-shrink: 0;
    line-height: 30px;
    height: 30px;
    display: flex;
    align-items: center;
}

.saved-cards-list {
    display: flex;
    flex: 1;
    gap: 3px 8px;
    flex-wrap: wrap;
    align-content: flex-start;
    padding-top: 3px;
    padding-bottom: 3px;
    box-sizing: border-box;
}

.saved-card {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    background: v-bind('primaryColor');
    border: 1px solid #e4e7ed;
    border-radius: 12px;
    font-size: 12px;
    color: #ffffff;
    height: 24px;
    line-height: 24px;
    white-space: nowrap;
    cursor: pointer;
    box-sizing: border-box;
}

.saved-card-name {
    font-weight: 600;
    font-size: 12px;
    line-height: 24px;
}

.saved-card-remove {
    padding: 0;
    margin-left: 2px;
    color: #ffffff;
    opacity: 0.8;
    font-size: 10px;
    height: auto;
    line-height: 1;
    width: 10px;
    min-width: 10px;
}

.saved-card-remove :deep(.el-icon) {
    font-size: 10px;
}

.saved-card-remove:hover {
    opacity: 1;
    color: #ffffff;
}

.filter-editor {
    flex: 1;
    padding: 0 16px;
    min-width: 240px;
    display: flex;
    flex-direction: column;
}

.filter-editor-label {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12px;
}

.filter-editor-content {
    margin-bottom: 16px;
}

.filter-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid #e4e7ed;
    margin-top: auto;
}

.filter-operator-selector {
    margin-bottom: 12px;
}

.number-range-input {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.range-separator {
    color: #909399;
    font-size: 14px;
}

.relative-date-display {
    padding: 8px 12px;
    background: #f5f7fa;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    color: #606266;
    font-size: 13px;
    margin-bottom: 8px;
}
</style>
