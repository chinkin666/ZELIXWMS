<template>
  <div class="billing-monthly">
    <ControlPanel title="月次請求" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;">
          <input v-model="selectedPeriod" type="month" class="o-input o-input-sm" style="width:160px;" />
          <OButton variant="primary" size="sm" :disabled="isGenerating" @click="handleGenerate">
            {{ isGenerating ? '生成中...' : '集計生成' }}
          </OButton>
          <OButton variant="secondary" size="sm" @click="loadData">更新</OButton>
        </div>
      </template>
    </ControlPanel>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="rows"
        :height="520"
        row-key="_id"
        pagination-enabled
        pagination-mode="server"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        :current-page="currentPage"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import { useRouter } from 'vue-router'
import {
  fetchBillingRecords,
  generateMonthlyBilling,
  confirmBillingRecord,
  createInvoice,
  updateInvoiceStatus,
} from '@/api/billing'
import type { BillingRecord, BillingStatus } from '@/api/billing'

const { t } = useI18n()
const { show: showToast } = useToast()
const router = useRouter()

// ── 状態管理 / 状態管理 ──
const rows = ref<BillingRecord[]>([])
const total = ref(0)
const loading = ref(false)
const isGenerating = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

// デフォルトは当月 / デフォルトは当月
const now = new Date()
const selectedPeriod = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

// ── ステータス表示 / ステータス表示 ──
const statusLabel = (s: BillingStatus): string => {
  const map: Record<BillingStatus, string> = {
    draft: '下書き',
    confirmed: '確定',
    invoiced: '請求済',
    paid: '入金済',
  }
  return map[s] || s
}

const statusClass = (s: BillingStatus): string => {
  const map: Record<BillingStatus, string> = {
    draft: 'o-status-tag--draft',
    confirmed: 'o-status-tag--confirmed',
    invoiced: 'o-status-tag--issued',
    paid: 'o-status-tag--printed',
  }
  return map[s] || ''
}

// ── テーブル列定義 / テーブル列定義 ──
const tableColumns: TableColumn[] = [
  { key: 'period', dataKey: 'period', title: '期間', width: 100, fieldType: 'string' },
  { key: 'clientName', dataKey: 'clientName', title: '荷主', width: 160, fieldType: 'string' },
  { key: 'carrierName', dataKey: 'carrierName', title: '配送業者', width: 140, fieldType: 'string' },
  { key: 'orderCount', dataKey: 'orderCount', title: '出荷件数', width: 100, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: BillingRecord }) =>
      h('span', { style: 'text-align:right;display:block;' }, (rowData.orderCount || 0).toLocaleString()),
  },
  { key: 'totalShippingCost', dataKey: 'totalShippingCost', title: '配送料金', width: 120, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: BillingRecord }) =>
      h('span', { style: 'text-align:right;display:block;' }, `\u00A5${(rowData.totalShippingCost || 0).toLocaleString()}`),
  },
  { key: 'totalAmount', dataKey: 'totalAmount', title: '合計', width: 120, fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: BillingRecord }) =>
      h('span', { style: 'text-align:right;display:block;font-weight:600;' }, `\u00A5${(rowData.totalAmount || 0).toLocaleString()}`),
  },
  { key: 'status', dataKey: 'status', title: 'ステータス', width: 100, fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: BillingRecord }) =>
      h('span', { class: `o-status-tag ${statusClass(rowData.status)}` }, statusLabel(rowData.status)),
  },
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 260,
    cellRenderer: ({ rowData }: { rowData: BillingRecord }) => {
      const buttons: any[] = []
      // 下書き → 確定 / 草稿 → 确认
      if (rowData.status === 'draft') {
        buttons.push(
          h(OButton, { variant: 'primary', size: 'sm', onClick: () => handleConfirm(rowData) }, () => '確定'),
        )
      }
      // 確定済 → 請求書発行 / 已确认 → 生成发票
      if (rowData.status === 'confirmed') {
        buttons.push(
          h(OButton, { variant: 'secondary', size: 'sm', onClick: () => handleCreateInvoice(rowData) }, () => '請求書発行'),
        )
      }
      // 請求済 → 入金確認 / 已开票 → 确认入金
      if (rowData.status === 'invoiced') {
        buttons.push(
          h(OButton, { variant: 'primary', size: 'sm', onClick: () => handleMarkPaid(rowData) }, () => '入金確認'),
        )
      }
      // 請求済・入金済 → 請求書詳細表示 / 已开票/已入金 → 查看发票
      if (rowData.status === 'invoiced' || rowData.status === 'paid') {
        buttons.push(
          h(OButton, { variant: 'secondary', size: 'sm', onClick: () => handleViewInvoice(rowData) }, () => '請求書'),
        )
      }
      return h('div', { class: 'action-cell' }, buttons)
    },
  },
]

// ── データ取得 / データ取得 ──
const loadData = async () => {
  loading.value = true
  try {
    const result = await fetchBillingRecords({
      period: selectedPeriod.value,
      page: currentPage.value,
      limit: pageSize.value,
    })
    rows.value = result.data || result.items || []
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

// ── ページネーション / ページネーション ──
const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadData()
}

// ── 集計生成 / 集計生成 ──
const handleGenerate = async () => {
  if (!selectedPeriod.value) {
    showToast('期間を選択してください', 'danger')
    return
  }
  isGenerating.value = true
  try {
    await generateMonthlyBilling(selectedPeriod.value)
    showToast(`${selectedPeriod.value} の月次請求を生成しました`, 'success')
    await loadData()
  } catch (error: any) {
    showToast(error?.message || '生成に失敗しました', 'danger')
  } finally {
    isGenerating.value = false
  }
}

// ── 確定 / 確定 ──
const handleConfirm = async (record: BillingRecord) => {
  if (!confirm(`「${record.clientName} - ${record.period}」を確定しますか？`)) return
  try {
    await confirmBillingRecord(record._id)
    showToast('確定しました', 'success')
    await loadData()
  } catch (error: any) {
    showToast(error?.message || '確定に失敗しました', 'danger')
  }
}

// ── 請求書発行 / 生成发票 ──
const handleCreateInvoice = async (record: BillingRecord) => {
  if (!confirm(`「${record.clientName} - ${record.period}」の請求書を発行しますか？`)) return
  try {
    const now = new Date()
    const issueDate = now.toISOString().slice(0, 10)
    // 支払期限: 翌月末 / 支付期限: 下月末
    const dueDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().slice(0, 10)

    const invoice = await createInvoice({
      billingRecordId: record._id,
      clientId: record.clientId,
      clientName: record.clientName,
      period: record.period,
      issueDate,
      dueDate,
    })
    showToast(`請求書 ${invoice.invoiceNumber} を発行しました`, 'success')
    await loadData()
  } catch (error: any) {
    showToast(error?.message || '請求書の発行に失敗しました', 'danger')
  }
}

// ── 入金確認 / 确认入金 ──
const handleMarkPaid = async (record: BillingRecord) => {
  if (!confirm(`「${record.clientName} - ${record.period}」の入金を確認しますか？`)) return
  try {
    const invoice = await findInvoiceByBillingRecord(record._id)
    if (invoice) {
      await updateInvoiceStatus(invoice._id, 'paid')
      showToast('入金を確認しました', 'success')
      await loadData()
    } else {
      showToast('対応する請求書が見つかりません', 'danger')
    }
  } catch (error: any) {
    showToast(error?.message || '入金確認に失敗しました', 'danger')
  }
}

// ── 請求書表示 / 查看发票 ──
const handleViewInvoice = async (record: BillingRecord) => {
  try {
    const invoice = await findInvoiceByBillingRecord(record._id)
    if (invoice) {
      router.push(`/billing/invoices/${invoice._id}`)
    } else {
      showToast('請求書が見つかりません', 'danger')
    }
  } catch (error: any) {
    showToast(error?.message || '請求書の取得に失敗しました', 'danger')
  }
}

// ── BillingRecordに紐づくInvoiceを検索 / 通过BillingRecord查找Invoice ──
const findInvoiceByBillingRecord = async (billingRecordId: string) => {
  const { fetchInvoices: fetchInv } = await import('@/api/billing')
  const result = await fetchInv()
  const invoices = result.data || (result as any).items || []
  return invoices.find((inv: any) => inv.billingRecordId === billingRecordId) || null
}

// ── 初期化 / 初期化 ──
onMounted(() => {
  loadData()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.billing-monthly {
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

:deep(.action-cell) {
  display: inline-flex;
  gap: 4px;
}

.o-status-tag--draft { background: var(--o-gray-100, #f5f7fa); color: var(--o-gray-500, #909399); }
</style>
