<template>
  <div class="client-settings">
    <ControlPanel title="顧客一覧（3PL荷主）" :show-search="false">
      <template #actions>
        <OButton variant="secondary" @click="handleExportCsv">CSV出力</OButton>
        <OButton variant="primary" @click="openCreate">新規追加</OButton>
      </template>
    </ControlPanel>

    <!-- Search bar -->
    <div class="search-section">
      <input
        v-model="searchText"
        type="text"
        class="o-input"
        style="flex: 1; max-width: 400px;"
        placeholder="顧客コード・名称・メールで検索..."
        @keydown.enter="handleSearch"
      />
      <OButton variant="primary" @click="handleSearch">検索</OButton>
      <label class="search-section__filter">
        <input v-model="showActiveOnly" type="checkbox" @change="handleSearch" />
        有効のみ
      </label>
    </div>

    <!-- Table -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width: 130px">顧客コード</th>
            <th class="o-table-th" style="width: 200px">顧客名</th>
            <th class="o-table-th" style="width: 120px">担当者名</th>
            <th class="o-table-th" style="width: 140px">電話番号</th>
            <th class="o-table-th" style="width: 120px">契約プラン</th>
            <th class="o-table-th" style="width: 80px">課金</th>
            <th class="o-table-th" style="width: 80px">有効</th>
            <th class="o-table-th" style="width: 140px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="o-table-td o-table-empty" colspan="8">読み込み中...</td>
          </tr>
          <tr v-else-if="clients.length === 0">
            <td class="o-table-td o-table-empty" colspan="8">データがありません</td>
          </tr>
          <tr v-for="c in clients" :key="c._id" class="o-table-row">
            <td class="o-table-td">{{ c.clientCode }}</td>
            <td class="o-table-td">{{ c.name }}</td>
            <td class="o-table-td">{{ c.contactName || '-' }}</td>
            <td class="o-table-td">{{ c.phone || '-' }}</td>
            <td class="o-table-td">{{ planLabel(c.plan) }}</td>
            <td class="o-table-td" style="text-align: center">
              <span :class="c.billingEnabled ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--cancelled'">
                {{ c.billingEnabled ? '有効' : '無効' }}
              </span>
            </td>
            <td class="o-table-td" style="text-align: center">
              <span :class="c.isActive ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--cancelled'">
                {{ c.isActive ? '有効' : '無効' }}
              </span>
            </td>
            <td class="o-table-td o-table-td--actions">
              <OButton variant="primary" size="sm" @click="openEdit(c)">編集</OButton>
              <OButton variant="icon-danger" size="sm" @click="confirmDelete(c)">削除</OButton>
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
    <ODialog v-model="dialogOpen" :title="isEditing ? '顧客を編集' : '顧客を追加'" size="lg" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">顧客コード <span class="required">*</span></label>
          <input v-model="form.clientCode" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">顧客名 <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">顧客名2</label>
          <input v-model="form.name2" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">担当者名</label>
          <input v-model="form.contactName" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">郵便番号</label>
          <input v-model="form.postalCode" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">都道府県</label>
          <input v-model="form.prefecture" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">市区町村</label>
          <input v-model="form.city" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">住所</label>
          <input v-model="form.address" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">住所2</label>
          <input v-model="form.address2" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">電話番号</label>
          <input v-model="form.phone" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">メールアドレス</label>
          <input v-model="form.email" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">契約プラン</label>
          <select v-model="form.plan" class="o-input">
            <option value="free">フリー</option>
            <option value="standard">スタンダード</option>
            <option value="pro">プロ</option>
            <option value="enterprise">エンタープライズ</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">課金有効</label>
          <label style="display:flex;align-items:center;gap:6px;">
            <input type="checkbox" v-model="form.billingEnabled" />
            課金を有効にする
          </label>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">備考</label>
          <textarea v-model="form.memo" class="o-input form-textarea" rows="3" />
        </div>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
  exportClients,
  type Client,
} from '@/api/client'

const { show: showToast } = useToast()

const planLabelMap: Record<string, string> = {
  free: 'フリー',
  standard: 'スタンダード',
  pro: 'プロ',
  enterprise: 'エンタープライズ',
}

const planLabel = (plan?: string) => {
  if (!plan) return '-'
  return planLabelMap[plan] || plan
}

// State
const clients = ref<Client[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const searchText = ref('')
const showActiveOnly = ref(true)

// Dialog
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => !!editingId.value)

const emptyForm = () => ({
  clientCode: '',
  name: '',
  name2: '',
  contactName: '',
  postalCode: '',
  prefecture: '',
  city: '',
  address: '',
  address2: '',
  phone: '',
  email: '',
  plan: 'free' as const,
  billingEnabled: false,
  memo: '',
})

const form = ref(emptyForm())

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paginationStart = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchClients({
      search: searchText.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
      isActive: showActiveOnly.value ? 'true' : undefined,
    })
    clients.value = result.data
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

const openEdit = (c: Client) => {
  editingId.value = c._id
  form.value = {
    clientCode: c.clientCode,
    name: c.name,
    name2: c.name2 || '',
    contactName: c.contactName || '',
    postalCode: c.postalCode || '',
    prefecture: c.prefecture || '',
    city: c.city || '',
    address: c.address || '',
    address2: c.address2 || '',
    phone: c.phone || '',
    email: c.email || '',
    plan: (c.plan || 'free') as 'free' | 'standard' | 'pro' | 'enterprise',
    billingEnabled: c.billingEnabled || false,
    memo: c.memo || '',
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.clientCode.trim()) {
    showToast('顧客コードは必須です', 'danger')
    return
  }
  if (!form.value.name.trim()) {
    showToast('顧客名は必須です', 'danger')
    return
  }

  try {
    if (editingId.value) {
      await updateClient(editingId.value, { ...form.value })
      showToast('更新しました', 'success')
    } else {
      await createClient({ ...form.value })
      showToast('作成しました', 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  }
}

const confirmDelete = (c: Client) => {
  if (!confirm(`「${c.name}」(${c.clientCode}) を削除しますか？`)) return
  deleteClient(c._id)
    .then(async () => {
      showToast('削除しました', 'success')
      await loadList()
    })
    .catch((err: any) => {
      showToast(err?.message || '削除に失敗しました', 'danger')
    })
}

// CSV Export
const handleExportCsv = async () => {
  try {
    const data = await exportClients()
    const headers = ['顧客コード', '顧客名', '顧客名2', '担当者名', '郵便番号', '都道府県', '市区町村', '住所', '住所2', '電話番号', 'メールアドレス', '契約プラン', '課金有効', '備考']
    const csvFields: (keyof Client)[] = ['clientCode', 'name', 'name2', 'contactName', 'postalCode', 'prefecture', 'city', 'address', 'address2', 'phone', 'email', 'plan', 'billingEnabled', 'memo']

    const rows = data.map((c) =>
      csvFields.map((f) => {
        const val = String(c[f] ?? '')
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val
      }).join(','),
    )

    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `顧客一覧_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('CSVをエクスポートしました', 'success')
  } catch (error: any) {
    showToast(error?.message || 'エクスポートに失敗しました', 'danger')
  }
}

onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';

.o-status-tag--cancelled { background: #fef0f0; color: #f56c6c; }
</style>

<style scoped>
.client-settings {
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

.search-section__filter {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
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
