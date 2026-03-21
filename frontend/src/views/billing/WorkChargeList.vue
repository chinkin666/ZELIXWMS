<template>
  <div class="work-charge-list">
    <ControlPanel title="作業チャージ一覧" :show-search="false">
      <template #actions>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
          <input v-model="filterPeriod" type="month" class="o-input o-input-sm" style="width:160px;" @change="handleFilterChange" />
          <select v-model="filterChargeType" class="o-input o-input-sm" style="width:150px;" @change="handleFilterChange">
            <option value="">全種別</option>
            <option v-for="ct in CHARGE_TYPES" :key="ct" :value="ct">{{ CHARGE_TYPE_LABELS[ct] }}</option>
          </select>
          <select v-model="filterClientId" class="o-input o-input-sm" style="width:150px;" @change="handleFilterChange">
            <option value="">全荷主</option>
            <option v-for="c in clients" :key="c._id" :value="c._id">{{ c.name }}</option>
          </select>
          <select v-model="filterIsBilled" class="o-input o-input-sm" style="width:120px;" @change="handleFilterChange">
            <option value="">全ステータス</option>
            <option value="false">未請求</option>
            <option value="true">請求済</option>
          </select>
          <OButton variant="primary" size="sm" @click="openManualCreate"><span class="o-icon">+</span> 手動追加</OButton>
          <OButton variant="secondary" size="sm" @click="loadData">更新</OButton>
        </div>
      </template>
    </ControlPanel>

    <!-- サマリーカード / 汇总卡片 -->
    <div v-if="summaryItems.length > 0" class="summary-cards">
      <div v-for="item in summaryItems" :key="item.chargeType" class="summary-card">
        <div class="summary-label">{{ CHARGE_TYPE_LABELS[item.chargeType as ChargeType] || item.chargeType }}</div>
        <div class="summary-amount">&yen;{{ item.totalAmount.toLocaleString() }}</div>
        <div class="summary-count">{{ item.count }}件 / {{ item.totalQuantity.toLocaleString() }}個</div>
      </div>
      <div class="summary-card summary-card--total">
        <div class="summary-label">合計</div>
        <div class="summary-amount">&yen;{{ summaryTotal.toLocaleString() }}</div>
        <div class="summary-count">{{ summaryTotalCount }}件</div>
      </div>
    </div>

    <OLoadingState :loading="loading" :empty="!loading && rows.length === 0">
      <div class="table-section">
        <Table
          :columns="tableColumns"
          :data="rows"
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
    </OLoadingState>

    <!-- 手動チャージ作成ダイアログ / 手动创建对话框 -->
    <ODialog v-model="createDialogVisible" title="作業チャージを追加" size="lg" @close="closeCreateDialog">
      <template #default>
        <form class="charge-form" @submit.prevent="handleCreateSubmit">
          <div class="form-row">
            <label class="form-label">料金種別 <span class="required-badge">必須</span></label>
            <select v-model="createForm.chargeType" class="o-input" required>
              <option value="" disabled>選択してください</option>
              <option v-for="ct in CHARGE_TYPES" :key="ct" :value="ct">{{ CHARGE_TYPE_LABELS[ct] }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">荷主</label>
            <select v-model="createForm.clientId" class="o-input">
              <option value="">なし</option>
              <option v-for="c in clients" :key="c._id" :value="c._id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">日付 <span class="required-badge">必須</span></label>
            <input v-model="createForm.chargeDate" type="date" class="o-input" required />
          </div>
          <div class="form-row">
            <label class="form-label">参照種別</label>
            <input v-model="createForm.referenceType" class="o-input" placeholder="例: manual, outbound_order" />
          </div>
          <div class="form-row">
            <label class="form-label">参照番号</label>
            <input v-model="createForm.referenceNumber" class="o-input" />
          </div>
          <div class="form-row">
            <label class="form-label">数量 <span class="required-badge">必須</span></label>
            <input v-model.number="createForm.quantity" type="number" class="o-input" min="1" required />
          </div>
          <div class="form-row">
            <label class="form-label">単価（¥） <span class="required-badge">必須</span></label>
            <input v-model.number="createForm.unitPrice" type="number" class="o-input" min="0" step="0.01" required />
          </div>
          <div class="form-row">
            <label class="form-label">説明 <span class="required-badge">必須</span></label>
            <textarea v-model="createForm.description" class="o-input" rows="2" required />
          </div>
          <div class="form-actions">
            <OButton variant="secondary" type="button" @click="closeCreateDialog">キャンセル</OButton>
            <OButton variant="primary" type="submit" :disabled="creating">
              {{ creating ? '作成中...' : '作成' }}
            </OButton>
          </div>
        </form>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import Table from '@/components/table/Table.vue'
import OLoadingState from '@/components/odoo/OLoadingState.vue'
import type { TableColumn } from '@/types/table'
import {
  fetchWorkCharges,
  fetchWorkChargeSummary,
  createWorkCharge,
  deleteWorkCharge,
  CHARGE_TYPE_LABELS,
  CHARGE_TYPES,
} from '@/api/serviceRate'
import type { WorkCharge, WorkChargeSummary, ChargeType } from '@/api/serviceRate'
import { fetchClients } from '@/api/client'
import type { Client } from '@/api/client'

const { show: showToast } = useToast()
const { t } = useI18n()

// ── 状態 / 状態 ──
const rows = ref<WorkCharge[]>([])
const total = ref(0)
const loading = ref(false)
const creating = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const clients = ref<Client[]>([])
const summaryItems = ref<WorkChargeSummary[]>([])

// フィルター / 筛选器
const now = new Date()
const filterPeriod = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
const filterChargeType = ref('')
const filterClientId = ref('')
const filterIsBilled = ref('')

// 手動作成ダイアログ / 手动创建对话框
const createDialogVisible = ref(false)

const emptyCreateForm = () => ({
  chargeType: '' as ChargeType | '',
  clientId: '',
  chargeDate: new Date().toISOString().slice(0, 10),
  referenceType: 'manual',
  referenceNumber: '',
  quantity: 1,
  unitPrice: 0,
  description: '',
})

const createForm = ref(emptyCreateForm())

// ── サマリー集計 / 汇总计算 ──
const summaryTotal = computed(() =>
  summaryItems.value.reduce((sum, item) => sum + item.totalAmount, 0),
)

const summaryTotalCount = computed(() =>
  summaryItems.value.reduce((sum, item) => sum + item.count, 0),
)

// ── テーブル列定義 / 表格列定义 ──
const tableColumns: TableColumn[] = [
  {
    key: 'chargeDate',
    dataKey: 'chargeDate',
    title: '日付',
    width: 110,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WorkCharge }) =>
      rowData.chargeDate ? rowData.chargeDate.slice(0, 10) : '-',
  },
  {
    key: 'chargeType',
    dataKey: 'chargeType',
    title: '種別',
    width: 130,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WorkCharge }) =>
      CHARGE_TYPE_LABELS[rowData.chargeType] || rowData.chargeType,
  },
  {
    key: 'clientName',
    dataKey: 'clientName',
    title: '荷主',
    width: 140,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WorkCharge }) => rowData.clientName || '-',
  },
  {
    key: 'referenceNumber',
    dataKey: 'referenceNumber',
    title: '参照番号',
    width: 140,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: WorkCharge }) => rowData.referenceNumber || '-',
  },
  { key: 'description', dataKey: 'description', title: '説明', width: 200, fieldType: 'string' },
  {
    key: 'quantity',
    dataKey: 'quantity',
    title: '数量',
    width: 80,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: WorkCharge }) =>
      h('span', { style: 'text-align:right;display:block;' }, (rowData.quantity || 0).toLocaleString()),
  },
  {
    key: 'unitPrice',
    dataKey: 'unitPrice',
    title: '単価',
    width: 100,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: WorkCharge }) =>
      h('span', { style: 'text-align:right;display:block;' }, `\u00A5${(rowData.unitPrice || 0).toLocaleString()}`),
  },
  {
    key: 'amount',
    dataKey: 'amount',
    title: '金額',
    width: 120,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: WorkCharge }) =>
      h('span', { style: 'text-align:right;display:block;font-weight:600;' }, `\u00A5${(rowData.amount || 0).toLocaleString()}`),
  },
  {
    key: 'isBilled',
    dataKey: 'isBilled',
    title: '請求済',
    width: 90,
    fieldType: 'boolean',
    cellRenderer: ({ rowData }: { rowData: WorkCharge }) =>
      h(
        'span',
        { class: rowData.isBilled ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--draft' },
        rowData.isBilled ? '請求済' : '未請求',
      ),
  },
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 100,
    cellRenderer: ({ rowData }: { rowData: WorkCharge }) => {
      // 請求済みは削除不可 / 已请求不可删除
      if (rowData.isBilled) return ''
      return h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'icon-danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ])
    },
  },
]

// ── データ取得 / 数据获取 ──
const loadData = async () => {
  loading.value = true
  try {
    const [chargeResult, summary] = await Promise.all([
      fetchWorkCharges({
        period: filterPeriod.value || undefined,
        clientId: filterClientId.value || undefined,
        chargeType: filterChargeType.value || undefined,
        isBilled: filterIsBilled.value || undefined,
        page: currentPage.value,
        limit: pageSize.value,
      }),
      fetchWorkChargeSummary({
        period: filterPeriod.value || undefined,
        clientId: filterClientId.value || undefined,
      }),
    ])
    rows.value = chargeResult.data
    total.value = chargeResult.total
    summaryItems.value = summary
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

const loadClients = async () => {
  try {
    const result = await fetchClients({ limit: 200, isActive: 'true' })
    clients.value = result.data
  } catch {
    // 荷主取得失敗はサイレント / 客户获取失败静默处理
  }
}

// ── フィルター変更 / 筛选变更 ──
const handleFilterChange = () => {
  currentPage.value = 1
  loadData()
}

// ── ページネーション / 分页 ──
const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadData()
}

// ── 手動作成 / 手动创建 ──
const openManualCreate = () => {
  createForm.value = emptyCreateForm()
  createDialogVisible.value = true
}

const closeCreateDialog = () => {
  createDialogVisible.value = false
  createForm.value = emptyCreateForm()
}

const handleCreateSubmit = async () => {
  creating.value = true
  try {
    const payload = {
      chargeType: createForm.value.chargeType || undefined,
      clientId: createForm.value.clientId || undefined,
      chargeDate: createForm.value.chargeDate,
      referenceType: createForm.value.referenceType || 'manual',
      referenceNumber: createForm.value.referenceNumber || undefined,
      quantity: createForm.value.quantity,
      unitPrice: createForm.value.unitPrice,
      amount: createForm.value.quantity * createForm.value.unitPrice,
      description: createForm.value.description.trim(),
    }
    await createWorkCharge(payload)
    showToast('作業チャージを作成しました', 'success')
    closeCreateDialog()
    await loadData()
  } catch (error: any) {
    showToast(error?.message || '作成に失敗しました', 'danger')
  } finally {
    creating.value = false
  }
}

// ── 削除 / 删除 ──
const confirmDelete = async (item: WorkCharge) => {
  try {
    await ElMessageBox.confirm(
      'この作業チャージを削除しますか？ / 确定要删除此作业费用吗？',
      '確認 / 确认',
      { confirmButtonText: '削除 / 删除', cancelButtonText: 'キャンセル / 取消', type: 'warning' },
    )
  } catch { return }
  try {
    await deleteWorkCharge(item._id)
    showToast('削除しました', 'success')
    await loadData()
  } catch (error: any) {
    showToast(error?.message || '削除に失敗しました', 'danger')
  }
}

// ── 初期化 / 初始化 ──
onMounted(() => {
  loadData()
  loadClients()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.work-charge-list {
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

/* サマリーカード / 汇总卡片 */
.summary-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-card {
  flex: 1;
  min-width: 140px;
  max-width: 200px;
  padding: 12px 16px;
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  background: var(--o-view-background, #fff);
}

.summary-card--total {
  background: var(--o-brand-lighter, #FAF0EA);
  border-color: var(--o-brand-primary, #0052A3);
}

.summary-label {
  font-size: 12px;
  color: var(--o-gray-500, #909399);
  margin-bottom: 4px;
}

.summary-amount {
  font-size: 18px;
  font-weight: 700;
  color: var(--o-gray-900, #1d1d1d);
}

.summary-count {
  font-size: 12px;
  color: var(--o-gray-400, #c0c4cc);
  margin-top: 2px;
}

/* フォーム / 表单 */
.charge-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--o-gray-700, #303133);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.o-status-tag--draft { background: var(--o-gray-100, #f5f7fa); color: var(--o-gray-500, #909399); }
</style>
