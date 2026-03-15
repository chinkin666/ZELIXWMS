<template>
  <div class="lot-management">
    <ControlPanel :title="t('wms.inventory.lotManagement', 'ロット管理')" :show-search="false">
      <template #actions>
        <OButton variant="primary" size="sm" @click="openCreateDialog">
          {{ t('wms.common.create', '新規作成') }}
        </OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="lotManagementSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="lots"
        :height="520"
        row-key="_id"
        pagination-enabled
        pagination-mode="server"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[25, 50, 100]"
        :global-search-text="globalSearchText"
        @page-change="handlePageChange"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogVisible" :title="editingId ? t('wms.inventory.editLot', 'ロット編集') : t('wms.inventory.createLot', 'ロット新規作成')" size="md">
      <div class="dialog-form">
        <div v-if="!editingId" class="form-field">
          <label class="form-label">{{ t('wms.inventory.product', '商品') }}</label>
          <select v-model="form.productId" class="o-input">
            <option value="">{{ t('wms.inventory.selectProduct', '商品を選択...') }}</option>
            <option v-for="p in productOptions" :key="p._id" :value="p._id">{{ p.sku }} - {{ p.name }}</option>
          </select>
        </div>
        <div v-if="!editingId" class="form-field">
          <label class="form-label">{{ t('wms.inventory.lotNumber', 'ロット番号') }}</label>
          <input v-model="form.lotNumber" type="text" class="o-input" :placeholder="t('wms.inventory.lotNumberPlaceholder', '例: LOT-2026-001')" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.expiryDate', '賞味期限') }}</label>
          <input v-model="form.expiryDate" type="date" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.manufactureDate', '製造日') }}</label>
          <input v-model="form.manufactureDate" type="date" class="o-input" />
        </div>
        <div v-if="editingId" class="form-field">
          <label class="form-label">{{ t('wms.inventory.lotStatus', 'ステータス') }}</label>
          <select v-model="form.status" class="o-input">
            <option value="active">{{ t('wms.inventory.statusActive', '有効') }}</option>
            <option value="expired">{{ t('wms.inventory.expired', '期限切れ') }}</option>
            <option value="recalled">{{ t('wms.inventory.statusRecalled', 'リコール') }}</option>
            <option value="quarantine">{{ t('wms.inventory.statusQuarantine', '隔離') }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.inventory.memo', 'メモ') }}</label>
          <textarea v-model="form.memo" class="o-input" rows="2" />
        </div>
      </div>
      <template #footer>
        <OButton variant="secondary" @click="dialogVisible = false">{{ t('wms.common.cancel', 'キャンセル') }}</OButton>
        <OButton variant="primary" :disabled="isSaving" @click="handleSave">
          {{ isSaving ? t('wms.inventory.saving', '保存中...') : t('wms.common.save', '保存') }}
        </OButton>
      </template>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import OButton from '@/components/odoo/OButton.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import { fetchLots, createLot, updateLot, deleteLot } from '@/api/lot'
import type { Lot, LotStatus } from '@/types/inventory'
import { http } from '@/api/http'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'

const { show: showToast } = useToast()
const { t } = useI18n()

const lots = ref<Lot[]>([])
const isLoading = ref(false)
const globalSearchText = ref('')
const page = ref(1)
const total = ref(0)
const pageSize = ref(50)

// Current search filters
const currentSearchText = ref('')
const currentStatusFilter = ref('')

// Product options for create dialog
const productOptions = ref<Array<{ _id: string; sku: string; name: string }>>([])

// Dialog state
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const isSaving = ref(false)
const form = ref({
  productId: '',
  lotNumber: '',
  expiryDate: '',
  manufactureDate: '',
  status: 'active' as string,
  memo: '',
})

function formatDate(d: string) {
  return d ? new Date(d).toLocaleDateString('ja-JP') : ''
}

function expiryClass(d: string): string {
  const now = new Date()
  const exp = new Date(d)
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return 'expiry-expired'
  if (daysLeft <= 30) return 'expiry-warning'
  return ''
}

function statusLabel(s: LotStatus): string {
  const map: Record<LotStatus, string> = {
    active: t('wms.inventory.statusActive', '有効'),
    expired: t('wms.inventory.expired', '期限切れ'),
    recalled: t('wms.inventory.statusRecalled', 'リコール'),
    quarantine: t('wms.inventory.statusQuarantine', '隔離'),
  }
  return map[s] || s
}

function statusTagVariant(s: LotStatus): string {
  const map: Record<LotStatus, string> = {
    active: 'confirmed',
    expired: 'error',
    recalled: 'pending',
    quarantine: 'new',
  }
  return map[s] || 'new'
}

// Column definitions
const searchColumns = computed<TableColumn[]>(() => [
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
  {
    key: 'status',
    dataKey: 'status',
    title: t('wms.inventory.lotStatus', 'ステータス'),
    width: 80,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.statusActive', '有効'), value: 'active' },
      { label: t('wms.inventory.expired', '期限切れ'), value: 'expired' },
      { label: t('wms.inventory.statusRecalled', 'リコール'), value: 'recalled' },
      { label: t('wms.inventory.statusQuarantine', '隔離'), value: 'quarantine' },
    ],
  },
])

const tableColumns = computed<TableColumn[]>(() => [
  {
    key: 'lotNumber',
    dataKey: 'lotNumber',
    title: t('wms.inventory.lotNumber', 'ロット番号'),
    width: 140,
    fieldType: 'string',
    searchable: true,
    searchType: 'string',
    cellRenderer: ({ rowData }: { rowData: Lot }) =>
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
    cellRenderer: ({ rowData }: { rowData: Lot }) => rowData.productSku,
  },
  {
    key: 'productName',
    dataKey: 'productName',
    title: t('wms.inventory.productName', '商品名'),
    width: 180,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Lot }) => rowData.productName || '-',
  },
  {
    key: 'expiryDate',
    dataKey: 'expiryDate',
    title: t('wms.inventory.expiryDate', '賞味期限'),
    width: 120,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: Lot }) => {
      if (!rowData.expiryDate) return '-'
      return h('span', { class: expiryClass(rowData.expiryDate) }, formatDate(rowData.expiryDate))
    },
  },
  {
    key: 'manufactureDate',
    dataKey: 'manufactureDate',
    title: t('wms.inventory.manufactureDate', '製造日'),
    width: 120,
    fieldType: 'date',
    cellRenderer: ({ rowData }: { rowData: Lot }) =>
      rowData.manufactureDate ? formatDate(rowData.manufactureDate) : '-',
  },
  {
    key: 'status',
    dataKey: 'status',
    title: t('wms.inventory.lotStatus', 'ステータス'),
    width: 80,
    fieldType: 'string',
    searchable: true,
    searchType: 'select',
    searchOptions: [
      { label: t('wms.inventory.statusActive', '有効'), value: 'active' },
      { label: t('wms.inventory.expired', '期限切れ'), value: 'expired' },
      { label: t('wms.inventory.statusRecalled', 'リコール'), value: 'recalled' },
      { label: t('wms.inventory.statusQuarantine', '隔離'), value: 'quarantine' },
    ],
    cellRenderer: ({ rowData }: { rowData: Lot }) =>
      h('span', { class: `o-status-tag o-status-tag--${statusTagVariant(rowData.status)}` }, statusLabel(rowData.status)),
  },
  {
    key: 'memo',
    dataKey: 'memo',
    title: t('wms.inventory.memo', 'メモ'),
    width: 180,
    fieldType: 'string',
    cellRenderer: ({ rowData }: { rowData: Lot }) => rowData.memo || '-',
  },
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 140,
    cellRenderer: ({ rowData }: { rowData: Lot }) =>
      h('div', { class: 'action-cell' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEditDialog(rowData) }, () => t('wms.common.edit', '編集')),
        h(OButton, { variant: 'icon-danger', size: 'sm', onClick: () => handleDelete(rowData) }, () => t('wms.common.delete', '削除')),
      ]),
  },
])

// Search handler
const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    currentSearchText.value = String(payload.__global.value).trim()
  } else {
    globalSearchText.value = ''
    currentSearchText.value = ''
  }

  if (payload.status?.value) {
    currentStatusFilter.value = String(payload.status.value)
  } else {
    currentStatusFilter.value = ''
  }

  page.value = 1
  loadData()
}

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  page.value = payload.page
  pageSize.value = payload.pageSize
  loadData()
}

async function loadData() {
  isLoading.value = true
  try {
    const res = await fetchLots({
      search: currentSearchText.value || undefined,
      status: currentStatusFilter.value || undefined,
      page: page.value,
      limit: pageSize.value,
    })
    lots.value = res.items
    total.value = res.total
  } catch (e: any) {
    // ロット一覧取得エラー / Lot list fetch error
  } finally {
    isLoading.value = false
  }
}

async function loadProducts() {
  try {
    const data = await http.get<any>('/products', { limit: '1000' })
    productOptions.value = (data.items || data || []).map((p: any) => ({
      _id: p._id,
      sku: p.sku,
      name: p.name,
    }))
  } catch (e: any) {
    // 商品取得エラー / Product fetch error
  }
}

function openCreateDialog() {
  editingId.value = null
  form.value = { productId: '', lotNumber: '', expiryDate: '', manufactureDate: '', status: 'active', memo: '' }
  dialogVisible.value = true
}

function openEditDialog(lot: Lot) {
  editingId.value = lot._id
  form.value = {
    productId: lot.productId,
    lotNumber: lot.lotNumber,
    expiryDate: lot.expiryDate ? lot.expiryDate.slice(0, 10) : '',
    manufactureDate: lot.manufactureDate ? lot.manufactureDate.slice(0, 10) : '',
    status: lot.status,
    memo: lot.memo || '',
  }
  dialogVisible.value = true
}

async function handleSave() {
  isSaving.value = true
  try {
    if (editingId.value) {
      await updateLot(editingId.value, {
        expiryDate: form.value.expiryDate || null,
        manufactureDate: form.value.manufactureDate || null,
        status: form.value.status,
        memo: form.value.memo,
      })
    } else {
      if (!form.value.productId || !form.value.lotNumber.trim()) {
        showToast(t('wms.inventory.productAndLotRequired', '商品とロット番号は必須です'), 'warning')
        return
      }
      await createLot({
        lotNumber: form.value.lotNumber.trim(),
        productId: form.value.productId,
        expiryDate: form.value.expiryDate || undefined,
        manufactureDate: form.value.manufactureDate || undefined,
        memo: form.value.memo || undefined,
      })
    }
    dialogVisible.value = false
    await loadData()
  } catch (e: any) {
    showToast(e.response?.data?.message || t('wms.inventory.errorOccurred', 'エラーが発生しました'), 'danger')
  } finally {
    isSaving.value = false
  }
}

async function handleDelete(lot: Lot) {
  if (!confirm(t('wms.inventory.confirmDeleteLot', `ロット「${lot.lotNumber}」を削除しますか？`))) return
  try {
    await deleteLot(lot._id)
    await loadData()
  } catch (e: any) {
    showToast(e.response?.data?.message || t('wms.inventory.deleteFailed', '削除に失敗しました'), 'danger')
  }
}

onMounted(() => {
  loadData()
  loadProducts()
})
</script>

<style scoped>
.lot-management {
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

:deep(.expiry-expired) { color: #f56c6c; font-weight: 600; }
:deep(.expiry-warning) { color: #e6a23c; font-weight: 500; }

:deep(.action-cell) {
  display: inline-flex;
  gap: 4px;
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--o-gray-600, #606266);
}
</style>
