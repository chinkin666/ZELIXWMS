<template>
  <div class="expiry-alerts">
    <PageHeader :title="t('wms.inventory.expiryAlerts', '賞味期限アラート')" :show-search="false">
      <template #center>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:13px;color:#606266;">{{ t('wms.inventory.displayPeriod', '表示期間') }}</span>
          <Select :model-value="String(daysAhead)" @update:model-value="(v: string) => { daysAhead = Number(v); loadData() }">
            <SelectTrigger style="width:120px;"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{{ t('wms.inventory.withinDays', { n: '7' }) }}</SelectItem>
              <SelectItem value="14">{{ t('wms.inventory.withinDays', { n: '14' }) }}</SelectItem>
              <SelectItem value="30">{{ t('wms.inventory.withinDays', { n: '30' }) }}</SelectItem>
              <SelectItem value="60">{{ t('wms.inventory.withinDays', { n: '60' }) }}</SelectItem>
              <SelectItem value="90">{{ t('wms.inventory.withinDays', { n: '90' }) }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </template>
      <template #actions>
        <Button variant="secondary" size="sm" :disabled="isUpdating" @click="handleUpdateExpired">
          {{ isUpdating ? t('wms.inventory.updating', '更新中...') : t('wms.inventory.batchUpdateExpired', '期限切れ一括更新') }}
        </Button>
      </template>
    </PageHeader>

    <!-- サマリーカード / 摘要卡片 -->
    <div class="summary-cards">
      <div class="summary-card summary-card--danger">
        <div class="summary-value">{{ expiredCount }}</div>
        <div class="summary-label">{{ t('wms.inventory.expired', '期限切れ') }}</div>
      </div>
      <div class="summary-card summary-card--critical">
        <div class="summary-value">{{ criticalCount }}</div>
        <div class="summary-label">{{ t('wms.inventory.within7Days', '7日以内') }}</div>
      </div>
      <div class="summary-card summary-card--warning">
        <div class="summary-value">{{ cautionCount }}</div>
        <div class="summary-label">{{ t('wms.inventory.within30Days', '30日以内') }}</div>
      </div>
      <div class="summary-card summary-card--info">
        <div class="summary-value">{{ alerts.length }}</div>
        <div class="summary-label">{{ t('wms.inventory.total', '合計') }}</div>
      </div>
    </div>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="alerts"
        row-key="lotId"
        pagination-enabled
        pagination-mode="client"
        :global-search-text="globalSearchText"
        :search-columns="searchColumns"
        @search="handleSearch"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PageHeader from '@/components/shared/PageHeader.vue'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import { fetchExpiryAlerts, updateExpiredLots } from '@/api/lot'
import type { ExpiryAlert } from '@/types/inventory'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { ref, computed, h, onMounted } from 'vue'
import { Badge } from '@/components/ui/badge'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
const { confirm } = useConfirmDialog()
const { show: showToast } = useToast()
const { t } = useI18n()

const alerts = ref<ExpiryAlert[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)
const daysAhead = ref(30)
const globalSearchText = ref('')

const expiredCount = computed(() => alerts.value.filter(a => a.isExpired).length)
// 7日以内（期限切れ除く） / 7日以内（已过期除外）
const criticalCount = computed(() =>
  alerts.value.filter(a => !a.isExpired && a.daysUntilExpiry !== null && a.daysUntilExpiry <= 7).length,
)
// 8〜30日 / 8~30天
const cautionCount = computed(() =>
  alerts.value.filter(a => !a.isExpired && a.daysUntilExpiry !== null && a.daysUntilExpiry > 7 && a.daysUntilExpiry <= 30).length,
)

/**
 * 緊急度レベルを判定 / 判断紧急程度
 * - 'expired': 期限切れ / 已过期
 * - 'critical': 7日以内 / 7天以内
 * - 'warning': 30日以内 / 30天以内
 * - 'caution': それ以外 / 其他
 */
function getUrgencyLevel(alert: ExpiryAlert): 'expired' | 'critical' | 'warning' | 'caution' {
  if (alert.isExpired) return 'expired'
  if (alert.daysUntilExpiry === null) return 'caution'
  if (alert.daysUntilExpiry <= 7) return 'critical'
  if (alert.daysUntilExpiry <= 30) return 'warning'
  return 'caution'
}

/** 緊急度に応じたCSSクラスを返す / 根据紧急程度返回CSS类 */
function getUrgencyTagClass(level: string): string {
  const map: Record<string, string> = {
    expired: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800',
    critical: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium expiry-tag--critical',
    warning: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium expiry-tag--warning',
    caution: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium expiry-tag--caution',
  }
  return map[level] ?? 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground'
}

/** 緊急度に応じたテキスト色クラスを返す / 根据紧急程度返回文本颜色类 */
function getUrgencyTextClass(level: string): string {
  const map: Record<string, string> = {
    expired: 'expiry-expired',
    critical: 'expiry-critical',
    warning: 'expiry-warning',
    caution: 'expiry-caution',
  }
  return map[level] ?? ''
}

/** 緊急度に応じたラベルを返す / 根据紧急程度返回标签 */
function getUrgencyLabel(level: string): string {
  const map: Record<string, string> = {
    expired: t('wms.inventory.expired', '期限切れ'),
    critical: t('wms.inventory.critical', '緊急'),
    warning: t('wms.inventory.nearExpiry', '期限間近'),
    caution: t('wms.inventory.approaching', '注意'),
  }
  return map[level] ?? ''
}

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
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) => {
      const level = getUrgencyLevel(rowData)
      return h('span', { class: getUrgencyTagClass(level) }, getUrgencyLabel(level))
    },
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
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) => {
      const level = getUrgencyLevel(rowData)
      return h('span', { class: getUrgencyTextClass(level) }, formatDate(rowData.expiryDate))
    },
  },
  {
    key: 'daysUntilExpiry',
    dataKey: 'daysUntilExpiry',
    title: t('wms.inventory.daysRemaining', '残り日数'),
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ExpiryAlert }) => {
      if (rowData.daysUntilExpiry === null) return '-'
      const level = getUrgencyLevel(rowData)
      const text = rowData.daysUntilExpiry < 0
        ? `${Math.abs(rowData.daysUntilExpiry)}${t('wms.inventory.daysOverdue', '日超過')}`
        : `${rowData.daysUntilExpiry}${t('wms.inventory.days', '日')}`
      return h('span', { class: getUrgencyTextClass(level), style: 'text-align:center;display:block;' }, text)
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
    showToast(e?.message || 'データの取得に失敗しました', 'danger')
  } finally {
    isLoading.value = false
  }
}

async function handleUpdateExpired() {
  if (!(await confirm('この操作を実行しますか？'))) return
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
.summary-card--critical { border-left: 4px solid #e65100; }
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

/* 緊急度別テキスト色 / 按紧急程度区分文本颜色 */
:deep(.expiry-expired) { color: #dc2626; font-weight: 600; }
:deep(.expiry-critical) { color: #e65100; font-weight: 600; }
:deep(.expiry-warning) { color: #d97706; font-weight: 500; }
:deep(.expiry-caution) { color: #65a30d; font-weight: 500; }

/* 緊急度別タグ / 按紧急程度区分标签 */
:deep(.expiry-tag--critical) { background: #fff3e0; color: #e65100; }
:deep(.expiry-tag--warning) { background: #fef3c7; color: #d97706; }
:deep(.expiry-tag--caution) { background: #ecfccb; color: #65a30d; }
</style>
