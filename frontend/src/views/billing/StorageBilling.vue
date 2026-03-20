<template>
  <div class="storage-billing">
    <ControlPanel :title="t('wms.billing.storageBilling', '在庫保管請求')" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="exportCsv">{{ t('wms.billing.csvExport', 'CSV出力') }}</OButton>
      </template>
    </ControlPanel>

    <!-- 期間選択 / 期间选择 -->
    <div class="search-form o-card">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">{{ t('wms.billing.period', '対象月') }}</label>
          <input v-model="period" type="month" class="o-input" />
        </div>
        <div class="form-field form-field--action">
          <OButton variant="primary" :disabled="isLoading" @click="handleSearch">
            {{ isLoading ? t('wms.billing.searching', '検索中...') : t('wms.billing.search', '検索') }}
          </OButton>
        </div>
      </div>
    </div>

    <!-- サマリーカード / 摘要卡片 -->
    <div class="summary-cards">
      <div class="summary-card summary-card--info">
        <div class="summary-value">{{ summary.skuCount }}</div>
        <div class="summary-label">{{ t('wms.billing.storageSku', '保管SKU数') }}</div>
      </div>
      <div class="summary-card summary-card--warning">
        <div class="summary-value">{{ summary.totalDays }}</div>
        <div class="summary-label">{{ t('wms.billing.storageDays', '保管日数') }}</div>
      </div>
      <div class="summary-card summary-card--reorder">
        <div class="summary-value">¥{{ summary.totalFee.toLocaleString() }}</div>
        <div class="summary-label">{{ t('wms.billing.storageFeeTotal', '保管料金合計') }}</div>
      </div>
    </div>

    <!-- 明細テーブル / 明细表格 -->
    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="rows"
        row-key="sku"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="client"
        :page-size="20"
        :page-sizes="[20, 50, 100]"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 在庫保管請求画面 / 库存保管费用页面
 *
 * 月次の在庫保管料金を表示する。
 * 显示月度库存保管费用。
 */
import { computed, h, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import { apiFetch } from '@/api/base'

interface StorageRow {
  sku: string
  productName: string
  avgQuantity: number
  storageDays: number
  unitPrice: number
  storageFee: number
}

const toast = useToast()
const { t } = useI18n()

// デフォルト: 今月 / 默认: 当月
const now = new Date()
const period = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const rows = ref<StorageRow[]>([])
const isLoading = ref(false)

// サマリー計算 / 摘要计算
const summary = computed(() => ({
  skuCount: rows.value.length,
  totalDays: rows.value.reduce((sum, r) => sum + r.storageDays, 0),
  totalFee: rows.value.reduce((sum, r) => sum + r.storageFee, 0),
}))

const tableColumns = computed<TableColumn[]>(() => [
  { key: 'sku', dataKey: 'sku', title: 'SKU', width: 140, fieldType: 'string' },
  {
    key: 'productName', dataKey: 'productName',
    title: t('wms.billing.productName', '商品名'), width: 200, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: StorageRow }) => rowData.productName || '-',
  },
  {
    key: 'avgQuantity', dataKey: 'avgQuantity',
    title: t('wms.billing.avgQuantity', '平均在庫数'), width: 110, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StorageRow }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.avgQuantity)),
  },
  {
    key: 'storageDays', dataKey: 'storageDays',
    title: t('wms.billing.storageDays', '保管日数'), width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StorageRow }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.storageDays)),
  },
  {
    key: 'unitPrice', dataKey: 'unitPrice',
    title: t('wms.billing.unitPrice', '単価'), width: 90, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StorageRow }) =>
      h('span', { style: 'text-align:right;display:block;' }, `¥${rowData.unitPrice}`),
  },
  {
    key: 'storageFee', dataKey: 'storageFee',
    title: t('wms.billing.storageFee', '保管料金'), width: 120, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: StorageRow }) =>
      h('span', { style: 'text-align:right;display:block;font-weight:700;color:#2563eb;' }, `¥${rowData.storageFee.toLocaleString()}`),
  },
])

// 検索実行 / 执行搜索
const handleSearch = async () => {
  isLoading.value = true
  try {
    const res = await apiFetch(`/api/billing?period=${period.value}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message || '取得に失敗しました')
    }
    const data = await res.json()
    rows.value = data.items || data.storageDetails || data || []
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '保管料データの取得に失敗しました'
    toast.showError(msg)
  } finally {
    isLoading.value = false
  }
}

// CSV出力 / CSV导出
const exportCsv = () => {
  const csvRows: string[] = [
    ['SKU', t('wms.billing.productName', '商品名'), t('wms.billing.avgQuantity', '平均在庫数'),
     t('wms.billing.storageDays', '保管日数'), t('wms.billing.unitPrice', '単価'),
     t('wms.billing.storageFee', '保管料金')].join(','),
  ]
  for (const r of rows.value) {
    csvRows.push([
      `"${r.sku}"`, `"${r.productName || ''}"`,
      String(r.avgQuantity), String(r.storageDays),
      String(r.unitPrice), String(r.storageFee),
    ].join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `storage_billing_${period.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.storage-billing {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.o-card {
  background: var(--o-view-background, #fff);
  border: 1px solid var(--o-border-color, #e4e7ed);
  border-radius: var(--o-border-radius, 8px);
  padding: 1.5rem;
}

.form-grid {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-field--action {
  padding-bottom: 0;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.o-input {
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
}

.summary-cards {
  display: flex;
  gap: 16px;
}

.summary-card {
  flex: 1;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--o-border-color, #e4e7ed);
  background: var(--o-view-background, #fff);
}

.summary-card--info { border-left: 4px solid #409eff; }
.summary-card--warning { border-left: 4px solid #e6a23c; }
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

.table-section {
  width: 100%;
}

@media (max-width: 768px) {
  .form-grid { flex-direction: column; }
  .summary-cards { flex-direction: column; }
}
</style>
