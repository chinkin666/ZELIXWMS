<template>
  <div class="inventory-ledger-view">
    <ControlPanel :title="t('wms.inventory.ledgerView', '受払一覧')" :show-search="false">
      <template #actions>
        <OButton variant="secondary" size="sm" @click="exportCsv">{{ t('wms.inventory.csvExport', 'CSV出力') }}</OButton>
      </template>
    </ControlPanel>

    <!-- 検索フォーム / 搜索表单 -->
    <div class="search-form o-card">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.startDate', '開始日') }}</label>
          <input v-model="startDate" type="date" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.endDate', '終了日') }}</label>
          <input v-model="endDate" type="date" class="o-input" />
        </div>
        <div class="form-field form-field--action">
          <OButton variant="primary" :disabled="isLoading" @click="handleSearch">
            {{ isLoading ? t('wms.inventory.searching', '検索中...') : t('wms.inventory.search', '検索') }}
          </OButton>
        </div>
      </div>
    </div>

    <!-- 受払テーブル / 收发一览表 -->
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
 * 受払一覧画面 / 收发一览页面
 *
 * 指定期間の在庫受払を集計表示する。
 * 显示指定期间的库存收发汇总。
 */
import { computed, h, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import { apiFetch } from '@/api/base'

interface LedgerRow {
  sku: string
  productName: string
  openingBalance: number
  inboundQty: number
  outboundQty: number
  adjustmentQty: number
  closingBalance: number
}

const toast = useToast()
const { t } = useI18n()

// デフォルト: 今月初〜今日 / 默认: 当月初至今天
const now = new Date()
const startDate = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
const endDate = ref(now.toISOString().slice(0, 10))
const rows = ref<LedgerRow[]>([])
const isLoading = ref(false)

const tableColumns = computed<TableColumn[]>(() => [
  { key: 'sku', dataKey: 'sku', title: 'SKU', width: 140, fieldType: 'string' },
  {
    key: 'productName', dataKey: 'productName',
    title: t('wms.inventory.productName', '商品名'), width: 200, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: LedgerRow }) => rowData.productName || '-',
  },
  {
    key: 'openingBalance', dataKey: 'openingBalance',
    title: t('wms.inventory.openingBalance', '前期繰越'), width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: LedgerRow }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.openingBalance)),
  },
  {
    key: 'inboundQty', dataKey: 'inboundQty',
    title: t('wms.inventory.inboundQty', '入庫数'), width: 90, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: LedgerRow }) =>
      h('span', { style: 'text-align:right;display:block;color:#67c23a;font-weight:600;' }, `+${rowData.inboundQty}`),
  },
  {
    key: 'outboundQty', dataKey: 'outboundQty',
    title: t('wms.inventory.outboundQty', '出庫数'), width: 90, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: LedgerRow }) =>
      h('span', { style: 'text-align:right;display:block;color:#f56c6c;font-weight:600;' }, `-${rowData.outboundQty}`),
  },
  {
    key: 'adjustmentQty', dataKey: 'adjustmentQty',
    title: t('wms.inventory.adjustmentQty', '調整数'), width: 90, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: LedgerRow }) => {
      const val = rowData.adjustmentQty
      const color = val > 0 ? '#67c23a' : val < 0 ? '#f56c6c' : '#909399'
      const prefix = val > 0 ? '+' : ''
      return h('span', { style: `text-align:right;display:block;color:${color};font-weight:600;` }, `${prefix}${val}`)
    },
  },
  {
    key: 'closingBalance', dataKey: 'closingBalance',
    title: t('wms.inventory.closingBalance', '期末残'), width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: LedgerRow }) =>
      h('span', { style: 'text-align:right;display:block;font-weight:700;' }, String(rowData.closingBalance)),
  },
])

// 検索実行 / 执行搜索
const handleSearch = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams({ startDate: startDate.value, endDate: endDate.value })
    const res = await apiFetch(`/api/inventory/ledger-summary?${params}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message || '取得に失敗しました')
    }
    const data = await res.json()
    rows.value = data.items || data || []
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '受払データの取得に失敗しました'
    toast.showError(msg)
  } finally {
    isLoading.value = false
  }
}

// CSV出力 / CSV导出
const exportCsv = () => {
  const csvRows: string[] = [
    ['SKU', t('wms.inventory.productName', '商品名'), t('wms.inventory.openingBalance', '前期繰越'),
     t('wms.inventory.inboundQty', '入庫数'), t('wms.inventory.outboundQty', '出庫数'),
     t('wms.inventory.adjustmentQty', '調整数'), t('wms.inventory.closingBalance', '期末残')].join(','),
  ]
  for (const r of rows.value) {
    csvRows.push([
      `"${r.sku}"`, `"${r.productName || ''}"`,
      String(r.openingBalance), String(r.inboundQty), String(r.outboundQty),
      String(r.adjustmentQty), String(r.closingBalance),
    ].join(','))
  }
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ledger_${startDate.value}_${endDate.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.inventory-ledger-view {
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

.table-section {
  width: 100%;
}

@media (max-width: 768px) {
  .form-grid { flex-direction: column; }
}
</style>
