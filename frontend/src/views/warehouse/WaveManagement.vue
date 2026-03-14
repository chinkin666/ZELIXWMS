<template>
  <div class="wave-management">
    <ControlPanel :title="t('wms.warehouse.waveManagement', 'ウェーブ管理')" :show-search="false">
      <template #actions>
        <OButton variant="primary" @click="openCreate">{{ t('wms.warehouse.newWave', '新規ウェーブ') }}</OButton>
      </template>
    </ControlPanel>

    <!-- Filter bar -->
    <div class="search-section">
      <input
        v-model="searchText"
        type="text"
        class="o-input"
        style="flex: 1; max-width: 300px;"
        :placeholder="t('wms.warehouse.searchWavePlaceholder', 'ウェーブ番号で検索...')"
        @keydown.enter="handleSearch"
      />
      <select v-model="filterStatus" class="o-input" style="width: 160px;">
        <option value="">{{ t('wms.warehouse.allStatuses', '全ステータス') }}</option>
        <option value="draft">{{ t('wms.warehouse.waveStatusDraft', '下書き') }}</option>
        <option value="picking">{{ t('wms.warehouse.waveStatusPicking', 'ピッキング中') }}</option>
        <option value="sorting">{{ t('wms.warehouse.waveStatusSorting', '仕分け中') }}</option>
        <option value="packing">{{ t('wms.warehouse.waveStatusPacking', '梱包中') }}</option>
        <option value="completed">{{ t('wms.warehouse.waveStatusCompleted', '完了') }}</option>
        <option value="cancelled">{{ t('wms.warehouse.waveStatusCancelled', 'キャンセル') }}</option>
      </select>
      <select v-model="filterPriority" class="o-input" style="width: 130px;">
        <option value="">{{ t('wms.warehouse.allPriorities', '全優先度') }}</option>
        <option value="urgent">{{ t('wms.warehouse.priorityUrgent', '緊急') }}</option>
        <option value="high">{{ t('wms.warehouse.priorityHigh', '高') }}</option>
        <option value="normal">{{ t('wms.warehouse.priorityNormal', '通常') }}</option>
        <option value="low">{{ t('wms.warehouse.priorityLow', '低') }}</option>
      </select>
      <OButton variant="primary" @click="handleSearch">{{ t('wms.warehouse.search', '検索') }}</OButton>
    </div>

    <!-- Wave table -->
    <div class="o-table-wrapper">
      <table class="o-table">
        <thead>
          <tr>
            <th class="o-table-th" style="width: 160px">{{ t('wms.warehouse.waveNumber', 'ウェーブ番号') }}</th>
            <th class="o-table-th" style="width: 120px">{{ t('wms.warehouse.status', 'ステータス') }}</th>
            <th class="o-table-th" style="width: 90px">{{ t('wms.warehouse.priority', '優先度') }}</th>
            <th class="o-table-th" style="width: 90px">{{ t('wms.warehouse.shipmentCount', '出荷件数') }}</th>
            <th class="o-table-th" style="width: 120px">{{ t('wms.warehouse.assignee', '担当者') }}</th>
            <th class="o-table-th" style="width: 160px">{{ t('wms.warehouse.startedAt', '開始日時') }}</th>
            <th class="o-table-th" style="width: 160px">{{ t('wms.warehouse.completedAt', '完了日時') }}</th>
            <th class="o-table-th" style="width: 200px">{{ t('wms.common.actions', '操作') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="o-table-td o-table-empty" colspan="8">{{ t('wms.common.loading', '読み込み中...') }}</td>
          </tr>
          <tr v-else-if="waves.length === 0">
            <td class="o-table-td o-table-empty" colspan="8">{{ t('wms.warehouse.noData', 'データがありません') }}</td>
          </tr>
          <tr v-for="w in waves" :key="w._id" class="o-table-row">
            <td class="o-table-td">{{ w.waveNumber }}</td>
            <td class="o-table-td">
              <span :class="['o-status-tag', statusTagClass(w.status)]">
                {{ waveStatusLabel(w.status) }}
              </span>
            </td>
            <td class="o-table-td">
              <span :class="['o-status-tag', priorityTagClass(w.priority)]">
                {{ wavePriorityLabel(w.priority) }}
              </span>
            </td>
            <td class="o-table-td" style="text-align: center">{{ w.shipmentIds.length }}</td>
            <td class="o-table-td">{{ w.assignedName || '-' }}</td>
            <td class="o-table-td">{{ formatDateTime(w.startedAt) }}</td>
            <td class="o-table-td">{{ formatDateTime(w.completedAt) }}</td>
            <td class="o-table-td o-table-td--actions">
              <template v-if="w.status === 'draft'">
                <OButton variant="success" size="sm" @click="handleStart(w)">{{ t('wms.warehouse.start', '開始') }}</OButton>
                <OButton variant="primary" size="sm" @click="openEdit(w)">{{ t('wms.common.edit', '編集') }}</OButton>
                <OButton variant="icon-danger" size="sm" @click="confirmDelete(w)">{{ t('wms.common.delete', '削除') }}</OButton>
              </template>
              <template v-else-if="w.status === 'picking' || w.status === 'sorting' || w.status === 'packing'">
                <OButton variant="success" size="sm" @click="handleComplete(w)">{{ t('wms.warehouse.waveComplete', '完了') }}</OButton>
              </template>
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

    <!-- Create/Edit Dialog -->
    <ODialog v-model="dialogOpen" :title="isEditing ? t('wms.warehouse.editWaveTitle', 'ウェーブを編集') : t('wms.warehouse.createWaveTitle', 'ウェーブを追加')" size="lg" @confirm="handleSave">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.waveNumber', 'ウェーブ番号') }} <span class="required">*</span></label>
          <input v-model="form.waveNumber" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.priority', '優先度') }}</label>
          <select v-model="form.priority" class="o-input">
            <option value="urgent">{{ t('wms.warehouse.priorityUrgent', '緊急') }}</option>
            <option value="high">{{ t('wms.warehouse.priorityHigh', '高') }}</option>
            <option value="normal">{{ t('wms.warehouse.priorityNormal', '通常') }}</option>
            <option value="low">{{ t('wms.warehouse.priorityLow', '低') }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.assigneeId', '担当者ID') }}</label>
          <input v-model="form.assignedTo" type="text" class="o-input" />
        </div>
        <div class="form-field">
          <label class="form-label">{{ t('wms.warehouse.assigneeName', '担当者名') }}</label>
          <input v-model="form.assignedName" type="text" class="o-input" />
        </div>
        <div class="form-field form-field--full">
          <label class="form-label">{{ t('wms.warehouse.remarks', '備考') }}</label>
          <textarea v-model="form.memo" class="o-input form-textarea" rows="3" />
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
  fetchWaves,
  createWave,
  updateWave,
  deleteWave,
  startWave,
  completeWave,
  type Wave,
} from '@/api/wave'

const { t } = useI18n()
const { show: showToast } = useToast()

// State
const waves = ref<Wave[]>([])
const total = ref(0)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const searchText = ref('')
const filterStatus = ref('')
const filterPriority = ref('')

// Dialog
const dialogOpen = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => !!editingId.value)

const emptyForm = () => ({
  waveNumber: '',
  priority: 'normal' as Wave['priority'],
  assignedTo: '',
  assignedName: '',
  memo: '',
})

const form = ref(emptyForm())

// Computed
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const paginationStart = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1))
const paginationEnd = computed(() => Math.min(currentPage.value * pageSize.value, total.value))

// Labels & tag classes
const waveStatusLabel = (status: Wave['status']): string => {
  const map: Record<Wave['status'], string> = {
    draft: t('wms.warehouse.waveStatusDraft', '下書き'),
    picking: t('wms.warehouse.waveStatusPicking', 'ピッキング中'),
    sorting: t('wms.warehouse.waveStatusSorting', '仕分け中'),
    packing: t('wms.warehouse.waveStatusPacking', '梱包中'),
    completed: t('wms.warehouse.waveStatusCompleted', '完了'),
    cancelled: t('wms.warehouse.waveStatusCancelled', 'キャンセル'),
  }
  return map[status] || status
}

const statusTagClass = (status: Wave['status']): string => {
  const map: Record<Wave['status'], string> = {
    draft: 'wave-tag--gray',
    picking: 'wave-tag--blue',
    sorting: 'wave-tag--orange',
    packing: 'wave-tag--cyan',
    completed: 'wave-tag--green',
    cancelled: 'wave-tag--red',
  }
  return map[status] || ''
}

const wavePriorityLabel = (priority: Wave['priority']): string => {
  const map: Record<Wave['priority'], string> = {
    urgent: t('wms.warehouse.priorityUrgent', '緊急'),
    high: t('wms.warehouse.priorityHigh', '高'),
    normal: t('wms.warehouse.priorityNormal', '通常'),
    low: t('wms.warehouse.priorityLow', '低'),
  }
  return map[priority] || priority
}

const priorityTagClass = (priority: Wave['priority']): string => {
  const map: Record<Wave['priority'], string> = {
    urgent: 'wave-tag--red',
    high: 'wave-tag--orange',
    normal: 'wave-tag--blue',
    low: 'wave-tag--gray',
  }
  return map[priority] || ''
}

const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Load
const loadList = async () => {
  loading.value = true
  try {
    const result = await fetchWaves({
      search: searchText.value || undefined,
      status: filterStatus.value || undefined,
      priority: filterPriority.value || undefined,
      page: currentPage.value,
      limit: pageSize.value,
    })
    waves.value = result.data
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

// CRUD
const openCreate = () => {
  editingId.value = null
  form.value = emptyForm()
  dialogOpen.value = true
}

const openEdit = (w: Wave) => {
  editingId.value = w._id
  form.value = {
    waveNumber: w.waveNumber,
    priority: w.priority,
    assignedTo: w.assignedTo || '',
    assignedName: w.assignedName || '',
    memo: w.memo || '',
  }
  dialogOpen.value = true
}

const handleSave = async () => {
  if (!form.value.waveNumber.trim()) {
    showToast(t('wms.warehouse.waveNumberRequired', 'ウェーブ番号は必須です'), 'danger')
    return
  }

  try {
    if (editingId.value) {
      await updateWave(editingId.value, { ...form.value })
      showToast(t('wms.warehouse.updated', '更新しました'), 'success')
    } else {
      await createWave({ ...form.value })
      showToast(t('wms.warehouse.created', '作成しました'), 'success')
    }
    dialogOpen.value = false
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.saveFailed', '保存に失敗しました'), 'danger')
  }
}

const confirmDelete = (w: Wave) => {
  if (w.status !== 'draft') {
    showToast(t('wms.warehouse.deleteDraftOnly', '下書きステータスのウェーブのみ削除できます'), 'danger')
    return
  }
  if (!confirm(t('wms.warehouse.deleteConfirm', `「${w.waveNumber}」を削除しますか？`))) return
  deleteWave(w._id)
    .then(async () => {
      showToast(t('wms.warehouse.deleted', '削除しました'), 'success')
      await loadList()
    })
    .catch((err: any) => {
      showToast(err?.message || t('wms.warehouse.deleteFailed', '削除に失敗しました'), 'danger')
    })
}

// Lifecycle actions
const handleStart = async (w: Wave) => {
  try {
    await startWave(w._id)
    showToast(t('wms.warehouse.waveStarted', 'ウェーブを開始しました'), 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.startFailed', '開始に失敗しました'), 'danger')
  }
}

const handleComplete = async (w: Wave) => {
  try {
    await completeWave(w._id)
    showToast(t('wms.warehouse.waveCompleted', 'ウェーブを完了しました'), 'success')
    await loadList()
  } catch (error: any) {
    showToast(error?.message || t('wms.warehouse.completeFailed', '完了に失敗しました'), 'danger')
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
.wave-management {
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

/* Status/Priority tag colors */
.wave-tag--gray {
  background: #f0f0f0;
  color: #606266;
}

.wave-tag--blue {
  background: #dbeafe;
  color: #1d4ed8;
}

.wave-tag--orange {
  background: #fff3e0;
  color: #e65100;
}

.wave-tag--cyan {
  background: #e0f7fa;
  color: #00838f;
}

.wave-tag--green {
  background: #d1fae5;
  color: #059669;
}

.wave-tag--red {
  background: #fee2e2;
  color: #dc2626;
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
