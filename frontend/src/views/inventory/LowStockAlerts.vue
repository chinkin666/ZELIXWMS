<template>
  <div class="low-stock-alerts">
    <ControlPanel :title="'補充管理（定点割れリスト）'" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" :disabled="isLoading" @click="loadData">
          {{ isLoading ? '読込中...' : '再読込' }}
        </OButton>
      </template>
    </ControlPanel>

    <!-- サマリーカード / 摘要卡片 -->
    <div class="summary-cards">
      <div class="summary-card summary-card--danger">
        <div class="summary-value">{{ criticalCount }}</div>
        <div class="summary-label">緊急（Critical）</div>
      </div>
      <div class="summary-card summary-card--warning">
        <div class="summary-value">{{ warningCount }}</div>
        <div class="summary-label">警告（Warning）</div>
      </div>
      <div class="summary-card summary-card--info">
        <div class="summary-value">{{ alerts.length }}</div>
        <div class="summary-label">合計</div>
      </div>
      <div class="summary-card summary-card--reorder">
        <div class="summary-value">{{ totalReorderQty }}</div>
        <div class="summary-label">補充推奨合計</div>
      </div>
    </div>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="lowStockAlertsSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="alerts"
        row-key="productId"
        pagination-enabled
        pagination-mode="client"
        :global-search-text="globalSearchText"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 補充管理・定点割れリストビュー / 补充管理・低于安全库存列表视图
 *
 * safetyStock を下回る商品の一覧を表示。
 * 补充推奨数 = max(safetyStock * 2 - currentStock, 0)
 * 显示低于安全库存的商品列表，包含补充推荐数。
 */
import { ref, computed, h, onMounted } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import { fetchLowStockAlerts } from '@/api/inventory'
import type { LowStockAlert } from '@/types/inventory'
import { useToast } from '@/composables/useToast'

const { show: showToast } = useToast()

const alerts = ref<LowStockAlert[]>([])
const isLoading = ref(false)
const globalSearchText = ref('')

// サマリー計算 / 摘要计算
const criticalCount = computed(() => alerts.value.filter(a => a.status === 'critical').length)
const warningCount = computed(() => alerts.value.filter(a => a.status === 'warning').length)
const totalReorderQty = computed(() => alerts.value.reduce((sum, a) => sum + a.reorderSuggestion, 0))

/**
 * ステータスに応じたCSSクラスを返す / 根据状态返回CSS类
 */
function getStatusTagClass(status: string): string {
  return status === 'critical'
    ? 'o-status-tag o-status-tag--error'
    : 'o-status-tag o-status-tag--warning'
}

/**
 * ステータスに応じたラベルを返す / 根据状态返回标签
 */
function getStatusLabel(status: string): string {
  return status === 'critical' ? '緊急' : '警告'
}

// 検索カラム定義 / 搜索列定义
const searchColumns = computed<TableColumn[]>(() => [
  {
    key: 'status',
    dataKey: 'status',
    title: 'ステータス',
    width: 100,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: '緊急', value: 'critical' },
      { label: '警告', value: 'warning' },
    ],
  },
  {
    key: 'productSku',
    dataKey: 'productSku',
    title: 'SKU',
    width: 120,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'productName',
    dataKey: 'productName',
    title: '商品名',
    width: 180,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
  },
])

// テーブルカラム定義 / 表格列定义
const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'status',
    dataKey: 'status',
    title: 'ステータス',
    width: 90,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: '緊急', value: 'critical' },
      { label: '警告', value: 'warning' },
    ],
    cellRenderer: ({ rowData }: { rowData: LowStockAlert }) => {
      return h('span', { class: getStatusTagClass(rowData.status) }, getStatusLabel(rowData.status))
    },
  },
  {
    key: 'productSku',
    dataKey: 'productSku',
    title: 'SKU',
    width: 130,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: LowStockAlert }) =>
      h('strong', null, rowData.productSku),
  },
  {
    key: 'productName',
    dataKey: 'productName',
    title: '商品名',
    width: 200,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: LowStockAlert }) => rowData.productName || '-',
  },
  {
    key: 'currentStock',
    dataKey: 'currentStock',
    title: '現在庫',
    width: 90,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: LowStockAlert }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.currentStock)),
  },
  {
    key: 'safetyStock',
    dataKey: 'safetyStock',
    title: '安全在庫',
    width: 90,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: LowStockAlert }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.safetyStock)),
  },
  {
    key: 'deficit',
    dataKey: 'deficit',
    title: '不足数',
    width: 90,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: LowStockAlert }) => {
      const textClass = rowData.status === 'critical' ? 'deficit-critical' : 'deficit-warning'
      return h('span', {
        class: textClass,
        style: 'text-align:right;display:block;font-weight:600;',
      }, String(rowData.deficit > 0 ? rowData.deficit : 0))
    },
  },
  {
    key: 'locationCode',
    dataKey: 'locationCode',
    title: 'ロケーション',
    width: 130,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: LowStockAlert }) => rowData.locationCode || '-',
  },
  {
    key: 'reorderSuggestion',
    dataKey: 'reorderSuggestion',
    title: '補充推奨数',
    width: 110,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: LowStockAlert }) =>
      h('span', {
        style: 'text-align:right;display:block;font-weight:600;color:#2563eb;',
      }, String(rowData.reorderSuggestion)),
  },
])

// 検索ハンドラ / 搜索处理
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
  } else {
    globalSearchText.value = ''
  }
}

async function loadData() {
  isLoading.value = true
  try {
    alerts.value = await fetchLowStockAlerts()
  } catch (e: any) {
    showToast(e.message || '安全在庫アラートの取得に失敗しました', 'danger')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.low-stock-alerts {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

.summary-cards {
  display: flex;
  gap: 16px;
  margin: 16px 0;
}

.summary-card {
  flex: 1;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--o-border-color, #e4e7ed);
  background: var(--o-view-background, #fff);
}

.summary-card--danger { border-left: 4px solid #f56c6c; }
.summary-card--warning { border-left: 4px solid #e6a23c; }
.summary-card--info { border-left: 4px solid #409eff; }
.summary-card--reorder { border-left: 4px solid #2563eb; }

.summary-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--o-gray-700, #303133);
}

.summary-label {
  font-size: 13px;
  color: var(--o-gray-500, #909399);
  margin-top: 4px;
}

/* 不足数の色分け / 不足数颜色区分 */
:deep(.deficit-critical) { color: #dc2626; }
:deep(.deficit-warning) { color: #d97706; }
</style>
