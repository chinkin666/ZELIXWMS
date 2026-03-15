<template>
  <div class="expiry-alerts">
    <ControlPanel :title="t('wms.inventory.expiryAlerts', '賞味期限アラート')" :show-search="false">
      <template #center>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:13px;color:#606266;">{{ t('wms.inventory.displayPeriod', '表示期間') }}</span>
          <select v-model="daysAhead" class="o-input" style="width:120px;" @change="loadData">
            <option :value="7">{{ t('wms.inventory.withinDays', '{n}日以内', { n: '7' }) }}</option>
            <option :value="14">{{ t('wms.inventory.withinDays', '{n}日以内', { n: '14' }) }}</option>
            <option :value="30">{{ t('wms.inventory.withinDays', '{n}日以内', { n: '30' }) }}</option>
            <option :value="60">{{ t('wms.inventory.withinDays', '{n}日以内', { n: '60' }) }}</option>
            <option :value="90">{{ t('wms.inventory.withinDays', '{n}日以内', { n: '90' }) }}</option>
          </select>
        </div>
      </template>
      <template #actions>
        <OButton variant="secondary" size="sm" :disabled="isUpdating" @click="handleUpdateExpired">
          {{ isUpdating ? t('wms.inventory.updating', '更新中...') : t('wms.inventory.batchUpdateExpired', '期限切れ一括更新') }}
        </OButton>
      </template>
    </ControlPanel>

    <!-- サマリーカード -->
    <div class="summary-cards">
      <div class="summary-card summary-card--danger">
        <div class="summary-value">{{ expiredCount }}</div>
        <div class="summary-label">{{ t('wms.inventory.expired', '期限切れ') }}</div>
      </div>
      <div class="summary-card summary-card--warning">
        <div class="summary-value">{{ warningCount }}</div>
        <div class="summary-label">{{ t('wms.inventory.nearExpiry', '期限間近') }}</div>
      </div>
      <div class="summary-card summary-card--info">
        <div class="summary-value">{{ alerts.length }}</div>
        <div class="summary-label">{{ t('wms.inventory.total', '合計') }}</div>
      </div>
    </div>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="expiryAlertsSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="alerts"
        :height="520"
        row-key="lotId"
        pagination-enabled
        pagination-mode="client"
        :global-search-text="globalSearchText"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import { fetchExpiryAlerts, updateExpiredLots } from '@/api/lot'
import type { ExpiryAlert } from '@/types/inventory'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

const { show: showToast } = useToast()
const { t } = useI18n()

const alerts = ref<ExpiryAlert[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)
const daysAhead = ref(30)
const globalSearchText = ref('')

const expiredCount = computed(() => alerts.value.filter(a => a.isExpired).length)
const warningCount = computed(() => alerts.value.filter(a => !a.isExpired).length)

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('ja-JP') : ''
}

// Column definitions
const searchColumns = computed<TableColumn[]>(() => [
  {
    key: 'isExpired',
    dataKey: 'isExpired',
    title: t('wms.inventory.status', '状態'),
    width: 80,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.expired', '期限切れ'), value: 'true' },
      { label: t('wms.inventory.nearExpiry', '期限間近'), value: 'false' },
    ],
  },
  {
    key: 'lotNumber',
    dataKey: 'lotNumber',
    title: t('wms.inventory.lotNumber', 'ロット番号'),
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
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
])

const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'isExpired',
    dataKey: 'isExpired',
    title: t('wms.inventory.status', '状態'),
    width: 80,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.expired', '期限切れ'), value: 'true' },
      { label: t('wms.inventory.nearExpiry', '期限間近'), value: 'false' },
    ],
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) =>
      h(
        'span',
        { class: `o-status-tag ${rowData.isExpired ? 'o-status-tag--error' : 'o-status-tag--pending'}` },
        rowData.isExpired ? t('wms.inventory.expired', '期限切れ') : t('wms.inventory.nearExpiry', '期限間近'),
      ),
  },
  {
    key: 'lotNumber',
    dataKey: 'lotNumber',
    title: t('wms.inventory.lotNumber', 'ロット番号'),
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) =>
      h('strong', null, rowData.lotNumber),
  },
  {
    key: 'productSku',
    dataKey: 'productSku',
    title: 'SKU',
    width: 120,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) => rowData.productSku,
  },
  {
    key: 'productName',
    dataKey: 'productName',
    title: t('wms.inventory.productName', '商品名'),
    width: 180,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) => rowData.productName || '-',
  },
  {
    key: 'expiryDate',
    dataKey: 'expiryDate',
    title: t('wms.inventory.expiryDate', '賞味期限'),
    width: 120,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) =>
      h(
        'span',
        { class: rowData.isExpired ? 'expiry-expired' : 'expiry-warning' },
        formatDate(rowData.expiryDate),
      ),
  },
  {
    key: 'daysUntilExpiry',
    dataKey: 'daysUntilExpiry',
    title: t('wms.inventory.daysRemaining', '残り日数'),
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) => {
      if (rowData.daysUntilExpiry === null) return '-'
      const cls = rowData.daysUntilExpiry < 0 ? 'expiry-expired' : 'expiry-warning'
      const text = rowData.daysUntilExpiry < 0
        ? `${Math.abs(rowData.daysUntilExpiry)}${t('wms.inventory.daysOverdue', '日超過')}`
        : `${rowData.daysUntilExpiry}${t('wms.inventory.days', '日')}`
      return h('span', { class: cls, style: 'text-align:center;display:block;' }, text)
    },
  },
  {
    key: 'totalQuantity',
    dataKey: 'totalQuantity',
    title: t('wms.inventory.stockQuantity', '在庫数'),
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.totalQuantity)),
  },
  {
    key: 'totalAvailable',
    dataKey: 'totalAvailable',
    title: t('wms.inventory.availableStock', '有効在庫'),
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.totalAvailable)),
  },
])

// Search handler
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
    const res = await fetchExpiryAlerts(daysAhead.value)
    alerts.value = res.alerts
  } catch (e: any) {
    // アラート取得エラー / Alert fetch error
  } finally {
    isLoading.value = false
  }
}

async function handleUpdateExpired() {
  if (!confirm(t('wms.inventory.confirmBatchUpdate', '期限切れのロットステータスを一括更新しますか？'))) return
  isUpdating.value = true
  try {
    const res = await updateExpiredLots()
    showToast(res.message, 'success')
    await loadData()
  } catch (e: any) {
    showToast(e.response?.data?.message || t('wms.inventory.errorOccurred', 'エラーが発生しました'), 'danger')
  } finally {
    isUpdating.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.expiry-alerts {
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

:deep(.expiry-expired) { color: #f56c6c; font-weight: 600; }
:deep(.expiry-warning) { color: #e6a23c; font-weight: 500; }
</style>
