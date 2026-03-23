<template>
  <div class="replenishment-approval">
    <PageHeader :title="t('wms.inventory.replenishmentApproval', '補充承認')" :show-search="false">
      <template #actions>
        <Button
          variant="default"
          size="sm"
          :disabled="selectedIds.length === 0 || isProcessing"
          @click="bulkApprove"
        >
          {{ t('wms.inventory.bulkApprove', '一括承認') }} ({{ selectedIds.length }})
        </Button>
        <Button variant="secondary" size="sm" :disabled="isLoading" @click="loadData">
          {{ isLoading ? '読込中...' : '再読込' }}
        </Button>
      </template>
    </PageHeader>

    <!-- 補充承認テーブル / 补充审批表格 -->
    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="rows"
        row-key="productId"
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
/**
 * 補充承認画面 / 补充审批页面
 *
 * 低在庫アラートから補充リクエストの承認・却下を行う。
 * 从低库存警报中审批或拒绝补充请求。
 */
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DataTable } from '@/components/data-table'
import type { TableColumn } from '@/types/table'
import { fetchLowStockAlerts } from '@/api/inventory'
import type { LowStockAlert } from '@/types/inventory'
import { computed, h, onMounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
interface ApprovalRow extends LowStockAlert {
  approvalStatus: 'pending' | 'approved' | 'rejected'
}

const toast = useToast()
const { t } = useI18n()

const rows = ref<ApprovalRow[]>([])
const isLoading = ref(false)
const isProcessing = ref(false)
const selectedIds = ref<string[]>([])

// ステータスバッジ / 状态徽章
const getStatusClass = (status: string): string => {
  switch (status) {
    case 'approved': return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium--success'
    case 'rejected': return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'
    default: return 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium--warning'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'approved': return '承認済'
    case 'rejected': return '却下'
    default: return '未承認'
  }
}

// チェックボックストグル / 复选框切换
const toggleSelect = (productId: string) => {
  const idx = selectedIds.value.indexOf(productId)
  if (idx >= 0) {
    selectedIds.value = selectedIds.value.filter(id => id !== productId)
  } else {
    selectedIds.value = [...selectedIds.value, productId]
  }
}

// 個別承認 / 单独审批
const approveRow = (productId: string) => {
  rows.value = rows.value.map(r =>
    r.productId === productId ? { ...r, approvalStatus: 'approved' as const } : r,
  )
  toast.showSuccess(t('wms.inventory.approved', '承認しました'))
}

// 個別却下 / 单独拒绝
const rejectRow = (productId: string) => {
  rows.value = rows.value.map(r =>
    r.productId === productId ? { ...r, approvalStatus: 'rejected' as const } : r,
  )
  toast.showSuccess(t('wms.inventory.rejected', '却下しました'))
}

// 一括承認 / 批量审批
const bulkApprove = () => {
  isProcessing.value = true
  rows.value = rows.value.map(r =>
    selectedIds.value.includes(r.productId) ? { ...r, approvalStatus: 'approved' as const } : r,
  )
  toast.showSuccess(t('wms.inventory.bulkApproved', `${selectedIds.value.length}件を承認しました`))
  selectedIds.value = []
  isProcessing.value = false
}

const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'select', title: '', width: 40, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ApprovalRow }) => {
      if (rowData.approvalStatus !== 'pending') return ''
      return h('input', {
        type: 'checkbox',
        checked: selectedIds.value.includes(rowData.productId),
        onChange: () => toggleSelect(rowData.productId),
      })
    },
  },
  { key: 'productSku', dataKey: 'productSku', title: 'SKU', width: 130, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ApprovalRow }) => h('strong', null, rowData.productSku),
  },
  {
    key: 'productName', dataKey: 'productName',
    title: t('wms.inventory.productName', '商品名'), width: 180, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ApprovalRow }) => rowData.productName || '-',
  },
  {
    key: 'currentStock', dataKey: 'currentStock',
    title: t('wms.inventory.currentStock', '現在庫'), width: 80, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ApprovalRow }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.currentStock)),
  },
  {
    key: 'safetyStock', dataKey: 'safetyStock',
    title: t('wms.inventory.safetyStock', '安全在庫'), width: 80, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ApprovalRow }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.safetyStock)),
  },
  {
    key: 'deficit', dataKey: 'deficit',
    title: t('wms.inventory.deficit', '不足数'), width: 80, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ApprovalRow }) =>
      h('span', { style: 'text-align:right;display:block;font-weight:600;color:#dc2626;' },
        String(rowData.deficit > 0 ? rowData.deficit : 0)),
  },
  {
    key: 'reorderSuggestion', dataKey: 'reorderSuggestion',
    title: t('wms.inventory.reorderSuggestion', '補充推奨数'), width: 110, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ApprovalRow }) =>
      h('span', { style: 'text-align:right;display:block;font-weight:600;color:#2563eb;' },
        String(rowData.reorderSuggestion)),
  },
  {
    key: 'approvalStatus', dataKey: 'approvalStatus',
    title: t('wms.inventory.approvalStatus', '承認ステータス'), width: 110, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ApprovalRow }) =>
      h('span', { class: getStatusClass(rowData.approvalStatus) },
        getStatusLabel(rowData.approvalStatus)),
  },
  {
    key: 'actions', title: t('wms.inventory.actions', '操作'), width: 150, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ApprovalRow }) => {
      if (rowData.approvalStatus !== 'pending') return '-'
      return h('div', { style: 'display:flex;gap:6px;' }, [
        h('button', {
          class: 'action-btn action-btn--approve',
          onClick: () => approveRow(rowData.productId),
        }, '承認'),
        h('button', {
          class: 'action-btn action-btn--reject',
          onClick: () => rejectRow(rowData.productId),
        }, '却下'),
      ])
    },
  },
])

// データ読込 / 数据加载
async function loadData() {
  isLoading.value = true
  try {
    const alerts = await fetchLowStockAlerts()
    // 不足数 > 0 のもののみ表示 / 仅显示不足数 > 0 的记录
    rows.value = alerts
      .filter((a: LowStockAlert) => a.deficit > 0)
      .map((a: LowStockAlert) => ({ ...a, approvalStatus: 'pending' as const }))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '補充データの取得に失敗しました'
    toast.showError(msg)
  } finally {
    isLoading.value = false
  }
}

onMounted(loadData)
</script>

<style scoped>
.replenishment-approval {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.table-section {
  width: 100%;
}

/* アクションボタン / 操作按钮 */
:deep(.action-btn) {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  background: #fff;
}

:deep(.action-btn--approve) {
  border-color: #67c23a;
  color: #67c23a;
}

:deep(.action-btn--approve:hover) {
  background: #67c23a;
  color: #fff;
}

:deep(.action-btn--reject) {
  border-color: #f56c6c;
  color: #f56c6c;
}

:deep(.action-btn--reject:hover) {
  background: #f56c6c;
  color: #fff;
}
</style>
