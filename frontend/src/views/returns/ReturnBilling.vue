<template>
  <div class="return-billing">
    <ControlPanel :title="t('wms.returns.billing', '返品請求')" :show-search="false" />

    <!-- 期間フィルター / 期间筛选 -->
    <div class="o-card filter-bar">
      <div class="form-field">
        <label class="form-label">{{ t('wms.billing.period', '対象月') }}</label>
        <input v-model="selectedMonth" type="month" class="o-input" @change="loadBilling" />
      </div>
    </div>

    <!-- 合計サマリー / 汇总卡片 -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-label">{{ t('wms.billing.totalCount', '合計件数') }}</div>
        <div class="summary-value">{{ summaryCount }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">{{ t('wms.billing.totalAmount', '合計金額') }}</div>
        <div class="summary-value">&yen;{{ summaryAmount.toLocaleString() }}</div>
      </div>
    </div>

    <!-- 返品請求テーブル / 退货账单表格 -->
    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="billingRows"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[20, 50]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import { apiFetch } from '@/api/http'
import { getApiBaseUrl } from '@/api/base'
import type { TableColumn } from '@/types/table'

const toast = useToast()
const { t } = useI18n()
const API_BASE_URL = getApiBaseUrl()

// デフォルトは当月 / 默认当月
const now = new Date()
const selectedMonth = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

interface ReturnBillingRow {
  _id: string
  date: string
  returnNumber: string
  customerName: string
  productCount: number
  inspectionCharge: number
  returnShippingCost: number
}

const billingRows = ref<ReturnBillingRow[]>([])

const summaryCount = computed(() => billingRows.value.length)
const summaryAmount = computed(() =>
  billingRows.value.reduce((sum, r) => sum + (r.inspectionCharge || 0) + (r.returnShippingCost || 0), 0),
)

const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ja-JP')
}

const tableColumns = computed<TableColumn[]>(() => [
  { key: 'date', dataKey: 'date', title: t('wms.returns.date', '返品日'), width: 120, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: ReturnBillingRow }) => formatDate(rowData.date) },
  { key: 'returnNumber', dataKey: 'returnNumber', title: t('wms.returns.number', '返品番号'), width: 160, fieldType: 'string' },
  { key: 'customerName', dataKey: 'customerName', title: t('wms.common.customerName', '顧客名'), width: 160, fieldType: 'string' },
  { key: 'productCount', dataKey: 'productCount', title: t('wms.returns.productCount', '商品数'), width: 100, fieldType: 'number' },
  { key: 'inspectionCharge', dataKey: 'inspectionCharge', title: t('wms.returns.inspectionCharge', '検品料金'), width: 120, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ReturnBillingRow }) => `¥${(rowData.inspectionCharge || 0).toLocaleString()}` },
  { key: 'returnShippingCost', dataKey: 'returnShippingCost', title: t('wms.returns.shippingCost', '返送料'), width: 120, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ReturnBillingRow }) => `¥${(rowData.returnShippingCost || 0).toLocaleString()}` },
])

// 返品請求データ取得 / 获取退货账单数据
const loadBilling = async () => {
  try {
    const [year, month] = selectedMonth.value.split('-')
    const res = await apiFetch(`${API_BASE_URL}/billing/work-charges?category=return&year=${year}&month=${month}`)
    if (!res.ok) throw new Error(res.statusText)
    const data = await res.json()
    billingRows.value = data.items || data || []
  } catch (e: any) {
    toast.showError(e?.message || t('wms.billing.loadFailed', '請求データの取得に失敗しました'))
  }
}

onMounted(() => {
  loadBilling()
})
</script>

<style scoped>
.return-billing { display: flex; flex-direction: column; padding: 0 20px 20px; gap: 16px; }
:deep(.o-control-panel) { margin-left: -20px; margin-right: -20px; }
.table-section { width: 100%; }
.o-card { background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: var(--o-border-radius, 8px); padding: 1.5rem; }
.filter-bar { display: flex; gap: 1rem; align-items: flex-end; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-label { font-size: 13px; font-weight: 600; color: var(--o-gray-700, #303133); }
.o-input { padding: 8px 12px; border: 1px solid var(--o-border-color, #dcdfe6); border-radius: var(--o-border-radius, 4px); font-size: 14px; color: var(--o-gray-700, #303133); background: var(--o-view-background, #fff); width: 100%; }
.summary-cards { display: flex; gap: 1rem; }
.summary-card { flex: 1; background: var(--o-view-background, #fff); border: 1px solid var(--o-border-color, #e4e7ed); border-radius: var(--o-border-radius, 8px); padding: 1.25rem; text-align: center; }
.summary-label { font-size: 13px; color: var(--o-gray-500, #909399); margin-bottom: 4px; }
.summary-value { font-size: 24px; font-weight: 700; color: var(--o-brand-primary, #714b67); }
</style>
