<template>
  <div class="tenant-settings">
    <ControlPanel title="テナント管理" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">新規テナント</OButton>
      </template>
    </ControlPanel>

    <!-- Filter bar -->
    <div class="search-section">
      <input
        v-model="searchText"
        type="text"
        class="o-input"
        style="flex: 1; max-width: 400px;"
        placeholder="テナントコード・名称で検索..."
        @keydown.enter="handleSearch"
      />
      <select v-model="filterStatus" class="o-input" style="width: 160px;">
        <option value="">全ステータス</option>
        <option value="active">有効</option>
        <option value="suspended">停止中</option>
        <option value="cancelled">解約</option>
        <option value="trial">トライアル</option>
      </select>
      <select v-model="filterPlan" class="o-input" style="width: 160px;">
        <option value="">全プラン</option>
        <option value="free">フリー</option>
        <option value="starter">スターター</option>
        <option value="standard">スタンダード</option>
        <option value="pro">プロ</option>
        <option value="enterprise">エンタープライズ</option>
      </select>
      <OButton variant="primary" @click="handleSearch">検索</OButton>
    </div>

    <!-- Table -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width: 140px">テナントコード</th>
            <th class="o-table-th" style="width: 200px">テナント名</th>
            <th class="o-table-th" style="width: 130px">プラン</th>
            <th class="o-table-th" style="width: 110px">ステータス</th>
            <th class="o-table-th" style="width: 100px">上限ユーザー</th>
            <th class="o-table-th" style="width: 100px">上限倉庫</th>
            <th class="o-table-th" style="width: 100px">上限顧客</th>
            <th class="o-table-th" style="width: 220px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="o-table-td o-table-empty" colspan="8">読み込み中...</td>
          </tr>
          <tr v-else-if="tenants.length === 0">
            <td class="o-table-td o-table-empty" colspan="8">データがありません</td>
          </tr>
          <tr v-for="t in tenants" :key="t._id" class="o-table-row">
            <td class="o-table-td">{{ t.tenantCode }}</td>
            <td class="o-table-td">{{ t.name }}</td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="planTagClass(t.plan)">{{ planLabel(t.plan) }}</span>
            </td>
            <td class="o-table-td">
              <span class="o-status-tag" :class="statusTagClass(t.status)">{{ statusLabel(t.status) }}</span>
            </td>
            <td class="o-table-td" style="text-align: center">{{ t.maxUsers }}</td>
            <td class="o-table-td" style="text-align: center">{{ t.maxWarehouses }}</td>
            <td class="o-table-td" style="text-align: center">{{ t.maxClients }}</td>
            <td class="o-table-td o-table-td--actions">
              <OButton variant="primary" size="sm" @click="openEdit(t)">編集</OButton>
              <OButton variant="secondary" size="sm" @click="openStatusChange(t)">ステータス変更</OButton>
              <OButton variant="icon-danger" size="sm" @click="confirmDelete(t)">削除</OButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">全{{ total }}件中 {{ paginationStart }}-{{ paginationEnd }}件</span>
      <div class="o-table-pagination__controls">
        <select class="o-input o-input-sm" v-model.number="pageSize" style="width:80px;" @change="handlePageSizeChange">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <OButton variant="secondary" size="sm" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">&lsaquo;</OButton>
        <span class="o-table-pagination__page">{{ currentPage }} / {{ totalPages }}</span>
        <OButton variant="secondary" size="sm" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">&rsaquo;</OButton>
      </div>
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
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
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

// State
const tenants = ref<Tenant[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const searchText = ref('')
const filterStatus = ref('')
const filterPlan = ref('')

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

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paginationStart = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchTenants({
      search: searchText.value || undefined,
      status: filterStatus.value || undefined,
      plan: filterPlan.value || undefined,
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

const handleSearch = () => {
  currentPage.value = 1
  loadList()
}

const handlePageSizeChange = () => {
  currentPage.value = 1
  loadList()
}

const goToPage = (page: number) => {
  currentPage.value = page
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
@import '@/styles/order-table.css';

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

/* Search section */
.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
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
