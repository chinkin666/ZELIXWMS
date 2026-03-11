<template>
  <section class="classic-search-form" :class="{ collapsed: isCollapsed }">
    <!-- 折叠标题栏 -->
    <div class="collapse-header" @click="toggleCollapse">
      <span class="collapse-icon">{{ isCollapsed ? '▶' : '▼' }}</span>
      <span class="collapse-title">絞り込みパネル</span>
    </div>

    <!-- 搜索内容区域 -->
    <div class="search-content" v-show="!isCollapsed">
      <!-- 第一行：送り状種類、送り状種類等 -->
      <div class="search-row">
        <div class="search-field">
          <label class="field-label">送り状種類</label>
          <select class="o-input o-input-sm" v-model="filters.carrierId" style="width: 120px">
            <option value="">全て</option>
            <option
              v-for="opt in carrierOptions"
              :key="String(opt.value)"
              :value="opt.value"
            >{{ opt.label }}</option>
          </select>
        </div>

        <div class="search-field">
          <label class="field-label">送り状種類</label>
          <div class="radio-group">
            <label class="radio-item"><input type="radio" v-model="filters.invoiceType" value="" /> 全て</label>
            <label class="radio-item"><input type="radio" v-model="filters.invoiceType" value="0" /> 宅配便</label>
            <label class="radio-item"><input type="radio" v-model="filters.invoiceType" value="A" /> ネコポス</label>
          </div>
        </div>

        <div class="search-field">
          <label class="field-label">その他</label>
          <span class="field-value">注文数</span>
          <input type="number" class="o-input o-input-sm" v-model.number="filters.orderCountMin" :min="0" style="width: 60px" />
          <span class="field-separator">〜</span>
          <select class="o-input o-input-sm" v-model="filters.orderCountOp" style="width: 60px">
            <option value="lte">以下</option>
            <option value="gte">以上</option>
          </select>
        </div>

        <div class="search-field">
          <span class="field-value">等口数</span>
          <select class="o-input o-input-sm" v-model="filters.skuCountOp" style="width: 80px">
            <option value="">全て</option>
            <option value="1">1種類</option>
            <option value="2+">2種以上</option>
          </select>
        </div>

        <div class="search-field">
          <label class="field-label">表示データ</label>
          <div class="radio-group">
            <label class="radio-item"><input type="radio" v-model="filters.displayMode" value="" /> 全件</label>
            <label class="radio-item"><input type="radio" v-model="filters.displayMode" value="normal" /> 正常のみ</label>
            <label class="radio-item"><input type="radio" v-model="filters.displayMode" value="error" /> エラーのみ</label>
          </div>
        </div>

        <div class="search-field">
          <label class="o-checkbox"><input type="checkbox" v-model="filters.assigned" /> 引当済</label>
          <label class="o-checkbox"><input type="checkbox" v-model="filters.unassigned" /> 未引当</label>
        </div>
      </div>

      <!-- 第二行：伝票番号 -->
      <div class="search-row">
        <div class="search-field">
          <label class="field-label">伝票番号</label>
          <label class="o-checkbox"><input type="checkbox" v-model="filters.statusUndelivered" /> 未配送</label>
          <label class="o-checkbox"><input type="checkbox" v-model="filters.statusCreated" /> 作成済</label>
          <label class="o-checkbox"><input type="checkbox" v-model="filters.statusNotCreated" /> 未作成</label>
        </div>

        <div class="search-field">
          <label class="field-label">期間</label>
          <select class="o-input o-input-sm" v-model="filters.dateField" style="width: 100px">
            <option value="shipPlanDate">出荷予定日</option>
            <option value="createdAt">作成日時</option>
          </select>
        </div>

        <div class="search-field">
          <input type="date" class="o-input o-input-sm" v-model="dateStart" style="width: 130px" />
          <span class="field-separator">〜</span>
          <input type="date" class="o-input o-input-sm" v-model="dateEnd" style="width: 130px" />
        </div>

        <div class="search-field date-shortcuts">
          <button class="o-btn o-btn-sm o-btn-secondary" @click="setDateToday">今日</button>
          <button class="o-btn o-btn-sm o-btn-secondary" @click="setDateTomorrow">明日</button>
          <button class="o-btn o-btn-sm o-btn-secondary" @click="setDateDayAfter">明後日</button>
        </div>

        <div class="search-field">
          <label class="field-label">クール区分</label>
          <div class="radio-group">
            <label class="radio-item"><input type="radio" v-model="filters.coolType" value="" /> 全て</label>
            <label class="radio-item"><input type="radio" v-model="filters.coolType" value="0" /> 通常</label>
            <label class="radio-item"><input type="radio" v-model="filters.coolType" value="1" /> 冷凍</label>
            <label class="radio-item"><input type="radio" v-model="filters.coolType" value="2" /> 冷蔵</label>
          </div>
        </div>
      </div>

      <!-- 第三行：ダイレクト検索 -->
      <div class="search-row">
        <div class="search-field">
          <label class="field-label">ダイレクト検索</label>
          <select class="o-input o-input-sm" v-model="filters.directSearchField" style="width: 100px">
            <option value="orderNumber">注文番号</option>
            <option value="customerManagementNumber">管理番号</option>
          </select>
          <input class="o-input o-input-sm" v-model="filters.directSearchValue1" style="width: 120px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">氏名</span>
          <select class="o-input o-input-sm" v-model="filters.nameSearchField" style="width: 100px">
            <option value="orderer.name">注文者氏名</option>
            <option value="recipient.name">送付先名</option>
          </select>
          <input class="o-input o-input-sm" v-model="filters.nameSearchValue" style="width: 120px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">電話番号</span>
          <select class="o-input o-input-sm" v-model="filters.phoneSearchField" style="width: 100px">
            <option value="orderer.phone">注文者氏名</option>
            <option value="recipient.phone">送付先</option>
          </select>
          <input class="o-input o-input-sm" v-model="filters.phoneSearchValue" style="width: 100px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">お届物伝票番号</span>
          <input class="o-input o-input-sm" v-model="filters.trackingId" style="width: 140px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">都道府県</span>
          <input class="o-input o-input-sm" v-model="filters.prefecture" style="width: 80px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">住所</span>
          <input class="o-input o-input-sm" v-model="filters.address" style="width: 100px" placeholder="" />
        </div>
      </div>

      <!-- 第四行：商品 -->
      <div class="search-row">
        <div class="search-field">
          <label class="field-label">商品</label>
          <input class="o-input o-input-sm" v-model="filters.productSearch" style="width: 200px" placeholder="商品名・SKUで検索" />
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="search-actions" v-show="!isCollapsed">
      <button class="o-btn o-btn-primary o-btn-sm" @click="handleSearch">検索</button>
      <button class="o-btn o-btn-secondary o-btn-sm" @click="handleClear">入力項目をクリア</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { TableColumn } from '@/types/table'

interface Props {
  columns: TableColumn[]
  showSave?: boolean
  initialValues?: Record<string, any>
  storageKey?: string
  showGlobalSearch?: boolean
  carrierOptions?: Array<{ label: string; value: string }>
}

const props = withDefaults(defineProps<Props>(), {
  showSave: true,
  initialValues: () => ({}),
  storageKey: 'classic_search_form_default',
  showGlobalSearch: true,
  carrierOptions: () => [],
})

const emits = defineEmits<{
  (e: 'search', payload: Record<string, { operator: string; value: any }>): void
  (e: 'save', payload: Record<string, { operator: string; value: any }>): void
}>()

// 折叠状态
const isCollapsed = ref(false)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 从 columns 中提取 carrier 选项
const carrierOptions = computed(() => {
  if (props.carrierOptions && props.carrierOptions.length > 0) {
    return props.carrierOptions
  }
  const carrierCol = props.columns.find(c => c.key === 'carrierId')
  return carrierCol?.searchOptions || []
})

// 搜索条件
const filters = reactive({
  carrierId: '',
  invoiceType: '',
  orderCountMin: undefined as number | undefined,
  orderCountOp: 'lte',
  skuCountOp: '',
  displayMode: '',
  assigned: false,
  unassigned: false,
  statusUndelivered: false,
  statusCreated: false,
  statusNotCreated: false,
  dateField: 'shipPlanDate',
  dateRange: null as [string, string] | null,
  coolType: '',
  directSearchField: 'orderNumber',
  directSearchValue1: '',
  nameSearchField: 'orderer.name',
  nameSearchValue: '',
  phoneSearchField: 'orderer.phone',
  phoneSearchValue: '',
  trackingId: '',
  prefecture: '',
  address: '',
  productSearch: '',
})

// Date range as separate inputs for native date picker
const dateStart = ref('')
const dateEnd = ref('')

watch([dateStart, dateEnd], ([s, e]) => {
  if (s && e) {
    filters.dateRange = [s.replace(/-/g, '/'), e.replace(/-/g, '/')]
  } else {
    filters.dateRange = null
  }
})

// 日期快捷设置
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const setDateToday = () => {
  const today = formatDate(new Date())
  dateStart.value = today
  dateEnd.value = today
}

const setDateTomorrow = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = formatDate(tomorrow)
  dateStart.value = dateStr
  dateEnd.value = dateStr
}

const setDateDayAfter = () => {
  const dayAfter = new Date()
  dayAfter.setDate(dayAfter.getDate() + 2)
  const dateStr = formatDate(dayAfter)
  dateStart.value = dateStr
  dateEnd.value = dateStr
}

// 构建搜索 payload
const buildPayload = () => {
  const payload: Record<string, { operator: string; value: any }> = {}

  if (filters.carrierId) {
    payload.carrierId = { operator: 'is', value: filters.carrierId }
  }

  if (filters.invoiceType) {
    payload.invoiceType = { operator: 'is', value: filters.invoiceType }
  }

  if (filters.coolType) {
    payload.coolType = { operator: 'is', value: filters.coolType }
  }

  if (filters.dateRange && filters.dateRange.length === 2) {
    payload[filters.dateField] = { operator: 'between', value: filters.dateRange }
  }

  if (filters.directSearchValue1) {
    payload[filters.directSearchField] = { operator: 'contains', value: filters.directSearchValue1 }
  }

  if (filters.nameSearchValue) {
    payload[filters.nameSearchField] = { operator: 'contains', value: filters.nameSearchValue }
  }

  if (filters.phoneSearchValue) {
    payload[filters.phoneSearchField] = { operator: 'contains', value: filters.phoneSearchValue }
  }

  if (filters.trackingId) {
    payload.trackingId = { operator: 'contains', value: filters.trackingId }
  }

  if (filters.prefecture) {
    payload['recipient.prefecture'] = { operator: 'contains', value: filters.prefecture }
  }

  if (filters.address) {
    payload['recipient.street'] = { operator: 'contains', value: filters.address }
  }

  // 商品搜索：同时搜索商品名和SKU
  if (filters.productSearch) {
    payload.productName = { operator: 'contains', value: filters.productSearch }
    payload.productSku = { operator: 'contains', value: filters.productSearch }
  }

  return payload
}

const handleSearch = () => {
  emits('search', buildPayload())
}

const handleClear = () => {
  filters.carrierId = ''
  filters.invoiceType = ''
  filters.orderCountMin = undefined
  filters.orderCountOp = 'lte'
  filters.skuCountOp = ''
  filters.displayMode = ''
  filters.assigned = false
  filters.unassigned = false
  filters.statusUndelivered = false
  filters.statusCreated = false
  filters.statusNotCreated = false
  filters.dateField = 'shipPlanDate'
  filters.dateRange = null
  filters.coolType = ''
  filters.directSearchField = 'orderNumber'
  filters.directSearchValue1 = ''
  filters.nameSearchField = 'orderer.name'
  filters.nameSearchValue = ''
  filters.phoneSearchField = 'orderer.phone'
  filters.phoneSearchValue = ''
  filters.trackingId = ''
  filters.prefecture = ''
  filters.address = ''
  filters.productSearch = ''
  dateStart.value = ''
  dateEnd.value = ''

  emits('search', {})
}
</script>

<style scoped>
.classic-search-form {
  border: 1px solid #dcdfe6;
  border-radius: 0;
  background: #fff;
  margin-bottom: 10px;
}
.collapse-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  cursor: pointer;
  user-select: none;
}
.classic-search-form.collapsed .collapse-header { border-bottom: none; }
.collapse-icon { font-size: 10px; color: #606266; }
.collapse-title { font-size: 13px; font-weight: 500; color: #303133; }
.search-content { padding: 10px 12px; }
.search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.search-row:last-child { margin-bottom: 0; }
.search-field { display: flex; align-items: center; gap: 6px; }
.field-label { font-size: 12px; color: #606266; white-space: nowrap; min-width: 70px; }
.field-value { font-size: 12px; color: #606266; white-space: nowrap; }
.field-separator { font-size: 12px; color: #909399; }
.date-shortcuts { gap: 4px; }
.search-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  border-top: 1px solid #e4e7ed;
  background: #fafafa;
}
.radio-group { display: flex; gap: 12px; }
.radio-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #606266; cursor: pointer; white-space: nowrap; }
.radio-item input[type="radio"] { margin: 0; }
.o-checkbox { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #606266; cursor: pointer; white-space: nowrap; }
.o-checkbox input[type="checkbox"] { margin: 0; }
.o-input-sm { font-size: 12px; padding: 2px 6px; height: 26px; }
</style>
