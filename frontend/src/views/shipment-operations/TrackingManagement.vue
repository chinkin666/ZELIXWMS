<template>
  <div class="tracking-management">
    <PageHeader :title="t('wms.shipment.trackingManagement', '配送伝票管理')" :show-search="false" />

    <!-- 検索・フィルター / 搜索与过滤 -->
    <div class="search-form rounded-lg border bg-card p-4">
      <div class="form-grid">
        <div class="form-field">
          <label>{{ t('wms.shipment.searchKeyword', '検索キーワード') }}</label>
          <input
            v-model="searchKeyword"
            type="text"
           
            :placeholder="t('wms.shipment.searchPlaceholder', '伝票番号 or 管理番号...')"
            @keyup.enter="handleSearch"
          />
        </div>
        <div class="form-field">
          <label>{{ t('wms.shipment.trackingFilter', 'フィルター') }}</label>
          <Select v-model="trackingFilter">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t('wms.shipment.filterAll', '全て') }}</SelectItem>
              <SelectItem value="with">{{ t('wms.shipment.filterWithTracking', '伝票あり') }}</SelectItem>
              <SelectItem value="without">{{ t('wms.shipment.filterWithoutTracking', '伝票なし') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="form-field form-field--action">
          <Button variant="default" :disabled="isLoading" @click="handleSearch">
            {{ isLoading ? t('wms.shipment.searching', '検索中...') : t('wms.shipment.search', '検索') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- 配送伝票テーブル / 配送传票表格 -->
    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="filteredRows"
        row-key="_id"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
/**
 * 配送伝票管理画面 / 配送传票管理页面
 *
 * 出荷指示の伝票番号（トラッキング番号）を一覧管理する。
 * 管理出货指示的传票号码（追踪号码）列表。
 */
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DataTable } from '@/components/data-table'
import type { TableColumn } from '@/types/table'
import { apiFetch } from '@/api/http'
import { getApiBaseUrl } from '@/api/base'
import { computed, h, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
interface TrackingRow {
  _id: string
  shipmentNumber: string
  customerOrderNumber: string
  trackingNumber: string
  carrier: string
  shipDate: string
  deliveryStatus: string
  recipientName: string
  recipientPrefecture: string
  coolType: string
  invoiceType: string
}

const toast = useToast()
const { t } = useI18n()

const rows = ref<TrackingRow[]>([])
const searchKeyword = ref('')
const trackingFilter = ref<'all' | 'with' | 'without'>('all')
const isLoading = ref(false)

// フィルター適用 / 应用过滤
const filteredRows = computed(() => {
  let result = rows.value
  if (trackingFilter.value === 'with') {
    result = result.filter(r => r.trackingNumber)
  } else if (trackingFilter.value === 'without') {
    result = result.filter(r => !r.trackingNumber)
  }
  return result
})

// ステータスバッジクラス / 状态徽章样式
const getStatusClass = (status: string): string => {
  switch (status) {
    case 'delivered': return 'o-status-tag o-status-tag--success'
    case 'in_transit': return 'o-status-tag o-status-tag--warning'
    case 'pending': return 'o-status-tag o-status-tag--info'
    default: return 'o-status-tag'
  }
}

// ステータスラベル / 状态标签
const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'delivered': return '配達済'
    case 'in_transit': return '配送中'
    case 'pending': return '未出荷'
    case 'shipped': return '出荷済'
    default: return status || '-'
  }
}

// 日付フォーマット / 日期格式化
const formatDate = (d: string) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'shipmentNumber', dataKey: 'shipmentNumber',
    title: t('wms.shipment.shipmentNumber', '出荷管理No'), width: 150, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) =>
      h('span', { style: 'font-family:monospace;font-size:12px;color:var(--o-brand-primary,#714b67);' }, rowData.shipmentNumber || '-'),
  },
  {
    key: 'customerOrderNumber', dataKey: 'customerOrderNumber',
    title: t('wms.shipment.customerOrderNumber', 'お客様管理番号'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) => rowData.customerOrderNumber || '-',
  },
  {
    key: 'trackingNumber', dataKey: 'trackingNumber',
    title: t('wms.shipment.trackingNumber', '伝票番号'), width: 160, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) =>
      rowData.trackingNumber
        ? h('strong', { style: 'font-family:monospace;' }, rowData.trackingNumber)
        : h('span', { style: 'color:#909399;' }, '未発行'),
  },
  {
    key: 'carrier', dataKey: 'carrier',
    title: t('wms.shipment.carrier', '配送業者'), width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) => rowData.carrier || '-',
  },
  {
    key: 'shipDate', dataKey: 'shipDate',
    title: t('wms.shipment.shipDate', '出荷日'), width: 120, fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) => formatDate(rowData.shipDate),
  },
  {
    key: 'deliveryStatus', dataKey: 'deliveryStatus',
    title: t('wms.shipment.deliveryStatus', '配達状況'), width: 110, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) =>
      h('span', { class: getStatusClass(rowData.deliveryStatus) }, getStatusLabel(rowData.deliveryStatus)),
  },
  {
    key: 'recipientName', dataKey: 'recipientName',
    title: t('wms.shipment.recipientName', 'お届け先名'), width: 140, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) => rowData.recipientName || '-',
  },
  {
    key: 'recipientPrefecture', dataKey: 'recipientPrefecture',
    title: t('wms.shipment.recipientPrefecture', '都道府県'), width: 100, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) => rowData.recipientPrefecture || '-',
  },
  {
    key: 'coolType', dataKey: 'coolType',
    title: t('wms.shipment.coolType', 'クール区分'), width: 100, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) => {
      const label: Record<string, string> = { '0': '通常', '1': '冷蔵', '2': '冷凍' }
      return label[rowData.coolType] ?? rowData.coolType ?? '-'
    },
  },
  {
    key: 'invoiceType', dataKey: 'invoiceType',
    title: t('wms.shipment.invoiceTypeCol', '送り状種別'), width: 120, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: TrackingRow }) => rowData.invoiceType || '-',
  },
])

// 検索実行 / 执行搜索
const handleSearch = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    if (searchKeyword.value) params.set('q', searchKeyword.value)
    params.set('limit', '200')
    const res = await apiFetch(`${getApiBaseUrl()}/shipment-orders?${params}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(err.message || '取得に失敗しました')
    }
    const data = await res.json()
    const items = Array.isArray(data) ? data : data.items || data.data || []
    // APIフィールド→画面フィールドマッピング / API字段→画面字段映射
    rows.value = items.map((o: any) => ({
      _id: o._id,
      shipmentNumber: o.orderNumber || '',
      customerOrderNumber: o.customerManagementNumber || '',
      trackingNumber: o.trackingId || '',
      carrier: o.carrierId === '__builtin_yamato_b2__' ? 'ヤマト運輸' : o.carrierId?.includes('sagawa') ? '佐川急便' : (o.carrierId || ''),
      shipDate: o.statusShippedAt || o.createdAt || '',
      deliveryStatus: o.statusShipped ? (o.statusCarrierReceived ? 'delivered' : 'shipped') : 'pending',
      recipientName: o.recipient?.name ?? '',
      recipientPrefecture: o.recipient?.prefecture ?? '',
      coolType: o.coolType ?? '',
      invoiceType: o.invoiceType ?? '',
    }))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '出荷データの取得に失敗しました'
    toast.showError(msg)
  } finally {
    isLoading.value = false
  }
}

// 初期ロード / 初始加载
onMounted(handleSearch)
</script>

<style scoped>
.tracking-management {
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
  flex: 1;
}

.form-field--action {
  flex: 0;
  padding-bottom: 0;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-700, #303133);
}

.{
  padding: 8px 12px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  font-size: 14px;
  color: var(--o-gray-700, #303133);
  background: var(--o-view-background, #fff);
  width: 100%;
}

.table-section {
  width: 100%;
}

@media (max-width: 768px) {
  .form-grid { flex-direction: column; }
}
</style>
