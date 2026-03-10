<template>
  <section class="classic-search-form" :class="{ collapsed: isCollapsed }">
    <!-- 折叠标题栏 -->
    <div class="collapse-header" @click="toggleCollapse">
      <span class="collapse-icon">{{ isCollapsed ? '▶' : '▼' }}</span>
      <span class="collapse-title">絞り込みパネル</span>
    </div>

    <!-- 搜索内容区域 -->
    <div class="search-content" v-show="!isCollapsed">
      <!-- 第一行：配送方法、送り状種類等 -->
      <div class="search-row">
        <div class="search-field">
          <label class="field-label">配送方法</label>
          <el-select v-model="filters.carrierId" placeholder="配送方法" clearable size="small" style="width: 120px">
            <el-option
              v-for="opt in carrierOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </div>

        <div class="search-field">
          <label class="field-label">送り状種類</label>
          <el-radio-group v-model="filters.invoiceType" size="small">
            <el-radio label="">全て</el-radio>
            <el-radio label="0">宅配便</el-radio>
            <el-radio label="A">ネコポス</el-radio>
          </el-radio-group>
        </div>

        <div class="search-field">
          <label class="field-label">その他</label>
          <span class="field-value">注文数</span>
          <el-input-number v-model="filters.orderCountMin" :min="0" size="small" style="width: 60px" controls-position="right" />
          <span class="field-separator">〜</span>
          <el-select v-model="filters.orderCountOp" size="small" style="width: 60px">
            <el-option label="以下" value="lte" />
            <el-option label="以上" value="gte" />
          </el-select>
        </div>

        <div class="search-field">
          <span class="field-value">等口数</span>
          <el-select v-model="filters.skuCountOp" size="small" style="width: 80px">
            <el-option label="全て" value="" />
            <el-option label="1種類" value="1" />
            <el-option label="2種以上" value="2+" />
          </el-select>
        </div>

        <div class="search-field">
          <label class="field-label">表示データ</label>
          <el-radio-group v-model="filters.displayMode" size="small">
            <el-radio label="">全件</el-radio>
            <el-radio label="normal">正常のみ</el-radio>
            <el-radio label="error">エラーのみ</el-radio>
          </el-radio-group>
        </div>

        <div class="search-field">
          <el-checkbox v-model="filters.assigned">引当済</el-checkbox>
          <el-checkbox v-model="filters.unassigned">未引当</el-checkbox>
        </div>
      </div>

      <!-- 第二行：伝票番号 -->
      <div class="search-row">
        <div class="search-field">
          <label class="field-label">伝票番号</label>
          <el-checkbox v-model="filters.statusUndelivered">未配送</el-checkbox>
          <el-checkbox v-model="filters.statusCreated">作成済</el-checkbox>
          <el-checkbox v-model="filters.statusNotCreated">未作成</el-checkbox>
        </div>

        <div class="search-field">
          <label class="field-label">期間</label>
          <el-select v-model="filters.dateField" size="small" style="width: 100px">
            <el-option label="出荷予定日" value="shipPlanDate" />
            <el-option label="作成日時" value="createdAt" />
          </el-select>
        </div>

        <div class="search-field">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="〜"
            start-placeholder="年/月/日"
            end-placeholder="年/月/日"
            format="YYYY/MM/DD"
            value-format="YYYY/MM/DD"
            size="small"
            style="width: 240px"
          />
        </div>

        <div class="search-field date-shortcuts">
          <el-button size="small" @click="setDateToday">今日</el-button>
          <el-button size="small" @click="setDateTomorrow">明日</el-button>
          <el-button size="small" @click="setDateDayAfter">明後日</el-button>
        </div>

        <div class="search-field">
          <label class="field-label">クール区分</label>
          <el-radio-group v-model="filters.coolType" size="small">
            <el-radio label="">全て</el-radio>
            <el-radio label="0">通常</el-radio>
            <el-radio label="1">冷凍</el-radio>
            <el-radio label="2">冷蔵</el-radio>
          </el-radio-group>
        </div>
      </div>

      <!-- 第三行：ダイレクト検索 -->
      <div class="search-row">
        <div class="search-field">
          <label class="field-label">ダイレクト検索</label>
          <el-select v-model="filters.directSearchField" size="small" style="width: 100px">
            <el-option label="注文番号" value="orderNumber" />
            <el-option label="管理番号" value="customerManagementNumber" />
          </el-select>
          <el-input v-model="filters.directSearchValue1" size="small" style="width: 120px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">氏名</span>
          <el-select v-model="filters.nameSearchField" size="small" style="width: 100px">
            <el-option label="注文者氏名" value="orderer.name" />
            <el-option label="送付先名" value="recipient.name" />
          </el-select>
          <el-input v-model="filters.nameSearchValue" size="small" style="width: 120px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">電話番号</span>
          <el-select v-model="filters.phoneSearchField" size="small" style="width: 100px">
            <el-option label="注文者氏名" value="orderer.phone" />
            <el-option label="送付先" value="recipient.phone" />
          </el-select>
          <el-input v-model="filters.phoneSearchValue" size="small" style="width: 100px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">お届物伝票番号</span>
          <el-input v-model="filters.trackingId" size="small" style="width: 140px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">都道府県</span>
          <el-input v-model="filters.prefecture" size="small" style="width: 80px" placeholder="" />
        </div>

        <div class="search-field">
          <span class="field-value">住所</span>
          <el-input v-model="filters.address" size="small" style="width: 100px" placeholder="" />
        </div>
      </div>

      <!-- 第四行：商品 -->
      <div class="search-row">
        <div class="search-field">
          <label class="field-label">商品</label>
          <el-input v-model="filters.productSearch" size="small" style="width: 200px" placeholder="商品名・SKUで検索" />
        </div>
      </div>
    </div>

    <!-- 底部操作按钮 -->
    <div class="search-actions" v-show="!isCollapsed">
      <el-button type="primary" size="small" @click="handleSearch">検索</el-button>
      <el-button size="small" @click="handleClear">入力項目をクリア</el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
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

// 日期快捷设置
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

const setDateToday = () => {
  const today = formatDate(new Date())
  filters.dateRange = [today, today]
}

const setDateTomorrow = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = formatDate(tomorrow)
  filters.dateRange = [dateStr, dateStr]
}

const setDateDayAfter = () => {
  const dayAfter = new Date()
  dayAfter.setDate(dayAfter.getDate() + 2)
  const dateStr = formatDate(dayAfter)
  filters.dateRange = [dateStr, dateStr]
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

.classic-search-form.collapsed .collapse-header {
  border-bottom: none;
}

.collapse-icon {
  font-size: 10px;
  color: #606266;
}

.collapse-title {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.search-content {
  padding: 10px 12px;
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.search-row:last-child {
  margin-bottom: 0;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-label {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  min-width: 70px;
}

.field-value {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.field-separator {
  font-size: 12px;
  color: #909399;
}

.date-shortcuts {
  gap: 4px;
}

.date-shortcuts .el-button {
  padding: 4px 8px;
}

.search-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  border-top: 1px solid #e4e7ed;
  background: #fafafa;
}

.search-actions .el-button {
  padding: 5px 12px;
  height: 26px;
}

/* Element Plus 组件样式调整 */
:deep(.el-radio) {
  margin-right: 12px;
}

:deep(.el-radio__label) {
  font-size: 12px;
}

:deep(.el-checkbox__label) {
  font-size: 12px;
}

:deep(.el-select .el-input__inner) {
  font-size: 12px;
}

:deep(.el-input__inner) {
  font-size: 12px;
}

:deep(.el-button--small) {
  font-size: 12px;
}
</style>
