<template>
  <div class="warehouse-settings">
    <ControlPanel title="倉庫一覧" :show-search="false">
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
        placeholder="倉庫コード・名称で検索..."
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
            <th class="o-table-th" style="width: 130px">倉庫コード</th>
            <th class="o-table-th" style="width: 200px">倉庫名</th>
            <th class="o-table-th" style="width: 140px">電話番号</th>
            <th class="o-table-th" style="width: 180px">対応温度帯</th>
            <th class="o-table-th" style="width: 120px">キャパシティ</th>
            <th class="o-table-th" style="width: 80px">有効</th>
            <th class="o-table-th" style="width: 140px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="o-table-td o-table-empty" colspan="7">読み込み中...</td>
          </tr>
          <tr v-else-if="warehouses.length === 0">
            <td class="o-table-td o-table-empty" colspan="7">データがありません</td>
          </tr>
          <tr v-for="w in warehouses" :key="w._id" class="o-table-row">
            <td class="o-table-td">{{ w.code }}</td>
            <td class="o-table-td">{{ w.name }}</td>
            <td class="o-table-td">{{ w.phone || '-' }}</td>
            <td class="o-table-td">{{ formatCoolTypes(w.coolTypes) }}</td>
            <td class="o-table-td">{{ w.capacity ?? '-' }}</td>
            <td class="o-table-td" style="text-align: center">
              <span :class="w.isActive ? 'o-status-tag o-status-tag--confirmed' : 'o-status-tag o-status-tag--cancelled'">
                {{ w.isActive ? '有効' : '無効' }}
              </span>
            </td>
            <td class="o-table-td o-table-td--actions">
              <OButton variant="primary" size="sm" @click="openEdit(w)">編集</OButton>
              <OButton variant="icon-danger" size="sm" @click="confirmDelete(w)">削除</OButton>
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
    <ODialog v-model="dialogOpen" :title="isEditing ? '倉庫を編集' : '倉庫を追加'" size="lg" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">倉庫コード <span class="required">*</span></label>
          <input v-model="form.code" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">倉庫名 <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">倉庫名2</label>
          <input v-model="form.name2" type="text" class="o-input" />
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
          <label class="form-label">営業時間</label>
          <input v-model="form.operatingHours" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">保管キャパシティ</label>
          <input v-model.number="form.capacity" type="number" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">表示順</label>
          <input v-model.number="form.sortOrder" type="number" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">対応温度帯</label>
          <div style="display: flex; gap: 16px;">
            <label><input type="checkbox" value="0" v-model="form.coolTypes" /> 常温</label>
            <label><input type="checkbox" value="1" v-model="form.coolTypes" /> 冷蔵</label>
            <label><input type="checkbox" value="2" v-model="form.coolTypes" /> 冷凍</label>
          </div>
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
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  exportWarehouses,
  type Warehouse,
} from '@/api/warehouse'

const { show: showToast } = useToast()

const coolTypeLabels: Record<string, string> = {
  '0': '常温',
  '1': '冷蔵',
  '2': '冷凍',
}

const formatCoolTypes = (types?: string[]): string => {
  if (!types || types.length === 0) return '-'
  return types.map((t) => coolTypeLabels[t] || t).join(', ')
}

// State
const warehouses = ref<Warehouse[]>([])
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
  code: '',
  name: '',
  name2: '',
  postalCode: '',
  prefecture: '',
  city: '',
  address: '',
  address2: '',
  phone: '',
  coolTypes: [] as string[],
  capacity: 0,
  operatingHours: '',
  sortOrder: 0,
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
    const result = await fetchWarehouses({
      search: searchText.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
      isActive: showActiveOnly.value ? 'true' : undefined,
    })
    warehouses.value = result.data
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

const openEdit = (w: Warehouse) => {
  editingId.value = w._id
  form.value = {
    code: w.code,
    name: w.name,
    name2: w.name2 || '',
    postalCode: w.postalCode || '',
    prefecture: w.prefecture || '',
    city: w.city || '',
    address: w.address || '',
    address2: w.address2 || '',
    phone: w.phone || '',
    coolTypes: w.coolTypes ? [...w.coolTypes] : [],
    capacity: w.capacity ?? 0,
    operatingHours: w.operatingHours || '',
    sortOrder: w.sortOrder ?? 0,
    memo: w.memo || '',
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.code.trim()) {
    showToast('倉庫コードは必須です', 'danger')
    return
  }
  if (!form.value.name.trim()) {
    showToast('倉庫名は必須です', 'danger')
    return
  }

  try {
    if (editingId.value) {
      await updateWarehouse(editingId.value, { ...form.value })
      showToast('更新しました', 'success')
    } else {
      await createWarehouse({ ...form.value })
      showToast('作成しました', 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || '保存に失敗しました', 'danger')
  }
}

const confirmDelete = (w: Warehouse) => {
  if (!confirm(`「${w.name}」(${w.code}) を削除しますか？`)) return
  deleteWarehouse(w._id)
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
    const data = await exportWarehouses()
    const headers = ['倉庫コード', '倉庫名', '倉庫名2', '郵便番号', '都道府県', '市区町村', '住所', '住所2', '電話番号', '対応温度帯', '保管キャパシティ', '営業時間', '表示順', '備考']
    const csvFields: (keyof Warehouse)[] = ['code', 'name', 'name2', 'postalCode', 'prefecture', 'city', 'address', 'address2', 'phone', 'coolTypes', 'capacity', 'operatingHours', 'sortOrder', 'memo']

    const rows = data.map((w) =>
      csvFields.map((f) => {
        const raw = w[f]
        const val = Array.isArray(raw) ? raw.map((t) => coolTypeLabels[t] || t).join('/') : String(raw ?? '')
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
    a.download = `倉庫一覧_${new Date().toISOString().slice(0, 10)}.csv`
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
.warehouse-settings {
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
