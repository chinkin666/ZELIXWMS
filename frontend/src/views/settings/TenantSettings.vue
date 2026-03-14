<template>
  <div class="tenant-settings">
    <ControlPanel title="テナント管理" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">新規テナント</OButton>
      </template>
    </ControlPanel>

    <SearchForm
      class="search-section"
      :columns="searchColumns"
      :show-save="false"
      storage-key="tenantSettingsSearch"
      @search="handleSearch"
    />

    <div class="table-section">
      <Table
        :columns="tableColumns"
        :data="tenants"
        :height="520"
        row-key="_id"
        highlight-columns-on-hover
        pagination-enabled
        pagination-mode="server"
        :page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        :current-page="currentPage"
        :global-search-text="globalSearchText"
        @page-change="handlePageChange"
      />
    </div>

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogOpen" :title="isEditing ? 'テナントを編集' : 'テナントを追加'" size="lg" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">テナントコード <span class="required">*</span></label>
          <input v-model="form.tenantCode" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">テナント名 <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">プラン</label>
          <select v-model="form.plan" class="o-input">
            <option value="free">フリー</option>
            <option value="starter">スターター</option>
            <option value="standard">スタンダード</option>
            <option value="pro">プロ</option>
            <option value="enterprise">エンタープライズ</option>
          </select>
        </div>
        <div v-if="isEditing" class="form-field">
          <label class="form-label">ステータス</label>
          <select v-model="form.status" class="o-input">
            <option value="active">有効</option>
            <option value="suspended">停止中</option>
            <option value="cancelled">解約</option>
            <option value="trial">トライアル</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">上限ユーザー数</label>
          <input v-model.number="form.maxUsers" type="number" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">上限倉庫数</label>
          <input v-model.number="form.maxWarehouses" type="number" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">上限顧客数</label>
          <input v-model.number="form.maxClients" type="number" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">担当者名</label>
          <input v-model="form.contactName" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">メール</label>
          <input v-model="form.contactEmail" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">電話番号</label>
          <input v-model="form.contactPhone" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">備考</label>
          <textarea v-model="form.memo" class="o-input form-textarea" rows="3" />
        </div>
      </div>
    </ODialog>

    <!-- Status Change Dialog -->
    <ODialog v-model="statusDialogOpen" title="ステータス変更" size="sm" @confirm="handleStatusChange">
      <div class="status-change-form">
        <div class="form-field">
          <label class="form-label">現在のステータス</label>
          <span class="o-status-tag" :class="statusTagClass(statusChangeTarget?.status || 'active')">
            {{ statusLabel(statusChangeTarget?.status || 'active') }}
          </span>
        </div>
        <div class="form-field" style="margin-top: 16px;">
          <label class="form-label">新しいステータス</label>
          <select v-model="newStatus" class="o-input">
            <option value="active">有効</option>
            <option value="suspended">停止中</option>
            <option value="cancelled">解約</option>
            <option value="trial">トライアル</option>
          </select>
        </div>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { h, computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import SearchForm from '@/components/search/SearchForm.vue'
import Table from '@/components/table/Table.vue'
import type { TableColumn, Operator } from '@/types/table'
import {
  fetchTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  updateTenantStatus,
  type Tenant,
  type TenantPlan,
  type TenantStatus,
} from '@/api/tenant'

const { show: showToast } = useToast()
const { t } = useI18n()

// Labels
const statusLabels: Record<TenantStatus, string> = {
  active: '有効',
  suspended: '停止中',
  cancelled: '解約',
  trial: 'トライアル',
}

const planLabels: Record<TenantPlan, string> = {
  free: 'フリー',
  starter: 'スターター',
  standard: 'スタンダード',
  pro: 'プロ',
  enterprise: 'エンタープライズ',
}

const statusLabel = (status: TenantStatus) => statusLabels[status] || status
const planLabel = (plan: TenantPlan) => planLabels[plan] || plan

const statusTagClass = (status: TenantStatus) => {
  const map: Record<TenantStatus, string> = {
    active: 'o-status-tag--confirmed',
    trial: 'o-status-tag--trial',
    suspended: 'o-status-tag--suspended',
    cancelled: 'o-status-tag--cancelled',
  }
  return map[status] || ''
}

const planTagClass = (plan: TenantPlan) => {
  const map: Record<TenantPlan, string> = {
    free: 'o-status-tag--plan-free',
    starter: 'o-status-tag--plan-starter',
    standard: 'o-status-tag--plan-standard',
    pro: 'o-status-tag--plan-pro',
    enterprise: 'o-status-tag--plan-enterprise',
  }
  return map[plan] || ''
}

// Status / plan options for search
const statusOptions = [
  { label: '有効', value: 'active' },
  { label: '停止中', value: 'suspended' },
  { label: '解約', value: 'cancelled' },
  { label: 'トライアル', value: 'trial' },
]

const planOptions = [
  { label: 'フリー', value: 'free' },
  { label: 'スターター', value: 'starter' },
  { label: 'スタンダード', value: 'standard' },
  { label: 'プロ', value: 'pro' },
  { label: 'エンタープライズ', value: 'enterprise' },
]

// --- Column definitions ---
const baseColumns: TableColumn[] = [
  {
    key: 'tenantCode',
    title: 'テナントコード',
    width: 140,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'name',
    title: 'テナント名',
    width: 200,
    searchable: true,
    searchType: 'string',
  },
  {
    key: 'plan',
    title: 'プラン',
    width: 130,
    searchable: true,
    searchType: 'select',
    searchOptions: planOptions,
  },
  {
    key: 'status',
    title: 'ステータス',
    width: 110,
    searchable: true,
    searchType: 'select',
    searchOptions: statusOptions,
  },
  {
    key: 'maxUsers',
    title: '上限ユーザー',
    width: 100,
    align: 'center',
  },
  {
    key: 'maxWarehouses',
    title: '上限倉庫',
    width: 100,
    align: 'center',
  },
  {
    key: 'maxClients',
    title: '上限顧客',
    width: 100,
    align: 'center',
  },
]

const searchColumns = baseColumns.filter((c) => c.searchable)

const tableColumns: TableColumn[] = [
  ...baseColumns.map((col) => {
    if (col.key === 'plan') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Tenant }) =>
          h('span', { class: ['o-status-tag', planTagClass(rowData.plan)] }, planLabel(rowData.plan)),
      }
    }
    if (col.key === 'status') {
      return {
        ...col,
        cellRenderer: ({ rowData }: { rowData: Tenant }) =>
          h('span', { class: ['o-status-tag', statusTagClass(rowData.status)] }, statusLabel(rowData.status)),
      }
    }
    return col
  }),
  {
    key: 'actions',
    title: t('wms.common.actions', '操作'),
    width: 220,
    align: 'center',
    cellRenderer: ({ rowData }: { rowData: Tenant }) =>
      h('div', { class: 'o-table-td--actions' }, [
        h(OButton, { variant: 'primary', size: 'sm', onClick: () => openEdit(rowData) }, () => '編集'),
        h(OButton, { variant: 'secondary', size: 'sm', onClick: () => openStatusChange(rowData) }, () => 'ステータス変更'),
        h(OButton, { variant: 'icon-danger', size: 'sm', onClick: () => confirmDelete(rowData) }, () => '削除'),
      ]),
  },
]

// State
const tenants = ref<Tenant[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const globalSearchText = ref('')

// Current search filters from SearchForm
const currentFilters = ref<Record<string, { operator: Operator; value: any }>>({})

// Dialog
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => !!editingId.value)

// Status change dialog
const statusDialogOpen = ref(false)
const statusChangeTarget = ref<Tenant | null>(null)
const newStatus = ref<TenantStatus>('active')

const emptyForm = () => ({
  tenantCode: '',
  name: '',
  plan: 'free' as TenantPlan,
  status: 'trial' as TenantStatus,
  maxUsers: 5,
  maxWarehouses: 1,
  maxClients: 10,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  memo: '',
})

const form = ref(emptyForm())

// Load
const loadList = async () => {
  loading.value = true
  try {
    const filters = currentFilters.value
    const searchParam = filters.tenantCode?.value || filters.name?.value || undefined
    const statusParam = filters.status?.value || undefined
    const planParam = filters.plan?.value || undefined

    const result = await fetchTenants({
      search: searchParam,
      status: statusParam,
      plan: planParam,
      page: currentPage.value,
      limit: pageSize.value,
    })
    tenants.value = result.data
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || '取得に失敗しました', 'danger')
  } finally {
    loading.value = false
  }
}

const handleSearch = (payload: Record<string, { operator: Operator; value: any }>) => {
  // Extract global search text
  if (payload.__global?.value) {
    globalSearchText.value = String(payload.__global.value).trim()
    delete payload.__global
  } else {
    globalSearchText.value = ''
  }
  currentFilters.value = { ...payload }
  currentPage.value = 1
  loadList()
}

const handlePageChange = (payload: { page: number; pageSize: number }) => {
  currentPage.value = payload.page
  pageSize.value = payload.pageSize
  loadList()
}

// CRUD
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogOpen.value = true
}

const openEdit = (t: Tenant) => {
  editingId.value = t._id
  form.value = {
    tenantCode: t.tenantCode,
    name: t.name,
    plan: t.plan,
    status: t.status,
    maxUsers: t.maxUsers,
    maxWarehouses: t.maxWarehouses,
    maxClients: t.maxClients,
    contactName: t.contactName || '',
    contactEmail: t.contactEmail || '',
    contactPhone: t.contactPhone || '',
    memo: t.memo || '',
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.tenantCode.trim()) {
    showToast('テナントコードは必須です', 'danger')
    return
  }
  if (!form.value.name.trim()) {
    showToast('テナント名は必須です', 'danger')
    return
  }

  try {
    if (editingId.value) {
      await updateTenant(editingId.value, { ...form.value })
      showToast('更新しました', 'success')
    } else {
      await createTenant({ ...form.value })
      showToast('作成しました', 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  }
}

const confirmDelete = (t: Tenant) => {
  if (!confirm(`「${t.name}」(${t.tenantCode}) を削除しますか？`)) return
  deleteTenant(t._id)
    .then(async () => {
      showToast('削除しました', 'success')
      await loadList()
    })
    .catch((err: any) => {
      showToast(err?.message || '削除に失敗しました', 'danger')
    })
}

// Status change
const openStatusChange = (t: Tenant) => {
  statusChangeTarget.value = t
  newStatus.value = t.status
  statusDialogOpen.value = true
}

const handleStatusChange = async () => {
  if (!statusChangeTarget.value) return
  if (newStatus.value === statusChangeTarget.value.status) {
    showToast('ステータスが変更されていません', 'warning')
    return
  }

  try {
    await updateTenantStatus(statusChangeTarget.value._id, newStatus.value)
    showToast('ステータスを変更しました', 'success')
    statusDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || 'ステータス変更に失敗しました', 'danger')
  }
}

onMounted(() => {
  loadList()
})
</script>

<style>
.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
.o-status-tag--trial { background: #ecf5ff; color: #409eff; }
.o-status-tag--suspended { background: #fdf6ec; color: #e6a23c; }
.o-status-tag--plan-free { background: #f4f4f5; color: #909399; }
.o-status-tag--plan-starter { background: #ecf5ff; color: #409eff; }
.o-status-tag--plan-standard { background: #f0f9eb; color: #67c23a; }
.o-status-tag--plan-pro { background: #fdf6ec; color: #e6a23c; }
.o-status-tag--plan-enterprise { background: #f4e8ff; color: #9b59b6; }
</style>

<style scoped>
.tenant-settings {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

:deep(.o-control-panel) {
  margin-left: -20px;
  margin-right: -20px;
}

/* Status change form */
.status-change-form {
  padding: 8px 0;
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
}

.form-field--full {
  grid-column: 1 / -1;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: var(--o-gray-700, #303133);
}

.required {
  color: #dc2626;
}

.form-textarea {
  resize: vertical;
}
</style>
