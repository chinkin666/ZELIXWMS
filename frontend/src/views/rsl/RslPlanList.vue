<template>
  <div class="rsl-plan-list">
    <ControlPanel title="RSLプラン一覧" :show-search="false">
      <template #actions>
        <OButton variant="primary" size="sm" @click="$router.push('/rsl/plans/create')">新規作成</OButton>
      </template>
    </ControlPanel>

    <!-- ステータスフィルタータブ / 状态过滤标签 -->
    <div class="status-tabs">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        :class="['status-tab', { active: currentStatus === tab.value }]"
        @click="filterByStatus(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="rows"
        row-key="_id"
        pagination-enabled
        pagination-mode="server"
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[25, 50, 100]"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import {
  fetchRslPlans,
  confirmRslPlan,
  shipRslPlan,
  deleteRslPlan,
} from '@/api/rsl'
import type { RslShipmentPlan, RslPlanStatus } from '@/api/rsl'

const router = useRouter()
const toast = useToast()

const rows = ref<RslShipmentPlan[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(25)
const currentStatus = ref<RslPlanStatus | ''>('')

// ステータスタブ定義 / 状态标签定义
const statusTabs: ReadonlyArray<{ readonly label: string; readonly value: RslPlanStatus | '' }> = [
  { label: '全て', value: '' },
  { label: '下書き', value: 'draft' },
  { label: '確定', value: 'confirmed' },
  { label: '出荷済', value: 'shipped' },
  { label: '受領済', value: 'received' },
]

// ステータスラベル / 状态标签
const statusLabel = (s: RslPlanStatus): string => ({
  draft: '下書き',
  confirmed: '確定',
  shipped: '出荷済',
  received: '受領済',
  cancelled: 'キャンセル',
}[s] || s)

const statusClass = (s: RslPlanStatus): string => ({
  draft: 'o-status-tag--draft',
  confirmed: 'o-status-tag--confirmed',
  shipped: 'o-status-tag--printed',
  received: 'o-status-tag--success',
  cancelled: 'o-status-tag--cancelled',
}[s] || '')

const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('ja-JP') : '-'

// テーブルカラム定義 / 表格列定义
const tableColumns: TableColumn[] = [
  {
    key: 'planNumber',
    dataKey: 'planNumber',
    title: 'プラン番号',
    width: 160,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: RslShipmentPlan }) =>
      h('span', { class: 'plan-number clickable', onClick: () => router.push(`/rsl/plans/${rowData._id}/edit`) }, rowData.planNumber),
  },
  {
    key: 'destinationWarehouse',
    dataKey: 'destinationWarehouse',
    title: '倉庫',
    width: 120,
    fieldType: 'string',
  },
  {
    key: 'status',
    dataKey: 'status',
    title: 'ステータス',
    width: 100,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: RslShipmentPlan }) =>
      h('span', { class: `o-status-tag ${statusClass(rowData.status)}` }, statusLabel(rowData.status)),
  },
  {
    key: 'itemCount',
    title: '商品数',
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: RslShipmentPlan }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.items.length)),
  },
  {
    key: 'totalQuantity',
    dataKey: 'totalQuantity',
    title: '総数量',
    width: 90,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: RslShipmentPlan }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(rowData.totalQuantity)),
  },
  {
    key: 'boxCount',
    dataKey: 'boxCount',
    title: '箱数',
    width: 70,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: RslShipmentPlan }) =>
      h('span', { style: 'text-align:right;display:block;' }, rowData.boxCount != null ? String(rowData.boxCount) : '-'),
  },
  {
    key: 'trackingNumber',
    dataKey: 'trackingNumber',
    title: '追跡番号',
    width: 160,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: RslShipmentPlan }) =>
      h('span', { style: 'font-family:monospace;' }, rowData.trackingNumber || '-'),
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: '作成日',
    width: 110,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: RslShipmentPlan }) => formatDate(rowData.createdAt),
  },
  {
    key: 'actions',
    title: '操作',
    width: 250,
    cellRenderer: ({ rowData }: { rowData: RslShipmentPlan }) => {
      const buttons: ReturnType<typeof h>[] = []

      if (rowData.status === 'draft') {
        buttons.push(
          h(OButton, { size: 'sm', variant: 'secondary', onClick: () => router.push(`/rsl/plans/${rowData._id}/edit`) }, () => '編集'),
          h(OButton, { size: 'sm', variant: 'primary', onClick: () => handleConfirm(rowData) }, () => '確定'),
          h(OButton, { size: 'sm', variant: 'secondary', style: 'border-color:#f56c6c;color:#f56c6c;', onClick: () => handleDelete(rowData) }, () => '削除'),
        )
      } else if (rowData.status === 'confirmed') {
        buttons.push(
          h(OButton, { size: 'sm', variant: 'primary', onClick: () => handleShip(rowData) }, () => '出荷'),
        )
      } else {
        buttons.push(
          h(OButton, { size: 'sm', variant: 'secondary', onClick: () => router.push(`/rsl/plans/${rowData._id}/edit`) }, () => '詳細'),
        )
      }

      return h('div', { class: 'action-cell' }, buttons)
    },
  },
]

// ── データ操作 / 数据操作 ──────────────────────────────────────────────────

function filterByStatus(status: RslPlanStatus | '') {
  currentStatus.value = status
  currentPage.value = 1
  loadData()
}

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadData()
}

async function loadData() {
  try {
    const res = await fetchRslPlans({
      status: currentStatus.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rows.value = res.data
    total.value = res.total
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '取得に失敗しました'
    toast.showError(message)
  }
}

async function handleConfirm(row: RslShipmentPlan) {
  try {
    await ElMessageBox.confirm(
      `プラン ${row.planNumber} を確定しますか？ / 确定要确认计划 ${row.planNumber} 吗？`,
      '確認 / 确认',
      { confirmButtonText: '確定 / 确定', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    await confirmRslPlan(row._id)
    toast.showSuccess('プランを確定しました')
    await loadData()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '確定に失敗しました'
    toast.showError(message)
  }
}

async function handleShip(row: RslShipmentPlan) {
  let trackingNumber: string | undefined
  let boxCount: number | undefined
  try {
    const { value: tn } = await ElMessageBox.prompt(
      '追跡番号を入力してください（任意） / 请输入追踪号（可选）:',
      '入力 / 输入',
      { confirmButtonText: '確定 / 确定', cancelButtonText: 'キャンセル / 取消' },
    ).catch(() => ({ value: null }))
    trackingNumber = tn || undefined
  } catch { /* cancelled */ }
  try {
    const { value: bcStr } = await ElMessageBox.prompt(
      '箱数を入力してください（任意） / 请输入箱数（可选）:',
      '入力 / 输入',
      { confirmButtonText: '確定 / 确定', cancelButtonText: 'キャンセル / 取消' },
    ).catch(() => ({ value: null }))
    const bc = bcStr ? Number(bcStr) : undefined
    boxCount = (bc && !isNaN(bc)) ? bc : undefined
  } catch { /* cancelled */ }

  try {
    await shipRslPlan(row._id, {
      trackingNumber,
      boxCount,
    })
    toast.showSuccess('出荷しました')
    await loadData()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '出荷に失敗しました'
    toast.showError(message)
  }
}

async function handleDelete(row: RslShipmentPlan) {
  try {
    await ElMessageBox.confirm(
      `プラン ${row.planNumber} を削除しますか？ / 确定要删除计划 ${row.planNumber} 吗？`,
      '確認 / 确认',
      { confirmButtonText: '削除 / 删除', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    await deleteRslPlan(row._id)
    toast.showSuccess('削除しました')
    await loadData()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : '削除に失敗しました'
    toast.showError(message)
  }
}

onMounted(() => loadData())
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--draft { background: #f4f4f5; color: #909399; }
.o-status-tag--confirmed { background: #ecf5ff; color: #409eff; }
.o-status-tag--printed { background: #fdf6ec; color: #e6a23c; }
.o-status-tag--success { background: #f0f9eb; color: #67c23a; }
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>

<style scoped>
.rsl-plan-list {
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

.status-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid var(--o-border-color, #e4e7ed);
  padding-bottom: 0;
}

.status-tab {
  padding: 6px 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-600, #606266);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}

.status-tab:hover {
  color: var(--o-gray-900, #212529);
}

.status-tab.active {
  color: var(--o-brand-primary, #0052A3);
  border-bottom-color: var(--o-brand-primary, #0052A3);
}

.table-section {
  width: 100%;
}

:deep(.plan-number) { font-family: monospace; font-weight: 600; color: var(--o-brand-primary, #714b67); }
:deep(.clickable) { cursor: pointer; }
:deep(.clickable:hover) { text-decoration: underline; }

:deep(.action-cell) {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}
</style>
