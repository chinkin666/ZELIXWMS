<template>
  <div class="serial-tracking">
    <ControlPanel :title="t('wms.warehouse.serialTracking', 'シリアル番号管理')" :show-search="false">
      <template #actions>
        <OButton variant="success" @click="openBulkCreate">{{ t('wms.warehouse.bulkCreate', '一括登録') }}</OButton>
        <OButton variant="primary" @click="openCreate">{{ t('wms.warehouse.newCreate', '新規登録') }}</OButton>
      </template>
    </ControlPanel>

    <!-- Search bar -->
    <div class="search-section">
      <input
        v-model="searchText"
        type="text"
        class="o-input"
        style="flex: 1; max-width: 400px;"
        :placeholder="t('wms.warehouse.searchSerialPlaceholder', 'シリアル番号で検索...')"
        @keydown.enter="handleSearch"
      />
      <select v-model="statusFilter" class="o-input" style="width: 160px;" @change="handleSearch">
        <option value="">{{ t('wms.warehouse.allStatuses', '全ステータス') }}</option>
        <option value="available">{{ t('wms.warehouse.statusAvailable', '利用可能') }}</option>
        <option value="reserved">{{ t('wms.warehouse.statusReserved', '引当済') }}</option>
        <option value="shipped">{{ t('wms.warehouse.statusShipped', '出荷済') }}</option>
        <option value="returned">{{ t('wms.warehouse.statusReturned', '返品') }}</option>
        <option value="damaged">{{ t('wms.warehouse.statusDamaged', '破損') }}</option>
        <option value="scrapped">{{ t('wms.warehouse.statusScrapped', '廃棄') }}</option>
      </select>
      <OButton variant="primary" @click="handleSearch">{{ t('wms.warehouse.search', '検索') }}</OButton>
    </div>

    <!-- Table -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width: 180px">{{ t('wms.warehouse.serialNumber', 'シリアル番号') }}</th>
            <th class="o-table-th" style="width: 140px">{{ t('wms.warehouse.productId', '商品ID') }}</th>
            <th class="o-table-th" style="width: 100px">{{ t('wms.warehouse.status', 'ステータス') }}</th>
            <th class="o-table-th" style="width: 120px">{{ t('wms.warehouse.warehouseId', '倉庫ID') }}</th>
            <th class="o-table-th" style="width: 120px">{{ t('wms.warehouse.location', 'ロケーション') }}</th>
            <th class="o-table-th" style="width: 110px">{{ t('wms.warehouse.receivedDate', '入荷日') }}</th>
            <th class="o-table-th" style="width: 110px">{{ t('wms.warehouse.shippedDate', '出荷日') }}</th>
            <th class="o-table-th" style="width: 180px">{{ t('wms.common.actions', '操作') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="o-table-td o-table-empty" colspan="8">{{ t('wms.common.loading', '読み込み中...') }}</td>
          </tr>
          <tr v-else-if="serialNumbers.length === 0">
            <td class="o-table-td o-table-empty" colspan="8">{{ t('wms.warehouse.noData', 'データがありません') }}</td>
          </tr>
          <tr v-for="sn in serialNumbers" :key="sn._id" class="o-table-row">
            <td class="o-table-td">{{ sn.serialNumber }}</td>
            <td class="o-table-td">{{ sn.productId }}</td>
            <td class="o-table-td">
              <span :class="'o-status-tag o-status-tag--' + statusClass(sn.status)">
                {{ snStatusLabel(sn.status) }}
              </span>
            </td>
            <td class="o-table-td">{{ sn.warehouseId || '-' }}</td>
            <td class="o-table-td">{{ sn.locationId || '-' }}</td>
            <td class="o-table-td">{{ formatDate(sn.receivedAt) }}</td>
            <td class="o-table-td">{{ formatDate(sn.shippedAt) }}</td>
            <td class="o-table-td o-table-td--actions">
              <OButton variant="primary" size="sm" @click="openEdit(sn)">{{ t('wms.common.edit', '編集') }}</OButton>
              <OButton
                v-if="sn.status !== 'scrapped'"
                variant="secondary"
                size="sm"
                @click="openStatusChange(sn)"
              >{{ t('wms.warehouse.changeStatus', 'ステータス変更') }}</OButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="o-table-pagination">
      <span class="o-table-pagination__info">{{ t('wms.warehouse.paginationInfo', `全${total}件中 ${paginationStart}-${paginationEnd}件`) }}</span>
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

    <!-- Create Dialog -->
    <ODialog v-model="createDialogOpen" :title="t('wms.warehouse.createSerialTitle', 'シリアル番号を登録')" size="lg" @confirm="handleCreate">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.serialNumber', 'シリアル番号') }} <span class="required-badge">必須</span></label>
          <input v-model="createForm.serialNumber" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.productId', '商品ID') }} <span class="required-badge">必須</span></label>
          <input v-model="createForm.productId" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.warehouseId', '倉庫ID') }}</label>
          <input v-model="createForm.warehouseId" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.location', 'ロケーション') }}</label>
          <input v-model="createForm.locationId" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.lotId', 'ロットID') }}</label>
          <input v-model="createForm.lotId" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">{{ t('wms.warehouse.remarks', '備考') }}</label>
          <textarea v-model="createForm.memo" class="o-input form-textarea" rows="3" />
        </div>
      </div>
    </ODialog>

    <!-- Bulk Create Dialog -->
    <ODialog v-model="bulkDialogOpen" :title="t('wms.warehouse.bulkCreateTitle', 'シリアル番号一括登録')" size="lg" @confirm="handleBulkCreate">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.productId', '商品ID') }} <span class="required-badge">必須</span></label>
          <input v-model="bulkForm.productId" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.warehouseId', '倉庫ID') }}</label>
          <input v-model="bulkForm.warehouseId" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">{{ t('wms.warehouse.serialNumbersPerLine', 'シリアル番号（1行に1つ）') }} <span class="required-badge">必須</span></label>
          <textarea v-model="bulkForm.serialNumbersText" class="o-input form-textarea" rows="8" placeholder="SN001&#10;SN002&#10;SN003" />
        </div>
        <div v-if="bulkResult" class="form-field form-field--full">
          <div class="bulk-result">
            <p class="bulk-result__success">{{ t('wms.warehouse.bulkSuccess', `${bulkResult.createdCount}件 登録成功`) }}</p>
            <p v-if="bulkResult.failCount > 0" class="bulk-result__fail">{{ t('wms.warehouse.bulkFail', `${bulkResult.failCount}件 失敗`) }}</p>
            <ul v-if="bulkResult.errors.length > 0" class="bulk-result__errors">
              <li v-for="(err, idx) in bulkResult.errors" :key="idx">{{ err.serialNumber }}: {{ err.message }}</li>
            </ul>
          </div>
        </div>
      </div>
    </ODialog>

    <!-- Status Change Dialog -->
    <ODialog v-model="statusDialogOpen" :title="t('wms.warehouse.changeStatus', 'ステータス変更')" @confirm="handleStatusChange">
      <div class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label">{{ t('wms.warehouse.currentStatus', '現在のステータス') }}</label>
          <span :class="'o-status-tag o-status-tag--' + statusClass(statusChangeTarget?.status || 'available')">
            {{ snStatusLabel(statusChangeTarget?.status || 'available') }}
          </span>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">{{ t('wms.warehouse.newStatus', '新しいステータス') }}</label>
          <select v-model="newStatus" class="o-input">
            <option value="available">{{ t('wms.warehouse.statusAvailable', '利用可能') }}</option>
            <option value="reserved">{{ t('wms.warehouse.statusReserved', '引当済') }}</option>
            <option value="shipped">{{ t('wms.warehouse.statusShipped', '出荷済') }}</option>
            <option value="returned">{{ t('wms.warehouse.statusReturned', '返品') }}</option>
            <option value="damaged">{{ t('wms.warehouse.statusDamaged', '破損') }}</option>
            <option value="scrapped">{{ t('wms.warehouse.statusScrapped', '廃棄') }}</option>
          </select>
        </div>
      </div>
    </ODialog>

    <!-- Edit Dialog -->
    <ODialog v-model="editDialogOpen" :title="t('wms.warehouse.editSerialTitle', 'シリアル番号を編集')" size="lg" @confirm="handleEdit">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.serialNumber', 'シリアル番号') }}</label>
          <input :value="editForm.serialNumber" type="text" class="o-input" readonly disabled />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.productId', '商品ID') }}</label>
          <input :value="editForm.productId" type="text" class="o-input" readonly disabled />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.warehouseId', '倉庫ID') }}</label>
          <input v-model="editForm.warehouseId" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.location', 'ロケーション') }}</label>
          <input v-model="editForm.locationId" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.lotId', 'ロットID') }}</label>
          <input v-model="editForm.lotId" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">{{ t('wms.warehouse.remarks', '備考') }}</label>
          <textarea v-model="editForm.memo" class="o-input form-textarea" rows="3" />
        </div>
      </div>
    </ODialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/composables/useI18n'
import OButton from '@/components/odoo/OButton.vue'
import ControlPanel from '@/components/odoo/ControlPanel.vue'
import ODialog from '@/components/odoo/ODialog.vue'
import {
  fetchSerialNumbers,
  createSerialNumber,
  bulkCreateSerialNumbers,
  updateSerialNumber,
  updateSerialNumberStatus,
  type SerialNumber,
  type BulkCreateResult,
} from '@/api/serialNumber'

const { t } = useI18n()
const { show: showToast } = useToast()

// State
const serialNumbers = ref<SerialNumber[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const searchText = ref('')
const statusFilter = ref('')

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paginationStart = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

// Status helpers
const snStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    available: t('wms.warehouse.statusAvailable', '利用可能'),
    reserved: t('wms.warehouse.statusReserved', '引当済'),
    shipped: t('wms.warehouse.statusShipped', '出荷済'),
    returned: t('wms.warehouse.statusReturned', '返品'),
    damaged: t('wms.warehouse.statusDamaged', '破損'),
    scrapped: t('wms.warehouse.statusScrapped', '廃棄'),
  }
  return map[status] || status
}

const statusClass = (status: string): string => {
  const map: Record<string, string> = {
    available: 'available',
    reserved: 'reserved',
    shipped: 'shipped',
    returned: 'returned',
    damaged: 'damaged',
    scrapped: 'scrapped',
  }
  return map[status] || 'available'
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ja-JP')
}

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchSerialNumbers({
      search: searchText.value || undefined,
      status: statusFilter.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    serialNumbers.value = result.data
    total.value = result.total
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.fetchFailed', '取得に失敗しました'), 'danger')
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

// Create Dialog
const createDialogOpen = ref(false)

const emptyCreateForm = () => ({
  serialNumber: '',
  productId: '',
  warehouseId: '',
  locationId: '',
  lotId: '',
  memo: '',
})

const createForm = ref(emptyCreateForm())

const openCreate = () => {
  createForm.value = emptyCreateForm()
  createDialogOpen.value = true
}

const handleCreate = async () => {
  if (!createForm.value.serialNumber.trim()) {
    showToast(t('wms.warehouse.serialRequired', 'シリアル番号は必須です'), 'danger')
    return
  }
  if (!createForm.value.productId.trim()) {
    showToast(t('wms.warehouse.productIdRequired', '商品IDは必須です'), 'danger')
    return
  }
  try {
    await createSerialNumber({ ...createForm.value })
    showToast(t('wms.warehouse.registered', '登録しました'), 'success')
    createDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.registerFailed', '登録に失敗しました'), 'danger')
  }
}

// Bulk Create Dialog
const bulkDialogOpen = ref(false)
const bulkResult = ref<BulkCreateResult | null>(null)

const emptyBulkForm = () => ({
  productId: '',
  warehouseId: '',
  serialNumbersText: '',
})

const bulkForm = ref(emptyBulkForm())

const openBulkCreate = () => {
  bulkForm.value = emptyBulkForm()
  bulkResult.value = null
  bulkDialogOpen.value = true
}

const handleBulkCreate = async () => {
  if (!bulkForm.value.productId.trim()) {
    showToast(t('wms.warehouse.productIdRequired', '商品IDは必須です'), 'danger')
    return
  }
  const lines = bulkForm.value.serialNumbersText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length === 0) {
    showToast(t('wms.warehouse.enterSerials', 'シリアル番号を入力してください'), 'danger')
    return
  }
  try {
    const serialNumberEntries = lines.map((sn) => ({
      serialNumber: sn,
      productId: bulkForm.value.productId,
      warehouseId: bulkForm.value.warehouseId || undefined,
    }))
    const result = await bulkCreateSerialNumbers({ serialNumbers: serialNumberEntries })
    bulkResult.value = result
    showToast(
      t('wms.warehouse.bulkRegistered', `${result.createdCount}件登録しました${result.failCount > 0 ? ` (${result.failCount}件失敗)` : ''}`),
      result.failCount > 0 ? 'warning' : 'success',
    )
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.bulkRegisterFailed', '一括登録に失敗しました'), 'danger')
  }
}

// Status Change Dialog
const statusDialogOpen = ref(false)
const statusChangeTarget = ref<SerialNumber | null>(null)
const newStatus = ref('available')

const openStatusChange = (sn: SerialNumber) => {
  statusChangeTarget.value = sn
  newStatus.value = sn.status
  statusDialogOpen.value = true
}

const handleStatusChange = async () => {
  if (!statusChangeTarget.value) return
  try {
    await updateSerialNumberStatus(statusChangeTarget.value._id, { status: newStatus.value })
    showToast(t('wms.warehouse.statusChanged', 'ステータスを変更しました'), 'success')
    statusDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.statusChangeFailed', 'ステータス変更に失敗しました'), 'danger')
  }
}

// Edit Dialog
const editDialogOpen = ref(false)
const editingId = ref<string | null>(null)

const emptyEditForm = () => ({
  serialNumber: '',
  productId: '',
  warehouseId: '',
  locationId: '',
  lotId: '',
  memo: '',
})

const editForm = ref(emptyEditForm())

const openEdit = (sn: SerialNumber) => {
  editingId.value = sn._id
  editForm.value = {
    serialNumber: sn.serialNumber,
    productId: sn.productId,
    warehouseId: sn.warehouseId || '',
    locationId: sn.locationId || '',
    lotId: sn.lotId || '',
    memo: sn.memo || '',
  }
  editDialogOpen.value = true
}

const handleEdit = async () => {
  if (!editingId.value) return
  try {
    await updateSerialNumber(editingId.value, {
      warehouseId: editForm.value.warehouseId,
      locationId: editForm.value.locationId,
      lotId: editForm.value.lotId,
      memo: editForm.value.memo,
    })
    showToast(t('wms.warehouse.updated', '更新しました'), 'success')
    editDialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.updateFailed', '更新に失敗しました'), 'danger')
  }
}

onMounted(() => {
  loadList()
})
</script>

<style>
@import '@/styles/order-table.css';
</style>

<style scoped>
.serial-tracking {
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

/* Status tags */
:deep(.o-status-tag--available) {
  background: #e8f5e9;
  color: #2e7d32;
}

:deep(.o-status-tag--reserved) {
  background: #fff3e0;
  color: #e65100;
}

:deep(.o-status-tag--shipped) {
  background: #e3f2fd;
  color: #1565c0;
}

:deep(.o-status-tag--returned) {
  background: #e0f7fa;
  color: #00838f;
}

:deep(.o-status-tag--damaged) {
  background: #fef0f0;
  color: #f56c6c;
}

:deep(.o-status-tag--scrapped) {
  background: #f5f5f5;
  color: #9e9e9e;
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

/* Bulk result */
.bulk-result {
  border: 1px solid var(--o-border-color, #dcdfe6);
  border-radius: var(--o-border-radius, 4px);
  padding: 12px;
  background: var(--o-gray-100, #f8f9fa);
}

.bulk-result__success {
  margin: 0;
  color: #2e7d32;
  font-weight: 500;
}

.bulk-result__fail {
  margin: 4px 0 0;
  color: #f56c6c;
  font-weight: 500;
}

.bulk-result__errors {
  margin: 8px 0 0;
  padding-left: 20px;
  font-size: 12px;
  color: var(--o-gray-600, #606266);
}
</style>
