<template>
  <div class="service-rate-settings">
    <ControlPanel title="料金マスタ" :show-search="false">
      <template #actions>
        <select v-model="filterChargeType" class="o-input o-input-sm" style="width:160px;" @change="handleFilterChange">
          <option value="">全種別</option>
          <option v-for="ct in CHARGE_TYPES" :key="ct" :value="ct">{{ CHARGE_TYPE_LABELS[ct] }}</option>
        </select>
        <OButton variant="primary" @click="openCreate"><span class="o-icon">+</span> 新規追加</OButton>
      </template>
    </ControlPanel>

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="list"
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

    <!-- 作成/編集ダイアログ / 创建/编辑对话框 -->
    <ODialog v-model="dialogVisible" :title="isEditing ? '料金マスタを編集' : '料金マスタを追加'" size="lg" @close="closeDialog">
      <template #default>
        <form class="rate-form" @submit.prevent="handleSubmit">
          <div class="form-row">
            <label class="form-label">料金種別 <span class="required-badge">必須</span></label>
            <select v-model="form.chargeType" class="o-input" required>
              <option value="" disabled>選択してください</option>
              <option v-for="ct in CHARGE_TYPES" :key="ct" :value="ct">{{ CHARGE_TYPE_LABELS[ct] }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">料金名 <span class="required-badge">必須</span></label>
            <input v-model="form.name" class="o-input" required />
          </div>
          <div class="form-row">
            <label class="form-label">荷主</label>
            <select v-model="form.clientId" class="o-input">
              <option value="">共通（全荷主）</option>
              <option v-for="c in clients" :key="c._id" :value="c._id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">計算単位 <span class="required-badge">必須</span></label>
            <select v-model="form.unit" class="o-input" required>
              <option value="" disabled>選択してください</option>
              <option v-for="u in unitOptions" :key="u.value" :value="u.value">{{ u.label }}</option>
            </select>
          </div>
          <div class="form-row">
            <label class="form-label">単価（¥） <span class="required-badge">必須</span></label>
            <input v-model.number="form.unitPrice" type="number" class="o-input" min="0" step="0.01" required />
          </div>
          <div class="form-row">
            <label class="form-label">有効</label>
            <label class="toggle-label">
              <input v-model="form.isActive" type="checkbox" />
              <span>{{ form.isActive ? '有効' : '無効' }}</span>
            </label>
          </div>
          <div class="form-row">
            <label class="form-label">メモ</label>
            <textarea v-model="form.memo" class="o-input" rows="3" />
          </div>
          <div class="form-actions">
            <OButton variant="secondary" type="button" @click="closeDialog">キャンセル</OButton>
            <OButton variant="primary" type="submit" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </OButton>
          </div>
        </form>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn } from '@/types/table'
import {
  fetchServiceRates,
  createServiceRate,
  updateServiceRate,
  deleteServiceRate,
  CHARGE_TYPE_LABELS,
  CHARGE_TYPES,
} from '@/api/serviceRate'
import type { ServiceRate, ChargeType } from '@/api/serviceRate'
import { fetchClients } from '@/api/client'
import type { Client } from '@/api/client'

const { show: showToast } = useToast()
const { t } = useI18n()

// ── 計算単位オプション / 計算単位オプション ──
const unitOptions = [
  { value: '件', label: '件' },
  { value: '個', label: '個' },
  { value: 'ケース', label: 'ケース' },
  { value: 'パレット', label: 'パレット' },
  { value: '坪', label: '坪' },
  { value: 'kg', label: 'kg' },
  { value: '時間', label: '時間' },
  { value: '日', label: '日' },
  { value: '月', label: '月' },
  { value: '枚', label: '枚' },
  { value: '式', label: '式' },
]

// ── 状態 / 状態 ──
const list = ref<ServiceRate[]>([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const filterChargeType = ref('')
const clients = ref<Client[]>([])

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)

const emptyForm = () => ({
  chargeType: '' as ChargeType | '',
  name: '',
  clientId: '',
  unit: '',
  unitPrice: 0,
  isActive: true,
  memo: '',
})

const form = ref(emptyForm())

// ── テーブル列定義 / 表格列定义 ──
const tableColumns: TableColumn[] = [
  {
    key: 'chargeType',
    dataKey: 'chargeType',
    title: '料金種別',
    width: 140,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ServiceRate }) =>
      CHARGE_TYPE_LABELS[rowData.chargeType] || rowData.chargeType,
  },
  { key: 'name', dataKey: 'name', title: '料金名', width: 200, fieldType: 'string' },
  {
    key: 'clientName',
    dataKey: 'clientName',
    title: '荷主',
    width: 160,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: ServiceRate }) => rowData.clientName || '共通',
  },
  { key: 'unit', dataKey: 'unit', title: '計算単位', width: 100, fieldType: 'string' },
  {
    key: 'unitPrice',
    dataKey: 'unitPrice',
    title: '単価(¥)',
    width: 120,
    fieldType: 'number',
    cellRenderer: ({ rowData }: { rowData: ServiceRate }) =>
      h('span', { style: 'text-align:right;display:block;' }, `\u00A5${(rowData.unitPrice || 0).toLocaleString()}`),
  },
  {
    key: 'isActive',
    dataKey: 'isActive',
    title: '有効',
    width: 80,
    fieldType: 'boolean',
    cellRenderer: ({ rowData }: { rowData: ServiceRate }) =>
      h(
        'span',
        { class: rowData.isActive ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--cancelled' },
        rowData.isActive ? '有効' : '無効',
      ),
  },
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 160,
    cellRenderer: ({ rowData }: { rowData: ServiceRate }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(OButton, { variant: 'icon-danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

// ── Computed ──
const isEditing = computed(() => editingId.value !== null)

// ── データ取得 / 数据获取 ──
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchServiceRates({
      chargeType: filterChargeType.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    list.value = result.data
    total.value = result.total
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
  loadList()
}

// ── ページネーション / 分页 ──
const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadList()
}

// ── ダイアログ / 对话框 ──
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogVisible.value = true
}

const openEdit = (item: ServiceRate) => {
  editingId.value = item._id
  form.value = {
    chargeType: item.chargeType,
    name: item.name,
    clientId: item.clientId || '',
    unit: item.unit,
    unitPrice: item.unitPrice,
    isActive: item.isActive,
    memo: item.memo || '',
  }
  dialogVisible.value = true
}

const closeDialog = () => {
  dialogVisible.value = false
  editingId.value = null
  form.value = emptyForm()
}

const handleSubmit = async () => {
  saving.value = true
  try {
    const payload = {
      chargeType: form.value.chargeType || undefined,
      name: form.value.name.trim(),
      clientId: form.value.clientId || undefined,
      unit: form.value.unit,
      unitPrice: form.value.unitPrice,
      isActive: form.value.isActive,
      memo: form.value.memo.trim() || undefined,
    }

    if (editingId.value) {
      await updateServiceRate(editingId.value, payload)
      showToast('更新しました', 'success')
    } else {
      await createServiceRate(payload)
      showToast('作成しました', 'success')
    }
    closeDialog()
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  } finally {
    saving.value = false
  }
}

// ── 削除 / 删除 ──
const confirmDelete = async (item: ServiceRate) => {
  if (!confirm(`「${item.name}」を削除しますか？`)) return
  try {
    await deleteServiceRate(item._id)
    showToast('削除しました', 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '削除に失敗しました', 'danger')
  }
}

// ── 初期化 / 初始化 ──
onMounted(() => {
  loadList()
  loadClients()
})
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>

<style scoped>
.service-rate-settings {
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

:deep(.action-cell) {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* フォーム / 表单 */
.rate-form {
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

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>
