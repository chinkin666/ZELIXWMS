<template>
  <div class="inbound-order-list">
    <PageHeader :title="t('wms.inbound.orderList', '入庫指示一覧')" :show-search="false">
      <template #actions>
        <Button variant="default" size="sm" @click="$router.push('/inbound/create')">{{ t('wms.common.create', '新規作成') }}</Button>
      </template>
    </PageHeader>

    <!-- 一括操作バー / 批量操作栏 -->
    <div v-if="selectedIds.length > 0" class="bulk-bar">
      <span class="bulk-info">{{ selectedIds.length }} {{ t('wms.inbound.itemsSelected', '件選択') }}</span>
      <Button variant="secondary" size="sm" style="border-color:#f56c6c;color:#f56c6c;" :disabled="isBulkDeleting" @click="handleBulkDelete">
        {{ isBulkDeleting ? t('wms.inbound.deleting', '削除中...') : t('wms.inbound.bulkDelete', '一括削除') }}
      </Button>
      <Button variant="secondary" size="sm" @click="handleBulkCancel" :disabled="isBulkProcessing">{{ t('wms.inbound.bulkCancel', '一括キャンセル') }}</Button>
      <!-- 帳票印刷ドロップダウン / 帐票打印下拉菜单 -->
      <div class="form-print-dropdown" ref="formPrintDropdownRef">
        <Button variant="secondary" size="sm" :disabled="isFormPrinting" @click="toggleFormPrintMenu">
          {{ isFormPrinting ? t('wms.inbound.printing', '印刷中...') : t('wms.inbound.formPrint', '帳票印刷') }}
        </Button>
        <div v-if="showFormPrintMenu" class="form-print-menu">
          <div v-if="formTemplatesLoading" class="form-print-menu-item form-print-menu-loading p-2">
            <Skeleton class="h-4 w-[150px]" />
          </div>
          <template v-else-if="formTemplates.length > 0">
            <div
              v-for="tmpl in formTemplates"
              :key="tmpl._id"
              class="form-print-menu-item"
              @click="handleFormPrint(tmpl)"
            >
              <span class="form-print-menu-label">{{ tmpl.name }}</span>
              <span class="form-print-menu-type">{{ getFormTypeLabel(tmpl.targetType) }}</span>
            </div>
          </template>
          <div v-else class="form-print-menu-item form-print-menu-empty">
            {{ t('wms.inbound.noFormTemplates', '利用可能な帳票テンプレートがありません') }}
          </div>
        </div>
      </div>
      <Button variant="secondary" size="sm" @click="selectedIds = []">{{ t('wms.inbound.deselectAll', '選択解除') }}</Button>
    </div>

    <div class="table-section">
      <DataTable
        :columns="tableColumns"
        :data="rows"
        row-key="_id"
        pagination-enabled
        pagination-mode="server"
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[25, 50, 100]"
        :global-search-text="globalSearchText"
        :search-columns="searchColumns"
        @search="handleSearch"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/shared/PageHeader.vue'
import { DataTable } from '@/components/data-table'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchInboundOrders,
  confirmInboundOrder,
  completeInboundOrder,
  cancelInboundOrder,
  deleteInboundOrder,
} from '@/api/inboundOrder'
import type { InboundOrder } from '@/types/inventory'
import { fetchFormTemplates } from '@/api/formTemplate'
import { generateFormPdf } from '@/utils/form-export/pdfGenerator'
import type { FormTemplate } from '@/types/formTemplate'
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { Badge } from '@/components/ui/badge'
const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const { confirm } = useConfirmDialog()
const isLoading = ref(false)
const isConfirming = ref(false)
const isBulkDeleting = ref(false)
const isBulkProcessing = ref(false)
const rows = ref<InboundOrder[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(25)
const globalSearchText = ref('')
const selectedIds = ref<string[]>([])

// Current search filters
const currentFilterStatus = ref('')

const isAllSelected = computed(() =>
  rows.value.length > 0 && rows.value.every(r => selectedIds.value.includes(r._id)),
)
const isPartialSelected = computed(() =>
  !isAllSelected.value && rows.value.some(r => selectedIds.value.includes(r._id)),
)

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = rows.value.map(r => r._id)
  }
}

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    draft: t('wms.inbound.statusDraft', '下書き'),
    confirmed: t('wms.inbound.statusConfirmed', '確認済'),
    receiving: t('wms.inbound.statusReceiving', '入庫中'),
    received: t('wms.inbound.statusReceived', '検品済'),
    done: t('wms.inbound.statusDone', '完了'),
    cancelled: t('wms.inbound.statusCancelled', 'キャンセル'),
  }
  return map[s] || s
}

const statusClass = (s: string) => {
  const map: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    confirmed: 'bg-blue-100 text-blue-800',
    receiving: 'bg-amber-100 text-amber-800',
    received: 'bg-blue-100 text-blue-800',
    done: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  }
  return map[s] || ''
}

const getDestCode = (row: InboundOrder) => {
  if (typeof row.destinationLocationId === 'object' && row.destinationLocationId?.code) {
    return row.destinationLocationId.code
  }
  return String(row.destinationLocationId || '-')
}

const totalExpected = (row: InboundOrder) => (row.lines ?? []).reduce((sum, l) => sum + (l.expectedQuantity ?? 0), 0)
const totalReceived = (row: InboundOrder) => (row.lines ?? []).reduce((sum, l) => sum + (l.receivedQuantity ?? 0), 0)

const formatDate = (d: string) => new Date(d).toLocaleDateString('ja-JP')
const formatDateTime = (d: string) => new Date(d).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

// Column definitions
const baseColumns = computed<TableColumn[]>(() => [
  {
    key: 'checkbox',
    title: '',
    width: 40,
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) =>
      h('input', {
        type: 'checkbox',
        checked: selectedIds.value.includes(rowData._id),
        onChange: () => {
          const idx = selectedIds.value.indexOf(rowData._id)
          if (idx >= 0) {
            selectedIds.value = selectedIds.value.filter(id => id !== rowData._id)
          } else {
            selectedIds.value = [...selectedIds.value, rowData._id]
          }
        },
      }),
    headerCellRenderer: () =>
      h('input', {
        type: 'checkbox',
        checked: isAllSelected.value,
        indeterminate: isPartialSelected.value,
        onChange: toggleSelectAll,
      }),
  },
  {
    key: 'orderNumber',
    dataKey: 'orderNumber',
    title: t('wms.inbound.orderNumber', '入庫指示番号'),
    width: 160,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) =>
      h('span', { class: 'order-number' }, rowData.orderNumber),
  },
  {
    key: 'status',
    dataKey: 'status',
    title: t('wms.common.status', '状態'),
    width: 90,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.inbound.statusDraft', '下書き'), value: 'draft' },
      { label: t('wms.inbound.statusConfirmed', '確認済'), value: 'confirmed' },
      { label: t('wms.inbound.statusReceiving', '入庫中'), value: 'receiving' },
      { label: t('wms.inbound.statusReceived', '検品済'), value: 'received' },
      { label: t('wms.inbound.statusDone', '完了'), value: 'done' },
      { label: t('wms.inbound.statusCancelled', 'キャンセル'), value: 'cancelled' },
    ],
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => {
      const tags = [
        h('span', { class: `inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(rowData.status)}` }, statusLabel(rowData.status)),
      ]
      // 通過型バッジ表示 / 通过型标签显示
      if ((rowData as any).flowType === 'crossdock') {
        tags.push(h('span', { class: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium--crossdock' }, t('wms.inbound.crossdock', '通過')))
      }
      return h('div', { style: 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;' }, tags)
    },
  },
  {
    key: 'flowType',
    dataKey: 'flowType',
    title: t('wms.inbound.flowType', '入庫区分'),
    width: 110,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => {
      const label: Record<string, string> = { standard: '通常', fba: 'FBA', rsl: 'RSL', passthrough: '通過', crossdock: '通過' }
      return (label as any)[(rowData as any).flowType] ?? (rowData as any).flowType ?? '-'
    },
  },
  {
    key: 'clientId',
    dataKey: 'clientId',
    title: t('wms.inbound.client', '荷主'),
    width: 140,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => {
      const client = (rowData as any).clientId
      return typeof client === 'object' ? client?.name ?? '-' : client ?? '-'
    },
  },
  {
    key: 'supplier',
    dataKey: 'supplier',
    title: t('wms.inbound.supplier', '仕入先'),
    width: 160,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => rowData.supplier?.name || '-',
  },
  {
    key: 'destinationLocationId',
    dataKey: 'destinationLocationId',
    title: t('wms.inbound.destination', '入庫先'),
    width: 160,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) =>
      h('span', { class: 'location-badge' }, getDestCode(rowData)),
  },
  {
    key: 'lineCount',
    title: t('wms.inbound.lineCount', '行数'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) =>
      h('span', { style: 'text-align:right;display:block;' }, String((rowData.lines ?? []).length)),
  },
  {
    key: 'expectedQty',
    title: t('wms.inbound.expectedQuantity', '予定数量'),
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) =>
      h('span', { style: 'text-align:right;display:block;' }, String(totalExpected(rowData))),
  },
  {
    key: 'receivedQty',
    title: t('wms.inbound.received', '入庫済'),
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => {
      const received = totalReceived(rowData)
      const expected = totalExpected(rowData)
      return h(
        'span',
        {
          style: 'text-align:right;display:block;',
          class: received >= expected && expected > 0 ? 'text-success' : '',
        },
        String(received),
      )
    },
  },
  {
    key: 'expectedDate',
    dataKey: 'expectedDate',
    title: t('wms.inbound.expectedDate', '入庫予定日'),
    width: 120,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) =>
      rowData.expectedDate ? formatDate(rowData.expectedDate) : '-',
  },
  {
    key: 'purchaseOrderNumber',
    dataKey: 'purchaseOrderNumber',
    title: t('wms.inbound.purchaseOrderNumber', '発注番号'),
    width: 140,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) =>
      rowData.purchaseOrderNumber || '-',
  },
  {
    key: 'requestedDate',
    dataKey: 'requestedDate',
    title: t('wms.inbound.requestedDate', '入庫希望日'),
    width: 120,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) =>
      rowData.requestedDate ? new Date(rowData.requestedDate).toLocaleDateString('ja-JP') : '-',
  },
  {
    key: 'containerType',
    dataKey: 'containerType',
    title: t('wms.inbound.containerType', 'コンテナ'),
    width: 120,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) =>
      rowData.containerType || '-',
  },
  {
    key: 'deliveryCompany',
    dataKey: 'deliveryCompany',
    title: t('wms.inbound.deliveryCompany', '配送会社'),
    width: 120,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => (rowData as any).deliveryCompany ?? '-',
  },
  {
    key: 'deliverySlipNumber',
    dataKey: 'deliverySlipNumber',
    title: t('wms.inbound.deliverySlipNumber', '配送伝票番号'),
    width: 150,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => (rowData as any).deliverySlipNumber ?? '-',
  },
  {
    key: 'totalCbm',
    dataKey: 'totalCbm',
    title: t('wms.inbound.totalCbm', 'CBM'),
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => {
      const v = (rowData as any).totalCbm
      return v != null ? String(Number(v).toFixed(2)) : '-'
    },
  },
  {
    key: 'totalPallets',
    dataKey: 'totalPallets',
    title: t('wms.inbound.totalPallets', 'パレット数'),
    width: 90,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => {
      const v = (rowData as any).totalPallets
      return v != null ? String(v) : '-'
    },
  },
  {
    key: 'notes',
    dataKey: 'notes',
    title: t('wms.inbound.notes', '備考'),
    width: 180,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => {
      const v = (rowData as any).notes ?? ''
      return v.length > 30 ? v.slice(0, 30) + '…' : v || '-'
    },
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: t('wms.inbound.createdAt', '作成日時'),
    width: 120,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => formatDateTime(rowData.createdAt),
  },
])

const searchColumns = computed<TableColumn[]>(() => baseColumns.value.filter((c) => c.searchable))

const tableColumns = computed<TableColumn[]>(() => [
  ...baseColumns.value,
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 280,
    cellRenderer: ({ rowData }: { rowData: InboundOrder }) => {
      const buttons: any[] = []
      if (rowData.status === 'draft') {
        buttons.push(h(Button, { variant: 'default', size: 'sm', disabled: isConfirming.value, onClick: () => handleConfirm(rowData) }, () => t('wms.inbound.confirm', '確定')))
      }
      if (rowData.status === 'confirmed' || rowData.status === 'receiving') {
        buttons.push(h(Button, { variant: 'default', size: 'sm', onClick: () => router.push(`/inbound/receive/${rowData._id}`) }, () => t('wms.inbound.receiveInspection', '入庫検品')))
      }
      if (rowData.status === 'received') {
        buttons.push(h(Button, { variant: 'default', size: 'sm', onClick: () => router.push(`/inbound/putaway/${rowData._id}`) }, () => t('wms.inbound.putaway', '棚入れ')))
      }
      if (rowData.status === 'confirmed' || rowData.status === 'receiving' || rowData.status === 'received') {
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', onClick: () => handleComplete(rowData) }, () => t('wms.inbound.complete', '完了')))
      }
      if (rowData.status !== 'done' && rowData.status !== 'cancelled') {
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', style: 'border-color:#f56c6c;color:#f56c6c;', onClick: () => handleCancel(rowData) }, () => t('wms.common.cancel', '取消')))
      }
      if (rowData.status === 'draft') {
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', style: 'border-color:#f56c6c;color:#f56c6c;', onClick: () => handleDelete(rowData) }, () => t('wms.common.delete', '削除')))
      }
      if (rowData.status !== 'draft' && rowData.status !== 'cancelled') {
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', onClick: () => openPrint(rowData._id, 'inspection') }, () => t('wms.inbound.inspectionSheet', '検品表')))
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', onClick: () => openPrint(rowData._id, 'kanban') }, () => t('wms.inbound.kanban', '看板')))
      }
      if (rowData.status !== 'cancelled') {
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', onClick: () => openPrint(rowData._id, 'barcode') }, () => 'BC'))
      }
      // 帳票印刷ボタン / 帐票打印按钮
      if (rowData.status !== 'draft' && rowData.status !== 'cancelled') {
        buttons.push(h(Button, { variant: 'secondary', size: 'sm', disabled: isFormPrinting.value, onClick: () => handleSingleFormPrint(rowData) }, () => t('wms.inbound.formPrintShort', '帳票')))
      }
      return h('div', { class: 'action-cell' }, buttons)
    },
  },
])

// Search handler
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
  } else {
    globalSearchText.value = ''
  }

  if (payload.status?.value) {
    currentFilterStatus.value = String(payload.status.value)
  } else {
    currentFilterStatus.value = ''
  }

  currentPage.value = 1
  loadData()
}

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadData()
}

const loadData = async () => {
  isLoading.value = true
  selectedIds.value = []
  try {
    const res = await fetchInboundOrders({
      status: currentFilterStatus.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rows.value = res.items
    total.value = res.total
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.fetchFailed', 'データの取得に失敗しました'))
  } finally {
    isLoading.value = false
  }
}

const handleConfirm = async (row: InboundOrder) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  isConfirming.value = true
  try {
    await confirmInboundOrder(row._id)
    toast.showSuccess(t('wms.inbound.orderConfirmed', '入庫指示を確定しました'))
    await loadData()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.confirmFailed', '確定に失敗しました'))
  } finally {
    isConfirming.value = false
  }
}

const handleComplete = async (row: InboundOrder) => {
  const received = totalReceived(row)
  const expected = totalExpected(row)
  if (received < expected) {
    if (!(await confirm('この操作を実行しますか？'))) return
  }
  try {
    await completeInboundOrder(row._id)
    toast.showSuccess(t('wms.inbound.orderCompleted', '入庫指示を完了にしました'))
    await loadData()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.completeFailed', '完了に失敗しました'))
  }
}

const handleCancel = async (row: InboundOrder) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await cancelInboundOrder(row._id)
    toast.showSuccess(t('wms.inbound.orderCancelled', '入庫指示をキャンセルしました'))
    await loadData()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.cancelFailed', 'キャンセルに失敗しました'))
  }
}

const handleDelete = async (row: InboundOrder) => {
  if (!(await confirm('この操作を実行しますか？'))) return
  try {
    await deleteInboundOrder(row._id)
    toast.showSuccess(t('wms.inbound.orderDeleted', '入庫指示を削除しました'))
    await loadData()
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.deleteFailed', '削除に失敗しました'))
  }
}

const handleBulkDelete = async () => {
  const targets = rows.value.filter(r => selectedIds.value.includes(r._id) && r.status === 'draft')
  if (targets.length === 0) {
    toast.showError(t('wms.inbound.noDeletableOrders', '削除可能な入庫指示（下書き状態）がありません'))
    return
  }
  if (!(await confirm('この操作を実行しますか？'))) return
  isBulkDeleting.value = true
  let successCount = 0
  let failCount = 0
  for (const row of targets) {
    try {
      await deleteInboundOrder(row._id)
      successCount++
    } catch {
      failCount++
    }
  }
  isBulkDeleting.value = false

  if (successCount > 0) toast.showSuccess(t('wms.inbound.bulkDeleteSuccess', `${successCount}件を削除しました`))
  if (failCount > 0) toast.showError(t('wms.inbound.bulkDeleteFail', `${failCount}件の削除に失敗しました`))
  await loadData()
}

const handleBulkCancel = async () => {
  const targets = rows.value.filter(
    r => selectedIds.value.includes(r._id) && r.status !== 'done' && r.status !== 'cancelled',
  )
  if (targets.length === 0) {
    toast.showError(t('wms.inbound.noCancellableOrders', 'キャンセル可能な入庫指示がありません'))
    return
  }
  if (!(await confirm('この操作を実行しますか？'))) return
  isBulkProcessing.value = true
  let successCount = 0
  let failCount = 0
  for (const row of targets) {
    try {
      await cancelInboundOrder(row._id)
      successCount++
    } catch {
      failCount++
    }
  }
  isBulkProcessing.value = false

  if (successCount > 0) toast.showSuccess(t('wms.inbound.bulkCancelSuccess', `${successCount}件をキャンセルしました`))
  if (failCount > 0) toast.showError(t('wms.inbound.bulkCancelFail', `${failCount}件のキャンセルに失敗しました`))
  await loadData()
}

const openPrint = (id: string, type: 'inspection' | 'kanban' | 'barcode') => {
  window.open(`/inbound/print/${type}/${id}`, '_blank')
}

// ============================================================
// 帳票印刷機能 / 帐票打印功能
// ============================================================
const formTemplates = ref<FormTemplate[]>([])
const formTemplatesLoading = ref(false)
const showFormPrintMenu = ref(false)
const isFormPrinting = ref(false)
const formPrintDropdownRef = ref<HTMLElement | null>(null)

/** 帳票タイプラベル取得 / 获取帐票类型标签 */
const getFormTypeLabel = (targetType: string): string => {
  const map: Record<string, string> = {
    'inbound-detail-list': t('wms.inbound.formTypeDetailList', '入庫リスト'),
    'inbound-inspection-sheet': t('wms.inbound.formTypeInspectionSheet', '入庫検品シート'),
  }
  return map[targetType] || targetType
}

/** ドロップダウンメニューの切り替え / 切换下拉菜单 */
const toggleFormPrintMenu = async () => {
  if (showFormPrintMenu.value) {
    showFormPrintMenu.value = false
    return
  }
  showFormPrintMenu.value = true
  formTemplatesLoading.value = true
  try {
    // 入庫系テンプレートを両方取得 / 获取两种入库类型模板
    const [detailTemplates, inspectionTemplates] = await Promise.all([
      fetchFormTemplates('inbound-detail-list'),
      fetchFormTemplates('inbound-inspection-sheet'),
    ])
    formTemplates.value = [...detailTemplates, ...inspectionTemplates]
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.fetchTemplateFailed', 'テンプレートの取得に失敗しました'))
    formTemplates.value = []
  } finally {
    formTemplatesLoading.value = false
  }
}

/** メニュー外クリックで閉じる / 点击菜单外部关闭 */
const handleClickOutside = (e: MouseEvent) => {
  if (formPrintDropdownRef.value && !formPrintDropdownRef.value.contains(e.target as Node)) {
    showFormPrintMenu.value = false
  }
}

/**
 * 入庫指示データをフラット行に変換（inbound-detail-list用）
 * 1入庫指示 x N行 → N件のフラットレコード
 * 将入库指示数据转换为扁平行（入库明细列表用）
 */
const transformToDetailRows = (orders: InboundOrder[]): Record<string, any>[] => {
  const flatRows: Record<string, any>[] = []
  for (const order of orders) {
    const orderBase = {
      orderNumber: order.orderNumber,
      status: statusLabel(order.status),
      supplierName: order.supplier?.name || '-',
      expectedDate: order.expectedDate || '',
      destinationLocation: getDestCode(order),
      createdAt: order.createdAt,
      completedAt: order.completedAt || '',
    }
    for (const line of (order.lines ?? [])) {
      flatRows.push({
        ...orderBase,
        lineNumber: line.lineNumber,
        productSku: line.productSku,
        productName: line.productName || '-',
        expectedQuantity: line.expectedQuantity,
        receivedQuantity: line.receivedQuantity,
        putawayQuantity: line.putawayQuantity,
        stockCategory: line.stockCategory === 'new' ? t('wms.inbound.stockNew', '新品') : line.stockCategory === 'damaged' ? t('wms.inbound.stockDamaged', '仕損') : (line.stockCategory || '-'),
        lotNumber: line.lotNumber || '',
        expiryDate: line.expiryDate || '',
        orderReferenceNumber: line.orderReferenceNumber || '',
        putawayLocation: typeof line.putawayLocationId === 'object' && line.putawayLocationId?.code
          ? line.putawayLocationId.code
          : (line.putawayLocationId || ''),
        memo: line.memo || '',
      })
    }
  }
  return flatRows
}

/**
 * 入庫指示データを商品集計行に変換（inbound-inspection-sheet用）
 * 複数入庫指示の同一SKUを合算してチェックリスト化
 * 将入库指示数据转换为按商品汇总行（入库检品表用）
 */
const transformToInspectionRows = (orders: InboundOrder[]): Record<string, any>[] => {
  const skuMap = new Map<string, {
    productSku: string
    productName: string
    expectedQuantity: number
    receivedQuantity: number
    stockCategory: string
    lotNumber: string
    expiryDate: string
    supplierName: string
    orderNumber: string
  }>()

  for (const order of orders) {
    for (const line of (order.lines ?? [])) {
      const key = `${line.productSku}_${line.lotNumber || ''}_${line.stockCategory || ''}`
      const existing = skuMap.get(key)
      if (existing) {
        skuMap.set(key, {
          ...existing,
          expectedQuantity: existing.expectedQuantity + line.expectedQuantity,
          receivedQuantity: existing.receivedQuantity + line.receivedQuantity,
          // 複数注文がある場合はカンマ区切り / 多个订单用逗号分隔
          orderNumber: existing.orderNumber.includes(order.orderNumber)
            ? existing.orderNumber
            : `${existing.orderNumber}, ${order.orderNumber}`,
          supplierName: existing.supplierName.includes(order.supplier?.name || '')
            ? existing.supplierName
            : `${existing.supplierName}, ${order.supplier?.name || '-'}`,
        })
      } else {
        skuMap.set(key, {
          productSku: line.productSku,
          productName: line.productName || '-',
          expectedQuantity: line.expectedQuantity,
          receivedQuantity: line.receivedQuantity,
          stockCategory: line.stockCategory === 'new' ? t('wms.inbound.stockNew', '新品') : line.stockCategory === 'damaged' ? t('wms.inbound.stockDamaged', '仕損') : (line.stockCategory || '-'),
          lotNumber: line.lotNumber || '',
          expiryDate: line.expiryDate || '',
          supplierName: order.supplier?.name || '-',
          orderNumber: order.orderNumber,
        })
      }
    }
  }

  return Array.from(skuMap.values())
}

/** 帳票印刷実行 / 执行帐票打印 */
const handleFormPrint = async (template: FormTemplate) => {
  showFormPrintMenu.value = false

  const selectedOrders = rows.value.filter(r => selectedIds.value.includes(r._id))
  if (selectedOrders.length === 0) {
    toast.showError(t('wms.inbound.noOrdersSelected', '入庫指示が選択されていません'))
    return
  }

  isFormPrinting.value = true
  try {
    // テンプレートタイプに応じてデータ変換 / 根据模板类型转换数据
    const data = template.targetType === 'inbound-inspection-sheet'
      ? transformToInspectionRows(selectedOrders)
      : transformToDetailRows(selectedOrders)

    if (data.length === 0) {
      toast.showError(t('wms.inbound.noDataToPrint', '印刷対象データがありません'))
      return
    }

    await generateFormPdf(template, data, { preview: true })
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.printFailed', '帳票の生成に失敗しました'))
  } finally {
    isFormPrinting.value = false
  }
}

/** 単一行帳票印刷 / 单行帐票打印 */
const handleSingleFormPrint = async (order: InboundOrder) => {
  isFormPrinting.value = true
  try {
    // テンプレート取得 / 获取模板
    const [detailTemplates, inspectionTemplates] = await Promise.all([
      fetchFormTemplates('inbound-detail-list'),
      fetchFormTemplates('inbound-inspection-sheet'),
    ])
    const allTemplates = [...detailTemplates, ...inspectionTemplates]

    if (allTemplates.length === 0) {
      toast.showError(t('wms.inbound.noFormTemplates', '利用可能な帳票テンプレートがありません'))
      return
    }

    // テンプレートが1つの場合はそのまま使用、複数の場合は最初のものを使用
    // 1つしかない場合はダイアログ省略 / 只有一个模板时跳过选择
    const tmpl = allTemplates[0]!
    const data = tmpl.targetType === 'inbound-inspection-sheet'
      ? transformToInspectionRows([order])
      : transformToDetailRows([order])

    if (data.length === 0) {
      toast.showError(t('wms.inbound.noDataToPrint', '印刷対象データがありません'))
      return
    }

    await generateFormPdf(tmpl, data, { preview: true })
  } catch (e: any) {
    toast.showError(e?.message || t('wms.inbound.printFailed', '帳票の生成に失敗しました'))
  } finally {
    isFormPrinting.value = false
  }
}

onMounted(() => {
  loadData()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style>
</style>

<style scoped>
.inbound-order-list {
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

.bulk-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 6px;
}

.bulk-info {
  font-size: 13px;
  font-weight: 600;
  color: #1565c0;
  margin-right: 4px;
}

:deep(.row-selected) {
  background: #e3f2fd !important;
}

:deep(.order-number) {
  font-family: monospace;
  font-weight: 600;
  color: var(--o-brand-primary, #714b67);
}

:deep(.location-badge) {
  font-family: monospace;
  font-size: 12px;
  background: var(--o-gray-100, #f5f7fa);
  padding: 2px 6px;
  border-radius: 3px;
}

:deep(.text-success) { color: #67c23a; font-weight: 600; }

:deep(.action-cell) {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* 帳票印刷ドロップダウン / 帐票打印下拉菜单 */
.form-print-dropdown {
  position: relative;
  display: inline-block;
}

.form-print-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  min-width: 240px;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
}

.form-print-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.form-print-menu-item:hover {
  background: #f5f7fa;
}

.form-print-menu-label {
  font-weight: 500;
  color: #303133;
}

.form-print-menu-type {
  font-size: 11px;
  color: #909399;
  margin-left: 8px;
}

.form-print-menu-loading,
.form-print-menu-empty {
  color: #909399;
  cursor: default;
  justify-content: center;
}

.form-print-menu-loading:hover,
.form-print-menu-empty:hover {
  background: transparent;
}
</style>
